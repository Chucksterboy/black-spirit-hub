param(
	[Parameter(Mandatory = $true)]
	[string]$Version,

	[string]$Repository = "Chucksterboy/black-spirit-hub",

	[string]$Notes = "",

	[switch]$Draft
)

$ErrorActionPreference = "Stop"

function Resolve-ToolPath {
	param(
		[string]$Command,
		[string[]]$Fallbacks
	)

	$found = Get-Command $Command -ErrorAction SilentlyContinue
	if ($found) {
		return $found.Source
	}

	foreach ($fallback in $Fallbacks) {
		$match = Get-ChildItem -Path $fallback -ErrorAction SilentlyContinue | Select-Object -Last 1
		if ($match) {
			return $match.FullName
		}
	}

	throw "Could not find required tool: $Command"
}

function Resolve-DotnetSdkPath {
	param([string]$RepoRoot)

	$candidates = @(
		(Join-Path $RepoRoot ".dotnet-sdk\dotnet.exe"),
		"$env:ProgramFiles\dotnet\dotnet.exe"
	)
	$pathCommand = Get-Command "dotnet" -ErrorAction SilentlyContinue
	if ($pathCommand) {
		$candidates += $pathCommand.Source
	}

	foreach ($candidate in ($candidates | Select-Object -Unique)) {
		if (!(Test-Path -LiteralPath $candidate)) {
			continue
		}

		$sdks = & $candidate --list-sdks 2>$null
		if ($LASTEXITCODE -eq 0 -and ![string]::IsNullOrWhiteSpace(($sdks | Out-String))) {
			return $candidate
		}
	}

	throw "Could not find a .NET SDK. Install the .NET 8 SDK or place it in .dotnet-sdk."
}

function Normalize-Version {
	param([string]$Value)
	$clean = $Value.Trim()
	if ($clean.StartsWith("v", [System.StringComparison]::OrdinalIgnoreCase)) {
		return "v" + $clean.Substring(1)
	}

	return "v" + $clean
}

function Get-Assembly-Version {
	param([string]$Value)
	$clean = $Value.Trim().TrimStart("v", "V")
	$parts = @($clean.Split(".") | Where-Object { $_ -ne "" })
	while ($parts.Count -lt 4) {
		$parts += "0"
	}

	return ($parts[0..3] -join ".")
}

function Replace-Text {
	param(
		[string]$Path,
		[string]$Pattern,
		[string]$Replacement
	)

	$text = [System.IO.File]::ReadAllText($Path)
	if (![regex]::IsMatch($text, $Pattern)) {
		throw "No replacement was made in $Path"
	}

	$newText = [regex]::Replace($text, $Pattern, $Replacement)
	[System.IO.File]::WriteAllText(
		$Path,
		$newText,
		[System.Text.UTF8Encoding]::new($false)
	)
}

function Resolve-BdoAlertsReleaseCredential {
	$variableName = "BLACK_SPIRIT_HUB_BDOALERTS_API_KEY"
	$value = [Environment]::GetEnvironmentVariable($variableName, "Process")
	if ([string]::IsNullOrWhiteSpace($value)) {
		$value = [Environment]::GetEnvironmentVariable($variableName, "User")
	}
	$value = if ($null -eq $value) { "" } else { $value.Trim() }
	if ($value -notmatch '^bdo_[A-Za-z0-9]{20,128}$') {
		throw "A valid local BDO Alerts release credential is required. Configure it outside the repository before publishing."
	}

	[Environment]::SetEnvironmentVariable($variableName, $value, "Process")
	return $value
}

function Assert-CredentialNotTracked {
	param(
		[Parameter(Mandatory = $true)]
		[string]$RepoRoot,

		[Parameter(Mandatory = $true)]
		[string]$GitPath,

		[Parameter(Mandatory = $true)]
		[string]$Credential
	)

	$releaseFiles = & $GitPath -C $RepoRoot ls-files --cached --others --exclude-standard
	if ($LASTEXITCODE -ne 0) {
		throw "Could not inspect files selected for release."
	}

	$textExtensions = [System.Collections.Generic.HashSet[string]]::new(
		[StringComparer]::OrdinalIgnoreCase)
	foreach ($extension in @(
		".bat", ".cmd", ".config", ".cs", ".csproj", ".css", ".env", ".html",
		".iss", ".js", ".json", ".md", ".mjs", ".props", ".ps1", ".psm1",
		".sh", ".sln", ".targets", ".toml", ".txt", ".xml", ".yaml", ".yml"
	)) {
		[void]$textExtensions.Add($extension)
	}
	$textNames = [System.Collections.Generic.HashSet[string]]::new(
		[StringComparer]::OrdinalIgnoreCase)
	foreach ($name in @(".gitattributes", ".gitignore", "Dockerfile", "LICENSE", "README")) {
		[void]$textNames.Add($name)
	}

	foreach ($relativePath in $releaseFiles) {
		$path = Join-Path $RepoRoot $relativePath
		if (!(Test-Path -LiteralPath $path -PathType Leaf)) {
			continue
		}
		$item = Get-Item -LiteralPath $path
		if ($item.Length -gt 4MB -or
			(!$textExtensions.Contains($item.Extension) -and !$textNames.Contains($item.Name))) {
			continue
		}
		try {
			$text = [System.IO.File]::ReadAllText($path)
			if ($text.IndexOf($Credential, [StringComparison]::Ordinal) -ge 0) {
				throw "Release stopped because the BDO Alerts credential appears in a source file selected for release."
			}
		}
		catch [System.Text.DecoderFallbackException] {
		}
	}
}

function Assert-RunsWithoutDotnetRuntime {
	param(
		[Parameter(Mandatory = $true)]
		[string]$FilePath,

		[string[]]$Arguments = @(),

		[string]$WorkingDirectory = (Split-Path -Parent $FilePath)
	)

	$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd("\") + "\"
	$emptyDotnetRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("black-spirit-hub-empty-dotnet-" + [Guid]::NewGuid().ToString("N"))
	[System.IO.Directory]::CreateDirectory($emptyDotnetRoot) | Out-Null
	$environmentNames = @(
		"DOTNET_ROOT",
		"DOTNET_ROOT_X64",
		"DOTNET_MULTILEVEL_LOOKUP",
		"DOTNET_DISABLE_GUI_ERRORS"
	)
	$savedEnvironment = @{}
	foreach ($name in $environmentNames) {
		$savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
	}

	try {
		[Environment]::SetEnvironmentVariable("DOTNET_ROOT", $emptyDotnetRoot, "Process")
		[Environment]::SetEnvironmentVariable("DOTNET_ROOT_X64", $emptyDotnetRoot, "Process")
		[Environment]::SetEnvironmentVariable("DOTNET_MULTILEVEL_LOOKUP", "0", "Process")
		[Environment]::SetEnvironmentVariable("DOTNET_DISABLE_GUI_ERRORS", "1", "Process")
		$process = Start-Process `
			-FilePath $FilePath `
			-ArgumentList $Arguments `
			-WorkingDirectory $WorkingDirectory `
			-Wait `
			-PassThru
		if ($process.ExitCode -ne 0) {
			throw "Self-contained smoke test failed: $FilePath (exit $($process.ExitCode))."
		}
	} finally {
		foreach ($name in $environmentNames) {
			[Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], "Process")
		}
		$resolvedEmptyRoot = [System.IO.Path]::GetFullPath($emptyDotnetRoot)
		if (!$resolvedEmptyRoot.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
			throw "Refusing unsafe temporary cleanup path: $resolvedEmptyRoot"
		}
		if (Test-Path -LiteralPath $resolvedEmptyRoot) {
			Remove-Item -LiteralPath $resolvedEmptyRoot -Recurse -Force
		}
	}
}

function Assert-AppPublishFiles {
	param([Parameter(Mandatory = $true)][string]$PublishRoot)

	$requiredFiles = @(
		"Black Spirit Hub.exe",
		"onnxruntime.dll",
		"onnxruntime_providers_shared.dll",
		"WebView2Loader.dll",
		"e_sqlite3.dll",
		"BlackSpiritHub.Resources.Black_Spirit_Hub.html",
		"BlackSpiritHub.Resources.Black_Spirit_Hub.css",
		"BlackSpiritHub.Resources.Black_Spirit_Hub.js",
		"gold-coins.png",
		"Assets\AppIcon\app-icon.ico",
		"Assets\AppIcon\tray-icon.ico",
		"Assets\AppIcon\app-icon.png",
		"Assets\AppIcon\app-icon-ui.png",
		"Assets\Alarm.mp3",
		"Assets\GrindTracker\grind-spots.js",
		"Assets\GrindTracker\grind-spots-inner-edania.js",
		"Assets\GrindTracker\grind-spots-corrections.js",
		"Assets\GrindTracker\grind-guides.js",
		"Assets\GrindTracker\grind-guides-current.js",
		"Assets\RecipeBook\recipes.json",
		"Assets\RecipeBook\manifest.json",
		"Assets\RecipeBook\bundle-id.txt",
		"Assets\RecipeBook\NOTICE.txt",
		"Assets\RecipeBook\icons\item-fallback.svg",
		"Assets\RecipeBook\ocr\icon-atlas.png",
		"Assets\RecipeBook\ocr\icon-index.json",
		"Assets\RecipeBook\ocr\ppocrv5\en_PP-OCRv5_mobile_rec.onnx",
		"Assets\RecipeBook\ocr\LICENSE-PADDLEOCR.txt",
		"Assets\RecipeBook\ocr\MODEL-NOTICE-PPOCRV5.txt",
		"Assets\RecipeBook\ocr\LICENSE-ONNXRUNTIME.txt",
		"Assets\RecipeBook\ocr\THIRD-PARTY-NOTICES-ONNXRUNTIME.txt"
	)
	foreach ($relativePath in $requiredFiles) {
		$path = Join-Path $PublishRoot $relativePath
		if (!(Test-Path -LiteralPath $path -PathType Leaf) -or (Get-Item -LiteralPath $path).Length -le 0) {
			throw "Required self-contained application file is missing or empty: $relativePath"
		}
	}
	foreach ($relativeDirectory in @("Assets", "ThemeAssets")) {
		$directory = Join-Path $PublishRoot $relativeDirectory
		if (!(Test-Path -LiteralPath $directory -PathType Container) -or
			!(Get-ChildItem -LiteralPath $directory -Recurse -File | Select-Object -First 1)) {
			throw "Required application directory is missing or empty: $relativeDirectory"
		}
	}
}

$versionTag = Normalize-Version $Version
$packageVersion = $versionTag.Substring(1)
$assemblyVersion = Get-Assembly-Version $versionTag
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$sourceRoot = Join-Path $repoRoot "Source Code"
$projectFile = Join-Path $sourceRoot "Black Spirit Hub.csproj"
$legacyInstallerProject = Join-Path $sourceRoot "InstallerSource\BlackSpiritHubInstaller\BlackSpiritHubInstaller.csproj"
$nativeInstallerSource = Join-Path $sourceRoot "InstallerSource\InnoSetup\BlackSpiritHub.iss"
$appVersionFile = Join-Path $sourceRoot "BlackSpiritHub\AppVersion.cs"
$htmlFile = Join-Path $sourceRoot "BlackSpiritHub.Resources.Black_Spirit_Hub.html"
$assemblyInfoFile = Join-Path $sourceRoot "Properties\AssemblyInfo.cs"
$updateManifestFile = Join-Path $repoRoot "update.json"
$sourceUpdateManifestFile = Join-Path $sourceRoot "update.json"
$artifactRoot = Join-Path $repoRoot "artifacts"
$appOut = Join-Path $artifactRoot "App Files"
$installerOut = Join-Path $artifactRoot "Installer"
$installerReleaseAsset = Join-Path $installerOut "Black-Spirit-Hub-Installer.exe"
$installerAssetName = Split-Path $installerReleaseAsset -Leaf
$maxInAppInstallerBytes = [int64]250 * 1024 * 1024
$verifyScript = Join-Path $repoRoot "scripts\verify.ps1"
$iconBuildScript = Join-Path $repoRoot "scripts\build-app-icons.ps1"
$nativeInstallerBuildScript = Join-Path $repoRoot "scripts\build-native-installer.ps1"

$dotnet = Resolve-DotnetSdkPath $repoRoot
$git = Resolve-ToolPath "git" @("$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe")
$gh = Resolve-ToolPath "gh" @("$env:LOCALAPPDATA\Microsoft\WinGet\Packages\GitHub.cli_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\gh.exe")

Set-Location $repoRoot

$currentBranch = (& $git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($currentBranch)) {
	throw "Release must run from a named branch."
}
$pendingChanges = & $git status --porcelain
if ($LASTEXITCODE -ne 0) {
	throw "Could not inspect the Git working tree."
}
if ($pendingChanges) {
	throw "Release requires a clean working tree. Commit the intended feature changes first."
}
& $git fetch origin main
if ($LASTEXITCODE -ne 0) {
	throw "Could not refresh origin/main before release."
}
& $git merge-base --is-ancestor origin/main HEAD
if ($LASTEXITCODE -ne 0) {
	throw "The release branch must be based on the current origin/main."
}

$bdoAlertsReleaseCredential = Resolve-BdoAlertsReleaseCredential
Assert-CredentialNotTracked `
	-RepoRoot $repoRoot `
	-GitPath $git `
	-Credential $bdoAlertsReleaseCredential

Write-Host "Preparing Black Spirit Hub $versionTag"

Replace-Text $appVersionFile 'public const string Current = "v[^"]+";' ('public const string Current = "' + $versionTag + '";')
Replace-Text $assemblyInfoFile 'AssemblyFileVersion\("[^"]+"\)' ('AssemblyFileVersion("' + $assemblyVersion + '")')
Replace-Text $assemblyInfoFile 'AssemblyInformationalVersion\("[^"]+"\)' ('AssemblyInformationalVersion("' + $versionTag + '")')
Replace-Text $assemblyInfoFile 'AssemblyVersion\("[^"]+"\)' ('AssemblyVersion("' + $assemblyVersion + '")')
Replace-Text $legacyInstallerProject '<Version>[^<]+</Version>' ('<Version>' + $packageVersion + '</Version>')
Replace-Text $legacyInstallerProject '<AssemblyVersion>[^<]+</AssemblyVersion>' ('<AssemblyVersion>' + $assemblyVersion + '</AssemblyVersion>')
Replace-Text $legacyInstallerProject '<FileVersion>[^<]+</FileVersion>' ('<FileVersion>' + $assemblyVersion + '</FileVersion>')
Replace-Text $legacyInstallerProject '<InformationalVersion>[^<]+</InformationalVersion>' ('<InformationalVersion>' + $versionTag + '</InformationalVersion>')
Replace-Text $nativeInstallerSource '#define AppVersion "[^"]+"' ('#define AppVersion "' + $packageVersion + '"')
Replace-Text $nativeInstallerSource '#define AppFileVersion "[^"]+"' ('#define AppFileVersion "' + $assemblyVersion + '"')
Replace-Text $htmlFile 'BlackSpiritHub\.Resources\.Black_Spirit_Hub\.css(?:\?v=[^"]+)?' ('BlackSpiritHub.Resources.Black_Spirit_Hub.css?v=' + $versionTag)
Replace-Text $htmlFile 'Assets/GrindTracker/grind-spots\.js(?:\?v=[^"]+)?' ('Assets/GrindTracker/grind-spots.js?v=' + $versionTag)
Replace-Text $htmlFile 'Assets/GrindTracker/grind-spots-inner-edania\.js(?:\?v=[^"]+)?' ('Assets/GrindTracker/grind-spots-inner-edania.js?v=' + $versionTag)
Replace-Text $htmlFile 'Assets/GrindTracker/grind-spots-corrections\.js(?:\?v=[^"]+)?' ('Assets/GrindTracker/grind-spots-corrections.js?v=' + $versionTag)
Replace-Text $htmlFile 'Assets/GrindTracker/grind-guides\.js(?:\?v=[^"]+)?' ('Assets/GrindTracker/grind-guides.js?v=' + $versionTag)
Replace-Text $htmlFile 'Assets/GrindTracker/grind-guides-current\.js(?:\?v=[^"]+)?' ('Assets/GrindTracker/grind-guides-current.js?v=' + $versionTag)
Replace-Text $htmlFile 'BlackSpiritHub\.Resources\.Black_Spirit_Hub\.js(?:\?v=[^"]+)?' ('BlackSpiritHub.Resources.Black_Spirit_Hub.js?v=' + $versionTag)

$manifest = [ordered]@{
	version = $versionTag
	releaseUrl = "https://github.com/$Repository/releases/latest"
	downloadUrl = "https://github.com/$Repository/releases/download/$versionTag/$installerAssetName"
	sha256 = ""
	notes = if ([string]::IsNullOrWhiteSpace($Notes)) { "Black Spirit Hub $versionTag release." } else { $Notes }
}
$manifestJson = $manifest | ConvertTo-Json
[System.IO.File]::WriteAllText(
	$updateManifestFile,
	$manifestJson + [Environment]::NewLine,
	[System.Text.UTF8Encoding]::new($false)
)
Copy-Item -LiteralPath $updateManifestFile -Destination $sourceUpdateManifestFile -Force

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $iconBuildScript
if ($LASTEXITCODE -ne 0) {
	throw "Application icon generation failed."
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyScript
if ($LASTEXITCODE -ne 0) {
	throw "Pre-release verification failed."
}

if (Test-Path -LiteralPath $artifactRoot) {
	Remove-Item -LiteralPath $artifactRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $appOut -Force | Out-Null
New-Item -ItemType Directory -Path $installerOut -Force | Out-Null

& $dotnet publish $projectFile -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=false -p:PublishReadyToRun=false -p:PublishTrimmed=false -o $appOut
if ($LASTEXITCODE -ne 0) {
	throw "Application publish failed."
}

Get-ChildItem -LiteralPath $appOut -Recurse -File | Where-Object { $_.Extension -in @(".pdb", ".xml") } | Remove-Item -Force
$runtimes = Join-Path $appOut "runtimes"
if (Test-Path -LiteralPath $runtimes) {
	Get-ChildItem -LiteralPath $runtimes -Directory | Where-Object { $_.Name -ne "win-x64" } | Remove-Item -Recurse -Force
}

Assert-AppPublishFiles -PublishRoot $appOut
$appExe = Join-Path $appOut "Black Spirit Hub.exe"
Assert-RunsWithoutDotnetRuntime `
	-FilePath $appExe `
	-Arguments @("--offline-smoke-test") `
	-WorkingDirectory $appOut

& powershell.exe `
	-NoProfile `
	-ExecutionPolicy Bypass `
	-File $nativeInstallerBuildScript `
	-Version $packageVersion `
	-AppFilesPath $appOut `
	-OutputPath $installerOut `
	-RunIntegrationTest
if ($LASTEXITCODE -ne 0) {
	throw "Native installer build failed."
}

if (!(Test-Path -LiteralPath $installerReleaseAsset)) {
	throw "Native installer was not created: $installerReleaseAsset"
}
if ((Get-Item -LiteralPath $installerReleaseAsset).Length -gt $maxInAppInstallerBytes) {
	throw "Installer exceeds the application's 250 MiB safe-download limit."
}

$manifest.sha256 = (Get-FileHash -LiteralPath $installerReleaseAsset -Algorithm SHA256).Hash.ToUpperInvariant()
$manifestJson = $manifest | ConvertTo-Json
[System.IO.File]::WriteAllText(
	$updateManifestFile,
	$manifestJson + [Environment]::NewLine,
	[System.Text.UTF8Encoding]::new($false)
)
Copy-Item -LiteralPath $updateManifestFile -Destination $sourceUpdateManifestFile -Force

& $gh auth status | Out-Host
if ($LASTEXITCODE -ne 0) {
	throw "GitHub CLI is not logged in."
}

$releasePaths = @(
	$appVersionFile,
	$assemblyInfoFile,
	$legacyInstallerProject,
	$nativeInstallerSource,
	$htmlFile,
	$updateManifestFile,
	$sourceUpdateManifestFile
)
& $git -C $repoRoot add -- @releasePaths
if ($LASTEXITCODE -ne 0) {
	throw "Git staging failed."
}
& $git commit -m "Release $versionTag"
if ($LASTEXITCODE -ne 0) {
	throw "Git commit failed."
}

& $git tag -a $versionTag -m "Black Spirit Hub $versionTag"
if ($LASTEXITCODE -ne 0) {
	throw "Git tag failed. The tag may already exist."
}

& $git push origin HEAD:main
if ($LASTEXITCODE -ne 0) {
	throw "Git push failed. The release commit and manifest were not published to main."
}

& $git push origin $versionTag
if ($LASTEXITCODE -ne 0) {
	throw "Git tag push failed."
}

$releaseArgs = @("release", "create", $versionTag, $installerReleaseAsset, "--repo", $Repository, "--title", "Black Spirit Hub $versionTag", "--notes")
$releaseNotes = if ([string]::IsNullOrWhiteSpace($Notes)) {
	"Black Spirit Hub $versionTag release."
} else {
	$Notes
}
$releaseArgs += $releaseNotes
if ($Draft) {
	$releaseArgs += "--draft"
} else {
	$releaseArgs += "--latest"
}

& $gh @releaseArgs
if ($LASTEXITCODE -ne 0) {
	throw "GitHub release creation failed."
}

Write-Host "Release complete: $versionTag"
Write-Host "Installer: $installerReleaseAsset"
