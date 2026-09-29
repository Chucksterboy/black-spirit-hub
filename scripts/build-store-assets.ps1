param(
	[string]$SourceRoot = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
	$SourceRoot = Join-Path $repoRoot "Source Code"
}
$resolvedSourceRoot = (Resolve-Path -LiteralPath $SourceRoot).Path
$sourceIconPath = Join-Path $resolvedSourceRoot "Assets\AppIcon\app-icon.png"
$outputDirectory = Join-Path $resolvedSourceRoot "StorePackage\Assets"
if (!(Test-Path -LiteralPath $sourceIconPath -PathType Leaf)) {
	throw "The application icon is missing: $sourceIconPath"
}

Add-Type -AssemblyName System.Drawing

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
		$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
		$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
		$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
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
		$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
		$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
		$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
		$graphics.DrawImage($Source, [System.Drawing.Rectangle]::new(80, 0, 150, 150))
		$bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
	}
	finally {
		$graphics.Dispose()
		$bitmap.Dispose()
	}
}

[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
$source = [System.Drawing.Image]::FromFile($sourceIconPath)
try {
	foreach ($asset in @(
		@{ Name = "StoreLogo.png"; Size = 50 },
		@{ Name = "Square44x44Logo.png"; Size = 44 },
		@{ Name = "Square150x150Logo.png"; Size = 150 },
		@{ Name = "Square310x310Logo.png"; Size = 310 }
	)) {
		Write-SquareAsset -Source $source -Size $asset.Size -Path (Join-Path $outputDirectory $asset.Name)
	}
	Write-WideAsset -Source $source -Path (Join-Path $outputDirectory "Wide310x150Logo.png")
}
finally {
	$source.Dispose()
}

Write-Host "Generated Microsoft Store visual assets in $outputDirectory"
