using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal sealed class CouponService : IDisposable
{
	private const string SourceUrl = "https://api.bdoalerts.net/api/coupons";
	private const string OfficialSourceUrl = "https://www.naeu.playblackdesert.com/en-US/News/Detail?groupContentNo=5676";
	private const long MaxResponseBytes = 8 * 1024 * 1024;
	private static readonly string[] RegionPropertyNames =
	[
		"region",
		"regions",
		"server_region",
		"server_regions"
	];
	private static readonly string[] PlatformPropertyNames =
	[
		"platform",
		"platforms"
	];
	private static readonly HashSet<string> NaEuRegionTokens = new(StringComparer.Ordinal)
	{
		"NA",
		"EU",
		"NAEU",
		"EUNA",
		"NORTHAMERICA",
		"EUROPE",
		"GLOBAL",
		"WORLDWIDE",
		"ALL",
		"PCNA",
		"PCEU"
	};
	// Bootstrap snapshot from the official NA/EU coupon page. The live official
	// page and the persisted validation cache extend this set automatically.
	// Keeping a last-known-good snapshot lets a clean install remain functional
	// during Pearl Abyss website maintenance without accepting other regions.
	private static readonly HashSet<string> LastKnownVerifiedNaEuCouponCodes =
		new(StringComparer.OrdinalIgnoreCase)
		{
			"2026NAEUSHOWDOWN",
			"BECOMINGBRIGHTER",
			"BEYONDTHEJOURNEY",
			"FOURYEARSONETEAM",
			"LIGHTUPFOURYEARS",
			"TYALLADVENTURERS",
			"WESHINEASONETEAM"
		};
	private static readonly HashSet<string> PcPlatformTokens = new(StringComparer.Ordinal)
	{
		"PC",
		"BOTH",
		"ALL",
		"ANY",
		"CROSSPLATFORM",
		"MULTIPLATFORM"
	};
	private static readonly HashSet<string> KnownPlatformTokens = new(StringComparer.Ordinal)
	{
		"PC",
		"BOTH",
		"ALL",
		"ANY",
		"CROSSPLATFORM",
		"MULTIPLATFORM",
		"CONSOLE",
		"CONSOLENA",
		"CONSOLEEU",
		"XBOX",
		"PLAYSTATION",
		"PS4",
		"PS5"
	};
	private readonly AppPaths paths;
	private readonly AppLogger logger;
	private readonly HttpClient http;
	private readonly HttpClient officialHttp;
	private readonly HttpClient bdoAlertsHttp;
	private readonly BdoCodexItemIconResolver itemIconResolver;
	private readonly Dictionary<string, (DateTime LastWriteUtc, long Length, string DataUrl)> iconDataCache = new(StringComparer.OrdinalIgnoreCase);
	private static readonly JsonSerializerOptions JsonOptions = new()
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
		PropertyNameCaseInsensitive = true,
		WriteIndented = true
	};

	public CouponService(AppPaths paths, AppLogger logger)
	{
		this.paths = paths;
		this.logger = logger;
		http = new HttpClient(new HttpClientHandler
		{
			AllowAutoRedirect = false
		})
		{
			Timeout = TimeSpan.FromSeconds(20),
			MaxResponseContentBufferSize = MaxResponseBytes
		};
		http.DefaultRequestHeaders.UserAgent.ParseAdd("Black-Spirit-Hub/2.7 (+local read-only coupon tracker)");
		officialHttp = new HttpClient
		{
			Timeout = TimeSpan.FromSeconds(20),
			MaxResponseContentBufferSize = MaxResponseBytes
		};
		officialHttp.DefaultRequestHeaders.UserAgent.ParseAdd(
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36");
		officialHttp.DefaultRequestHeaders.Referrer =
			new Uri("https://www.naeu.playblackdesert.com/");
		officialHttp.DefaultRequestHeaders.Accept.ParseAdd(
			"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
		officialHttp.DefaultRequestHeaders.AcceptLanguage.ParseAdd(
			"en-US,en;q=0.9");
		bdoAlertsHttp = new HttpClient(new HttpClientHandler
		{
			AllowAutoRedirect = false
		})
		{
			Timeout = TimeSpan.FromSeconds(20),
			MaxResponseContentBufferSize = MaxResponseBytes
		};
		bdoAlertsHttp.DefaultRequestHeaders.UserAgent.ParseAdd(
			"Black-Spirit-Hub/" + AppVersion.Current.TrimStart('v', 'V'));
		itemIconResolver = new BdoCodexItemIconResolver(paths, logger);
	}

	public async Task<object> InitializeAsync(CancellationToken cancellationToken)
	{
		await EnsureSeedCacheAsync(cancellationToken);
		CouponCache? cache = await ReadJsonAsync<CouponCache>(paths.CouponsCachePath, cancellationToken);
		if (cache != null)
		{
			List<CouponEntry> cachedCoupons = ValidatedCachedCoupons(cache);
			List<CouponEntry> resolvedCoupons = await itemIconResolver.ResolveAsync(
				cachedCoupons,
				cancellationToken,
				allowNetwork: false);
			if (!CouponEntriesEquivalent(resolvedCoupons, cachedCoupons))
			{
				cache = cache with { Coupons = resolvedCoupons };
				await WriteJsonAsync(paths.CouponsCachePath, cache, cancellationToken);
			}
			await CacheIconsAsync(resolvedCoupons, cancellationToken);
		}
		return await BuildDashboardAsync("CACHED", null, cancellationToken);
	}

	public async Task<object> SaveSettingsAsync(CouponSettings settings, CancellationToken cancellationToken)
	{
		await WriteJsonAsync(paths.CouponSettingsPath, settings, cancellationToken);
		return await BuildDashboardAsync("CACHED", null, cancellationToken);
	}

	public async Task<object> RefreshAsync(CancellationToken cancellationToken)
	{
		DateTimeOffset attemptTime = DateTimeOffset.UtcNow;
		logger.Info("Coupons refresh started.");
		logger.Info($"Coupons official source URL: {OfficialSourceUrl}");
		logger.Info($"Coupons BDO Alerts source URL: {SourceUrl}");
		bool cacheUpdated = false;
		try
		{
			List<CouponEntry> officialCoupons = [];
			string? officialFailure = null;
			int officialLength = 0;
			try
			{
				using HttpRequestMessage officialRequest = new(HttpMethod.Get, OfficialSourceUrl);
				using HttpResponseMessage officialResponse = await officialHttp.SendAsync(
					officialRequest,
					HttpCompletionOption.ResponseContentRead,
					cancellationToken);
				string officialHtml = await officialResponse.Content.ReadAsStringAsync(cancellationToken);
				officialLength = officialHtml.Length;
				if (officialResponse.IsSuccessStatusCode)
				{
					officialCoupons = ParseOfficialCouponPage(officialHtml);
					logger.Info($"Official coupons parsed: {officialCoupons.Count}.");
					if (officialCoupons.Count == 0)
					{
						officialFailure =
							"Official BDO source returned no readable coupon entries.";
						logger.Warn(officialFailure);
					}
				}
				else
				{
					officialFailure = $"Official BDO source returned HTTP {(int)officialResponse.StatusCode}.";
					logger.Warn(officialFailure);
				}
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex)
			{
				officialFailure = "Official BDO source could not be read: " + ex.Message;
				logger.Warn(officialFailure);
			}
			CouponCache? existingCache = await ReadJsonAsync<CouponCache>(
				paths.CouponsCachePath,
				cancellationToken);
			HashSet<string> validatedNaEuCouponKeys = new(
				TrustedBootstrapNaEuCouponCodes(),
				StringComparer.OrdinalIgnoreCase);
			validatedNaEuCouponKeys.UnionWith(
				existingCache?.NaEuCouponCodes?
					.Select(CanonicalCouponCode)
					.Where(key => key.Length > 0)
				?? []);
			validatedNaEuCouponKeys.UnionWith(CouponKeys(officialCoupons));

			using HttpRequestMessage bdoAlertsRequest = new(HttpMethod.Get, SourceUrl);
			if (!BdoAlertsApiCredentials.TryApply(
					bdoAlertsRequest,
					new Uri(SourceUrl)))
			{
				const string failure = "BDO Alerts API access is not configured.";
				if (officialCoupons.Count > 0)
				{
					List<CouponEntry> merged = MergeCouponSources(
						officialCoupons,
						FilterCouponsByKeys(
							existingCache?.Coupons ?? [],
							validatedNaEuCouponKeys));
					merged = await itemIconResolver.ResolveAsync(
						merged,
						cancellationToken);
					int officialIcons = await CacheIconsAsync(
						merged,
						cancellationToken);
					CouponCache officialCache = new(
						DateTimeOffset.UtcNow,
						"Official BDO",
						merged,
						failure,
						CouponKeys(merged).OrderBy(key => key).ToList());
					await WriteJsonAsync(
						paths.CouponsCachePath,
						officialCache,
						cancellationToken);
					cacheUpdated = true;
					LogSummary(merged, officialIcons, "Official BDO");
					return await BuildDashboardAsync(
						"LIVE",
						failure,
						cancellationToken,
						attemptTime,
						new CouponRefreshDebug(
							OfficialSourceUrl,
							null,
							officialLength,
							officialCoupons.Count,
							true,
							true,
							failure));
				}

				return await BuildDashboardAsync(
					"CACHED",
					failure,
					cancellationToken,
					attemptTime,
					new CouponRefreshDebug(
						SourceUrl,
						null,
						0,
						0,
						false,
						false,
						failure));
			}
			using HttpResponseMessage response = await bdoAlertsHttp.SendAsync(
				bdoAlertsRequest,
				HttpCompletionOption.ResponseContentRead,
				cancellationToken);
			string html = await response.Content.ReadAsStringAsync(cancellationToken);
			int statusCode = (int)response.StatusCode;
			logger.Info($"Coupons HTTP status: {statusCode} {response.StatusCode}");
			if (!response.IsSuccessStatusCode)
			{
				string failure = statusCode == 403
					? "Live refresh blocked by BDO Alerts: HTTP 403. Showing cached data."
					: $"Live coupon refresh failed: HTTP {statusCode}. Showing cached data.";
				if (officialCoupons.Count > 0)
				{
					List<CouponEntry> merged = MergeCouponSources(
						officialCoupons,
						FilterCouponsByKeys(
							existingCache?.Coupons ?? [],
							validatedNaEuCouponKeys));
					merged = await itemIconResolver.ResolveAsync(
						merged,
						cancellationToken);
					int officialIcons = await CacheIconsAsync(merged, cancellationToken);
					CouponCache officialCache = new(
						DateTimeOffset.UtcNow,
						"Official BDO",
						merged,
						failure,
						CouponKeys(merged).OrderBy(key => key).ToList());
					await WriteJsonAsync(paths.CouponsCachePath, officialCache, cancellationToken);
					cacheUpdated = true;
					LogSummary(merged, officialIcons, "Official BDO");
					return await BuildDashboardAsync("LIVE", failure, cancellationToken, attemptTime,
						new CouponRefreshDebug(OfficialSourceUrl, statusCode, officialLength, officialCoupons.Count, true, true, failure));
				}
				logger.Info("Coupons parsing succeeded: no (HTTP request was rejected).");
				logger.Info("Coupons parsed: 0.");
				logger.Info("Coupons cache updated: no.");
				logger.Warn("Coupons refresh failed reason: " + failure);
				return await BuildDashboardAsync("CACHED", failure, cancellationToken, attemptTime,
					new CouponRefreshDebug(SourceUrl, statusCode, 0, 0, false, false, failure));
			}
			logger.Info($"Coupons raw response length: {html.Length} characters.");
			List<CouponEntry> bdoAlertsCoupons = ParseBdoAlertsResponse(
				html,
				validatedNaEuCouponKeys);
			logger.Info(
				$"BDO Alerts coupons accepted for NA/EU PC: {bdoAlertsCoupons.Count}.");
			List<CouponEntry> coupons = MergeCouponSources(
				officialCoupons,
				bdoAlertsCoupons);
			logger.Info($"Coupons parsed: {coupons.Count}.");
			logger.Info($"Coupons parsing succeeded: {(coupons.Count > 0 ? "yes" : "no")}.");
			if (coupons.Count == 0)
			{
				throw new InvalidDataException(
					officialCoupons.Count == 0
						? "NA/EU coupon eligibility could not be verified because the official NA/EU source was unavailable."
						: "No NA/EU PC coupon entries could be read from the live sources.");
			}

			coupons = await itemIconResolver.ResolveAsync(
				coupons,
				cancellationToken);
			int icons = await CacheIconsAsync(coupons, cancellationToken);
			CouponCache cache = new(
				DateTimeOffset.UtcNow,
				"BDO Alerts",
				coupons,
				null,
				CouponKeys(coupons).OrderBy(key => key).ToList());
			await WriteJsonAsync(paths.CouponsCachePath, cache, cancellationToken);
			cacheUpdated = true;
			logger.Info("Coupons cache updated: yes.");
			LogSummary(coupons, icons, "LIVE");
			return await BuildDashboardAsync("LIVE", null, cancellationToken, attemptTime,
				new CouponRefreshDebug($"{OfficialSourceUrl} + {SourceUrl}", statusCode, html.Length + officialLength, coupons.Count, true, true, officialFailure));
		}
		catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
		{
			throw;
		}
		catch (Exception ex)
		{
			logger.Info($"Coupons cache updated: {(cacheUpdated ? "yes" : "no")}.");
			logger.Warn("Coupons refresh failed reason: " + ex.Message);
			await EnsureSeedCacheAsync(cancellationToken);
			string failure = "Could not refresh coupons. Showing cached data. " + ex.Message;
			return await BuildDashboardAsync("CACHED", failure, cancellationToken, attemptTime,
				new CouponRefreshDebug(SourceUrl, null, 0, 0, false, cacheUpdated, ex.Message));
		}
	}

	public async Task<IReadOnlyList<CouponEntry>> GetCouponsAsync(CancellationToken cancellationToken)
	{
		await EnsureSeedCacheAsync(cancellationToken);
		CouponCache? cache = await ReadJsonAsync<CouponCache>(
			paths.CouponsCachePath,
			cancellationToken);
		return cache is null ? [] : ValidatedCachedCoupons(cache);
	}

	private async Task<object> BuildDashboardAsync(string status, string? error, CancellationToken cancellationToken,
		DateTimeOffset? lastAttempt = null, CouponRefreshDebug? refreshDebug = null)
	{
		CouponCache cache = await ReadJsonAsync<CouponCache>(paths.CouponsCachePath, cancellationToken)
			?? new CouponCache(DateTimeOffset.UtcNow, "Manual", [], error);
		CouponSettings settings = await ReadJsonAsync<CouponSettings>(paths.CouponSettingsPath, cancellationToken)
			?? new CouponSettings(true, true, "", "all");
		bool isStale = DateTimeOffset.UtcNow - cache.LastRefreshed > TimeSpan.FromHours(6);
		int cacheAgeMinutes = Math.Max(0, (int)Math.Round((DateTimeOffset.UtcNow - cache.LastRefreshed).TotalMinutes));
		// Coupon entries from structured feeds and the local cache are authoritative.
		// Never suppress them based on words or patterns contained in the coupon code.
		List<CouponEntry> normalizedCoupons = ValidatedCachedCoupons(cache);
		var coupons = normalizedCoupons.Select(c => new
		{
			c.Code,
			addedUtc = c.AddedUtc,
			expiryUtc = c.ExpiryUtc,
			addedText = c.AddedUtc.HasValue ? FormatRelativeDate(c.AddedUtc) : c.AddedText,
			expiryText = c.ExpiryUtc.HasValue ? FormatExpiry(c.ExpiryUtc, c.IsExpired) : c.ExpiryText,
			c.IsExpired,
			c.Source,
			rewards = c.Rewards.Select(r => new
			{
				r.ItemName,
				r.Quantity,
				icon = ReadIconDataUrl(r.IconFileName),
				r.IconSource,
				r.IconSourceUrl
			})
		}).ToArray();
		return new
		{
			status,
			message = error,
			sourceUrl = SourceUrl,
			lastRefreshed = cache.LastRefreshed,
			lastAttempt,
			isStale,
			cacheAgeMinutes,
			refreshDebug,
			regionScope = "NA / EU",
			settings,
			coupons,
			availableCount = coupons.Count(x => !x.IsExpired),
			expiredCount = coupons.Count(x => x.IsExpired),
			totalCount = coupons.Length
		};
	}

	private async Task EnsureSeedCacheAsync(CancellationToken cancellationToken)
	{
		CouponCache? existing = await ReadJsonAsync<CouponCache>(paths.CouponsCachePath, cancellationToken);
		if (existing is null)
		{
			List<CouponEntry> seedCoupons = SeedCoupons();
			CouponCache seed = new(
				DateTimeOffset.UtcNow,
				"Cached",
				seedCoupons,
				"Seed cache created from the last publicly verified NA/EU coupon listing.",
				CouponKeys(seedCoupons).OrderBy(key => key).ToList());
			await WriteJsonAsync(paths.CouponsCachePath, seed, cancellationToken);
			logger.Info($"Coupon seed cache created with {seed.Coupons.Count} entries.");
		}
		else if (existing.NaEuCouponCodes is not { Count: > 0 })
		{
			HashSet<string> trustedKeys = TrustedBootstrapNaEuCouponCodes();
			List<CouponEntry> migratedCoupons = FilterCouponsByKeys(
				existing.Coupons,
				trustedKeys);
			CouponCache migrated = existing with
			{
				Coupons = migratedCoupons,
				NaEuCouponCodes = CouponKeys(migratedCoupons)
					.OrderBy(key => key)
					.ToList()
			};
			await WriteJsonAsync(
				paths.CouponsCachePath,
				migrated,
				cancellationToken);
			logger.Info(
				$"Legacy coupon cache migrated with {migratedCoupons.Count} verified NA/EU entries.");
		}
		if (await ReadJsonAsync<CouponSettings>(paths.CouponSettingsPath, cancellationToken) is null)
			await WriteJsonAsync(paths.CouponSettingsPath, new CouponSettings(true, true, "", "all"), cancellationToken);
	}

	private static List<CouponEntry> SeedCoupons() =>
	[
		new("BDAYWAKAPARTYNOW", null, "2 days ago", null, "5 days", false,
			[new("Resplendent Oasis Box", 1, "https://assets.garmoth.com/img/new_icon/03_etc/01000306.webp", "01000306.webp")], "Garmoth"),
		new("THEDESERTTHNXYOU", null, "6 months ago", null, "9 days", false,
			[new("Cron Stone", 10000, "https://assets.garmoth.com/img/new_icon/03_etc/00016080.webp", "00016080.webp")], "Garmoth"),
		new("THNX4BEINGWITHUS", null, "6 months ago", null, "9 days", false,
			[
				new("Cron Stone", 20000, "https://assets.garmoth.com/img/new_icon/03_etc/00016080.webp", "00016080.webp"),
				new("Choose Your Transcendent Hammer Box", 5, "https://assets.garmoth.com/img/new_icon/09_cash/00046991.webp", "00046991.webp"),
				new("Advice of Valks (+400)", 1, "https://assets.garmoth.com/img/new_icon/03_etc/15_advice/00000400_11.webp", "00000400_11.webp"),
				new("Advice of Valks (+350)", 1, "https://assets.garmoth.com/img/new_icon/03_etc/15_advice/00000350_11.webp", "00000350_11.webp"),
				new("Advice of Valks (+300)", 1, "https://assets.garmoth.com/img/new_icon/03_etc/15_advice/00000300_11.webp", "00000300_11.webp"),
				new("Advice of Valks (+250)", 1, "https://assets.garmoth.com/img/new_icon/03_etc/15_advice/00000250_11.webp", "00000250_11.webp"),
				new("Weapon Exchange Coupon Box", 1, "https://assets.garmoth.com/img/new_icon/09_cash/00290007.webp", "00290007.webp"),
				new("J's Special Scroll", 20, "https://assets.garmoth.com/img/new_icon/03_etc/08_potion/00000771.webp", "00000771.webp")
			], "Garmoth"),
		new("OFFTOBATTLE", null, "15 days ago", null, "Expired 2 days ago", true,
			[new("Perfume of Courage", 3, "", ""), new("Perfume of Deep Sea", 3, "", ""), new("Tough Whale Tendon Elixir", 3, "", "")], "Garmoth"),
		new("POTIMATOUBDAY", null, "1 month ago", null, "Expired 1 month ago", true,
			[new("Resplendent Oasis Box", 1, "https://assets.garmoth.com/img/new_icon/03_etc/01000306.webp", "01000306.webp")], "Garmoth"),
		new("BLADENZBDAY", null, "1 month ago", null, "Expired 1 month ago", true,
			[new("Resplendent Oasis Box", 1, "https://assets.garmoth.com/img/new_icon/03_etc/01000306.webp", "01000306.webp")], "Garmoth")
	];

	private static HashSet<string> TrustedBootstrapNaEuCouponCodes()
	{
		HashSet<string> trusted = new(
			LastKnownVerifiedNaEuCouponCodes,
			StringComparer.OrdinalIgnoreCase);
		trusted.UnionWith(CouponKeys(SeedCoupons()));
		return trusted;
	}

	internal static string CanonicalCouponCode(string value)
	{
		return new string(
			(value ?? string.Empty)
				.Normalize(NormalizationForm.FormKC)
				.Where(char.IsLetterOrDigit)
				.Select(char.ToUpperInvariant)
				.ToArray());
	}

	private static string DisplayCouponCode(string value)
	{
		return new string(
			(value ?? string.Empty)
				.Where(character => !char.IsWhiteSpace(character))
				.Select(char.ToUpperInvariant)
				.ToArray());
	}

	private static HashSet<string> CouponKeys(IEnumerable<CouponEntry> coupons)
	{
		return coupons
			.Select(coupon => CanonicalCouponCode(coupon.Code))
			.Where(key => key.Length > 0)
			.ToHashSet(StringComparer.OrdinalIgnoreCase);
	}

	private static List<CouponEntry> FilterCouponsByKeys(
		IEnumerable<CouponEntry> coupons,
		IReadOnlySet<string> acceptedKeys)
	{
		return DeduplicateCouponEntries(
			coupons.Where(coupon =>
				acceptedKeys.Contains(CanonicalCouponCode(coupon.Code))));
	}

	private static List<CouponEntry> ValidatedCachedCoupons(CouponCache cache)
	{
		if (cache.NaEuCouponCodes is not { Count: > 0 })
			return [];

		return FilterCouponsByKeys(
			cache.Coupons,
			cache.NaEuCouponCodes
				.Select(CanonicalCouponCode)
				.Where(key => key.Length > 0)
				.ToHashSet(StringComparer.OrdinalIgnoreCase));
	}

	private static bool TryReadAudienceValues(
		JsonElement coupon,
		IReadOnlyCollection<string> propertyNames,
		out List<string> values)
	{
		values = [];
		bool present = false;
		foreach (JsonProperty property in coupon.EnumerateObject())
		{
			if (!propertyNames.Any(name =>
					property.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
			{
				continue;
			}

			present = true;
			if (property.Value.ValueKind == JsonValueKind.String)
			{
				values.Add(property.Value.GetString() ?? string.Empty);
			}
			else if (property.Value.ValueKind == JsonValueKind.Array)
			{
				foreach (JsonElement item in property.Value.EnumerateArray())
				{
					if (item.ValueKind == JsonValueKind.String)
						values.Add(item.GetString() ?? string.Empty);
				}
			}
		}
		return present;
	}

	private static string NormalizeAudienceToken(string value)
	{
		return new string(
			(value ?? string.Empty)
				.Where(char.IsLetterOrDigit)
				.Select(char.ToUpperInvariant)
				.ToArray());
	}

	private static bool CouponSupportsPc(JsonElement coupon)
	{
		bool platformPresent = TryReadAudienceValues(
			coupon,
			PlatformPropertyNames,
			out List<string> platforms);
		if (!platformPresent
			&& coupon.TryGetProperty("description", out JsonElement description)
			&& description.ValueKind == JsonValueKind.String)
		{
			string descriptionToken = NormalizeAudienceToken(
				description.GetString() ?? string.Empty);
			if (KnownPlatformTokens.Contains(descriptionToken))
			{
				platformPresent = true;
				platforms.Add(descriptionToken);
			}
			else if (descriptionToken.Contains("PC", StringComparison.Ordinal)
				|| descriptionToken.Contains("COMPUTER", StringComparison.Ordinal))
			{
				platformPresent = true;
				platforms.Add("PC");
			}
			else if (descriptionToken.Contains("CONSOLE", StringComparison.Ordinal)
				|| descriptionToken.Contains("XBOX", StringComparison.Ordinal)
				|| descriptionToken.Contains("PLAYSTATION", StringComparison.Ordinal)
				|| descriptionToken.Contains("PS4", StringComparison.Ordinal)
				|| descriptionToken.Contains("PS5", StringComparison.Ordinal))
			{
				platformPresent = true;
				platforms.Add("CONSOLE");
			}
		}
		if (!platformPresent)
			return true;

		return platforms
			.Select(NormalizeAudienceToken)
			.Any(PcPlatformTokens.Contains);
	}

	internal static bool CouponAppliesToNaEu(
		JsonElement coupon,
		string canonicalCode,
		IReadOnlySet<string>? validatedNaEuCouponKeys = null)
	{
		if (!CouponSupportsPc(coupon))
			return false;

		if (validatedNaEuCouponKeys?.Contains(canonicalCode) == true)
			return true;

		bool regionPresent = TryReadAudienceValues(
			coupon,
			RegionPropertyNames,
			out List<string> regions);
		if (regionPresent)
		{
			if (!regions
					.Select(NormalizeAudienceToken)
					.Any(NaEuRegionTokens.Contains))
			{
				return false;
			}
		}
		else if (validatedNaEuCouponKeys is not null)
		{
			// The current BDO Alerts coupon response has platform metadata but
			// no region field. In production, the official NA/EU coupon page is
			// therefore the authoritative region allowlist.
			return false;
		}

		return true;
	}

	internal static List<CouponEntry> ParseBdoAlertsResponse(
		string json,
		IReadOnlySet<string>? validatedNaEuCouponKeys = null)
	{
		Dictionary<string, CouponEntry> result = new(StringComparer.OrdinalIgnoreCase);
		using JsonDocument document = JsonDocument.Parse(json);
		if (!document.RootElement.TryGetProperty("coupons", out JsonElement coupons)
			|| coupons.ValueKind != JsonValueKind.Array)
			return [];
		foreach (JsonElement coupon in coupons.EnumerateArray())
		{
			string code = coupon.TryGetProperty("code", out JsonElement codeValue)
				? DisplayCouponCode(codeValue.GetString() ?? "") : "";
			string canonicalCode = CanonicalCouponCode(code);
			if (canonicalCode.Length == 0
				|| !CouponAppliesToNaEu(
					coupon,
					canonicalCode,
					validatedNaEuCouponKeys))
			{
				continue;
			}
			bool expired = coupon.TryGetProperty("is_expired", out JsonElement expiredValue) && expiredValue.GetBoolean();
			DateTimeOffset? created = ReadDate(coupon, "created_at");
			DateTimeOffset? expiry = ReadDate(coupon, "expiry_date");
			List<CouponReward> rewards = [];
			if (coupon.TryGetProperty("rewards_structured", out JsonElement structured)
				&& structured.TryGetProperty("items", out JsonElement items)
				&& items.ValueKind == JsonValueKind.Array)
			{
				foreach (JsonElement item in items.EnumerateArray())
				{
					string name = item.TryGetProperty("name", out JsonElement nameValue)
						? (nameValue.GetString() ?? "Unknown reward").Trim() : "Unknown reward";
					int quantity = item.TryGetProperty("quantity", out JsonElement quantityValue)
						&& quantityValue.TryGetInt32(out int parsedQuantity) ? Math.Max(1, parsedQuantity) : 1;
					(string iconUrl, string iconFileName) = ResolveKnownIcon(name);
					rewards.Add(new CouponReward(name, quantity, iconUrl, iconFileName));
				}
			}
			if (rewards.Count == 0)
				rewards.Add(new CouponReward("Reward details available on BDO Alerts", 1, "", ""));
			CouponEntry parsed = new(
				code,
				created,
				FormatRelativeDate(created),
				expiry,
				FormatExpiry(expiry, expired),
				expired,
				rewards,
				"BDO Alerts");
			result[canonicalCode] = result.TryGetValue(
				canonicalCode,
				out CouponEntry? existing)
					? PreferCouponEntry(existing, parsed)
					: parsed;
		}
		return result.Values.ToList();
	}

	internal static List<CouponEntry> ParseOfficialCouponPage(string html)
	{
		List<CouponEntry> result = [];
		HashSet<string> seen = new(StringComparer.OrdinalIgnoreCase);
		foreach (Match codeElement in Regex.Matches(
			html,
			@"<div\b[^>]*\bjs-couponCopyWrap\b[^>]*>\s*<span\b[^>]*\bjs-couponNumber\b[^>]*>(?<code>.*?)</span\s*>",
			RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.CultureInvariant))
		{
			string displayedCode = WebUtility.HtmlDecode(Regex.Replace(codeElement.Groups["code"].Value, "<[^>]+>", " "));
			string code = CanonicalCouponCode(displayedCode);
			if (string.IsNullOrWhiteSpace(code) || !seen.Add(code))
				continue;
			result.Add(new CouponEntry(code, null, "Official source", null, "No expiry listed", false,
				[new CouponReward("Official BDO coupon reward", 1, "", "")], "Official BDO"));
		}
		return result;
	}

	private static string CombineCouponSources(params string[] sources)
	{
		return string.Join(
			" + ",
			sources
				.SelectMany(source => (source ?? string.Empty).Split(
					'+',
					StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
				.Where(source => source.Length > 0)
				.Distinct(StringComparer.OrdinalIgnoreCase));
	}

	private static List<CouponEntry> DeduplicateCouponEntries(
		IEnumerable<CouponEntry> coupons)
	{
		Dictionary<string, CouponEntry> deduplicated =
			new(StringComparer.OrdinalIgnoreCase);
		foreach (CouponEntry coupon in coupons)
		{
			string key = CanonicalCouponCode(coupon.Code);
			if (key.Length == 0)
				continue;
			if (deduplicated.TryGetValue(key, out CouponEntry? existing))
			{
				deduplicated[key] = PreferCouponEntry(existing, coupon);
			}
			else
			{
				deduplicated[key] = coupon;
			}
		}
		return deduplicated.Values.ToList();
	}

	private static CouponEntry PreferCouponEntry(
		CouponEntry first,
		CouponEntry second)
	{
		static int Quality(CouponEntry coupon)
		{
			int concreteRewards = coupon.Rewards.Count(reward =>
				!reward.ItemName.Equals(
					"Reward details available on BDO Alerts",
					StringComparison.OrdinalIgnoreCase)
				&& !reward.ItemName.Equals(
					"Official BDO coupon reward",
					StringComparison.OrdinalIgnoreCase));
			return concreteRewards * 100
				+ coupon.Rewards.Count * 10
				+ (coupon.ExpiryUtc.HasValue ? 4 : 0)
				+ (coupon.AddedUtc.HasValue ? 2 : 0)
				+ (coupon.IsExpired ? 1 : 0);
		}

		CouponEntry preferred = Quality(second) >= Quality(first)
			? second
			: first;
		return preferred with
		{
			Source = CombineCouponSources(first.Source, second.Source)
		};
	}

	internal static List<CouponEntry> MergeCouponSources(
		IEnumerable<CouponEntry> officialCoupons,
		IEnumerable<CouponEntry> alertCoupons)
	{
		Dictionary<string, CouponEntry> merged = new(StringComparer.OrdinalIgnoreCase);
		foreach (CouponEntry coupon in officialCoupons)
		{
			string key = CanonicalCouponCode(coupon.Code);
			if (key.Length > 0)
				merged[key] = coupon;
		}
		foreach (CouponEntry coupon in alertCoupons)
		{
			string key = CanonicalCouponCode(coupon.Code);
			if (key.Length == 0)
				continue;
			if (merged.TryGetValue(key, out CouponEntry? official))
			{
				merged[key] = coupon with
				{
					Source = CombineCouponSources(
						official.Source,
						coupon.Source)
				};
			}
			else
			{
				merged[key] = coupon;
			}
		}
		return DeduplicateCouponEntries(merged.Values);
	}

	private static DateTimeOffset? ReadDate(JsonElement element, string property)
	{
		if (!element.TryGetProperty(property, out JsonElement value)
			|| value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
			return null;
		return DateTimeOffset.TryParse(value.GetString(), out DateTimeOffset parsed) ? parsed : null;
	}

	private static string FormatRelativeDate(DateTimeOffset? date)
	{
		if (!date.HasValue)
			return "Unknown";
		TimeSpan age = DateTimeOffset.UtcNow - date.Value;
		if (age.TotalDays < 1)
			return age.TotalHours < 1 ? "Just now" : $"{Math.Max(1, (int)age.TotalHours)} hours ago";
		if (age.TotalDays < 60)
			return $"{Math.Max(1, (int)age.TotalDays)} days ago";
		return $"{Math.Max(1, (int)(age.TotalDays / 30))} months ago";
	}

	private static string FormatExpiry(DateTimeOffset? expiry, bool expired)
	{
		if (!expiry.HasValue)
			return expired ? "Expired" : "No expiry listed";
		TimeSpan remaining = expiry.Value - DateTimeOffset.UtcNow;
		if (remaining <= TimeSpan.Zero)
			return $"Expired {Math.Max(1, (int)Math.Abs(remaining.TotalDays))} days ago";
		return remaining.TotalDays < 1 ? "Expires today" : $"{Math.Max(1, (int)Math.Ceiling(remaining.TotalDays))} days";
	}

	private static (string Url, string FileName) ResolveKnownIcon(string itemName)
	{
		string key = itemName.ToLowerInvariant();
		if (key.Contains("cron stone")) return ("https://assets.garmoth.com/img/new_icon/03_etc/00016080.webp", "00016080.webp");
		if (key.Contains("resplendent oasis box")) return ("https://assets.garmoth.com/img/new_icon/09_cash/00046991.webp", "00046991.webp");
		if (key.Contains("transcendent hammer")) return ("https://assets.garmoth.com/img/new_icon/03_etc/01000306.webp", "01000306.webp");
		if (key.Contains("+400")) return ("https://assets.garmoth.com/img/new_icon/03_etc/15_advice/00000400_11.webp", "00000400_11.webp");
		if (key.Contains("+350")) return ("https://assets.garmoth.com/img/new_icon/03_etc/15_advice/00000350_11.webp", "00000350_11.webp");
		if (key.Contains("+300")) return ("https://assets.garmoth.com/img/new_icon/03_etc/15_advice/00000300_11.webp", "00000300_11.webp");
		if (key.Contains("+250")) return ("https://assets.garmoth.com/img/new_icon/03_etc/15_advice/00000250_11.webp", "00000250_11.webp");
		if (key.Contains("weapon exchange coupon")) return ("https://assets.garmoth.com/img/new_icon/09_cash/00290007.webp", "00290007.webp");
		if (key.Contains("j's special scroll")) return ("https://assets.garmoth.com/img/new_icon/09_cash/000175722.webp", "000175722.webp");
		return ("", "");
	}

	private async Task<int> CacheIconsAsync(IEnumerable<CouponEntry> coupons, CancellationToken cancellationToken)
	{
		int count = 0;
		foreach (CouponReward reward in coupons.SelectMany(c => c.Rewards))
		{
			if (string.IsNullOrWhiteSpace(reward.IconUrl) || string.IsNullOrWhiteSpace(reward.IconFileName))
				continue;
			if (!TryValidateIconUri(reward.IconUrl, out Uri? uri))
				continue;
			string safeFileName = Path.GetFileName(reward.IconFileName);
			if (safeFileName.Length == 0
				|| !safeFileName.Equals(
					reward.IconFileName,
					StringComparison.Ordinal))
			{
				continue;
			}
			string target = Path.Combine(paths.CouponIconsPath, safeFileName);
			if (File.Exists(target))
			{
				count++;
				continue;
			}
			try
			{
				using HttpRequestMessage request = new(HttpMethod.Get, uri);
				request.Headers.Referrer = uri.Host.Equals(
					"bdocodex.com",
					StringComparison.OrdinalIgnoreCase)
						? new Uri("https://bdocodex.com/")
						: new Uri("https://garmoth.com/coupons");
				request.Headers.Accept.ParseAdd("image/avif,image/webp,image/png,image/*");
				using HttpResponseMessage response = await http.SendAsync(
					request,
					HttpCompletionOption.ResponseHeadersRead,
					cancellationToken);
				response.EnsureSuccessStatusCode();
				string? mediaType = response.Content.Headers.ContentType?.MediaType;
				if (!string.IsNullOrWhiteSpace(mediaType)
					&& !mediaType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)
					&& !mediaType.Equals(
						"application/octet-stream",
						StringComparison.OrdinalIgnoreCase))
				{
					throw new InvalidDataException(
						$"Unexpected coupon icon content type '{mediaType}'.");
				}
				byte[] bytes = await ReadLimitedIconBytesAsync(
					response.Content,
					2_000_000,
					cancellationToken);
				if (!HasExpectedImageSignature(
						bytes,
						Path.GetExtension(target)))
				{
					throw new InvalidDataException(
						"Coupon icon content did not match its image format.");
				}
				await File.WriteAllBytesAsync(target, bytes, cancellationToken);
				count++;
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex)
			{
				logger.Warn($"Coupon icon could not be cached ({uri}): {ex.Message}");
			}
		}
		return count;
	}

	private static async Task<byte[]> ReadLimitedIconBytesAsync(
		HttpContent content,
		int maximumBytes,
		CancellationToken cancellationToken)
	{
		if (content.Headers.ContentLength is long contentLength
			&& (contentLength <= 0 || contentLength > maximumBytes))
		{
			throw new InvalidDataException(
				"Coupon icon exceeded the download size limit.");
		}
		await using Stream source = await content.ReadAsStreamAsync(cancellationToken);
		using MemoryStream destination = new();
		byte[] buffer = new byte[16 * 1024];
		while (true)
		{
			int read = await source.ReadAsync(buffer, cancellationToken);
			if (read == 0)
				break;
			if (destination.Length + read > maximumBytes)
				throw new InvalidDataException(
					"Coupon icon exceeded the download size limit.");
			await destination.WriteAsync(
				buffer.AsMemory(0, read),
				cancellationToken);
		}
		if (destination.Length == 0)
			throw new InvalidDataException("Coupon icon response was empty.");
		return destination.ToArray();
	}

	private static bool HasExpectedImageSignature(
		ReadOnlySpan<byte> bytes,
		string extension)
	{
		if (extension.Equals(".webp", StringComparison.OrdinalIgnoreCase))
		{
			return bytes.Length >= 12
				&& bytes[..4].SequenceEqual("RIFF"u8)
				&& bytes.Slice(8, 4).SequenceEqual("WEBP"u8);
		}
		if (extension.Equals(".png", StringComparison.OrdinalIgnoreCase))
		{
			ReadOnlySpan<byte> pngSignature =
				[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
			return bytes.Length >= pngSignature.Length
				&& bytes[..pngSignature.Length].SequenceEqual(pngSignature);
		}
		if (extension.Equals(".jpg", StringComparison.OrdinalIgnoreCase)
			|| extension.Equals(".jpeg", StringComparison.OrdinalIgnoreCase))
		{
			return bytes.Length >= 3
				&& bytes[0] == 0xFF
				&& bytes[1] == 0xD8
				&& bytes[2] == 0xFF;
		}
		return false;
	}

	internal static bool HasExpectedImageSignatureForTest(
		byte[] bytes,
		string extension)
	{
		return HasExpectedImageSignature(bytes, extension);
	}

	private static bool CouponEntriesEquivalent(
		IReadOnlyList<CouponEntry> first,
		IReadOnlyList<CouponEntry> second)
	{
		if (first.Count != second.Count)
			return false;
		for (int couponIndex = 0; couponIndex < first.Count; couponIndex++)
		{
			CouponEntry left = first[couponIndex];
			CouponEntry right = second[couponIndex];
			if (left.Code != right.Code
				|| left.AddedUtc != right.AddedUtc
				|| left.AddedText != right.AddedText
				|| left.ExpiryUtc != right.ExpiryUtc
				|| left.ExpiryText != right.ExpiryText
				|| left.IsExpired != right.IsExpired
				|| left.Source != right.Source
				|| left.Rewards.Count != right.Rewards.Count)
			{
				return false;
			}
			for (int rewardIndex = 0;
				rewardIndex < left.Rewards.Count;
				rewardIndex++)
			{
				CouponReward leftReward = left.Rewards[rewardIndex];
				CouponReward rightReward = right.Rewards[rewardIndex];
				if (leftReward != rightReward)
					return false;
			}
		}
		return true;
	}

	private static bool TryValidateIconUri(string iconUrl, out Uri? uri)
	{
		uri = null;
		if (!Uri.TryCreate(iconUrl, UriKind.Absolute, out Uri? candidate)
			|| candidate.Scheme != Uri.UriSchemeHttps
			|| candidate.Query.Length != 0
			|| candidate.Fragment.Length != 0)
		{
			return false;
		}
		bool trustedGarmoth =
			candidate.Host.Equals(
				"assets.garmoth.com",
				StringComparison.OrdinalIgnoreCase)
			&& candidate.AbsolutePath.StartsWith(
				"/img/new_icon/",
				StringComparison.OrdinalIgnoreCase);
		bool trustedBdoCodex =
			candidate.Host.Equals(
				"bdocodex.com",
				StringComparison.OrdinalIgnoreCase)
			&& candidate.AbsolutePath.StartsWith(
				"/items/new_icon/",
				StringComparison.OrdinalIgnoreCase);
		if (!trustedGarmoth && !trustedBdoCodex)
			return false;
		string extension = Path.GetExtension(candidate.AbsolutePath);
		if (!extension.Equals(".webp", StringComparison.OrdinalIgnoreCase)
			&& !extension.Equals(".png", StringComparison.OrdinalIgnoreCase)
			&& !extension.Equals(".jpg", StringComparison.OrdinalIgnoreCase)
			&& !extension.Equals(".jpeg", StringComparison.OrdinalIgnoreCase))
		{
			return false;
		}
		uri = candidate;
		return true;
	}

	private string ReadIconDataUrl(string fileName)
	{
		if (!string.IsNullOrWhiteSpace(fileName))
		{
			string path = Path.Combine(paths.CouponIconsPath, Path.GetFileName(fileName));
			if (File.Exists(path))
			{
				FileInfo info = new(path);
				if (iconDataCache.TryGetValue(path, out var cached)
					&& cached.LastWriteUtc == info.LastWriteTimeUtc
					&& cached.Length == info.Length)
					return cached.DataUrl;
				string extension = Path.GetExtension(path).ToLowerInvariant();
				string mime = extension == ".png" ? "image/png" : extension is ".jpg" or ".jpeg" ? "image/jpeg" : "image/webp";
				string dataUrl = $"data:{mime};base64,{Convert.ToBase64String(File.ReadAllBytes(path))}";
				iconDataCache[path] = (info.LastWriteTimeUtc, info.Length, dataUrl);
				return dataUrl;
			}
		}
		return "data:image/svg+xml;charset=utf-8," + Uri.EscapeDataString("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><defs><linearGradient id='g' x2='1' y2='1'><stop stop-color='#e2ae43'/><stop offset='1' stop-color='#6f2b16'/></linearGradient></defs><rect x='3' y='3' width='42' height='42' rx='7' fill='#24080a' stroke='#b97729'/><path d='M14 17h20v19H14zM12 13h24v7H12zm12 0v23M18 13c-5-5 5-9 6 0m6 0c5-5-5-9-6 0' fill='none' stroke='url(#g)' stroke-width='2'/></svg>");
	}

	private void LogSummary(IReadOnlyCollection<CouponEntry> coupons, int icons, string source)
	{
		logger.Info($"Coupons source: {source}; found: {coupons.Count}; available: {coupons.Count(c => !c.IsExpired)}; expired: {coupons.Count(c => c.IsExpired)}; icons loaded: {icons}; refreshed: {DateTimeOffset.Now:O}");
	}

	private async Task<T?> ReadJsonAsync<T>(string path, CancellationToken cancellationToken)
	{
		if (!File.Exists(path))
			return default;
		try
		{
			await using FileStream stream = new(path, FileMode.Open, FileAccess.Read, FileShare.Read);
			return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions, cancellationToken);
		}
		catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
		{
			throw;
		}
		catch (Exception ex) when (ex is JsonException or IOException or UnauthorizedAccessException)
		{
			logger.Warn($"Ignoring unreadable coupon data '{Path.GetFileName(path)}': {ex.Message}");
			try
			{
				File.Move(path, path + $".corrupt-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}", overwrite: true);
			}
			catch (Exception quarantineError)
			{
				logger.Warn($"Could not quarantine invalid coupon data '{Path.GetFileName(path)}': {quarantineError.Message}");
			}
			return default;
		}
	}

	private static async Task WriteJsonAsync<T>(string path, T value, CancellationToken cancellationToken)
	{
		Directory.CreateDirectory(Path.GetDirectoryName(path)!);
		string temporary = path + $".{Guid.NewGuid():N}.tmp";
		try
		{
			await using (FileStream stream = new(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
			{
				await JsonSerializer.SerializeAsync(stream, value, JsonOptions, cancellationToken);
				await stream.FlushAsync(cancellationToken);
				stream.Flush(flushToDisk: true);
			}
			File.Move(temporary, path, overwrite: true);
		}
		finally
		{
			try
			{
				if (File.Exists(temporary))
					File.Delete(temporary);
			}
			catch
			{
			}
		}
	}

	public void Dispose()
	{
		itemIconResolver.Dispose();
		bdoAlertsHttp.Dispose();
		officialHttp.Dispose();
		http.Dispose();
	}
}

internal sealed record CouponSettings(bool ShowAvailableOnly, bool ShowExpired, string Search, string Status);
internal sealed record CouponReward(string ItemName, int Quantity, string IconUrl, string IconFileName)
{
	public string IconSource { get; init; } = "";
	public string IconSourceUrl { get; init; } = "";
}
internal sealed record CouponEntry(string Code, DateTimeOffset? AddedUtc, string AddedText, DateTimeOffset? ExpiryUtc, string ExpiryText, bool IsExpired, List<CouponReward> Rewards, string Source);
internal sealed record CouponCache(
	DateTimeOffset LastRefreshed,
	string Source,
	List<CouponEntry> Coupons,
	string? LastError,
	List<string>? NaEuCouponCodes = null);
internal sealed record CouponRefreshDebug(string SourceUrl, int? HttpStatus, int RawResponseLength, int CouponsParsed, bool ParsingSucceeded, bool CacheUpdated, string? FailureReason);

