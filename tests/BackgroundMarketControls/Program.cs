using BlackSpiritHub;
using Microsoft.Data.Sqlite;
using System.Globalization;
using System.Security.Cryptography;

// Every scheduler interaction below uses this in-memory fake. This test never
// creates, queries, deletes, or changes a real Windows scheduled task.
string root = Path.Combine(Path.GetTempPath(), "bsh-background-controls-test-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(root);
int assertions = 0;
void Check(bool condition, string label)
{
	assertions++;
	if (!condition) throw new InvalidOperationException(label);
}
try
{
	FakeScheduler scheduler = new();
	string databasePath = Path.Combine(root, "market.db");
	BackgroundMarketUpdateService service = new(databasePath, scheduler.RunAsync);
	BackgroundMarketUpdateStatus empty = await service.GetStatusAsync(true, CancellationToken.None);
	Check(empty.Enabled && empty.TaskRegistered == false, "Preference and actual registration must be distinct.");
	Check(empty.LastSuccessfulSampleUtc == null && empty.LastCompletedCheckUtc == null && empty.NextRunUtc == null,
		"Missing samples, completed runs and next runs stay unknown.");
	Check(!File.Exists(databasePath), "Reading settings must not create a market database.");
	Check(scheduler.Calls.All(call => call[0] == "/Query"), "Status reads may not mutate task registration.");

	scheduler.QueryError = "Access is denied.";
	BackgroundMarketUpdateStatus inaccessible = await service.GetStatusAsync(true, CancellationToken.None);
	Check(inaccessible.TaskRegistered == null && inaccessible.Error!.Contains("Access is denied"),
		"Access errors must not be reported as an absent task.");
	scheduler.QueryError = null;
	scheduler.QueryOverride = "\"unfinished";
	Check((await service.GetStatusAsync(true, CancellationToken.None)).TaskRegistered == null,
		"Malformed task output must not be reported as an absent task.");
	scheduler.QueryOverride = null;
	FakeScheduler missingAndDenied = new() { FailAllCreates = true };
	BackgroundMarketUpdateStatus deniedEnable = await new BackgroundMarketUpdateService(databasePath, missingAndDenied.RunAsync)
		.ApplyPreferenceAsync(true, Environment.ProcessPath!, CancellationToken.None);
	Check(!deniedEnable.Success && deniedEnable.TaskRegistered == false && deniedEnable.Error!.Contains("Access is denied"),
		"A failed enable must report failure and the actual absence of registration.");
	Check(missingAndDenied.Calls.All(call => call[0] != "/Delete"), "Failed enable must never run cleanup deletions.");

	string executable = Environment.ProcessPath!;
	scheduler.Names.Add(MarketCollectorTaskManager.TaskName);
	scheduler.Names.Add("Unrelated user task");
	scheduler.FailAllCreates = true;
	scheduler.Calls.Clear();
	MarketTaskOperationResult failedInstall = await MarketCollectorTaskManager.InstallAsync(executable, CancellationToken.None, scheduler.RunAsync);
	Check(!failedInstall.Success && failedInstall.Details.Contains("Access is denied"), "Registration failures must retain details.");
	Check(scheduler.Names.Contains(MarketCollectorTaskManager.TaskName) && scheduler.Calls.All(call => call[0] != "/Delete"),
		"Failed registration must preserve an existing working collector.");
	scheduler.FailAllCreates = false;
	scheduler.FailBaseCreate = true;
	scheduler.Calls.Clear();
	BackgroundMarketUpdateStatus enabled = await service.ApplyPreferenceAsync(true, executable, CancellationToken.None);
	Check(enabled.Success && enabled.TaskRegistered == true, "Per-user fallback should enable successfully without elevation.");
	string[] created = scheduler.Calls.Last(call => call[0] == "/Create");
	Check(created[Array.IndexOf(created, "/RL") + 1] == "LIMITED", "Collector registration must retain limited privileges.");
	Check(created.Contains("/IT"), "Collector checks must use the signed-in interactive user, without stored credentials.");
	Check(created[Array.IndexOf(created, "/TR") + 1] == "\"" + Path.GetFullPath(executable) + "\" --market-scheduled-update",
		"Executable quoting must preserve one command and the scheduled flag.");
	Check(scheduler.Names.Contains("Unrelated user task") && !scheduler.Names.Contains(MarketCollectorTaskManager.TaskName),
		"Successful fallback removes the duplicate collector, never unrelated tasks.");
	Check(enabled.NextRunUtc != null, "Valid Windows next-run times should be surfaced.");

	scheduler.NextRun = "N/A";
	Check((await service.GetStatusAsync(true, CancellationToken.None)).NextRunUtc == null, "Do not fabricate missing next-run dates.");
	scheduler.FailDeletes = true;
	BackgroundMarketUpdateStatus deniedDisable = await service.ApplyPreferenceAsync(false, executable, CancellationToken.None);
	Check(!deniedDisable.Success && !deniedDisable.Enabled && deniedDisable.TaskRegistered == true,
		"Disabled preference remains distinct from a registration Windows refused to remove.");
	Check(deniedDisable.Error!.Contains("Access is denied"), "Task-removal denial must be visible.");
	scheduler.FailDeletes = false;
	BackgroundMarketUpdateStatus disabled = await service.ApplyPreferenceAsync(false, executable, CancellationToken.None);
	Check(disabled.Success && disabled.TaskRegistered == false && scheduler.Names.SetEquals(new[] { "Unrelated user task" }),
		"Disable should remove only known registrations.");

	DateTimeOffset successfulSample = DateTimeOffset.Parse("2026-09-07T09:00:00Z", CultureInfo.InvariantCulture);
	await using (SqliteConnection connection = new(new SqliteConnectionStringBuilder { DataSource = databasePath, Pooling = false }.ToString()))
	{
		await connection.OpenAsync();
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = """
CREATE TABLE snapshots(captured_utc TEXT, region TEXT, source TEXT);
CREATE TABLE outfit_snapshots(captured_utc TEXT, region TEXT, source TEXT);
INSERT INTO snapshots VALUES('2026-09-07T08:00:00+00:00','eu','local-snapshot');
INSERT INTO snapshots VALUES('2026-09-07T23:00:00+00:00','eu','market-history');
INSERT INTO outfit_snapshots VALUES('2026-09-07T09:00:00+00:00','eu','bulk-sales');
INSERT INTO outfit_snapshots VALUES('2026-09-07T22:00:00+00:00','na','bulk-sales');
""";
		await command.ExecuteNonQueryAsync();
	}
	byte[] databaseHashBefore = SHA256.HashData(await File.ReadAllBytesAsync(databasePath));
	BackgroundMarketUpdateStatus withSample = await service.GetStatusAsync(false, CancellationToken.None);
	Check(withSample.LastSuccessfulSampleUtc == successfulSample, "Use persisted EU sample evidence, not imported history or another region.");
	Check(withSample.LastCompletedCheckUtc == null, "A historical market sample is not evidence of a completed background run.");
	Check(databaseHashBefore.SequenceEqual(SHA256.HashData(await File.ReadAllBytesAsync(databasePath))), "Status reads must not rewrite market history.");

	DateTimeOffset firstRun = successfulSample.AddMinutes(2);
	DateTimeOffset secondRun = firstRun.AddHours(1);
	await service.RecordCompletedCheckAsync(firstRun, CancellationToken.None);
	await service.RecordCompletedCheckAsync(secondRun, CancellationToken.None);
	BackgroundMarketUpdateStatus withRun = await service.GetStatusAsync(false, CancellationToken.None);
	Check(withRun.LastCompletedCheckUtc == secondRun && withRun.LastSuccessfulSampleUtc == successfulSample,
		"Completed-check time and actual collection time must remain separate.");
	string markerPath = Path.Combine(root, "background-market-update-status.json");
	await File.WriteAllTextAsync(markerPath, "{ broken");
	Check((await service.GetStatusAsync(false, CancellationToken.None)).LastCompletedCheckUtc == firstRun,
		"Interrupted marker writes should recover the last-good backup.");
	Check(await File.ReadAllTextAsync(markerPath) == "{ broken", "Status recovery must stay read-only.");

	using CancellationTokenSource cancelled = new();
	cancelled.Cancel();
	bool wasCancelled = false;
	try { await service.GetStatusAsync(true, cancelled.Token); }
	catch (OperationCanceledException) { wasCancelled = true; }
	Check(wasCancelled, "Cancellation must propagate to callers.");
	using CancellationTokenSource duringCreate = new();
	FakeScheduler interrupted = new() { CancelCreate = duringCreate };
	interrupted.Names.Add(MarketCollectorTaskManager.TaskName);
	wasCancelled = false;
	try
	{
		await new BackgroundMarketUpdateService(databasePath, interrupted.RunAsync)
			.ApplyPreferenceAsync(true, executable, duringCreate.Token);
	}
	catch (OperationCanceledException) { wasCancelled = true; }
	Check(wasCancelled && interrupted.Calls.Count == 1 && interrupted.Calls[0][0] == "/Create",
		"Caller cancellation during registration must propagate without additional task queries or cleanup.");
	Check(interrupted.Names.SetEquals(new[] { MarketCollectorTaskManager.TaskName }),
		"Interrupted registration must preserve existing scheduled tasks.");
	int beforeCancelCalls = scheduler.Calls.Count;
	wasCancelled = false;
	try { await service.ApplyPreferenceAsync(false, executable, cancelled.Token); }
	catch (OperationCanceledException) { wasCancelled = true; }
	Check(wasCancelled && scheduler.Calls.Count == beforeCancelCalls,
		"A pre-cancelled disable must not invoke the scheduler.");
	string[][] csv = MarketCollectorTaskManager.ParseCsv("\"a\",\"b,\"\"c\"\"\",\"line\nnext\"\r\n").ToArray();
	Check(csv.Length == 1 && csv[0][1] == "b,\"c\"" && csv[0][2] == "line\nnext", "CSV must preserve escaped quotes, commas and newlines.");

	async Task<AppPaths> SettingsCase(string name, string? primary = null, string? backup = null)
	{
		string directory = Path.Combine(root, name);
		Directory.CreateDirectory(directory);
		AppPaths paths = new(Path.Combine(directory, "market.db"));
		if (primary != null) await File.WriteAllTextAsync(paths.AppBehaviorSettingsPath, primary);
		if (backup != null) await File.WriteAllTextAsync(paths.AppBehaviorSettingsPath + ".bak", backup);
		return paths;
	}
	AppPaths firstInstall = await SettingsCase("first-install");
	Check(await AppBehaviorSettings.IsBackgroundCollectionAllowedAsync(firstInstall, CancellationToken.None),
		"First installation with no saved preference retains established background behavior.");
	Check((await AppBehaviorSettings.LoadAsync(firstInstall, CancellationToken.None)).BackgroundMarketUpdatesEnabled,
		"First installation UI and collector defaults must agree.");
	AppPaths legacySettings = await SettingsCase("legacy", "{\"minimizeToTray\":false}");
	Check(await AppBehaviorSettings.IsBackgroundCollectionAllowedAsync(legacySettings, CancellationToken.None),
		"A valid legacy preference document preserves established background behavior.");
	AppPaths offSettings = await SettingsCase("off", "{\"minimizeToTray\":false,\"openImmediatelyWhenReady\":true,\"backgroundMarketUpdatesEnabled\":false}");
	Check(!await AppBehaviorSettings.IsBackgroundCollectionAllowedAsync(offSettings, CancellationToken.None),
		"Explicitly disabled background work must stay disabled across scheduled and installer checks.");
	AppBehaviorSettings offLoaded = await AppBehaviorSettings.LoadAsync(offSettings, CancellationToken.None);
	Check(!offLoaded.MinimizeToTray && offLoaded.OpenImmediatelyWhenReady && !offLoaded.BackgroundMarketUpdatesEnabled,
		"Loading background controls must preserve the user's other preferences.");
	AppPaths restoredSettings = await SettingsCase("damaged-newer-off", "broken", "{\"minimizeToTray\":false,\"openImmediatelyWhenReady\":true,\"backgroundMarketUpdatesEnabled\":true}");
	Check(!await AppBehaviorSettings.IsBackgroundCollectionAllowedAsync(restoredSettings, CancellationToken.None),
		"An older enabled backup is not permission to collect when the primary is damaged.");
	for (int restart = 0; restart < 3; restart++)
	{
		AppBehaviorSettings recovered = await AppBehaviorSettings.LoadAsync(restoredSettings, CancellationToken.None);
		Check(!recovered.BackgroundMarketUpdatesEnabled && !recovered.MinimizeToTray && recovered.OpenImmediatelyWhenReady,
			"Every restart must recover non-background preferences without re-enabling background collection.");
	}
	Check(await File.ReadAllTextAsync(restoredSettings.AppBehaviorSettingsPath) == "broken",
		"Reading damaged preference state must not quarantine or rewrite the primary.");
	AppPaths missingPrimary = await SettingsCase("missing-primary", backup: "{\"minimizeToTray\":true,\"backgroundMarketUpdatesEnabled\":true}");
	Check(!await AppBehaviorSettings.IsBackgroundCollectionAllowedAsync(missingPrimary, CancellationToken.None)
		&& !(await AppBehaviorSettings.LoadAsync(missingPrimary, CancellationToken.None)).BackgroundMarketUpdatesEnabled,
		"A backup without its primary is not a fresh installation and must fail closed.");
	AppPaths badNoBackup = await SettingsCase("bad-no-backup", "null");
	AppPaths emptySettings = await SettingsCase("empty-settings", "{}");
	Check(!await AppBehaviorSettings.IsBackgroundCollectionAllowedAsync(emptySettings, CancellationToken.None),
		"An empty JSON object is not a valid legacy settings document and cannot authorize background work.");
	Check(!await AppBehaviorSettings.IsBackgroundCollectionAllowedAsync(badNoBackup, CancellationToken.None)
		&& !(await AppBehaviorSettings.LoadAsync(badNoBackup, CancellationToken.None)).BackgroundMarketUpdatesEnabled,
		"Invalid preferences without a backup must fail closed rather than use enabled defaults.");
	AppPaths lockedPrimary = await SettingsCase("locked-primary", "{\"minimizeToTray\":true,\"backgroundMarketUpdatesEnabled\":false}");
	await using (FileStream held = new(lockedPrimary.AppBehaviorSettingsPath, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
	{
		Check(!await AppBehaviorSettings.IsBackgroundCollectionAllowedAsync(lockedPrimary, CancellationToken.None)
			&& !(await AppBehaviorSettings.LoadAsync(lockedPrimary, CancellationToken.None)).BackgroundMarketUpdatesEnabled,
			"An inaccessible primary preference must stop background work, not be treated as missing.");
	}
	bool permissionCancelled = false;
	try { await AppBehaviorSettings.IsBackgroundCollectionAllowedAsync(firstInstall, cancelled.Token); }
	catch (OperationCanceledException) { permissionCancelled = true; }
	Check(permissionCancelled, "Background preference polling must honor cancellation.");
	Console.WriteLine($"Background market controls: {assertions} assertions passed. No real Windows tasks were accessed.");
}
finally
{
	SqliteConnection.ClearAllPools();
	string resolved = Path.GetFullPath(root);
	if (Path.GetDirectoryName(resolved) == Path.TrimEndingDirectorySeparator(Path.GetFullPath(Path.GetTempPath()))
		&& Path.GetFileName(resolved).StartsWith("bsh-background-controls-test-", StringComparison.Ordinal))
	{
		Directory.Delete(resolved, recursive: true);
	}
}

internal sealed class FakeScheduler
{
	internal HashSet<string> Names { get; } = new(StringComparer.OrdinalIgnoreCase);
	internal List<string[]> Calls { get; } = new();
	internal string? QueryError { get; set; }
	internal string? QueryOverride { get; set; }
	internal string NextRun { get; set; } = new DateTimeOffset(2026, 9, 7, 18, 0, 0, TimeSpan.Zero).ToLocalTime().ToString("g", CultureInfo.CurrentCulture);
	internal bool FailAllCreates { get; set; }
	internal bool FailBaseCreate { get; set; }
	internal bool FailDeletes { get; set; }
	internal CancellationTokenSource? CancelCreate { get; set; }

	internal Task<MarketTaskCommandResult> RunAsync(IReadOnlyList<string> arguments, TimeSpan timeout, CancellationToken cancellationToken)
	{
		cancellationToken.ThrowIfCancellationRequested();
		string[] args = arguments.ToArray();
		Calls.Add(args);
		if (timeout > TimeSpan.FromSeconds(15)) throw new InvalidOperationException("Every scheduler command must be bounded.");
		MarketTaskCommandResult result;
		if (args[0] == "/Query")
		{
			string csv = string.Join("\r\n", Names.Select(name => $"\"\\{name}\",\"{NextRun}\",\"Ready\""));
			result = QueryError != null ? new(1, "", QueryError) : new(0, QueryOverride ?? csv, "");
		}
		else
		{
			string name = args[Array.IndexOf(args, "/TN") + 1];
			if (args[0] == "/Create")
			{
				CancelCreate?.Cancel();
				cancellationToken.ThrowIfCancellationRequested();
				bool fail = FailAllCreates || FailBaseCreate && name == MarketCollectorTaskManager.TaskName;
				if (!fail) Names.Add(name);
				result = fail ? new(1, "", "Access is denied.") : new(0, "Created.", "");
			}
			else if (args[0] == "/Delete")
			{
				if (!FailDeletes) Names.Remove(name);
				result = FailDeletes ? new(1, "", "Access is denied.") : new(0, "Deleted.", "");
			}
			else throw new InvalidOperationException("Unexpected scheduler command.");
		}
		return Task.FromResult(result);
	}
}

namespace BlackSpiritHub
{
	internal sealed record AppPaths(string DatabasePath)
	{
		internal string AppBehaviorSettingsPath => Path.Combine(Path.GetDirectoryName(DatabasePath)!, "app-behavior-settings.json");
	}
}
