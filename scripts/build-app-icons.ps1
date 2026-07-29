param(
	[string]$MasterPath = "",
	[string]$SourceRoot = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($MasterPath)) {
	$MasterPath = Join-Path $repoRoot "Branding\AppIcon\midnight-sigil-source.png"
}
if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
	$SourceRoot = Join-Path $repoRoot "Source Code"
}

$resolvedMasterPath = (Resolve-Path -LiteralPath $MasterPath).Path
$smallMasterPath = (Resolve-Path -LiteralPath (Join-Path $repoRoot "Branding\AppIcon\midnight-sigil-master.png")).Path
$resolvedSourceRoot = (Resolve-Path -LiteralPath $SourceRoot).Path
$appIconPath = Join-Path $resolvedSourceRoot "app.ico"
$runtimeIconDirectory = Join-Path $resolvedSourceRoot "Assets\AppIcon"
$runtimeIcoPath = Join-Path $runtimeIconDirectory "app-icon.ico"
$runtimeTrayIcoPath = Join-Path $runtimeIconDirectory "tray-icon.ico"
$runtimePngPath = Join-Path $runtimeIconDirectory "app-icon.png"
$runtimeUiPngPath = Join-Path $runtimeIconDirectory "app-icon-ui.png"
$installerIconPath = Join-Path $resolvedSourceRoot "InstallerSource\BlackSpiritHubInstaller\installer.ico"
$iconSizes = @(16, 20, 24, 32, 40, 48, 64, 96, 128, 256)

Add-Type -AssemblyName System.Drawing

if (!("BlackSpiritHub.IconPixelTools" -as [type])) {
	Add-Type -ReferencedAssemblies "System.Drawing.dll" -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

namespace BlackSpiritHub
{
	public static class IconPixelTools
	{
		public static byte[] ToIconDib(Bitmap bitmap)
		{
			Rectangle full = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
			BitmapData data = bitmap.LockBits(full, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
			try
			{
				int stride = Math.Abs(data.Stride);
				int xorStride = ((bitmap.Width * 32 + 31) / 32) * 4;
				int xorBytes = xorStride * bitmap.Height;
				int maskStride = ((bitmap.Width + 31) / 32) * 4;
				byte[] pixels = new byte[stride * bitmap.Height];
				Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
				using (var stream = new System.IO.MemoryStream())
				using (var writer = new System.IO.BinaryWriter(stream))
				{
					writer.Write((uint)40);
					writer.Write(bitmap.Width);
					writer.Write(bitmap.Height * 2);
					writer.Write((ushort)1);
					writer.Write((ushort)32);
					writer.Write((uint)0);
					writer.Write((uint)xorBytes);
					writer.Write(0);
					writer.Write(0);
					writer.Write((uint)0);
					writer.Write((uint)0);

					for (int y = bitmap.Height - 1; y >= 0; y--)
					{
						int row = data.Stride >= 0 ? y * stride : (bitmap.Height - 1 - y) * stride;
						writer.Write(pixels, row, bitmap.Width * 4);
					}

					byte[] maskRow = new byte[maskStride];
					for (int y = bitmap.Height - 1; y >= 0; y--)
					{
						Array.Clear(maskRow, 0, maskRow.Length);
						int row = data.Stride >= 0 ? y * stride : (bitmap.Height - 1 - y) * stride;
						for (int x = 0; x < bitmap.Width; x++)
						{
							byte alpha = pixels[row + x * 4 + 3];
							if (alpha == 0)
								maskRow[x >> 3] |= (byte)(0x80 >> (x & 7));
						}
						writer.Write(maskRow);
					}

					return stream.ToArray();
				}
			}
			finally
			{
				bitmap.UnlockBits(data);
			}
		}

		public static Rectangle GetAlphaBounds(Bitmap bitmap, byte threshold)
		{
			Rectangle full = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
			BitmapData data = bitmap.LockBits(full, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
			try
			{
				int stride = Math.Abs(data.Stride);
				byte[] pixels = new byte[stride * bitmap.Height];
				Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
				int minX = bitmap.Width;
				int minY = bitmap.Height;
				int maxX = -1;
				int maxY = -1;

				for (int y = 0; y < bitmap.Height; y++)
				{
					int row = data.Stride >= 0 ? y * stride : (bitmap.Height - 1 - y) * stride;
					for (int x = 0; x < bitmap.Width; x++)
					{
						if (pixels[row + x * 4 + 3] <= threshold)
							continue;

						if (x < minX) minX = x;
						if (x > maxX) maxX = x;
						if (y < minY) minY = y;
						if (y > maxY) maxY = y;
					}
				}

				return maxX < minX || maxY < minY
					? Rectangle.Empty
					: Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
			}
			finally
			{
				bitmap.UnlockBits(data);
			}
		}

		public static Rectangle GetLuminousBounds(Bitmap bitmap)
		{
			Rectangle full = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
			BitmapData data = bitmap.LockBits(full, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
			try
			{
				int stride = Math.Abs(data.Stride);
				byte[] pixels = new byte[stride * bitmap.Height];
				Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
				int minX = bitmap.Width;
				int minY = bitmap.Height;
				int maxX = -1;
				int maxY = -1;

				for (int y = 0; y < bitmap.Height; y++)
				{
					int row = data.Stride >= 0 ? y * stride : (bitmap.Height - 1 - y) * stride;
					for (int x = 0; x < bitmap.Width; x++)
					{
						int offset = row + x * 4;
						int blue = pixels[offset];
						int green = pixels[offset + 1];
						int red = pixels[offset + 2];
						bool cyan = blue >= 100 && green >= 90 && blue > red + 20;
						bool white = red >= 175 && green >= 175 && blue >= 175;
						if (!cyan && !white)
							continue;

						if (x < minX) minX = x;
						if (x > maxX) maxX = x;
						if (y < minY) minY = y;
						if (y > maxY) maxY = y;
					}
				}

				return maxX < minX || maxY < minY
					? Rectangle.Empty
					: Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
			}
			finally
			{
				bitmap.UnlockBits(data);
			}
		}

		public static void BoostLuminousPixels(Bitmap bitmap)
		{
			Rectangle full = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
			BitmapData data = bitmap.LockBits(full, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
			try
			{
				int stride = Math.Abs(data.Stride);
				byte[] pixels = new byte[stride * bitmap.Height];
				Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);

				for (int y = 0; y < bitmap.Height; y++)
				{
					int row = data.Stride >= 0 ? y * stride : (bitmap.Height - 1 - y) * stride;
					for (int x = 0; x < bitmap.Width; x++)
					{
						int offset = row + x * 4;
						int blue = pixels[offset];
						int green = pixels[offset + 1];
						int red = pixels[offset + 2];
						bool cyan = blue >= 100 && green >= 90 && blue > red + 20;
						bool white = red >= 175 && green >= 175 && blue >= 175;
						if (!cyan && !white)
							continue;

						pixels[offset] = (byte)Math.Min(255, Math.Max(blue, white ? 245 : 220));
						pixels[offset + 1] = (byte)Math.Min(255, Math.Max(green, white ? 245 : 195));
						pixels[offset + 2] = (byte)Math.Min(255, Math.Max(red, white ? 245 : 16));
						pixels[offset + 3] = 255;
					}
				}

				Marshal.Copy(pixels, 0, data.Scan0, pixels.Length);
			}
			finally
			{
				bitmap.UnlockBits(data);
			}
		}

		public static void StyleBoldTrayMask(Bitmap bitmap, int radius)
		{
			Rectangle full = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
			BitmapData data = bitmap.LockBits(full, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
			try
			{
				int stride = Math.Abs(data.Stride);
				int width = bitmap.Width;
				int height = bitmap.Height;
				byte[] source = new byte[stride * height];
				Marshal.Copy(data.Scan0, source, 0, source.Length);
				byte[] alpha = new byte[width * height];
				for (int y = 0; y < height; y++)
				{
					int row = data.Stride >= 0 ? y * stride : (height - 1 - y) * stride;
					for (int x = 0; x < width; x++)
						alpha[y * width + x] = source[row + x * 4 + 3];
				}

				byte[] output = new byte[stride * height];
				int radiusSquared = radius * radius;
				for (int y = 0; y < height; y++)
				{
					for (int x = 0; x < width; x++)
					{
						byte bodyAlpha = alpha[y * width + x];
						byte outlineAlpha = 0;
						for (int sampleY = Math.Max(0, y - radius);
							sampleY <= Math.Min(height - 1, y + radius);
							sampleY++)
						{
							for (int sampleX = Math.Max(0, x - radius);
								sampleX <= Math.Min(width - 1, x + radius);
								sampleX++)
							{
								int deltaX = sampleX - x;
								int deltaY = sampleY - y;
								if (deltaX * deltaX + deltaY * deltaY <= radiusSquared
									&& alpha[sampleY * width + sampleX] > outlineAlpha)
								{
									outlineAlpha = alpha[sampleY * width + sampleX];
								}
							}
						}

						if (outlineAlpha == 0)
							continue;

						int row = data.Stride >= 0 ? y * stride : (height - 1 - y) * stride;
						int offset = row + x * 4;
						if (bodyAlpha > 16)
						{
							// Deep navy body: visible against the tray without turning
							// the logo into a flat cyan blob.
							output[offset] = 53;
							output[offset + 1] = 33;
							output[offset + 2] = 8;
							output[offset + 3] = bodyAlpha;
						}
						else
						{
							// Smooth supersampled cyan outline and internal seam.
							output[offset] = 255;
							output[offset + 1] = 231;
							output[offset + 2] = 47;
							output[offset + 3] = outlineAlpha;
						}
					}
				}

				Marshal.Copy(output, 0, data.Scan0, output.Length);
			}
			finally
			{
				bitmap.UnlockBits(data);
			}
		}
	}
}
'@
}

function New-IconFrame {
	param(
		[System.Drawing.Bitmap]$Master,
		[System.Drawing.Rectangle]$MasterBounds,
		[System.Drawing.Bitmap]$SmallMaster,
		[System.Drawing.Rectangle]$SmallMasterBounds,
		[int]$Size
	)

	$frame = [System.Drawing.Bitmap]::new(
		$Size,
		$Size,
		[System.Drawing.Imaging.PixelFormat]::Format32bppArgb
	)
	$graphics = [System.Drawing.Graphics]::FromImage($frame)
	try {
		$graphics.Clear([System.Drawing.Color]::FromArgb(255, 7, 10, 14))
		$graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
		$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::GammaCorrected
		$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
		$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
		$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

		if ($Size -le 48) {
			$backgroundPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
			$backgroundBrush = $null
			try {
				$backgroundPath.AddEllipse(
					-[single]($Size * 0.35),
					-[single]($Size * 0.35),
					[single]($Size * 1.7),
					[single]($Size * 1.7))
				$backgroundBrush = [System.Drawing.Drawing2D.PathGradientBrush]::new($backgroundPath)
				if ($Size -le 24) {
					$backgroundBrush.CenterColor = [System.Drawing.Color]::FromArgb(255, 82, 104, 124)
					$backgroundBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 25, 36, 47))
				} else {
					$backgroundBrush.CenterColor = [System.Drawing.Color]::FromArgb(255, 59, 78, 95)
					$backgroundBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 16, 24, 33))
				}
				$graphics.FillPath($backgroundBrush, $backgroundPath)
			}
			finally {
				if ($null -ne $backgroundBrush) { $backgroundBrush.Dispose() }
				$backgroundPath.Dispose()
			}

			$edgeInset = 1
			$availableWidth = $Size - (2 * $edgeInset)
			$availableHeight = $Size - (2 * $edgeInset)
			$scale = [Math]::Min(
				$availableWidth / [double]$SmallMasterBounds.Width,
				$availableHeight / [double]$SmallMasterBounds.Height
			)
			$targetWidth = [Math]::Max(
				1,
				[int][Math]::Round(
					$SmallMasterBounds.Width * $scale,
					[System.MidpointRounding]::AwayFromZero
				)
			)
			$targetHeight = [Math]::Max(
				1,
				[int][Math]::Round(
					$SmallMasterBounds.Height * $scale,
					[System.MidpointRounding]::AwayFromZero
				)
			)
			$targetX = [int][Math]::Floor(($Size - $targetWidth) / 2.0)
			$targetY = [int][Math]::Floor(($Size - $targetHeight) / 2.0)
			$destination = [System.Drawing.Rectangle]::new($targetX, $targetY, $targetWidth, $targetHeight)
			$graphics.DrawImage(
				$SmallMaster,
				$destination,
				$SmallMasterBounds.X,
				$SmallMasterBounds.Y,
				$SmallMasterBounds.Width,
				$SmallMasterBounds.Height,
				[System.Drawing.GraphicsUnit]::Pixel
			)

			$starCenterX = [single]($targetX + ($targetWidth * 0.425))
			$starCenterY = [single]($targetY + ($targetHeight * 0.645))
			$starRadius = [single][Math]::Max(1.5, $Size * 0.075)
			$starPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
			$starBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
			$starPen = [System.Drawing.Pen]::new(
				[System.Drawing.Color]::FromArgb(255, 61, 225, 255),
				[single][Math]::Max(0.65, $Size / 40.0))
			try {
				$starPath.AddPolygon(@(
					[System.Drawing.PointF]::new($starCenterX, $starCenterY - $starRadius),
					[System.Drawing.PointF]::new($starCenterX + $starRadius, $starCenterY),
					[System.Drawing.PointF]::new($starCenterX, $starCenterY + $starRadius),
					[System.Drawing.PointF]::new($starCenterX - $starRadius, $starCenterY)
				))
				$graphics.FillPath($starBrush, $starPath)
				$graphics.DrawPath($starPen, $starPath)
			}
			finally {
				$starPen.Dispose()
				$starBrush.Dispose()
				$starPath.Dispose()
			}
		} else {
			$destination = [System.Drawing.Rectangle]::new(0, 0, $Size, $Size)
			$graphics.DrawImage(
				$Master,
				$destination,
				$MasterBounds.X,
				$MasterBounds.Y,
				$MasterBounds.Width,
				$MasterBounds.Height,
				[System.Drawing.GraphicsUnit]::Pixel
			)
		}
	}
	finally {
		$graphics.Dispose()
	}

	if ($Size -le 48) {
		[BlackSpiritHub.IconPixelTools]::BoostLuminousPixels($frame)
	}
	return $frame
}

function New-TransparentUiFrame {
	param(
		[System.Drawing.Bitmap]$SmallMaster,
		[System.Drawing.Rectangle]$SmallMasterBounds,
		[int]$Size
	)

	$frame = [System.Drawing.Bitmap]::new(
		$Size,
		$Size,
		[System.Drawing.Imaging.PixelFormat]::Format32bppArgb
	)
	$graphics = [System.Drawing.Graphics]::FromImage($frame)
	try {
		$graphics.Clear([System.Drawing.Color]::Transparent)
		$graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
		$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::GammaCorrected
		$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
		$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
		$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

		$edgeInset = [Math]::Max(2, [int][Math]::Round($Size * 0.015))
		$availableWidth = $Size - (2 * $edgeInset)
		$availableHeight = $Size - (2 * $edgeInset)
		$scale = [Math]::Min(
			$availableWidth / [double]$SmallMasterBounds.Width,
			$availableHeight / [double]$SmallMasterBounds.Height
		)
		$targetWidth = [Math]::Max(
			1,
			[int][Math]::Round(
				$SmallMasterBounds.Width * $scale,
				[System.MidpointRounding]::AwayFromZero
			)
		)
		$targetHeight = [Math]::Max(
			1,
			[int][Math]::Round(
				$SmallMasterBounds.Height * $scale,
				[System.MidpointRounding]::AwayFromZero
			)
		)
		$targetX = [int][Math]::Floor(($Size - $targetWidth) / 2.0)
		$targetY = [int][Math]::Floor(($Size - $targetHeight) / 2.0)
		$destination = [System.Drawing.Rectangle]::new($targetX, $targetY, $targetWidth, $targetHeight)
		$graphics.DrawImage(
			$SmallMaster,
			$destination,
			$SmallMasterBounds.X,
			$SmallMasterBounds.Y,
			$SmallMasterBounds.Width,
			$SmallMasterBounds.Height,
			[System.Drawing.GraphicsUnit]::Pixel
		)
	}
	finally {
		$graphics.Dispose()
	}

	[BlackSpiritHub.IconPixelTools]::BoostLuminousPixels($frame)
	return $frame
}

function New-TrayIconFrame {
	param(
		[System.Drawing.Bitmap]$SmallMaster,
		[System.Drawing.Rectangle]$SmallMasterBounds,
		[int]$Size
	)

	# Build the tray artwork at high resolution first, then downsample it once.
	# At 16x16, styling the already-small pixels destroys the curved silhouette
	# and turns the mark into a cyan blob.
	$supersample = if ($Size -le 48) {
		8
	} elseif ($Size -le 96) {
		4
	} else {
		2
	}
	$workSize = $Size * $supersample
	$work = [System.Drawing.Bitmap]::new(
		$workSize,
		$workSize,
		[System.Drawing.Imaging.PixelFormat]::Format32bppArgb
	)
	$graphics = [System.Drawing.Graphics]::FromImage($work)
	try {
		$graphics.Clear([System.Drawing.Color]::Transparent)
		$graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
		$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
		$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
		$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
		$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

		# Use nearly every vertical pixel and widen the naturally narrow sigil
		# optically. The tiny transparent inset keeps the antialiased edge intact.
		$inset = [single](0.35 * $supersample)
		$targetHeight = [single]($workSize - (2 * $inset))
		$widen = if ($Size -le 24) {
			1.50
		} elseif ($Size -le 48) {
			1.40
		} else {
			1.20
		}
		$naturalWidth = [single](
			$SmallMasterBounds.Width *
			($targetHeight / [double]$SmallMasterBounds.Height)
		)
		$targetWidth = [single][Math]::Min(
			$workSize - (2 * $inset),
			$naturalWidth * $widen
		)
		$targetX = [single](($workSize - $targetWidth) / 2.0)
		$destination = [System.Drawing.RectangleF]::new(
			$targetX,
			$inset,
			$targetWidth,
			$targetHeight
		)
		$source = [System.Drawing.RectangleF]::new(
			[float]$SmallMasterBounds.X,
			[float]$SmallMasterBounds.Y,
			[float]$SmallMasterBounds.Width,
			[float]$SmallMasterBounds.Height
		)
		$graphics.DrawImage(
			$SmallMaster,
			$destination,
			$source,
			[System.Drawing.GraphicsUnit]::Pixel
		)
	}
	finally {
		$graphics.Dispose()
	}

	$logicalOutline = if ($Size -le 24) { $Size / 16.0 } else { 0.75 }
	$outlineRadius = [Math]::Max(
		1,
		[int][Math]::Round(
			$logicalOutline * $supersample,
			[System.MidpointRounding]::AwayFromZero
		)
	)
	[BlackSpiritHub.IconPixelTools]::StyleBoldTrayMask($work, $outlineRadius)

	# Repaint the center diamond after silhouette styling so it stays clean and
	# readable even in Windows' native 16x16 notification-area slot.
	$starCenterX = [single]($targetX + ($targetWidth * 0.425))
	$starCenterY = [single]($inset + ($targetHeight * 0.645))
	$starRadius = [single][Math]::Max(15, $workSize * 0.09)
	$starPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
	$starBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
	$starPen = [System.Drawing.Pen]::new(
		[System.Drawing.Color]::FromArgb(255, 65, 226, 255),
		[single][Math]::Max(1, $starRadius * 0.20)
	)
	$starGraphics = [System.Drawing.Graphics]::FromImage($work)
	try {
		$starGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
		$starGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
		$starGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
		$starGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
		$starPath.AddPolygon(@(
			[System.Drawing.PointF]::new($starCenterX, $starCenterY - $starRadius),
			[System.Drawing.PointF]::new($starCenterX + $starRadius, $starCenterY),
			[System.Drawing.PointF]::new($starCenterX, $starCenterY + $starRadius),
			[System.Drawing.PointF]::new($starCenterX - $starRadius, $starCenterY)
		))
		$starGraphics.FillPath($starBrush, $starPath)
		$starGraphics.DrawPath($starPen, $starPath)
	}
	finally {
		$starGraphics.Dispose()
		$starPen.Dispose()
		$starBrush.Dispose()
		$starPath.Dispose()
	}

	$frame = [System.Drawing.Bitmap]::new(
		$Size,
		$Size,
		[System.Drawing.Imaging.PixelFormat]::Format32bppArgb
	)
	$finalGraphics = [System.Drawing.Graphics]::FromImage($frame)
	try {
		$finalGraphics.Clear([System.Drawing.Color]::Transparent)
		$finalGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
		$finalGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
		$finalGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
		$finalGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
		$finalGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
		$finalGraphics.DrawImage(
			$work,
			[System.Drawing.Rectangle]::new(0, 0, $Size, $Size),
			0,
			0,
			$workSize,
			$workSize,
			[System.Drawing.GraphicsUnit]::Pixel
		)
	}
	finally {
		$finalGraphics.Dispose()
		$work.Dispose()
	}

	return $frame
}

function Write-Ico {
	param(
		[string]$Path,
		[object[]]$Frames
	)

	$directorySize = 6 + (16 * $Frames.Count)
	$offset = $directorySize
	$stream = [System.IO.File]::Open(
		$Path,
		[System.IO.FileMode]::Create,
		[System.IO.FileAccess]::Write,
		[System.IO.FileShare]::None
	)
	$writer = [System.IO.BinaryWriter]::new($stream)
	try {
		$writer.Write([UInt16]0)
		$writer.Write([UInt16]1)
		$writer.Write([UInt16]$Frames.Count)

		foreach ($frame in $Frames) {
			$dimension = if ($frame.Size -eq 256) { [byte]0 } else { [byte]$frame.Size }
			$writer.Write($dimension)
			$writer.Write($dimension)
			$writer.Write([byte]0)
			$writer.Write([byte]0)
			$writer.Write([UInt16]1)
			$writer.Write([UInt16]32)
			$writer.Write([UInt32]$frame.Bytes.Length)
			$writer.Write([UInt32]$offset)
			$offset += $frame.Bytes.Length
		}

		foreach ($frame in $Frames) {
			$writer.Write([byte[]]$frame.Bytes)
		}
	}
	finally {
		$writer.Dispose()
		$stream.Dispose()
	}
}

[System.IO.Directory]::CreateDirectory($runtimeIconDirectory) | Out-Null
$master = [System.Drawing.Bitmap]::new($resolvedMasterPath)
$smallMaster = [System.Drawing.Bitmap]::new($smallMasterPath)
$frames = [System.Collections.Generic.List[object]]::new()
$trayFrames = [System.Collections.Generic.List[object]]::new()
$uiFrame = $null
try {
	$luminousBounds = [BlackSpiritHub.IconPixelTools]::GetLuminousBounds($master)
	if ($luminousBounds.IsEmpty) {
		throw "The icon source does not contain the cyan and white sigil."
	}
	$verticalPadding = [int][Math]::Round($luminousBounds.Height * 0.025)
	$cropTop = [Math]::Max(0, $luminousBounds.Top - $verticalPadding)
	$cropBottom = [Math]::Min($master.Height, $luminousBounds.Bottom + $verticalPadding)
	$cropHeight = $cropBottom - $cropTop
	$cropWidth = [Math]::Min($master.Width, $cropHeight)
	$cropCenterX = $luminousBounds.Left + ($luminousBounds.Width / 2.0)
	$cropLeft = [int][Math]::Round($cropCenterX - ($cropWidth / 2.0))
	$cropLeft = [Math]::Max(0, [Math]::Min($master.Width - $cropWidth, $cropLeft))
	$masterBounds = [System.Drawing.Rectangle]::new($cropLeft, $cropTop, $cropWidth, $cropHeight)
	$smallMasterBounds = [BlackSpiritHub.IconPixelTools]::GetAlphaBounds($smallMaster, 0)
	if ($smallMasterBounds.IsEmpty) {
		throw "The small-size icon master does not contain visible pixels."
	}

	foreach ($size in $iconSizes) {
		$bitmap = New-IconFrame `
			-Master $master `
			-MasterBounds $masterBounds `
			-SmallMaster $smallMaster `
			-SmallMasterBounds $smallMasterBounds `
			-Size $size
		$bytes = [BlackSpiritHub.IconPixelTools]::ToIconDib($bitmap)

		$visibleBounds = [BlackSpiritHub.IconPixelTools]::GetLuminousBounds($bitmap)
		$frames.Add([pscustomobject]@{
			Size = $size
			Bytes = $bytes
			Bitmap = $bitmap
			Bounds = $visibleBounds
		})

		$trayBitmap = New-TrayIconFrame `
			-SmallMaster $smallMaster `
			-SmallMasterBounds $smallMasterBounds `
			-Size $size
		$trayBytes = [BlackSpiritHub.IconPixelTools]::ToIconDib($trayBitmap)
		$trayVisibleBounds = [BlackSpiritHub.IconPixelTools]::GetLuminousBounds($trayBitmap)
		$trayFrames.Add([pscustomobject]@{
			Size = $size
			Bytes = $trayBytes
			Bitmap = $trayBitmap
			Bounds = $trayVisibleBounds
		})
	}

	Write-Ico -Path $appIconPath -Frames $frames.ToArray()
	Write-Ico -Path $runtimeTrayIcoPath -Frames $trayFrames.ToArray()
	[System.IO.File]::Copy($appIconPath, $runtimeIcoPath, $true)
	[System.IO.File]::Copy($appIconPath, $installerIconPath, $true)

	$largeFrame = $frames | Where-Object Size -eq 256 | Select-Object -First 1
	$largeFrame.Bitmap.Save($runtimePngPath, [System.Drawing.Imaging.ImageFormat]::Png)
	$uiFrame = New-TransparentUiFrame `
		-SmallMaster $smallMaster `
		-SmallMasterBounds $smallMasterBounds `
		-Size 256
	$uiFrame.Save($runtimeUiPngPath, [System.Drawing.Imaging.ImageFormat]::Png)

	foreach ($path in @($appIconPath, $runtimeIcoPath, $installerIconPath)) {
		foreach ($size in $iconSizes) {
			$icon = [System.Drawing.Icon]::new($path, $size, $size)
			try {
				$expectedSize = [Math]::Min($size, 128)
				if ($icon.Width -ne $expectedSize -or $icon.Height -ne $expectedSize) {
					throw "Icon validation failed for ${path}: requested ${size}x${size}, loaded $($icon.Width)x$($icon.Height)."
				}
			}
			finally {
				$icon.Dispose()
			}
		}
	}
	foreach ($size in $iconSizes) {
		$icon = [System.Drawing.Icon]::new($runtimeTrayIcoPath, $size, $size)
		try {
			$expectedSize = [Math]::Min($size, 128)
			if ($icon.Width -ne $expectedSize -or $icon.Height -ne $expectedSize) {
				throw "Tray icon validation failed: requested ${size}x${size}, loaded $($icon.Width)x$($icon.Height)."
			}
		}
		finally {
			$icon.Dispose()
		}
	}

	foreach ($frame in $frames) {
		$heightCoverage = [Math]::Round(100 * $frame.Bounds.Height / [double]$frame.Size, 1)
		$widthCoverage = [Math]::Round(100 * $frame.Bounds.Width / [double]$frame.Size, 1)
		Write-Host "$($frame.Size)x$($frame.Size): sigil bounds $($frame.Bounds.Width)x$($frame.Bounds.Height) (${widthCoverage}% wide, ${heightCoverage}% tall)"
	}
	foreach ($frame in $trayFrames) {
		$heightCoverage = [Math]::Round(100 * $frame.Bounds.Height / [double]$frame.Size, 1)
		$widthCoverage = [Math]::Round(100 * $frame.Bounds.Width / [double]$frame.Size, 1)
		Write-Host "Tray $($frame.Size)x$($frame.Size): sigil bounds $($frame.Bounds.Width)x$($frame.Bounds.Height) (${widthCoverage}% wide, ${heightCoverage}% tall)"
	}
}
finally {
	foreach ($frame in $frames) {
		$frame.Bitmap.Dispose()
	}
	foreach ($frame in $trayFrames) {
		$frame.Bitmap.Dispose()
	}
	if ($null -ne $uiFrame) {
		$uiFrame.Dispose()
	}
	$master.Dispose()
	$smallMaster.Dispose()
}

Write-Host "Generated:"
Write-Host "  $appIconPath"
Write-Host "  $runtimeIcoPath"
Write-Host "  $runtimeTrayIcoPath"
Write-Host "  $runtimePngPath"
Write-Host "  $runtimeUiPngPath"
Write-Host "  $installerIconPath"
