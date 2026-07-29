using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal sealed record BossScheduleSlot(string Time, IReadOnlyList<string> Bosses);

internal sealed record BossScheduleSnapshot(
	int SchemaVersion,
	string Source,
	string Region,
	string SourceTimeZone,
	DateTimeOffset FetchedAtUtc,
	string ContentHash,
	IReadOnlyDictionary<string, IReadOnlyList<BossScheduleSlot>> Schedule);

internal sealed class BossScheduleService : IDisposable
{
	internal const string DefaultSourceUrl = "https://api.bdoalerts.net/api/boss-schedule/eu";
	internal const string ApiKeyEnvironmentVariable = "BLACK_SPIRIT_HUB_BDOALERTS_API_KEY";
	internal const string SourceUrlEnvironmentVariable = "BLACK_SPIRIT_HUB_BOSS_SCHEDULE_URL";
	internal const string AuthorizedWebsiteOrigin = "https://bdoalerts.net";
	internal const string AuthorizedWebsiteSchedulePage = "https://bdoalerts.net/timers/";

	private const int CurrentSchemaVersion = 1;
	private const int MaxResponseBytes = 512 * 1024;
	private const int MaxSlotsPerDay = 64;
	private const int MaxBossesPerSlot = 12;
	private const int MaxBossNameLength = 80;
	private const int MinimumWeeklySlots = 14;

	private static readonly string[] Days =
	[
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
		"Sunday"
	];

	private static readonly Regex TimePattern = new(
		@"^(?:[01]\d|2[0-3]):[0-5]\d$",
		RegexOptions.CultureInvariant,
		TimeSpan.FromSeconds(1));

	private static readonly JsonSerializerOptions JsonOptions = new()
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
		PropertyNameCaseInsensitive = true,
		WriteIndented = true
	};

	private readonly AppPaths paths;
	private readonly AppLogger logger;
	private readonly HttpClient http;
	private readonly SemaphoreSlim startupRefreshGate = new(1, 1);
	private bool startupRefreshAttempted;
	private object? startupRefreshDashboard;

	public BossScheduleService(AppPaths paths, AppLogger logger)
	{
		this.paths = paths;
		this.logger = logger;
		http = new HttpClient(new HttpClientHandler
		{
			AllowAutoRedirect = false
		})
		{
			Timeout = TimeSpan.FromSeconds(12),
			MaxResponseContentBufferSize = MaxResponseBytes
		};
		http.DefaultRequestHeaders.UserAgent.Add(
			new ProductInfoHeaderValue("Black-Spirit-Hub", AppVersion.Current.TrimStart('v', 'V')));
		http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
	}

	public async Task<object> InitializeAsync(CancellationToken cancellationToken)
	{
		BossScheduleSnapshot? cached = await ReadValidCacheAsync(cancellationToken);
		bool accessConfigured = TryResolveSource(out _, out _, out _, out string? accessMessage);
		return BuildDashboard(
			cached,
			cached is null ? "BUNDLED" : "CACHED",
			cached is null ? accessMessage : null,
			requiresApiAccess: !accessConfigured);
	}

	public async Task<object> RefreshAsync(CancellationToken cancellationToken)
	{
		await startupRefreshGate.WaitAsync(cancellationToken);
		try
		{
			if (startupRefreshAttempted)
			{
				logger.Info("Boss schedule refresh already ran during this app session; the in-memory result was reused.");
				if (startupRefreshDashboard is not null)
				{
					return startupRefreshDashboard;
				}

				BossScheduleSnapshot? cached = await ReadValidCacheAsync(cancellationToken);
				return BuildDashboard(
					cached,
					cached is null ? "BUNDLED" : "CACHED",
					"Boss schedule refresh already ran during this app session.",
					requiresApiAccess: false);
			}

			startupRefreshAttempted = true;
			startupRefreshDashboard = await RefreshOnceAsync(cancellationToken);
			return startupRefreshDashboard;
		}
		finally
		{
			startupRefreshGate.Release();
		}
	}

	private async Task<object> RefreshOnceAsync(CancellationToken cancellationToken)
	{
		BossScheduleSnapshot? cached = await ReadValidCacheAsync(cancellationToken);
		if (!TryResolveSource(
				out Uri? source,
				out string? apiKey,
				out bool useAuthorizedWebsiteHeaders,
				out string? accessMessage))
		{
			logger.Warn("Boss schedule refresh skipped: " + accessMessage);
			return BuildDashboard(
				cached,
				cached is null ? "BUNDLED" : "CACHED",
				accessMessage,
				requiresApiAccess: true);
		}

		try
		{
			logger.Info($"Boss schedule refresh started from {source!.Host}.");
			using HttpRequestMessage request = CreateRequest(
				source!,
				apiKey,
				useAuthorizedWebsiteHeaders);

			using HttpResponseMessage response = await http.SendAsync(
				request,
				HttpCompletionOption.ResponseContentRead,
				cancellationToken);
			byte[] bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
			if (bytes.Length > MaxResponseBytes)
			{
				throw new InvalidDataException("The boss schedule response exceeded the safe size limit.");
			}
			if (!response.IsSuccessStatusCode)
			{
				string reason = response.StatusCode == HttpStatusCode.Forbidden
					? "BDO Alerts rejected the boss schedule request."
					: $"The boss schedule provider returned HTTP {(int)response.StatusCode}.";
				throw new InvalidDataException(reason);
			}

			string json = Encoding.UTF8.GetString(bytes);
			BossScheduleSnapshot fresh = ParseAndNormalize(
				json,
				DateTimeOffset.UtcNow,
				source.Host.EndsWith("bdoalerts.net", StringComparison.OrdinalIgnoreCase) ? "BDO Alerts" : "Black Spirit Hub schedule cache");

			if (cached is null
				|| !string.Equals(cached.ContentHash, fresh.ContentHash, StringComparison.Ordinal)
				|| fresh.FetchedAtUtc - cached.FetchedAtUtc >= TimeSpan.FromHours(6))
			{
				await AtomicFile.WriteAllTextAsync(
					paths.BossScheduleCachePath,
					JsonSerializer.Serialize(fresh, JsonOptions),
					cancellationToken);
				logger.Info($"Boss schedule cache updated with {CountSlots(fresh.Schedule)} weekly slot(s).");
			}
			else
			{
				logger.Info("Boss schedule content is unchanged; the existing cache was retained.");
			}

			return BuildDashboard(fresh, "LIVE", null, requiresApiAccess: false);
		}
		catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
		{
			throw;
		}
		catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException or InvalidDataException or IOException or UnauthorizedAccessException)
		{
			logger.Warn("Boss schedule refresh failed; retaining the last valid schedule. " + ex.Message);
			return BuildDashboard(
				cached,
				cached is null ? "BUNDLED" : "CACHED",
				cached is null
					? "Live schedule sync is unavailable. The bundled EU schedule remains active."
					: "Live schedule sync is unavailable. The last saved schedule remains active.",
				requiresApiAccess: false);
		}
	}

	internal static BossScheduleSnapshot ParseAndNormalizeForTest(string json, DateTimeOffset fetchedAtUtc)
	{
		return ParseAndNormalize(json, fetchedAtUtc, "Test");
	}

	internal static HttpRequestMessage CreateRequestForTest(
		Uri source,
		string? apiKey,
		bool useAuthorizedWebsiteHeaders)
	{
		return CreateRequest(source, apiKey, useAuthorizedWebsiteHeaders);
	}

	private static HttpRequestMessage CreateRequest(
		Uri source,
		string? apiKey,
		bool useAuthorizedWebsiteHeaders)
	{
		HttpRequestMessage request = new(HttpMethod.Get, source);
		if (!string.IsNullOrWhiteSpace(apiKey)
			&& IsBdoAlertsScheduleEndpoint(source))
		{
			request.Headers.TryAddWithoutValidation("X-API-Key", apiKey);
			return request;
		}

		if (useAuthorizedWebsiteHeaders
			&& IsBdoAlertsScheduleEndpoint(source))
		{
			// Temporary compatibility access explicitly approved by the BDO Alerts owner.
			// Remove these headers once the application's API key is issued.
			request.Headers.Referrer = new Uri(AuthorizedWebsiteSchedulePage);
			request.Headers.TryAddWithoutValidation("Origin", AuthorizedWebsiteOrigin);
		}

		return request;
	}

	private static bool IsBdoAlertsScheduleEndpoint(Uri source)
	{
		return source.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
			&& source.IsDefaultPort
			&& source.Host.Equals("api.bdoalerts.net", StringComparison.OrdinalIgnoreCase)
			&& source.AbsolutePath.TrimEnd('/').Equals(
				"/api/boss-schedule/eu",
				StringComparison.OrdinalIgnoreCase)
			&& source.Query.Length == 0
			&& source.Fragment.Length == 0;
	}

	private async Task<BossScheduleSnapshot?> ReadValidCacheAsync(CancellationToken cancellationToken)
	{
		foreach (string candidate in new[] { paths.BossScheduleCachePath, paths.BossScheduleCachePath + ".bak" })
		{
			BossScheduleSnapshot? cached = await AtomicFile.ReadJsonAsync<BossScheduleSnapshot>(
				candidate,
				JsonOptions,
				cancellationToken);
			if (cached is null)
			{
				continue;
			}

			try
			{
				if (cached.SchemaVersion != CurrentSchemaVersion
					|| !string.Equals(cached.Region, "eu", StringComparison.OrdinalIgnoreCase)
					|| !string.Equals(cached.SourceTimeZone, "Europe/Berlin", StringComparison.Ordinal))
				{
					throw new InvalidDataException("The saved boss schedule uses an unsupported schema, region, or time zone.");
				}

				string json = JsonSerializer.Serialize(cached.Schedule, JsonOptions);
				BossScheduleSnapshot normalized = ParseAndNormalize(json, cached.FetchedAtUtc, cached.Source);
				return normalized;
			}
			catch (Exception ex) when (ex is JsonException or InvalidDataException)
			{
				logger.Warn($"The saved boss schedule cache candidate '{Path.GetFileName(candidate)}' was ignored because it is invalid. {ex.Message}");
			}
		}

		return null;
	}

	private static BossScheduleSnapshot ParseAndNormalize(string json, DateTimeOffset fetchedAtUtc, string source)
	{
		if (Encoding.UTF8.GetByteCount(json) > MaxResponseBytes)
		{
			throw new InvalidDataException("The boss schedule response exceeded the safe size limit.");
		}

		using JsonDocument document = JsonDocument.Parse(json, new JsonDocumentOptions
		{
			AllowTrailingCommas = false,
			CommentHandling = JsonCommentHandling.Disallow,
			MaxDepth = 12
		});
		ValidateEnvelope(document.RootElement);
		JsonElement scheduleRoot = ResolveScheduleRoot(document.RootElement);
		if (scheduleRoot.ValueKind != JsonValueKind.Object)
		{
			throw new InvalidDataException("The boss schedule response is not an object.");
		}

		Dictionary<string, IReadOnlyList<BossScheduleSlot>> schedule = new(StringComparer.Ordinal);
		Dictionary<string, string> canonicalBossNames = new(StringComparer.OrdinalIgnoreCase);
		int totalSpawnSlots = 0;
		foreach (string day in Days)
		{
			if (!scheduleRoot.TryGetProperty(day, out JsonElement dayValue)
				|| dayValue.ValueKind != JsonValueKind.Array)
			{
				throw new InvalidDataException($"The boss schedule is missing a valid {day} array.");
			}

			Dictionary<string, List<string>> byTime = new(StringComparer.Ordinal);
			foreach (JsonElement slotValue in dayValue.EnumerateArray())
			{
				if (slotValue.ValueKind != JsonValueKind.Object
					|| !slotValue.TryGetProperty("time", out JsonElement timeValue)
					|| timeValue.ValueKind != JsonValueKind.String
					|| !slotValue.TryGetProperty("bosses", out JsonElement bossesValue)
					|| bossesValue.ValueKind != JsonValueKind.Array)
				{
					throw new InvalidDataException($"{day} contains a malformed boss schedule slot.");
				}

				string time = timeValue.GetString() ?? string.Empty;
				if (!TimePattern.IsMatch(time))
				{
					throw new InvalidDataException($"{day} contains an invalid schedule time.");
				}

				if (!byTime.TryGetValue(time, out List<string>? names))
				{
					if (byTime.Count >= MaxSlotsPerDay)
					{
						throw new InvalidDataException($"{day} contains too many boss schedule slots.");
					}
					names = [];
					byTime[time] = names;
				}

				foreach (JsonElement bossValue in bossesValue.EnumerateArray())
				{
					if (bossValue.ValueKind != JsonValueKind.String)
					{
						throw new InvalidDataException($"{day} {time} contains a non-text boss name.");
					}
					string name = (bossValue.GetString() ?? string.Empty).Trim();
					if (name.Length == 0 || name.Length > MaxBossNameLength || name.Any(char.IsControl))
					{
						throw new InvalidDataException($"{day} {time} contains an invalid boss name.");
					}
					if (!canonicalBossNames.TryGetValue(name, out string? canonicalName))
					{
						canonicalName = name;
						canonicalBossNames[name] = canonicalName;
					}
					if (!names.Contains(canonicalName, StringComparer.OrdinalIgnoreCase))
					{
						names.Add(canonicalName);
					}
					if (names.Count > MaxBossesPerSlot)
					{
						throw new InvalidDataException($"{day} {time} contains too many boss names.");
					}
				}

			}

			BossScheduleSlot[] normalizedSlots = byTime
				.OrderBy(pair => ParseMinutes(pair.Key))
				.Select(pair => new BossScheduleSlot(
					pair.Key,
					pair.Value.ToArray()))
				.ToArray();
			if (normalizedSlots.Length == 0
				|| normalizedSlots.All(slot => slot.Bosses.Count == 0))
			{
				throw new InvalidDataException($"The boss schedule contains no {day} spawns.");
			}
			totalSpawnSlots += normalizedSlots.Count(slot => slot.Bosses.Count > 0);
			schedule[day] = normalizedSlots;
		}

		if (totalSpawnSlots < MinimumWeeklySlots)
		{
			throw new InvalidDataException("The boss schedule appears incomplete and was rejected.");
		}

		string contentHash = ComputeContentHash(schedule);
		return new BossScheduleSnapshot(
			CurrentSchemaVersion,
			source,
			"eu",
			"Europe/Berlin",
			fetchedAtUtc,
			contentHash,
			schedule);
	}

	private static JsonElement ResolveScheduleRoot(JsonElement root)
	{
		if (root.ValueKind != JsonValueKind.Object)
		{
			return root;
		}
		if (root.TryGetProperty("schedule", out JsonElement schedule)
			&& schedule.ValueKind == JsonValueKind.Object)
		{
			return schedule;
		}
		if (root.TryGetProperty("data", out JsonElement data)
			&& data.ValueKind == JsonValueKind.Object)
		{
			if (data.TryGetProperty("schedule", out JsonElement nestedSchedule)
				&& nestedSchedule.ValueKind == JsonValueKind.Object)
			{
				return nestedSchedule;
			}
			return data;
		}
		return root;
	}

	private static void ValidateEnvelope(JsonElement root)
	{
		if (root.ValueKind != JsonValueKind.Object)
		{
			return;
		}
		if (root.TryGetProperty("region", out JsonElement region)
			&& (region.ValueKind != JsonValueKind.String
				|| !string.Equals(region.GetString(), "eu", StringComparison.OrdinalIgnoreCase)))
		{
			throw new InvalidDataException("The boss schedule response is not for the EU region.");
		}
		if (root.TryGetProperty("sourceTimeZone", out JsonElement sourceTimeZone)
			&& (sourceTimeZone.ValueKind != JsonValueKind.String
				|| !string.Equals(sourceTimeZone.GetString(), "Europe/Berlin", StringComparison.Ordinal)))
		{
			throw new InvalidDataException("The boss schedule response uses an unsupported source time zone.");
		}
	}

	private static int ParseMinutes(string time)
	{
		return int.Parse(time[..2], CultureInfo.InvariantCulture) * 60
			+ int.Parse(time[3..], CultureInfo.InvariantCulture);
	}

	private static int CountSlots(IReadOnlyDictionary<string, IReadOnlyList<BossScheduleSlot>> schedule)
	{
		return schedule.Values.Sum(slots => slots.Count);
	}

	private static string ComputeContentHash(IReadOnlyDictionary<string, IReadOnlyList<BossScheduleSlot>> schedule)
	{
		var canonical = Days.Select(day => new
		{
			day,
			slots = schedule[day].Select(slot => new { slot.Time, slot.Bosses }).ToArray()
		}).ToArray();
		byte[] bytes = JsonSerializer.SerializeToUtf8Bytes(canonical);
		return Convert.ToHexString(SHA256.HashData(bytes));
	}

	private static object BuildDashboard(
		BossScheduleSnapshot? snapshot,
		string status,
		string? message,
		bool requiresApiAccess)
	{
		return new
		{
			status,
			message,
			requiresApiAccess,
			source = snapshot?.Source ?? "Bundled",
			sourceTimeZone = snapshot?.SourceTimeZone ?? "Europe/Berlin",
			fetchedAtUtc = snapshot?.FetchedAtUtc,
			contentHash = snapshot?.ContentHash,
			schedule = snapshot?.Schedule
		};
	}

	private static bool TryResolveSource(
		out Uri? source,
		out string? apiKey,
		out bool useAuthorizedWebsiteHeaders,
		out string? message)
	{
		string configuredUrl = Environment.GetEnvironmentVariable(SourceUrlEnvironmentVariable)?.Trim() ?? string.Empty;
		string sourceUrl = configuredUrl.Length == 0 ? DefaultSourceUrl : configuredUrl;
		useAuthorizedWebsiteHeaders = false;
		if (!Uri.TryCreate(sourceUrl, UriKind.Absolute, out source)
			|| source.Scheme != Uri.UriSchemeHttps)
		{
			apiKey = null;
			message = "Boss schedule sync requires a valid HTTPS provider URL.";
			return false;
		}

		string? configuredApiKey = Environment.GetEnvironmentVariable(ApiKeyEnvironmentVariable)?.Trim();
		bool isBdoAlertsHost = source.Host.Equals(
			"api.bdoalerts.net",
			StringComparison.OrdinalIgnoreCase);
		bool isBdoAlertsScheduleEndpoint = IsBdoAlertsScheduleEndpoint(source);
		if (isBdoAlertsHost && !isBdoAlertsScheduleEndpoint)
		{
			apiKey = null;
			message = "The configured BDO Alerts schedule endpoint is not supported.";
			return false;
		}

		apiKey = isBdoAlertsScheduleEndpoint ? configuredApiKey : null;
		if (isBdoAlertsScheduleEndpoint && string.IsNullOrWhiteSpace(apiKey))
		{
			useAuthorizedWebsiteHeaders = true;
		}

		message = null;
		return true;
	}

	public void Dispose()
	{
		startupRefreshGate.Dispose();
		http.Dispose();
	}
}
