using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace BlackSpiritHub;

/// <summary>
/// Manages the Windows registration without changing the preference or market data.
/// The caller persists disabled preferences before removal, so a task that Windows
/// refuses to remove still exits through the scheduled collector's preference guard.
/// </summary>
internal sealed class BackgroundMarketUpdateService
{
	private readonly string databasePath;
	private readonly string runStatusPath;
	private readonly MarketCollectorTaskManager.CommandRunner? runner;

	internal BackgroundMarketUpdateService(AppPaths paths) : this(paths.DatabasePath) { }

	internal BackgroundMarketUpdateService(string databasePath, MarketCollectorTaskManager.CommandRunner? runner = null)
	{
		this.databasePath = databasePath;
		runStatusPath = Path.Combine(Path.GetDirectoryName(Path.GetFullPath(databasePath))!, "background-market-update-status.json");
		this.runner = runner;
	}

	internal async Task<BackgroundMarketUpdateStatus> GetStatusAsync(bool enabled, CancellationToken cancellationToken)
	{
		MarketTaskRegistrationStatus registration = await MarketCollectorTaskManager.QueryAsync(cancellationToken, runner).ConfigureAwait(false);
		DateTimeOffset? lastSample = null;
		DateTimeOffset? lastRun = null;
		string? error = registration.Error;
		try
		{
			lastSample = await ReadLatestSuccessfulSampleUtcAsync(cancellationToken).ConfigureAwait(false);
		}
		catch (Exception exception) when (exception is SqliteException or IOException or UnauthorizedAccessException)
		{
			error = string.Join(" ", new[] { error, "The last market sample could not be read. " + exception.Message }
				.Where(value => !string.IsNullOrWhiteSpace(value)));
		}
		try
		{
			lastRun = await ReadLastCompletedCheckUtcAsync(cancellationToken).ConfigureAwait(false);
		}
		catch (Exception exception) when (exception is JsonException or IOException or UnauthorizedAccessException)
		{
			error = string.Join(" ", new[] { error, "The last completed background check could not be read. " + exception.Message }
				.Where(value => !string.IsNullOrWhiteSpace(value)));
		}
		bool? registered = registration.QuerySucceeded ? registration.Tasks.Count > 0 : null;
		DateTimeOffset? nextRun = registration.Tasks.Where(task => task.NextRunUtc.HasValue)
			.Select(task => task.NextRunUtc).OrderBy(time => time).FirstOrDefault();
		string message = !enabled
			? "Background market updates are off. Market history is kept, and updates while the app is open are unaffected."
			: registered == true
				? "Windows background market checks are registered. Your account must be signed in for checks to run."
				: registered == false
					? "Background updates are enabled in your preferences, but Windows has no registered task. Turn this setting off and on to retry."
					: "Your background-update preference is saved, but Windows task status could not be checked.";
		return new(enabled, registered, lastSample, lastRun, nextRun, error, message, true);
	}

	internal Task RecordCompletedCheckAsync(CancellationToken cancellationToken) =>
		RecordCompletedCheckAsync(DateTimeOffset.UtcNow, cancellationToken);

	internal Task RecordCompletedCheckAsync(DateTimeOffset completedUtc, CancellationToken cancellationToken) =>
		AtomicFile.WriteAllTextAsync(runStatusPath,
			JsonSerializer.Serialize(new BackgroundMarketRunStatus(completedUtc.ToUniversalTime())), cancellationToken);

	private async Task<DateTimeOffset?> ReadLastCompletedCheckUtcAsync(CancellationToken cancellationToken)
	{
		// Read-only recovery: showing status must not quarantine or rewrite user files.
		Exception? failure = null;
		foreach (string path in new[] { runStatusPath, runStatusPath + ".bak" })
		{
			if (!File.Exists(path)) continue;
			try
			{
				BackgroundMarketRunStatus? value = JsonSerializer.Deserialize<BackgroundMarketRunStatus>(
					await File.ReadAllTextAsync(path, cancellationToken).ConfigureAwait(false));
				if (value?.CompletedUtc.Year >= 2000) return value.CompletedUtc.ToUniversalTime();
				failure = new JsonException("Background check time is invalid.");
			}
			catch (Exception exception) when (exception is JsonException or IOException or UnauthorizedAccessException)
			{
				failure = exception;
			}
		}
		if (failure != null) throw failure;
		return null;
	}

	internal async Task<BackgroundMarketUpdateStatus> ApplyPreferenceAsync(
		bool enabled, string executablePath, CancellationToken cancellationToken)
	{
		using CancellationTokenSource deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
		deadline.CancelAfter(TimeSpan.FromSeconds(12));
		try
		{
			MarketTaskOperationResult operation = enabled
				? await MarketCollectorTaskManager.InstallAsync(executablePath, deadline.Token, runner).ConfigureAwait(false)
				: await MarketCollectorTaskManager.RemoveKnownTasksAsync(deadline.Token, runner).ConfigureAwait(false);
			BackgroundMarketUpdateStatus status = await GetStatusAsync(enabled, deadline.Token).ConfigureAwait(false);
			return status with
			{
				Success = operation.Success,
				Message = operation.Details,
				Error = operation.Success ? status.Error : operation.Details
			};
		}
		catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
		{
			const string message = "Windows did not finish updating the background task in time. Its registration could not be confirmed. Please retry.";
			return new(enabled, null, null, null, null, message, message, false);
		}
	}

	internal async Task<DateTimeOffset?> ReadLatestSuccessfulSampleUtcAsync(CancellationToken cancellationToken)
	{
		cancellationToken.ThrowIfCancellationRequested();
		if (!File.Exists(databasePath))
		{
			return null;
		}
		// Same persisted evidence as MarketDatabase.GetLatestMarketSampleUtcAsync.
		// A sample can come from an open app or the task; it is not a completed-job
		// marker. Opening Settings must not initialize/migrate/create a market DB.
		await using SqliteConnection connection = new(new SqliteConnectionStringBuilder
		{
			DataSource = databasePath, Mode = SqliteOpenMode.ReadOnly,
			Pooling = false, DefaultTimeout = 2
		}.ToString());
		await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = @"
SELECT MAX(captured_utc) FROM (
    SELECT captured_utc FROM snapshots WHERE region='eu' AND source='local-snapshot'
    UNION ALL
    SELECT captured_utc FROM outfit_snapshots WHERE region='eu'
);";
		object? value = await command.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);
		return value != null && value != DBNull.Value
			&& DateTimeOffset.TryParse(Convert.ToString(value, CultureInfo.InvariantCulture), CultureInfo.InvariantCulture,
				DateTimeStyles.RoundtripKind, out DateTimeOffset timestamp) ? timestamp.ToUniversalTime() : null;
	}
}

internal sealed record BackgroundMarketUpdateStatus(
	bool Enabled,
	bool? TaskRegistered,
	DateTimeOffset? LastSuccessfulSampleUtc,
	DateTimeOffset? LastCompletedCheckUtc,
	DateTimeOffset? NextRunUtc,
	string? Error,
	string Message,
	bool Success);

internal sealed record BackgroundMarketRunStatus(DateTimeOffset CompletedUtc);
