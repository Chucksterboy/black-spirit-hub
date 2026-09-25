using System;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal sealed record AppBehaviorSettings(
	bool MinimizeToTray,
	bool OpenImmediatelyWhenReady = false,
	bool BackgroundMarketUpdatesEnabled = false,
	bool BackgroundMarketTaskAutoRegistrationRetired = false)
{
	public static AppBehaviorSettings Default => new AppBehaviorSettings(true);

	private static readonly JsonSerializerOptions JsonOptions = new()
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
		PropertyNameCaseInsensitive = true,
		WriteIndented = true
	};

	public static async Task<AppBehaviorSettings> LoadAsync(AppPaths paths, CancellationToken cancellationToken)
	{
		(AppBehaviorSettings? settings, bool missing) = await TryReadSettingsAsync(paths.AppBehaviorSettingsPath, cancellationToken);
		if (settings != null) return settings;
		if (missing && IsDefinitelyMissing(paths.AppBehaviorSettingsPath + ".bak")) return Default;

		// Recover appearance/window preferences, but an older backup must not silently
		// turn background collection back on. Keep the primary untouched: quarantining
		// the only invalid file could make a later launch look like a first installation.
		(AppBehaviorSettings? backup, _) = await TryReadSettingsAsync(paths.AppBehaviorSettingsPath + ".bak", cancellationToken);
		return (backup ?? Default) with
		{
			BackgroundMarketUpdatesEnabled = false,
			// A backup cannot prove that a legacy scheduled task was removed. Keep the
			// marker false so the next startup retries cleanup instead of trusting it.
			BackgroundMarketTaskAutoRegistrationRetired = false
		};
	}

	internal static async Task<bool> IsBackgroundCollectionAllowedAsync(AppPaths paths, CancellationToken cancellationToken)
	{
		(AppBehaviorSettings? settings, _) = await TryReadSettingsAsync(paths.AppBehaviorSettingsPath, cancellationToken);
		if (settings != null)
		{
			// The retirement marker proves that this was an explicit choice made after
			// automatic task creation was removed. Older preference files must never
			// silently restore an hourly scheduled launch.
			return settings.BackgroundMarketUpdatesEnabled
				&& settings.BackgroundMarketTaskAutoRegistrationRetired;
		}
		// Missing, inaccessible, or damaged settings always fail closed. This read is
		// used by the collector every two seconds and must not repair user files.
		return false;
	}

	internal static async Task<BackgroundMarketTaskRetirement> RetireAutomaticMarketTaskAsync(
		AppPaths paths, CancellationToken cancellationToken, MarketCollectorTaskManager.CommandRunner? runner = null)
	{
		AppBehaviorSettings settings = await LoadAsync(paths, cancellationToken);
		if (settings.BackgroundMarketTaskAutoRegistrationRetired)
		{
			return new(settings, false, null);
		}

		// Write the OFF preference before the first removal attempt. Even if Windows
		// temporarily refuses cleanup, an already-started collector will stop itself.
		AppBehaviorSettings disabled = settings with
		{
			BackgroundMarketUpdatesEnabled = false
		};
		disabled = await SaveAsync(paths, disabled, cancellationToken);
		MarketTaskOperationResult cleanup = await MarketCollectorTaskManager
			.RemoveKnownTasksAsync(cancellationToken, runner);
		if (!cleanup.Success)
		{
			// Keep the marker false to retry cleanup on a later startup or installer run.
			return new(disabled, true, cleanup);
		}

		AppBehaviorSettings retired = disabled with { BackgroundMarketTaskAutoRegistrationRetired = true };
		return new(await SaveAsync(paths, retired, cancellationToken), true, cleanup);
	}

	private static async Task<(AppBehaviorSettings? Settings, bool Missing)> TryReadSettingsAsync(
		string path, CancellationToken cancellationToken)
	{
		cancellationToken.ThrowIfCancellationRequested();
		try
		{
			string json = await File.ReadAllTextAsync(path, cancellationToken);
			using JsonDocument document = JsonDocument.Parse(json);
			if (document.RootElement.ValueKind != JsonValueKind.Object) return (null, false);
			int closePreferenceCount = 0;
			foreach (JsonProperty property in document.RootElement.EnumerateObject())
			{
				if (!string.Equals(property.Name, "minimizeToTray", StringComparison.OrdinalIgnoreCase)) continue;
				if (property.Value.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) return (null, false);
				closePreferenceCount++;
			}
			// An empty/arbitrary JSON object is not a valid legacy preference document.
			if (closePreferenceCount != 1) return (null, false);
			return (JsonSerializer.Deserialize<AppBehaviorSettings>(json, JsonOptions), false);
		}
		catch (Exception exception) when (exception is FileNotFoundException or DirectoryNotFoundException)
		{
			return (null, true);
		}
		catch (Exception exception) when (exception is JsonException or IOException or UnauthorizedAccessException)
		{
			return (null, false);
		}
	}

	private static bool IsDefinitelyMissing(string path)
	{
		try
		{
			// File.Exists returns false for access failures as well as missing files;
			// those outcomes must not both imply permission to collect in the background.
			_ = File.GetAttributes(path);
			return false;
		}
		catch (Exception exception) when (exception is FileNotFoundException or DirectoryNotFoundException)
		{
			return true;
		}
		catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
		{
			return false;
		}
	}

	public static async Task<AppBehaviorSettings> SaveAsync(AppPaths paths, AppBehaviorSettings settings, CancellationToken cancellationToken)
	{
		await AtomicFile.WriteAllTextAsync(paths.AppBehaviorSettingsPath, JsonSerializer.Serialize(settings, JsonOptions), cancellationToken);
		return settings;
	}

	public static AppBehaviorSettings Save(AppPaths paths, AppBehaviorSettings settings)
	{
		AtomicFile.WriteAllText(paths.AppBehaviorSettingsPath, JsonSerializer.Serialize(settings, JsonOptions));
		return settings;
	}
}

internal sealed record BackgroundMarketTaskRetirement(
	AppBehaviorSettings Settings,
	bool RetiredNow,
	MarketTaskOperationResult? Cleanup);

