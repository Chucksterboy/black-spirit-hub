using System;
using System.Buffers;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

/// <summary>
/// Performs bounded, entirely local recognition of the visible nine-column BDO storage grid.
/// The service never accepts a filesystem path and never persists the supplied raster.
/// </summary>
internal sealed class RecipeBookScreenshotService : IDisposable
{
	internal const int MaxEncodedCharacters = 24 * 1024 * 1024;
	internal const int MaxDecodedBytes = 16 * 1024 * 1024;
	internal const int MinWidth = 1;
	internal const int MinHeight = 1;
	internal const int MaxWidth = 7680;
	internal const int MaxHeight = 4320;
	internal const long MaxPixels = 24_000_000;
	internal const int ExpectedColumns = 9;

	private const int MaximumReturnedCandidates = 5;
	private const int MaximumReturnedSlots = 192;
	private const int MinimumDetectedSlotExtent = 12;
	private const int MaximumDetectedSlotExtent = 512;
	private const int MinimumBorderGradeExtent = 24;
	private const int BorderGradeDriftTolerance = 2;
	private const double MaximumTightSingleSlotAspectRatio = 2.75;
	private const int MaximumGridFallbackDimension = 4096;
	private const long MaximumGridFallbackPixels = 12_000_000;
	private const int HorizontalEdgeThreshold = 22;
	private const double MinimumOccupiedRatio = 0.025;
	private const double MinimumCandidateScore = 0.28;
	private static readonly double[] GridUpscaleFactors = { 8, 6, 4, 3, 2, 1.5 };
	private static readonly double[] GridDownscaleFactors = { 0.75, 0.5, 0.375, 0.25, 0.125, 0.0625 };
	private static readonly Regex QuantityPattern = new(
		"^(?:(?<grouped>[0-9]{1,3}(?:,[0-9]{3})+)|(?<whole>[0-9]{1,5})|(?<number>[0-9]{1,3}[.,][0-9])(?<suffix>[KM]))$",
		RegexOptions.Compiled | RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

	private readonly string ocrAssetRoot;
	private readonly SemaphoreSlim analysisGate = new(1, 1);
	private readonly Lazy<IconAtlas> iconAtlas;
	private readonly Lazy<PpOcrv5QuantityRecognizer> quantityRecognizer;
	private bool disposed;

	internal RecipeBookScreenshotService(string applicationBaseDirectory)
	{
		if (string.IsNullOrWhiteSpace(applicationBaseDirectory))
		{
			throw new ArgumentException("The application directory is required.", nameof(applicationBaseDirectory));
		}

		string resolvedApplicationDirectory = Path.GetFullPath(applicationBaseDirectory);
		ocrAssetRoot = Path.Combine(resolvedApplicationDirectory, "Assets", "RecipeBook", "ocr");
		iconAtlas = new Lazy<IconAtlas>(LoadIconAtlas, LazyThreadSafetyMode.ExecutionAndPublication);
		quantityRecognizer = new Lazy<PpOcrv5QuantityRecognizer>(
			() => new PpOcrv5QuantityRecognizer(resolvedApplicationDirectory),
			LazyThreadSafetyMode.ExecutionAndPublication);
	}

	internal async Task<RecipeBookScreenshotResult> AnalyzeAsync(
		RecipeBookScreenshotRequest request,
		CancellationToken cancellationToken)
	{
		ObjectDisposedException.ThrowIf(disposed, this);
		ArgumentNullException.ThrowIfNull(request);
		await analysisGate.WaitAsync(cancellationToken).ConfigureAwait(false);
		try
		{
			return await Task.Run(() => Analyze(request, cancellationToken), cancellationToken).ConfigureAwait(false);
		}
		finally
		{
			analysisGate.Release();
		}
	}

	internal static RecipeBookScreenshotRequest ParsePayload(JsonElement payload)
	{
		if (payload.ValueKind != JsonValueKind.Object)
		{
			throw new InvalidDataException("The screenshot request must be an object.");
		}

		HashSet<string> names = new(StringComparer.Ordinal);
		foreach (JsonProperty property in payload.EnumerateObject())
		{
			if (!names.Add(property.Name)
				|| property.Name is not ("fileName" or "mimeType" or "dataBase64"))
			{
				throw new InvalidDataException("The screenshot request contains an unexpected or duplicate field.");
			}
		}

		if (names.Count != 3)
		{
			throw new InvalidDataException("The screenshot request requires fileName, mimeType, and dataBase64.");
		}

		string fileName = ReadRequiredString(payload, "fileName");
		string mimeType = ReadRequiredString(payload, "mimeType").ToLowerInvariant();
		string dataBase64 = ReadRequiredString(payload, "dataBase64");
		if (fileName.Length > 255
			|| fileName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0
			|| fileName.Contains('/')
			|| fileName.Contains('\\')
			|| !string.Equals(Path.GetFileName(fileName), fileName, StringComparison.Ordinal))
		{
			throw new InvalidDataException("The screenshot filename is invalid.");
		}

		string extension = Path.GetExtension(fileName);
		bool extensionMatches = mimeType switch
		{
			"image/png" => string.Equals(extension, ".png", StringComparison.OrdinalIgnoreCase),
			"image/jpeg" => string.Equals(extension, ".jpg", StringComparison.OrdinalIgnoreCase)
				|| string.Equals(extension, ".jpeg", StringComparison.OrdinalIgnoreCase),
			"image/bmp" => string.Equals(extension, ".bmp", StringComparison.OrdinalIgnoreCase),
			_ => false
		};
		if (!extensionMatches)
		{
			throw new InvalidDataException("Only PNG, JPEG, and BMP screenshots with a matching filename are supported.");
		}

		ValidateBase64Shape(dataBase64);
		return new RecipeBookScreenshotRequest(fileName, mimeType, dataBase64);
	}

	private RecipeBookScreenshotResult Analyze(
		RecipeBookScreenshotRequest request,
		CancellationToken cancellationToken)
	{
		cancellationToken.ThrowIfCancellationRequested();
		byte[] bytes = DecodeBase64(request.DataBase64);
		try
		{
			(string rasterKind, int headerWidth, int headerHeight) = ReadRasterHeader(bytes);
			string expectedKind = request.MimeType switch
			{
				"image/png" => "png",
				"image/jpeg" => "jpeg",
				"image/bmp" => "bmp",
				_ => throw new InvalidDataException("The screenshot image type is unsupported.")
			};
			if (!string.Equals(rasterKind, expectedKind, StringComparison.Ordinal))
			{
				throw new InvalidDataException("The screenshot bytes do not match the declared image type.");
			}
			ValidateDimensions(headerWidth, headerHeight);

			string fingerprint = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
			using Bitmap screenshot = DecodeBitmap(bytes, headerWidth, headerHeight);
			cancellationToken.ThrowIfCancellationRequested();

			DetectedGrid? detectedGrid = DetectGrid(screenshot, cancellationToken);
			if (detectedGrid is null)
			{
				return new RecipeBookScreenshotResult(
					fingerprint,
					screenshot.Width,
					screenshot.Height,
					new RecipeBookScreenshotGrid(ExpectedColumns, 0, 0),
					Array.Empty<RecipeBookScreenshotSlot>(),
					new[] { "No complete BDO storage slot could be detected. Include at least one item slot or crop tightly around a single item and try again." });
			}

			IconAtlas atlas = iconAtlas.Value;
			int maximumReturnedRows = Math.Max(1, (MaximumReturnedSlots + detectedGrid.Columns - 1) / detectedGrid.Columns);
			IReadOnlyList<int> cappedRowTops = detectedGrid.RowTops.Take(maximumReturnedRows).ToArray();
			List<RecipeBookScreenshotSlot> slots = new();
			List<PendingRecognizedSlot> pendingSlots = new();
			List<string> warnings = new();
			if (detectedGrid.AssumedTightCrop)
			{
				warnings.Add("A tight single-item crop was analyzed without a complete slot border. Confirm both the material and quantity before importing it.");
			}
			if (detectedGrid.RowTops.Count > cappedRowTops.Count)
			{
				warnings.Add("Only the first 192 visible storage slots were analyzed. Import another screenshot for the remaining rows.");
			}
			int lowConfidenceIcons = 0;

			for (int row = 0; row < cappedRowTops.Count; row++)
			{
				int y = cappedRowTops[row];
				for (int column = 0; column < detectedGrid.Columns; column++)
				{
					if (row * detectedGrid.Columns + column >= MaximumReturnedSlots)
					{
						break;
					}
					cancellationToken.ThrowIfCancellationRequested();
					Rectangle box = new(
						detectedGrid.Left + column * detectedGrid.Pitch,
						y,
						detectedGrid.CellWidth,
						detectedGrid.CellHeight);
					box.Intersect(new Rectangle(0, 0, screenshot.Width, screenshot.Height));
					if (box.Width < detectedGrid.CellWidth - 2 || box.Height < detectedGrid.CellHeight - 2)
					{
						continue;
					}

					SlotFeature feature = ExtractSlotFeature(screenshot, box, atlas.TileSize, atlas.ComparedRows);
					if (!feature.Occupied)
					{
						continue;
					}

					List<RecipeBookScreenshotIconCandidate> iconCandidates = MatchIcons(feature, atlas);
					if (iconCandidates.Count == 0 || iconCandidates[0].Score < MinimumCandidateScore)
					{
						iconCandidates.Clear();
						lowConfidenceIcons++;
					}

					pendingSlots.Add(new PendingRecognizedSlot(
						$"r{row + 1}c{column + 1}",
						row,
						column,
						box,
						iconCandidates));
				}
			}

			IReadOnlyList<PpOcrv5QuantityRecognition> quantityRecognitions =
				quantityRecognizer.Value.Recognize(
					screenshot,
					pendingSlots.Select(slot => slot.Box).ToArray(),
					cancellationToken);
			if (quantityRecognitions.Count != pendingSlots.Count)
			{
				throw new InvalidDataException("The local quantity recognizer returned an inconsistent slot count.");
			}
			for (int index = 0; index < pendingSlots.Count; index++)
			{
				PendingRecognizedSlot pending = pendingSlots[index];
				PpOcrv5QuantityRecognition recognized = quantityRecognitions[index];
				if (recognized.SourceBounds != pending.Box)
				{
					throw new InvalidDataException("The local quantity recognizer changed the detected slot order.");
				}
				QuantityRecognition quantity = MapQuantityRecognition(screenshot, pending.Box, recognized);
				BorderGradeRecognition borderGrade = DetectBorderGrade(
					screenshot,
					pending.Box,
					detectedGrid.AssumedTightCrop);
				slots.Add(new RecipeBookScreenshotSlot(
					pending.Id,
					pending.Row,
					pending.Column,
					new RecipeBookScreenshotBox(pending.Box.X, pending.Box.Y, pending.Box.Width, pending.Box.Height),
					pending.IconCandidates,
					borderGrade.Grade,
					borderGrade.Confidence,
					quantity.Text,
					quantity.Value,
					quantity.Approximate,
					quantity.Confidence,
					quantity.AssumedOne));
			}

			if (lowConfidenceIcons > 0)
			{
				warnings.Add($"{lowConfidenceIcons} occupied slot(s) did not match the bundled Recipe Book icon catalog confidently and require manual review.");
			}
			if (slots.Any(slot => slot.QuantityApproximate))
			{
				warnings.Add("Amounts abbreviated by BDO with K or M are approximate and should be confirmed before import.");
			}
			if (slots.Count == 0)
			{
				warnings.Add("The grid was detected, but no occupied material slots were recognized.");
			}

			return new RecipeBookScreenshotResult(
				fingerprint,
				screenshot.Width,
				screenshot.Height,
				new RecipeBookScreenshotGrid(detectedGrid.Columns, cappedRowTops.Count, detectedGrid.Confidence),
				slots,
				warnings);
		}
		finally
		{
			CryptographicOperations.ZeroMemory(bytes);
		}
	}

	internal static DetectedGrid? DetectGrid(Bitmap screenshot, CancellationToken cancellationToken)
	{
		ArgumentNullException.ThrowIfNull(screenshot);
		DetectedGrid? native = DetectGridAtNativeScale(screenshot, cancellationToken);
		if (native is not null && !native.AssumedTightCrop)
		{
			return native;
		}

		// Preserve the original pixels as the primary path. Rescaling is a bounded
		// recovery pass for thumbnails whose slot edges fall below the native 12 px
		// threshold and unusually large crops whose one slot exceeds 512 px.
		IEnumerable<double> scaleFactors = Math.Min(screenshot.Width, screenshot.Height) > MaximumDetectedSlotExtent
			? GridDownscaleFactors.Concat(GridUpscaleFactors)
			: GridUpscaleFactors.Concat(GridDownscaleFactors);
		DetectedGrid? scaledTightCrop = null;
		HashSet<(int Width, int Height)> attemptedSizes = new();
		foreach (double scaleFactor in scaleFactors)
		{
			cancellationToken.ThrowIfCancellationRequested();
			if (!TryGetGridFallbackSize(screenshot.Size, scaleFactor, out Size scaledSize)
				|| !attemptedSizes.Add((scaledSize.Width, scaledSize.Height)))
			{
				continue;
			}

			using Bitmap scaled = ResizeForGridDetection(screenshot, scaledSize, scaleFactor);
			DetectedGrid? detected = DetectGridAtNativeScale(scaled, cancellationToken);
			DetectedGrid? mapped = detected is null
				? null
				: MapDetectedGridToOriginal(detected, scaledSize, screenshot.Size);
			if (mapped is null)
			{
				continue;
			}

			if (!mapped.AssumedTightCrop
				&& (native is null || mapped.Columns > 1 || mapped.RowTops.Count > 1))
			{
				return mapped;
			}
			if (native is null && mapped.AssumedTightCrop && scaledTightCrop is null)
			{
				scaledTightCrop = mapped;
			}
		}
		return native ?? scaledTightCrop;
	}

	private static DetectedGrid? DetectGridAtNativeScale(Bitmap screenshot, CancellationToken cancellationToken)
	{
		ArgumentNullException.ThrowIfNull(screenshot);
		byte[] grayscale = CopyGrayscale(screenshot);
		int width = screenshot.Width;
		int height = screenshot.Height;
		List<GridLineCandidate> candidates = new();

		for (int y = 1; y < height; y++)
		{
			if ((y & 31) == 0)
			{
				cancellationToken.ThrowIfCancellationRequested();
			}

			List<HorizontalSegment> segments = FindHorizontalEdgeSegments(grayscale, width, y);
			GridLineCandidate? best = FindBestGridLine(y, segments);
			if (best is not null)
			{
				candidates.Add(best);
			}
		}

		if (candidates.Count < 2)
		{
			return DetectTightSingleSlot(screenshot);
		}

		GridLineCandidate seed = candidates
			.Select(candidate => new
			{
				Candidate = candidate,
				Support = candidates.Count(other => HasMatchingGridGeometry(candidate, other))
			})
			.OrderByDescending(value => value.Support * value.Candidate.Matches)
			.ThenByDescending(value => value.Candidate.Matches)
			.ThenByDescending(value => value.Support)
			.Select(value => value.Candidate)
			.First();

		List<GridLineCandidate> dominant = candidates
			.Where(candidate => HasMatchingGridGeometry(seed, candidate))
			.ToList();
		List<EdgeCluster> clusters = ClusterEdges(dominant);
		if (clusters.Count < 2)
		{
			return DetectTightSingleSlot(screenshot);
		}

		int columns = Math.Clamp(dominant.Max(candidate => candidate.Matches), 1, ExpectedColumns);
		int left = dominant.Min(candidate => candidate.Left);
		int pitch = (int)Math.Round(dominant.Average(candidate => candidate.Pitch));
		int cellWidth = dominant.Select(candidate => candidate.CellWidth).Order().ElementAt(dominant.Count / 2);
		cellWidth = Math.Max(cellWidth, (int)Math.Round(pitch * 0.89));
		cellWidth = Math.Clamp(cellWidth, (int)Math.Round(pitch * 0.68), pitch - 2);

		List<int> topCandidates = new();
		foreach (EdgeCluster cluster in clusters)
		{
			EdgeCluster? bottom = clusters.FirstOrDefault(other =>
				other.Y > cluster.Y
				&& Math.Abs((other.Y - cluster.Y) - cellWidth) <= Math.Max(5, pitch / 12));
			if (bottom is not null)
			{
				topCandidates.Add(cluster.Y);
			}
		}

		if (topCandidates.Count < 1)
		{
			return DetectTightSingleSlot(screenshot);
		}

		List<int> bestPhase = new();
		foreach (int phase in topCandidates)
		{
			List<int> aligned = topCandidates
				.Where(y => DistanceToPitchPhase(y - phase, pitch) <= Math.Max(4, pitch / 14))
				.Order()
				.ToList();
			if (aligned.Count > bestPhase.Count)
			{
				bestPhase = aligned;
			}
		}

		if (bestPhase.Count < 1)
		{
			return DetectTightSingleSlot(screenshot);
		}

		int first = bestPhase[0];
		List<int> rowTops = new();
		int maximumRow = (height - first - cellWidth) / Math.Max(1, pitch);
		for (int index = 0; index <= maximumRow; index++)
		{
			int expected = first + index * pitch;
			int? actual = topCandidates
				.Where(y => Math.Abs(y - expected) <= Math.Max(5, pitch / 12))
				.Select(y => (int?)y)
				.OrderBy(y => Math.Abs(y!.Value - expected))
				.FirstOrDefault();
			if (actual is null)
			{
				break;
			}
			rowTops.Add(actual.Value);
		}

		if (rowTops.Count < 1)
		{
			return DetectTightSingleSlot(screenshot);
		}

		int cellHeight = Math.Min(pitch - 1, cellWidth);

		int strongestSampleCount = Math.Max(1, (int)Math.Ceiling(dominant.Count / 3.0));
		double columnConfidence = Math.Clamp(
			dominant.OrderByDescending(candidate => candidate.Matches)
				.Take(strongestSampleCount)
				.Average(candidate => Math.Min(columns, candidate.Matches)) / columns,
			0,
			1);
		double rowConfidence = Math.Clamp(rowTops.Count / 4.0, 0.55, 1);
		double confidence = Math.Round(columnConfidence * 0.72 + rowConfidence * 0.28, 3);
		return new DetectedGrid(columns, left, pitch, cellWidth, cellHeight, rowTops, confidence, false);
	}

	private static bool TryGetGridFallbackSize(Size original, double scaleFactor, out Size scaled)
	{
		scaled = Size.Empty;
		if (!double.IsFinite(scaleFactor) || scaleFactor <= 0 || scaleFactor == 1)
		{
			return false;
		}
		int width = Math.Max(1, (int)Math.Round(original.Width * scaleFactor));
		int height = Math.Max(1, (int)Math.Round(original.Height * scaleFactor));
		long pixels = (long)width * height;
		if ((width == original.Width && height == original.Height)
			|| width > MaximumGridFallbackDimension
			|| height > MaximumGridFallbackDimension
			|| pixels > MaximumGridFallbackPixels)
		{
			return false;
		}
		scaled = new Size(width, height);
		return true;
	}

	private static Bitmap ResizeForGridDetection(Bitmap screenshot, Size scaledSize, double scaleFactor)
	{
		Bitmap scaled = new(scaledSize.Width, scaledSize.Height, PixelFormat.Format32bppArgb);
		using Graphics graphics = Graphics.FromImage(scaled);
		graphics.CompositingMode = CompositingMode.SourceCopy;
		graphics.CompositingQuality = CompositingQuality.HighSpeed;
		graphics.InterpolationMode = scaleFactor > 1
			? InterpolationMode.NearestNeighbor
			: InterpolationMode.HighQualityBicubic;
		graphics.PixelOffsetMode = PixelOffsetMode.Half;
		graphics.SmoothingMode = SmoothingMode.None;
		graphics.DrawImage(
			screenshot,
			new Rectangle(Point.Empty, scaledSize),
			0,
			0,
			screenshot.Width,
			screenshot.Height,
			GraphicsUnit.Pixel);
		return scaled;
	}

	private static DetectedGrid? MapDetectedGridToOriginal(DetectedGrid grid, Size scaledSize, Size originalSize)
	{
		if (scaledSize.Width < 1 || scaledSize.Height < 1 || originalSize.Width < 1 || originalSize.Height < 1)
		{
			return null;
		}
		int MapX(int value) => (int)Math.Round((double)value * originalSize.Width / scaledSize.Width);
		int MapY(int value) => (int)Math.Round((double)value * originalSize.Height / scaledSize.Height);
		int left = Math.Clamp(MapX(grid.Left), 0, originalSize.Width - 1);
		int pitch = Math.Max(1, MapX(grid.Pitch));
		long lastColumnLeft = (long)left + (long)(grid.Columns - 1) * pitch;
		if (grid.Columns < 1 || lastColumnLeft >= originalSize.Width)
		{
			return null;
		}
		int cellWidth = Math.Clamp(
			Math.Max(1, MapX(grid.CellWidth)),
			1,
			Math.Min(pitch, originalSize.Width - (int)lastColumnLeft));
		List<int> rowTops = grid.RowTops
			.Select(MapY)
			.Select(top => Math.Clamp(top, 0, originalSize.Height - 1))
			.Distinct()
			.Order()
			.ToList();
		if (rowTops.Count < 1)
		{
			return null;
		}
		int maximumCellHeight = rowTops.Min(top => originalSize.Height - top);
		int cellHeight = Math.Clamp(Math.Max(1, MapY(grid.CellHeight)), 1, maximumCellHeight);
		return new DetectedGrid(
			grid.Columns,
			left,
			pitch,
			cellWidth,
			cellHeight,
			rowTops,
			Math.Round(Math.Clamp(grid.Confidence * 0.94, 0, 1), 3),
			grid.AssumedTightCrop);
	}

	private static bool HasMatchingGridGeometry(GridLineCandidate left, GridLineCandidate right)
	{
		int leftTolerance = Math.Max(3, Math.Min(left.CellWidth, right.CellWidth) / 10);
		int pitchTolerance = Math.Max(2, (int)Math.Round(Math.Min(left.Pitch, right.Pitch) * 0.04));
		return Math.Abs(left.Left - right.Left) <= leftTolerance
			&& Math.Abs(left.Pitch - right.Pitch) <= pitchTolerance;
	}

	private static DetectedGrid? DetectTightSingleSlot(Bitmap screenshot)
	{
		int shorter = Math.Min(screenshot.Width, screenshot.Height);
		int longer = Math.Max(screenshot.Width, screenshot.Height);
		if (shorter < MinimumDetectedSlotExtent
			|| shorter > MaximumDetectedSlotExtent
			|| longer > shorter * MaximumTightSingleSlotAspectRatio)
		{
			return null;
		}

		int left = (screenshot.Width - shorter) / 2;
		int top = (screenshot.Height - shorter) / 2;
		int pitch = Math.Max(shorter + 2, (int)Math.Round(shorter * 1.12));
		return new DetectedGrid(1, left, pitch, shorter, shorter, new[] { top }, 0.35, true);
	}

	private static List<HorizontalSegment> FindHorizontalEdgeSegments(byte[] grayscale, int width, int y)
	{
		List<HorizontalSegment> segments = new();
		int current = y * width;
		int previous = current - width;
		int runStart = -1;
		for (int x = 0; x < width; x++)
		{
			bool edge = Math.Abs(grayscale[current + x] - grayscale[previous + x]) >= HorizontalEdgeThreshold;
			if (edge && runStart < 0)
			{
				runStart = x;
			}
			else if (!edge && runStart >= 0)
			{
				int length = x - runStart;
				if (length is >= MinimumDetectedSlotExtent and <= MaximumDetectedSlotExtent)
				{
					segments.Add(new HorizontalSegment(runStart, length));
				}
				runStart = -1;
			}
		}

		if (runStart >= 0)
		{
			int length = width - runStart;
			if (length is >= MinimumDetectedSlotExtent and <= MaximumDetectedSlotExtent)
			{
				segments.Add(new HorizontalSegment(runStart, length));
			}
		}
		return segments;
	}

	private static GridLineCandidate? FindBestGridLine(int y, IReadOnlyList<HorizontalSegment> segments)
	{
		GridLineCandidate? best = null;
		for (int firstIndex = 0; firstIndex < segments.Count; firstIndex++)
		{
			for (int secondIndex = firstIndex + 1; secondIndex < Math.Min(firstIndex + 5, segments.Count); secondIndex++)
			{
				int pitch = segments[secondIndex].Start - segments[firstIndex].Start;
				if (pitch < MinimumDetectedSlotExtent + 2
					|| pitch > (int)Math.Round(MaximumDetectedSlotExtent * 1.18))
				{
					continue;
				}

				int tolerance = Math.Max(3, (int)Math.Round(pitch * 0.06));
				List<HorizontalSegment> matches = new();
				for (int column = 0; column < ExpectedColumns; column++)
				{
					int expected = segments[firstIndex].Start + column * pitch;
					HorizontalSegment? match = segments
						.Where(segment => Math.Abs(segment.Start - expected) <= tolerance
							&& segment.Length >= pitch * 0.55
							&& segment.Length <= pitch * 1.02)
						.OrderBy(segment => Math.Abs(segment.Start - expected))
						.FirstOrDefault();
					if (match is not null)
					{
						matches.Add(match);
					}
					else
					{
						break;
					}
				}

				if (matches.Count < 2)
				{
					continue;
				}
				int medianWidth = matches.Select(segment => segment.Length).Order().ElementAt(matches.Count / 2);
				GridLineCandidate candidate = new(y, segments[firstIndex].Start, pitch, medianWidth, matches.Count);
				if (best is null
					|| candidate.Matches > best.Matches
					|| candidate.Matches == best.Matches && candidate.CellWidth > best.CellWidth)
				{
					best = candidate;
				}
			}
		}
		if (best is not null)
		{
			return best;
		}

		HorizontalSegment? single = segments
			.Where(segment => segment.Length is >= MinimumDetectedSlotExtent and <= MaximumDetectedSlotExtent)
			.OrderByDescending(segment => segment.Length)
			.FirstOrDefault();
		if (single is null)
		{
			return null;
		}
		int inferredPitch = Math.Max(single.Length + 2, (int)Math.Round(single.Length * 1.12));
		return new GridLineCandidate(y, single.Start, inferredPitch, single.Length, 1);
	}

	private static List<EdgeCluster> ClusterEdges(IReadOnlyList<GridLineCandidate> candidates)
	{
		List<EdgeCluster> result = new();
		foreach (IGrouping<int, GridLineCandidate> group in candidates
			.OrderBy(candidate => candidate.Y)
			.GroupBy(candidate => candidate.Y / 5))
		{
			List<GridLineCandidate> values = group.ToList();
			result.Add(new EdgeCluster(values.Min(value => value.Y), values.Count));
		}

		// A thick anti-aliased edge can straddle a five-pixel bucket boundary.
		for (int index = result.Count - 1; index > 0; index--)
		{
			if (result[index].Y - result[index - 1].Y <= 4)
			{
				result[index - 1] = new EdgeCluster(
					Math.Min(result[index - 1].Y, result[index].Y),
					result[index - 1].Support + result[index].Support);
				result.RemoveAt(index);
			}
		}
		return result;
	}

	private static int DistanceToPitchPhase(int value, int pitch)
	{
		int remainder = Math.Abs(value) % pitch;
		return Math.Min(remainder, pitch - remainder);
	}

	private IconAtlas LoadIconAtlas()
	{
		string indexPath = Path.Combine(ocrAssetRoot, "icon-index.json");
		string atlasPath = Path.Combine(ocrAssetRoot, "icon-atlas.png");
		if (!File.Exists(indexPath) || !File.Exists(atlasPath))
		{
			throw new InvalidDataException("The local Recipe Book screenshot icon catalog is missing.");
		}

		using FileStream indexStream = new(indexPath, FileMode.Open, FileAccess.Read, FileShare.Read);
		IconAtlasIndex index = JsonSerializer.Deserialize<IconAtlasIndex>(indexStream, new JsonSerializerOptions
		{
			PropertyNameCaseInsensitive = true
		}) ?? throw new InvalidDataException("The local Recipe Book screenshot icon index is invalid.");
		if (index.SchemaVersion != 1
			|| index.TileSize is < 12 or > 48
			|| index.Columns is < 1 or > 256
			|| index.Background is null
			|| index.Background.Length != 3
			|| index.Icons is null
			|| index.Icons.Count == 0
			|| index.Icons.Count > 5000)
		{
			throw new InvalidDataException("The local Recipe Book screenshot icon index has unsupported metadata.");
		}

		using Image rawAtlas = Image.FromFile(atlasPath, useEmbeddedColorManagement: false);
		using Bitmap atlasBitmap = new(rawAtlas);
		int requiredRows = (index.Icons.Count + index.Columns - 1) / index.Columns;
		if (atlasBitmap.Width != index.Columns * index.TileSize
			|| atlasBitmap.Height != requiredRows * index.TileSize)
		{
			throw new InvalidDataException("The local Recipe Book screenshot atlas dimensions do not match its index.");
		}

		List<IconTemplate> templates = new(index.Icons.Count);
		HashSet<string> uniqueIcons = new(StringComparer.Ordinal);
		HashSet<int> uniqueIndexes = new();
		foreach (IconAtlasEntry entry in index.Icons.OrderBy(entry => entry.Index))
		{
			if (entry.Index < 0
				|| entry.Index >= index.Icons.Count
				|| string.IsNullOrWhiteSpace(entry.Icon)
					|| (!(entry.Icon.StartsWith("icons/items/", StringComparison.Ordinal)
						&& entry.Icon.EndsWith(".webp", StringComparison.Ordinal))
						&& !string.Equals(entry.Icon, "icons/item-fallback.svg", StringComparison.Ordinal))
				|| entry.Icon.Contains("..", StringComparison.Ordinal)
				|| !uniqueIcons.Add(entry.Icon)
				|| !uniqueIndexes.Add(entry.Index))
			{
				throw new InvalidDataException("The local Recipe Book screenshot icon index contains an invalid entry.");
			}

			int tileX = entry.Index % index.Columns * index.TileSize;
			int tileY = entry.Index / index.Columns * index.TileSize;
			byte[] pixels = CopyRgbTile(atlasBitmap, new Rectangle(tileX, tileY, index.TileSize, index.TileSize));
			templates.Add(new IconTemplate(entry.Icon, pixels));
		}

		return new IconAtlas(index.TileSize, Math.Min(14, index.TileSize), index.Background, templates);
	}

	private static SlotFeature ExtractSlotFeature(
		Bitmap screenshot,
		Rectangle box,
		int tileSize,
		int comparedRows)
	{
		Rectangle inner = Rectangle.Inflate(box, -2, -2);
		using Bitmap normalized = new(tileSize, tileSize, PixelFormat.Format24bppRgb);
		using (Graphics graphics = Graphics.FromImage(normalized))
		{
			graphics.CompositingMode = CompositingMode.SourceCopy;
			graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
			graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
			graphics.DrawImage(screenshot, new Rectangle(0, 0, tileSize, tileSize), inner, GraphicsUnit.Pixel);
		}

		byte[] rgb = CopyRgbTile(normalized, new Rectangle(0, 0, tileSize, tileSize));
		List<int> cornerLuminance = new();
		for (int y = 0; y < Math.Min(4, comparedRows); y++)
		{
			for (int x = 0; x < tileSize; x++)
			{
				if (x < 3 || x >= tileSize - 3)
				{
					int offset = (y * tileSize + x) * 3;
					cornerLuminance.Add((rgb[offset] * 30 + rgb[offset + 1] * 59 + rgb[offset + 2] * 11) / 100);
				}
			}
		}
		cornerLuminance.Sort();
		int backgroundLuminance = cornerLuminance.Count == 0 ? 25 : cornerLuminance[cornerLuminance.Count / 2];

		int foreground = 0;
		double sum = 0;
		double sumSquares = 0;
		int samples = 0;
		for (int y = 1; y < comparedRows; y++)
		{
			for (int x = 1; x < tileSize - 1; x++)
			{
				int offset = (y * tileSize + x) * 3;
				int red = rgb[offset];
				int green = rgb[offset + 1];
				int blue = rgb[offset + 2];
				int luminance = (red * 30 + green * 59 + blue * 11) / 100;
				int saturation = Math.Max(red, Math.Max(green, blue)) - Math.Min(red, Math.Min(green, blue));
				if (Math.Abs(luminance - backgroundLuminance) >= 18 || saturation >= 32)
				{
					foreground++;
				}
				sum += luminance;
				sumSquares += luminance * luminance;
				samples++;
			}
		}
		double variance = samples == 0 ? 0 : Math.Max(0, sumSquares / samples - Math.Pow(sum / samples, 2));
		double occupiedRatio = samples == 0 ? 0 : (double)foreground / samples;
		bool occupied = occupiedRatio >= MinimumOccupiedRatio && Math.Sqrt(variance) >= 10;
		return new SlotFeature(rgb, backgroundLuminance, occupied);
	}

	internal static BorderGradeRecognition DetectBorderGrade(
		Bitmap screenshot,
		Rectangle box,
		bool assumedTightCrop = false)
	{
		ArgumentNullException.ThrowIfNull(screenshot);
		if (assumedTightCrop
			|| Math.Min(box.Width, box.Height) < MinimumBorderGradeExtent
			|| box.Left < 0
			|| box.Top < 0
			|| box.Right > screenshot.Width
			|| box.Bottom > screenshot.Height)
		{
			return BorderGradeRecognition.Unknown;
		}

		BorderLineEvidence top = ReadBorderLineEvidence(screenshot, box, BorderEdge.Top);
		BorderLineEvidence left = ReadBorderLineEvidence(screenshot, box, BorderEdge.Left);
		BorderLineEvidence right = ReadBorderLineEvidence(screenshot, box, BorderEdge.Right);
		BorderLineEvidence[] evidence = [top, left, right];
		if (evidence.Any(item => item.Palette == BorderPalette.Other))
		{
			return BorderGradeRecognition.Unknown;
		}

		BorderLineEvidence[] classified = evidence
			.Where(item => item.Palette is BorderPalette.Base or BorderPalette.Green or BorderPalette.Blue)
			.ToArray();
		if (classified.Length == 1
			&& top.Palette == BorderPalette.Base
			&& top.SupportingLines >= 2)
		{
			double repeatedTopConfidence = Math.Min(top.Confidence, top.SupportFloor) * 0.8;
			if (repeatedTopConfidence >= 0.58)
			{
				return new BorderGradeRecognition(
					0,
					Math.Round(Math.Clamp(repeatedTopConfidence, 0, 1), 3));
			}
		}
		if (classified.Length < 2)
		{
			return BorderGradeRecognition.Unknown;
		}

		BorderPalette gradePalette = classified[0].Palette;
		if (classified.Any(item => item.Palette != gradePalette))
		{
			return BorderGradeRecognition.Unknown;
		}

		double weakestEvidence = classified.Min(item => item.Confidence);
		double agreementFactor = classified.Length == 3 ? 1 : 0.84;
		double confidence = Math.Clamp(weakestEvidence * agreementFactor, 0, 1);
		if (confidence < 0.58)
		{
			return BorderGradeRecognition.Unknown;
		}

		int grade = gradePalette switch
		{
			BorderPalette.Base => 0,
			BorderPalette.Green => 1,
			BorderPalette.Blue => 2,
			_ => throw new InvalidOperationException("Unexpected border grade palette.")
		};
		return new BorderGradeRecognition(grade, Math.Round(confidence, 3));
	}

	private static BorderLineEvidence ReadBorderLineEvidence(
		Bitmap screenshot,
		Rectangle box,
		BorderEdge edge)
	{
		BorderLineEvidence best = BorderLineEvidence.Unknown;
		double bestScore = 0;
		List<BorderLineEvidence> candidates = new(2 * BorderGradeDriftTolerance + 1);
		for (int offset = -BorderGradeDriftTolerance; offset <= BorderGradeDriftTolerance; offset++)
		{
			BorderLineEvidence candidate = AnalyzeBorderLine(screenshot, box, edge, offset);
			candidates.Add(candidate);
			double chromaticBonus = candidate.Palette is BorderPalette.Green or BorderPalette.Blue or BorderPalette.Other
				? 0.12
				: 0;
			double score = candidate.Confidence + chromaticBonus;
			if (score > bestScore)
			{
				best = candidate;
				bestScore = score;
			}
		}
		if (best.Palette == BorderPalette.Unknown)
		{
			return best;
		}

		BorderLineEvidence[] supporting = candidates
			.Where(candidate => candidate.Palette == best.Palette && candidate.Confidence >= 0.58)
			.ToArray();
		return best with
		{
			SupportingLines = supporting.Length,
			SupportFloor = supporting.Length == 0
				? 0
				: supporting.Min(candidate => candidate.Confidence)
		};
	}

	private static BorderLineEvidence AnalyzeBorderLine(
		Bitmap screenshot,
		Rectangle box,
		BorderEdge edge,
		int offset)
	{
		int horizontalInset = Math.Max(3, (int)Math.Round(box.Width * 0.12));
		int verticalStartInset = Math.Max(3, (int)Math.Round(box.Height * 0.12));
		int verticalEndInset = Math.Max(verticalStartInset + 8, (int)Math.Round(box.Height * 0.62));
		int start;
		int end;
		bool horizontal = edge == BorderEdge.Top;
		int fixedCoordinate;
		if (horizontal)
		{
			start = box.Left + horizontalInset;
			end = box.Right - 1 - horizontalInset;
			fixedCoordinate = box.Top + offset;
		}
		else
		{
			start = box.Top + verticalStartInset;
			end = Math.Min(box.Bottom - 1 - verticalStartInset, box.Top + verticalEndInset);
			fixedCoordinate = edge == BorderEdge.Left
				? box.Left + offset
				: box.Right - 1 + offset;
		}

		if (end - start + 1 < 10
			|| horizontal && (fixedCoordinate < 0 || fixedCoordinate >= screenshot.Height)
			|| !horizontal && (fixedCoordinate < 0 || fixedCoordinate >= screenshot.Width))
		{
			return BorderLineEvidence.Unknown;
		}

		double redSum = 0;
		double greenSum = 0;
		double blueSum = 0;
		int count = end - start + 1;
		for (int position = start; position <= end; position++)
		{
			Color color = horizontal
				? screenshot.GetPixel(position, fixedCoordinate)
				: screenshot.GetPixel(fixedCoordinate, position);
			redSum += color.R;
			greenSum += color.G;
			blueSum += color.B;
		}

		double red = redSum / count;
		double green = greenSum / count;
		double blue = blueSum / count;
		double coherentDistanceSquared = 30 * 30;
		int coherent = 0;
		for (int position = start; position <= end; position++)
		{
			Color color = horizontal
				? screenshot.GetPixel(position, fixedCoordinate)
				: screenshot.GetPixel(fixedCoordinate, position);
			double redDelta = color.R - red;
			double greenDelta = color.G - green;
			double blueDelta = color.B - blue;
			if (redDelta * redDelta + greenDelta * greenDelta + blueDelta * blueDelta
				<= coherentDistanceSquared)
			{
				coherent++;
			}
		}

		double coherence = (double)coherent / count;
		if (coherence < 0.72)
		{
			return BorderLineEvidence.Unknown;
		}

		(double hue, double saturation, double value) = ToHsv(red, green, blue);
		if (value is < 0.25 or > 0.92)
		{
			return BorderLineEvidence.Unknown;
		}

		double channelSpread = Math.Max(red, Math.Max(green, blue))
			- Math.Min(red, Math.Min(green, blue));
		if (saturation <= 0.08
			&& channelSpread <= 12
			&& value is >= 0.28 and <= 0.72)
		{
			double neutrality = Math.Clamp((0.08 - saturation) / 0.08, 0, 1);
			return new BorderLineEvidence(
				BorderPalette.Base,
				coherence * (0.78 + 0.22 * neutrality),
				1,
				coherence * (0.78 + 0.22 * neutrality));
		}

		if (saturation < 0.15)
		{
			return BorderLineEvidence.Unknown;
		}

		if (hue is >= 190 and <= 225)
		{
			return CreateChromaticEvidence(BorderPalette.Blue, hue, 207.5, 17.5, saturation, coherence);
		}
		if (hue is >= 70 and <= 105)
		{
			return CreateChromaticEvidence(BorderPalette.Green, hue, 87.5, 17.5, saturation, coherence);
		}

		// Gold, yellow, red, cyan, purple, and any other saturated border are real
		// item grades outside the base/high-quality/special contract. Preserve them
		// as an explicit veto instead of allowing a nearby neutral raster line to win.
		double saturationStrength = Math.Clamp((saturation - 0.15) / 0.35, 0, 1);
		return new BorderLineEvidence(
			BorderPalette.Other,
			coherence * (0.8 + 0.2 * saturationStrength),
			1,
			coherence * (0.8 + 0.2 * saturationStrength));
	}

	private static BorderLineEvidence CreateChromaticEvidence(
		BorderPalette palette,
		double hue,
		double hueCenter,
		double hueRadius,
		double saturation,
		double coherence)
	{
		double hueStrength = Math.Clamp(1 - Math.Abs(hue - hueCenter) / hueRadius, 0, 1);
		double saturationStrength = Math.Clamp((saturation - 0.15) / 0.35, 0, 1);
		double confidence = coherence * (0.72 + 0.16 * hueStrength + 0.12 * saturationStrength);
		return new BorderLineEvidence(palette, confidence, 1, confidence);
	}

	private static (double Hue, double Saturation, double Value) ToHsv(
		double red,
		double green,
		double blue)
	{
		double normalizedRed = red / 255;
		double normalizedGreen = green / 255;
		double normalizedBlue = blue / 255;
		double maximum = Math.Max(normalizedRed, Math.Max(normalizedGreen, normalizedBlue));
		double minimum = Math.Min(normalizedRed, Math.Min(normalizedGreen, normalizedBlue));
		double delta = maximum - minimum;
		double hue;
		if (delta <= double.Epsilon)
		{
			hue = 0;
		}
		else if (maximum == normalizedRed)
		{
			hue = 60 * (((normalizedGreen - normalizedBlue) / delta) % 6);
		}
		else if (maximum == normalizedGreen)
		{
			hue = 60 * (((normalizedBlue - normalizedRed) / delta) + 2);
		}
		else
		{
			hue = 60 * (((normalizedRed - normalizedGreen) / delta) + 4);
		}
		if (hue < 0)
		{
			hue += 360;
		}

		double saturation = maximum <= double.Epsilon ? 0 : delta / maximum;
		return (hue, saturation, maximum);
	}

	private static List<RecipeBookScreenshotIconCandidate> MatchIcons(SlotFeature feature, IconAtlas atlas)
	{
		PriorityQueue<RecipeBookScreenshotIconCandidate, double> best = new();
		foreach (IconTemplate template in atlas.Templates)
		{
			double score = CompareFeature(feature, template, atlas);
			RecipeBookScreenshotIconCandidate candidate = new(template.Icon, Math.Round(score, 4));
			best.Enqueue(candidate, score);
			if (best.Count > MaximumReturnedCandidates)
			{
				best.Dequeue();
			}
		}

		return best.UnorderedItems
			.Select(item => item.Element)
			.OrderByDescending(candidate => candidate.Score)
			.ToList();
	}

	private static double CompareFeature(SlotFeature feature, IconTemplate template, IconAtlas atlas)
	{
		double squaredError = 0;
		double weightTotal = 0;
		for (int y = 1; y < atlas.ComparedRows; y++)
		{
			for (int x = 1; x < atlas.TileSize - 1; x++)
			{
				int offset = (y * atlas.TileSize + x) * 3;
				int templateRed = template.Rgb[offset];
				int templateGreen = template.Rgb[offset + 1];
				int templateBlue = template.Rgb[offset + 2];
				int templateLuminance = (templateRed * 30 + templateGreen * 59 + templateBlue * 11) / 100;
				int screenshotRed = feature.Rgb[offset];
				int screenshotGreen = feature.Rgb[offset + 1];
				int screenshotBlue = feature.Rgb[offset + 2];
				int screenshotLuminance = (screenshotRed * 30 + screenshotGreen * 59 + screenshotBlue * 11) / 100;
				double templateForeground = Math.Clamp(Math.Abs(templateLuminance - Luminance(atlas.Background)) / 80.0, 0.08, 1);
				double screenshotForeground = Math.Clamp(Math.Abs(screenshotLuminance - feature.BackgroundLuminance) / 80.0, 0.08, 1);
				double weight = Math.Max(templateForeground, screenshotForeground);

				// Remove the respective dark slot background before comparing. This keeps the
				// score stable across BDO gamma settings and screenshot compression.
				int tr = templateRed - atlas.Background[0];
				int tg = templateGreen - atlas.Background[1];
				int tb = templateBlue - atlas.Background[2];
				int sr = screenshotRed - feature.BackgroundLuminance;
				int sg = screenshotGreen - feature.BackgroundLuminance;
				int sb = screenshotBlue - feature.BackgroundLuminance;
				double dr = tr - sr;
				double dg = tg - sg;
				double db = tb - sb;
				squaredError += weight * (dr * dr + dg * dg + db * db) / 3.0;
				weightTotal += weight;
			}
		}

		double rmse = weightTotal <= 0 ? 255 : Math.Sqrt(squaredError / weightTotal);
		return Math.Clamp(1.0 - rmse / 150.0, 0, 1);
	}

	internal static QuantityRecognition MapQuantityRecognition(
		Bitmap screenshot,
		Rectangle sourceSlot,
		PpOcrv5QuantityRecognition recognition)
	{
		PpOcrv5QuantityDecision decision = recognition.Decision;
		if (decision.Status == PpOcrv5QuantityReadStatus.Confirmed
			&& decision.ConfirmedToken is not null
			&& decision.ExactQuantity is int exactQuantity)
		{
			return new QuantityRecognition(
				decision.ConfirmedToken,
				exactQuantity,
				decision.IsRounded,
				Math.Round(Math.Clamp(decision.ConsensusMinConfidence, 0, 1), 3),
				false,
				true);
		}

		string rawText = (decision.RawBest ?? string.Empty).Trim();
		if (rawText.Length > 40)
		{
			rawText = rawText[..40];
		}
		// An empty OCR result does not prove that BDO omitted the quantity. A blurred,
		// compressed, or partially clipped visible label can also make every model view
		// return an empty string. Inspect the source pixels before assigning the special
		// assumed-one state so an unreadable visible label remains review-only.
		bool hasVisibleText = HasVisibleQuantityInk(screenshot, sourceSlot);
		if (!hasVisibleText)
		{
			return new QuantityRecognition(string.Empty, 1, false, 0.72, true, false);
		}

		if (string.IsNullOrWhiteSpace(rawText))
		{
			rawText = "Unreadable";
		}
		bool approximate = rawText.Contains('K', StringComparison.OrdinalIgnoreCase)
			|| rawText.Contains('M', StringComparison.OrdinalIgnoreCase);
		return new QuantityRecognition(
			rawText,
			null,
			approximate,
			Math.Round(Math.Clamp(decision.ConsensusMinConfidence, 0, 1), 3),
			false,
			true);
	}

	private static bool HasVisibleQuantityInk(Bitmap screenshot, Rectangle box)
	{
		int canonicalHeight = Math.Max(10, (int)Math.Round(box.Height * 0.34));
		Rectangle crop = GetQuantityCropBounds(
			box,
			screenshot.Size,
			Math.Max(box.Width, box.Height),
			box.Width,
			canonicalHeight);
		using Bitmap source = screenshot.Clone(crop, PixelFormat.Format32bppArgb);
		int[] inkByRow = new int[source.Height];
		int[] inkByColumn = new int[source.Width];
		int ink = 0;
		for (int y = 0; y < source.Height; y++)
		{
			for (int x = 0; x < source.Width; x++)
			{
				Color color = source.GetPixel(x, y);
				int luminance = (color.R * 30 + color.G * 59 + color.B * 11) / 100;
				int saturation = Math.Max(color.R, Math.Max(color.G, color.B))
					- Math.Min(color.R, Math.Min(color.G, color.B));
				if (luminance < 148 || saturation > 82)
				{
					continue;
				}
				ink++;
				inkByRow[y]++;
				inkByColumn[x]++;
			}
		}

		double inkRatio = ink / (double)checked(source.Width * source.Height);
		int textRows = inkByRow.Count(count => count >= 3);
		int textColumns = inkByColumn.Count(count => count >= 2);
		// Quantity glyphs create several intersecting horizontal and vertical strokes.
		// A bright icon edge can cross the same band as a one-pixel line (the white
		// feather fixture does this), so total bright-pixel density alone is unsafe.
		return inkRatio >= 0.012 && textRows >= 3 && textColumns >= 3;
	}

	internal static Rectangle GetQuantityCropBounds(
		Rectangle box,
		Size imageSize,
		int pitch,
		int cellWidth,
		int requestedHeight)
	{
		if (box.Width < 1
			|| box.Height < 1
			|| box.Left < 0
			|| box.Top < 0
			|| imageSize.Width < 1
			|| imageSize.Height < 1
			|| box.Right > imageSize.Width
			|| box.Bottom > imageSize.Height
			|| pitch < 1
			|| cellWidth < 1
			|| cellWidth > pitch
			|| box.Width > cellWidth
			|| requestedHeight < 1)
		{
			throw new ArgumentOutOfRangeException(nameof(box), "Quantity crop geometry must be positive and contained by the image.");
		}

		// BDO right-aligns long quantity labels and lets the leading glyphs overhang
		// the left slot border. Use the full detected gutter there, but stop at the
		// right slot border so a tight crop cannot pull in its neighbouring quantity.
		long horizontalMargin = (long)pitch - cellWidth;
		int left = (int)Math.Max(0L, (long)box.Left - horizontalMargin);
		int right = box.Right;
		int height = Math.Min(imageSize.Height, requestedHeight);
		int top = Math.Clamp(
			box.Bottom - height - 1,
			0,
			imageSize.Height - height);
		return new Rectangle(left, top, right - left, height);
	}

	internal static bool TryParseQuantity(string text, out long value, out bool approximate)
	{
		value = 0;
		approximate = false;
		Match match = QuantityPattern.Match(text ?? string.Empty);
		if (!match.Success)
		{
			return false;
		}

		string grouped = match.Groups["grouped"].Value;
		if (grouped.Length > 0)
		{
			return long.TryParse(
				grouped.Replace(",", string.Empty),
				NumberStyles.None,
				CultureInfo.InvariantCulture,
				out value) && value > 0;
		}

		string whole = match.Groups["whole"].Value;
		if (whole.Length > 0)
		{
			return long.TryParse(
				whole,
				NumberStyles.None,
				CultureInfo.InvariantCulture,
				out value) && value > 0;
		}

		string number = match.Groups["number"].Value;
		string suffix = match.Groups["suffix"].Value.ToUpperInvariant();
		if (number.Length > 0 && suffix.Length > 0)
		{
			number = number.Replace(',', '.');
			if (!decimal.TryParse(number, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out decimal parsed))
			{
				return false;
			}
			decimal multiplier = suffix == "M" ? 1_000_000m : 1_000m;
			decimal expanded = decimal.Round(parsed * multiplier, 0, MidpointRounding.AwayFromZero);
			if (expanded is <= 0 or > long.MaxValue)
			{
				return false;
			}
			value = (long)expanded;
			approximate = true;
			return true;
		}

		return false;
	}

	private static byte[] DecodeBase64(string dataBase64)
	{
		int maximumLength = dataBase64.Length / 4 * 3;
		byte[] rented = ArrayPool<byte>.Shared.Rent(maximumLength);
		try
		{
			if (!Convert.TryFromBase64String(dataBase64, rented, out int written)
				|| written == 0
				|| written > MaxDecodedBytes)
			{
				throw new InvalidDataException("The screenshot data is not valid bounded base64.");
			}
			return rented.AsSpan(0, written).ToArray();
		}
		finally
		{
			CryptographicOperations.ZeroMemory(rented);
			ArrayPool<byte>.Shared.Return(rented);
		}
	}

	private static void ValidateBase64Shape(string value)
	{
		if (value.Length is < 4 or > MaxEncodedCharacters || value.Length % 4 != 0)
		{
			throw new InvalidDataException("The screenshot data is empty or exceeds the local analyzer limit.");
		}
		int paddingStart = value.IndexOf('=');
		if (paddingStart >= 0 && (paddingStart < value.Length - 2 || value.Skip(paddingStart).Any(character => character != '=')))
		{
			throw new InvalidDataException("The screenshot base64 padding is invalid.");
		}
		foreach (char character in value.Take(paddingStart < 0 ? value.Length : paddingStart))
		{
			if (!char.IsAsciiLetterOrDigit(character) && character is not '+' and not '/')
			{
				throw new InvalidDataException("The screenshot data must be unwrapped base64.");
			}
		}
		long maximumDecoded = value.Length / 4L * 3L - (value.EndsWith("==", StringComparison.Ordinal) ? 2 : value.EndsWith('=') ? 1 : 0);
		if (maximumDecoded > MaxDecodedBytes)
		{
			throw new InvalidDataException("The decoded screenshot exceeds the local analyzer limit.");
		}
	}

	private static (string Kind, int Width, int Height) ReadRasterHeader(ReadOnlySpan<byte> bytes)
	{
		ReadOnlySpan<byte> pngSignature = stackalloc byte[] { 137, 80, 78, 71, 13, 10, 26, 10 };
		if (bytes.Length >= 24 && bytes[..8].SequenceEqual(pngSignature))
		{
			if (!bytes.Slice(12, 4).SequenceEqual("IHDR"u8) || ReadBigEndianInt32(bytes.Slice(8, 4)) != 13)
			{
				throw new InvalidDataException("The PNG screenshot header is invalid.");
			}
			if (ContainsAscii(bytes, "acTL"u8))
			{
				throw new InvalidDataException("Animated PNG screenshots are not supported.");
			}
			return ("png", ReadBigEndianInt32(bytes.Slice(16, 4)), ReadBigEndianInt32(bytes.Slice(20, 4)));
		}

		if (bytes.Length >= 4 && bytes[0] == 0xFF && bytes[1] == 0xD8)
		{
			int offset = 2;
			while (offset + 8 < bytes.Length)
			{
				if (bytes[offset] != 0xFF)
				{
					offset++;
					continue;
				}
				while (offset < bytes.Length && bytes[offset] == 0xFF)
				{
					offset++;
				}
				if (offset >= bytes.Length)
				{
					break;
				}
				byte marker = bytes[offset++];
				if (marker is 0xD8 or 0xD9 || marker is >= 0xD0 and <= 0xD7)
				{
					continue;
				}
				if (offset + 2 > bytes.Length)
				{
					break;
				}
				int segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
				if (segmentLength < 2 || offset + segmentLength > bytes.Length)
				{
					throw new InvalidDataException("The JPEG screenshot header is invalid.");
				}
				bool startOfFrame = marker is >= 0xC0 and <= 0xC3
					or >= 0xC5 and <= 0xC7
					or >= 0xC9 and <= 0xCB
					or >= 0xCD and <= 0xCF;
				if (startOfFrame && segmentLength >= 7)
				{
					int height = (bytes[offset + 3] << 8) | bytes[offset + 4];
					int width = (bytes[offset + 5] << 8) | bytes[offset + 6];
					return ("jpeg", width, height);
				}
				offset += segmentLength;
			}
			throw new InvalidDataException("The JPEG screenshot dimensions could not be read.");
		}

		if (bytes.Length >= 54 && bytes[0] == (byte)'B' && bytes[1] == (byte)'M')
		{
			uint declaredFileSize = ReadLittleEndianUInt32(bytes.Slice(2, 4));
			uint pixelOffset = ReadLittleEndianUInt32(bytes.Slice(10, 4));
			uint dibSize = ReadLittleEndianUInt32(bytes.Slice(14, 4));
			int width = ReadLittleEndianInt32(bytes.Slice(18, 4));
			int signedHeight = ReadLittleEndianInt32(bytes.Slice(22, 4));
			ushort planes = ReadLittleEndianUInt16(bytes.Slice(26, 2));
			ushort bitsPerPixel = ReadLittleEndianUInt16(bytes.Slice(28, 2));
			uint compression = ReadLittleEndianUInt32(bytes.Slice(30, 4));
			if (dibSize < 40
				|| 14L + dibSize > bytes.Length
				|| declaredFileSize < pixelOffset
				|| declaredFileSize > bytes.Length
				|| pixelOffset < 14 + dibSize
				|| pixelOffset >= bytes.Length
				|| width <= 0
				|| signedHeight == 0
				|| signedHeight == int.MinValue
				|| planes != 1
				|| bitsPerPixel is not (1 or 4 or 8 or 16 or 24 or 32)
				|| compression > 3)
			{
				throw new InvalidDataException("The BMP screenshot header is invalid or unsupported.");
			}
			return ("bmp", width, Math.Abs(signedHeight));
		}

		throw new InvalidDataException("Only PNG, JPEG, and BMP raster screenshots are supported.");
	}

	private static Bitmap DecodeBitmap(byte[] bytes, int expectedWidth, int expectedHeight)
	{
		using MemoryStream stream = new(bytes, writable: false);
		using Image decoded = Image.FromStream(stream, useEmbeddedColorManagement: false, validateImageData: true);
		if (decoded.Width != expectedWidth || decoded.Height != expectedHeight || decoded.GetFrameCount(FrameDimension.Page) != 1)
		{
			throw new InvalidDataException("The decoded screenshot does not match its validated raster header.");
		}
		Bitmap bitmap = new(decoded.Width, decoded.Height, PixelFormat.Format32bppArgb);
		using Graphics graphics = Graphics.FromImage(bitmap);
		graphics.CompositingMode = CompositingMode.SourceCopy;
		graphics.DrawImageUnscaled(decoded, 0, 0);
		return bitmap;
	}

	private static void ValidateDimensions(int width, int height)
	{
		if (width < MinWidth || height < MinHeight
			|| width > MaxWidth || height > MaxHeight
			|| (long)width * height > MaxPixels)
		{
			throw new InvalidDataException($"The screenshot dimensions must be between {MinWidth}x{MinHeight} and {MaxWidth}x{MaxHeight}, within the pixel safety limit.");
		}
	}

	private static byte[] CopyGrayscale(Bitmap bitmap)
	{
		Rectangle bounds = new(0, 0, bitmap.Width, bitmap.Height);
		BitmapData data = bitmap.LockBits(bounds, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
		try
		{
			int byteCount = checked(Math.Abs(data.Stride) * data.Height);
			byte[] source = new byte[byteCount];
			Marshal.Copy(data.Scan0, source, 0, source.Length);
			byte[] grayscale = new byte[checked(bitmap.Width * bitmap.Height)];
			for (int y = 0; y < bitmap.Height; y++)
			{
				int sourceRow = data.Stride >= 0 ? y * data.Stride : (bitmap.Height - 1 - y) * -data.Stride;
				int targetRow = y * bitmap.Width;
				for (int x = 0; x < bitmap.Width; x++)
				{
					int offset = sourceRow + x * 4;
					grayscale[targetRow + x] = (byte)((source[offset + 2] * 30 + source[offset + 1] * 59 + source[offset] * 11) / 100);
				}
			}
			return grayscale;
		}
		finally
		{
			bitmap.UnlockBits(data);
		}
	}

	private static byte[] CopyRgbTile(Bitmap source, Rectangle rectangle)
	{
		using Bitmap normalized = new(rectangle.Width, rectangle.Height, PixelFormat.Format24bppRgb);
		using (Graphics graphics = Graphics.FromImage(normalized))
		{
			graphics.CompositingMode = CompositingMode.SourceCopy;
			graphics.DrawImage(source, new Rectangle(0, 0, rectangle.Width, rectangle.Height), rectangle, GraphicsUnit.Pixel);
		}
		BitmapData data = normalized.LockBits(
			new Rectangle(0, 0, normalized.Width, normalized.Height),
			ImageLockMode.ReadOnly,
			PixelFormat.Format24bppRgb);
		try
		{
			byte[] sourceBytes = new byte[Math.Abs(data.Stride) * data.Height];
			Marshal.Copy(data.Scan0, sourceBytes, 0, sourceBytes.Length);
			byte[] rgb = new byte[normalized.Width * normalized.Height * 3];
			for (int y = 0; y < normalized.Height; y++)
			{
				int sourceRow = data.Stride >= 0 ? y * data.Stride : (normalized.Height - 1 - y) * -data.Stride;
				for (int x = 0; x < normalized.Width; x++)
				{
					int sourceOffset = sourceRow + x * 3;
					int targetOffset = (y * normalized.Width + x) * 3;
					rgb[targetOffset] = sourceBytes[sourceOffset + 2];
					rgb[targetOffset + 1] = sourceBytes[sourceOffset + 1];
					rgb[targetOffset + 2] = sourceBytes[sourceOffset];
				}
			}
			return rgb;
		}
		finally
		{
			normalized.UnlockBits(data);
		}
	}

	private static int Luminance(int[] color)
	{
		return (color[0] * 30 + color[1] * 59 + color[2] * 11) / 100;
	}

	private static int ReadBigEndianInt32(ReadOnlySpan<byte> value)
	{
		return (value[0] << 24) | (value[1] << 16) | (value[2] << 8) | value[3];
	}

	private static ushort ReadLittleEndianUInt16(ReadOnlySpan<byte> value)
	{
		return (ushort)(value[0] | value[1] << 8);
	}

	private static uint ReadLittleEndianUInt32(ReadOnlySpan<byte> value)
	{
		return (uint)(value[0] | value[1] << 8 | value[2] << 16 | value[3] << 24);
	}

	private static int ReadLittleEndianInt32(ReadOnlySpan<byte> value)
	{
		return unchecked((int)ReadLittleEndianUInt32(value));
	}

	private static bool ContainsAscii(ReadOnlySpan<byte> value, ReadOnlySpan<byte> needle)
	{
		return value.IndexOf(needle) >= 0;
	}

	private static string ReadRequiredString(JsonElement payload, string name)
	{
		if (!payload.TryGetProperty(name, out JsonElement value)
			|| value.ValueKind != JsonValueKind.String
			|| string.IsNullOrWhiteSpace(value.GetString()))
		{
			throw new InvalidDataException($"The screenshot {name} is required.");
		}
		return value.GetString()!;
	}

	public void Dispose()
	{
		if (disposed)
		{
			return;
		}
		disposed = true;
		if (quantityRecognizer.IsValueCreated)
		{
			quantityRecognizer.Value.Dispose();
		}
		analysisGate.Dispose();
	}

	internal sealed record DetectedGrid(
		int Columns,
		int Left,
		int Pitch,
		int CellWidth,
		int CellHeight,
		IReadOnlyList<int> RowTops,
		double Confidence,
		bool AssumedTightCrop);

	private sealed record GridLineCandidate(int Y, int Left, int Pitch, int CellWidth, int Matches);
	private sealed record HorizontalSegment(int Start, int Length);
	private sealed record EdgeCluster(int Y, int Support);
	private sealed record SlotFeature(byte[] Rgb, int BackgroundLuminance, bool Occupied);
	private sealed record IconTemplate(string Icon, byte[] Rgb);
	private sealed record IconAtlas(int TileSize, int ComparedRows, int[] Background, IReadOnlyList<IconTemplate> Templates);
	private sealed record PendingRecognizedSlot(
		string Id,
		int Row,
		int Column,
		Rectangle Box,
		IReadOnlyList<RecipeBookScreenshotIconCandidate> IconCandidates);
	internal sealed record QuantityRecognition(
		string Text,
		long? Value,
		bool Approximate,
		double Confidence,
		bool AssumedOne,
		bool HasVisibleText);
	internal readonly record struct BorderGradeRecognition(int? Grade, double Confidence)
	{
		internal static BorderGradeRecognition Unknown => new(null, 0);
	}
	private readonly record struct BorderLineEvidence(
		BorderPalette Palette,
		double Confidence,
		int SupportingLines,
		double SupportFloor)
	{
		internal static BorderLineEvidence Unknown => new(BorderPalette.Unknown, 0, 0, 0);
	}
	private enum BorderPalette
	{
		Unknown,
		Base,
		Green,
		Blue,
		Other
	}
	private enum BorderEdge
	{
		Top,
		Left,
		Right
	}
	private sealed class IconAtlasIndex
	{
		public int SchemaVersion { get; init; }
		public int TileSize { get; init; }
		public int Columns { get; init; }
		public int[]? Background { get; init; }
		public List<IconAtlasEntry>? Icons { get; init; }
	}

	private sealed class IconAtlasEntry
	{
		public string Icon { get; init; } = string.Empty;
		public int Index { get; init; }
	}
}

internal sealed record RecipeBookScreenshotRequest(string FileName, string MimeType, string DataBase64);
internal sealed record RecipeBookScreenshotResult(
	string ImageFingerprint,
	int Width,
	int Height,
	RecipeBookScreenshotGrid Grid,
	IReadOnlyList<RecipeBookScreenshotSlot> Slots,
	IReadOnlyList<string> Warnings);
internal sealed record RecipeBookScreenshotGrid(int Columns, int Rows, double Confidence);
internal sealed record RecipeBookScreenshotSlot(
	string Id,
	int Row,
	int Column,
	RecipeBookScreenshotBox Box,
	IReadOnlyList<RecipeBookScreenshotIconCandidate> IconCandidates,
	int? BorderGrade,
	double BorderGradeConfidence,
	string QuantityText,
	long? QuantityValue,
	bool QuantityApproximate,
	double QuantityConfidence,
	bool QuantityAssumedOne);
internal sealed record RecipeBookScreenshotBox(int X, int Y, int Width, int Height);
internal sealed record RecipeBookScreenshotIconCandidate(string Icon, double Score);
