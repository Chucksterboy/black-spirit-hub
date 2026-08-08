using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal sealed record GrindMarketPrice(
	long ItemId,
	int Enhancement,
	string Name,
	long Price,
	long? LowestListedPrice,
	long? BasePrice,
	long? LastSoldPrice,
	long? Stock,
	long? TradeCount,
	string Source,
	DateTimeOffset CapturedUtc);

internal sealed record GrindMarketPriceResponse(
	string Region,
	DateTimeOffset CapturedUtc,
	IReadOnlyList<GrindMarketPrice> Prices,
	IReadOnlyList<long> Missing,
	string Provider,
	string Message);

internal sealed class GrindMarketPriceProvider : IDisposable
{
	private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(12);
	private static readonly TimeSpan BatchSpacing = TimeSpan.FromMilliseconds(200);
	private const long MaxResponseBytes = 8 * 1024 * 1024;
	private const int AnalyticsBatchItemCount = 250;
	private const int OutfitMainCategory = 55;
	private const int MinimumValidatedOutfitCategoryOneCount = 450;
	private const int MinimumValidatedOutfitCategoryTwoCount = 950;
	private const int MinimumValidatedOutfitCategoryCount = 1500;
	private const int InteractiveBatchAttempts = 2;
	private const int AnalyticsBatchAttempts = 2;
	private const int AnalyticsRecoveryRequestBudget = 128;
	private const long AnalyticsHealthProbeItemId = 16001;
	private const int MaximumConsecutiveEmptyAnalyticsBatches = 2;

	private readonly HttpClient client;
	private readonly BdoAlertsCentralMarketClient? bdoAlertsClient;
	private readonly AppLogger logger;

	public GrindMarketPriceProvider(AppLogger logger)
		: this(logger, null, new BdoAlertsCentralMarketClient(logger))
	{
	}

	internal GrindMarketPriceProvider(AppLogger logger, HttpMessageHandler? handler)
		: this(logger, handler, null)
	{
	}

	internal GrindMarketPriceProvider(
		AppLogger logger,
		HttpMessageHandler arshaHandler,
		HttpMessageHandler bdoAlertsHandler,
		string bdoAlertsApiKey)
		: this(
			logger,
			arshaHandler,
			new BdoAlertsCentralMarketClient(logger, bdoAlertsHandler, bdoAlertsApiKey))
	{
	}

	private GrindMarketPriceProvider(
		AppLogger logger,
		HttpMessageHandler? handler,
		BdoAlertsCentralMarketClient? bdoAlertsClient)
	{
		this.logger = logger;
		this.bdoAlertsClient = bdoAlertsClient;
		client = handler == null ? new HttpClient() : new HttpClient(handler);
		client.Timeout = RequestTimeout;
		client.MaxResponseContentBufferSize = MaxResponseBytes;
		client.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("Black-Spirit-Hub", AppVersion.Current.TrimStart('v', 'V')));
		client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
	}

	public async Task<GrindMarketPriceResponse> GetPricesAsync(IEnumerable<long> itemIds, string region, CancellationToken cancellationToken)
	{
		string normalizedRegion = NormalizeRegion(region);
		long[] ids = NormalizeItemIds(itemIds);
		DateTimeOffset captured = DateTimeOffset.UtcNow;
		string provider = "BDO Alerts Central Market";

		if (ids.Length == 0)
		{
			return EmptyResponse(normalizedRegion, captured, provider);
		}

		Dictionary<long, GrindMarketPrice> pricesById = new();
		if (bdoAlertsClient?.IsConfigured == true)
		{
			try
			{
				BdoAlertsMarketSnapshot snapshot = await bdoAlertsClient.GetCurrentPricesAsync(
					ids,
					normalizedRegion,
					cancellationToken);
				captured = snapshot.CapturedUtc;
				foreach (GrindMarketPrice price in snapshot.Prices)
				{
					pricesById[price.ItemId] = price;
				}
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex) when (IsProviderFailure(ex))
			{
				logger.Warn($"BDO Alerts {normalizedRegion.ToUpperInvariant()} grind-price refresh failed; using the Arsha fallback. {ex.Message}");
			}
		}

		long[] missingFromPrimary = ids.Where(id => !pricesById.ContainsKey(id)).ToArray();
		if (missingFromPrimary.Length > 0)
		{
			provider = pricesById.Count > 0
				? "BDO Alerts Central Market + Arsha fallback"
				: "Arsha GetWorldMarketSubList";
			try
			{
				IReadOnlyList<GrindMarketPrice> fallback = await FetchArshaSubListBatchAsync(
					missingFromPrimary,
					normalizedRegion,
					DateTimeOffset.UtcNow,
					InteractiveBatchAttempts,
					cancellationToken);
				foreach (GrindMarketPrice price in fallback)
				{
					pricesById[price.ItemId] = price;
				}
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex) when (IsProviderFailure(ex))
			{
				logger.Warn($"Arsha GetWorldMarketSubList {normalizedRegion.ToUpperInvariant()} fallback batch failed: {ex.Message}");
			}
		}

		IReadOnlyList<GrindMarketPrice> prices = pricesById.Values
			.OrderBy(price => price.ItemId)
			.ToArray();
		return CreateResponse(ids, normalizedRegion, captured, provider, prices);
	}

	public async Task<GrindMarketPriceResponse> GetAnalyticsPricesAsync(IEnumerable<long> itemIds, string region, CancellationToken cancellationToken)
	{
		string normalizedRegion = NormalizeRegion(region);
		long[] ids = NormalizeItemIds(itemIds);
		DateTimeOffset captured = DateTimeOffset.UtcNow;
		Dictionary<long, GrindMarketPrice> pricesById = new();
		string provider = "Arsha GetWorldMarketSubList";

		if (ids.Length == 0)
		{
			return EmptyResponse(normalizedRegion, captured, provider);
		}

		long[][] batches = ids.Chunk(AnalyticsBatchItemCount).Select(chunk => chunk.ToArray()).ToArray();
		AnalyticsRecoveryContext recovery = new(AnalyticsRecoveryRequestBudget);
		int consecutiveEmptyBatches = 0;
		for (int index = 0; index < batches.Length; index++)
		{
			long[] batch = batches[index];
			IReadOnlyList<GrindMarketPrice> batchPrices;
			try
			{
				batchPrices = await FetchAnalyticsBatchAsync(batch, normalizedRegion, captured, recovery, cancellationToken);
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex) when (IsProviderFailure(ex))
			{
				batchPrices = Array.Empty<GrindMarketPrice>();
				logger.Warn($"Arsha GetWorldMarketSubList {normalizedRegion.ToUpperInvariant()} analytics batch {index + 1}/{batches.Length} failed: {ex.Message}");
			}

			foreach (GrindMarketPrice price in batchPrices)
			{
				pricesById[price.ItemId] = price;
			}

			if (batchPrices.Count == 0)
			{
				consecutiveEmptyBatches++;
				if (consecutiveEmptyBatches >= MaximumConsecutiveEmptyAnalyticsBatches)
				{
					logger.Warn($"Arsha GetWorldMarketSubList {normalizedRegion.ToUpperInvariant()} analytics sweep stopped after {consecutiveEmptyBatches} empty batches. Cached samples remain available.");
					break;
				}
			}
			else
			{
				consecutiveEmptyBatches = 0;
			}

			if (index + 1 < batches.Length)
			{
				await Task.Delay(BatchSpacing, cancellationToken);
			}
		}

		IReadOnlyList<GrindMarketPrice> prices = pricesById.Values.OrderBy(price => price.ItemId).ToArray();
		logger.Info($"Arsha GetWorldMarketSubList {normalizedRegion.ToUpperInvariant()} batches returned {prices.Count.ToString(CultureInfo.InvariantCulture)}/{ids.Length.ToString(CultureInfo.InvariantCulture)} market prices.");
		return CreateResponse(ids, normalizedRegion, captured, provider, prices);
	}

	public async Task<GrindMarketPriceResponse> GetOutfitAnalyticsPricesAsync(
		IEnumerable<long> itemIds,
		string region,
		CancellationToken cancellationToken)
	{
		string normalizedRegion = NormalizeRegion(region);
		long[] ids = NormalizeItemIds(itemIds);
		DateTimeOffset captured = DateTimeOffset.UtcNow;
		string provider = "Arsha GetWorldMarketList";

		if (ids.Length == 0)
		{
			return EmptyResponse(normalizedRegion, captured, provider);
		}

		HashSet<long> requestedIds = ids.ToHashSet();
		Dictionary<long, GrindMarketPrice> allCategoryPricesById = new();
		Dictionary<long, GrindMarketPrice> pricesById = new();
		bool completeCategorySnapshot = true;
		foreach (int subCategory in new[] { 1, 2 })
		{
			try
			{
				IReadOnlyList<GrindMarketPrice> categoryPrices = await FetchArshaCategoryListAsync(
					OutfitMainCategory,
					subCategory,
					normalizedRegion,
					captured,
					cancellationToken);
				foreach (GrindMarketPrice price in categoryPrices)
				{
					allCategoryPricesById[price.ItemId] = price;
					if (requestedIds.Contains(price.ItemId)
						&& price.TradeCount is >= 0)
					{
						pricesById[price.ItemId] = price;
					}
				}
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex) when (IsProviderFailure(ex))
			{
				completeCategorySnapshot = false;
				logger.Warn($"Arsha GetWorldMarketList {normalizedRegion.ToUpperInvariant()} outfit category {subCategory} failed: {ex.Message}");
			}
		}

		if (!completeCategorySnapshot
			|| allCategoryPricesById.Count < MinimumValidatedOutfitCategoryCount)
		{
			logger.Warn($"Arsha GetWorldMarketList {normalizedRegion.ToUpperInvariant()} outfit snapshot was incomplete ({allCategoryPricesById.Count.ToString(CultureInfo.InvariantCulture)} unique items); no partial sales snapshot will be saved.");
			return CreateResponse(ids, normalizedRegion, captured, provider, Array.Empty<GrindMarketPrice>());
		}

		IReadOnlyList<GrindMarketPrice> prices = pricesById.Values.OrderBy(price => price.ItemId).ToArray();
		logger.Info($"Arsha GetWorldMarketList {normalizedRegion.ToUpperInvariant()} returned {prices.Count.ToString(CultureInfo.InvariantCulture)}/{ids.Length.ToString(CultureInfo.InvariantCulture)} requested outfit sales totals in two cached category requests.");
		return CreateResponse(ids, normalizedRegion, captured, provider, prices);
	}

	private static long[] NormalizeItemIds(IEnumerable<long> itemIds)
	{
		return itemIds.Where(id => id > 0).Distinct().OrderBy(id => id).ToArray();
	}

	private static GrindMarketPriceResponse EmptyResponse(string region, DateTimeOffset captured, string provider)
	{
		return new GrindMarketPriceResponse(region, captured, Array.Empty<GrindMarketPrice>(), Array.Empty<long>(), provider, "No market item IDs were supplied.");
	}

	private static GrindMarketPriceResponse CreateResponse(
		long[] ids,
		string region,
		DateTimeOffset captured,
		string provider,
		IReadOnlyList<GrindMarketPrice> prices)
	{
		HashSet<long> resolved = prices.Select(price => price.ItemId).ToHashSet();
		IReadOnlyList<long> missing = ids.Except(resolved).ToArray();
		string message = prices.Count == 0
			? "EU market prices could not be refreshed. Cached prices remain available."
			: $"EU market prices refreshed: {prices.Count.ToString(CultureInfo.InvariantCulture)}/{ids.Length.ToString(CultureInfo.InvariantCulture)} items.";

		return new GrindMarketPriceResponse(region, captured, prices, missing, provider, message);
	}

	private async Task<IReadOnlyList<GrindMarketPrice>> FetchArshaSubListBatchAsync(
		long[] itemIds,
		string region,
		DateTimeOffset captured,
		int maxAttempts,
		CancellationToken cancellationToken)
	{
		for (int attempt = 1; attempt <= maxAttempts; attempt++)
		{
			try
			{
				using HttpRequestMessage request = new(HttpMethod.Post, $"https://api.arsha.io/v2/{region}/GetWorldMarketSubList?lang=en");
				request.Content = new StringContent(JsonSerializer.Serialize(itemIds), Encoding.UTF8, "application/json");
				using JsonDocument document = await SendJsonAsync(request, cancellationToken);
				List<GrindMarketPrice> prices = new();
				Dictionary<long, MarketSubListEntry> entries = ParseSubList(document.RootElement, 0)
					.Where(entry => entry.ItemId > 0)
					.GroupBy(entry => entry.ItemId)
					.ToDictionary(group => group.Key, group => group.First());
				if (entries.Count == 0)
				{
					throw new InvalidDataException("Arsha GetWorldMarketSubList returned an empty response.");
				}
				foreach (long itemId in itemIds)
				{
					if (entries.TryGetValue(itemId, out MarketSubListEntry entry))
					{
						prices.Add(ToPrice(entry, null, "arsha-sublist-cache", captured));
					}
				}
				return prices;
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex) when (attempt < maxAttempts && (IsEndpointUnavailable(ex) || ex is InvalidDataException))
			{
				TimeSpan delay = TimeSpan.FromMilliseconds(400);
				logger.Warn($"Arsha GetWorldMarketSubList {region.ToUpperInvariant()} retrying in {delay.TotalSeconds:0.##} seconds after upstream failure: {ex.Message}");
				await Task.Delay(delay, cancellationToken);
			}
		}

		throw new InvalidDataException("Arsha GetWorldMarketSubList did not return a usable response.");
	}

	private async Task<IReadOnlyList<GrindMarketPrice>> FetchArshaCategoryListAsync(
		int mainCategory,
		int subCategory,
		string region,
		DateTimeOffset captured,
		CancellationToken cancellationToken)
	{
		for (int attempt = 1; attempt <= AnalyticsBatchAttempts; attempt++)
		{
			try
			{
				using HttpRequestMessage request = new(
					HttpMethod.Get,
					$"https://api.arsha.io/v2/{region}/GetWorldMarketList?mainCategory={mainCategory.ToString(CultureInfo.InvariantCulture)}&subCategory={subCategory.ToString(CultureInfo.InvariantCulture)}&lang=en");
				using JsonDocument document = await SendJsonAsync(request, cancellationToken);
				MarketSubListEntry[] entries = ParseSubList(document.RootElement, 0)
					.Where(entry => entry.ItemId > 0
						&& entry.TradeCount is >= 0
						&& entry.MainCategory == mainCategory
						&& entry.SubCategory == subCategory)
					.GroupBy(entry => entry.ItemId)
					.Select(group => group.First())
					.OrderBy(entry => entry.ItemId)
					.ToArray();
				int minimumCount = subCategory == 1
					? MinimumValidatedOutfitCategoryOneCount
					: MinimumValidatedOutfitCategoryTwoCount;
				if (entries.Length < minimumCount)
				{
					throw new InvalidDataException(
						$"Arsha GetWorldMarketList returned an incomplete or mislabelled outfit category {subCategory} response ({entries.Length.ToString(CultureInfo.InvariantCulture)} valid items).");
				}
				return entries
					.Select(entry => ToPrice(entry, null, "arsha-category-cache", captured))
					.ToArray();
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex) when (attempt < AnalyticsBatchAttempts && (IsEndpointUnavailable(ex) || ex is InvalidDataException))
			{
				TimeSpan delay = TimeSpan.FromMilliseconds(400);
				logger.Warn($"Arsha GetWorldMarketList {region.ToUpperInvariant()} outfit category {subCategory} retrying after upstream failure: {ex.Message}");
				await Task.Delay(delay, cancellationToken);
			}
		}

		throw new InvalidDataException($"Arsha GetWorldMarketList did not return a usable outfit category {subCategory} response.");
	}

	private async Task<IReadOnlyList<GrindMarketPrice>> FetchAnalyticsBatchAsync(
		long[] itemIds,
		string region,
		DateTimeOffset captured,
		AnalyticsRecoveryContext recovery,
		CancellationToken cancellationToken)
	{
		try
		{
			return await FetchArshaSubListBatchAsync(itemIds, region, captured, AnalyticsBatchAttempts, cancellationToken);
		}
		catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
		{
			throw;
		}
		catch (Exception ex) when (CanSplitAnalyticsFailure(ex) && itemIds.Length > 1)
		{
			logger.Warn($"Arsha GetWorldMarketSubList {region.ToUpperInvariant()} analytics batch contained an unusable item; attempting bounded recovery.");
			if (!await IsAnalyticsProviderHealthyAsync(region, captured, recovery, cancellationToken))
			{
				logger.Warn($"Arsha GetWorldMarketSubList {region.ToUpperInvariant()} analytics recovery stopped because the provider health probe failed.");
				return Array.Empty<GrindMarketPrice>();
			}
			return await RecoverFailedAnalyticsBatchAsync(itemIds, region, captured, recovery, cancellationToken);
		}
	}

	private async Task<bool> IsAnalyticsProviderHealthyAsync(
		string region,
		DateTimeOffset captured,
		AnalyticsRecoveryContext recovery,
		CancellationToken cancellationToken)
	{
		if (!recovery.TryTakeRequest())
		{
			logger.Warn($"Arsha GetWorldMarketSubList {region.ToUpperInvariant()} analytics recovery request budget was exhausted.");
			return false;
		}

		try
		{
			IReadOnlyList<GrindMarketPrice> probe = await FetchArshaSubListBatchAsync(
				[AnalyticsHealthProbeItemId],
				region,
				captured,
				1,
				cancellationToken);
			return probe.Any(price => price.ItemId == AnalyticsHealthProbeItemId);
		}
		catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
		{
			throw;
		}
		catch (Exception ex) when (IsProviderFailure(ex))
		{
			logger.Warn($"Arsha GetWorldMarketSubList {region.ToUpperInvariant()} analytics health probe failed: {ex.Message}");
			return false;
		}
	}

	private async Task<IReadOnlyList<GrindMarketPrice>> RecoverFailedAnalyticsBatchAsync(
		long[] failedIds,
		string region,
		DateTimeOffset captured,
		AnalyticsRecoveryContext recovery,
		CancellationToken cancellationToken)
	{
		if (failedIds.Length <= 1)
		{
			if (failedIds.Length == 1)
			{
				logger.Warn($"Arsha GetWorldMarketSubList {region.ToUpperInvariant()} analytics sweep skipped item {failedIds[0].ToString(CultureInfo.InvariantCulture)}.");
			}
			return Array.Empty<GrindMarketPrice>();
		}

		int middle = failedIds.Length / 2;
		long[][] children = [failedIds.Take(middle).ToArray(), failedIds.Skip(middle).ToArray()];
		List<GrindMarketPrice> recovered = new();
		List<long[]> stillFailing = new();
		foreach (long[] child in children)
		{
			if (!recovery.TryTakeRequest())
			{
				logger.Warn($"Arsha GetWorldMarketSubList {region.ToUpperInvariant()} analytics recovery request budget was exhausted with {failedIds.Length.ToString(CultureInfo.InvariantCulture)} items still unresolved.");
				break;
			}

			try
			{
				recovered.AddRange(await FetchArshaSubListBatchAsync(child, region, captured, 1, cancellationToken));
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex) when (CanSplitAnalyticsFailure(ex))
			{
				stillFailing.Add(child);
			}
			catch (Exception ex) when (IsProviderFailure(ex))
			{
				logger.Warn($"Arsha GetWorldMarketSubList {region.ToUpperInvariant()} analytics recovery paused after an upstream failure. Cached samples remain available. {ex.Message}");
				return recovered;
			}
		}

		foreach (long[] child in stillFailing)
		{
			recovered.AddRange(await RecoverFailedAnalyticsBatchAsync(child, region, captured, recovery, cancellationToken));
		}
		return recovered;
	}

	private async Task<JsonDocument> SendJsonAsync(HttpRequestMessage request, CancellationToken cancellationToken)
	{
		using HttpResponseMessage response = await client.SendAsync(request, cancellationToken);
		string text = await response.Content.ReadAsStringAsync(cancellationToken);
		if (!response.IsSuccessStatusCode)
		{
			throw new HttpRequestException(
				$"Market provider returned {(int)response.StatusCode} {response.ReasonPhrase}: {Truncate(text)}",
				null,
				response.StatusCode);
		}
		return JsonDocument.Parse(text);
	}

	private static GrindMarketPrice ToPrice(MarketSubListEntry entry, long? lowestOrder, string source, DateTimeOffset captured)
	{
		long? lowestListed = lowestOrder
			?? (entry.Stock.GetValueOrDefault() > 0 ? entry.LowestListedPrice : null);
		long price = lowestListed
			?? entry.BasePrice
			?? entry.LastSoldPrice
			?? 0L;
		return new GrindMarketPrice(
			entry.ItemId,
			entry.Enhancement,
			entry.Name,
			Math.Max(0, price),
			lowestListed,
			entry.BasePrice,
			entry.LastSoldPrice,
			entry.Stock,
			entry.TradeCount,
			source,
			captured);
	}

	private static IReadOnlyList<MarketSubListEntry> ParseSubList(JsonElement root, long requestedItemId)
	{
		List<MarketSubListEntry> entries = new();
		foreach (JsonElement item in EnumerateSubListItems(root))
		{
			MarketSubListEntry entry = ParseSubListItem(item, requestedItemId);
			if (entry.ItemId > 0)
			{
				entries.Add(entry);
			}
		}

		if (entries.Count == 0 && root.ValueKind == JsonValueKind.Object && root.TryGetProperty("resultMsg", out JsonElement resultMsg))
		{
			string raw = resultMsg.GetString() ?? string.Empty;
			foreach (string row in raw.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
			{
				string[] parts = row.Split('-', StringSplitOptions.TrimEntries);
				if (parts.Length < 9 || !long.TryParse(parts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out long itemId))
				{
					continue;
				}
				int enhancement = TryParseInt(parts.ElementAtOrDefault(1)) ?? 0;
				long? basePrice = TryParseLong(parts.ElementAtOrDefault(3));
				long? stock = TryParseLong(parts.ElementAtOrDefault(4));
				long? tradeCount = TryParseLong(parts.ElementAtOrDefault(5));
				long? lastSold = TryParseLong(parts.ElementAtOrDefault(8));
				entries.Add(new MarketSubListEntry(itemId, enhancement, "", null, basePrice, lastSold, stock, tradeCount, null, null));
			}
		}

		return entries
			.Where(entry => requestedItemId <= 0 || entry.ItemId == requestedItemId)
			.OrderBy(entry => entry.Enhancement == 0 ? 0 : 1)
			.ThenBy(entry => entry.Enhancement)
			.ToArray();
	}

	private static IEnumerable<JsonElement> EnumerateSubListItems(JsonElement root)
	{
		if (root.ValueKind == JsonValueKind.Array)
		{
			foreach (JsonElement item in root.EnumerateArray())
			{
				if (item.ValueKind == JsonValueKind.Array)
				{
					foreach (JsonElement nestedItem in item.EnumerateArray())
					{
						yield return nestedItem;
					}
				}
				else
				{
					yield return item;
				}
			}
			yield break;
		}

		if (root.ValueKind != JsonValueKind.Object)
		{
			yield break;
		}

		if (root.TryGetProperty("resultMsg", out JsonElement resultMsg) && resultMsg.ValueKind == JsonValueKind.String)
		{
			string raw = resultMsg.GetString() ?? string.Empty;
			string trimmed = raw.TrimStart();
			if (trimmed.StartsWith("[", StringComparison.Ordinal) || trimmed.StartsWith("{", StringComparison.Ordinal))
			{
				using JsonDocument nested = JsonDocument.Parse(raw);
				foreach (JsonElement item in EnumerateSubListItems(nested.RootElement))
				{
					yield return item;
				}
				yield break;
			}
		}

		string[] arrayNames = ["detailList", "data", "items", "list", "result", "results"];
		foreach (string name in arrayNames)
		{
			if (root.TryGetProperty(name, out JsonElement array) && array.ValueKind == JsonValueKind.Array)
			{
				foreach (JsonElement item in array.EnumerateArray())
				{
					yield return item;
				}
				yield break;
			}
		}

		if (GetLong(root, "id", "itemId", "mainKey", "main_key").HasValue)
		{
			yield return root;
		}
	}

	private static MarketSubListEntry ParseSubListItem(JsonElement item, long requestedItemId)
	{
		long itemId = GetLong(item, "id", "itemId", "mainKey", "main_key") ?? requestedItemId;
		int enhancement = (int)(GetLong(item, "sid", "subId", "subKey", "sub_key", "enhancement", "minEnhance") ?? 0);
		string name = GetString(item, "name", "itemName") ?? string.Empty;
		long? stock = GetLong(item, "amountListed", "currentStock", "stock", "count", "listedCount", "sellCount");
		long? lowest = GetLong(item, "lowestListedPrice", "lowestPrice", "minListedPrice", "pricePerOne");
		long? basePrice = GetLong(item, "basePrice", "currentPrice", "price", "minPrice");
		long? lastSoldPrice = GetLong(item, "lastSoldPrice", "lastPrice");
		long? tradeCount = GetLong(item, "totalTrades", "tradeCount");
		int? mainCategory = (int?)GetLong(item, "mainCategory", "main_category");
		int? subCategory = (int?)GetLong(item, "subCategory", "sub_category");
		return new MarketSubListEntry(itemId, enhancement, name, lowest, basePrice, lastSoldPrice, stock, tradeCount, mainCategory, subCategory);
	}

	private static bool IsEndpointUnavailable(Exception ex)
	{
		return ex is TaskCanceledException
			|| ex is HttpRequestException { StatusCode: System.Net.HttpStatusCode.TooManyRequests }
			|| ex is HttpRequestException { StatusCode: >= System.Net.HttpStatusCode.InternalServerError }
			|| ex.Message.Contains("503", StringComparison.OrdinalIgnoreCase)
			|| ex.Message.Contains("timeout", StringComparison.OrdinalIgnoreCase)
			|| ex.Message.Contains("could not be reached", StringComparison.OrdinalIgnoreCase)
			|| ex.Message.Contains("connect error", StringComparison.OrdinalIgnoreCase);
	}

	private static bool CanSplitArshaFailure(Exception ex)
	{
		return ex is InvalidDataException
			|| ex is HttpRequestException
			{
				StatusCode: System.Net.HttpStatusCode.BadRequest
					or System.Net.HttpStatusCode.RequestEntityTooLarge
					or System.Net.HttpStatusCode.RequestUriTooLong
					or System.Net.HttpStatusCode.UnprocessableEntity
			};
	}

	private static bool CanSplitAnalyticsFailure(Exception ex)
	{
		if (CanSplitArshaFailure(ex))
		{
			return true;
		}

		return ex is HttpRequestException { StatusCode: System.Net.HttpStatusCode.InternalServerError }
			&& (ex.Message.Contains("invalid data", StringComparison.OrdinalIgnoreCase)
				|| ex.Message.Contains("invalid value", StringComparison.OrdinalIgnoreCase)
				|| ex.Message.Contains("\"code\":103", StringComparison.OrdinalIgnoreCase));
	}

	private static bool IsProviderFailure(Exception ex)
	{
		return ex is HttpRequestException or TaskCanceledException or JsonException or InvalidDataException or UnauthorizedAccessException;
	}

	private static long? GetLong(JsonElement element, params string[] propertyNames)
	{
		if (element.ValueKind != JsonValueKind.Object)
		{
			return null;
		}

		foreach (string propertyName in propertyNames)
		{
			if (!element.TryGetProperty(propertyName, out JsonElement value))
			{
				continue;
			}
			if (value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out long number))
			{
				return number;
			}
			if (value.ValueKind == JsonValueKind.String && long.TryParse(value.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out number))
			{
				return number;
			}
		}
		return null;
	}

	private static string? GetString(JsonElement element, params string[] propertyNames)
	{
		if (element.ValueKind != JsonValueKind.Object)
		{
			return null;
		}

		foreach (string propertyName in propertyNames)
		{
			if (element.TryGetProperty(propertyName, out JsonElement value))
			{
				return value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
			}
		}
		return null;
	}

	private static int? TryParseInt(string? value)
	{
		return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out int parsed) ? parsed : null;
	}

	private static long? TryParseLong(string? value)
	{
		return long.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out long parsed) ? parsed : null;
	}

	private static string NormalizeRegion(string region)
	{
		return "eu";
	}

	private static string Truncate(string value)
	{
		return value.Length <= 180 ? value : value[..180] + "...";
	}

	public void Dispose()
	{
		bdoAlertsClient?.Dispose();
		client.Dispose();
	}

	private readonly record struct MarketSubListEntry(
		long ItemId,
		int Enhancement,
		string Name,
		long? LowestListedPrice,
		long? BasePrice,
		long? LastSoldPrice,
		long? Stock,
		long? TradeCount,
		int? MainCategory,
		int? SubCategory);

	private sealed class AnalyticsRecoveryContext
	{
		private int remainingRequests;

		public AnalyticsRecoveryContext(int requestBudget)
		{
			remainingRequests = requestBudget;
		}

		public bool TryTakeRequest()
		{
			if (remainingRequests <= 0)
			{
				return false;
			}

			remainingRequests--;
			return true;
		}
	}
}
