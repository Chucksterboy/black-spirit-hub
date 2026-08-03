param([switch]$SkipBuild)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$dotnetCandidates = @(
	(Join-Path $repoRoot ".dotnet-sdk\dotnet.exe"),
	"$env:ProgramFiles\dotnet\dotnet.exe"
)
$dotnet = $dotnetCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (!$dotnet) {
	$dotnetCommand = Get-Command dotnet -ErrorAction SilentlyContinue
	if ($dotnetCommand) { $dotnet = $dotnetCommand.Source }
}
if (!$dotnet) { throw "A .NET 8 SDK is required." }

$project = Join-Path $repoRoot "Source Code\Black Spirit Hub.csproj"
$sourceRoot = Join-Path $repoRoot "Source Code"
$htmlPath = Join-Path $sourceRoot "BlackSpiritHub.Resources.Black_Spirit_Hub.html"
$cssPath = Join-Path $sourceRoot "BlackSpiritHub.Resources.Black_Spirit_Hub.css"
$scriptPath = Join-Path $sourceRoot "BlackSpiritHub.Resources.Black_Spirit_Hub.js"
$grindDataPath = Join-Path $sourceRoot "Assets\GrindTracker\grind-spots.js"
$alarmPath = Join-Path $sourceRoot "Assets\Alarm.mp3"
$appIconPath = Join-Path $sourceRoot "app.ico"
$runtimeIconPath = Join-Path $sourceRoot "Assets\AppIcon\app-icon.ico"
$runtimeTrayIconPath = Join-Path $sourceRoot "Assets\AppIcon\tray-icon.ico"
$runtimeIconPngPath = Join-Path $sourceRoot "Assets\AppIcon\app-icon.png"
$runtimeUiIconPngPath = Join-Path $sourceRoot "Assets\AppIcon\app-icon-ui.png"
$installerIconPath = Join-Path $sourceRoot "InstallerSource\BlackSpiritHubInstaller\installer.ico"
$iconMasterPath = Join-Path $repoRoot "Branding\AppIcon\midnight-sigil-source.png"
$releaseScriptPath = Join-Path $repoRoot "scripts\release.ps1"
$nativeInstallerBuildScriptPath = Join-Path $repoRoot "scripts\build-native-installer.ps1"
$nativeInstallerSourcePath = Join-Path $sourceRoot "InstallerSource\InnoSetup\BlackSpiritHub.iss"
$bossScheduleJsTestPath = Join-Path $repoRoot "scripts\verify-boss-schedule.js"
$bossAlertsJsTestPath = Join-Path $repoRoot "scripts\verify-boss-alerts.js"
$couponJsTestPath = Join-Path $repoRoot "scripts\verify-coupons.js"
$grindResistanceJsTestPath = Join-Path $repoRoot "scripts\verify-grind-resistance.js"
$appBehaviorJsTestPath = Join-Path $repoRoot "scripts\test-app-behavior-js.mjs"

if (!$SkipBuild) {
	& $dotnet build $project -c Release -p:EnableNETAnalyzers=true -p:AnalysisLevel=latest -p:WarningLevel=9999 --nologo
	if ($LASTEXITCODE -ne 0) { throw "Application build failed." }
}

foreach ($path in @($htmlPath, $cssPath, $scriptPath, $grindDataPath, $alarmPath)) {
	if (!(Test-Path -LiteralPath $path)) { throw "Required UI asset is missing: $path" }
}
if ((Get-Item -LiteralPath $alarmPath).Length -lt 32000) {
	throw "Alarm.mp3 is unexpectedly small or empty."
}

$iconPaths = @($appIconPath, $runtimeIconPath, $installerIconPath)
foreach ($path in $iconPaths + @($runtimeTrayIconPath, $runtimeIconPngPath, $runtimeUiIconPngPath, $iconMasterPath)) {
	if (!(Test-Path -LiteralPath $path -PathType Leaf)) {
		throw "Required application icon asset is missing: $path"
	}
}
$iconHashes = $iconPaths | ForEach-Object {
	(Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash
} | Sort-Object -Unique
if ($iconHashes.Count -ne 1) {
	throw "Application, runtime, and installer ICO files are not byte-identical."
}

function Read-VerifiedIcoFrames {
	param([string]$Path)

	$bytes = [System.IO.File]::ReadAllBytes($Path)
	if ($bytes.Length -lt 6 -or
		[BitConverter]::ToUInt16($bytes, 0) -ne 0 -or
		[BitConverter]::ToUInt16($bytes, 2) -ne 1) {
		throw "Invalid ICO header: $Path"
	}

	$entryCount = [BitConverter]::ToUInt16($bytes, 4)
	if ($entryCount -ne $expectedIconSizes.Count -or $bytes.Length -lt 6 + (16 * $entryCount)) {
		throw "Unexpected ICO frame count in ${Path}: $entryCount"
	}

	$frames = @()
	for ($index = 0; $index -lt $entryCount; $index++) {
		$entryOffset = 6 + (16 * $index)
		$width = [int]$bytes[$entryOffset]
		$height = [int]$bytes[$entryOffset + 1]
		if ($width -eq 0) { $width = 256 }
		if ($height -eq 0) { $height = 256 }

		$bitsPerPixel = [BitConverter]::ToUInt16($bytes, $entryOffset + 6)
		$frameLength = [int][BitConverter]::ToUInt32($bytes, $entryOffset + 8)
		$frameOffset = [int][BitConverter]::ToUInt32($bytes, $entryOffset + 12)
		if ($width -ne $height -or
			$bitsPerPixel -ne 32 -or
			$frameOffset -lt 6 + (16 * $entryCount) -or
			$frameOffset + $frameLength -gt $bytes.Length) {
			throw "Invalid ${width}x${height} ICO directory entry in $Path"
		}

		$dibSize = [BitConverter]::ToUInt32($bytes, $frameOffset)
		$dibWidth = [BitConverter]::ToInt32($bytes, $frameOffset + 4)
		$dibHeight = [BitConverter]::ToInt32($bytes, $frameOffset + 8)
		$planes = [BitConverter]::ToUInt16($bytes, $frameOffset + 12)
		$dibBitsPerPixel = [BitConverter]::ToUInt16($bytes, $frameOffset + 14)
		$compression = [BitConverter]::ToUInt32($bytes, $frameOffset + 16)
		$sizeImage = [BitConverter]::ToUInt32($bytes, $frameOffset + 20)
		$xorStride = [int]([Math]::Ceiling(($width * 32) / 32.0) * 4)
		$xorBytes = $xorStride * $height
		$maskStride = [int]([Math]::Ceiling($width / 32.0) * 4)
		$maskBytes = $maskStride * $height
		$expectedFrameLength = 40 + $xorBytes + $maskBytes
		if ($dibSize -ne 40 -or
			$dibWidth -ne $width -or
			$dibHeight -ne $height * 2 -or
			$planes -ne 1 -or
			$dibBitsPerPixel -ne 32 -or
			$compression -ne 0 -or
			$sizeImage -ne $xorBytes -or
			$frameLength -ne $expectedFrameLength) {
			throw "Invalid ${width}x${height} bitmap payload in ${Path}: expected $expectedFrameLength bytes including the AND mask, found $frameLength."
		}

		$pixelOffset = $frameOffset + 40
		$maskOffset = $pixelOffset + $xorBytes
		for ($y = 0; $y -lt $height; $y++) {
			$storedRow = $height - 1 - $y
			for ($x = 0; $x -lt $width; $x++) {
				$alpha = $bytes[$pixelOffset + ($storedRow * $xorStride) + ($x * 4) + 3]
				$maskByte = $bytes[$maskOffset + ($storedRow * $maskStride) + [int][Math]::Floor($x / 8.0)]
				$maskBit = 0x80 -shr ($x % 8)
				$isMaskTransparent = ($maskByte -band $maskBit) -ne 0
				if ($isMaskTransparent -ne ($alpha -eq 0)) {
					throw "The ${width}x${height} ICO alpha channel and AND mask disagree at ${x},${y} in $Path"
				}
			}
			for ($paddingBit = $width; $paddingBit -lt $maskStride * 8; $paddingBit++) {
				$maskByte = $bytes[$maskOffset + ($storedRow * $maskStride) + [int][Math]::Floor($paddingBit / 8.0)]
				$maskBit = 0x80 -shr ($paddingBit % 8)
				if (($maskByte -band $maskBit) -ne 0) {
					throw "The ${width}x${height} ICO AND-mask padding is not zeroed in $Path"
				}
			}
		}

		$frames += [pscustomobject]@{
			Size = $width
			Bytes = $bytes
			PixelOffset = $pixelOffset
			XorStride = $xorStride
		}
	}

	$actualIconSizes = @($frames | ForEach-Object Size)
	if (Compare-Object $expectedIconSizes $actualIconSizes) {
		throw "ICO frame sizes are incomplete in ${Path}: $($actualIconSizes -join ', ')"
	}

	return $frames
}

function Get-RelativeLuminance {
	param([int]$Red, [int]$Green, [int]$Blue)

	$channels = @($Red, $Green, $Blue) | ForEach-Object {
		$channel = $_ / 255.0
		if ($channel -le 0.04045) {
			$channel / 12.92
		} else {
			[Math]::Pow(($channel + 0.055) / 1.055, 2.4)
		}
	}
	return (0.2126 * $channels[0]) + (0.7152 * $channels[1]) + (0.0722 * $channels[2])
}

function Get-IcoFrameMetrics {
	param([pscustomobject]$Frame)

	$size = $Frame.Size
	$minX = $size
	$minY = $size
	$maxX = -1
	$maxY = -1
	$whiteCount = 0
	$luminousValues = [System.Collections.Generic.List[double]]::new()
	$perimeterValues = [System.Collections.Generic.List[double]]::new()
	for ($y = 0; $y -lt $size; $y++) {
		$storedRow = $size - 1 - $y
		for ($x = 0; $x -lt $size; $x++) {
			$offset = $Frame.PixelOffset + ($storedRow * $Frame.XorStride) + ($x * 4)
			$blue = [int]$Frame.Bytes[$offset]
			$green = [int]$Frame.Bytes[$offset + 1]
			$red = [int]$Frame.Bytes[$offset + 2]
			$isCyan = $blue -ge 100 -and $green -ge 90 -and $blue -gt $red + 20
			$isWhite = $red -ge 175 -and $green -ge 175 -and $blue -ge 175
			$luminance = Get-RelativeLuminance -Red $red -Green $green -Blue $blue
			if ($x -eq 0 -or $y -eq 0 -or $x -eq $size - 1 -or $y -eq $size - 1) {
				$perimeterValues.Add($luminance)
			}
			if (!$isCyan -and !$isWhite) { continue }

			$luminousValues.Add($luminance)
			if ($isWhite) { $whiteCount++ }
			if ($x -lt $minX) { $minX = $x }
			if ($x -gt $maxX) { $maxX = $x }
			if ($y -lt $minY) { $minY = $y }
			if ($y -gt $maxY) { $maxY = $y }
		}
	}

	if ($luminousValues.Count -eq 0) {
		return [pscustomobject]@{
			Size = $size
			Count = 0
			WhiteCount = 0
			MinX = $minX
			MinY = $minY
			MaxX = $maxX
			MaxY = $maxY
			Width = 0
			Height = 0
			Contrast = 0
		}
	}

	$sortedForeground = @($luminousValues | Sort-Object)
	$sortedBackground = @($perimeterValues | Sort-Object)
	$foregroundP90 = $sortedForeground[[int][Math]::Floor(0.90 * ($sortedForeground.Count - 1))]
	$backgroundMedian = $sortedBackground[[int][Math]::Floor(0.50 * ($sortedBackground.Count - 1))]
	return [pscustomobject]@{
		Size = $size
		Count = $luminousValues.Count
		WhiteCount = $whiteCount
		MinX = $minX
		MinY = $minY
		MaxX = $maxX
		MaxY = $maxY
		Width = $maxX - $minX + 1
		Height = $maxY - $minY + 1
		Contrast = ($foregroundP90 + 0.05) / ($backgroundMedian + 0.05)
	}
}

$expectedIconSizes = @(16, 20, 24, 32, 40, 48, 64, 96, 128, 256)
$runtimeIconFrames = @()
foreach ($path in $iconPaths) {
	$verifiedFrames = @(Read-VerifiedIcoFrames -Path $path)
	if ($path -eq $runtimeIconPath) {
		$runtimeIconFrames = $verifiedFrames
	}
}
$runtimeTrayIconFrames = @(Read-VerifiedIcoFrames -Path $runtimeTrayIconPath)

Add-Type -AssemblyName System.Drawing
$iconMasterBitmap = [System.Drawing.Bitmap]::new($iconMasterPath)
try {
	$sourceMinX = $iconMasterBitmap.Width
	$sourceMinY = $iconMasterBitmap.Height
	$sourceMaxX = -1
	$sourceMaxY = -1
	for ($y = 0; $y -lt $iconMasterBitmap.Height; $y++) {
		for ($x = 0; $x -lt $iconMasterBitmap.Width; $x++) {
			$pixel = $iconMasterBitmap.GetPixel($x, $y)
			$isCyan = $pixel.B -ge 100 -and $pixel.G -ge 90 -and $pixel.B -gt $pixel.R + 20
			$isWhite = $pixel.R -ge 175 -and $pixel.G -ge 175 -and $pixel.B -ge 175
			if (!$isCyan -and !$isWhite) { continue }
			if ($x -lt $sourceMinX) { $sourceMinX = $x }
			if ($x -gt $sourceMaxX) { $sourceMaxX = $x }
			if ($y -lt $sourceMinY) { $sourceMinY = $y }
			if ($y -gt $sourceMaxY) { $sourceMaxY = $y }
		}
	}
	if ($sourceMaxX -lt $sourceMinX -or $sourceMaxY -lt $sourceMinY) {
		throw "The canonical icon source does not contain the luminous sigil."
	}
	$sourceLuminousWidth = $sourceMaxX - $sourceMinX + 1
	$sourceLuminousHeight = $sourceMaxY - $sourceMinY + 1
	$sourceLuminousAspect = $sourceLuminousWidth / [double]$sourceLuminousHeight
}
finally {
	$iconMasterBitmap.Dispose()
}

foreach ($frame in $runtimeIconFrames | Where-Object Size -le 48) {
	$metrics = Get-IcoFrameMetrics -Frame $frame
	$minimumLuminousPixels = [Math]::Max(8, [int][Math]::Ceiling(0.02 * $frame.Size * $frame.Size))
	$heightCoverage = $metrics.Height / [double]$frame.Size
	$aspectPixelError = [Math]::Abs($metrics.Width - ($sourceLuminousAspect * $metrics.Height))
	$aspectTolerance = [Math]::Max(1.5, 0.03 * $sourceLuminousAspect * $metrics.Height)
	$horizontalCenterError = [Math]::Abs(($metrics.MinX + $metrics.MaxX) - ($frame.Size - 1))
	$verticalCenterError = [Math]::Abs(($metrics.MinY + $metrics.MaxY) - ($frame.Size - 1))
	if ($metrics.Count -lt $minimumLuminousPixels -or
		$metrics.WhiteCount -lt 1 -or
		$heightCoverage -lt 0.80 -or
		$metrics.MinX -lt 1 -or
		$metrics.MinY -lt 1 -or
		$metrics.MaxX -gt $frame.Size - 2 -or
		$metrics.MaxY -gt $frame.Size - 2 -or
		$aspectPixelError -gt $aspectTolerance -or
		$horizontalCenterError -gt 2 -or
		$verticalCenterError -gt 2 -or
		$metrics.Contrast -lt 3.0) {
		throw "Native $($frame.Size)x$($frame.Size) icon frame failed visual validation: bounds $($metrics.Width)x$($metrics.Height), pixels $($metrics.Count), whites $($metrics.WhiteCount), contrast $([Math]::Round($metrics.Contrast, 2))."
	}
	Write-Host "Icon $($frame.Size)x$($frame.Size): bounds $($metrics.Width)x$($metrics.Height), $([Math]::Round(100 * $heightCoverage, 1))% tall, $($metrics.Count) luminous pixels, $([Math]::Round($metrics.Contrast, 2)):1 contrast."
}

foreach ($frame in $runtimeTrayIconFrames | Where-Object Size -le 48) {
	$metrics = Get-IcoFrameMetrics -Frame $frame
	$minimumLuminousPixels = [Math]::Max(10, [int][Math]::Ceiling(0.04 * $frame.Size * $frame.Size))
	$widthCoverage = $metrics.Width / [double]$frame.Size
	$heightCoverage = $metrics.Height / [double]$frame.Size
	$horizontalCenterError = [Math]::Abs(($metrics.MinX + $metrics.MaxX) - ($frame.Size - 1))
	$verticalCenterError = [Math]::Abs(($metrics.MinY + $metrics.MaxY) - ($frame.Size - 1))
	$cornerCoordinates = @(
		@(0, 0),
		@(($frame.Size - 1), 0),
		@(0, ($frame.Size - 1)),
		@(($frame.Size - 1), ($frame.Size - 1))
	)
	$opaqueCornerCount = 0
	foreach ($corner in $cornerCoordinates) {
		$storedRow = $frame.Size - 1 - $corner[1]
		$alphaOffset = $frame.PixelOffset +
			($storedRow * $frame.XorStride) +
			($corner[0] * 4) +
			3
		if ($frame.Bytes[$alphaOffset] -ne 0) {
			$opaqueCornerCount++
		}
	}
	if ($metrics.Count -lt $minimumLuminousPixels -or
		$metrics.WhiteCount -lt 4 -or
		$widthCoverage -lt 0.82 -or
		$heightCoverage -lt 0.90 -or
		$horizontalCenterError -gt 2 -or
		$verticalCenterError -gt 2 -or
		$opaqueCornerCount -ne 0 -or
		$metrics.Contrast -lt 3.0) {
		throw "Tray $($frame.Size)x$($frame.Size) icon failed micro-frame validation: bounds $($metrics.Width)x$($metrics.Height), pixels $($metrics.Count), whites $($metrics.WhiteCount), transparent corners $($opaqueCornerCount -eq 0), contrast $([Math]::Round($metrics.Contrast, 2))."
	}
	Write-Host "Tray $($frame.Size)x$($frame.Size): bounds $($metrics.Width)x$($metrics.Height), $([Math]::Round(100 * $widthCoverage, 1))% wide, $([Math]::Round(100 * $heightCoverage, 1))% tall, $($metrics.Count) luminous pixels."
}

$runtimeIconBitmap = [System.Drawing.Bitmap]::new($runtimeIconPngPath)
try {
	if ($runtimeIconBitmap.Width -ne 256 -or $runtimeIconBitmap.Height -ne 256) {
		throw "Runtime application icon PNG must be 256x256."
	}
	$minX = $runtimeIconBitmap.Width
	$minY = $runtimeIconBitmap.Height
	$maxX = -1
	$maxY = -1
	for ($y = 0; $y -lt $runtimeIconBitmap.Height; $y++) {
		for ($x = 0; $x -lt $runtimeIconBitmap.Width; $x++) {
			$pixel = $runtimeIconBitmap.GetPixel($x, $y)
			$isCyan = $pixel.B -ge 100 -and $pixel.G -ge 90 -and $pixel.B -gt $pixel.R + 20
			$isWhite = $pixel.R -ge 175 -and $pixel.G -ge 175 -and $pixel.B -ge 175
			if (!$isCyan -and !$isWhite) { continue }
			if ($x -lt $minX) { $minX = $x }
			if ($x -gt $maxX) { $maxX = $x }
			if ($y -lt $minY) { $minY = $y }
			if ($y -gt $maxY) { $maxY = $y }
		}
	}
	$visibleWidth = $maxX - $minX + 1
	$visibleHeight = $maxY - $minY + 1
	$visibleAspectError = [Math]::Abs($visibleWidth - ($sourceLuminousAspect * $visibleHeight))
	$cornerPixels = @(
		$runtimeIconBitmap.GetPixel(0, 0),
		$runtimeIconBitmap.GetPixel($runtimeIconBitmap.Width - 1, 0),
		$runtimeIconBitmap.GetPixel(0, $runtimeIconBitmap.Height - 1),
		$runtimeIconBitmap.GetPixel($runtimeIconBitmap.Width - 1, $runtimeIconBitmap.Height - 1)
	)
	if ($cornerPixels | Where-Object {
		$_.A -ne 255 -or $_.R -gt 70 -or $_.G -gt 70 -or $_.B -gt 80
	}) {
		throw "Runtime icon must use a fully opaque, dark presentation background."
	}
	if ($maxX -lt $minX -or
		$visibleHeight -lt 230 -or
		$visibleAspectError -gt 3.0 -or
		$minX -le 0 -or
		$minY -le 0 -or
		$maxX -ge $runtimeIconBitmap.Width - 1 -or
		$maxY -ge $runtimeIconBitmap.Height - 1) {
		throw "Runtime sigil is padded too heavily or touches the canvas edge: bounds ${visibleWidth}x${visibleHeight} at ${minX},${minY}."
	}
}
finally {
	$runtimeIconBitmap.Dispose()
}

$runtimeUiIconBitmap = [System.Drawing.Bitmap]::new($runtimeUiIconPngPath)
try {
	if ($runtimeUiIconBitmap.Width -ne 256 -or $runtimeUiIconBitmap.Height -ne 256) {
		throw "The transparent in-app icon PNG must be 256x256."
	}
	$uiMinX = $runtimeUiIconBitmap.Width
	$uiMinY = $runtimeUiIconBitmap.Height
	$uiMaxX = -1
	$uiMaxY = -1
	for ($y = 0; $y -lt $runtimeUiIconBitmap.Height; $y++) {
		for ($x = 0; $x -lt $runtimeUiIconBitmap.Width; $x++) {
			if ($runtimeUiIconBitmap.GetPixel($x, $y).A -eq 0) { continue }
			if ($x -lt $uiMinX) { $uiMinX = $x }
			if ($x -gt $uiMaxX) { $uiMaxX = $x }
			if ($y -lt $uiMinY) { $uiMinY = $y }
			if ($y -gt $uiMaxY) { $uiMaxY = $y }
		}
	}
	$uiVisibleWidth = $uiMaxX - $uiMinX + 1
	$uiVisibleHeight = $uiMaxY - $uiMinY + 1
	$uiAspectError = [Math]::Abs($uiVisibleWidth - ($sourceLuminousAspect * $uiVisibleHeight))
	$uiCornerPixels = @(
		$runtimeUiIconBitmap.GetPixel(0, 0),
		$runtimeUiIconBitmap.GetPixel($runtimeUiIconBitmap.Width - 1, 0),
		$runtimeUiIconBitmap.GetPixel(0, $runtimeUiIconBitmap.Height - 1),
		$runtimeUiIconBitmap.GetPixel($runtimeUiIconBitmap.Width - 1, $runtimeUiIconBitmap.Height - 1)
	)
	if ($uiCornerPixels | Where-Object { $_.A -ne 0 }) {
		throw "The in-app title-bar icon must have fully transparent corners."
	}
	if ($uiMaxX -lt $uiMinX -or
		$uiVisibleHeight -lt 244 -or
		$uiAspectError -gt 3.0 -or
		$uiMinX -lt 2 -or
		$uiMinY -lt 2 -or
		$uiMaxX -gt $runtimeUiIconBitmap.Width - 3 -or
		$uiMaxY -gt $runtimeUiIconBitmap.Height - 3) {
		throw "The transparent in-app sigil is padded too heavily, distorted, or clipped: bounds ${uiVisibleWidth}x${uiVisibleHeight} at ${uiMinX},${uiMinY}."
	}
}
finally {
	$runtimeUiIconBitmap.Dispose()
}

$html = Get-Content -LiteralPath $htmlPath -Raw
$css = Get-Content -LiteralPath $cssPath -Raw
$script = Get-Content -LiteralPath $scriptPath -Raw

if ($html -notmatch 'data-app-view="grindTrackerView"[^>]*>.*?<span class="navLabel">Grind Zones</span>' -or
	$html -notmatch '<h1>Grind Zones</h1>' -or
	$html -notmatch 'id="grindChangeZone"[^>]*>Choose Grind Zone</button>' -or
	$html -notmatch 'id="grindPickerTitle">Choose a Grind Zone</h2>') {
	throw "The Grind Zones direct-selection labels or change-zone control are missing."
}
if ($html -match 'grindSummaryGrid|grindDashboardGrid|grindBackSummary|grindStartSession|grindDraftStatus|grindImagePreview|grindSessionPanel|grindSessionForm' -or
	$script -match 'selectGrindLootImage|scanGrindLootImage|grindSetImagePreview|grindBindImageDrop|grindApplyScreenshotLootText|grindSetScreen\(|loadGrindSessions|saveGrindSessions|grindTrackerSessionsRecovery|grindSaveForm|Saved sessions at this spot') {
	throw "The retired Grind Tracker dashboard, OCR workflow, or manual-session UI was reintroduced."
}
if ($script -notmatch '(?s)function initializeGrindTracker\(\).*?grindRender\(\);\s*grindOpenSpotPicker\(\);' -or
	$script -notmatch 'function grindRender\(\)\{grindRenderSpotDetail\(\);' -or
	$script -notmatch 'persistSetting\("grindTrackerSelectedSpot",id\)' -or
	$script -notmatch 'grindEnsureMarketPricesForSpot\(id\)' -or
	$script -notmatch 'bridgeCall\("getGrindMarketPrices"' -or
	$script -notmatch '\(spot\.drops\|\|\[\]\)\.map\(drop=>.*?grindDropPriceLine\(drop\)') {
	throw "The Grind Zones picker-to-preview flow or preserved market-price pipeline is incomplete."
}
if ($script -notmatch 'ccs:\["knockdown","bound"\].*?Sycraia Crystal - Adamantine.*?bdfoundry-15742\.png.*?Ancient Magic Crystal of Nature - Adamantine.*?bdfoundry-ancient-nature\.webp' -or
	$script -notmatch 'ccs:\["knockback","float"\].*?Sycraia Crystal - Fighting Spirit.*?bdfoundry-15743\.png.*?Ancient Magic Crystal of Nature - Fighting Spirit.*?bdfoundry-ancient-nature\.webp' -or
	$script -notmatch 'ccs:\["stun","stiffness","freeze"\].*?Sycraia Crystal - Giant.*?bdfoundry-15744\.png.*?Ancient Magic Crystal of Nature - Giant.*?bdfoundry-ancient-nature\.webp' -or
	$script -notmatch 'function grindResistanceRecommendations\(spot\)\{const ccs=new Set\(grindSpotCcs\(spot\)\);return grindResistanceCrystalGroups\.filter\(group=>group\.ccs\.some\(cc=>ccs\.has\(cc\)\)\)\}' -or
	$script -notmatch 'Recommended Resistance Crystals' -or
	$script -notmatch 'No specific resistance crystal required' -or
	$script -notmatch 'grindLootGrid.*?grindRenderResistancePanel\(spot\)' -or
	$css -notmatch '\.grindResistancePanel\{' -or
	$css -notmatch '\.grindResistanceCard\{') {
	throw "The Grind Zones CC-to-resistance recommendation panel is incomplete."
}

$nodeAssignment = [regex]::Match(
	$script,
	'(?s)^const NODES = (\[.*?\]);\r?\nconst TRADE_MANAGERS'
)
if (!$nodeAssignment.Success) {
	throw "The trade-distance node catalog is malformed."
}
$tradeNodes = ConvertFrom-Json -InputObject $nodeAssignment.Groups[1].Value

$frozenHaloAssignment = [regex]::Match(
	$script,
	'NODES\.push\(\{name:"Frozen Halo", x:([0-9.]+), y:([0-9.]+), type:"([^"]+)"\}\);'
)
if (!$frozenHaloAssignment.Success) {
	throw "The Frozen Halo trade-distance node is missing or malformed."
}
$frozenHaloNode = [pscustomobject]@{
	name = "Frozen Halo"
	x = [double]::Parse($frozenHaloAssignment.Groups[1].Value, [Globalization.CultureInfo]::InvariantCulture)
	y = [double]::Parse($frozenHaloAssignment.Groups[2].Value, [Globalization.CultureInfo]::InvariantCulture)
	type = $frozenHaloAssignment.Groups[3].Value
}
$existingFrozenHaloNodes = @($tradeNodes | Where-Object name -eq "Frozen Halo")
if ($existingFrozenHaloNodes.Count -gt 1) {
	throw "The trade-distance catalog contains duplicate Frozen Halo nodes."
}
$effectiveTradeNodes = @($tradeNodes)
if ($existingFrozenHaloNodes.Count -eq 0) {
	$effectiveTradeNodes += $frozenHaloNode
}

$edaniaNameAssignment = [regex]::Match(
	$script,
	'(?s)const EDANIA_NODE_NAMES = new Set\(\[(.*?)\]\);'
)
if (!$edaniaNameAssignment.Success) {
	throw "The Edania node manifest is missing or malformed."
}
$edaniaNamesJson = "[" + [regex]::Replace($edaniaNameAssignment.Groups[1].Value, ',\s*$', '') + "]"
$edaniaNames = ConvertFrom-Json -InputObject $edaniaNamesJson
$duplicateEdaniaNames = $edaniaNames | Group-Object | Where-Object Count -gt 1
if ($edaniaNames.Count -ne 37 -or $duplicateEdaniaNames) {
	throw "The Edania manifest must contain exactly 37 unique nodes."
}
foreach ($edaniaName in $edaniaNames) {
	$matches = @($effectiveTradeNodes | Where-Object name -eq $edaniaName)
	if ($matches.Count -ne 1) {
		throw "Edania node '$edaniaName' is missing or duplicated in the trade-distance catalog."
	}
	$node = $matches[0]
	if ([string]::IsNullOrWhiteSpace([string]$node.type) -or
		![double]::TryParse([string]$node.x, [ref]$null) -or
		![double]::TryParse([string]$node.y, [ref]$null) -or
		[double]::IsNaN([double]$node.x) -or
		[double]::IsNaN([double]$node.y) -or
		[double]::IsInfinity([double]$node.x) -or
		[double]::IsInfinity([double]$node.y)) {
		throw "Edania node '$edaniaName' has invalid type or coordinates."
	}
}
if ([Math]::Abs($frozenHaloNode.x - 617526.0) -gt 0.001 -or
	[Math]::Abs($frozenHaloNode.y - 456027.0) -gt 0.001 -or
	$frozenHaloNode.type -ne "Connection") {
	throw "Frozen Halo no longer matches the verified BDO world-map node."
}
if ($script -notmatch 'if\(EDANIA_NODE_NAMES\.has\(node\.name\)\) node\.region = "Edania";' -or
	$script -notmatch 'search:norm\(`\$\{node\.name\} \$\{node\.type\|\|""\} \$\{node\.region\|\|""\}`\)' -or
	$script -notmatch '(?s)const list = q\s*\?\s*nodeSearchIndex.*?\.slice\(0,\s*300\)\s*:\s*ORIGIN_NODES;') {
	throw "Edania must remain region-searchable and visible in the complete origin list."
}
if ($script -notmatch 'const SCALE = 1470588;' -or
	$script -notmatch '(?s)function mapDistance\(a,b\)\s*\{\s*return Math\.hypot\(a\.x-b\.x, a\.y-b\.y\);\s*\}' -or
	$script -notmatch '(?s)function distanceBonusPct\(dist\)\s*\{\s*const pct = \(dist / SCALE\) \* 100\.0;\s*return Math\.max\(0, Math\.min\(DIST_CAP, pct\)\);\s*\}') {
	throw "The verified trade-distance formula or scale changed unexpectedly."
}

$tradeManagerAssignment = [regex]::Match(
	$script,
	'(?s)const TRADE_MANAGERS = (\[.*?\]);\r?\n// Edania'
)
if (!$tradeManagerAssignment.Success) {
	throw "The trade-manager catalog is malformed."
}
$tradeManagers = ConvertFrom-Json -InputObject $tradeManagerAssignment.Groups[1].Value
$firstNodeByName = @{}
foreach ($node in $effectiveTradeNodes) {
	if (!$firstNodeByName.ContainsKey([string]$node.name)) {
		$firstNodeByName[[string]$node.name] = $node
	}
}
$sellTargetNames = [System.Collections.Generic.HashSet[string]]::new(
	[System.StringComparer]::Ordinal
)
foreach ($manager in $tradeManagers) {
	if ($firstNodeByName.ContainsKey([string]$manager.node)) {
		[void]$sellTargetNames.Add([string]$manager.node)
	}
}
if ($sellTargetNames.Count -ne 118 -or $sellTargetNames.Contains("Frozen Halo")) {
	throw "Adding Edania origins unexpectedly changed the existing sell-destination set."
}
$veliaNode = $firstNodeByName["Velia"]
$hakinzaNode = $firstNodeByName["Hakinza Sanctuary"]
$veliaToHakinzaDistance = [Math]::Sqrt(
	[Math]::Pow([double]$veliaNode.x - [double]$hakinzaNode.x, 2) +
	[Math]::Pow([double]$veliaNode.y - [double]$hakinzaNode.y, 2)
)
if ([Math]::Abs($veliaToHakinzaDistance - 663583.9061155266) -gt 0.001) {
	throw "Representative legacy trade-distance coordinates changed unexpectedly."
}

if ($html -notmatch 'BlackSpiritHub\.Resources\.Black_Spirit_Hub\.css' -or $html -notmatch 'BlackSpiritHub\.Resources\.Black_Spirit_Hub\.js') {
	throw "The HTML shell does not reference the external UI assets."
}
if ($html -notmatch 'Assets/AppIcon/app-icon-ui\.png' -or $html -match '<img\s+src="Assets/AppIcon/app-icon\.png"') {
	throw "The title bar must use the transparent in-app icon asset."
}
if ($css -notmatch '(?s)html,\s*body\s*\{\s*scrollbar-width:\s*none;.*?-ms-overflow-style:\s*none;' -or
	$css -notmatch '(?s)html::\-webkit-scrollbar,\s*body::\-webkit-scrollbar\s*\{.*?display:\s*none;' -or
	$css -match '(?s)(?:html|body)\s*\{[^}]*overflow-y:\s*hidden') {
	throw "The root scrollbar must be visually hidden without disabling vertical scrolling."
}
if ($css -notmatch '(?s)\.outfitTableWrap\s*\{[^}]*overflow:\s*auto;[^}]*scrollbar-width:\s*none;[^}]*-ms-overflow-style:\s*none;' -or
	$css -notmatch '(?s)\.outfitTableWrap::\-webkit-scrollbar\s*\{[^}]*display:\s*none;' -or
	$css -match '(?s)\.outfitTableWrap\s*\{[^}]*overflow(?:-y)?:\s*hidden') {
	throw "The outfit table scrollbar must be visually hidden without disabling table scrolling."
}
if ($script -notmatch '(?s)const\s+topThree\s*=\s*filtered\s*\.filter\(item\s*=>\s*item\.recommendationEligible\s*===\s*true\)\s*\.slice\(0,\s*3\)' -or
	$script -match 'const\s+recommendationRank\s*=') {
	throw "Top outfit cards must use only authoritative eligible backend recommendations without client-side fallback ranking."
}
if ($script -notmatch 'sampleReadyCount\s*=\s*filtered\.filter\(item\s*=>\s*item\.sampleCount\s*>=\s*12\)' -or
	$script -notmatch 'outfits have 12\+ samples' -or
	$script -match 'outfits have 5\+ samples') {
	throw "Top outfit empty-state diagnostics must match the 12-sample recommendation requirement."
}
$marketDatabaseSource = Get-Content -LiteralPath (Join-Path $sourceRoot "BlackSpiritHub\MarketDatabase.cs") -Raw
if ($marketDatabaseSource -notmatch 'OutfitRecommendationMinimumSamples\s*=\s*12;' -or
	$marketDatabaseSource -notmatch 'OutfitRecommendationActive24HourSales\s*=\s*10;' -or
	$marketDatabaseSource -notmatch 'OutfitRecommendationActive3DaySales\s*=\s*20;' -or
	$marketDatabaseSource -notmatch 'OutfitRecommendationActive7DaySales\s*=\s*40;' -or
	$marketDatabaseSource -notmatch 'OutfitRecommendationMinimumActiveWindows\s*=\s*2;' -or
	$marketDatabaseSource -notmatch 'OutfitRecommendationMinimumConfidence\s*=\s*0\.6;') {
	throw "Top outfit recommendations must retain the minimum evidence and sales-volume gates."
}

$htmlIds = [regex]::Matches($html, '\bid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$duplicateIds = $htmlIds | Group-Object | Where-Object Count -gt 1
if ($duplicateIds) {
	throw "Duplicate HTML ids: $($duplicateIds.Name -join ', ')"
}
$literalElementIds = [regex]::Matches($script, 'getElementById\(\s*["'']([^"'']+)["'']\s*\)') |
	ForEach-Object { $_.Groups[1].Value } |
	Sort-Object -Unique
$missingElementIds = $literalElementIds | Where-Object { $_ -notin $htmlIds }
if ($missingElementIds) {
	throw "JavaScript references missing HTML ids: $($missingElementIds -join ', ')"
}

$textExtensions = @(".cs", ".csproj", ".css", ".html", ".js", ".json", ".md", ".ps1")
$textSearchRoots = @(
	$sourceRoot,
	(Join-Path $repoRoot "scripts"),
	(Join-Path $repoRoot ".github")
)
$textFiles = Get-ChildItem -LiteralPath $textSearchRoots -Recurse -File |
	Where-Object {
		$_.Extension -in $textExtensions -and
		$_.FullName -notmatch '\\(?:bin|obj)\\'
	}
$textFiles += Get-ChildItem -LiteralPath $repoRoot -File |
	Where-Object { $_.Extension -in $textExtensions -or $_.Name -eq ".gitignore" }
$textFiles = $textFiles | Sort-Object FullName -Unique
$retiredBrandPattern = '(?i)' + 'BDO[ _-]?' + 'Multi[ _-]?Tool|BDO' + 'MultiTool|bdo[ _-]?' + 'multi[ _-]?tool'
$retiredBrandPaths = Get-ChildItem -LiteralPath $textSearchRoots -Recurse -Force |
	Where-Object {
		$_.FullName -notmatch '\\(?:bin|obj)\\' -and
		$_.Name -match $retiredBrandPattern
	} |
	ForEach-Object FullName
if ($retiredBrandPaths) {
	throw "Retired product branding remains in repository paths: $($retiredBrandPaths -join ', ')"
}
$retiredBrandFiles = foreach ($file in $textFiles) {
	$content = [System.IO.File]::ReadAllText($file.FullName)
	if ($content -match $retiredBrandPattern) {
		$file.FullName
	}
}
if ($retiredBrandFiles) {
	throw "Retired product branding remains in: $($retiredBrandFiles -join ', ')"
}
$mojibakeFiles = foreach ($file in $textFiles) {
	$content = [System.IO.File]::ReadAllText($file.FullName)
	if ($content -match '[\u00C2\u00C3\uFFFD]|\u00E2\u20AC|\u00EF\u00BF\u00BD') {
		$file.FullName
	}
}
if ($mojibakeFiles) {
	throw "Mojibake or replacement characters found in: $($mojibakeFiles -join ', ')"
}
if ($html -match 'Discord:\s*Chucksterboy|Cyber\s*-\s*notifications on' -or $script -match 'Discord:\s*Chucksterboy|Cyber\s*-\s*notifications on') {
	throw "Retired status-bar content was reintroduced."
}

$grindData = Get-Content -LiteralPath $grindDataPath -Raw
$grindAssignment = [regex]::Match(
	$grindData,
	'(?s)window\.BDO_GRIND_SPOTS\s*=\s*(\[.*\])\s*;\s*$'
)
if (!$grindAssignment.Success) { throw "The grind-spot data assignment is malformed." }
$grindSpots = $grindAssignment.Groups[1].Value | ConvertFrom-Json
if ($grindSpots.Count -lt 90) {
	throw "The grind-spot catalog unexpectedly contains only $($grindSpots.Count) spots."
}
$duplicateSpotIds = $grindSpots | Group-Object { [string]$_.id } | Where-Object Count -gt 1
if ($duplicateSpotIds) {
	throw "Duplicate grind-spot ids: $($duplicateSpotIds.Name -join ', ')"
}

$gavinyaSpots = @($grindSpots | Where-Object name -eq "Gavinya Coastal Cliff")
if ($gavinyaSpots.Count -ne 1) {
	throw "Gavinya Coastal Cliff must appear exactly once in the Grind Zones catalog."
}
$gavinya = $gavinyaSpots[0]
if ([int]$gavinya.id -ne 916 -or
	[string]$gavinya.zone -ne "Valencia" -or
	[int]$gavinya.ap -ne 400 -or
	[int]$gavinya.dp -ne 470 -or
	[string]$gavinya.players -ne "1" -or
	[string]$gavinya.type -ne "normal" -or
	[int]$gavinya.spotType -ne 104 -or
	[string]$gavinya.trashId -ne "767350" -or
	[string]$gavinya.primaryTrash -ne "Sulfur Golem Fragment") {
	throw "Gavinya Coastal Cliff metadata is missing or incorrect."
}
$expectedGavinyaDrops = @(
	@("767350", "Sulfur Golem Fragment"),
	@("821417", "Turquoise Primordial Luster - Sovereign"),
	@("767341", "Turquoise Primordial Pigment - Sovereign"),
	@("768160", "Sealed Black Magic Crystal"),
	@("edania-refined-essence-of-devouring", "Refined Essence of Devouring"),
	@("767342", "Turquoise Primordial Pigment - Edana"),
	@("11882", "Deboreka Earring"),
	@("980115", "Sulfur Golem Power Core"),
	@("980116", "Sulfur Golem Power Core Fragment"),
	@("821418", "Turquoise Primordial Luster - Edana"),
	@("12094", "Deboreka Ring"),
	@("12276", "Deboreka Belt"),
	@("edania-refined-origin-of-hunger", "Refined Origin of Hunger"),
	@("corrupt-oil-of-immortality", "Corrupt Oil of Immortality"),
	@("edania-crimson-primordial-pigment-sovereign", "Crimson Primordial Pigment - Sovereign"),
	@("edania-violet-primordial-pigment-edana", "Violet Primordial Pigment - Edana"),
	@("11653", "Deboreka Necklace"),
	@("721003", "Caphras Stone"),
	@("edania-violet-primordial-luster-sovereign", "Violet Primordial Luster - Sovereign"),
	@("edania-crimson-primordial-luster-sovereign", "Crimson Primordial Luster - Sovereign"),
	@("721002", "Ancient Spirit Dust"),
	@("edania-violet-primordial-luster-edana", "Violet Primordial Luster - Edana"),
	@("16001", "Black Stone"),
	@("761726", "Gavinya Coastal Cliff Paint"),
	@("al-yurads-ring-piece", "Al Yurad's Ring Piece")
)
if ($gavinya.drops.Count -ne $expectedGavinyaDrops.Count) {
	throw "Gavinya Coastal Cliff must contain exactly $($expectedGavinyaDrops.Count) drops."
}
for ($dropIndex = 0; $dropIndex -lt $expectedGavinyaDrops.Count; $dropIndex++) {
	$expectedDrop = $expectedGavinyaDrops[$dropIndex]
	$actualDrop = $gavinya.drops[$dropIndex]
	if ([string]$actualDrop.id -ne $expectedDrop[0] -or
		[string]$actualDrop.name -ne $expectedDrop[1]) {
		throw "Gavinya Coastal Cliff drop $($dropIndex + 1) is out of order or incorrect."
	}
}
if ($gavinya.drops[0].isTrash -ne $true -or
	[string]$gavinya.icon -ne "Assets/GrindTracker/icons-clean/item-767350.png" -or
	$script -notmatch 'Object\.assign\(GRIND_FIXED_ITEM_PRICES,\{"767350":165508\}\)' -or
	$script -notmatch 'GRIND_NO_VALUE_ITEM_IDS\.add\("761726"\)' -or
	$script -notmatch 'grindSpotCcOverrides\["gavinya coastal cliff"\]=\["knockdown","bound"\]' -or
	$script -notmatch 'grindMaxCapOverrides\["gavinya coastal cliff"\]=\[2020,820\]') {
	throw "Gavinya pricing, paint, CC, resistance, or maximum-stat mappings are incomplete."
}

$missingGrindAssets = [System.Collections.Generic.HashSet[string]]::new(
	[System.StringComparer]::OrdinalIgnoreCase
)
foreach ($spot in $grindSpots) {
	if ([string]::IsNullOrWhiteSpace([string]$spot.trashId) -or
		[string]::IsNullOrWhiteSpace([string]$spot.primaryTrash)) {
		throw "Grind spot '$($spot.name)' is missing primary trash metadata."
	}
	if (!$spot.drops -or $spot.drops.Count -eq 0) {
		throw "Grind spot '$($spot.name)' has no loot table."
	}
	$trashDrop = $spot.drops | Where-Object {
		[string]$_.id -eq [string]$spot.trashId -and $_.isTrash -eq $true
	} | Select-Object -First 1
	if (!$trashDrop) {
		throw "Grind spot '$($spot.name)' does not contain its primary trash drop."
	}
	$duplicateDropIds = $spot.drops | Group-Object { [string]$_.id } | Where-Object Count -gt 1
	if ($duplicateDropIds) {
		throw "Grind spot '$($spot.name)' contains duplicate drop ids: $($duplicateDropIds.Name -join ', ')"
	}
	foreach ($assetPath in @($spot.icon) + @($spot.drops | ForEach-Object { $_.icon })) {
		if ([string]::IsNullOrWhiteSpace([string]$assetPath)) {
			throw "Grind spot '$($spot.name)' contains an empty icon path."
		}
		$absoluteAssetPath = Join-Path $sourceRoot ([string]$assetPath -replace '/', '\')
		if (!(Test-Path -LiteralPath $absoluteAssetPath -PathType Leaf)) {
			[void]$missingGrindAssets.Add([string]$assetPath)
		}
	}
}
if ($missingGrindAssets.Count -gt 0) {
	throw "Missing Grind Tracker icons: $([string]::Join(', ', $missingGrindAssets))"
}

$referencedGrindAssets = [regex]::Matches(
	$script,
	'Assets/GrindTracker/(?:classes|buffs)/[^"'']+\.png'
) |
	ForEach-Object { $_.Value } |
	Where-Object { $_ -notmatch '\$\{' } |
	Sort-Object -Unique
$referencedGrindAssets += 1..40 | ForEach-Object {
	"Assets/GrindTracker/buffs/buff-$($_.ToString('00')).png"
}
$missingReferencedAssets = foreach ($assetPath in $referencedGrindAssets) {
	$absoluteAssetPath = Join-Path $sourceRoot ($assetPath -replace '/', '\')
	if (!(Test-Path -LiteralPath $absoluteAssetPath -PathType Leaf)) { $assetPath }
}
if ($missingReferencedAssets) {
	throw "Missing class or modifier icons: $($missingReferencedAssets -join ', ')"
}

$resistanceCrystalAssets = [ordered]@{
	"Assets/GrindTracker/icons-clean/bdfoundry-15742.png" = "C0F4FE7BB839A245336E00C3E2CB8884360A262440BD715642DC90EB5B5BCB10"
	"Assets/GrindTracker/icons-clean/bdfoundry-15743.png" = "E65C44FC8D7FBA25D01CFB926A97914852163CEEC3DAD551FDECFC5DECA6CAC1"
	"Assets/GrindTracker/icons-clean/bdfoundry-15744.png" = "BBE13532FFF03E8AE57DFF397ACCFED0C90FDB328CDF2414C393270252DC777E"
	"Assets/GrindTracker/icons-clean/bdfoundry-ancient-nature.webp" = "955193F5342F9AFD3583633A7DB6303FC5317F85C501A75BF01E73EF0B62623E"
}
$invalidResistanceCrystalAssets = foreach ($assetPath in $resistanceCrystalAssets.Keys) {
	$absoluteAssetPath = Join-Path $sourceRoot ($assetPath -replace '/', '\')
	if (!(Test-Path -LiteralPath $absoluteAssetPath -PathType Leaf) -or
		(Get-Item -LiteralPath $absoluteAssetPath).Length -lt 1000) {
		$assetPath
		continue
	}
	$actualHash = (Get-FileHash -LiteralPath $absoluteAssetPath -Algorithm SHA256).Hash
	if ($actualHash -ne $resistanceCrystalAssets[$assetPath]) {
		$assetPath
	}
}
if ($invalidResistanceCrystalAssets) {
	throw "Missing, modified, or invalid BDO Foundry resistance-crystal icons: $($invalidResistanceCrystalAssets -join ', ')"
}

$gavinyaCodexAssets = [ordered]@{
	"Assets/GrindTracker/icons-clean/item-761726.png" = "7F2B8E58C96565467267C7F2FA002703CF8A74D3A56BE7AC123098BCDE9787FC"
	"Assets/GrindTracker/icons-clean/item-767341.png" = "89E8AF8DE240B90ED7E0992A50B294D39D4A598C8B38D2563D82C74EEBF78370"
	"Assets/GrindTracker/icons-clean/item-767342.png" = "D6C1948CD7E10C70937E838F87DDC2EE2B01D13E070502ADFEF6639100D42E62"
	"Assets/GrindTracker/icons-clean/item-767350.png" = "E9103A025BEB59BB975DB0A85EB6E41B86C7F9CCC76EB1A25C066F5E5F2145D8"
	"Assets/GrindTracker/icons-clean/item-821417.png" = "38233DC15A2C751798139337EE75C51E44F4A0C0EB9E489E8AD1A13C72F2A2D1"
	"Assets/GrindTracker/icons-clean/item-821418.png" = "1B74FCC8363D08C23914BED2D6DCF8C65FD02AF1A42D488CFF3CA609C4645DFD"
	"Assets/GrindTracker/icons-clean/item-980115.png" = "F1AF78E710070DD40ADFD26A71DA3C1223A14BB3838DC94FCC624E7B8D8170F7"
	"Assets/GrindTracker/icons-clean/item-980116.png" = "C87DDDE89823C5502A3D6DAE59708F7BC614481130CF6CDEB561AE6A1E8A1F60"
}
$invalidGavinyaCodexAssets = foreach ($assetPath in $gavinyaCodexAssets.Keys) {
	$absoluteAssetPath = Join-Path $sourceRoot ($assetPath -replace '/', '\')
	if (!(Test-Path -LiteralPath $absoluteAssetPath -PathType Leaf) -or
		(Get-FileHash -LiteralPath $absoluteAssetPath -Algorithm SHA256).Hash -ne $gavinyaCodexAssets[$assetPath]) {
		$assetPath
	}
}
if ($invalidGavinyaCodexAssets) {
	throw "Missing or modified Gavinya BDO Codex icons: $($invalidGavinyaCodexAssets -join ', ')"
}

$homeTimerIconCount = [regex]::Matches($html, 'class="homeTimerIcon"[^>]*>\s*<svg\b').Count
$resetTimerIconCount = [regex]::Matches($script, '(?m)^\s{2}(?:daily|imperial|bsa|agris|barter|trading):''<svg\b').Count
if ($homeTimerIconCount -ne 5 -or $resetTimerIconCount -ne 6 -or $script -match 'icon:\s*"\?"') {
	throw "Dashboard timer badges are missing, malformed, or using placeholder glyphs."
}
if ($html.Length -gt 100000) { throw "The HTML shell exceeded the 100 KB performance budget." }
if ($script.Length -gt 500000) { throw "The main UI script exceeded the 500 KB performance budget." }
if ($css -notmatch 'body\[data-motion="reduced"\]' -or $script -notmatch 'visibilitychange') {
	throw "Reduced-motion or visibility lifecycle handling is missing."
}

$dayNightMatch = [regex]::Match($script, 'dayNight:\{\s*cycleMinutes:(\d+),\s*nightMinutes:(\d+),\s*nightStartUtcIso:"([^"]+)"')
if (!$dayNightMatch.Success) { throw "The BDO day/night cycle must use a fixed UTC anchor." }
$cycleMs = [int64]$dayNightMatch.Groups[1].Value * 60000
$nightMs = [int64]$dayNightMatch.Groups[2].Value * 60000
$nightStart = [DateTimeOffset]::Parse($dayNightMatch.Groups[3].Value).ToUnixTimeMilliseconds()
$observedAt = [DateTimeOffset]::Parse('2026-07-20T11:52:53Z').ToUnixTimeMilliseconds()
$elapsed = (($observedAt - $nightStart) % $cycleMs + $cycleMs) % $cycleMs
$remaining = $nightMs - $elapsed
if ($elapsed -lt 0 -or $elapsed -ge $nightMs -or $remaining -lt (26 * 60000) -or $remaining -gt (28 * 60000)) {
	throw "The BDO day/night cycle no longer matches the live EU phase captured on 2026-07-20."
}

$functionNames = [regex]::Matches($script, '(?m)^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(') |
	ForEach-Object { $_.Groups[1].Value }
$duplicates = $functionNames | Group-Object | Where-Object Count -gt 1
if ($duplicates) {
	throw "Duplicate JavaScript function declarations: $($duplicates.Name -join ', ')"
}
$unusedFunctions = foreach ($functionName in $functionNames) {
	$references = [regex]::Matches($script, "\b$([regex]::Escape($functionName))\b").Count
	if ($references -eq 1) { $functionName }
}
if ($unusedFunctions) {
	throw "Unreferenced JavaScript functions: $($unusedFunctions -join ', ')"
}

$calculatorSource = Get-Content -LiteralPath (Join-Path $sourceRoot "BlackSpiritHub\CalculatorForm.cs") -Raw
$programSource = Get-Content -LiteralPath (Join-Path $sourceRoot "BlackSpiritHub\Program.cs") -Raw
if ($programSource -notmatch '(?s)private static void PrepareUiFiles\(AppPaths paths\).*?CopyDirectoryIfPresent\(\s*Path\.Combine\(baseDirectory, "Assets", "GrindTracker"\),\s*Path\.Combine\(paths\.Root, "Assets", "GrindTracker"\)\);\s*bool assetsReady') {
	throw "GrindTracker assets must self-heal before the version-stamp early return."
}
if ($calculatorSource -match 'loadGrindSessions|saveGrindSessions|AppStateStore' -or
	$programSource -match 'AppStateStore' -or
	(Test-Path -LiteralPath (Join-Path $sourceRoot "BlackSpiritHub\AppStateStore.cs"))) {
	throw "The retired native Grind Tracker session store was reintroduced."
}
$marketCollectorTaskSource = Get-Content -LiteralPath (Join-Path $sourceRoot "BlackSpiritHub\MarketCollectorTaskManager.cs") -Raw
if ($calculatorSource -match 'Windows\.Media\.Ocr|OcrEngine|selectGrindLootImage|scanGrindLootImage|GrindLootImageMatch|MaxGrindImageBytes') {
	throw "Native Grind screenshot/OCR code was reintroduced."
}
$bossScheduleSourcePath = Join-Path $sourceRoot "BlackSpiritHub\BossScheduleService.cs"
if (!(Test-Path -LiteralPath $bossScheduleSourcePath -PathType Leaf)) {
	throw "The cached boss schedule service is missing."
}
$bossScheduleSource = Get-Content -LiteralPath $bossScheduleSourcePath -Raw
$bdoAlertsCredentialsSourcePath = Join-Path $sourceRoot "BlackSpiritHub\BdoAlertsApiCredentials.cs"
if (!(Test-Path -LiteralPath $bdoAlertsCredentialsSourcePath -PathType Leaf)) {
	throw "The shared BDO Alerts credential guard is missing."
}
$bdoAlertsCredentialsSource = Get-Content -LiteralPath $bdoAlertsCredentialsSourcePath -Raw
$couponSource = Get-Content -LiteralPath (Join-Path $sourceRoot "BlackSpiritHub\CouponService.cs") -Raw
$couponIconResolverSourcePath = Join-Path $sourceRoot "BlackSpiritHub\BdoCodexItemIconResolver.cs"
if (!(Test-Path -LiteralPath $couponIconResolverSourcePath -PathType Leaf)) {
	throw "The exact coupon item icon resolver is missing."
}
$couponIconResolverSource = Get-Content -LiteralPath $couponIconResolverSourcePath -Raw
$installerSource = Get-Content -LiteralPath $nativeInstallerSourcePath -Raw
$nativeInstallerBuildScript = Get-Content -LiteralPath $nativeInstallerBuildScriptPath -Raw
$bossScheduleRefreshCallCount = [regex]::Matches($script, 'bridgeCall\("refreshBossSchedule"\)').Count
if ($calculatorSource -match 'CancellationToken\.None') {
	throw "CalculatorForm contains an uncancellable host operation."
}
if ($calculatorSource -notmatch 'LoadPackagedIcon\("app-icon\.ico",\s*SystemInformation\.IconSize\)' -or
	$calculatorSource -notmatch 'LoadPackagedIcon\("tray-icon\.ico",\s*SystemInformation\.SmallIconSize\)') {
	throw "The application and tray must load their dedicated icon assets."
}
if ($calculatorSource -notmatch 'mciGetErrorString' -or
	$calculatorSource -notmatch 'SendMciCommand\(\$"play \{alias\} from 0"\)' -or
	$calculatorSource -notmatch 'speechThread\.SetApartmentState\(ApartmentState\.STA\)' -or
	$calculatorSource -notmatch 'new object\[\]\s*\{\s*safeText,\s*0\s*\}' -or
	$calculatorSource -notmatch 'return await SpeakTextAsync\(text, cancellationToken\)' -or
	$calculatorSource -notmatch 'return PlayAlarmSound\(\)' -or
	$calculatorSource -match 'new object\[\]\s*\{\s*safeText,\s*1\s*\}') {
	throw "Native Alarm.mp3 or TTS playback lost its completion and error-reporting safeguards."
}
if ($bossScheduleSource -notmatch 'boss-schedule/eu' -or
	$bossScheduleSource -notmatch 'AtomicFile\.WriteAllTextAsync' -or
	$bossScheduleSource -notmatch 'Europe/Berlin' -or
	$bossScheduleSource -notmatch 'MinimumWeeklySlots' -or
	$bossScheduleSource -notmatch 'BdoAlertsApiCredentials\.Resolve\(\)' -or
	$bossScheduleSource -notmatch 'BdoAlertsApiCredentials\.TryApply\(request, source, apiKey\)' -or
	$bossScheduleSource -notmatch 'IsBdoAlertsScheduleEndpoint\(source\)' -or
	$bossScheduleSource -notmatch 'AllowAutoRedirect = false' -or
	$bossScheduleSource -notmatch 'startupRefreshAttempted' -or
	$bossScheduleSource -notmatch 'RefreshOnceAsync' -or
	$bossScheduleSource -notmatch 'normalizedSlots\.Count\(slot => slot\.Bosses\.Count > 0\)') {
	throw "Boss schedule synchronization lost its authenticated-access, validation, cache, or timezone safeguards."
}
if ($bdoAlertsCredentialsSource -notmatch 'BLACK_SPIRIT_HUB_BDOALERTS_API_KEY' -or
	$bdoAlertsCredentialsSource -notmatch 'AssemblyMetadataKey = "BdoAlertsApiKey"' -or
	$bdoAlertsCredentialsSource -notmatch 'TryAddWithoutValidation\("X-API-Key", resolved\)' -or
	$bdoAlertsCredentialsSource -notmatch '/api/boss-schedule/eu' -or
	$bdoAlertsCredentialsSource -notmatch '/api/coupons' -or
	$bdoAlertsCredentialsSource -notmatch 'endpoint\.Query\.Length != 0' -or
	$bdoAlertsCredentialsSource -notmatch 'endpoint\.Fragment\.Length != 0') {
	throw "The BDO Alerts credential resolver can leak credentials or no longer covers the required endpoints."
}
if ($couponSource -notmatch 'BdoAlertsApiCredentials\.TryApply' -or
	$couponSource -notmatch 'AllowAutoRedirect = false' -or
	$couponSource -notmatch 'bdoAlertsHttp\.SendAsync' -or
	$couponSource -notmatch 'CanonicalCouponCode' -or
	$couponSource -notmatch 'CouponAppliesToNaEu' -or
	$couponSource -notmatch 'validatedNaEuCouponKeys' -or
	$couponSource -notmatch 'NaEuCouponCodes' -or
	$couponSource -notmatch 'ValidatedCachedCoupons' -or
	$couponSource -notmatch 'TrustedBootstrapNaEuCouponCodes' -or
	$couponSource -notmatch 'itemIconResolver\.ResolveAsync' -or
	$couponSource -notmatch 'allowNetwork: false' -or
	$couponSource -notmatch 'TryValidateIconUri' -or
	$couponSource -notmatch 'http = new HttpClient\(new HttpClientHandler' -or
	$couponSource -notmatch 'HttpCompletionOption\.ResponseHeadersRead' -or
	$couponSource -notmatch 'ReadLimitedIconBytesAsync' -or
	$couponSource -notmatch 'HasExpectedImageSignature' -or
	$couponSource -notmatch '"/items/new_icon/"' -or
	$couponSource -notmatch 'regionScope = "NA / EU"' -or
	$couponIconResolverSource -notmatch 'https://bdocodex\.com/ac\.php' -or
	$couponIconResolverSource -notmatch 'NormalizeForMatch' -or
	$couponIconResolverSource -notmatch 'AtomicFile\.WriteAllTextAsync' -or
	$couponIconResolverSource -notmatch 'MissingEntryTtl' -or
	$couponIconResolverSource -notmatch 'Timeout = TimeSpan\.FromSeconds\(5\)' -or
	$couponIconResolverSource -notmatch 'transient lookup failure' -or
	$couponIconResolverSource -notmatch 'path\.Contains\("\.\."' -or
	$script -notmatch 'function couponCodeKey\(code\)' -or
	$script -notmatch 'function couponRewardListHtml\(rewards\)' -or
	$script -notmatch 'data-coupon-rewards-toggle' -or
	$html -notmatch 'id="couponRegionBadge"' -or
	$css -notmatch '\.couponRegionBadge' -or
	$css -notmatch '\.couponRewardList\[hidden\]\{display:none\}' -or
	$couponSource -match 'DefaultRequestHeaders\.Referrer\s*=\s*new Uri\("https://bdoalerts\.net' -or
	$couponSource -match 'DefaultRequestHeaders\.TryAddWithoutValidation\("Origin",\s*"https://bdoalerts\.net') {
	throw "Coupon refresh lost its authenticated access, canonical deduplication, or NA/EU eligibility safeguards."
}
if ($script -notmatch 'let homeBossScheduleState=' -or
	$script -notmatch 'normalizeBossScheduleDashboard' -or
	$script -notmatch 'bossSpawnCache=\{mondayUtc:null,spawns:\[\]\}' -or
	$script -notmatch 'settings\.bosses\[b\]!==false' -or
	$script -notmatch 'bridgeCall\("initializeBossSchedule"\)' -or
	$script -notmatch 'bridgeCall\("refreshBossSchedule"\)' -or
	$bossScheduleRefreshCallCount -ne 1 -or
	$script -match 'if\(!names\.length\)return null' -or
	$script -match '\bHOME_BOSS_(?:TIMES|SCHEDULE|BOSSES)\b') {
	throw "The Home dashboard is no longer fully driven by the replaceable runtime boss schedule."
}
if (!(Test-Path -LiteralPath $bossScheduleJsTestPath -PathType Leaf)) {
	throw "The executable boss schedule JavaScript regression test is missing."
}
if (!(Test-Path -LiteralPath $bossAlertsJsTestPath -PathType Leaf)) {
	throw "The executable boss alert JavaScript regression test is missing."
}
if (!(Test-Path -LiteralPath $couponJsTestPath -PathType Leaf)) {
	throw "The executable coupon JavaScript regression test is missing."
}
if (!(Test-Path -LiteralPath $grindResistanceJsTestPath -PathType Leaf)) {
	throw "The executable Grind Zones resistance recommendation regression test is missing."
}
if (!(Test-Path -LiteralPath $appBehaviorJsTestPath -PathType Leaf)) {
	throw "The executable app-behavior JavaScript regression test is missing."
}
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
	& $nodeCommand.Source $bossScheduleJsTestPath
	if ($LASTEXITCODE -ne 0) {
		throw "Boss schedule JavaScript regression tests failed."
	}
	& $nodeCommand.Source $bossAlertsJsTestPath
	if ($LASTEXITCODE -ne 0) {
		throw "Boss alert JavaScript regression tests failed."
	}
	& $nodeCommand.Source $couponJsTestPath
	if ($LASTEXITCODE -ne 0) {
		throw "Coupon JavaScript regression tests failed."
	}
	& $nodeCommand.Source $grindResistanceJsTestPath $sourceRoot
	if ($LASTEXITCODE -ne 0) {
		throw "Grind Zones resistance recommendation JavaScript regression tests failed."
	}
	& $nodeCommand.Source $appBehaviorJsTestPath $scriptPath
	if ($LASTEXITCODE -ne 0) {
		throw "App behavior JavaScript regression tests failed."
	}
}
else {
	Write-Host "Node.js was not found; executable UI JavaScript regression checks were skipped."
}
if ($css -notmatch '\.bossLeadSelect\s*\{\s*box-sizing:border-box;flex:0 0 172px;width:172px;max-width:none;\s*\}' -or
	$css -notmatch 'body\[data-style\]:not\(\[data-style="custom"\]\) #bossLeadTime\{' -or
	$css -notmatch 'background-position:calc\(100% - 18px\) 50%,calc\(100% - 12px\) 50%,0 0!important') {
	throw "The dashboard lead-time selector can shrink and clip multi-digit minute labels."
}
if ($css -notmatch 'body\[data-style\] \.navFrame \.navButton\{\s*grid-template-columns:36px minmax\(0,1fr\) 36px!important;\s*column-gap:0!important;' -or
	$css -notmatch 'body\[data-style\] \.navFrame \.navButton \.navLabel\{[^}]*grid-column:1 / -1!important;' -or
	$css -notmatch 'body\[data-style\] \.navFrame \.navButton \.navLabel\{[^}]*padding-inline:36px!important;') {
	throw "Navigation labels can drift away from the button and ornament centerline."
}
if ($css -notmatch '--boss-schedule-min-width' -or
	$css -notmatch '#homeView \.bossScheduleWrap\{[^}]*overflow-x:auto!important' -or
	$script -notmatch 'sizeBossScheduleTable\(state\.times\.length\)' -or
	$script -notmatch 'sizeBossScheduleTable\(localTimes\.length\)') {
	throw "Dynamic boss schedule columns can no longer expand safely at narrow window sizes."
}
$releaseScript = Get-Content -LiteralPath $releaseScriptPath -Raw
if ($releaseScript -notmatch 'Assets\\Alarm\.mp3' -or
	$installerSource -notmatch 'Source:\s*"\{#AppFilesDir\}\\\*";[^\r\n]*recursesubdirs') {
	throw "Release or installer validation no longer requires Alarm.mp3."
}
if ($releaseScript -match '--self-contained\s+false' -or
	([regex]::Matches($releaseScript, '--self-contained\s+true')).Count -ne 1 -or
	$releaseScript -notmatch 'Assert-RunsWithoutDotnetRuntime' -or
	$releaseScript -notmatch 'DOTNET_ROOT_X64' -or
	$releaseScript -notmatch 'build-native-installer\.ps1' -or
	$releaseScript -notmatch '-RunIntegrationTest' -or
	$releaseScript -match 'Payload\.zip|dotnet publish \$installerProject' -or
	$nativeInstallerBuildScript -notmatch 'Assert-NativeWindowsExecutable' -or
	$nativeInstallerBuildScript -notmatch 'CLR header' -or
	$nativeInstallerBuildScript -notmatch 'Black-Spirit-Hub-Installer-SelfTest' -or
	$nativeInstallerBuildScript -notmatch 'Assert-AppRunsWithoutDotnetRuntime') {
	throw "Release packaging must publish one self-contained app and one native, CLR-free installer."
}
if ($calculatorSource -notmatch 'CoreWebView2ProcessFailedKind\.RenderProcessExited' -or
	$calculatorSource -notmatch 'CoreWebView2ProcessFailedKind\.GpuProcessExited' -or
	$calculatorSource -notmatch 'ProcessFailed\s*\+=\s*OnMainProcessFailed' -or
	$calculatorSource -notmatch 'RecreateMainWebViewAsync') {
	throw "Main WebView renderer/GPU crash detection and recreation are missing."
}
if ($installerSource -notmatch 'F3017226-FE2A-4295-8BDF-00C3A9A7E4C5' -or
	$installerSource -notmatch 'HKCU32' -or
	$installerSource -notmatch 'HKLM32' -or
	$installerSource -notmatch 'HKCU64' -or
	$installerSource -notmatch 'HKLM64' -or
	$installerSource -notmatch 'WebViewInstallAttempted' -or
	$installerSource -notmatch 'ExtractTemporaryFile\(WebView2BootstrapperName\)' -or
	$installerSource -notmatch "'/silent /install'" -or
	$installerSource -notmatch 'WaitForApplicationShutdown' -or
	$installerSource -notmatch 'ApplicationAppearsRunning' -or
	$nativeInstallerBuildScript -notmatch 'LinkId=2124703' -or
	$nativeInstallerBuildScript -notmatch 'Get-AuthenticodeSignature' -or
	$nativeInstallerBuildScript -notmatch 'Microsoft Corporation') {
	throw "Native installer WebView2 detection, verified one-time repair, or graceful-close safety is missing."
}
if ($installerSource -notmatch 'PrivilegesRequired=lowest' -or
	$installerSource -notmatch 'DefaultDirName=\{code:GetDefaultInstallDir\}' -or
	$installerSource -notmatch 'CloseApplications=yes' -or
	$installerSource -notmatch 'Uninstallable=yes' -or
	$installerSource -notmatch "'--install-path'" -or
	$installerSource -notmatch "'--source-pid'" -or
	$calculatorSource -notmatch '"/DIR="\s*\+\s*currentInstallDirectory' -or
	$calculatorSource -notmatch '"/SOURCEPID="\s*\+\s*Environment\.ProcessId' -or
	$installerSource -notmatch '--install-market-task' -or
	$installerSource -notmatch '--remove-market-task' -or
	$programSource -notmatch 'SendShutdownRequestToExistingInstance' -or
	$programSource -notmatch '--install-market-task' -or
	$programSource -notmatch '--remove-market-task' -or
	$marketCollectorTaskSource -notmatch '/SC HOURLY /MO 6 /RL LIMITED /F' -or
	$marketCollectorTaskSource -match '/XML' -or
	$marketCollectorTaskSource -notmatch '--market-scheduled-update') {
	throw "Native installer update compatibility, uninstall integration, or market collector scheduling is incomplete."
}
$bridgeCommands = @(
	[regex]::Matches($script, 'bridgeCall\(\s*["'']([^"'']+)["'']') |
		ForEach-Object { $_.Groups[1].Value }
) + @("initializeEvents", "refreshEvents")
$hostCommands = [regex]::Matches($calculatorSource, 'case\s+"([^"]+)"\s*:') |
	ForEach-Object { $_.Groups[1].Value }
$missingHostCommands = Compare-Object `
	($bridgeCommands | Sort-Object -Unique) `
	($hostCommands | Sort-Object -Unique) |
	Where-Object SideIndicator -eq "<=" |
	ForEach-Object InputObject
$unusedHostCommands = Compare-Object `
	($bridgeCommands | Sort-Object -Unique) `
	($hostCommands | Sort-Object -Unique) |
	Where-Object SideIndicator -eq "=>" |
	ForEach-Object InputObject
if ($missingHostCommands) {
	throw "JavaScript bridge commands without host handlers: $($missingHostCommands -join ', ')"
}
if ($unusedHostCommands) {
	throw "Host bridge handlers without JavaScript callers: $($unusedHostCommands -join ', ')"
}
if ($script -notmatch 'migratePreviousSettingNamespace\(\)' -or
	$script -notmatch 'localStorage\.removeItem\(previousKey\)') {
	throw "The one-time browser setting migration is missing."
}

$appBehaviorStartupCalls = [regex]::Matches(
	$script,
	'(?m)^\s*initializeAppBehaviorSettings\(\);\s*$')
$marketStateOffset = $script.IndexOf('const marketState =')
$bridgeListenerOffset = $script.IndexOf('window.chrome?.webview?.addEventListener("message"')
$appBehaviorStartupOffset = if ($appBehaviorStartupCalls.Count -eq 1) {
	$appBehaviorStartupCalls[0].Index
}
else {
	-1
}
if ($appBehaviorStartupCalls.Count -ne 1 -or
	$marketStateOffset -lt 0 -or
	$bridgeListenerOffset -lt 0 -or
	$appBehaviorStartupOffset -le $marketStateOffset -or
	$appBehaviorStartupOffset -le $bridgeListenerOffset -or
	$html -match '<input[^>]+id="minimizeToTrayEnabled"[^>]+checked' -or
	$html -notmatch '<input[^>]+id="minimizeToTrayEnabled"[^>]+disabled') {
	throw "Close-to-tray UI hydration can run before the bridge is ready or show an unconfirmed default."
}

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
	& $node.Source --check $scriptPath
	if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax validation failed." }
}

$appDll = Join-Path $sourceRoot "bin\Release\net8.0-windows\Black Spirit Hub.dll"
& $dotnet $appDll --offline-smoke-test
if ($LASTEXITCODE -ne 0) { throw "Offline application smoke test failed with exit code $LASTEXITCODE." }
& $dotnet $appDll --product-migration-smoke-test
if ($LASTEXITCODE -ne 0) { throw "Product data migration smoke test failed with exit code $LASTEXITCODE." }
& $dotnet $appDll --app-behavior-smoke-test
if ($LASTEXITCODE -ne 0) { throw "App behavior persistence smoke test failed with exit code $LASTEXITCODE." }

Write-Host "Verification passed: build, offline smoke test, DOM wiring, data integrity, UI assets, performance budgets, cancellation, and duplicate-function checks."
