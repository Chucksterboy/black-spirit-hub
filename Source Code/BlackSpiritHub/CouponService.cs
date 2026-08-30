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
	private static readonly TimeSpan GarmothSuccessTtl = TimeSpan.FromHours(2);
	private static readonly TimeSpan ProviderFailureBackoff = TimeSpan.FromMinutes(15);
	private const string BdoProviderId = "bdo-alerts";
	private const string GarmothProviderId = "garmoth";
	private const string LegacyProviderId = "legacy";
	private static readonly string[] PlatformPropertyNames =
	[
		"platform",
		"platforms"
	];
	private static readonly HashSet<string> PcPlatformTokens = new(StringComparer.Ordinal)
	{
		"PC",
		"BOTH",
		"ALL",
		"ANY",
		"CROSSPLATFORM",
		"MULTIPLATFORM"
	};
	private static readonly HashSet<string> ConsolePlatformTokens = new(StringComparer.Ordinal)
	{
		"CONSOLE",
		"CONSOLENA",
		"CONSOLEEU",
		"XBOX",
		"XBOXONE",
		"XBOXSERIES",
		"XBOXSERIESX",
		"XBOXSERIESXS",
		"PLAYSTATION",
		"PS",
		"PS4",
		"PS5"
	};
	private readonly AppPaths paths;
	private readonly AppLogger logger;
	private readonly HttpClient http;
	private readonly HttpClient officialHttp;
	private readonly HttpClient bdoAlertsHttp;
	private readonly BdoCodexItemIconResolver itemIconResolver;
	private readonly Func<CancellationToken, Task<string>>? garmothPayloadLoader;
	private readonly SemaphoreSlim refreshGate = new(1, 1);
	private readonly SemaphoreSlim redemptionGate = new(1, 1);
	private readonly Dictionary<string, (DateTime LastWriteUtc, long Length, string DataUrl)> iconDataCache = new(StringComparer.OrdinalIgnoreCase);
	private static readonly JsonSerializerOptions JsonOptions = new()
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
		PropertyNameCaseInsensitive = true,
		WriteIndented = true
	};

	public CouponService(
		AppPaths paths,
		AppLogger logger,
		Func<CancellationToken, Task<string>>? garmothPayloadLoader = null)
	{
		this.paths = paths;
		this.logger = logger;
		this.garmothPayloadLoader = garmothPayloadLoader;
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
			List<CouponEntry> cachedCoupons = NormalizedCachedCoupons(cache);
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

	public async Task<object> SaveRedemptionsAsync(
		IEnumerable<string> redeemedCodes,
		CancellationToken cancellationToken)
	{
		await redemptionGate.WaitAsync(cancellationToken);
		try
		{
			List<string> normalizedCodes = NormalizeRedeemedCodes(redeemedCodes);
			CouponRedemptionState state = new(
				SchemaVersion: 1,
				UpdatedUtc: DateTimeOffset.UtcNow,
				RedeemedCodes: normalizedCodes);
			await WriteJsonAsync(paths.CouponRedemptionsPath, state, cancellationToken);
			return new
			{
				saved = true,
				redeemedCodes = normalizedCodes
			};
		}
		finally
		{
			redemptionGate.Release();
		}
	}

	public async Task<object> RefreshAsync(CancellationToken cancellationToken)
	{
		await refreshGate.WaitAsync(cancellationToken);
		try
		{
			return await RefreshCoreAsync(cancellationToken);
		}
		finally
		{
			refreshGate.Release();
		}
	}

	private async Task<object> RefreshCoreAsync(CancellationToken cancellationToken)
	{
		DateTimeOffset attemptTime = DateTimeOffset.UtcNow;
		logger.Info("Coupons refresh started.");
		logger.Info($"Coupons official source URL: {OfficialSourceUrl}");
		logger.Info($"Coupons BDO Alerts source URL: {SourceUrl}");
		logger.Info($"Coupons Garmoth source URL: {GarmothCouponProvider.PageUrl}");
		bool cacheUpdated = false;
		try
		{
			await EnsureSeedCacheAsync(cancellationToken);
			CouponCache? existingCache = await ReadJsonAsync<CouponCache>(
				paths.CouponsCachePath,
				cancellationToken);
			Dictionary<string, CouponProviderCache> providers =
				MigrateProviderCaches(existingCache, attemptTime);
			providers.TryGetValue(GarmothProviderId, out CouponProviderCache? previousGarmoth);
			bool garmothDue = garmothPayloadLoader is not null
				&& (previousGarmoth?.NextAllowedUtc is not { } nextAllowed
					|| nextAllowed <= attemptTime);
			Task<string>? garmothPayloadTask = garmothDue
				? garmothPayloadLoader!(cancellationToken)
				: null;

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

			List<CouponEntry> bdoCurrent = [];
			string? bdoFailure = null;
			int? bdoStatusCode = null;
			int bdoLength = 0;
			bool bdoSnapshotComplete = false;
			bool bdoAlertsSucceeded = false;
			try
			{
				using HttpRequestMessage request = new(HttpMethod.Get, SourceUrl);
				if (!BdoAlertsApiCredentials.TryApply(request, new Uri(SourceUrl)))
					throw new InvalidOperationException("BDO Alerts API access is not configured.");
				using HttpResponseMessage response = await bdoAlertsHttp.SendAsync(
					request,
					HttpCompletionOption.ResponseContentRead,
					cancellationToken);
				bdoStatusCode = (int)response.StatusCode;
				string json = await response.Content.ReadAsStringAsync(cancellationToken);
				bdoLength = json.Length;
				if (!response.IsSuccessStatusCode)
					throw new HttpRequestException($"BDO Alerts returned HTTP {bdoStatusCode}.");
				List<CouponEntry> alertCoupons = ParseBdoAlertsResponse(json);
				if (alertCoupons.Count == 0)
					throw new InvalidDataException("BDO Alerts returned no readable non-console coupons.");
				bdoSnapshotComplete = IsCompleteBdoAlertsSnapshot(json);
				bdoCurrent = MergeCouponSources(officialCoupons, alertCoupons);
				bdoAlertsSucceeded = true;
				logger.Info($"BDO Alerts non-console coupons accepted: {alertCoupons.Count}.");
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex)
			{
				bdoFailure = ex.Message;
				logger.Warn("BDO Alerts refresh failed: " + bdoFailure);
				if (officialCoupons.Count > 0)
					bdoCurrent = officialCoupons;
			}

			bool bdoUpdated = bdoCurrent.Count > 0;
			providers.TryGetValue(BdoProviderId, out CouponProviderCache? previousBdo);
			if (bdoUpdated)
			{
				providers[BdoProviderId] = UpdateProviderCache(
					previousBdo,
					bdoCurrent,
					attemptTime,
					bdoSnapshotComplete,
					bdoFailure);
			}
			else
			{
				providers[BdoProviderId] = MarkProviderFailure(
					previousBdo,
					attemptTime,
					bdoFailure ?? officialFailure ?? "BDO coupon sources were unavailable.");
			}

			bool garmothUpdated = false;
			string? garmothFailure = null;
			int garmothLength = 0;
			int garmothParsed = 0;
			if (garmothDue)
			{
				try
				{
					string payload = await garmothPayloadTask!;
					garmothLength = payload.Length;
					GarmothCouponSnapshot snapshot =
						GarmothCouponProvider.ParseNuxtPayload(payload, attemptTime);
					garmothParsed = snapshot.Coupons.Count;
					CouponProviderCache? garmothBase = ApplyProviderInactiveObservations(
						previousGarmoth,
						snapshot.InactiveCoupons,
						attemptTime);
					providers[GarmothProviderId] = UpdateProviderCache(
						garmothBase,
						snapshot.Coupons,
						attemptTime,
						snapshot.IsComplete,
						null,
						attemptTime + GarmothSuccessTtl);
					garmothUpdated = true;
					logger.Info(
						$"Garmoth available coupons accepted: {garmothParsed}; "
						+ $"source rows: {snapshot.SourceEntryCount}; "
						+ $"rejected rows: {snapshot.RejectedEntryCount}.");
				}
				catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
				{
					throw;
				}
				catch (Exception ex)
				{
					garmothFailure = ex.Message;
					logger.Warn("Garmoth coupon refresh failed: " + garmothFailure);
					providers[GarmothProviderId] = MarkProviderFailure(
						previousGarmoth,
						attemptTime,
						garmothFailure);
				}
			}
			else if (!string.IsNullOrWhiteSpace(previousGarmoth?.LastError))
			{
				garmothFailure =
					"Garmoth is temporarily unavailable; showing its saved coupon data.";
			}

			List<CouponEntry> coupons = MergeProviderCoupons(providers.Values, attemptTime);
			if (coupons.Count == 0)
				coupons = NormalizedCachedCoupons(existingCache);
			if (coupons.Count == 0)
				throw new InvalidDataException("No coupon entries are available from live or saved sources.");

			bool anyProviderUpdated = bdoUpdated || garmothUpdated;
			string? failure = CombineFailures(
				bdoAlertsSucceeded ? null : officialFailure,
				bdoFailure,
				garmothFailure);
			DateTimeOffset refreshedAt = anyProviderUpdated
				? attemptTime
				: existingCache?.LastRefreshed ?? attemptTime;
			CouponCache facts = new(
				refreshedAt,
				"BDO Alerts + Garmoth",
				coupons,
				failure)
			{
				SchemaVersion = 2,
				Providers = providers
			};
			await WriteJsonAsync(paths.CouponsCachePath, facts, cancellationToken);
			cacheUpdated = true;
			logger.Info("Coupons provider facts saved before optional icon enrichment.");

			int icons = 0;
			using CancellationTokenSource enrichmentTimeout =
				CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
			enrichmentTimeout.CancelAfter(TimeSpan.FromSeconds(20));
			try
			{
				List<CouponEntry> resolved = await itemIconResolver.ResolveAsync(
					coupons,
					enrichmentTimeout.Token);
				icons = await CacheIconsAsync(resolved, enrichmentTimeout.Token);
				if (!CouponEntriesEquivalent(resolved, coupons))
				{
					facts = facts with { Coupons = resolved };
					await WriteJsonAsync(
						paths.CouponsCachePath,
						facts,
						enrichmentTimeout.Token);
					coupons = resolved;
				}
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (OperationCanceledException)
			{
				logger.Warn("Coupon icon enrichment reached its 20-second best-effort limit.");
			}
			catch (Exception ex)
			{
				logger.Warn("Coupon icon enrichment failed after coupon facts were saved: " + ex.Message);
			}

			LogSummary(coupons, icons, anyProviderUpdated ? "LIVE" : "CACHED");
			return await BuildDashboardAsync(
				anyProviderUpdated ? "LIVE" : "CACHED",
				failure,
				cancellationToken,
				attemptTime,
				new CouponRefreshDebug(
					$"{OfficialSourceUrl} + {SourceUrl} + {GarmothCouponProvider.PageUrl}",
					bdoStatusCode,
					officialLength + bdoLength + garmothLength,
					coupons.Count,
					anyProviderUpdated,
					true,
					failure));
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
		return NormalizedCachedCoupons(cache);
	}

	private async Task<object> BuildDashboardAsync(string status, string? error, CancellationToken cancellationToken,
		DateTimeOffset? lastAttempt = null, CouponRefreshDebug? refreshDebug = null)
	{
		CouponCache cache = await ReadJsonAsync<CouponCache>(paths.CouponsCachePath, cancellationToken)
			?? new CouponCache(DateTimeOffset.UtcNow, "Manual", [], error);
		CouponSettings settings = await ReadJsonAsync<CouponSettings>(paths.CouponSettingsPath, cancellationToken)
			?? new CouponSettings(true, true, "", "all");
		CouponRedemptionState? redemptionState = await ReadRedemptionStateAsync(cancellationToken);
		bool redemptionStateExists = redemptionState is
		{
			SchemaVersion: 1,
			RedeemedCodes: not null
		};
		List<string> redeemedCodes = redemptionStateExists
			? NormalizeRedeemedCodes(redemptionState!.RedeemedCodes)
			: [];
		bool isStale = DateTimeOffset.UtcNow - cache.LastRefreshed > TimeSpan.FromHours(6);
		int cacheAgeMinutes = Math.Max(0, (int)Math.Round((DateTimeOffset.UtcNow - cache.LastRefreshed).TotalMinutes));
		// Coupon entries from structured feeds and the local cache are authoritative.
		// Never suppress them based on words or patterns contained in the coupon code.
		List<CouponEntry> normalizedCoupons = NormalizedCachedCoupons(cache);
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
			sourceUrl = $"{SourceUrl} + {GarmothCouponProvider.PageUrl}",
			lastRefreshed = cache.LastRefreshed,
			lastAttempt,
			isStale,
			cacheAgeMinutes,
			refreshDebug,
			regionScope = "CONSOLE EXCLUDED",
			settings,
			redemptionStateExists,
			redeemedCodes,
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
			CouponCache empty = new(
				DateTimeOffset.UtcNow,
				"Cached",
				[],
				"No live coupon snapshot has been saved yet.")
			{
				SchemaVersion = 2
			};
			await WriteJsonAsync(paths.CouponsCachePath, empty, cancellationToken);
			logger.Info("Empty coupon cache created; live providers will populate it.");
		}
		if (await ReadJsonAsync<CouponSettings>(paths.CouponSettingsPath, cancellationToken) is null)
			await WriteJsonAsync(paths.CouponSettingsPath, new CouponSettings(true, true, "", "all"), cancellationToken);
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

	internal static List<string> NormalizeRedeemedCodes(IEnumerable<string>? redeemedCodes)
	{
		return (redeemedCodes ?? [])
			.Select(CanonicalCouponCode)
			.Where(code => code.Length is > 0 and <= 128)
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.OrderBy(code => code, StringComparer.OrdinalIgnoreCase)
			.Take(4096)
			.ToList();
	}

	private async Task<CouponRedemptionState?> ReadRedemptionStateAsync(
		CancellationToken cancellationToken)
	{
		await redemptionGate.WaitAsync(cancellationToken);
		try
		{
			return await ReadJsonAsync<CouponRedemptionState>(
				paths.CouponRedemptionsPath,
				cancellationToken);
		}
		finally
		{
			redemptionGate.Release();
		}
	}

	private static string DisplayCouponCode(string value)
	{
		return new string(
			(value ?? string.Empty)
				.Where(character => !char.IsWhiteSpace(character))
				.Select(char.ToUpperInvariant)
				.ToArray());
	}

	private static List<CouponEntry> NormalizedCachedCoupons(CouponCache? cache)
	{
		return cache is null
			? []
			: NormalizeCouponEntriesAt(cache.Coupons, DateTimeOffset.UtcNow);
	}

	private static List<CouponEntry> NormalizeCouponEntriesAt(
		IEnumerable<CouponEntry> coupons,
		DateTimeOffset observedAt)
	{
		return DeduplicateCouponEntries(coupons.Select(coupon =>
		{
			bool expired = coupon.IsExpired
				|| coupon.ExpiryUtc is { } expiry && expiry <= observedAt;
			return expired == coupon.IsExpired
				? coupon
				: coupon with
				{
					IsExpired = true,
					ExpiryText = FormatExpiry(coupon.ExpiryUtc, true)
				};
		}));
	}

	private static Dictionary<string, CouponProviderCache> MigrateProviderCaches(
		CouponCache? cache,
		DateTimeOffset observedAt)
	{
		if (cache?.Providers is { Count: > 0 })
		{
			return cache.Providers.ToDictionary(
				pair => pair.Key,
				pair => pair.Value with
				{
					Coupons = NormalizeCouponEntriesAt(pair.Value.Coupons, observedAt)
				},
				StringComparer.OrdinalIgnoreCase);
		}

		Dictionary<string, List<CouponEntry>> migrated = new(StringComparer.OrdinalIgnoreCase);
		foreach (CouponEntry coupon in NormalizeCouponEntriesAt(cache?.Coupons ?? [], observedAt))
		{
			string[] sources = (coupon.Source ?? string.Empty).Split(
				'+',
				StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
			bool mapped = false;
			if (sources.Any(source => source.Equals(
					GarmothCouponProvider.SourceName,
					StringComparison.OrdinalIgnoreCase)))
			{
				AddMigrated(
					GarmothProviderId,
					coupon with { Source = GarmothCouponProvider.SourceName });
				mapped = true;
			}
			string[] bdoSources = sources.Where(source =>
				source.Equals("BDO Alerts", StringComparison.OrdinalIgnoreCase)
				|| source.Equals("Official BDO", StringComparison.OrdinalIgnoreCase))
				.ToArray();
			if (bdoSources.Length > 0)
			{
				AddMigrated(
					BdoProviderId,
					coupon with { Source = CombineCouponSources(bdoSources) });
				mapped = true;
			}
			if (!mapped)
				AddMigrated(LegacyProviderId, coupon);
		}

		void AddMigrated(string providerId, CouponEntry coupon)
		{
			if (!migrated.TryGetValue(providerId, out List<CouponEntry>? list))
			{
				list = [];
				migrated[providerId] = list;
			}
			list.Add(coupon);
		}

		DateTimeOffset? legacySuccess = cache?.LastRefreshed;
		return migrated.ToDictionary(
			pair => pair.Key,
			pair => new CouponProviderCache(
				legacySuccess,
				legacySuccess,
				null,
				0,
				false,
				DeduplicateCouponEntries(pair.Value),
				null),
			StringComparer.OrdinalIgnoreCase);
	}

	internal static CouponProviderCache UpdateProviderCache(
		CouponProviderCache? previous,
		IEnumerable<CouponEntry> current,
		DateTimeOffset observedAt,
		bool snapshotComplete,
		string? warning,
		DateTimeOffset? nextAllowedUtc = null)
	{
		List<CouponEntry> merged = MergeCouponHistory(
			NormalizeCouponEntriesAt(current, observedAt),
			NormalizeCouponEntriesAt(previous?.Coupons ?? [], observedAt),
			observedAt,
			snapshotComplete);
		return new CouponProviderCache(
			observedAt,
			observedAt,
			nextAllowedUtc,
			0,
			snapshotComplete,
			merged,
			warning);
	}

	internal static CouponProviderCache? ApplyProviderInactiveObservations(
		CouponProviderCache? previous,
		IEnumerable<GarmothInactiveCoupon> inactiveCoupons,
		DateTimeOffset observedAt)
	{
		if (previous is null)
			return null;
		Dictionary<string, DateTimeOffset> inactiveByCode = inactiveCoupons
			.GroupBy(
				coupon => coupon.CanonicalCode,
				StringComparer.OrdinalIgnoreCase)
			.ToDictionary(
				group => group.Key,
				group => group.Min(coupon => coupon.ExpiryUtc),
				StringComparer.OrdinalIgnoreCase);
		if (inactiveByCode.Count == 0)
			return previous;

		List<CouponEntry> updated = previous.Coupons.Select(coupon =>
		{
			string key = CanonicalCouponCode(coupon.Code);
			if (!inactiveByCode.TryGetValue(key, out DateTimeOffset expiry))
				return coupon;
			return coupon with
			{
				ExpiryUtc = expiry,
				ExpiryText = FormatExpiry(expiry, expired: true),
				IsExpired = expiry <= observedAt
			};
		}).ToList();
		return previous with { Coupons = updated };
	}

	private static CouponProviderCache MarkProviderFailure(
		CouponProviderCache? previous,
		DateTimeOffset attemptedAt,
		string failure)
	{
		previous ??= new CouponProviderCache(
			null,
			null,
			null,
			0,
			false,
			[],
			null);
		int failures = Math.Min(4, previous.ConsecutiveFailures + 1);
		double minutes = ProviderFailureBackoff.TotalMinutes * Math.Pow(2, failures - 1);
		return previous with
		{
			LastAttemptUtc = attemptedAt,
			NextAllowedUtc = attemptedAt + TimeSpan.FromMinutes(minutes),
			ConsecutiveFailures = failures,
			LastError = failure
		};
	}

	internal static List<CouponEntry> MergeProviderCoupons(
		IEnumerable<CouponProviderCache> providers,
		DateTimeOffset observedAt)
	{
		return NormalizeCouponEntriesAt(
			providers.SelectMany(provider => provider.Coupons),
			observedAt);
	}

	private static string? CombineFailures(params string?[] failures)
	{
		string[] messages = failures
			.Where(failure => !string.IsNullOrWhiteSpace(failure))
			.Select(failure => failure!.Trim())
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.ToArray();
		return messages.Length == 0 ? null : string.Join(" ", messages);
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

	private static bool CouponIsExplicitlyConsoleOnly(JsonElement coupon)
	{
		List<string> audienceValues = [];
		TryReadAudienceValues(
			coupon,
			PlatformPropertyNames,
			out List<string> platforms);
		audienceValues.AddRange(platforms);

		if (coupon.TryGetProperty("description", out JsonElement description)
			&& description.ValueKind == JsonValueKind.String)
		{
			audienceValues.Add(description.GetString() ?? string.Empty);
		}

		// BDO Alerts does not always provide audience metadata. Unknown or
		// missing metadata is accepted. A mixed audience is accepted too; only
		// explicit console-only evidence is excluded.
		string[] normalized = audienceValues
			.Select(NormalizeAudienceToken)
			.Where(value => value.Length > 0)
			.ToArray();
		bool supportsPc = normalized.Any(value =>
				PcPlatformTokens.Contains(value)
				|| value.Contains("PC", StringComparison.Ordinal)
				|| value.Contains("COMPUTER", StringComparison.Ordinal));
		bool supportsConsole = normalized.Any(value =>
			ConsolePlatformTokens.Contains(value)
			|| value.Contains("CONSOLE", StringComparison.Ordinal)
			|| value.Contains("XBOX", StringComparison.Ordinal)
			|| value.Contains("PLAYSTATION", StringComparison.Ordinal)
			|| value.Contains("PS4", StringComparison.Ordinal)
			|| value.Contains("PS5", StringComparison.Ordinal));
		return supportsConsole && !supportsPc;
	}

	internal static List<CouponEntry> ParseBdoAlertsResponse(string json)
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
			if (canonicalCode.Length == 0 || CouponIsExplicitlyConsoleOnly(coupon))
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
		static int SourcePriority(string source) => source.ToUpperInvariant() switch
		{
			"OFFICIAL BDO" => 0,
			"BDO ALERTS" => 1,
			"GARMOTH" => 2,
			_ => 3
		};
		return string.Join(
			" + ",
			sources
				.SelectMany(source => (source ?? string.Empty).Split(
					'+',
					StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
				.Where(source => source.Length > 0)
				.Distinct(StringComparer.OrdinalIgnoreCase)
				.OrderBy(SourcePriority)
				.ThenBy(source => source, StringComparer.OrdinalIgnoreCase));
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
					"Reward details available on Garmoth",
					StringComparison.OrdinalIgnoreCase)
				&& !reward.ItemName.Equals(
					"Official BDO coupon reward",
					StringComparison.OrdinalIgnoreCase));
			return concreteRewards * 100
				+ coupon.Rewards.Count * 10
				+ (coupon.ExpiryUtc.HasValue ? 4 : 0)
				+ (coupon.AddedUtc.HasValue ? 2 : 0);
		}

		CouponEntry preferred;
		if (first.IsExpired != second.IsExpired)
		{
			preferred = first.IsExpired ? second : first;
		}
		else
		{
			int firstQuality = Quality(first);
			int secondQuality = Quality(second);
			if (firstQuality != secondQuality)
				preferred = firstQuality > secondQuality ? first : second;
			else
			{
				string firstKey = first.Source + "\0" + first.Code;
				string secondKey = second.Source + "\0" + second.Code;
				preferred = string.Compare(
					firstKey,
					secondKey,
					StringComparison.OrdinalIgnoreCase) <= 0
						? first
						: second;
			}
		}
		CouponEntry other = ReferenceEquals(preferred, first) ? second : first;
		bool mayBorrowExpiry = preferred.ExpiryUtc is null
			&& other.ExpiryUtc is not null
			&& preferred.IsExpired == other.IsExpired;
		DateTimeOffset? mergedAddedUtc = first.AddedUtc switch
		{
			null => second.AddedUtc,
			{ } firstAdded when second.AddedUtc is { } secondAdded
				=> firstAdded <= secondAdded ? firstAdded : secondAdded,
			_ => first.AddedUtc
		};
		return preferred with
		{
			AddedUtc = mergedAddedUtc,
			AddedText = mergedAddedUtc == preferred.AddedUtc
				? preferred.AddedText
				: other.AddedText,
			ExpiryUtc = mayBorrowExpiry ? other.ExpiryUtc : preferred.ExpiryUtc,
			ExpiryText = mayBorrowExpiry ? other.ExpiryText : preferred.ExpiryText,
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
				merged[key] = PreferCouponEntry(official, coupon);
			}
			else
			{
				merged[key] = coupon;
			}
		}
		return DeduplicateCouponEntries(merged.Values);
	}

	internal static bool IsCompleteBdoAlertsSnapshot(string json)
	{
		try
		{
			using JsonDocument document = JsonDocument.Parse(json);
			if (!document.RootElement.TryGetProperty(
					"total_coupons",
					out JsonElement totalValue)
				|| !totalValue.TryGetInt32(out int expectedCount)
				|| expectedCount < 0
				|| !document.RootElement.TryGetProperty(
					"coupons",
					out JsonElement coupons)
				|| coupons.ValueKind != JsonValueKind.Array
				|| coupons.GetArrayLength() != expectedCount)
			{
				return false;
			}

			foreach (JsonElement coupon in coupons.EnumerateArray())
			{
				if (coupon.ValueKind != JsonValueKind.Object
					|| !coupon.TryGetProperty("code", out JsonElement code)
					|| code.ValueKind != JsonValueKind.String
					|| CanonicalCouponCode(code.GetString() ?? string.Empty).Length == 0)
				{
					return false;
				}
			}
			return true;
		}
		catch (JsonException)
		{
			return false;
		}
	}

	internal static List<CouponEntry> MergeCouponHistory(
		IEnumerable<CouponEntry> currentCoupons,
		IEnumerable<CouponEntry> previousCoupons,
		DateTimeOffset observedAt,
		bool snapshotComplete)
	{
		Dictionary<string, CouponEntry> previousByCode =
			DeduplicateCouponEntries(previousCoupons)
				.ToDictionary(
					coupon => CanonicalCouponCode(coupon.Code),
					StringComparer.OrdinalIgnoreCase);
		Dictionary<string, CouponEntry> merged = new(StringComparer.OrdinalIgnoreCase);
		foreach (CouponEntry current in DeduplicateCouponEntries(currentCoupons))
		{
			string key = CanonicalCouponCode(current.Code);
			CouponEntry mergedCurrent = current;
			if (previousByCode.TryGetValue(key, out CouponEntry? previous))
			{
				mergedCurrent = current with
				{
					AddedUtc = current.AddedUtc ?? previous.AddedUtc,
					AddedText = current.AddedUtc.HasValue
						? current.AddedText
						: previous.AddedText,
					Rewards = HasConcreteCouponRewards(current.Rewards)
						? current.Rewards
						: previous.Rewards,
					Source = CombineCouponSources(previous.Source, current.Source)
				};
			}
			merged[key] = mergedCurrent;
		}

		foreach ((string key, CouponEntry previous) in previousByCode)
		{
			if (merged.ContainsKey(key))
				continue;
			merged[key] = !snapshotComplete || previous.IsExpired
				? previous
				: previous with
				{
					ExpiryUtc = previous.ExpiryUtc is { } knownExpiry
						&& knownExpiry <= observedAt
							? knownExpiry
							: null,
					ExpiryText = "No longer listed",
					IsExpired = true
				};
		}
		return merged.Values.ToList();
	}

	private static bool HasConcreteCouponRewards(IEnumerable<CouponReward> rewards)
	{
		return rewards.Any(reward =>
			!reward.ItemName.Equals(
				"Reward details available on BDO Alerts",
				StringComparison.OrdinalIgnoreCase)
			&& !reward.ItemName.Equals(
				"Reward details available on Garmoth",
				StringComparison.OrdinalIgnoreCase)
			&& !reward.ItemName.Equals(
				"Official BDO coupon reward",
				StringComparison.OrdinalIgnoreCase));
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
internal sealed record CouponRedemptionState(int SchemaVersion, DateTimeOffset UpdatedUtc, List<string> RedeemedCodes);
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
	string? LastError)
{
	public int SchemaVersion { get; init; }
	public Dictionary<string, CouponProviderCache> Providers { get; init; } =
		new(StringComparer.OrdinalIgnoreCase);
}
internal sealed record CouponProviderCache(
	DateTimeOffset? LastAttemptUtc,
	DateTimeOffset? LastSuccessUtc,
	DateTimeOffset? NextAllowedUtc,
	int ConsecutiveFailures,
	bool LastSnapshotComplete,
	List<CouponEntry> Coupons,
	string? LastError);
internal sealed record CouponRefreshDebug(string SourceUrl, int? HttpStatus, int RawResponseLength, int CouponsParsed, bool ParsingSucceeded, bool CacheUpdated, string? FailureReason);

