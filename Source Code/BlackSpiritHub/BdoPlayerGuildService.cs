using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal sealed record BdoCharacterSummary(
	string Name,
	string Class,
	int? Level);

internal sealed record BdoPlayerSearchResult(
	string FamilyName,
	string? Guild,
	string Region,
	BdoCharacterSummary? MainCharacter)
{
	[System.Text.Json.Serialization.JsonIgnore]
	public string? ProfileTarget { get; init; }
}

internal sealed record BdoGuildSearchResult(
	string GuildName,
	string? GuildMaster,
	int MemberCount,
	DateTimeOffset? LastUpdatedUtc);

internal sealed record BdoGuildMemberSummary(
	string FamilyName,
	bool HasCachedProfile,
	bool? IsPrivate,
	BdoCharacterSummary? MainCharacter);

internal sealed record BdoPlayerGuildSearchResponse(
	string Status,
	string Mode,
	string Region,
	string Query,
	IReadOnlyList<BdoPlayerSearchResult> Players,
	IReadOnlyList<BdoGuildSearchResult> Guilds,
	DateTimeOffset CachedAtUtc,
	bool IsStale,
	string? Message);

internal sealed record BdoGuildProfileResponse(
	string Status,
	string SourceStatus,
	string Region,
	string GuildName,
	string? GuildMaster,
	int MemberCount,
	IReadOnlyList<string> Members,
	DateTimeOffset? ScrapedAtUtc,
	DateTimeOffset? UpdatedAtUtc,
	DateTimeOffset CachedAtUtc,
	bool IsStale,
	string? Message)
{
	public IReadOnlyList<BdoGuildMemberSummary> MembersDetailed { get; init; } = [];
}

internal sealed record BdoPlayerCharacter(
	string Name,
	string Class,
	int? Level,
	bool IsMain);

internal sealed record BdoLifeSkill(
	string Name,
	string Rank,
	int? Level,
	int? Mastery);

internal sealed record BdoGuildHistoryEntry(
	string GuildName,
	DateTimeOffset? JoinedAtUtc,
	DateTimeOffset? LeftAtUtc);

internal sealed record BdoPlayerProfileResponse(
	string Status,
	string SourceStatus,
	string Region,
	string FamilyName,
	string? Guild,
	int? MaxGearScore,
	int? Energy,
	int? ContributionPoints,
	string? FamilyCreated,
	IReadOnlyList<BdoPlayerCharacter> Characters,
	IReadOnlyList<BdoLifeSkill> LifeSkills,
	IReadOnlyList<BdoGuildHistoryEntry> GuildHistory,
	DateTimeOffset? ScrapedAtUtc,
	DateTimeOffset CachedAtUtc,
	bool IsStale,
	string? Message)
{
	// BDO Alerts currently has no explicit visibility field. These normalized
	// values let the UI distinguish the service's restricted-profile shape from
	// a public profile that merely has some missing optional data.
	// IsPrivate: true=restricted signature, false=public progress, null=unknown.
	// IsComplete: true=all expected progress groups, false=limited, null=unknown.
	public bool? IsPrivate { get; init; }
	public bool? IsComplete { get; init; }
}

internal sealed record BdoCachedSearch(
	DateTimeOffset CachedAtUtc,
	BdoPlayerGuildSearchResponse Value);

internal sealed record BdoCachedGuild(
	DateTimeOffset CachedAtUtc,
	BdoGuildProfileResponse Value);

internal sealed record BdoCachedPlayer(
	DateTimeOffset CachedAtUtc,
	BdoPlayerProfileResponse Value);

internal sealed record BdoCachedPlayerIdentity(
	DateTimeOffset CachedAtUtc,
	string CanonicalFamilyName,
	string ProfileTarget);

internal sealed record BdoPlayerGuildCache(
	int SchemaVersion,
	Dictionary<string, BdoCachedSearch> Searches,
	Dictionary<string, BdoCachedGuild> Guilds,
	Dictionary<string, BdoCachedPlayer> Players)
{
	public Dictionary<string, BdoCachedPlayerIdentity> PlayerIdentities { get; init; } =
		new(StringComparer.Ordinal);
}

internal sealed class BdoPlayerGuildService : IDisposable
{
	private sealed class PlayerIdentityResolutionException : Exception
	{
		public PlayerIdentityResolutionException(string message)
			: base(message)
		{
		}
	}

	private const int CurrentSchemaVersion = 1;
	private const long MaxResponseBytes = 2 * 1024 * 1024;
	private const long MaxCacheBytes = 16 * 1024 * 1024;
	private const int MaxSearchResults = 100;
	private const int MaxGuildMembers = 200;
	private const int MaxCharacters = 100;
	private const int MaxLifeSkills = 32;
	private const int MaxGuildHistory = 100;
	private const int MaxSearchCacheEntries = 50;
	private const int MaxGuildCacheEntries = 50;
	private const int MaxPlayerCacheEntries = 250;
	private const int MaxPlayerIdentityCacheEntries = 250;

	private static readonly TimeSpan SearchCacheLifetime = TimeSpan.FromMinutes(10);
	private static readonly TimeSpan ProfileCacheLifetime = TimeSpan.FromHours(1);
	private static readonly TimeSpan PlayerIdentityCacheLifetime = TimeSpan.FromDays(7);
	private static readonly TimeSpan MaximumStaleAge = TimeSpan.FromDays(7);

	private static readonly HashSet<string> SupportedRegions = new(StringComparer.Ordinal)
	{
		"eu",
		"na",
		"kr",
		"sa",
		"asia"
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
	private readonly string? apiKeyOverride;
	private readonly Func<DateTimeOffset> utcNow;
	private readonly SemaphoreSlim operationGate = new(1, 1);
	private BdoPlayerGuildCache? cache;
	private bool disposed;

	internal TimeSpan RequestTimeoutForTest => http.Timeout;

	public BdoPlayerGuildService(AppPaths paths, AppLogger logger)
		: this(
			paths,
			logger,
			new HttpClientHandler
			{
				AllowAutoRedirect = false
			},
			null,
			null)
	{
	}

	internal BdoPlayerGuildService(
		AppPaths paths,
		AppLogger logger,
		HttpMessageHandler handler,
		string? apiKey,
		Func<DateTimeOffset>? utcNow)
	{
		this.paths = paths;
		this.logger = logger;
		apiKeyOverride = apiKey;
		this.utcNow = utcNow ?? (() => DateTimeOffset.UtcNow);
		http = new HttpClient(handler)
		{
			// A cold BDO Alerts player scrape regularly takes longer than 20 seconds.
			// Keep this bounded below the WebView bridge timeout, while allowing the
			// upstream service enough time to populate its one-hour profile cache.
			Timeout = TimeSpan.FromSeconds(30),
			MaxResponseContentBufferSize = MaxResponseBytes
		};
		http.DefaultRequestHeaders.UserAgent.Add(
			new ProductInfoHeaderValue(
				"Black-Spirit-Hub",
				AppVersion.Current.TrimStart('v', 'V')));
		http.DefaultRequestHeaders.Accept.Add(
			new MediaTypeWithQualityHeaderValue("application/json"));
	}

	public async Task<BdoPlayerGuildSearchResponse> SearchAsync(
		string mode,
		string region,
		string query,
		CancellationToken cancellationToken)
	{
		ThrowIfDisposed();
		string normalizedMode = NormalizeMode(mode);
		string normalizedRegion = NormalizeRegion(region);
		string normalizedQuery = NormalizeLookupText(query, "Search text", minimumLength: 2);
		string key = CacheKey(normalizedRegion, normalizedMode, normalizedQuery);
		Stopwatch duration = Stopwatch.StartNew();
		logger.Info(
			$"BDO Alerts {normalizedMode} search requested for {normalizedRegion.ToUpperInvariant()} "
			+ $"({normalizedQuery.Length.ToString(CultureInfo.InvariantCulture)}-character query).");

		await operationGate.WaitAsync(cancellationToken);
		try
		{
			BdoPlayerGuildCache current = await GetCacheAsync(cancellationToken);
			DateTimeOffset now = utcNow();
			if (current.Searches.TryGetValue(key, out BdoCachedSearch? saved)
				&& now - saved.CachedAtUtc <= SearchCacheLifetime)
			{
				if (normalizedMode == "player"
					&& CachePlayerSearchIdentities(current, saved.Value, saved.CachedAtUtc))
				{
					try
					{
						await SaveCacheAsync(current, cancellationToken);
					}
					catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
					{
						logger.Warn(
							"Could not persist player identities recovered from a cached BDO Alerts search. "
							+ ex.Message);
					}
				}
				logger.Info(
					$"BDO Alerts {normalizedMode} search completed from the local cache in "
					+ $"{duration.ElapsedMilliseconds.ToString(CultureInfo.InvariantCulture)} ms.");
				return saved.Value with
				{
					Status = "CACHED",
					CachedAtUtc = saved.CachedAtUtc,
					IsStale = false,
					Message = null
				};
			}

			try
			{
				Uri endpoint = BuildSearchEndpoint(normalizedMode, normalizedRegion, normalizedQuery);
				using JsonDocument document = await SendJsonAsync(
					endpoint,
					$"{normalizedMode} search",
					cancellationToken);
				BdoPlayerGuildSearchResponse fresh = ParseSearch(
					document.RootElement,
					normalizedMode,
					normalizedRegion,
					normalizedQuery,
					now);
				current.Searches[key] = new BdoCachedSearch(now, fresh);
				if (normalizedMode == "player")
				{
					CachePlayerSearchIdentities(current, fresh, now);
				}
				await SaveCacheAsync(current, cancellationToken);
				logger.Info(
					$"BDO Alerts {normalizedRegion.ToUpperInvariant()} {normalizedMode} search returned "
					+ $"{(normalizedMode == "player" ? fresh.Players.Count : fresh.Guilds.Count).ToString(CultureInfo.InvariantCulture)} result(s) in "
					+ $"{duration.ElapsedMilliseconds.ToString(CultureInfo.InvariantCulture)} ms.");
				return fresh;
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex) when (IsRecoverable(ex))
			{
				logger.Warn(
					$"BDO Alerts {normalizedMode} search failed after "
					+ $"{duration.ElapsedMilliseconds.ToString(CultureInfo.InvariantCulture)} ms. "
					+ FriendlyFailure(ex));
				BdoPlayerGuildSearchResponse restored =
					RestoreSearchOrThrow(current, key, now, ex);
				logger.Info($"BDO Alerts {normalizedMode} search served the saved stale result.");
				return restored;
			}
		}
		finally
		{
			operationGate.Release();
		}
	}

	public async Task<BdoGuildProfileResponse> GetGuildProfileAsync(
		string region,
		string guildName,
		CancellationToken cancellationToken,
		bool forceRefresh = false)
	{
		ThrowIfDisposed();
		string normalizedRegion = NormalizeRegion(region);
		string normalizedName = NormalizeLookupText(guildName, "Guild name", minimumLength: 1);
		string key = CacheKey(normalizedRegion, "guild", normalizedName);
		Stopwatch duration = Stopwatch.StartNew();
		logger.Info(
			$"BDO Alerts guild profile requested for {normalizedRegion.ToUpperInvariant()} "
			+ $"({normalizedName.Length.ToString(CultureInfo.InvariantCulture)}-character guild name; local reload={forceRefresh.ToString().ToLowerInvariant()}).");

		await operationGate.WaitAsync(cancellationToken);
		try
		{
			BdoPlayerGuildCache current = await GetCacheAsync(cancellationToken);
			DateTimeOffset now = utcNow();
			if (!forceRefresh
				&& current.Guilds.TryGetValue(key, out BdoCachedGuild? saved)
				&& now - saved.CachedAtUtc <= ProfileCacheLifetime)
			{
				logger.Info(
					"BDO Alerts guild profile completed from the local cache in "
					+ $"{duration.ElapsedMilliseconds.ToString(CultureInfo.InvariantCulture)} ms.");
				return WithCachedMemberSummaries(
					saved.Value with
					{
						Status = "CACHED",
						CachedAtUtc = saved.CachedAtUtc,
						IsStale = false,
						Message = null
					},
					current,
					now);
			}

			try
			{
				Uri endpoint = BuildProfileEndpoint("guild", normalizedRegion, normalizedName);
				using JsonDocument document = await SendJsonAsync(
					endpoint,
					"guild profile",
					cancellationToken);
				BdoGuildProfileResponse fresh = ParseGuildProfile(
					document.RootElement,
					normalizedRegion,
					now);
				current.Guilds[key] = new BdoCachedGuild(now, fresh);
				await SaveCacheAsync(current, cancellationToken);
				logger.Info(
					$"BDO Alerts {normalizedRegion.ToUpperInvariant()} guild profile returned "
					+ $"{fresh.Members.Count.ToString(CultureInfo.InvariantCulture)} roster member(s) in "
					+ $"{duration.ElapsedMilliseconds.ToString(CultureInfo.InvariantCulture)} ms. No member profiles were requested.");
				return WithCachedMemberSummaries(fresh, current, now);
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex) when (IsRecoverable(ex))
			{
				logger.Warn(
					"BDO Alerts guild profile failed after "
					+ $"{duration.ElapsedMilliseconds.ToString(CultureInfo.InvariantCulture)} ms. "
					+ FriendlyFailure(ex));
				BdoGuildProfileResponse restored =
					RestoreGuildOrThrow(current, key, now, ex);
				logger.Info("BDO Alerts guild profile served the saved stale roster.");
				return WithCachedMemberSummaries(restored, current, now);
			}
		}
		finally
		{
			operationGate.Release();
		}
	}

	public async Task<BdoPlayerProfileResponse> GetPlayerProfileAsync(
		string region,
		string familyName,
		CancellationToken cancellationToken,
		bool forceRefresh = false)
	{
		ThrowIfDisposed();
		string normalizedRegion = NormalizeRegion(region);
		string normalizedName = NormalizeLookupText(familyName, "Family name", minimumLength: 1);
		string key = CacheKey(normalizedRegion, "player", normalizedName);
		Stopwatch duration = Stopwatch.StartNew();
		logger.Info(
			$"BDO Alerts player profile requested for {normalizedRegion.ToUpperInvariant()} "
			+ $"({normalizedName.Length.ToString(CultureInfo.InvariantCulture)}-character family name; local reload={forceRefresh.ToString().ToLowerInvariant()}).");

		await operationGate.WaitAsync(cancellationToken);
		try
		{
			BdoPlayerGuildCache current = await GetCacheAsync(cancellationToken);
			DateTimeOffset now = utcNow();
			if (!forceRefresh
				&& current.Players.TryGetValue(key, out BdoCachedPlayer? saved)
				&& now - saved.CachedAtUtc <= ProfileCacheLifetime)
			{
				BdoPlayerProfileResponse normalized = NormalizePlayerProfileMetadata(saved.Value);
				if (normalized.IsPrivate != saved.Value.IsPrivate
					|| normalized.IsComplete != saved.Value.IsComplete)
				{
					current.Players[key] = saved with { Value = normalized };
					try
					{
						await SaveCacheAsync(current, cancellationToken);
						logger.Info("Saved normalized visibility metadata for a cached BDO Alerts player profile.");
					}
					catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
					{
						logger.Warn(
							"Could not persist normalized visibility metadata for a cached BDO Alerts player profile. "
							+ ex.Message);
					}
				}
				logger.Info(
					"BDO Alerts player profile completed from the local cache in "
					+ $"{duration.ElapsedMilliseconds.ToString(CultureInfo.InvariantCulture)} ms.");
				return normalized with
				{
					Status = "CACHED",
					CachedAtUtc = saved.CachedAtUtc,
					IsStale = false,
					Message = null
				};
			}

			try
			{
				BdoCachedPlayerIdentity? identity = TryGetPlayerIdentity(
					current,
					key,
					now);
				if (identity is null)
				{
					identity = await ResolvePlayerIdentityAsync(
						current,
						key,
						normalizedRegion,
						normalizedName,
						now,
						forceNetwork: false,
						cancellationToken);
				}

				BdoPlayerProfileResponse fresh;
				try
				{
					fresh = await FetchPlayerProfileAsync(
						normalizedRegion,
						normalizedName,
						identity,
						now,
						forceRefresh,
						cancellationToken);
				}
				catch (HttpRequestException ex) when (IsNotFound(ex))
				{
					if (identity is not null)
					{
						await InvalidatePlayerIdentityAsync(current, key, cancellationToken);
					}
					identity = await ResolvePlayerIdentityAsync(
						current,
						key,
						normalizedRegion,
						normalizedName,
						now,
						forceNetwork: true,
						cancellationToken);
					try
					{
						fresh = await FetchPlayerProfileAsync(
							normalizedRegion,
							normalizedName,
							identity,
							now,
							forceRefresh,
							cancellationToken);
					}
					catch (HttpRequestException retryException) when (IsNotFound(retryException))
					{
						await InvalidatePlayerIdentityAsync(current, key, cancellationToken);
						throw;
					}
				}
				current.Players[key] = new BdoCachedPlayer(now, fresh);
				await SaveCacheAsync(current, cancellationToken);
				logger.Info(
					$"BDO Alerts {normalizedRegion.ToUpperInvariant()} player profile returned "
					+ $"{fresh.Characters.Count.ToString(CultureInfo.InvariantCulture)} character(s) and "
					+ $"{fresh.LifeSkills.Count.ToString(CultureInfo.InvariantCulture)} life skill(s) in "
					+ $"{duration.ElapsedMilliseconds.ToString(CultureInfo.InvariantCulture)} ms.");
				return fresh;
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception ex) when (IsRecoverable(ex))
			{
				logger.Warn(
					"BDO Alerts player profile failed after "
					+ $"{duration.ElapsedMilliseconds.ToString(CultureInfo.InvariantCulture)} ms. "
					+ FriendlyFailure(ex));
				BdoPlayerProfileResponse restored = RestorePlayerOrThrow(
					current,
					key,
					now,
					ex,
					forceRefresh);
				logger.Info("BDO Alerts player profile served the saved stale profile.");
				return restored;
			}
		}
		finally
		{
			operationGate.Release();
		}
	}

	private static BdoCachedPlayerIdentity? TryGetPlayerIdentity(
		BdoPlayerGuildCache current,
		string key,
		DateTimeOffset now)
	{
		return current.PlayerIdentities.TryGetValue(key, out BdoCachedPlayerIdentity? saved)
			&& now - saved.CachedAtUtc <= PlayerIdentityCacheLifetime
				? saved
				: null;
	}

	private static bool CachePlayerSearchIdentities(
		BdoPlayerGuildCache current,
		BdoPlayerGuildSearchResponse search,
		DateTimeOffset cachedAtUtc)
	{
		bool changed = false;
		foreach (IGrouping<string, BdoPlayerSearchResult> matches in search.Players
			.Where(result =>
				result.ProfileTarget is not null
				&& result.Region.Equals(search.Region, StringComparison.OrdinalIgnoreCase))
			.GroupBy(
				result => CacheKey(search.Region, "player", result.FamilyName),
				StringComparer.Ordinal))
		{
			BdoPlayerSearchResult[] candidates = matches.ToArray();
			if (candidates.Length != 1)
			{
				changed |= current.PlayerIdentities.Remove(matches.Key);
				continue;
			}
			BdoPlayerSearchResult result = candidates[0];
			BdoCachedPlayerIdentity identity = new(
				cachedAtUtc,
				result.FamilyName,
				result.ProfileTarget!);
			if (!current.PlayerIdentities.TryGetValue(matches.Key, out BdoCachedPlayerIdentity? saved)
				|| saved != identity)
			{
				current.PlayerIdentities[matches.Key] = identity;
				changed = true;
			}
		}
		return changed;
	}

	private async Task<BdoCachedPlayerIdentity> ResolvePlayerIdentityAsync(
		BdoPlayerGuildCache current,
		string identityKey,
		string region,
		string requestedFamilyName,
		DateTimeOffset now,
		bool forceNetwork,
		CancellationToken cancellationToken)
	{
		if (requestedFamilyName.Length < 2)
		{
			throw new PlayerIdentityResolutionException(
				"That player profile could not be resolved from the family name.");
		}

		if (!forceNetwork
			&& TryGetPlayerIdentity(current, identityKey, now) is BdoCachedPlayerIdentity saved)
		{
			return saved;
		}

		string searchKey = CacheKey(region, "player", requestedFamilyName);
		BdoPlayerGuildSearchResponse search;
		bool usedCachedSearch = false;
		if (!forceNetwork
			&& current.Searches.TryGetValue(searchKey, out BdoCachedSearch? cachedSearch)
			&& now - cachedSearch.CachedAtUtc <= SearchCacheLifetime)
		{
			search = cachedSearch.Value;
			usedCachedSearch = true;
		}
		else
		{
			search = await FetchPlayerIdentitySearchAsync(
				region,
				requestedFamilyName,
				now,
				cancellationToken);
			current.Searches[searchKey] = new BdoCachedSearch(now, search);
		}

		BdoPlayerSearchResult[] exactMatches = search.Players
			.Where(result =>
				result.Region.Equals(region, StringComparison.OrdinalIgnoreCase)
				&& result.FamilyName.Equals(requestedFamilyName, StringComparison.OrdinalIgnoreCase))
			.ToArray();
		if (usedCachedSearch
			&& (exactMatches.Length != 1 || exactMatches[0].ProfileTarget is null))
		{
			logger.Info(
				"A cached BDO Alerts player search did not contain one usable exact identity; refreshing it once.");
			search = await FetchPlayerIdentitySearchAsync(
				region,
				requestedFamilyName,
				now,
				cancellationToken);
			current.Searches[searchKey] = new BdoCachedSearch(now, search);
			exactMatches = search.Players
				.Where(result =>
					result.Region.Equals(region, StringComparison.OrdinalIgnoreCase)
					&& result.FamilyName.Equals(requestedFamilyName, StringComparison.OrdinalIgnoreCase))
				.ToArray();
		}
		if (exactMatches.Length == 0)
		{
			throw new PlayerIdentityResolutionException(
				"That player profile was not found or is not public.");
		}
		if (exactMatches.Length != 1)
		{
			throw new PlayerIdentityResolutionException(
				"That family name matched more than one player profile.");
		}

		BdoPlayerSearchResult exact = exactMatches[0];
		if (exact.ProfileTarget is null)
		{
			throw new PlayerIdentityResolutionException(
				"That player profile could not be opened from the available search result.");
		}

		BdoCachedPlayerIdentity identity = new(
			now,
			exact.FamilyName,
			exact.ProfileTarget);
		current.PlayerIdentities[identityKey] = identity;
		await SaveCacheAsync(current, cancellationToken);
		logger.Info("BDO Alerts player identity resolved and cached from one exact regional match.");
		return identity;
	}

	private async Task<BdoPlayerGuildSearchResponse> FetchPlayerIdentitySearchAsync(
		string region,
		string requestedFamilyName,
		DateTimeOffset cachedAtUtc,
		CancellationToken cancellationToken)
	{
		logger.Info(
			$"BDO Alerts player identity search requested for {region.ToUpperInvariant()} "
			+ $"({requestedFamilyName.Length.ToString(CultureInfo.InvariantCulture)}-character family name).");
		Uri searchEndpoint = BuildSearchEndpoint("player", region, requestedFamilyName);
		using JsonDocument searchDocument = await SendJsonAsync(
			searchEndpoint,
			"player identity search",
			cancellationToken);
		return ParseSearch(
			searchDocument.RootElement,
			"player",
			region,
			requestedFamilyName,
			cachedAtUtc,
			ignoreUnexpectedPlayerRegions: true);
	}

	private async Task<BdoPlayerProfileResponse> FetchPlayerProfileAsync(
		string region,
		string requestedFamilyName,
		BdoCachedPlayerIdentity? identity,
		DateTimeOffset cachedAtUtc,
		bool forceUpstreamRefresh,
		CancellationToken cancellationToken)
	{
		string endpointFamilyName = identity?.CanonicalFamilyName ?? requestedFamilyName;
		Uri endpoint = BuildProfileEndpoint(
			"player",
			region,
			endpointFamilyName,
			identity?.ProfileTarget,
			forceUpstreamRefresh);
		using JsonDocument document = await SendJsonAsync(
			endpoint,
			"player profile",
			cancellationToken);
		ValidatePlayerProfileIdentity(
			document.RootElement,
			region,
			endpointFamilyName,
			requireCanonicalCase: identity is not null);
		return ParsePlayerProfile(
			document.RootElement,
			region,
			cachedAtUtc);
	}

	private async Task InvalidatePlayerIdentityAsync(
		BdoPlayerGuildCache current,
		string key,
		CancellationToken cancellationToken)
	{
		if (current.PlayerIdentities.Remove(key))
		{
			await SaveCacheAsync(current, cancellationToken);
			logger.Info("Invalidated a cached BDO Alerts player identity after a profile miss.");
		}
	}

	private static bool IsNotFound(HttpRequestException exception)
	{
		return exception.StatusCode == HttpStatusCode.NotFound;
	}

	private static void ValidatePlayerProfileIdentity(
		JsonElement root,
		string expectedRegion,
		string expectedFamilyName,
		bool requireCanonicalCase)
	{
		string? returnedRegion = ReadOptionalString(root, "region", 16);
		if (returnedRegion is null
			|| !returnedRegion.Equals(expectedRegion, StringComparison.OrdinalIgnoreCase))
		{
			throw new InvalidDataException("BDO Alerts returned a player profile for an unexpected region.");
		}

		string returnedFamilyName = ReadRequiredLookupName(root, "family_name", "family name");
		StringComparison comparison = requireCanonicalCase
			? StringComparison.Ordinal
			: StringComparison.OrdinalIgnoreCase;
		if (!returnedFamilyName.Equals(expectedFamilyName, comparison))
		{
			throw new InvalidDataException("BDO Alerts returned a different player profile than requested.");
		}
	}

	internal static Uri BuildSearchEndpointForTest(string mode, string region, string query)
	{
		return BuildSearchEndpoint(
			NormalizeMode(mode),
			NormalizeRegion(region),
			NormalizeLookupText(query, "Search text", minimumLength: 2));
	}

	internal static Uri BuildProfileEndpointForTest(
		string kind,
		string region,
		string name,
		string? profileTarget = null,
		bool forceRefresh = false)
	{
		string normalizedKind = NormalizeMode(kind);
		return BuildProfileEndpoint(
			normalizedKind,
			NormalizeRegion(region),
			NormalizeLookupText(name, "Profile name", minimumLength: 1),
			profileTarget is null ? null : NormalizeProfileTarget(profileTarget),
			forceRefresh);
	}

	private static Uri BuildSearchEndpoint(string mode, string region, string query)
	{
		return new Uri(
			$"https://api.bdoalerts.net/api/{mode}/search/{region}?query={Uri.EscapeDataString(query)}");
	}

	private static Uri BuildProfileEndpoint(
		string kind,
		string region,
		string name,
		string? profileTarget = null,
		bool forceRefresh = false)
	{
		if (forceRefresh && (profileTarget is null || !kind.Equals("player", StringComparison.Ordinal)))
		{
			throw new InvalidOperationException(
				"An upstream refresh requires a resolved player profile target.");
		}
		string endpoint =
			$"https://api.bdoalerts.net/api/{kind}/{region}/{Uri.EscapeDataString(name)}";
		if (profileTarget is not null)
		{
			if (!kind.Equals("player", StringComparison.Ordinal))
			{
				throw new InvalidOperationException("A profile target is only supported for player profiles.");
			}
			endpoint += "?profile_target=" + Uri.EscapeDataString(profileTarget);
			if (forceRefresh)
			{
				endpoint += "&force_refresh=true";
			}
		}
		return new Uri(endpoint);
	}

	private async Task<JsonDocument> SendJsonAsync(
		Uri endpoint,
		string operation,
		CancellationToken cancellationToken)
	{
		using HttpRequestMessage request = new(HttpMethod.Get, endpoint);
		string? apiKey = apiKeyOverride ?? BdoAlertsApiCredentials.Resolve();
		if (!BdoAlertsApiCredentials.TryApply(request, endpoint, apiKey))
		{
			throw new UnauthorizedAccessException(
				"Player and guild lookup is not configured for this request.");
		}

		using HttpResponseMessage response = await http.SendAsync(
			request,
			HttpCompletionOption.ResponseHeadersRead,
			cancellationToken);
		if (!response.IsSuccessStatusCode)
		{
			throw CreateHttpFailure(response.StatusCode, operation);
		}
		if (response.Content.Headers.ContentLength is > MaxResponseBytes)
		{
			throw new InvalidDataException("BDO Alerts returned an unexpectedly large player or guild response.");
		}

		await using Stream stream = await response.Content.ReadAsStreamAsync(cancellationToken);
		using MemoryStream buffer = new();
		byte[] chunk = new byte[32 * 1024];
		while (true)
		{
			int read = await stream.ReadAsync(chunk.AsMemory(0, chunk.Length), cancellationToken);
			if (read == 0)
			{
				break;
			}
			if (buffer.Length + read > MaxResponseBytes)
			{
				throw new InvalidDataException("BDO Alerts returned an unexpectedly large player or guild response.");
			}
			await buffer.WriteAsync(chunk.AsMemory(0, read), cancellationToken);
		}
		buffer.Position = 0;
		return await JsonDocument.ParseAsync(
			buffer,
			new JsonDocumentOptions
			{
				AllowTrailingCommas = false,
				CommentHandling = JsonCommentHandling.Disallow,
				MaxDepth = 16
			},
			cancellationToken);
	}

	private static Exception CreateHttpFailure(HttpStatusCode statusCode, string operation)
	{
		string message = statusCode switch
		{
			HttpStatusCode.Forbidden => "Player and guild lookup could not be authorized.",
			HttpStatusCode.NotFound when operation.Equals("player profile", StringComparison.Ordinal)
				=> "That player profile was not found or is not public.",
			HttpStatusCode.NotFound when operation.Equals("guild profile", StringComparison.Ordinal)
				=> "That guild profile was not found.",
			HttpStatusCode.NotFound => "The requested player or guild data was not found.",
			(HttpStatusCode)429 => "Player and guild lookup is busy. Try again shortly.",
			HttpStatusCode.ServiceUnavailable => "Player and guild data is temporarily unavailable.",
			_ => $"Player and guild lookup failed with HTTP {(int)statusCode}."
		};
		return new HttpRequestException(message, null, statusCode);
	}

	private static BdoPlayerGuildSearchResponse ParseSearch(
		JsonElement root,
		string mode,
		string region,
		string query,
		DateTimeOffset cachedAtUtc,
		bool ignoreUnexpectedPlayerRegions = false)
	{
		ValidateEnvelope(root, region);
		if (!root.TryGetProperty("results", out JsonElement results)
			|| results.ValueKind != JsonValueKind.Array
			|| results.GetArrayLength() > MaxSearchResults)
		{
			throw new InvalidDataException("BDO Alerts returned an invalid search result list.");
		}

		List<BdoPlayerSearchResult> players = [];
		List<BdoGuildSearchResult> guilds = [];
		foreach (JsonElement item in results.EnumerateArray())
		{
			if (item.ValueKind != JsonValueKind.Object)
			{
				throw new InvalidDataException("BDO Alerts returned a malformed search result.");
			}

			if (mode == "player")
			{
				string familyName = ReadRequiredLookupName(item, "family_name", "family name");
				string? guild = ReadOptionalLookupName(item, "guild");
				string resultRegion = ReadOptionalString(item, "region", 16) ?? region;
				if (!resultRegion.Equals(region, StringComparison.OrdinalIgnoreCase))
				{
					if (ignoreUnexpectedPlayerRegions)
					{
						continue;
					}
					throw new InvalidDataException("BDO Alerts returned a player from an unexpected region.");
				}
				players.Add(new BdoPlayerSearchResult(
					familyName,
					guild,
					region,
					ParseMainCharacter(item))
				{
					ProfileTarget = ReadOptionalProfileTarget(item)
				});
			}
			else
			{
				guilds.Add(new BdoGuildSearchResult(
					ReadRequiredLookupName(item, "guild_name", "guild name"),
					ReadOptionalLookupName(item, "guild_master"),
					ReadBoundedInt(item, "member_count", 0, MaxGuildMembers) ?? 0,
					ReadDateTimeOffset(item, "last_updated")));
			}
		}

		return new BdoPlayerGuildSearchResponse(
			"LIVE",
			mode,
			region,
			query,
			players,
			guilds,
			cachedAtUtc,
			false,
			null);
	}

	private static BdoGuildProfileResponse ParseGuildProfile(
		JsonElement root,
		string region,
		DateTimeOffset cachedAtUtc)
	{
		ValidateEnvelope(root, region);
		string guildName = ReadRequiredLookupName(root, "guild_name", "guild name");
		List<string> members = [];
		if (root.TryGetProperty("members", out JsonElement memberValues))
		{
			if (memberValues.ValueKind != JsonValueKind.Array
				|| memberValues.GetArrayLength() > MaxGuildMembers)
			{
				throw new InvalidDataException("BDO Alerts returned an invalid guild roster.");
			}
			foreach (JsonElement member in memberValues.EnumerateArray())
			{
				if (member.ValueKind != JsonValueKind.String)
				{
					throw new InvalidDataException("BDO Alerts returned a malformed guild roster member.");
				}
				members.Add(NormalizeLookupText(
					member.GetString(),
					"Guild roster family name",
					minimumLength: 1));
			}
		}

		if (root.TryGetProperty("members_detailed", out JsonElement detailedValues)
			&& detailedValues.ValueKind == JsonValueKind.Array)
		{
			if (detailedValues.GetArrayLength() > MaxGuildMembers)
			{
				throw new InvalidDataException("BDO Alerts returned too many detailed guild members.");
			}
			foreach (JsonElement detailed in detailedValues.EnumerateArray())
			{
				if (detailed.ValueKind == JsonValueKind.Object
					&& detailed.TryGetProperty("family_name", out JsonElement family)
					&& family.ValueKind == JsonValueKind.String)
				{
					members.Add(NormalizeLookupText(
						family.GetString(),
						"Detailed guild roster family name",
						minimumLength: 1));
				}
			}
		}

		string[] normalizedMembers = members
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.OrderBy(member => member, StringComparer.OrdinalIgnoreCase)
			.ToArray();
		int declaredCount = ReadBoundedInt(root, "member_count", 0, MaxGuildMembers)
			?? normalizedMembers.Length;

		return new BdoGuildProfileResponse(
			"LIVE",
			ReadOptionalString(root, "status", 32) ?? "unknown",
			region,
			guildName,
			ReadOptionalLookupName(root, "guild_master"),
			Math.Max(declaredCount, normalizedMembers.Length),
			normalizedMembers,
			ReadDateTimeOffset(root, "scraped_at"),
			ReadDateTimeOffset(root, "updated_at"),
			cachedAtUtc,
			false,
			null);
	}

	private static BdoPlayerProfileResponse ParsePlayerProfile(
		JsonElement root,
		string region,
		DateTimeOffset cachedAtUtc)
	{
		ValidateEnvelope(root, region);
		List<BdoPlayerCharacter> characters = ParseCharacters(root);
		List<BdoLifeSkill> lifeSkills = ParseLifeSkills(root);
		List<BdoGuildHistoryEntry> guildHistory = ParseGuildHistory(root);
		int? maxGearScore = ReadBoundedInt(root, "max_gear_score", 0, 5000)
			?? ReadBoundedInt(root, "gear_score", 0, 5000);
		int? energy = ReadBoundedInt(root, "energy", 0, 10000);
		int? contributionPoints = ReadBoundedInt(root, "contribution_points", 0, 10000);
		(bool? isPrivate, bool? isComplete) =
			ClassifyPlayerProfile(characters, lifeSkills, maxGearScore, energy, contributionPoints);

		BdoPlayerProfileResponse response = new(
			"LIVE",
			ReadOptionalString(root, "status", 32) ?? "unknown",
			region,
			ReadRequiredLookupName(root, "family_name", "family name"),
			ReadOptionalLookupName(root, "guild"),
			maxGearScore,
			energy,
			contributionPoints,
			ReadOptionalString(root, "family_created", 128),
			characters,
			lifeSkills,
			guildHistory,
			ReadDateTimeOffset(root, "scraped_at"),
			cachedAtUtc,
			false,
			null);
		return response with
		{
			IsPrivate = isPrivate,
			IsComplete = isComplete
		};
	}

	private static (bool? IsPrivate, bool? IsComplete)
		ClassifyPlayerProfile(
			IReadOnlyList<BdoPlayerCharacter> characters,
			IReadOnlyList<BdoLifeSkill> lifeSkills,
			int? maxGearScore,
			int? energy,
			int? contributionPoints)
	{
		bool hasCharacterLevels = characters.Any(character => character.Level.HasValue);
		bool hasPublicProgress = hasCharacterLevels
			|| lifeSkills.Count > 0
			|| maxGearScore.HasValue
			|| energy.HasValue
			|| contributionPoints.HasValue;
		bool restrictedShape = characters.Count > 0 && !hasPublicProgress;
		if (restrictedShape)
		{
			return (true, false);
		}

		if (!hasPublicProgress)
		{
			return (null, null);
		}

		bool complete = characters.Count > 0
			&& characters.All(character => character.Level.HasValue)
			&& lifeSkills.Count > 0
			&& maxGearScore.HasValue
			&& energy.HasValue
			&& contributionPoints.HasValue;
		return (false, complete);
	}

	private static BdoPlayerProfileResponse NormalizePlayerProfileMetadata(
		BdoPlayerProfileResponse profile)
	{
		(bool? isPrivate, bool? isComplete) = ClassifyPlayerProfile(
			profile.Characters,
			profile.LifeSkills,
			profile.MaxGearScore,
			profile.Energy,
			profile.ContributionPoints);
		return profile with
		{
			IsPrivate = isPrivate,
			IsComplete = isComplete
		};
	}

	private static BdoGuildProfileResponse WithCachedMemberSummaries(
		BdoGuildProfileResponse guild,
		BdoPlayerGuildCache current,
		DateTimeOffset now)
	{
		BdoGuildMemberSummary[] summaries = guild.Members
			.Select(familyName =>
			{
				string playerKey = CacheKey(guild.Region, "player", familyName);
				if (!current.Players.TryGetValue(playerKey, out BdoCachedPlayer? saved)
					|| saved is null)
				{
					return new BdoGuildMemberSummary(familyName, false, null, null);
				}

				TimeSpan age = now - saved.CachedAtUtc;
				if (age < TimeSpan.Zero || age > ProfileCacheLifetime)
				{
					return new BdoGuildMemberSummary(familyName, false, null, null);
				}

				BdoPlayerProfileResponse profile =
					NormalizePlayerProfileMetadata(saved.Value);
				if (!string.Equals(
						profile.Region,
						guild.Region,
						StringComparison.OrdinalIgnoreCase)
					|| !string.Equals(
						profile.FamilyName,
						familyName,
						StringComparison.OrdinalIgnoreCase))
				{
					return new BdoGuildMemberSummary(familyName, false, null, null);
				}

				BdoCharacterSummary? mainCharacter = null;
				if (profile.IsPrivate == false)
				{
					BdoPlayerCharacter? main =
						profile.Characters.FirstOrDefault(character => character.IsMain);
					if (main is not null)
					{
						mainCharacter = new BdoCharacterSummary(
							main.Name,
							main.Class,
							main.Level);
					}
				}

				return new BdoGuildMemberSummary(
					familyName,
					true,
					profile.IsPrivate,
					mainCharacter);
			})
			.ToArray();

		// The projection is deliberately return-only. It never mutates the guild
		// cache and never performs a player lookup or any other network request.
		return guild with { MembersDetailed = summaries };
	}

	private static BdoCharacterSummary? ParseMainCharacter(JsonElement item)
	{
		if (!item.TryGetProperty("main_character", out JsonElement main)
			|| main.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
		{
			return null;
		}
		if (main.ValueKind != JsonValueKind.Object)
		{
			throw new InvalidDataException("BDO Alerts returned an invalid main character.");
		}
		string name = ReadRequiredLookupName(main, "name", "character name");
		string className = ReadOptionalString(main, "class", 64) ?? "Unknown";
		return new BdoCharacterSummary(
			name,
			className,
			ReadBoundedInt(main, "level", 0, 200));
	}

	private static List<BdoPlayerCharacter> ParseCharacters(JsonElement root)
	{
		if (!root.TryGetProperty("characters", out JsonElement values)
			|| values.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
		{
			return [];
		}
		if (values.ValueKind != JsonValueKind.Array
			|| values.GetArrayLength() > MaxCharacters)
		{
			throw new InvalidDataException("BDO Alerts returned an invalid character list.");
		}

		List<BdoPlayerCharacter> characters = [];
		foreach (JsonElement value in values.EnumerateArray())
		{
			if (value.ValueKind != JsonValueKind.Object)
			{
				throw new InvalidDataException("BDO Alerts returned a malformed character.");
			}
			characters.Add(new BdoPlayerCharacter(
				ReadRequiredLookupName(value, "character_name", "character name"),
				ReadOptionalString(value, "character_class", 64) ?? "Unknown",
				ReadBoundedInt(value, "level", 0, 200),
				ReadBoolean(value, "is_main") ?? false));
		}
		return characters
			.OrderByDescending(character => character.Level ?? 0)
			.ThenByDescending(character => character.IsMain)
			.ThenBy(character => character.Name, StringComparer.OrdinalIgnoreCase)
			.ToList();
	}

	private static List<BdoLifeSkill> ParseLifeSkills(JsonElement root)
	{
		if (!root.TryGetProperty("life_skills", out JsonElement values)
			|| values.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
		{
			return [];
		}
		if (values.ValueKind != JsonValueKind.Array
			|| values.GetArrayLength() > MaxLifeSkills)
		{
			throw new InvalidDataException("BDO Alerts returned an invalid life-skill list.");
		}

		List<BdoLifeSkill> skills = [];
		foreach (JsonElement value in values.EnumerateArray())
		{
			if (value.ValueKind != JsonValueKind.Object)
			{
				throw new InvalidDataException("BDO Alerts returned a malformed life skill.");
			}
			skills.Add(new BdoLifeSkill(
				ReadOptionalString(value, "skill_name", 64) ?? "Unknown",
				ReadOptionalString(value, "level_rank", 64) ?? "Unknown",
				ReadBoundedInt(value, "level_num", 0, 1000),
				ReadBoundedInt(value, "mastery", 0, 10000)));
		}
		return skills;
	}

	private static List<BdoGuildHistoryEntry> ParseGuildHistory(JsonElement root)
	{
		if (!root.TryGetProperty("guild_history", out JsonElement values)
			|| values.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
		{
			return [];
		}
		if (values.ValueKind != JsonValueKind.Array
			|| values.GetArrayLength() > MaxGuildHistory)
		{
			throw new InvalidDataException("BDO Alerts returned an invalid guild history.");
		}

		List<BdoGuildHistoryEntry> history = [];
		foreach (JsonElement value in values.EnumerateArray())
		{
			if (value.ValueKind != JsonValueKind.Object)
			{
				throw new InvalidDataException("BDO Alerts returned a malformed guild history entry.");
			}
			history.Add(new BdoGuildHistoryEntry(
				ReadRequiredLookupName(value, "guild_name", "guild history name"),
				ReadDateTimeOffset(value, "joined_at"),
				ReadDateTimeOffset(value, "left_at")));
		}
		return history;
	}

	private async Task<BdoPlayerGuildCache> GetCacheAsync(CancellationToken cancellationToken)
	{
		if (cache is not null)
		{
			return cache;
		}

		BdoPlayerGuildCache? loaded = null;
		foreach (string candidate in new[]
			{
				paths.BdoPlayerGuildCachePath,
				paths.BdoPlayerGuildCachePath + ".bak"
			})
		{
			if (CacheCandidateExceedsSafeSize(candidate))
			{
				logger.Warn(
					$"The saved BDO player/guild cache candidate '{Path.GetFileName(candidate)}' exceeded the safe size limit and was ignored.");
				continue;
			}
			BdoPlayerGuildCache? candidateCache =
				await AtomicFile.ReadJsonAsync<BdoPlayerGuildCache>(
					candidate,
					JsonOptions,
					cancellationToken);
			if (CacheLooksValid(candidateCache))
			{
				loaded = candidateCache;
				break;
			}
			if (candidateCache is not null)
			{
				logger.Warn(
					$"The saved BDO player/guild cache candidate '{Path.GetFileName(candidate)}' used an unsupported or invalid schema and was ignored.");
			}
		}
		loaded ??= NewCache();
		cache = loaded;
		return loaded;
	}

	private static bool CacheCandidateExceedsSafeSize(string path)
	{
		try
		{
			return File.Exists(path) && new FileInfo(path).Length > MaxCacheBytes;
		}
		catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
		{
			return false;
		}
	}

	private static bool CacheLooksValid(BdoPlayerGuildCache? value)
	{
		return value is not null
			&& value.SchemaVersion == CurrentSchemaVersion
			&& value.Searches is not null
			&& value.Guilds is not null
			&& value.Players is not null
			&& value.PlayerIdentities is not null
			&& value.Searches.Count <= MaxSearchCacheEntries * 4
			&& value.Guilds.Count <= MaxGuildCacheEntries * 4
			&& value.Players.Count <= MaxPlayerCacheEntries * 4
			&& value.PlayerIdentities.Count <= MaxPlayerIdentityCacheEntries * 4
			&& value.Searches.All(pair =>
				pair.Key.Length is > 0 and <= 200
				&& pair.Value?.Value is not null)
			&& value.Guilds.All(pair =>
				pair.Key.Length is > 0 and <= 200
				&& pair.Value?.Value is not null)
			&& value.Players.All(pair =>
				pair.Key.Length is > 0 and <= 200
				&& pair.Value?.Value is not null)
			&& value.PlayerIdentities.All(pair =>
				pair.Key.Length is > 0 and <= 200
				&& pair.Value is not null
				&& pair.Value.CanonicalFamilyName.Length is > 0 and <= 64
				&& IsValidProfileTarget(pair.Value.ProfileTarget));
	}

	private async Task SaveCacheAsync(
		BdoPlayerGuildCache current,
		CancellationToken cancellationToken)
	{
		TrimOldest(current.Searches, MaxSearchCacheEntries, entry => entry.CachedAtUtc);
		TrimOldest(current.Guilds, MaxGuildCacheEntries, entry => entry.CachedAtUtc);
		TrimOldest(current.Players, MaxPlayerCacheEntries, entry => entry.CachedAtUtc);
		TrimOldest(
			current.PlayerIdentities,
			MaxPlayerIdentityCacheEntries,
			entry => entry.CachedAtUtc);
		await AtomicFile.WriteAllTextAsync(
			paths.BdoPlayerGuildCachePath,
			JsonSerializer.Serialize(current, JsonOptions),
			cancellationToken);
	}

	private static void TrimOldest<T>(
		Dictionary<string, T> values,
		int maximumCount,
		Func<T, DateTimeOffset> timestamp)
	{
		int removeCount = values.Count - maximumCount;
		if (removeCount <= 0)
		{
			return;
		}
		foreach (string key in values
			.OrderBy(pair => timestamp(pair.Value))
			.Take(removeCount)
			.Select(pair => pair.Key)
			.ToArray())
		{
			values.Remove(key);
		}
	}

	private static BdoPlayerGuildCache NewCache()
	{
		return new BdoPlayerGuildCache(
			CurrentSchemaVersion,
			new Dictionary<string, BdoCachedSearch>(StringComparer.Ordinal),
			new Dictionary<string, BdoCachedGuild>(StringComparer.Ordinal),
			new Dictionary<string, BdoCachedPlayer>(StringComparer.Ordinal));
	}

	private static BdoPlayerGuildSearchResponse RestoreSearchOrThrow(
		BdoPlayerGuildCache current,
		string key,
		DateTimeOffset now,
		Exception exception)
	{
		if (current.Searches.TryGetValue(key, out BdoCachedSearch? saved)
			&& now - saved.CachedAtUtc <= MaximumStaleAge)
		{
			return saved.Value with
			{
				Status = "CACHED",
				CachedAtUtc = saved.CachedAtUtc,
				IsStale = true,
				Message = FriendlyFailure(exception)
			};
		}
		throw new InvalidOperationException(FriendlyFailure(exception), exception);
	}

	private static BdoGuildProfileResponse RestoreGuildOrThrow(
		BdoPlayerGuildCache current,
		string key,
		DateTimeOffset now,
		Exception exception)
	{
		if (current.Guilds.TryGetValue(key, out BdoCachedGuild? saved)
			&& now - saved.CachedAtUtc <= MaximumStaleAge)
		{
			return saved.Value with
			{
				Status = "CACHED",
				CachedAtUtc = saved.CachedAtUtc,
				IsStale = true,
				Message = FriendlyFailure(exception)
			};
		}
		throw new InvalidOperationException(FriendlyFailure(exception), exception);
	}

	private static BdoPlayerProfileResponse RestorePlayerOrThrow(
		BdoPlayerGuildCache current,
		string key,
		DateTimeOffset now,
		Exception exception,
		bool refreshRequested)
	{
		if (refreshRequested && !IsTransientPlayerRefreshFailure(exception))
		{
			throw new InvalidOperationException(FriendlyFailure(exception), exception);
		}
		if (current.Players.TryGetValue(key, out BdoCachedPlayer? saved)
			&& now - saved.CachedAtUtc <= MaximumStaleAge)
		{
			return NormalizePlayerProfileMetadata(saved.Value) with
			{
				Status = "CACHED",
				CachedAtUtc = saved.CachedAtUtc,
				IsStale = true,
				Message = refreshRequested
					? "Refresh failed; showing the saved profile. " + FriendlyFailure(exception)
					: FriendlyFailure(exception)
			};
		}
		throw new InvalidOperationException(FriendlyFailure(exception), exception);
	}

	private static bool IsTransientPlayerRefreshFailure(Exception exception)
	{
		return exception switch
		{
			TaskCanceledException => true,
			JsonException or InvalidDataException or IOException => true,
			HttpRequestException httpFailure =>
				!httpFailure.StatusCode.HasValue
				|| httpFailure.StatusCode == HttpStatusCode.RequestTimeout
				|| (int)httpFailure.StatusCode.Value == 429
				|| (int)httpFailure.StatusCode.Value >= 500,
			_ => false
		};
	}

	private static string FriendlyFailure(Exception exception)
	{
		return exception switch
		{
			PlayerIdentityResolutionException => exception.Message,
			UnauthorizedAccessException => exception.Message,
			HttpRequestException => exception.Message,
			TaskCanceledException => "The player and guild service did not answer in time.",
			JsonException or InvalidDataException => "The player and guild service returned unreadable data.",
			IOException => "The saved player and guild cache could not be updated.",
			_ => "Player and guild data is temporarily unavailable."
		};
	}

	private static bool IsRecoverable(Exception exception)
	{
		return exception is HttpRequestException
			or TaskCanceledException
			or JsonException
			or InvalidDataException
			or IOException
			or UnauthorizedAccessException
			or PlayerIdentityResolutionException;
	}

	private static void ValidateEnvelope(JsonElement root, string expectedRegion)
	{
		if (root.ValueKind != JsonValueKind.Object)
		{
			throw new InvalidDataException("BDO Alerts returned a non-object player or guild response.");
		}
		string? region = ReadOptionalString(root, "region", 16);
		if (region is not null
			&& !region.Equals(expectedRegion, StringComparison.OrdinalIgnoreCase))
		{
			throw new InvalidDataException("BDO Alerts returned data for an unexpected region.");
		}
	}

	private static string ReadRequiredLookupName(
		JsonElement root,
		string propertyName,
		string label)
	{
		if (!root.TryGetProperty(propertyName, out JsonElement value)
			|| value.ValueKind != JsonValueKind.String)
		{
			throw new InvalidDataException($"BDO Alerts did not provide a valid {label}.");
		}
		return NormalizeLookupText(value.GetString(), label, minimumLength: 1);
	}

	private static string? ReadOptionalLookupName(JsonElement root, string propertyName)
	{
		if (!root.TryGetProperty(propertyName, out JsonElement value)
			|| value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
		{
			return null;
		}
		if (value.ValueKind != JsonValueKind.String)
		{
			throw new InvalidDataException($"BDO Alerts returned an invalid {propertyName} value.");
		}
		string? raw = value.GetString();
		return string.IsNullOrWhiteSpace(raw)
			? null
			: NormalizeLookupText(raw, propertyName, minimumLength: 1);
	}

	private static string? ReadOptionalProfileTarget(JsonElement root)
	{
		if (!root.TryGetProperty("profile_target", out JsonElement value)
			|| value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
		{
			return null;
		}
		if (value.ValueKind != JsonValueKind.String)
		{
			throw new InvalidDataException("BDO Alerts returned an invalid profile_target value.");
		}

		string target = value.GetString() ?? string.Empty;
		if (!IsValidProfileTarget(target))
		{
			throw new InvalidDataException("BDO Alerts returned an invalid profile_target value.");
		}
		return target;
	}

	private static string? ReadOptionalString(
		JsonElement root,
		string propertyName,
		int maximumLength)
	{
		if (!root.TryGetProperty(propertyName, out JsonElement value)
			|| value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
		{
			return null;
		}
		if (value.ValueKind != JsonValueKind.String)
		{
			throw new InvalidDataException($"BDO Alerts returned an invalid {propertyName} value.");
		}
		string text = (value.GetString() ?? string.Empty).Trim();
		if (text.Length > maximumLength || text.Any(char.IsControl))
		{
			throw new InvalidDataException($"BDO Alerts returned an invalid {propertyName} value.");
		}
		return text.Length == 0 ? null : text;
	}

	private static int? ReadBoundedInt(
		JsonElement root,
		string propertyName,
		int minimum,
		int maximum)
	{
		if (!root.TryGetProperty(propertyName, out JsonElement value)
			|| value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
		{
			return null;
		}
		if (value.ValueKind != JsonValueKind.Number
			|| !value.TryGetInt32(out int parsed)
			|| parsed < minimum
			|| parsed > maximum)
		{
			throw new InvalidDataException($"BDO Alerts returned an invalid {propertyName} value.");
		}
		return parsed;
	}

	private static bool? ReadBoolean(JsonElement root, string propertyName)
	{
		if (!root.TryGetProperty(propertyName, out JsonElement value)
			|| value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
		{
			return null;
		}
		return value.ValueKind switch
		{
			JsonValueKind.True => true,
			JsonValueKind.False => false,
			JsonValueKind.Number when value.TryGetInt32(out int numeric) && numeric == 1 => true,
			JsonValueKind.Number when value.TryGetInt32(out int numeric) && numeric == 0 => false,
			JsonValueKind.String when bool.TryParse(value.GetString(), out bool parsed) => parsed,
			JsonValueKind.String when value.GetString() == "1" => true,
			JsonValueKind.String when value.GetString() == "0" => false,
			_ => throw new InvalidDataException($"BDO Alerts returned an invalid {propertyName} value.")
		};
	}

	private static DateTimeOffset? ReadDateTimeOffset(JsonElement root, string propertyName)
	{
		string? text = ReadOptionalString(root, propertyName, 80);
		if (text is null)
		{
			return null;
		}
		if (!DateTimeOffset.TryParse(
				text,
				CultureInfo.InvariantCulture,
				DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
				out DateTimeOffset parsed))
		{
			throw new InvalidDataException($"BDO Alerts returned an invalid {propertyName} timestamp.");
		}
		return parsed;
	}

	private static string NormalizeMode(string? mode)
	{
		string normalized = (mode ?? string.Empty).Trim().ToLowerInvariant();
		return normalized is "player" or "guild"
			? normalized
			: throw new InvalidOperationException("Search mode must be either player or guild.");
	}

	private static string NormalizeRegion(string? region)
	{
		string normalized = (region ?? string.Empty).Trim().ToLowerInvariant();
		return SupportedRegions.Contains(normalized)
			? normalized
			: throw new InvalidOperationException("Player and guild lookup supports EU, NA, KR, SA, and Asia.");
	}

	private static string NormalizeLookupText(
		string? value,
		string label,
		int minimumLength)
	{
		string normalized = (value ?? string.Empty).Trim();
		if (normalized.Length < minimumLength
			|| normalized.Length > 64
			|| normalized.Any(character =>
				char.IsControl(character)
				|| char.IsSurrogate(character)
				|| character is '/' or '\\' or '?' or '#' or '%' or '&' or '='))
		{
			throw new InvalidOperationException($"{label} is invalid.");
		}
		return normalized;
	}

	private static string NormalizeProfileTarget(string? value)
	{
		string target = value ?? string.Empty;
		if (!IsValidProfileTarget(target))
		{
			throw new InvalidOperationException("Player profile target is invalid.");
		}
		return target;
	}

	private static bool IsValidProfileTarget(string value)
	{
		return value.Length is > 0 and <= 2048
			&& !value.Any(character => char.IsControl(character) || char.IsSurrogate(character));
	}

	private static string CacheKey(string region, string kind, string value)
	{
		return region + "|" + kind + "|" + value.ToUpperInvariant();
	}

	private void ThrowIfDisposed()
	{
		ObjectDisposedException.ThrowIf(disposed, this);
	}

	public void Dispose()
	{
		if (disposed)
		{
			return;
		}
		disposed = true;
		http.CancelPendingRequests();
		http.Dispose();
	}
}
