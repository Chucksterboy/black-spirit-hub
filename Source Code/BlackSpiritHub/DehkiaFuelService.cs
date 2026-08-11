using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal sealed record DehkiaFuelCatalogItem(
	long ItemId,
	string Name,
	string Tier);

internal sealed record DehkiaFuelRow(
	long ItemId,
	string Name,
	int EnhancementLevel,
	string Tier,
	long? Price,
	int FuelYield,
	long? Stock,
	string Source,
	DateTimeOffset? CapturedUtc,
	string IconPath);

internal sealed record DehkiaCrystalValueSource(
	string Name,
	long ItemId,
	long Price,
	long Stock,
	int Yield);

internal sealed record DehkiaFuelResponse(
	string Region,
	string Status,
	string Message,
	DateTimeOffset? FetchedUtc,
	DateTimeOffset? ScrapedAt,
	IReadOnlyList<DehkiaFuelRow> Items,
	long? SuggestedCrystalValue,
	DehkiaCrystalValueSource? CrystalValueSource,
	string CrystalIconPath);

internal sealed record DehkiaFuelProviderSnapshot(
	DateTimeOffset CapturedUtc,
	DateTimeOffset? ScrapedAt,
	IReadOnlyList<DehkiaFuelRow> Items,
	string Source);

internal interface IDehkiaFuelApiClient : IDisposable
{
	bool IsConfigured { get; }

	Task<DehkiaFuelProviderSnapshot> GetAsync(
		string region,
		CancellationToken cancellationToken);
}

internal interface IDehkiaFuelMarketProvider : IDisposable
{
	Task<IReadOnlyList<MarketItem>> GetVariantsAsync(
		long itemId,
		string region,
		CancellationToken cancellationToken);
}

internal sealed class DehkiaFuelMarketProvider : IDehkiaFuelMarketProvider
{
	private readonly BlackDesertMarketProvider provider;

	public DehkiaFuelMarketProvider(AppLogger logger)
	{
		provider = new BlackDesertMarketProvider(logger);
	}

	internal DehkiaFuelMarketProvider(BlackDesertMarketProvider provider)
	{
		this.provider = provider;
	}

	public Task<IReadOnlyList<MarketItem>> GetVariantsAsync(
		long itemId,
		string region,
		CancellationToken cancellationToken)
	{
		return provider.GetVariantsAsync(itemId, region, cancellationToken);
	}

	public void Dispose() => provider.Dispose();
}

internal sealed class BdoAlertsDehkiaFuelClient : IDehkiaFuelApiClient
{
	internal static readonly Uri EuEndpoint = new(
		"https://api.bdoalerts.net/api/market/eu/dehkia");

	private const long MaxResponseBytes = 2 * 1024 * 1024;
	private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(15);

	private readonly HttpClient client;
	private readonly Func<string?> apiKeyResolver;
	private readonly Func<DateTimeOffset> utcNow;

	public BdoAlertsDehkiaFuelClient()
		: this(
			new HttpClientHandler
			{
				AllowAutoRedirect = false
			},
			BdoAlertsApiCredentials.Resolve,
			null)
	{
	}

	internal BdoAlertsDehkiaFuelClient(
		HttpMessageHandler handler,
		string? apiKey,
		Func<DateTimeOffset>? utcNow = null)
		: this(handler, () => apiKey, utcNow)
	{
	}

	private BdoAlertsDehkiaFuelClient(
		HttpMessageHandler handler,
		Func<string?> apiKeyResolver,
		Func<DateTimeOffset>? utcNow)
	{
		this.apiKeyResolver = apiKeyResolver;
		this.utcNow = utcNow ?? (() => DateTimeOffset.UtcNow);
		client = new HttpClient(handler, disposeHandler: true)
		{
			Timeout = RequestTimeout,
			MaxResponseContentBufferSize = MaxResponseBytes
		};
		client.DefaultRequestHeaders.UserAgent.Add(
			new ProductInfoHeaderValue(
				"Black-Spirit-Hub",
				AppVersion.Current.TrimStart('v', 'V')));
		client.DefaultRequestHeaders.Accept.Add(
			new MediaTypeWithQualityHeaderValue("application/json"));
	}

	public bool IsConfigured => ResolveApiKey() is not null;

	public async Task<DehkiaFuelProviderSnapshot> GetAsync(
		string region,
		CancellationToken cancellationToken)
	{
		if (!string.Equals(region, "eu", StringComparison.Ordinal))
		{
			throw new InvalidOperationException("Dehkia Fuel currently supports the EU market only.");
		}

		using HttpRequestMessage request = new(HttpMethod.Get, EuEndpoint);
		if (!BdoAlertsApiCredentials.TryApply(
				request,
				EuEndpoint,
				ResolveApiKey()))
		{
			throw new UnauthorizedAccessException("The Dehkia Fuel market feed is not configured.");
		}

		using HttpResponseMessage response = await client.SendAsync(
			request,
			HttpCompletionOption.ResponseHeadersRead,
			cancellationToken);
		if (!response.IsSuccessStatusCode)
		{
			throw new HttpRequestException(
				"The Dehkia Fuel market feed is temporarily unavailable.",
				null,
				response.StatusCode);
		}
		if (response.Content.Headers.ContentLength is > MaxResponseBytes)
		{
			throw new InvalidDataException("The Dehkia Fuel market response exceeded the allowed size.");
		}

		await using Stream stream = await response.Content.ReadAsStreamAsync(cancellationToken);
		using MemoryStream buffer = new();
		byte[] bytes = new byte[32 * 1024];
		while (true)
		{
			int read = await stream.ReadAsync(bytes.AsMemory(), cancellationToken);
			if (read == 0)
			{
				break;
			}
			if (buffer.Length + read > MaxResponseBytes)
			{
				throw new InvalidDataException("The Dehkia Fuel market response exceeded the allowed size.");
			}
			await buffer.WriteAsync(bytes.AsMemory(0, read), cancellationToken);
		}
		buffer.Position = 0;
		using JsonDocument document = await JsonDocument.ParseAsync(
			buffer,
			cancellationToken: cancellationToken);
		return ParseCompleteSnapshot(document.RootElement, utcNow());
	}

	internal static DehkiaFuelProviderSnapshot ParseCompleteSnapshot(
		JsonElement root,
		DateTimeOffset fallbackCapturedUtc)
	{
		if (root.ValueKind != JsonValueKind.Object
			|| !root.TryGetProperty("items", out JsonElement items)
			|| items.ValueKind != JsonValueKind.Array)
		{
			throw new InvalidDataException("The Dehkia Fuel market feed returned an invalid snapshot.");
		}
		if (TryGetString(root, "region") is string declaredRegion
			&& !declaredRegion.Equals("eu", StringComparison.OrdinalIgnoreCase))
		{
			throw new InvalidDataException("The Dehkia Fuel market feed returned the wrong region.");
		}
		if (TryGetLong(root, "total_items") is long declaredCount
			&& declaredCount != items.GetArrayLength())
		{
			throw new InvalidDataException("The Dehkia Fuel market feed returned a mismatched row count.");
		}

		DateTimeOffset? scrapedAt = TryGetDateTimeOffset(root, "scraped_at", "scrapedAt");
		if (scrapedAt is null
			|| scrapedAt.Value < fallbackCapturedUtc.AddHours(-6)
			|| scrapedAt.Value > fallbackCapturedUtc.AddMinutes(5))
		{
			throw new InvalidDataException("The Dehkia Fuel market feed did not include a current capture time.");
		}
		DateTimeOffset capturedUtc = scrapedAt ?? fallbackCapturedUtc;
		Dictionary<long, DehkiaFuelCatalogItem> catalog = DehkiaFuelService.Catalog
			.ToDictionary(item => item.ItemId);
		Dictionary<(long ItemId, int Enhancement), DehkiaFuelRow> rows = new();
		foreach (JsonElement item in items.EnumerateArray())
		{
			long itemId = TryGetLong(item, "item_id", "itemId") ?? 0;
			int enhancement = checked((int)(TryGetLong(
				item,
				"enhancement_level",
				"enhancementLevel",
				"sub_key",
				"subKey") ?? 0));
			if (!catalog.TryGetValue(itemId, out DehkiaFuelCatalogItem? catalogItem)
				|| enhancement is < 1 or > 3)
			{
				throw new InvalidDataException("The Dehkia Fuel market feed contained an unknown item row.");
			}

			long price = TryGetLong(item, "price", "current_price", "currentPrice") ?? 0;
			long stock = TryGetLong(item, "stock", "current_stock", "currentStock") ?? -1;
			int expectedYield = DehkiaFuelService.GetFuelYield(catalogItem.Tier, enhancement);
			long declaredYield = TryGetLong(item, "fuel_yield", "fuelYield") ?? expectedYield;
			string declaredTier = TryGetString(item, "tier") ?? catalogItem.Tier;
			if (price <= 0
				|| stock < 0
				|| declaredYield != expectedYield
				|| !declaredTier.Equals(catalogItem.Tier, StringComparison.OrdinalIgnoreCase))
			{
				throw new InvalidDataException("The Dehkia Fuel market feed contained an invalid market row.");
			}

			DehkiaFuelRow row = DehkiaFuelService.CreateRow(
				catalogItem,
				enhancement,
				price,
				stock,
				"bdoalerts-dehkia",
				capturedUtc);
			if (!rows.TryAdd((itemId, enhancement), row))
			{
				throw new InvalidDataException("The Dehkia Fuel market feed contained duplicate rows.");
			}
		}

		DehkiaFuelRow[] complete = DehkiaFuelService.OrderAndValidateRows(
			rows.Values,
			requireMarketValues: true);
		return new DehkiaFuelProviderSnapshot(
			capturedUtc,
			scrapedAt,
			complete,
			"BDO Alerts Dehkia market feed");
	}

	private string? ResolveApiKey() => apiKeyResolver();

	private static long? TryGetLong(JsonElement element, params string[] names)
	{
		foreach (string name in names)
		{
			if (!element.TryGetProperty(name, out JsonElement value))
			{
				continue;
			}
			if (value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out long number))
			{
				return number;
			}
			if (value.ValueKind == JsonValueKind.String
				&& long.TryParse(value.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out number))
			{
				return number;
			}
		}
		return null;
	}

	private static string? TryGetString(JsonElement element, params string[] names)
	{
		foreach (string name in names)
		{
			if (element.TryGetProperty(name, out JsonElement value)
				&& value.ValueKind == JsonValueKind.String)
			{
				return value.GetString();
			}
		}
		return null;
	}

	private static DateTimeOffset? TryGetDateTimeOffset(JsonElement element, params string[] names)
	{
		string? text = TryGetString(element, names);
		return DateTimeOffset.TryParse(
			text,
			CultureInfo.InvariantCulture,
			DateTimeStyles.AssumeUniversal,
			out DateTimeOffset parsed)
				? parsed.ToUniversalTime()
				: null;
	}

	public void Dispose() => client.Dispose();
}

internal sealed class DehkiaFuelService : IDisposable
{
	private const int CacheSchemaVersion = 1;
	private const string Region = "eu";
	private const int VariantConcurrency = 6;
	private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(1);
	private static readonly TimeSpan RefreshTimeout = TimeSpan.FromSeconds(80);

	internal static readonly IReadOnlyList<DehkiaFuelCatalogItem> Catalog =
	[
		new(12042, "Forest Ronaros Ring", "low"),
		new(11628, "Serap's Necklace", "low"),
		new(11625, "Sicil's Necklace", "low"),
		new(12229, "Centaurus Belt", "low"),
		new(12251, "Orkinrad's Belt", "low"),
		new(12032, "Ring of Cadry Guardian", "low"),
		new(11834, "Narc Ear Accessory", "low"),
		new(12230, "Basilisk's Belt", "low"),
		new(12060, "Eye of the Ruins Ring", "low"),
		new(12031, "Ring of Crescent Guardian", "low"),
		new(12236, "Valtarra Eclipsed Belt", "low"),
		new(11828, "Tungrad Earring", "high"),
		new(11630, "Laytenn's Power Stone", "high"),
		new(11607, "Ogre Ring", "high"),
		new(11856, "Ethereal Earring", "high"),
		new(11629, "Tungrad Necklace", "high"),
		new(12237, "Tungrad Belt", "high"),
		new(12061, "Tungrad Ring", "high"),
		new(11662, "Revived River Necklace", "high"),
		new(11663, "Revived Lunar Necklace", "high"),
		new(11853, "Black Distortion Earring", "high"),
		new(12257, "Turo's Belt", "high"),
		new(12068, "Ominous Ring", "high"),
		new(11855, "Dawn Earring", "high"),
		new(11875, "Vaha's Dawn", "high"),
		new(12282, "Taebaek's Belt", "high")
	];

	private static readonly (long ItemId, string Name)[] ImperfectLightstones =
	[
		(766104, "Imperfect Lightstone of Fire"),
		(766105, "Imperfect Lightstone of Earth"),
		(766106, "Imperfect Lightstone of Wind"),
		(766107, "Imperfect Lightstone of Flora")
	];

	private static readonly JsonSerializerOptions CacheJsonOptions = new()
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
		PropertyNameCaseInsensitive = true,
		WriteIndented = true
	};

	private readonly AppPaths paths;
	private readonly AppLogger logger;
	private readonly IDehkiaFuelApiClient apiClient;
	private readonly IDehkiaFuelMarketProvider marketProvider;
	private readonly Func<DateTimeOffset> clock;
	private readonly SemaphoreSlim refreshGate = new(1, 1);
	private DehkiaFuelCacheEnvelope? cache;
	private bool cacheLoaded;

	public DehkiaFuelService(AppPaths paths, AppLogger logger)
		: this(
			paths,
			logger,
			new BdoAlertsDehkiaFuelClient(),
			new DehkiaFuelMarketProvider(logger),
			() => DateTimeOffset.UtcNow)
	{
	}

	internal DehkiaFuelService(
		AppPaths paths,
		AppLogger logger,
		IDehkiaFuelApiClient apiClient,
		IDehkiaFuelMarketProvider marketProvider,
		Func<DateTimeOffset> clock)
	{
		this.paths = paths;
		this.logger = logger;
		this.apiClient = apiClient;
		this.marketProvider = marketProvider;
		this.clock = clock;
	}

	public async Task<DehkiaFuelResponse> GetDataAsync(
		bool forceRefresh,
		CancellationToken cancellationToken)
	{
		await refreshGate.WaitAsync(cancellationToken);
		try
		{
			await LoadCacheOnceAsync(cancellationToken);
			DateTimeOffset now = clock().ToUniversalTime();
			if (!forceRefresh
				&& cache is not null
				&& now - cache.FetchedUtc <= CacheTtl
				&& cache.FetchedUtc <= now.AddMinutes(5))
			{
				return ToResponse(
					cache,
					"CACHE",
					"Current Dehkia Fuel market data loaded from the local cache.");
			}

			using CancellationTokenSource timeout = CancellationTokenSource.CreateLinkedTokenSource(
				cancellationToken);
			timeout.CancelAfter(RefreshTimeout);
			try
			{
				DehkiaFuelCacheEnvelope fresh = await RefreshAsync(now, timeout.Token);
				await SaveCacheAsync(fresh, timeout.Token);
				cache = fresh;
				return ToResponse(
					fresh,
					"LIVE",
					"Dehkia Fuel prices and stock were refreshed successfully.");
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex) when (ex is not OutOfMemoryException)
			{
				logger.Warn(
					"Dehkia Fuel refresh failed; a safe fallback will be used. Failure type: "
					+ ex.GetType().Name);
				if (cache is not null)
				{
					return ToResponse(
						cache,
						"STALE",
						"Live prices could not be refreshed, so the last complete local snapshot is shown.");
				}

				return new DehkiaFuelResponse(
					Region,
					"REFERENCE",
					"Live prices are temporarily unavailable. Every eligible accessory remains listed without false zero values.",
					null,
					null,
					CreateReferenceRows(),
					null,
					null,
					"Assets/DehkiaFuel/item-766108.png");
			}
		}
		finally
		{
			refreshGate.Release();
		}
	}

	private async Task<DehkiaFuelCacheEnvelope> RefreshAsync(
		DateTimeOffset now,
		CancellationToken cancellationToken)
	{
		DehkiaFuelProviderSnapshot? primary = null;
		if (apiClient.IsConfigured)
		{
			try
			{
				primary = await apiClient.GetAsync(Region, cancellationToken);
				OrderAndValidateRows(primary.Items, requireMarketValues: true);
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex) when (ex is not OutOfMemoryException)
			{
				logger.Warn(
					"Primary Dehkia Fuel feed was incomplete; using the market fallback. Failure type: "
					+ ex.GetType().Name);
				primary = null;
			}
		}

		if (primary is not null)
		{
			(DehkiaCrystalValueSource? crystal, _) = await FetchCrystalValueAsync(
				cancellationToken);
			return new DehkiaFuelCacheEnvelope(
				CacheSchemaVersion,
				Region,
				now,
				primary.ScrapedAt,
				primary.Source,
				primary.Items,
				crystal is null ? null : CalculateSuggestedCrystalValue(crystal.Price),
				crystal);
		}

		(DehkiaFuelProviderSnapshot market, DehkiaCrystalValueSource? source) =
			await FetchMarketFallbackAsync(now, cancellationToken);
		return new DehkiaFuelCacheEnvelope(
			CacheSchemaVersion,
			Region,
			now,
			market.ScrapedAt,
			market.Source,
			market.Items,
			source is null ? null : CalculateSuggestedCrystalValue(source.Price),
			source);
	}

	private async Task<(DehkiaFuelProviderSnapshot Snapshot, DehkiaCrystalValueSource? Crystal)>
		FetchMarketFallbackAsync(
			DateTimeOffset capturedUtc,
			CancellationToken cancellationToken)
	{
		long[] ids = Catalog.Select(item => item.ItemId)
			.Concat(ImperfectLightstones.Select(item => item.ItemId))
			.ToArray();
		IReadOnlyDictionary<long, IReadOnlyList<MarketItem>?> variants =
			await FetchVariantsAsync(ids, cancellationToken);

		List<DehkiaFuelRow> rows = new(78);
		foreach (DehkiaFuelCatalogItem catalogItem in Catalog)
		{
			if (!variants.TryGetValue(catalogItem.ItemId, out IReadOnlyList<MarketItem>? itemVariants)
				|| itemVariants is null)
			{
				throw new InvalidDataException("The market fallback did not return a complete accessory snapshot.");
			}
			foreach (int enhancement in Enumerable.Range(1, 3))
			{
				MarketItem[] matches = itemVariants
					.Where(item => item.ItemId == catalogItem.ItemId
						&& item.Enhancement == enhancement
						&& item.CurrentPrice > 0
						&& item.Stock >= 0)
					.ToArray();
				if (matches.Length != 1)
				{
					throw new InvalidDataException("The market fallback did not return every PRI, DUO and TRI accessory row.");
				}
				rows.Add(CreateRow(
					catalogItem,
					enhancement,
					matches[0].CurrentPrice,
					matches[0].Stock,
					"blackdesert-market",
					capturedUtc));
			}
		}

		DehkiaFuelRow[] complete = OrderAndValidateRows(rows, requireMarketValues: true);
		DehkiaCrystalValueSource? crystal = SelectCrystalValue(variants);
		return (
			new DehkiaFuelProviderSnapshot(
				capturedUtc,
				capturedUtc,
				complete,
				"Black Desert Market fallback"),
			crystal);
	}

	private async Task<(DehkiaCrystalValueSource? Source, bool Complete)> FetchCrystalValueAsync(
		CancellationToken cancellationToken)
	{
		IReadOnlyDictionary<long, IReadOnlyList<MarketItem>?> variants =
			await FetchVariantsAsync(
				ImperfectLightstones.Select(item => item.ItemId),
				cancellationToken);
		return (SelectCrystalValue(variants), variants.Values.All(value => value is not null));
	}

	private async Task<IReadOnlyDictionary<long, IReadOnlyList<MarketItem>?>> FetchVariantsAsync(
		IEnumerable<long> itemIds,
		CancellationToken cancellationToken)
	{
		ConcurrentDictionary<long, IReadOnlyList<MarketItem>> results = new();
		using SemaphoreSlim concurrency = new(VariantConcurrency, VariantConcurrency);
		Task[] tasks = itemIds.Distinct().Select(async itemId =>
		{
			await concurrency.WaitAsync(cancellationToken);
			try
			{
				try
				{
					results[itemId] = await marketProvider.GetVariantsAsync(
						itemId,
						Region,
						cancellationToken);
				}
				catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
				{
					throw;
				}
				catch (Exception ex) when (ex is not OutOfMemoryException)
				{
					logger.Warn(
						$"Dehkia Fuel market item {itemId.ToString(CultureInfo.InvariantCulture)} was unavailable. Failure type: "
						+ ex.GetType().Name);
				}
			}
			finally
			{
				concurrency.Release();
			}
		}).ToArray();
		await Task.WhenAll(tasks);
		return results.ToDictionary(
			pair => pair.Key,
			pair => (IReadOnlyList<MarketItem>?)pair.Value);
	}

	private static DehkiaCrystalValueSource? SelectCrystalValue(
		IReadOnlyDictionary<long, IReadOnlyList<MarketItem>?> variants)
	{
		List<DehkiaCrystalValueSource> available = [];
		foreach ((long itemId, string name) in ImperfectLightstones)
		{
			if (!variants.TryGetValue(itemId, out IReadOnlyList<MarketItem>? rows)
				|| rows is null)
			{
				continue;
			}
			foreach (MarketItem item in rows.Where(item =>
				item.ItemId == itemId
				&& item.Enhancement == 0
				&& item.CurrentPrice > 0
				&& item.Stock > 0))
			{
				available.Add(new DehkiaCrystalValueSource(
					name,
					itemId,
					item.CurrentPrice,
					item.Stock,
					6));
			}
		}
		return available
			.OrderBy(item => item.Price)
			.ThenBy(item => item.ItemId)
			.FirstOrDefault();
	}

	internal static long CalculateSuggestedCrystalValue(long imperfectLightstonePrice)
	{
		if (imperfectLightstonePrice <= 0)
		{
			throw new ArgumentOutOfRangeException(nameof(imperfectLightstonePrice));
		}
		return imperfectLightstonePrice / 6;
	}

	internal static int GetFuelYield(string tier, int enhancement)
	{
		if (enhancement is < 1 or > 3)
		{
			throw new ArgumentOutOfRangeException(nameof(enhancement));
		}
		return tier switch
		{
			"low" => enhancement switch { 1 => 25, 2 => 75, _ => 210 },
			"high" => enhancement switch { 1 => 165, 2 => 450, _ => 1275 },
			_ => throw new ArgumentOutOfRangeException(nameof(tier))
		};
	}

	internal static DehkiaFuelRow CreateRow(
		DehkiaFuelCatalogItem item,
		int enhancement,
		long? price,
		long? stock,
		string source,
		DateTimeOffset? capturedUtc)
	{
		return new DehkiaFuelRow(
			item.ItemId,
			item.Name,
			enhancement,
			item.Tier,
			price,
			GetFuelYield(item.Tier, enhancement),
			stock,
			source,
			capturedUtc,
			$"Assets/DehkiaFuel/item-{item.ItemId.ToString(CultureInfo.InvariantCulture)}.png");
	}

	internal static DehkiaFuelRow[] OrderAndValidateRows(
		IEnumerable<DehkiaFuelRow> rows,
		bool requireMarketValues)
	{
		Dictionary<long, DehkiaFuelCatalogItem> catalog = Catalog.ToDictionary(item => item.ItemId);
		Dictionary<(long ItemId, int Enhancement), DehkiaFuelRow> unique = new();
		foreach (DehkiaFuelRow row in rows)
		{
			if (!catalog.TryGetValue(row.ItemId, out DehkiaFuelCatalogItem? item)
				|| row.EnhancementLevel is < 1 or > 3
				|| !row.Name.Equals(item.Name, StringComparison.Ordinal)
				|| !row.Tier.Equals(item.Tier, StringComparison.Ordinal)
				|| row.FuelYield != GetFuelYield(item.Tier, row.EnhancementLevel)
				|| (requireMarketValues && (row.Price is null or <= 0 || row.Stock is null or < 0))
				|| !unique.TryAdd((row.ItemId, row.EnhancementLevel), row))
			{
				throw new InvalidDataException("The Dehkia Fuel snapshot was incomplete or inconsistent.");
			}
		}
		if (unique.Count != Catalog.Count * 3
			|| Catalog.Any(item => Enumerable.Range(1, 3)
				.Any(enhancement => !unique.ContainsKey((item.ItemId, enhancement)))))
		{
			throw new InvalidDataException("The Dehkia Fuel snapshot did not contain all 78 item and enhancement combinations.");
		}

		return Catalog.SelectMany(item => Enumerable.Range(1, 3)
			.Select(enhancement => unique[(item.ItemId, enhancement)]))
			.ToArray();
	}

	private static IReadOnlyList<DehkiaFuelRow> CreateReferenceRows()
	{
		return Catalog.SelectMany(item => Enumerable.Range(1, 3)
			.Select(enhancement => CreateRow(
				item,
				enhancement,
				null,
				null,
				"reference",
				null)))
			.ToArray();
	}

	private async Task LoadCacheOnceAsync(CancellationToken cancellationToken)
	{
		if (cacheLoaded)
		{
			return;
		}
		cacheLoaded = true;
		DehkiaFuelCacheEnvelope? loaded = await AtomicFile.ReadJsonAsync<DehkiaFuelCacheEnvelope>(
			paths.DehkiaFuelCachePath,
			CacheJsonOptions,
			cancellationToken);
		if (loaded is null)
		{
			return;
		}
		try
		{
			if (loaded.SchemaVersion != CacheSchemaVersion
				|| !loaded.Region.Equals(Region, StringComparison.Ordinal)
				|| loaded.FetchedUtc == default)
			{
				throw new InvalidDataException("The Dehkia Fuel cache has an unsupported format.");
			}
			OrderAndValidateRows(loaded.Items, requireMarketValues: true);
			cache = loaded;
		}
		catch (Exception ex) when (ex is InvalidDataException or ArgumentException)
		{
			logger.Warn("An invalid Dehkia Fuel cache was ignored.");
		}
	}

	private async Task SaveCacheAsync(
		DehkiaFuelCacheEnvelope value,
		CancellationToken cancellationToken)
	{
		OrderAndValidateRows(value.Items, requireMarketValues: true);
		string json = JsonSerializer.Serialize(value, CacheJsonOptions);
		await AtomicFile.WriteAllTextAsync(paths.DehkiaFuelCachePath, json, cancellationToken);
	}

	private static DehkiaFuelResponse ToResponse(
		DehkiaFuelCacheEnvelope value,
		string status,
		string message)
	{
		return new DehkiaFuelResponse(
			value.Region,
			status,
			message,
			value.FetchedUtc,
			value.ScrapedAt,
			value.Items,
			value.SuggestedCrystalValue,
			value.CrystalValueSource,
			"Assets/DehkiaFuel/item-766108.png");
	}

	public void Dispose()
	{
		apiClient.Dispose();
		marketProvider.Dispose();
		refreshGate.Dispose();
	}

	private sealed record DehkiaFuelCacheEnvelope(
		int SchemaVersion,
		string Region,
		DateTimeOffset FetchedUtc,
		DateTimeOffset? ScrapedAt,
		string Source,
		IReadOnlyList<DehkiaFuelRow> Items,
		long? SuggestedCrystalValue,
		DehkiaCrystalValueSource? CrystalValueSource);
}
