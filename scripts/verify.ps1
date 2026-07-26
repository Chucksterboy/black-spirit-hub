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
$appIconPath = Join-Path $sourceRoot "app.ico"
$runtimeIconPath = Join-Path $sourceRoot "Assets\AppIcon\app-icon.ico"
$runtimeIconPngPath = Join-Path $sourceRoot "Assets\AppIcon\app-icon.png"
$installerIconPath = Join-Path $sourceRoot "InstallerSource\BlackSpiritHubInstaller\installer.ico"
$iconMasterPath = Join-Path $repoRoot "Branding\AppIcon\midnight-sigil-source.png"

if (!$SkipBuild) {
	& $dotnet build $project -c Release -p:EnableNETAnalyzers=true -p:AnalysisLevel=latest -p:WarningLevel=9999 --nologo
	if ($LASTEXITCODE -ne 0) { throw "Application build failed." }
}

foreach ($path in @($htmlPath, $cssPath, $scriptPath, $grindDataPath)) {
	if (!(Test-Path -LiteralPath $path)) { throw "Required UI asset is missing: $path" }
}

$iconPaths = @($appIconPath, $runtimeIconPath, $installerIconPath)
foreach ($path in $iconPaths + @($runtimeIconPngPath, $iconMasterPath)) {
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

$html = Get-Content -LiteralPath $htmlPath -Raw
$css = Get-Content -LiteralPath $cssPath -Raw
$script = Get-Content -LiteralPath $scriptPath -Raw
if ($html -notmatch 'BlackSpiritHub\.Resources\.Black_Spirit_Hub\.css' -or $html -notmatch 'BlackSpiritHub\.Resources\.Black_Spirit_Hub\.js') {
	throw "The HTML shell does not reference the external UI assets."
}
if ($css -notmatch '(?s)html,\s*body\s*\{\s*scrollbar-width:\s*none;.*?-ms-overflow-style:\s*none;' -or
	$css -notmatch '(?s)html::\-webkit-scrollbar,\s*body::\-webkit-scrollbar\s*\{.*?display:\s*none;' -or
	$css -match '(?s)(?:html|body)\s*\{[^}]*overflow-y:\s*hidden') {
	throw "The root scrollbar must be visually hidden without disabling vertical scrolling."
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
if ($calculatorSource -match 'CancellationToken\.None') {
	throw "CalculatorForm contains an uncancellable host operation."
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
if ($script -notmatch 'blackSpiritHub\.grindTrackerSessionsRecovery' -or
	$script -match 'localStorage\.setItem\("grindTrackerSessionsRecovery"') {
	throw "Grind Tracker emergency recovery is not using the namespaced storage key."
}
if ($script -notmatch 'migratePreviousSettingNamespace\(\)' -or
	$script -notmatch 'localStorage\.removeItem\(previousKey\)') {
	throw "The one-time browser setting migration is missing."
}

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
	& $node.Source --check $scriptPath
	if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax validation failed." }
}

$appDll = Join-Path $sourceRoot "bin\Release\net8.0-windows10.0.19041.0\Black Spirit Hub.dll"
& $dotnet $appDll --offline-smoke-test
if ($LASTEXITCODE -ne 0) { throw "Offline application smoke test failed with exit code $LASTEXITCODE." }
& $dotnet $appDll --product-migration-smoke-test
if ($LASTEXITCODE -ne 0) { throw "Product data migration smoke test failed with exit code $LASTEXITCODE." }

Write-Host "Verification passed: build, offline smoke test, DOM wiring, data integrity, UI assets, performance budgets, cancellation, and duplicate-function checks."
