using System;
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

internal sealed record BdoAlertsMarketSnapshot(
	DateTimeOffset CapturedUtc,
	IReadOnlyList<GrindMarketPrice> Prices,
	string Provider);

internal sealed class BdoAlertsCentralMarketClient : IDisposable
{
	private static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(12);
	private const long MaxResponseBytes = 12 * 1024 * 1024;
	private const int MinimumValidatedPearlShopCount = 1500;
	private const double MinimumPositivePearlShopTradeRatio = 0.90;
	private const int MaximumPriceHistoryIds = 100;

	private readonly HttpClient client;
	private readonly AppLogger logger;
	private readonly string? apiKeyOverride;

	public BdoAlertsCentralMarketClient(AppLogger logger)
		: this(
			logger,
			new HttpClientHandler
			{
				AllowAutoRedirect = false
			},
			null)
	{
	}

	internal BdoAlertsCentralMarketClient(
		AppLogger logger,
		HttpMessageHandler handler,
		string? apiKey)
	{
		this.logger = logger;
		apiKeyOverride = apiKey;
		client = new HttpClient(handler);
		client.Timeout = RequestTimeout;
		client.MaxResponseContentBufferSize = MaxResponseBytes;
		client.DefaultRequestHeaders.UserAgent.Add(
			new ProductInfoHeaderValue(
				"Black-Spirit-Hub",
				AppVersion.Current.TrimStart('v', 'V')));
		client.DefaultRequestHeaders.Accept.Add(
			new MediaTypeWithQualityHeaderValue("application/json"));
	}

	internal bool IsConfigured => ResolveApiKey() is not null;

	internal async Task<BdoAlertsMarketSnapshot> GetCurrentPricesAsync(
		IEnumerable<long> itemIds,
		string region,
		CancellationToken cancellationToken)
	{
		string normalizedRegion = NormalizeRegion(region);
		long[] ids = itemIds
			.Where(id => id > 0)
			.Distinct()
			.OrderBy(id => id)
			.ToArray();
		if (ids.Length == 0)
		{
			return new BdoAlertsMarketSnapshot(
				DateTimeOffset.UtcNow,
				Array.Empty<GrindMarketPrice>(),
				"BDO Alerts Central Market");
		}
		if (ids.Length > MaximumPriceHistoryIds)
		{
			throw new ArgumentOutOfRangeException(
				nameof(itemIds),
				$"A BDO Alerts price-history request supports at most {MaximumPriceHistoryIds.ToString(CultureInfo.InvariantCulture)} unique item IDs.");
		}

		string csv = string.Join(",", ids.Select(id => id.ToString(CultureInfo.InvariantCulture)));
		Uri endpoint = new(
			$"https://api.bdoalerts.net/api/market/price-history?item_ids={csv}&region={normalizedRegion}&days=1");
		using HttpRequestMessage request = CreateAuthenticatedGet(endpoint);
		using JsonDocument document = await SendJsonAsync(request, cancellationToken);
		BdoAlertsMarketSnapshot snapshot = ParsePriceHistory(
			document.RootElement,
			ids,
			normalizedRegion,
			DateTimeOffset.UtcNow);
		logger.Info(
			$"BDO Alerts {normalizedRegion.ToUpperInvariant()} price history returned {snapshot.Prices.Count.ToString(CultureInfo.InvariantCulture)}/{ids.Length.ToString(CultureInfo.InvariantCulture)} current grind prices in one cached request.");
		return snapshot;
	}

	private HttpRequestMessage CreateAuthenticatedGet(Uri endpoint)
	{
		HttpRequestMessage request = new(HttpMethod.Get, endpoint);
		string? apiKey = ResolveApiKey();
		if (!BdoAlertsApiCredentials.TryApply(request, endpoint, apiKey))
		{
			request.Dispose();
			throw new UnauthorizedAccessException(
				"The BDO Alerts API key is unavailable or the market endpoint is not approved.");
		}
		return request;
	}

	private string? ResolveApiKey()
	{
		return apiKeyOverride ?? BdoAlertsApiCredentials.Resolve();
	}

	private async Task<JsonDocument> SendJsonAsync(
		HttpRequestMessage request,
		CancellationToken cancellationToken)
	{
		using HttpResponseMessage response = await client.SendAsync(
			request,
			HttpCompletionOption.ResponseHeadersRead,
			cancellationToken);
		if (!response.IsSuccessStatusCode)
		{
			throw new HttpRequestException(
				$"BDO Alerts market request returned {(int)response.StatusCode} {response.ReasonPhrase}.",
				null,
				response.StatusCode);
		}
		if (response.Content.Headers.ContentLength is > MaxResponseBytes)
		{
			throw new InvalidDataException("BDO Alerts market response exceeded the allowed size.");
		}

		await using Stream stream = await response.Content.ReadAsStreamAsync(cancellationToken);
		using MemoryStream buffer = new();
		byte[] bytes = new byte[64 * 1024];
		while (true)
		{
			int read = await stream.ReadAsync(bytes.AsMemory(0, bytes.Length), cancellationToken);
			if (read == 0)
			{
				break;
			}
			if (buffer.Length + read > MaxResponseBytes)
			{
				throw new InvalidDataException("BDO Alerts market response exceeded the allowed size.");
			}
			await buffer.WriteAsync(bytes.AsMemory(0, read), cancellationToken);
		}
		buffer.Position = 0;
		return await JsonDocument.ParseAsync(buffer, cancellationToken: cancellationToken);
	}

	internal static BdoAlertsMarketSnapshot ParsePriceHistory(
		JsonElement root,
		IReadOnlyCollection<long> requestedIds,
		string region,
		DateTimeOffset fallbackCapturedUtc)
	{
		if (root.ValueKind != JsonValueKind.Object
			|| GetBoolean(root, "success") != true
			|| !string.Equals(GetString(root, "region"), region, StringComparison.OrdinalIgnoreCase)
			|| !root.TryGetProperty("items", out JsonElement items)
			|| items.ValueKind != JsonValueKind.Array)
		{
			throw new InvalidDataException("BDO Alerts price history returned an invalid response.");
		}
		long? declaredCount = GetLong(root, "total_items");
		if (declaredCount.HasValue && declaredCount.Value != items.GetArrayLength())
		{
			throw new InvalidDataException("BDO Alerts price history returned a mismatched item count.");
		}

		HashSet<long> requested = requestedIds.ToHashSet();
		Dictionary<long, GrindMarketPrice> prices = new();
		foreach (JsonElement item in items.EnumerateArray())
		{
			long itemId = GetLong(item, "item_id", "itemId") ?? 0;
			if (!requested.Contains(itemId))
			{
				continue;
			}
			long? price = GetLong(item, "current_price", "price");
			long? stock = GetLong(item, "current_stock", "stock");
			string name = GetString(item, "item_name", "name")?.Trim() ?? string.Empty;
			if (price is null or <= 0 || stock is < 0 || name.Length == 0)
			{
				continue;
			}

			DateTimeOffset captured = GetDateTimeOffset(item, "last_updated")
				?? fallbackCapturedUtc;
			GrindMarketPrice mapped = new(
				itemId,
				(int)(GetLong(item, "sub_key", "subKey") ?? 0),
				name,
				price.Value,
				null,
				price,
				null,
				stock,
				null,
				"bdoalerts-price-history",
				captured);
			if (prices.TryGetValue(itemId, out GrindMarketPrice? existing)
				&& existing != mapped)
			{
				throw new InvalidDataException("BDO Alerts price history returned conflicting duplicate items.");
			}
			prices[itemId] = mapped;
		}

		DateTimeOffset snapshotTime = prices.Count == 0
			? fallbackCapturedUtc
			: prices.Values.Max(price => price.CapturedUtc);
		return new BdoAlertsMarketSnapshot(
			snapshotTime,
			prices.Values.OrderBy(price => price.ItemId).ToArray(),
			"BDO Alerts Central Market");
	}

	internal static BdoAlertsMarketSnapshot ParsePearlShop(
		JsonElement root,
		IReadOnlyCollection<long> requestedIds,
		string region,
		DateTimeOffset fallbackCapturedUtc)
	{
		if (root.ValueKind != JsonValueKind.Object
			|| !string.Equals(GetString(root, "region"), region, StringComparison.OrdinalIgnoreCase)
			|| !root.TryGetProperty("items", out JsonElement items)
			|| items.ValueKind != JsonValueKind.Array)
		{
			throw new InvalidDataException("BDO Alerts pearl-shop market returned an invalid response.");
		}

		Dictionary<long, GrindMarketPrice> all = new();
		DateTimeOffset captured = GetDateTimeOffset(root, "scraped_at", "last_updated")
			?? fallbackCapturedUtc;
		foreach (JsonElement item in items.EnumerateArray())
		{
			long itemId = GetLong(item, "item_id", "itemId") ?? 0;
			long? price = GetLong(item, "price", "current_price");
			long? stock = GetLong(item, "stock", "current_stock");
			long? trades = GetLong(item, "total_trades", "totalTrades");
			string name = GetString(item, "name", "item_name")?.Trim() ?? string.Empty;
			if (itemId <= 0
				|| price is null or <= 0
				|| stock is < 0
				|| trades is null or < 0
				|| name.Length == 0)
			{
				continue;
			}

			GrindMarketPrice mapped = new(
				itemId,
				(int)(GetLong(item, "sub_key", "subKey") ?? 0),
				name,
				price.Value,
				null,
				price,
				null,
				stock,
				trades,
				"bdoalerts-pearlshop-cache",
				captured);
			if (all.TryGetValue(itemId, out GrindMarketPrice? existing)
				&& existing != mapped)
			{
				throw new InvalidDataException("BDO Alerts pearl-shop market returned conflicting duplicate items.");
			}
			all[itemId] = mapped;
		}

		long? declaredCount = GetLong(root, "total_items", "count");
		if (all.Count < MinimumValidatedPearlShopCount
			|| declaredCount is < MinimumValidatedPearlShopCount)
		{
			throw new InvalidDataException(
				$"BDO Alerts pearl-shop snapshot was incomplete ({all.Count.ToString(CultureInfo.InvariantCulture)} valid unique items).");
		}

		long[] requested = requestedIds.Where(id => id > 0).Distinct().ToArray();
		if (requested.Any(id => !all.ContainsKey(id)))
		{
			throw new InvalidDataException("BDO Alerts pearl-shop snapshot did not cover the complete requested outfit catalog.");
		}
		int positiveTradeCounters = requested.Count(
			id => all[id].TradeCount.GetValueOrDefault() > 0);
		if (positiveTradeCounters < Math.Ceiling(requested.Length * MinimumPositivePearlShopTradeRatio))
		{
			throw new InvalidDataException(
				"BDO Alerts pearl-shop trade counters are unavailable or incompatible with the cumulative sales series.");
		}

		return new BdoAlertsMarketSnapshot(
			captured,
			requested.Select(id => all[id]).OrderBy(price => price.ItemId).ToArray(),
			"BDO Alerts Central Market");
	}

	private static string NormalizeRegion(string region)
	{
		return "eu";
	}

	private static long? GetLong(JsonElement element, params string[] names)
	{
		if (element.ValueKind != JsonValueKind.Object)
		{
			return null;
		}
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

	private static bool? GetBoolean(JsonElement element, string name)
	{
		if (element.ValueKind != JsonValueKind.Object
			|| !element.TryGetProperty(name, out JsonElement value))
		{
			return null;
		}
		if (value.ValueKind is JsonValueKind.True or JsonValueKind.False)
		{
			return value.GetBoolean();
		}
		return null;
	}

	private static string? GetString(JsonElement element, params string[] names)
	{
		if (element.ValueKind != JsonValueKind.Object)
		{
			return null;
		}
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

	private static DateTimeOffset? GetDateTimeOffset(JsonElement element, params string[] names)
	{
		string? value = GetString(element, names);
		return DateTimeOffset.TryParse(
			value,
			CultureInfo.InvariantCulture,
			DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
			out DateTimeOffset parsed)
			? parsed
			: null;
	}

	public void Dispose()
	{
		client.Dispose();
	}
}
