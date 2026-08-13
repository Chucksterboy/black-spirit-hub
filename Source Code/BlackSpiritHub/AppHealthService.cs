using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal sealed record MarketDatabaseHealthProbe(
	bool Readable,
	int IndexedMarketItems,
	DateTimeOffset? LatestMarketSampleUtc);

internal sealed record MarketRefreshHealth(
	string Status,
	DateTimeOffset? LastRefreshAt,
	string? LastRefreshError);

internal sealed record BlackSpiritHubHealth(
	bool Ok,
	bool DatabaseReadable,
	bool ContentIndexReadable,
	int? ContentCount,
	string HostVersion,
	string LastRefreshStatus,
	DateTimeOffset? LastRefreshAt,
	string? LastRefreshError,
	bool Stale,
	IReadOnlyList<string> DegradedReasons);

internal sealed class AppHealthService
{
	private static readonly TimeSpan RefreshStaleAfter = TimeSpan.FromHours(6);
	private readonly MarketDatabase database;
	private readonly string recipeBookRoot;
	private readonly AppLogger logger;
	private readonly object contentProbeSync = new();
	private Task<ContentIndexProbe>? contentProbeTask;

	public AppHealthService(MarketDatabase database, string applicationRoot, AppLogger logger)
	{
		this.database = database;
		recipeBookRoot = Path.Combine(applicationRoot, "Assets", "RecipeBook");
		this.logger = logger;
	}

	public async Task<BlackSpiritHubHealth> CheckAsync(
		MarketRefreshHealth refresh,
		CancellationToken cancellationToken)
	{
		MarketDatabaseHealthProbe databaseProbe;
		try
		{
			databaseProbe = await database.ProbeHealthAsync(cancellationToken);
		}
		catch (Exception exception) when (exception is not OperationCanceledException)
		{
			logger.Error("The application health probe could not read the local database.", exception);
			databaseProbe = new MarketDatabaseHealthProbe(false, 0, null);
		}

		ContentIndexProbe contentProbe;
		try
		{
			contentProbe = await GetContentProbeAsync(cancellationToken);
		}
		catch (Exception exception) when (exception is not OperationCanceledException)
		{
			logger.Error("The application health probe could not verify packaged content.", exception);
			contentProbe = new ContentIndexProbe(false, null);
		}

		string refreshStatus = NormalizeRefreshStatus(refresh.Status);
		DateTimeOffset? refreshAt = refresh.LastRefreshAt;
		if (refreshStatus == "never" && databaseProbe.LatestMarketSampleUtc.HasValue)
		{
			refreshStatus = "success";
			refreshAt = databaseProbe.LatestMarketSampleUtc;
		}

		bool stale = databaseProbe.IndexedMarketItems > 0
			&& databaseProbe.LatestMarketSampleUtc.HasValue
			&& DateTimeOffset.UtcNow - databaseProbe.LatestMarketSampleUtc.Value > RefreshStaleAfter;

		return new BlackSpiritHubHealth(
			databaseProbe.Readable && contentProbe.Readable,
			databaseProbe.Readable,
			contentProbe.Readable,
			contentProbe.Count,
			AppVersion.Current,
			refreshStatus,
			refreshAt,
			refreshStatus == "failed"
				? "The latest market refresh did not finish. The app will retry automatically."
				: null,
			stale,
			Array.Empty<string>());
	}

	private Task<ContentIndexProbe> GetContentProbeTask()
	{
		lock (contentProbeSync)
		{
			return contentProbeTask ??= ProbeContentIndexAsync();
		}
	}

	private async Task<ContentIndexProbe> GetContentProbeAsync(CancellationToken cancellationToken)
	{
		return await GetContentProbeTask().WaitAsync(cancellationToken);
	}

	private async Task<ContentIndexProbe> ProbeContentIndexAsync()
	{
		string manifestPath = Path.Combine(recipeBookRoot, "manifest.json");
		string bundleIdPath = Path.Combine(recipeBookRoot, "bundle-id.txt");
		string datasetPath = Path.Combine(recipeBookRoot, "recipes.json");
		if (!File.Exists(manifestPath) || !File.Exists(bundleIdPath) || !File.Exists(datasetPath))
		{
			return new ContentIndexProbe(false, null);
		}

		byte[] manifestBytes = await File.ReadAllBytesAsync(manifestPath, CancellationToken.None);
		string manifestHash = Convert.ToHexString(SHA256.HashData(manifestBytes)).ToLowerInvariant();
		string bundleId = (await File.ReadAllTextAsync(bundleIdPath, CancellationToken.None)).Trim().ToLowerInvariant();
		if (!IsSha256(bundleId)
			|| !CryptographicOperations.FixedTimeEquals(
			System.Text.Encoding.ASCII.GetBytes(manifestHash),
			System.Text.Encoding.ASCII.GetBytes(bundleId)))
		{
			return new ContentIndexProbe(false, null);
		}

		using JsonDocument manifest = JsonDocument.Parse(manifestBytes);
		JsonElement root = manifest.RootElement;
		if (!root.TryGetProperty("schemaVersion", out JsonElement schemaVersion)
			|| !schemaVersion.TryGetInt32(out int parsedSchemaVersion)
			|| parsedSchemaVersion < 1
			|| !root.TryGetProperty("dataset", out JsonElement dataset)
			|| !dataset.TryGetProperty("path", out JsonElement datasetName)
			|| !string.Equals(datasetName.GetString(), "recipes.json", StringComparison.Ordinal)
			|| !dataset.TryGetProperty("bytes", out JsonElement datasetBytesElement)
			|| !datasetBytesElement.TryGetInt64(out long expectedBytes)
			|| !dataset.TryGetProperty("sha256", out JsonElement datasetHashElement)
			|| !IsSha256(datasetHashElement.GetString())
			|| !root.TryGetProperty("icons", out JsonElement icons)
			|| !icons.TryGetProperty("itemAliases", out JsonElement itemAliases)
			|| !itemAliases.TryGetInt32(out int contentCount)
			|| contentCount < 1)
		{
			return new ContentIndexProbe(false, null);
		}

		FileInfo datasetInfo = new(datasetPath);
		if (datasetInfo.Length != expectedBytes)
		{
			return new ContentIndexProbe(false, null);
		}

		await using FileStream stream = new(
			datasetPath,
			FileMode.Open,
			FileAccess.Read,
			FileShare.Read,
			bufferSize: 128 * 1024,
			useAsync: true);
		byte[] actualHashBytes = await SHA256.HashDataAsync(stream, CancellationToken.None);
		byte[] expectedHashBytes = Convert.FromHexString(datasetHashElement.GetString()!);
		return new ContentIndexProbe(
			CryptographicOperations.FixedTimeEquals(actualHashBytes, expectedHashBytes),
			contentCount);
	}

	private static bool IsSha256(string? value)
	{
		return value is { Length: 64 }
			&& value.AsSpan().IndexOfAnyExcept("0123456789abcdefABCDEF") < 0;
	}

	private static string NormalizeRefreshStatus(string? value)
	{
		return value?.Trim().ToLowerInvariant() switch
		{
			"success" => "success",
			"failed" => "failed",
			"running" => "running",
			_ => "never"
		};
	}

	private sealed record ContentIndexProbe(bool Readable, int? Count);
}
