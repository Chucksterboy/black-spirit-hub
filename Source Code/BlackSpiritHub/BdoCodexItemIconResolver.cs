using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal sealed class BdoCodexItemIconResolver : IDisposable
{
	private const string SearchEndpoint = "https://bdocodex.com/ac.php";
	private const string SourceName = "BDO Codex";
	private static readonly TimeSpan MissingEntryTtl = TimeSpan.FromDays(7);
	private static readonly Uri BaseUri = new("https://bdocodex.com/");
	private static readonly Regex EventPrefix = new(
		@"^\[Event\]\s*",
		RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
	private static readonly Regex Whitespace = new(
		@"\s+",
		RegexOptions.CultureInvariant);
	private static readonly HashSet<string> AllowedImageExtensions =
		new(StringComparer.OrdinalIgnoreCase)
		{
			".webp",
			".png",
			".jpg",
			".jpeg"
		};
	private static readonly JsonSerializerOptions JsonOptions = new()
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
		PropertyNameCaseInsensitive = true,
		WriteIndented = true
	};

	private readonly AppPaths paths;
	private readonly AppLogger logger;
	private readonly HttpClient http;

	public BdoCodexItemIconResolver(AppPaths paths, AppLogger logger)
	{
		this.paths = paths;
		this.logger = logger;
		http = new HttpClient(new HttpClientHandler
		{
			AllowAutoRedirect = false
		})
		{
			Timeout = TimeSpan.FromSeconds(5),
			MaxResponseContentBufferSize = 512 * 1024
		};
		http.DefaultRequestHeaders.UserAgent.ParseAdd(
			"Black-Spirit-Hub/" + AppVersion.Current.TrimStart('v', 'V')
			+ " (+exact item icon resolver)");
		http.DefaultRequestHeaders.Accept.ParseAdd(
			"application/json,text/plain;q=0.9,*/*;q=0.5");
		http.DefaultRequestHeaders.Referrer = BaseUri;
	}

	public async Task<List<CouponEntry>> ResolveAsync(
		IEnumerable<CouponEntry> coupons,
		CancellationToken cancellationToken,
		bool allowNetwork = true)
	{
		List<CouponEntry> couponList = coupons.ToList();
		BdoCodexItemIconCache cache =
			await AtomicFile.ReadJsonAsync<BdoCodexItemIconCache>(
				paths.CouponItemIconsPath,
				JsonOptions,
				cancellationToken)
			?? new BdoCodexItemIconCache(
				1,
				new Dictionary<string, BdoCodexItemIconCacheEntry>(
					StringComparer.OrdinalIgnoreCase));
		Dictionary<string, BdoCodexItemIconCacheEntry> entries =
			cache.SchemaVersion == 1 && cache.Items is not null
				? new(cache.Items, StringComparer.OrdinalIgnoreCase)
				: new(StringComparer.OrdinalIgnoreCase);
		bool cacheChanged = cache.SchemaVersion != 1 || cache.Items is null;
		DateTimeOffset now = DateTimeOffset.UtcNow;

		string[] itemNames = couponList
			.SelectMany(coupon => coupon.Rewards)
			.Select(reward => NormalizeDisplayName(reward.ItemName))
			.Where(IsConcreteRewardName)
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.ToArray();
		if (!allowNetwork)
		{
			itemNames = [];
		}
		foreach (string itemName in itemNames)
		{
			cancellationToken.ThrowIfCancellationRequested();
			string key = NormalizeForMatch(itemName);
			if (key.Length == 0)
				continue;
			if (entries.TryGetValue(key, out BdoCodexItemIconCacheEntry? cached)
				&& (cached.Found || now - cached.CheckedAtUtc < MissingEntryTtl))
			{
				continue;
			}

			BdoCodexItemIconCacheEntry? resolved =
				await ResolveOneAsync(itemName, now, cancellationToken);
			if (resolved is null)
			{
				logger.Warn(
					"BDO Codex item icon enrichment paused after a transient lookup failure.");
				break;
			}
			entries[key] = resolved;
			cacheChanged = true;
			if (itemName != itemNames[^1])
				await Task.Delay(125, cancellationToken);
		}

		if (cacheChanged)
		{
			BdoCodexItemIconCache updated = new(1, entries);
			await AtomicFile.WriteAllTextAsync(
				paths.CouponItemIconsPath,
				JsonSerializer.Serialize(updated, JsonOptions),
				cancellationToken);
		}

		return couponList.Select(coupon => coupon with
		{
			Rewards = coupon.Rewards.Select(reward =>
			{
				string key = NormalizeForMatch(reward.ItemName);
				if (!entries.TryGetValue(key, out BdoCodexItemIconCacheEntry? match)
					|| !match.Found)
				{
					return reward;
				}
				return reward with
				{
					IconUrl = match.IconUrl,
					IconFileName = match.IconFileName,
					IconSource = SourceName,
					IconSourceUrl = match.SourceUrl
				};
			}).ToList()
		}).ToList();
	}

	private async Task<BdoCodexItemIconCacheEntry?> ResolveOneAsync(
		string itemName,
		DateTimeOffset checkedAtUtc,
		CancellationToken cancellationToken)
	{
		try
		{
			Uri source = new(
				$"{SearchEndpoint}?l=us&term={Uri.EscapeDataString(itemName)}");
			using HttpRequestMessage request = new(HttpMethod.Get, source);
			using HttpResponseMessage response = await http.SendAsync(
				request,
				HttpCompletionOption.ResponseContentRead,
				cancellationToken);
			if (!response.IsSuccessStatusCode)
			{
				logger.Warn(
					$"BDO Codex item lookup returned HTTP {(int)response.StatusCode} for '{itemName}'.");
				return null;
			}
			string json = await response.Content.ReadAsStringAsync(cancellationToken);
			BdoCodexItemIconMatch? match = ParseExactMatch(itemName, json);
			if (match is null)
			{
				logger.Info($"No exact BDO Codex item icon match for '{itemName}'.");
				return Missing(itemName, checkedAtUtc);
			}
			return new BdoCodexItemIconCacheEntry(
				itemName,
				match.ItemName,
				match.ItemId,
				match.IconUrl,
				match.IconFileName,
				match.SourceUrl,
				checkedAtUtc,
				true);
		}
		catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
		{
			throw;
		}
		catch (Exception ex) when (
			ex is HttpRequestException
			or TaskCanceledException
			or JsonException
			or InvalidDataException)
		{
			logger.Warn($"BDO Codex item lookup failed for '{itemName}': {ex.Message}");
			return null;
		}
	}

	private static BdoCodexItemIconCacheEntry Missing(
		string itemName,
		DateTimeOffset checkedAtUtc)
	{
		return new BdoCodexItemIconCacheEntry(
			itemName,
			"",
			null,
			"",
			"",
			"",
			checkedAtUtc,
			false);
	}

	internal static BdoCodexItemIconMatch? ParseExactMatchForTest(
		string itemName,
		string json)
	{
		return ParseExactMatch(itemName, json);
	}

	internal static string NormalizeItemNameForTest(string itemName)
	{
		return NormalizeForMatch(itemName);
	}

	private static BdoCodexItemIconMatch? ParseExactMatch(
		string itemName,
		string json)
	{
		string expected = NormalizeForMatch(itemName);
		if (expected.Length == 0)
			return null;
		string cleanJson = json.TrimStart('\uFEFF', ' ', '\t', '\r', '\n');
		List<BdoCodexAutocompleteEntry>? results =
			JsonSerializer.Deserialize<List<BdoCodexAutocompleteEntry>>(
				cleanJson,
				JsonOptions);
		if (results is null)
			return null;

		foreach (BdoCodexAutocompleteEntry result in results
			.Where(entry => NormalizeForMatch(entry.Name) == expected)
			.OrderBy(entry => EventPrefix.IsMatch(
				entry.Name ?? string.Empty) ? 1 : 0))
		{
			if (!string.Equals(
					result.LinkType,
					"item",
					StringComparison.OrdinalIgnoreCase)
				|| !string.Equals(
					result.ObjectType,
					"Item",
					StringComparison.OrdinalIgnoreCase)
				|| result.Value <= 0
				|| !TryBuildIconUri(
					result.IconPath,
					result.Icon,
					out Uri? iconUri))
			{
				continue;
			}
			string extension = Path.GetExtension(iconUri.AbsolutePath);
			return new BdoCodexItemIconMatch(
				result.Value,
				NormalizeDisplayName(result.Name),
				iconUri.AbsoluteUri,
				$"bdocodex-{result.Value.ToString(CultureInfo.InvariantCulture)}{extension.ToLowerInvariant()}",
				new Uri(BaseUri, $"us/item/{result.Value.ToString(CultureInfo.InvariantCulture)}/").AbsoluteUri);
		}
		return null;
	}

	private static bool TryBuildIconUri(
		string? iconPath,
		string? icon,
		out Uri? iconUri)
	{
		iconUri = null;
		if (string.IsNullOrWhiteSpace(iconPath)
			|| string.IsNullOrWhiteSpace(icon))
		{
			return false;
		}
		string path = icon.Replace('\\', '/').TrimStart('/');
		if (!string.Equals(iconPath, "items", StringComparison.OrdinalIgnoreCase)
			|| path.Length == 0
			|| path.Contains("..", StringComparison.Ordinal)
			|| path.Contains("?", StringComparison.Ordinal)
			|| path.Contains("#", StringComparison.Ordinal)
			|| !AllowedImageExtensions.Contains(Path.GetExtension(path)))
		{
			return false;
		}
		Uri candidate = new(BaseUri, "items/" + path);
		if (candidate.Scheme != Uri.UriSchemeHttps
			|| !candidate.Host.Equals(
				BaseUri.Host,
				StringComparison.OrdinalIgnoreCase)
			|| !candidate.AbsolutePath.StartsWith(
				"/items/",
				StringComparison.OrdinalIgnoreCase))
		{
			return false;
		}
		iconUri = candidate;
		return true;
	}

	private static string NormalizeDisplayName(string? value)
	{
		return Whitespace.Replace(
			(value ?? string.Empty).Normalize(NormalizationForm.FormKC),
			" ").Trim();
	}

	private static string NormalizeForMatch(string? value)
	{
		string normalized = NormalizeDisplayName(value);
		normalized = EventPrefix.Replace(normalized, "");
		return normalized.ToUpperInvariant();
	}

	private static bool IsConcreteRewardName(string itemName)
	{
		return itemName.Length > 0
			&& !itemName.Equals(
				"Reward details available on BDO Alerts",
				StringComparison.OrdinalIgnoreCase)
			&& !itemName.Equals(
				"Official BDO coupon reward",
				StringComparison.OrdinalIgnoreCase)
			&& !itemName.Equals(
				"Unknown reward",
				StringComparison.OrdinalIgnoreCase);
	}

	public void Dispose()
	{
		http.Dispose();
	}
}

internal sealed record BdoCodexItemIconCache(
	int SchemaVersion,
	Dictionary<string, BdoCodexItemIconCacheEntry>? Items);

internal sealed record BdoCodexItemIconCacheEntry(
	string QueryName,
	string MatchedName,
	int? ItemId,
	string IconUrl,
	string IconFileName,
	string SourceUrl,
	DateTimeOffset CheckedAtUtc,
	bool Found);

internal sealed record BdoCodexItemIconMatch(
	int ItemId,
	string ItemName,
	string IconUrl,
	string IconFileName,
	string SourceUrl);

internal sealed record BdoCodexAutocompleteEntry(
	[property: JsonPropertyName("value")] int Value,
	[property: JsonPropertyName("name")] string? Name,
	[property: JsonPropertyName("link_type")] string? LinkType,
	[property: JsonPropertyName("icon")] string? Icon,
	[property: JsonPropertyName("icon_path")] string? IconPath,
	[property: JsonPropertyName("object_type")] string? ObjectType);
