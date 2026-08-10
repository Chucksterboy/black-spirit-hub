[CmdletBinding()]
param(
	[string]$OutputDirectory,
	[string]$EdgePath
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
	$OutputDirectory = Join-Path $repoRoot "Source Code\Assets\GrindTracker\classes"
}

$sourceUrl = "https://s1.pearlcdn.com/NAEU/contents/img/common/character/icn_class_symbol_spr.svg"
$expectedSourceSha256 = "2ACBD72923F32801D1D454F97EC661B65100D84D05733518D1AA360E1987E642"
$classSlugs = @(
	"warrior", "ranger", "sorceress", "berserker", "tamer", "ninja", "kunoichi", "witch",
	"wizard", "maehwa", "valkyrie", "musa", "dark-knight", "striker", "mystic", "lahn",
	"archer", "shai", "guardian", "hashashin", "nova", "sage", "corsair", "drakania",
	"woosa", "maegu", "scholar", "dosa", "deadeye", "wukong", "seraph"
)

$edgeCandidates = @(
	$EdgePath,
	(Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
	(Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"),
	(Join-Path $env:LOCALAPPDATA "Microsoft\Edge\Application\msedge.exe")
) | Where-Object { ![string]::IsNullOrWhiteSpace($_) -and (Test-Path -LiteralPath $_ -PathType Leaf) }
$edgeExecutable = $edgeCandidates | Select-Object -First 1
if (!$edgeExecutable) {
	throw "Microsoft Edge is required to render the official vector class symbols."
}

$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$workDirectory = Join-Path $tempRoot ("black-spirit-hub-class-icons-" + [Guid]::NewGuid().ToString("N"))
$spritePath = Join-Path $workDirectory "official-class-symbols.svg"
$htmlPath = Join-Path $workDirectory "render.html"
$gridPath = Join-Path $workDirectory "official-class-symbol-grid.png"
$generatedDirectory = Join-Path $workDirectory "generated"

try {
	[void](New-Item -ItemType Directory -Path $workDirectory)
	[void](New-Item -ItemType Directory -Path $generatedDirectory)

	$response = Invoke-WebRequest -Uri $sourceUrl -OutFile $spritePath -PassThru -UseBasicParsing
	if ($response.StatusCode -ne 200 -or
		$response.Headers["Content-Type"] -notmatch "image/svg\+xml") {
		throw "Pearl Abyss did not return the expected SVG class-symbol sprite."
	}
	$actualHash = (Get-FileHash -LiteralPath $spritePath -Algorithm SHA256).Hash
	if ($actualHash -ne $expectedSourceSha256) {
		throw "The official class-symbol sprite changed. Inspect its row mapping before updating the expected hash."
	}
	[xml]$sprite = Get-Content -LiteralPath $spritePath -Raw -Encoding UTF8
	if ($sprite.DocumentElement.LocalName -ne "svg" -or
		$sprite.DocumentElement.GetAttribute("viewBox") -ne "0 0 240 2480") {
		throw "The official class-symbol sprite no longer has the validated 3-column by 31-row layout."
	}

	$cells = 0..30 | ForEach-Object {
		"<div style=`"background-position:-256px -$($_ * 256)px`"></div>"
	}
	$cells += "<div></div>"
	$html = @"
<!doctype html>
<meta charset="utf-8">
<style>
html,body{margin:0;width:2048px;height:1024px;overflow:hidden;background:transparent}
body{display:grid;grid-template-columns:repeat(8,256px);grid-template-rows:repeat(4,256px)}
div{width:256px;height:256px;background-image:url('./official-class-symbols.svg');background-repeat:no-repeat;background-size:768px 7936px}
</style>
$($cells -join "")
"@
	[IO.File]::WriteAllText($htmlPath, $html, [Text.UTF8Encoding]::new($false))

	$edgeArguments = @(
		"--headless=new",
		"--disable-gpu",
		"--hide-scrollbars",
		"--no-first-run",
		"--force-device-scale-factor=1",
		"--default-background-color=00000000",
		"--window-size=2048,1024",
		"--virtual-time-budget=7000",
		"--user-data-dir=$(Join-Path $workDirectory 'edge-profile')",
		"--screenshot=$gridPath",
		([Uri]::new($htmlPath).AbsoluteUri)
	)
	$edgeProcess = Start-Process -FilePath $edgeExecutable -ArgumentList $edgeArguments -WindowStyle Hidden -Wait -PassThru
	if ($edgeProcess.ExitCode -ne 0 -or !(Test-Path -LiteralPath $gridPath -PathType Leaf)) {
		throw "Microsoft Edge could not render the official class-symbol sprite."
	}

	Add-Type -AssemblyName System.Drawing
	$grid = [Drawing.Bitmap]::new($gridPath)
	try {
		if ($grid.Width -ne 2048 -or $grid.Height -ne 1024) {
			throw "The rendered class-symbol grid has unexpected dimensions."
		}
		$validation = @()
		for ($index = 0; $index -lt $classSlugs.Count; $index++) {
			$slug = $classSlugs[$index]
			$rectangle = [Drawing.Rectangle]::new(($index % 8) * 256, [Math]::Floor($index / 8) * 256, 256, 256)
			$icon = $grid.Clone($rectangle, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
			try {
				$visiblePixels = 0
				$luminousPixels = 0
				$minX = 256
				$minY = 256
				$maxX = -1
				$maxY = -1
				for ($y = 0; $y -lt 256; $y++) {
					for ($x = 0; $x -lt 256; $x++) {
						$pixel = $icon.GetPixel($x, $y)
						if ($pixel.A -eq 0) { continue }
						$visiblePixels++
						if ($pixel.R -ge 220 -and $pixel.G -ge 220 -and $pixel.B -ge 220) { $luminousPixels++ }
						if ($x -lt $minX) { $minX = $x }
						if ($x -gt $maxX) { $maxX = $x }
						if ($y -lt $minY) { $minY = $y }
						if ($y -gt $maxY) { $maxY = $y }
					}
				}
				$transparentCorners = @(
					$icon.GetPixel(0, 0).A,
					$icon.GetPixel(255, 0).A,
					$icon.GetPixel(0, 255).A,
					$icon.GetPixel(255, 255).A
				) | Where-Object { $_ -ne 0 }
				if ($transparentCorners -or
					$visiblePixels -lt 3000 -or
					$luminousPixels -lt [Math]::Floor($visiblePixels * 0.85) -or
					$minX -lt 12 -or $minY -lt 12 -or $maxX -gt 243 -or $maxY -gt 243) {
					throw "The rendered $slug class icon is empty, clipped, opaque, or unexpectedly dark."
				}
				$outputPath = Join-Path $generatedDirectory ($slug + ".png")
				$icon.Save($outputPath, [Drawing.Imaging.ImageFormat]::Png)
				$validation += [pscustomobject]@{
					Class = $slug
					VisiblePixels = $visiblePixels
					Bounds = "$minX,$minY-$maxX,$maxY"
				}
			}
			finally {
				$icon.Dispose()
			}
		}
	}
	finally {
		$grid.Dispose()
	}

	[void](New-Item -ItemType Directory -Path $OutputDirectory -Force)
	foreach ($slug in $classSlugs) {
		Copy-Item -LiteralPath (Join-Path $generatedDirectory ($slug + ".png")) -Destination (Join-Path $OutputDirectory ($slug + ".png")) -Force
	}
	$validation | Format-Table -AutoSize
	Write-Host "Updated $($classSlugs.Count) transparent 256px class icons from Pearl Abyss's validated official SVG sprite."
}
finally {
	$resolvedWorkDirectory = [IO.Path]::GetFullPath($workDirectory)
	if ($resolvedWorkDirectory.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and
		[IO.Path]::GetFileName($resolvedWorkDirectory).StartsWith("black-spirit-hub-class-icons-", [StringComparison]::Ordinal)) {
		try { [IO.Directory]::Delete($resolvedWorkDirectory, $true) } catch { }
	}
}
