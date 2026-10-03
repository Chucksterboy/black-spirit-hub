param(
	[Parameter(Mandatory = $true)][string]$IdentityName,
	[Parameter(Mandatory = $true)][string]$Publisher,
	[Parameter(Mandatory = $true)][string]$PublisherDisplayName,
	[Parameter(Mandatory = $true)][string]$DisplayName,
	[Parameter(Mandatory = $true)][string]$Version,
	[Parameter(Mandatory = $true)][string]$PlayerGuildGatewayUrl,
	[Parameter(Mandatory = $true)][string]$UpdateManifestUrl,
	[string]$OutputDirectory = ""
)

$ErrorActionPreference = "Stop"

function Resolve-Tool {
	param(
		[Parameter(Mandatory = $true)][string]$Name,
		[Parameter(Mandatory = $true)][string[]]$Candidates
	)
	foreach ($candidate in $Candidates) {
		if (Test-Path -LiteralPath $candidate -PathType Leaf) {
			return (Resolve-Path -LiteralPath $candidate).Path
		}
	}
	$command = Get-Command $Name -ErrorAction SilentlyContinue
	if ($command) {
		return $command.Source
	}
	throw "$Name could not be found."
}

function ConvertTo-XmlValue {
	param([Parameter(Mandatory = $true)][string]$Value)
	if ([string]::IsNullOrWhiteSpace($Value) -or $Value.Contains("__")) {
		throw "A required Store identity value is blank or still contains a placeholder."
	}
	return [System.Security.SecurityElement]::Escape($Value.Trim())
}

function Normalize-PlayerGuildGatewayUrl {
	param([Parameter(Mandatory = $true)][string]$Value)
	$gatewayUri = $null
	if (
		-not [Uri]::TryCreate($Value.Trim(), [UriKind]::Absolute, [ref]$gatewayUri) -or
		$gatewayUri.Scheme -ne [Uri]::UriSchemeHttps -or
		-not $gatewayUri.IsDefaultPort -or
		[string]::IsNullOrEmpty($gatewayUri.Host) -or
		-not [string]::IsNullOrEmpty($gatewayUri.UserInfo) -or
		-not [string]::IsNullOrEmpty($gatewayUri.Query) -or
		-not [string]::IsNullOrEmpty($gatewayUri.Fragment) -or
		$gatewayUri.AbsolutePath -ne "/") {
		throw "PlayerGuildGatewayUrl must be an HTTPS root URL without credentials, query text, or a fragment."
	}
	return $gatewayUri.AbsoluteUri
}

function Normalize-UpdateManifestUrl {
	param([Parameter(Mandatory = $true)][string]$Value)
	$manifestUri = $null
	if (
		-not [Uri]::TryCreate($Value.Trim(), [UriKind]::Absolute, [ref]$manifestUri) -or
		$manifestUri.Scheme -ne [Uri]::UriSchemeHttps -or
		-not $manifestUri.IsDefaultPort -or
		-not $manifestUri.Host.EndsWith(".workers.dev", [StringComparison]::OrdinalIgnoreCase) -or
		-not [string]::IsNullOrEmpty($manifestUri.UserInfo) -or
		-not [string]::IsNullOrEmpty($manifestUri.Query) -or
		-not [string]::IsNullOrEmpty($manifestUri.Fragment) -or
		$manifestUri.AbsolutePath -ne "/status/update") {
		throw "UpdateManifestUrl must be the HTTPS /status/update endpoint on a workers.dev host without credentials, query text, or a fragment."
	}
	return $manifestUri.AbsoluteUri
}

if ($Version -notmatch '^\d{1,5}\.\d{1,5}\.\d{1,5}\.\d{1,5}$') {
	throw "Version must use four numeric components, for example 0.9.66.0."
}
foreach ($component in $Version.Split('.')) {
	if ([uint32]$component -gt 65535) {
		throw "Each MSIX version component must be between 0 and 65535."
	}
}
$normalizedPlayerGuildGatewayUrl = Normalize-PlayerGuildGatewayUrl $PlayerGuildGatewayUrl
$normalizedUpdateManifestUrl = Normalize-UpdateManifestUrl $UpdateManifestUrl

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$sourceRoot = Join-Path $repoRoot "Source Code"
$projectFile = Join-Path $sourceRoot "Black Spirit Hub.csproj"
$appVersionSource = Join-Path $sourceRoot "BlackSpiritHub\AppVersion.cs"
$assemblyInfoSource = Join-Path $sourceRoot "Properties\AssemblyInfo.cs"
$manifestTemplate = Join-Path $sourceRoot "StorePackage\AppxManifest.xml.template"
$storeAssets = Join-Path $sourceRoot "StorePackage\Assets"
$assetBuildScript = Join-Path $PSScriptRoot "build-store-assets.ps1"
$sdkRoot = Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\bin"
$makeAppxCandidates = Get-ChildItem -LiteralPath $sdkRoot -Recurse -Filter makeappx.exe -File |
	Where-Object { $_.FullName -match '\\x64\\makeappx\.exe$' } |
	Sort-Object FullName -Descending |
	ForEach-Object FullName
$makePriCandidates = Get-ChildItem -LiteralPath $sdkRoot -Recurse -Filter makepri.exe -File |
	Where-Object { $_.FullName -match '\\x64\\makepri\.exe$' } |
	Sort-Object FullName -Descending |
	ForEach-Object FullName
$dotnet = Resolve-Tool -Name "dotnet" -Candidates @(
	(Join-Path $repoRoot ".dotnet-sdk\dotnet.exe"),
	(Join-Path $env:ProgramFiles "dotnet\dotnet.exe")
)
$makeAppx = Resolve-Tool -Name "makeappx" -Candidates $makeAppxCandidates
$makePri = Resolve-Tool -Name "makepri" -Candidates $makePriCandidates

foreach ($path in @($projectFile, $appVersionSource, $assemblyInfoSource, $manifestTemplate, $assetBuildScript)) {
	if (!(Test-Path -LiteralPath $path -PathType Leaf)) {
		throw "Required Store build input is missing: $path"
	}
}

$expectedAppVersion = "v" + (($Version.Split(".")[0..2]) -join ".")
$appVersionText = Get-Content -LiteralPath $appVersionSource -Raw
$assemblyInfoText = Get-Content -LiteralPath $assemblyInfoSource -Raw
if (
	$appVersionText -notmatch ('Current\s*=\s*"' + [regex]::Escape($expectedAppVersion) + '"') -or
	$assemblyInfoText -notmatch ('AssemblyFileVersion\("' + [regex]::Escape($Version) + '"\)') -or
	$assemblyInfoText -notmatch ('AssemblyVersion\("' + [regex]::Escape($Version) + '"\)')) {
	throw "Source version metadata must match the Store package version $Version before packaging."
}

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
	$OutputDirectory = Join-Path $repoRoot ("artifacts\store\" + $Version)
}
$resolvedOutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
$artifactRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot "artifacts\store"))
if (!$resolvedOutputDirectory.StartsWith($artifactRoot, [StringComparison]::OrdinalIgnoreCase)) {
	throw "Store output must stay under $artifactRoot"
}

$stageRoot = Join-Path $resolvedOutputDirectory "staging"
$packagePath = Join-Path $resolvedOutputDirectory ("Black-Spirit-Hub-Store-" + $Version + ".msix")
$uploadDirectory = Join-Path $resolvedOutputDirectory "upload"
$uploadPath = Join-Path $resolvedOutputDirectory ("Black-Spirit-Hub-Store-" + $Version + ".msixupload")
$priConfig = Join-Path $resolvedOutputDirectory "priconfig.xml"
$validationRoot = Join-Path $resolvedOutputDirectory "validation"

if ((Test-Path -LiteralPath $stageRoot) -or (Test-Path -LiteralPath $packagePath) -or (Test-Path -LiteralPath $uploadPath)) {
	throw "Store output already exists. Preserve or inspect it before building again: $resolvedOutputDirectory"
}

[System.IO.Directory]::CreateDirectory($stageRoot) | Out-Null
[System.IO.Directory]::CreateDirectory($uploadDirectory) | Out-Null

# The Store build must never inherit a developer's shared service credential.
$credentialName = "BLACK_SPIRIT_HUB_BDOALERTS_API_KEY"
$previousCredential = [Environment]::GetEnvironmentVariable($credentialName, "Process")
try {
	[Environment]::SetEnvironmentVariable($credentialName, $null, "Process")
	& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $assetBuildScript -SourceRoot $sourceRoot
	if ($LASTEXITCODE -ne 0) { throw "Store visual asset generation failed." }
	& $dotnet publish $projectFile -c Release -r win-x64 --self-contained true `
		-p:BlackSpiritHubStore=true `
		("-p:BdoPlayerGuildGatewayUrl=" + $normalizedPlayerGuildGatewayUrl) `
		("-p:MicrosoftStoreUpdateManifestUrl=" + $normalizedUpdateManifestUrl) `
		-p:PublishSingleFile=true `
		-p:IncludeNativeLibrariesForSelfExtract=false `
		-p:PublishReadyToRun=false `
		-p:PublishTrimmed=false `
		-o $stageRoot
	if ($LASTEXITCODE -ne 0) { throw "Store application publish failed." }
}
finally {
	[Environment]::SetEnvironmentVariable($credentialName, $previousCredential, "Process")
}

foreach ($debugFile in Get-ChildItem -LiteralPath $stageRoot -Recurse -File | Where-Object { $_.Extension -in @(".pdb", ".xml") }) {
	$debugFile.Delete()
}

$requiredExecutable = Join-Path $stageRoot "Black Spirit Hub.exe"
if (!(Test-Path -LiteralPath $requiredExecutable -PathType Leaf)) {
	throw "The Store publish is missing Black Spirit Hub.exe."
}

$manifest = Get-Content -LiteralPath $manifestTemplate -Raw
$manifest = $manifest.Replace("__IDENTITY_NAME__", (ConvertTo-XmlValue $IdentityName))
$manifest = $manifest.Replace("__PUBLISHER__", (ConvertTo-XmlValue $Publisher))
$manifest = $manifest.Replace("__PUBLISHER_DISPLAY_NAME__", (ConvertTo-XmlValue $PublisherDisplayName))
$manifest = $manifest.Replace("__DISPLAY_NAME__", (ConvertTo-XmlValue $DisplayName))
$manifest = $manifest.Replace("__VERSION__", $Version)
[System.IO.File]::WriteAllText(
	(Join-Path $stageRoot "AppxManifest.xml"),
	$manifest,
	[System.Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath $storeAssets -Destination (Join-Path $stageRoot "Assets\Store") -Recurse

& $makePri createconfig /cf $priConfig /dq en-US
if ($LASTEXITCODE -ne 0) { throw "Could not create the Microsoft Store PRI configuration." }
& $makePri new /pr $stageRoot /cf $priConfig /of (Join-Path $stageRoot "resources.pri")
if ($LASTEXITCODE -ne 0) { throw "Could not generate resources.pri for the Store package." }
& $makeAppx pack /d $stageRoot /p $packagePath /o
if ($LASTEXITCODE -ne 0) { throw "Could not create the MSIX package." }
# Current Windows SDK MakeAppx builds do not all expose a `validate` command.
# Unpacking the completed package with the same SDK still verifies that the package
# is structurally readable, and these required payload checks validate its essentials.
& $makeAppx unpack /p $packagePath /d $validationRoot /o
if ($LASTEXITCODE -ne 0) { throw "MSIX package validation failed." }
foreach ($requiredValidationFile in @(
	"AppxManifest.xml",
	"resources.pri",
	"Black Spirit Hub.exe"
)) {
	if (!(Test-Path -LiteralPath (Join-Path $validationRoot $requiredValidationFile) -PathType Leaf)) {
		throw "MSIX validation is missing required package content: $requiredValidationFile"
	}
}

# Target-size icon assets are what Windows selects for the taskbar, Task View,
# and Start. Verify the completed package carries every transparent variant,
# rather than only the dark 44px tile fallback.
Add-Type -AssemblyName System.Drawing
$taskbarTargetSizes = @(16, 20, 24, 30, 32, 36, 40, 44, 48, 60, 64, 72, 80, 96, 256)
$taskbarThemeSuffixes = @("", "_altform-unplated", "_altform-lightunplated")
$requiredTaskbarAssets = @("Square44x44Logo.png")
foreach ($size in $taskbarTargetSizes) {
	foreach ($suffix in $taskbarThemeSuffixes) {
		$requiredTaskbarAssets += "Square44x44Logo.targetsize-$size$suffix.png"
	}
}
foreach ($scale in @("100", "125", "150", "200", "400")) {
	$requiredTaskbarAssets += "Square44x44Logo.scale-$scale.png"
}
foreach ($assetName in $requiredTaskbarAssets) {
	$assetPath = Join-Path $validationRoot (Join-Path "Assets\Store" $assetName)
	if (!(Test-Path -LiteralPath $assetPath -PathType Leaf)) {
		throw "MSIX validation is missing the Store taskbar icon asset: $assetName"
	}
	if ($assetName -match 'targetsize-(\d+)') {
		$expectedSize = [int]$Matches[1]
		$asset = [System.Drawing.Bitmap]::new($assetPath)
		try {
			if ($asset.Width -ne $expectedSize -or $asset.Height -ne $expectedSize) {
				throw "MSIX taskbar asset has incorrect dimensions: $assetName"
			}
			foreach ($corner in @(
				[System.Drawing.Point]::new(0, 0),
				[System.Drawing.Point]::new($expectedSize - 1, 0),
				[System.Drawing.Point]::new(0, $expectedSize - 1),
				[System.Drawing.Point]::new($expectedSize - 1, $expectedSize - 1)
			)) {
				if ($asset.GetPixel($corner.X, $corner.Y).A -ne 0) {
					throw "MSIX taskbar asset is not transparent at its canvas edge: $assetName"
				}
			}
		}
		finally {
			$asset.Dispose()
		}
	}
}

Copy-Item -LiteralPath $packagePath -Destination $uploadDirectory
Compress-Archive -LiteralPath (Join-Path $uploadDirectory (Split-Path -Leaf $packagePath)) -DestinationPath ($uploadPath + ".zip")
Move-Item -LiteralPath ($uploadPath + ".zip") -Destination $uploadPath

Write-Host "Store package validated: $packagePath"
Write-Host "Store upload bundle: $uploadPath"
Write-Host "This package is intentionally unsigned for Partner Center. Do not sideload it; Microsoft signs the MSIX after certification."
