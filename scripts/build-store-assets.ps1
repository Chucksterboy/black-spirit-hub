param(
	[string]$SourceRoot = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
	$SourceRoot = Join-Path $repoRoot "Source Code"
}
$resolvedSourceRoot = (Resolve-Path -LiteralPath $SourceRoot).Path
$tileSourceIconPath = Join-Path $resolvedSourceRoot "Assets\AppIcon\app-icon.png"
$taskbarIconPath = Join-Path $resolvedSourceRoot "Assets\AppIcon\tray-icon.ico"
$largeTaskbarIconPath = Join-Path $resolvedSourceRoot "Assets\AppIcon\app-icon-ui.png"
$outputDirectory = Join-Path $resolvedSourceRoot "StorePackage\Assets"

foreach ($requiredPath in @($tileSourceIconPath, $taskbarIconPath, $largeTaskbarIconPath)) {
	if (!(Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
		throw "The required Microsoft Store icon source is missing: $requiredPath"
	}
}

Add-Type -AssemblyName System.Drawing

function Set-HighQualityDrawing {
	param([Parameter(Mandatory = $true)][System.Drawing.Graphics]$Graphics)
	$Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::GammaCorrected
	$Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
	$Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
	$Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
}

function Write-SquareAsset {
	param(
		[Parameter(Mandatory = $true)][System.Drawing.Image]$Source,
		[Parameter(Mandatory = $true)][int]$Size,
		[Parameter(Mandatory = $true)][string]$Path
	)
	$bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
	$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
	try {
		$graphics.Clear([System.Drawing.Color]::FromArgb(255, 7, 10, 14))
		Set-HighQualityDrawing -Graphics $graphics
		$graphics.DrawImage($Source, [System.Drawing.Rectangle]::new(0, 0, $Size, $Size))
		$bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
	}
	finally {
		$graphics.Dispose()
		$bitmap.Dispose()
	}
}

function Write-WideAsset {
	param(
		[Parameter(Mandatory = $true)][System.Drawing.Image]$Source,
		[Parameter(Mandatory = $true)][string]$Path
	)
	$bitmap = [System.Drawing.Bitmap]::new(310, 150, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
	$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
	try {
		$graphics.Clear([System.Drawing.Color]::FromArgb(255, 7, 10, 14))
		Set-HighQualityDrawing -Graphics $graphics
		$graphics.DrawImage($Source, [System.Drawing.Rectangle]::new(80, 0, 150, 150))
		$bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
	}
	finally {
		$graphics.Dispose()
		$bitmap.Dispose()
	}
}

function Get-TaskbarFrameSize {
	param([Parameter(Mandatory = $true)][int]$TargetSize)
	if ($TargetSize -le 16) { return 16 }
	if ($TargetSize -le 24) { return 24 }
	if ($TargetSize -le 48) { return 48 }
	if ($TargetSize -le 96) { return 96 }
	return 128
}

function Assert-TransparentTaskbarAsset {
	param(
		[Parameter(Mandatory = $true)][string]$Path,
		[Parameter(Mandatory = $true)][int]$ExpectedSize
	)
	$asset = [System.Drawing.Bitmap]::new($Path)
	try {
		if ($asset.Width -ne $ExpectedSize -or $asset.Height -ne $ExpectedSize) {
			throw "Store taskbar icon has the wrong dimensions: $Path"
		}
		foreach ($corner in @(
			[System.Drawing.Point]::new(0, 0),
			[System.Drawing.Point]::new($ExpectedSize - 1, 0),
			[System.Drawing.Point]::new(0, $ExpectedSize - 1),
			[System.Drawing.Point]::new($ExpectedSize - 1, $ExpectedSize - 1)
		)) {
			if ($asset.GetPixel($corner.X, $corner.Y).A -ne 0) {
				throw "Store taskbar icon must keep a transparent canvas: $Path"
			}
		}
	}
	finally {
		$asset.Dispose()
	}
}

$taskbarFrames = @{}

function Get-TaskbarFrame {
	param([Parameter(Mandatory = $true)][int]$TargetSize)
	$frameSize = Get-TaskbarFrameSize -TargetSize $TargetSize
	if (!$taskbarFrames.ContainsKey($frameSize)) {
		$icon = [System.Drawing.Icon]::new($taskbarIconPath, $frameSize, $frameSize)
		try {
			$taskbarFrames[$frameSize] = $icon.ToBitmap()
		}
		finally {
			$icon.Dispose()
		}
	}
	return $taskbarFrames[$frameSize]
}

function Write-TaskbarAsset {
	param(
		[Parameter(Mandatory = $true)][int]$Size,
		[Parameter(Mandatory = $true)][string]$Path,
		[Parameter(Mandatory = $true)][System.Drawing.Image]$LargeSource
	)
	$source = if ($Size -ge 128) { $LargeSource } else { Get-TaskbarFrame -TargetSize $Size }
	$bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
	$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
	try {
		# These transparent, exact-size assets are what Windows uses on the taskbar,
		# task view, and Start. They must not be a shrunken dark tile thumbnail.
		$graphics.Clear([System.Drawing.Color]::Transparent)
		Set-HighQualityDrawing -Graphics $graphics
		$graphics.DrawImage(
			$source,
			[System.Drawing.Rectangle]::new(0, 0, $Size, $Size),
			0,
			0,
			$source.Width,
			$source.Height,
			[System.Drawing.GraphicsUnit]::Pixel)
		$bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
	}
	finally {
		$graphics.Dispose()
		$bitmap.Dispose()
	}
	Assert-TransparentTaskbarAsset -Path $Path -ExpectedSize $Size
}

[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
$tileSource = [System.Drawing.Image]::FromFile($tileSourceIconPath)
$largeTaskbarSource = [System.Drawing.Image]::FromFile($largeTaskbarIconPath)
try {
	foreach ($asset in @(
		@{ Name = "StoreLogo.png"; Size = 50 },
		@{ Name = "Square150x150Logo.png"; Size = 150 },
		@{ Name = "Square310x310Logo.png"; Size = 310 }
	)) {
		Write-SquareAsset -Source $tileSource -Size $asset.Size -Path (Join-Path $outputDirectory $asset.Name)
	}
	Write-WideAsset -Source $tileSource -Path (Join-Path $outputDirectory "Wide310x150Logo.png")

	# Keep the unqualified manifest resource as a crisp 44px fallback, then add
	# every exact target size Windows requests for taskbar and app-list surfaces.
	Write-TaskbarAsset -Size 44 -Path (Join-Path $outputDirectory "Square44x44Logo.png") -LargeSource $largeTaskbarSource
	$taskbarTargetSizes = @(16, 20, 24, 30, 32, 36, 40, 44, 48, 60, 64, 72, 80, 96, 256)
	$taskbarThemeSuffixes = @("", "_altform-unplated", "_altform-lightunplated")
	foreach ($size in $taskbarTargetSizes) {
		foreach ($suffix in $taskbarThemeSuffixes) {
			$fileName = "Square44x44Logo.targetsize-$size$suffix.png"
			Write-TaskbarAsset -Size $size -Path (Join-Path $outputDirectory $fileName) -LargeSource $largeTaskbarSource
		}
	}

	# Scale assets cover high-DPI app-list and Start contexts that do not request
	# a target-size resource directly.
	foreach ($scaleAsset in @(
		@{ Qualifier = "scale-100"; Size = 44 },
		@{ Qualifier = "scale-125"; Size = 55 },
		@{ Qualifier = "scale-150"; Size = 66 },
		@{ Qualifier = "scale-200"; Size = 88 },
		@{ Qualifier = "scale-400"; Size = 176 }
	)) {
		$fileName = "Square44x44Logo.$($scaleAsset.Qualifier).png"
		Write-TaskbarAsset -Size $scaleAsset.Size -Path (Join-Path $outputDirectory $fileName) -LargeSource $largeTaskbarSource
	}
}
finally {
	foreach ($frame in $taskbarFrames.Values) {
		$frame.Dispose()
	}
	$largeTaskbarSource.Dispose()
	$tileSource.Dispose()
}

Write-Host "Generated Microsoft Store visual assets in $outputDirectory"
