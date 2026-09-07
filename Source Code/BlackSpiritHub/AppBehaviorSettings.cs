using System;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal sealed record AppBehaviorSettings(
	bool MinimizeToTray,
	bool OpenImmediatelyWhenReady = false,
	bool BackgroundMarketUpdatesEnabled = true)
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
		return (backup ?? Default) with { BackgroundMarketUpdatesEnabled = false };
	}

	internal static async Task<bool> IsBackgroundCollectionAllowedAsync(AppPaths paths, CancellationToken cancellationToken)
	{
		(AppBehaviorSettings? settings, bool missing) = await TryReadSettingsAsync(paths.AppBehaviorSettingsPath, cancellationToken);
		if (settings != null) return settings.BackgroundMarketUpdatesEnabled;
		// No preference has ever been saved: retain the established installation
		// default. Otherwise uncertain, inaccessible or damaged state is always OFF.
		// This read is used every two seconds by the collector and never repairs files.
		return missing && IsDefinitelyMissing(paths.AppBehaviorSettingsPath + ".bak");
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

