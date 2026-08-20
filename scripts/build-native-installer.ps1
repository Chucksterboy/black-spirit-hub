param(
	[Parameter(Mandatory = $true)]
	[string]$Version,

	[string]$AppFilesPath,

	[string]$OutputPath,

	[string]$WebViewBootstrapperPath,

	[switch]$RunIntegrationTest
)

$ErrorActionPreference = "Stop"

function Resolve-InnoCompiler {
	$candidates = @(
		(Join-Path $env:LOCALAPPDATA "Programs\Inno Setup 6\ISCC.exe"),
		(Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe"),
		(Join-Path $env:ProgramFiles "Inno Setup 6\ISCC.exe")
	)
	$command = Get-Command "ISCC.exe" -ErrorAction SilentlyContinue
	if ($command) {
		$candidates += $command.Source
	}

	foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
		if (Test-Path -LiteralPath $candidate -PathType Leaf) {
			return (Resolve-Path -LiteralPath $candidate).Path
		}
	}

	throw "Inno Setup 6 is required to build the native installer. Install JRSoftware.InnoSetup 6.7.3 or newer."
}

function Assert-AppPublish {
	param([string]$PublishRoot)

	foreach ($relativePath in @(
		"Black Spirit Hub.exe",
		"onnxruntime.dll",
		"onnxruntime_providers_shared.dll",
		"WebView2Loader.dll",
		"e_sqlite3.dll",
		"BlackSpiritHub.Resources.Black_Spirit_Hub.html",
		"BlackSpiritHub.Resources.Black_Spirit_Hub.css",
		"BlackSpiritHub.Resources.Black_Spirit_Hub.js",
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
	)) {
		$path = Join-Path $PublishRoot $relativePath
		if (!(Test-Path -LiteralPath $path -PathType Leaf) -or (Get-Item -LiteralPath $path).Length -le 0) {
			throw "The application publish is incomplete: $relativePath"
		}
	}
}

function Test-MicrosoftDownloadHost {
	param([Uri]$Uri)

	if (!$Uri -or $Uri.Scheme -ne "https") {
		return $false
	}

	$hostName = $Uri.DnsSafeHost.TrimEnd(".")
	return $hostName.Equals("microsoft.com", [StringComparison]::OrdinalIgnoreCase) -or
		$hostName.EndsWith(".microsoft.com", [StringComparison]::OrdinalIgnoreCase)
}

function Assert-MicrosoftWebViewBootstrapper {
	param([string]$Path)

	if (!(Test-Path -LiteralPath $Path -PathType Leaf)) {
		throw "The Microsoft Edge WebView2 bootstrapper is missing."
	}

	$length = (Get-Item -LiteralPath $Path).Length
	if ($length -lt (256 * 1024) -or $length -gt (25 * 1024 * 1024)) {
		throw "The Microsoft Edge WebView2 bootstrapper has an unexpected size: $length bytes."
	}

	$signature = Get-AuthenticodeSignature -LiteralPath $Path
	if ($signature.Status -ne [System.Management.Automation.SignatureStatus]::Valid -or
		!$signature.SignerCertificate -or
		$signature.SignerCertificate.Subject -notmatch '(?:^|,\s*)CN=Microsoft Corporation(?:,|$)') {
		throw "The WebView2 bootstrapper is not validly signed by Microsoft Corporation."
	}
}

function Get-OfficialWebViewBootstrapper {
	param([string]$Destination)

	$officialUri = [Uri]"https://go.microsoft.com/fwlink/p/?LinkId=2124703"
	$response = Invoke-WebRequest `
		-Uri $officialUri `
		-OutFile $Destination `
		-PassThru `
		-UseBasicParsing `
		-MaximumRedirection 8 `
		-Headers @{ "User-Agent" = "Black-Spirit-Hub-Installer-Build/$Version" }

	$finalUri = $null
	if ($response.BaseResponse -and $response.BaseResponse.ResponseUri) {
		$finalUri = [Uri]$response.BaseResponse.ResponseUri
	}
	elseif ($response.BaseResponse -and
		$response.BaseResponse.RequestMessage -and
		$response.BaseResponse.RequestMessage.RequestUri) {
		$finalUri = [Uri]$response.BaseResponse.RequestMessage.RequestUri
	}

	if (!(Test-MicrosoftDownloadHost -Uri $finalUri)) {
		throw "The official WebView2 download redirected outside Microsoft's HTTPS domains."
	}

	Assert-MicrosoftWebViewBootstrapper -Path $Destination
}

function Assert-NativeWindowsExecutable {
	param([string]$Path)

	$bytes = [System.IO.File]::ReadAllBytes($Path)
	if ($bytes.Length -lt 512 -or
		$bytes[0] -ne [byte][char]'M' -or
		$bytes[1] -ne [byte][char]'Z') {
		throw "The native installer does not have a valid Windows PE header."
	}

	$peOffset = [BitConverter]::ToInt32($bytes, 0x3c)
	if ($peOffset -lt 0x40 -or $peOffset + 256 -gt $bytes.Length -or
		$bytes[$peOffset] -ne [byte][char]'P' -or
		$bytes[$peOffset + 1] -ne [byte][char]'E' -or
		$bytes[$peOffset + 2] -ne 0 -or
		$bytes[$peOffset + 3] -ne 0) {
		throw "The native installer has an invalid PE signature."
	}

	$optionalHeader = $peOffset + 24
	$magic = [BitConverter]::ToUInt16($bytes, $optionalHeader)
	$dataDirectoryOffset = if ($magic -eq 0x20b) {
		$optionalHeader + 112
	}
	elseif ($magic -eq 0x10b) {
		$optionalHeader + 96
	}
	else {
		throw "The native installer has an unsupported PE optional header."
	}

	$clrDirectoryOffset = $dataDirectoryOffset + (14 * 8)
	$clrRva = [BitConverter]::ToUInt32($bytes, $clrDirectoryOffset)
	$clrSize = [BitConverter]::ToUInt32($bytes, $clrDirectoryOffset + 4)
	if ($clrRva -ne 0 -or $clrSize -ne 0) {
		throw "The installer still contains a .NET CLR header; the native conversion did not succeed."
	}
}

function Assert-AppRunsWithoutDotnetRuntime {
	param(
		[string]$ExecutablePath,
		[string]$WorkingDirectory
	)

	$emptyDotnetRoot = Join-Path (
		[System.IO.Path]::GetTempPath()
	) ("black-spirit-hub-empty-dotnet-" + [Guid]::NewGuid().ToString("N"))
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
			-FilePath $ExecutablePath `
			-ArgumentList @("--offline-smoke-test") `
			-WorkingDirectory $WorkingDirectory `
			-Wait `
			-PassThru
		if ($process.ExitCode -ne 0) {
			throw "The installed self-contained app smoke test failed with exit code $($process.ExitCode)."
		}
	}
	finally {
		foreach ($name in $environmentNames) {
			[Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], "Process")
		}
		$tempPrefix = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd("\") + "\"
		$resolvedEmptyRoot = [System.IO.Path]::GetFullPath($emptyDotnetRoot)
		if (!$resolvedEmptyRoot.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase)) {
			throw "Refusing unsafe temporary cleanup path: $resolvedEmptyRoot"
		}
		if (Test-Path -LiteralPath $resolvedEmptyRoot) {
			Remove-Item -LiteralPath $resolvedEmptyRoot -Recurse -Force
		}
	}
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($AppFilesPath)) {
	$AppFilesPath = Join-Path $repoRoot "artifacts\App Files"
}
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
	$OutputPath = Join-Path $repoRoot "artifacts\Installer"
}

$appFiles = (Resolve-Path -LiteralPath $AppFilesPath).Path
$outputDirectory = [System.IO.Path]::GetFullPath($OutputPath)
$innoScript = Join-Path $repoRoot "Source Code\InstallerSource\InnoSetup\BlackSpiritHub.iss"
$installerIcon = Join-Path $repoRoot "Source Code\InstallerSource\BlackSpiritHubInstaller\installer.ico"
$iscc = Resolve-InnoCompiler

$cleanVersion = $Version.Trim().TrimStart("v", "V")
if ($cleanVersion -notmatch '^\d+\.\d+\.\d+(?:\.\d+)?$') {
	throw "Version must contain three or four numeric components: $Version"
}
$versionParts = @($cleanVersion.Split("."))
while ($versionParts.Count -lt 4) {
	$versionParts += "0"
}
$fileVersion = $versionParts[0..3] -join "."

Assert-AppPublish -PublishRoot $appFiles
if (!(Test-Path -LiteralPath $innoScript -PathType Leaf)) {
	throw "The Inno Setup source is missing: $innoScript"
}
if (!(Test-Path -LiteralPath $installerIcon -PathType Leaf)) {
	throw "The installer icon is missing: $installerIcon"
}
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

$temporaryRoot = Join-Path (
	[System.IO.Path]::GetTempPath()
) ("black-spirit-hub-native-installer-" + [Guid]::NewGuid().ToString("N"))
$bootstrapper = $WebViewBootstrapperPath
try {
	[System.IO.Directory]::CreateDirectory($temporaryRoot) | Out-Null
	if ([string]::IsNullOrWhiteSpace($bootstrapper)) {
		$bootstrapper = Join-Path $temporaryRoot "MicrosoftEdgeWebview2Setup.exe"
		Get-OfficialWebViewBootstrapper -Destination $bootstrapper
	}
	else {
		$bootstrapper = (Resolve-Path -LiteralPath $bootstrapper).Path
		Assert-MicrosoftWebViewBootstrapper -Path $bootstrapper
	}

	$compilerArguments = @(
		"/Qp",
		"/DAppVersion=$cleanVersion",
		"/DAppFileVersion=$fileVersion",
		"/DAppFilesDir=$appFiles",
		"/DOutputDir=$outputDirectory",
		"/DWebViewBootstrapper=$bootstrapper",
		"/DInstallerIcon=$installerIcon",
		$innoScript
	)
	& $iscc @compilerArguments
	if ($LASTEXITCODE -ne 0) {
		throw "Inno Setup compilation failed with exit code $LASTEXITCODE."
	}

	$installerPath = Join-Path $outputDirectory "Black-Spirit-Hub-Installer.exe"
	if (!(Test-Path -LiteralPath $installerPath -PathType Leaf)) {
		throw "The native installer was not created: $installerPath"
	}
	if ((Get-Item -LiteralPath $installerPath).Length -gt (250L * 1024 * 1024)) {
		throw "The native installer exceeds the application's 250 MiB update limit."
	}

	Assert-NativeWindowsExecutable -Path $installerPath
	$versionInfo = (Get-Item -LiteralPath $installerPath).VersionInfo
	if ($versionInfo.ProductVersion -notlike "*$cleanVersion*") {
		throw "The native installer version metadata does not match $cleanVersion."
	}

	Write-Host "Native installer built: $installerPath"
	Write-Host ("Native installer size: {0:N2} MiB" -f ((Get-Item -LiteralPath $installerPath).Length / 1MB))

	if ($RunIntegrationTest) {
		$integrationOutput = Join-Path $temporaryRoot "self-test-installer"
		$integrationInstall = Join-Path $temporaryRoot "self-test-install"
		[System.IO.Directory]::CreateDirectory($integrationOutput) | Out-Null
		$selfTestCompilerArguments = @(
			"/Qp",
			"/DAppVersion=$cleanVersion",
			"/DAppFileVersion=$fileVersion",
			"/DAppFilesDir=$appFiles",
			"/DOutputDir=$integrationOutput",
			"/DOutputBaseFilename=Black-Spirit-Hub-Installer-SelfTest",
			"/DWebViewBootstrapper=$bootstrapper",
			"/DInstallerIcon=$installerIcon",
			"/DSelfTestBuild=1",
			$innoScript
		)
		& $iscc @selfTestCompilerArguments
		if ($LASTEXITCODE -ne 0) {
			throw "Native installer integration-test compilation failed with exit code $LASTEXITCODE."
		}

		$selfTestInstaller = Join-Path $integrationOutput "Black-Spirit-Hub-Installer-SelfTest.exe"
		Assert-NativeWindowsExecutable -Path $selfTestInstaller
		$setupArguments = @(
			"/VERYSILENT",
			"/SUPPRESSMSGBOXES",
			"/NORESTART",
			"/DIR=$integrationInstall"
		)
		Write-Host "Running the native installer in an isolated temporary directory."
		$setupProcess = Start-Process `
			-FilePath $selfTestInstaller `
			-ArgumentList $setupArguments `
			-Wait `
			-PassThru
		if ($setupProcess.ExitCode -ne 0) {
			throw "Native installer integration test failed with exit code $($setupProcess.ExitCode)."
		}

		Assert-AppPublish -PublishRoot $integrationInstall
		foreach ($relativePath in @(
			"Black Spirit Hub.exe",
			"onnxruntime.dll",
			"onnxruntime_providers_shared.dll",
			"BlackSpiritHub.Resources.Black_Spirit_Hub.html",
			"BlackSpiritHub.Resources.Black_Spirit_Hub.css",
			"BlackSpiritHub.Resources.Black_Spirit_Hub.js",
			"Assets\Alarm.mp3",
			"Assets\RecipeBook\recipes.json",
			"Assets\RecipeBook\manifest.json",
			"Assets\RecipeBook\bundle-id.txt",
			"Assets\RecipeBook\ocr\icon-atlas.png",
			"Assets\RecipeBook\ocr\icon-index.json",
			"Assets\RecipeBook\ocr\ppocrv5\en_PP-OCRv5_mobile_rec.onnx",
			"Assets\RecipeBook\ocr\LICENSE-PADDLEOCR.txt",
			"Assets\RecipeBook\ocr\MODEL-NOTICE-PPOCRV5.txt",
			"Assets\RecipeBook\ocr\LICENSE-ONNXRUNTIME.txt",
			"Assets\RecipeBook\ocr\THIRD-PARTY-NOTICES-ONNXRUNTIME.txt",
			"WebView2Loader.dll",
			"e_sqlite3.dll"
		)) {
			$sourceHash = (Get-FileHash -LiteralPath (Join-Path $appFiles $relativePath) -Algorithm SHA256).Hash
			$installedHash = (Get-FileHash -LiteralPath (Join-Path $integrationInstall $relativePath) -Algorithm SHA256).Hash
			if ($sourceHash -ne $installedHash) {
				throw "Native installer integration test changed the payload file: $relativePath"
			}
		}

		Write-Host "Running the installed app with the machine-wide .NET runtime hidden."
		Assert-AppRunsWithoutDotnetRuntime `
			-ExecutablePath (Join-Path $integrationInstall "Black Spirit Hub.exe") `
			-WorkingDirectory $integrationInstall
		Write-Host "Native installer isolated integration test passed."
	}
}
finally {
	$resolvedTemporaryRoot = [System.IO.Path]::GetFullPath($temporaryRoot)
	$tempPrefix = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd("\") + "\"
	if (!$resolvedTemporaryRoot.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase)) {
		throw "Refusing unsafe temporary cleanup path: $resolvedTemporaryRoot"
	}
	if (Test-Path -LiteralPath $resolvedTemporaryRoot) {
		try {
			Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force
		}
		catch {
			Write-Warning "Temporary native-installer test files could not be removed yet: $resolvedTemporaryRoot"
		}
	}
}
