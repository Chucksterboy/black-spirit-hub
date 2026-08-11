[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Net.Http

$repoRoot = Split-Path -Parent $PSScriptRoot
$assetDir = Join-Path $repoRoot "Source Code\Assets\DehkiaFuel"
$manifestPath = Join-Path $assetDir "manifest.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$items = @($manifest.items)
$targetWidth = [int]$manifest.target.width
$targetHeight = [int]$manifest.target.height
$maxSourceBytes = 256KB

function Fail([string]$Message) {
	throw "Dehkia Fuel asset update failed: $Message"
}

function Get-ByteSha256([byte[]]$Bytes) {
	$sha = [Security.Cryptography.SHA256]::Create()
	try {
		return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace("-", "")
	}
	finally {
		$sha.Dispose()
	}
}

function Get-FileSha256([string]$Path) {
	return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToUpperInvariant()
}

function Assert-PngSignature([byte[]]$Bytes, [int]$Id) {
	$signature = [byte[]](0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
	if ($Bytes.Length -lt $signature.Length) { Fail "Downloaded source for item $Id is empty." }
	for ($i = 0; $i -lt $signature.Length; $i++) {
		if ($Bytes[$i] -ne $signature[$i]) { Fail "Downloaded source for item $Id is not a PNG." }
	}
}

function Assert-WebpSignature([byte[]]$Bytes, [int]$Id) {
	if ($Bytes.Length -lt 12 -or
		[Text.Encoding]::ASCII.GetString($Bytes, 0, 4) -ne "RIFF" -or
		[Text.Encoding]::ASCII.GetString($Bytes, 8, 4) -ne "WEBP") {
		Fail "Downloaded source for item $Id is not a WebP image."
	}
}

function Save-WebpAsNativePng([byte[]]$Bytes, [string]$Destination, [int]$Id, [string]$StageDirectory) {
	Assert-WebpSignature $Bytes $Id
	$chunkType = [Text.Encoding]::ASCII.GetString($Bytes, 12, 4)
	if ($chunkType -ne "VP8X") { Fail "WebP source for item $Id does not use the audited VP8X container." }
	$sourceWidth = 1 + $Bytes[24] + ($Bytes[25] -shl 8) + ($Bytes[26] -shl 16)
	$sourceHeight = 1 + $Bytes[27] + ($Bytes[28] -shl 8) + ($Bytes[29] -shl 16)
	if ($sourceWidth -ne $targetWidth -or $sourceHeight -ne $targetHeight) {
		Fail "Source for item $Id is ${sourceWidth}x${sourceHeight}; expected native ${targetWidth}x${targetHeight}. Resizing is not allowed."
	}
	$edgeCandidates = @(
		(Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
		(Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"),
		(Join-Path $env:LOCALAPPDATA "Microsoft\Edge\Application\msedge.exe")
	)
	$edgeExecutable = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
	if (-not $edgeExecutable) { Fail "Microsoft Edge is required to render the pinned WebP for item $Id." }

	$sourcePath = Join-Path $StageDirectory "source-$Id.webp"
	$htmlPath = Join-Path $StageDirectory "render-$Id.html"
	[IO.File]::WriteAllBytes($sourcePath, $Bytes)
	$sourceUri = [Uri]::new($sourcePath).AbsoluteUri
	$html = @"
<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:${targetWidth}px;height:${targetHeight}px;overflow:hidden;background:transparent}
img{display:block;width:${targetWidth}px;height:${targetHeight}px}
</style><img src="$sourceUri" alt="">
"@
	[IO.File]::WriteAllText($htmlPath, $html, [Text.UTF8Encoding]::new($false))
	$edgeArguments = @(
		"--headless=new",
		"--disable-gpu",
		"--hide-scrollbars",
		"--no-first-run",
		"--force-device-scale-factor=1",
		"--default-background-color=00000000",
		"--window-size=$targetWidth,$targetHeight",
		"--virtual-time-budget=3000",
		"--user-data-dir=$(Join-Path $StageDirectory "edge-profile-$Id")",
		"--screenshot=$Destination",
		([Uri]::new($htmlPath).AbsoluteUri)
	)
	$process = Start-Process -FilePath $edgeExecutable -ArgumentList $edgeArguments -WindowStyle Hidden -Wait -PassThru
	if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $Destination -PathType Leaf)) {
		Fail "Microsoft Edge could not render the pinned WebP for item $Id."
	}
}

function Save-ResizedPng([byte[]]$Bytes, [string]$Destination, [int]$ExpectedSourceWidth, [int]$ExpectedSourceHeight, [int]$Id) {
	Assert-PngSignature $Bytes $Id
	$stream = [IO.MemoryStream]::new($Bytes)
	$source = [Drawing.Bitmap]::FromStream($stream)
	try {
		if ($source.Width -ne $ExpectedSourceWidth -or $source.Height -ne $ExpectedSourceHeight) {
			Fail "Source for item $Id is $($source.Width)x$($source.Height); expected ${ExpectedSourceWidth}x${ExpectedSourceHeight}."
		}

		$output = [Drawing.Bitmap]::new($targetWidth, $targetHeight, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
		try {
			$graphics = [Drawing.Graphics]::FromImage($output)
			try {
				$graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
				$graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
				$graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
				$graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
				$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
				$attributes = [Drawing.Imaging.ImageAttributes]::new()
				try {
					$attributes.SetWrapMode([Drawing.Drawing2D.WrapMode]::TileFlipXY)
					$destinationRect = [Drawing.Rectangle]::new(0, 0, $targetWidth, $targetHeight)
					$graphics.DrawImage($source, $destinationRect, 0, 0, $source.Width, $source.Height, [Drawing.GraphicsUnit]::Pixel, $attributes)
				}
				finally {
					$attributes.Dispose()
				}
			}
			finally {
				$graphics.Dispose()
			}
			$output.Save($Destination, [Drawing.Imaging.ImageFormat]::Png)
		}
		finally {
			$output.Dispose()
		}
	}
	finally {
		$source.Dispose()
		$stream.Dispose()
	}
}

function Assert-OutputIcon([string]$Path, [string]$ExpectedHash, [int]$Id) {
	$actualHash = Get-FileSha256 $Path
	if ($actualHash -ne $ExpectedHash.ToUpperInvariant()) {
		Fail "Generated SHA-256 mismatch for item $Id. Expected $($ExpectedHash.ToUpperInvariant()); got $actualHash. Upstream artwork or rendering changed."
	}
	$bitmap = [Drawing.Bitmap]::FromFile($Path)
	try {
		if ($bitmap.Width -ne $targetWidth -or $bitmap.Height -ne $targetHeight) {
			Fail "Generated dimensions are wrong for item $Id."
		}
		if (-not [Drawing.Image]::IsAlphaPixelFormat($bitmap.PixelFormat)) {
			Fail "Generated icon for item $Id has no alpha channel."
		}
		$visible = $false
		$transparent = $false
		for ($y = 0; $y -lt $bitmap.Height; $y++) {
			for ($x = 0; $x -lt $bitmap.Width; $x++) {
				$alpha = $bitmap.GetPixel($x, $y).A
				if ($alpha -gt 0) { $visible = $true }
				if ($alpha -lt 255) { $transparent = $true }
			}
		}
		if (-not $visible -or -not $transparent) { Fail "Generated alpha content is invalid for item $Id." }
	}
	finally {
		$bitmap.Dispose()
	}
}

$handler = [Net.Http.HttpClientHandler]::new()
$client = [Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(20)
$client.MaxResponseContentBufferSize = $maxSourceBytes
$client.DefaultRequestHeaders.UserAgent.ParseAdd("Black-Spirit-Hub-Dehkia-Asset-Updater/1.0")

$stage = Join-Path ([IO.Path]::GetTempPath()) ("black-spirit-hub-dehkia-icons-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $stage -ErrorAction Stop | Out-Null

try {
	foreach ($item in $items) {
		$id = [int]$item.id
		$profileName = [string]$item.sourceProfile
		$profileProperty = $manifest.sourceProfiles.PSObject.Properties[$profileName]
		if ($null -eq $profileProperty) { Fail "Unknown source profile '$profileName' for item $id." }
		$profile = $profileProperty.Value
		$stagedPath = Join-Path $stage ([string]$item.file)

		if ($profileName -ne "bdo-codex-native") { Fail "Unsupported source profile '$profileName'." }
		$url = [string]$item.sourceUrl
		if ($url -notmatch '^https://bdocodex\.com/items/new_icon/[A-Za-z0-9_./-]+\.webp$') {
			Fail "Unsafe or unexpected BDO Codex source URL for item $id."
		}
		$bytes = $client.GetByteArrayAsync($url).GetAwaiter().GetResult()
		if ($bytes.Length -gt $maxSourceBytes) { Fail "Source for item $id exceeds $maxSourceBytes bytes." }
		$sourceHash = Get-ByteSha256 $bytes
		if ($sourceHash -ne ([string]$item.sourceSha256).ToUpperInvariant()) {
			Fail "Source SHA-256 mismatch for item $id. Review upstream artwork before updating the manifest."
		}
		Save-WebpAsNativePng $bytes $stagedPath $id $stage
		$destinationPath = Join-Path $assetDir ([string]$item.file)
		Assert-OutputIcon $destinationPath ([string]$item.sha256) $id
	}

	if (@(Get-ChildItem -LiteralPath $stage -Filter "*.png" -File).Count -ne $items.Count) {
		Fail "Staging did not produce exactly $($items.Count) icons."
	}

}
finally {
	$client.Dispose()
	$handler.Dispose()
	$resolvedStage = [IO.Path]::GetFullPath($stage)
	$resolvedTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
	if (-not $resolvedStage.StartsWith($resolvedTemp, [StringComparison]::OrdinalIgnoreCase)) {
		throw "Refusing to remove unexpected staging path: $resolvedStage"
	}
	if (Test-Path -LiteralPath $resolvedStage) {
		Remove-Item -LiteralPath $resolvedStage -Recurse -Force
	}
}

& (Join-Path $PSScriptRoot "verify-dehkia-fuel-icons.ps1")
if (-not $?) { Fail "Post-update validation did not complete successfully." }
Write-Host "Dehkia Fuel native icon audit completed from pinned sources without resizing or upscaling."
