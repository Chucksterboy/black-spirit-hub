import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";

// No release/build/signing invocation occurs here. Parse production PowerShell,
// execute only its isolated initial validation guards with dummy arguments,
// then check source ordering. No certificate-store, Git or GitHub mutations.
const repo=path.resolve(process.argv[2]||path.join(import.meta.dirname,".."));
const releasePath=path.join(repo,"scripts/release.ps1");
const signingPath=path.join(repo,"scripts/sign-release-file.ps1");
const release=fs.readFileSync(releasePath,"utf8");
const signing=fs.readFileSync(signingPath,"utf8");
const project=fs.readFileSync(path.join(repo,"Source Code/Black Spirit Hub.csproj"),"utf8");
const quote=value=>`'${value.replaceAll("'","''")}'`;
const script=`
$ErrorActionPreference = 'Stop'
$releaseErrors = $null; $releaseTokens = $null
$releaseAst = [System.Management.Automation.Language.Parser]::ParseInput([IO.File]::ReadAllText(${quote(releasePath)}), [ref]$releaseTokens, [ref]$releaseErrors)
if ($releaseErrors.Count) { throw ($releaseErrors.Message -join '; ') }
$signErrors = $null; $signTokens = $null
[void][System.Management.Automation.Language.Parser]::ParseInput([IO.File]::ReadAllText(${quote(signingPath)}), [ref]$signTokens, [ref]$signErrors)
if ($signErrors.Count) { throw ($signErrors.Message -join '; ') }

# Only if-statements before the first function declaration are executable here.
# Inspect them before constructing the isolated guard script. Release's main
# body, its helper functions and the signer are never invoked by this test.
$firstFunction = $releaseAst.EndBlock.Statements | Where-Object { $_ -is [System.Management.Automation.Language.FunctionDefinitionAst] } | Select-Object -First 1
if (!$firstFunction) { throw 'Release preflight boundary is missing.' }
$guards = @($releaseAst.EndBlock.Statements | Where-Object {
  $_ -is [System.Management.Automation.Language.IfStatementAst] -and $_.Extent.StartOffset -lt $firstFunction.Extent.StartOffset
} | Select-Object -First 2)
if ($guards.Count -lt 2) { throw 'Both early signing guards must precede the release helper definitions.' }
foreach ($guard in $guards) {
  $commands = @($guard.FindAll({ param($node) $node -is [System.Management.Automation.Language.CommandAst] }, $true))
  if ($commands.Count) { throw 'Signing guard unexpectedly contains an executable command; manual safety review is needed.' }
  foreach ($statement in $guard.Clauses.Item2.Statements) {
    if ($statement -isnot [System.Management.Automation.Language.ThrowStatementAst]) { throw 'Only fail-closed throw statements are allowed in isolated guards.' }
  }
}
$guardSource = $releaseAst.ParamBlock.Extent.Text + [Environment]::NewLine + (($guards | ForEach-Object { $_.Extent.Text }) -join [Environment]::NewLine)
$preflight = [scriptblock]::Create($guardSource)
$missingCredential = ''; $missingTimestamp = ''
try { & $preflight -Version 'v0.0.0-test-only' -RequireSigning -SigningCertificateThumbprint '' -SigningTimestampUrl ''; throw 'MISSING_CREDENTIAL_WAS_ACCEPTED' }
catch { $missingCredential = $_.Exception.Message }
try { & $preflight -Version 'v0.0.0-test-only' -SigningCertificateThumbprint ('A' * 40) -SigningTimestampUrl ''; throw 'MISSING_TIMESTAMP_WAS_ACCEPTED' }
catch { $missingTimestamp = $_.Exception.Message }
# The unsigned path can proceed past validation; it does not execute a build.
& $preflight -Version 'v0.0.0-test-only' -SigningCertificateThumbprint '' -SigningTimestampUrl ''
[ordered]@{ syntaxValid=$true; guardCount=$guards.Count; firstGuardOffset=$guards[0].Extent.StartOffset; lastGuardOffset=$guards[-1].Extent.EndOffset; missingCredential=$missingCredential; missingTimestamp=$missingTimestamp } | ConvertTo-Json -Compress
`;
const parsed=spawnSync("powershell.exe",["-NoLogo","-NoProfile","-NonInteractive","-Command",script],{
  encoding:"utf8",timeout:20000,windowsHide:true,maxBuffer:1024*1024
});
assert.equal(parsed.status,0,`PowerShell validation failed: ${parsed.stderr || parsed.stdout || parsed.error}`);
const result=JSON.parse(parsed.stdout.trim());
assert.equal(result.syntaxValid,true);
assert.match(result.missingCredential,/requires signing.*Configure/i);
assert.match(result.missingTimestamp,/timestamp URL.*Refusing an unsigned fallback/i);
const index=(text,fragment)=>{const position=text.indexOf(fragment);assert.ok(position>=0,`Missing safeguard: ${fragment}`);return position;};
const firstGitMutation=index(release,"& $git fetch origin main");
const firstFileMutation=index(release,"Replace-Text $appVersionFile");
assert.ok(result.lastGuardOffset<firstGitMutation&&result.lastGuardOffset<firstFileMutation,
  "Missing signing configuration must fail before Git/worktree mutation.");
assert.ok(index(release,"-ValidateOnly")<firstGitMutation,"A configured signing certificate must be checked before Git/worktree mutation.");

const appSign=index(release,"-FilePath $appExe -CertificateThumbprint");
const packageApp=index(release,"-File $nativeInstallerBuildScript");
const installerSign=index(release,"-FilePath $installerReleaseAsset -CertificateThumbprint");
const installerHash=index(release,"$manifest.sha256 = (Get-FileHash -LiteralPath $installerReleaseAsset");
assert.ok(appSign<packageApp,"The signed main executable must be the one packaged by the installer.");
assert.ok(packageApp<installerSign&&installerSign<installerHash,"Updater SHA256 must identify the final signed installer bytes.");
assert.match(signing,/'\/fd', 'SHA256'/);
assert.match(signing,/'\/tr', \$timestamp\.AbsoluteUri, '\/td', 'SHA256'/);
assert.match(signing,/\$timestamp\.Scheme -ne 'https'/);
assert.match(signing,/\$certificate\.HasPrivateKey/);
assert.match(signing,/1\.3\.6\.1\.5\.5\.7\.3\.3/);
assert.match(signing,/Get-AuthenticodeSignature -LiteralPath \$target/);
assert.match(signing,/\$signature\.Status -ne 'Valid'/);
assert.match(signing,/\$signature\.SignerCertificate\.Thumbprint -ne \$thumbprint/);
assert.match(signing,/!\$signature\.TimeStamperCertificate/);
assert.match(signing,/if \(\$LASTEXITCODE -ne 0\) \{ throw 'Code signing or timestamping failed/);

const publishRelease=index(release,"& $gh @releaseArgs");
const pushMain=index(release,"& $git push origin HEAD:main");
assert.ok(publishRelease<pushMain,"Public update metadata must only advance after the release asset is available.");
assert.match(release.slice(publishRelease,pushMain),/if \(\$Draft\)\s*\{[^}]*\breturn\b[^}]*\}/,
  "Draft releases must return before publishing the public update manifest.");
const prepareOnly=index(release,"if ($PrepareOnly)");
const staging=index(release,"& $git -C $repoRoot add -- @releasePaths");
assert.ok(prepareOnly<staging);
assert.match(release.slice(prepareOnly,staging),/if \(\$PrepareOnly\)\s*\{[^}]*\breturn\b[^}]*\}/);

// Build-generated assets must ship. Otherwise a valid build can publish an
// older checked-in manifest or omit the source change from the release commit.
assert.match(project,/<Target Name="GenerateUiAssetManifest" BeforeTargets="PrepareForBuild"/);
assert.match(project,/<None Include="ui-assets-manifest\.json"[^>]*CopyToOutputDirectory="PreserveNewest"[^>]*CopyToPublishDirectory="PreserveNewest"/);
const stagedPaths=release.match(/\$releasePaths\s*=\s*@\(([\s\S]*?)\n\)/)?.[1]??"";
const manifestAssignment=release.match(/(\$[A-Za-z][A-Za-z0-9]*)\s*=\s*Join-Path\s+\$sourceRoot\s+["']ui-assets-manifest\.json["']/);
assert.ok((manifestAssignment&&stagedPaths.includes(manifestAssignment[1]))||/Join-Path\s+\$sourceRoot\s+['"]ui-assets-manifest\.json['"]/.test(stagedPaths),
  "Release staging must include the UI asset manifest regenerated during the build.");

console.log("Release safeguards passed: PowerShell syntax; isolated fail-closed signing preflight; signing/hash order; draft publication gate; generated manifest staging. Nothing was built, signed or published.");
