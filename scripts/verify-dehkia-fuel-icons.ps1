[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$assetDir = Join-Path $repoRoot "Source Code\Assets\DehkiaFuel"
$manifestPath = Join-Path $assetDir "manifest.json"

function Fail([string]$Message) {
	throw "Dehkia Fuel asset validation failed: $Message"
}

function Get-UpperSha256([string]$Path) {
	return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToUpperInvariant()
}

function Test-PinnedIcon([string]$Path, [string]$ExpectedHash, [int]$ExpectedWidth, [int]$ExpectedHeight) {
	if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
		Fail "Missing icon: $Path"
	}

	$file = Get-Item -LiteralPath $Path
	if ($file.Length -lt 256) {
		Fail "$($file.Name) is unexpectedly small ($($file.Length) bytes)."
	}

	$actualHash = Get-UpperSha256 $Path
	if ($actualHash -ne $ExpectedHash.ToUpperInvariant()) {
		Fail "$($file.Name) SHA-256 mismatch. Expected $ExpectedHash; got $actualHash."
	}

	$bitmap = [Drawing.Bitmap]::FromFile($file.FullName)
	try {
		if ($bitmap.Width -ne $ExpectedWidth -or $bitmap.Height -ne $ExpectedHeight) {
			Fail "$($file.Name) is $($bitmap.Width)x$($bitmap.Height); expected ${ExpectedWidth}x${ExpectedHeight}."
		}
		if (-not [Drawing.Image]::IsAlphaPixelFormat($bitmap.PixelFormat)) {
			Fail "$($file.Name) does not have an alpha-capable pixel format."
		}

		$hasVisiblePixel = $false
		$hasTransparentPixel = $false
		for ($y = 0; $y -lt $bitmap.Height; $y++) {
			for ($x = 0; $x -lt $bitmap.Width; $x++) {
				$alpha = $bitmap.GetPixel($x, $y).A
				if ($alpha -gt 0) { $hasVisiblePixel = $true }
				if ($alpha -lt 255) { $hasTransparentPixel = $true }
			}
		}
		if (-not $hasVisiblePixel) {
			Fail "$($file.Name) is fully transparent."
		}
		if (-not $hasTransparentPixel) {
			Fail "$($file.Name) has no transparent pixels."
		}
	}
	finally {
		$bitmap.Dispose()
	}
}

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
	Fail "Missing manifest: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$items = @($manifest.items)
$accessoryIds = @($manifest.catalogAccessoryIds | ForEach-Object { [int]$_ })
$materialIds = @($manifest.materialIds | ForEach-Object { [int]$_ })
$expectedIds = @($accessoryIds + $materialIds | Sort-Object -Unique)
$actualIds = @($items | ForEach-Object { [int]$_.id } | Sort-Object -Unique)

if ($manifest.schemaVersion -ne 2) { Fail "Unsupported manifest schema version $($manifest.schemaVersion)." }
if ($accessoryIds.Count -ne 26) { Fail "Expected 26 accessory IDs; found $($accessoryIds.Count)." }
if ($materialIds.Count -ne 1 -or $materialIds[0] -ne 766108) { Fail "Material coverage must be item 766108 only." }
if ($items.Count -ne 27) { Fail "Expected 27 manifest items; found $($items.Count)." }
if ($actualIds.Count -ne $items.Count) { Fail "Manifest item IDs are not unique." }

$idDiff = @(Compare-Object -ReferenceObject $expectedIds -DifferenceObject $actualIds)
if ($idDiff.Count -ne 0) { Fail "Manifest item IDs do not match the declared accessory/material coverage." }

$names = @($items | ForEach-Object { [string]$_.name })
$files = @($items | ForEach-Object { [string]$_.file })
if (@($names | Sort-Object -Unique).Count -ne $items.Count) { Fail "Manifest item names are not unique." }
if (@($files | Sort-Object -Unique).Count -ne $items.Count) { Fail "Manifest file names are not unique." }
if (@($items | Where-Object { $_.fuelTier -eq "low" }).Count -ne 11) { Fail "Expected 11 low-yield accessories." }
if (@($items | Where-Object { $_.fuelTier -eq "high" }).Count -ne 15) { Fail "Expected 15 high-yield accessories." }
if (@($items | Where-Object { $_.fuelTier -eq "material" }).Count -ne 1) { Fail "Expected one material icon." }

$targetWidth = [int]$manifest.target.width
$targetHeight = [int]$manifest.target.height
if ($targetWidth -ne 44 -or $targetHeight -ne 44) {
	Fail "Dehkia icons must retain the audited native 44x44 dimensions; resizing or upscaling is not allowed."
}
$crystalSourceSha256 = "10105B109A7C639245B74AFA959A83E8FCC80F98CAC5B1FDEF0621D1CE9D9AC6"
$crystalOutputSha256 = "48ED785C2773FF57D24B8B01FA07B8CAA13ACBA821EF92590D3BB9D6D968FD41"

foreach ($item in $items) {
	$id = [int]$item.id
	$fileName = [string]$item.file
	if ([IO.Path]::GetFileName($fileName) -ne $fileName -or $fileName -ne "item-$id.png") {
		Fail "Unsafe or unexpected file name '$fileName' for item $id."
	}
	if ([string]$item.sha256 -notmatch "^[0-9A-Fa-f]{64}$") { Fail "Invalid output SHA-256 for item $id." }
	if ([string]$item.sourceSha256 -notmatch "^[0-9A-Fa-f]{64}$") { Fail "Invalid source SHA-256 for item $id." }

	$profileName = [string]$item.sourceProfile
	$profileProperty = $manifest.sourceProfiles.PSObject.Properties[$profileName]
	if ($null -eq $profileProperty) { Fail "Unknown source profile '$profileName' for item $id." }
	$profile = $profileProperty.Value

	if ($profileName -eq "bdo-codex-native") {
		$sourceUrl = [string]$item.sourceUrl
		if ($sourceUrl -notmatch '^https://bdocodex\.com/items/new_icon/[A-Za-z0-9_./-]+\.webp$' -or
			[int]$profile.expectedWidth -ne 44 -or
			[int]$profile.expectedHeight -ne 44) {
			Fail "Unexpected native BDO Codex source mapping for item $id."
		}
		if ([string]::IsNullOrWhiteSpace($sourceUrl)) { Fail "Missing source URL for item $id." }
		if ($id -eq 766108 -and $sourceUrl -ne "https://bdocodex.com/items/new_icon/03_etc/00766108.webp") {
			Fail "Unexpected Magical Lightstone Crystal source URL."
		}
		if ($id -eq 766108) {
		if ([string]$item.sourceSha256 -ne $crystalSourceSha256) {
			Fail "Magical Lightstone Crystal source hash is not the audited pin."
		}
		if ([string]$item.sha256 -ne $crystalOutputSha256) {
			Fail "Magical Lightstone Crystal output hash is not the verified render."
		}
		}
	}
	else {
		Fail "Unsupported source profile '$profileName'."
	}

	Test-PinnedIcon (Join-Path $assetDir $fileName) ([string]$item.sha256) $targetWidth $targetHeight
	if ($id -eq 766108) {
		$materialBitmap = [Drawing.Bitmap]::FromFile((Join-Path $assetDir $fileName))
		try {
			$brightChromaticPixels = 0
			for ($y = 0; $y -lt $materialBitmap.Height; $y++) {
				for ($x = 0; $x -lt $materialBitmap.Width; $x++) {
					$pixel = $materialBitmap.GetPixel($x, $y)
					if ($pixel.A -gt 96 -and [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B)) -gt 150 -and
						([Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B)) - [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))) -gt 35) {
						$brightChromaticPixels++
					}
				}
			}
			if ($brightChromaticPixels -lt 120) { Fail "Magical Lightstone Crystal artwork is an empty or low-information placeholder." }
		}
		finally { $materialBitmap.Dispose() }
	}
}

$actualPngs = @(Get-ChildItem -LiteralPath $assetDir -Filter "*.png" -File | ForEach-Object { $_.Name } | Sort-Object)
$expectedPngs = @($files | Sort-Object)
if (@(Compare-Object -ReferenceObject $expectedPngs -DifferenceObject $actualPngs).Count -ne 0) {
	Fail "The asset folder contains a missing or unlisted PNG."
}

Write-Host "Dehkia Fuel icons verified: 26 accessories + Magical Lightstone Crystal; 27 native transparent ${targetWidth}x${targetHeight} PNGs with no upscaling."
