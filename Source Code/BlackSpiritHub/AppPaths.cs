using System;
using System.IO;

namespace BlackSpiritHub;

internal sealed record AppPaths(string Root, string HtmlPath, string DatabasePath, string WebViewDataPath, string PortraitSettingsPath, string FontChangerSettingsPath, string LogPath)
{
	private const string CurrentAppDataFolderName = "Black Spirit Hub";

	private static readonly string PreviousAppDataFolderName = string.Concat("BDO ", "Multi", "-", "Tool");

	private static readonly string LegacyAppDataFolderName = string.Concat("BDO ", "Trade ", "Distance ", "Calculator");

	private const string HtmlFileName = "Black_Spirit_Hub.html";

	private static readonly string[] MigratedFiles =
	[
		"market-analytics.db",
		"coupons_cache.json",
		"coupon_settings.json",
		"events_cache.json",
		"events_cache.backup.json",
		"boss_schedule_cache.json",
		"portrait-replacer-settings.json",
		"font-changer-settings.json",
		"app-behavior-settings.json",
		"grind-sessions.json",
		"grind-sessions.backup.json"
	];

	public string CouponsCachePath => Path.Combine(Root, "coupons_cache.json");

	public string CouponSettingsPath => Path.Combine(Root, "coupon_settings.json");

	public string CouponIconsPath => Path.Combine(Root, "data", "icons", "coupons");
	public string EventsCachePath => Path.Combine(Root, "events_cache.json");
	public string EventsBackupCachePath => Path.Combine(Root, "events_cache.backup.json");
	public string BossScheduleCachePath => Path.Combine(Root, "boss_schedule_cache.json");
	public string ThemeAssetsPath => Path.Combine(Root, "ThemeAssets");
	public string MasteryIconsPath => Path.Combine(Root, "Assets", "MasteryIcons");
	public string FontGuidePath => Path.Combine(Root, "Assets", "FontGuide");
	public string AppBehaviorSettingsPath => Path.Combine(Root, "app-behavior-settings.json");
	public string GrindSessionsPath => Path.Combine(Root, "grind-sessions.json");
	public string GrindSessionsBackupPath => Path.Combine(Root, "grind-sessions.backup.json");

	public static AppPaths Create()
	{
		string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
		string currentRoot = Path.Combine(localAppData, CurrentAppDataFolderName);
		MigratePreviousProductData(Path.Combine(localAppData, PreviousAppDataFolderName), currentRoot);
		MigrateLegacyData(Path.Combine(localAppData, LegacyAppDataFolderName), currentRoot);
		NormalizeMigratedNames(currentRoot);
		return CreateAt(currentRoot);
	}

	public static AppPaths CreateAt(string root)
	{
		return new AppPaths(root, Path.Combine(root, HtmlFileName), Path.Combine(root, "market-analytics.db"), Path.Combine(root, "webview-data"), Path.Combine(root, "portrait-replacer-settings.json"), Path.Combine(root, "font-changer-settings.json"), Path.Combine(root, "logs", "black-spirit-hub.log"));
	}

	public void EnsureDirectories()
	{
		Directory.CreateDirectory(Root);
		Directory.CreateDirectory(WebViewDataPath);
		Directory.CreateDirectory(CouponIconsPath);
		Directory.CreateDirectory(ThemeAssetsPath);
		Directory.CreateDirectory(MasteryIconsPath);
		Directory.CreateDirectory(FontGuidePath);
		string? logDirectory = Path.GetDirectoryName(LogPath);
		if (!string.IsNullOrWhiteSpace(logDirectory))
		{
			Directory.CreateDirectory(logDirectory);
		}
	}

	private static void MigrateLegacyData(string legacyRoot, string currentRoot)
	{
		if (!Directory.Exists(legacyRoot) || string.Equals(Path.GetFullPath(legacyRoot), Path.GetFullPath(currentRoot), StringComparison.OrdinalIgnoreCase))
		{
			return;
		}

		Directory.CreateDirectory(currentRoot);
		foreach (string fileName in MigratedFiles)
		{
			CopyFileIfMissing(Path.Combine(legacyRoot, fileName), Path.Combine(currentRoot, fileName));
		}

		CopyFileIfMissing(Path.Combine(legacyRoot, "logs", "market-analytics.log"), Path.Combine(currentRoot, "logs", "black-spirit-hub.log"));
		CopyDirectoryIfMissing(Path.Combine(legacyRoot, "data"), Path.Combine(currentRoot, "data"));
		CopyDirectoryIfMissing(Path.Combine(legacyRoot, "Assets"), Path.Combine(currentRoot, "Assets"));
		CopyDirectoryIfMissing(Path.Combine(legacyRoot, "ThemeAssets"), Path.Combine(currentRoot, "ThemeAssets"));
	}

	private static void MigratePreviousProductData(string previousRoot, string currentRoot)
	{
		if (!Directory.Exists(previousRoot)
			|| string.Equals(Path.GetFullPath(previousRoot), Path.GetFullPath(currentRoot), StringComparison.OrdinalIgnoreCase))
		{
			return;
		}

		if (!Directory.Exists(currentRoot))
		{
			try
			{
				Directory.Move(previousRoot, currentRoot);
				return;
			}
			catch (IOException)
			{
			}
			catch (UnauthorizedAccessException)
			{
			}
		}

		Directory.CreateDirectory(currentRoot);
		if (MergeDirectory(previousRoot, currentRoot))
		{
			TryDeleteDirectory(previousRoot);
		}
	}

	internal static void MigratePreviousProductDataForTest(string previousRoot, string currentRoot)
	{
		MigratePreviousProductData(previousRoot, currentRoot);
		NormalizeMigratedNames(currentRoot);
	}

	private static bool MergeDirectory(string sourceDirectory, string targetDirectory)
	{
		bool complete = true;
		try
		{
			foreach (string sourcePath in Directory.EnumerateFiles(sourceDirectory, "*", SearchOption.AllDirectories))
			{
				string relativePath = Path.GetRelativePath(sourceDirectory, sourcePath);
				string targetPath = Path.Combine(targetDirectory, relativePath);
				try
				{
					FileInfo source = new(sourcePath);
					FileInfo target = new(targetPath);
					if (!target.Exists || source.LastWriteTimeUtc > target.LastWriteTimeUtc)
					{
						string? targetParent = Path.GetDirectoryName(targetPath);
						if (!string.IsNullOrWhiteSpace(targetParent))
						{
							Directory.CreateDirectory(targetParent);
						}
						File.Copy(sourcePath, targetPath, overwrite: true);
						File.SetLastWriteTimeUtc(targetPath, source.LastWriteTimeUtc);
					}
				}
				catch (IOException)
				{
					complete = false;
				}
				catch (UnauthorizedAccessException)
				{
					complete = false;
				}
			}
		}
		catch (IOException)
		{
			complete = false;
		}
		catch (UnauthorizedAccessException)
		{
			complete = false;
		}

		return complete;
	}

	private static void NormalizeMigratedNames(string currentRoot)
	{
		if (!Directory.Exists(currentRoot))
		{
			return;
		}

		string previousCompactName = string.Concat("BDO", "Multi", "Tool");
		string previousResourceStem = string.Concat(previousCompactName, ".Resources.", "BDO", "_Multi", "_Tool");
		string previousHtmlName = string.Concat("BDO", "_Multi", "_Tool.html");
		string previousLogStem = string.Concat("bdo", "-multi", "-tool");
		string previousLogName = previousLogStem + ".log";
		string logsRoot = Path.Combine(currentRoot, "logs");
		string previousLogPath = Path.Combine(logsRoot, previousLogName);
		string currentLogPath = Path.Combine(logsRoot, "black-spirit-hub.log");

		if (File.Exists(previousLogPath))
		{
			string targetLogPath = File.Exists(currentLogPath)
				? Path.Combine(logsRoot, "black-spirit-hub.previous.log")
				: currentLogPath;
			MoveMigratedFile(previousLogPath, targetLogPath);
		}

		if (Directory.Exists(logsRoot))
		{
			try
			{
				foreach (string sourceLogPath in Directory.GetFiles(logsRoot, previousLogStem + "*", SearchOption.TopDirectoryOnly))
				{
					string sourceName = Path.GetFileName(sourceLogPath);
					if (!sourceName.StartsWith(previousLogStem, StringComparison.OrdinalIgnoreCase))
					{
						continue;
					}

					string suffix = sourceName[previousLogStem.Length..];
					MoveMigratedFile(sourceLogPath, Path.Combine(logsRoot, "black-spirit-hub" + suffix));
				}
			}
			catch (IOException)
			{
			}
			catch (UnauthorizedAccessException)
			{
			}
		}

		TryDeleteFile(Path.Combine(currentRoot, previousHtmlName));
		foreach (string extension in new[] { ".html", ".css", ".js" })
		{
			TryDeleteFile(Path.Combine(currentRoot, previousResourceStem + extension));
		}
	}

	private static void MoveMigratedFile(string sourcePath, string targetPath)
	{
		try
		{
			string destinationPath = targetPath;
			for (int index = 1; File.Exists(destinationPath); index++)
			{
				destinationPath = targetPath + $".migrated-{index}";
			}

			File.Move(sourcePath, destinationPath);
		}
		catch (IOException)
		{
		}
		catch (UnauthorizedAccessException)
		{
		}
	}

	private static void CopyDirectoryIfMissing(string sourceDirectory, string targetDirectory)
	{
		if (!Directory.Exists(sourceDirectory))
		{
			return;
		}

		foreach (string sourcePath in Directory.EnumerateFiles(sourceDirectory, "*", SearchOption.AllDirectories))
		{
			string relativePath = Path.GetRelativePath(sourceDirectory, sourcePath);
			CopyFileIfMissing(sourcePath, Path.Combine(targetDirectory, relativePath));
		}
	}

	private static void CopyFileIfMissing(string sourcePath, string targetPath)
	{
		if (!File.Exists(sourcePath) || File.Exists(targetPath))
		{
			return;
		}

		string? targetDirectory = Path.GetDirectoryName(targetPath);
		if (!string.IsNullOrWhiteSpace(targetDirectory))
		{
			Directory.CreateDirectory(targetDirectory);
		}

		try
		{
			File.Copy(sourcePath, targetPath);
		}
		catch (IOException)
		{
		}
		catch (UnauthorizedAccessException)
		{
		}
	}

	private static void TryDeleteFile(string path)
	{
		try
		{
			if (File.Exists(path))
			{
				File.Delete(path);
			}
		}
		catch (IOException)
		{
		}
		catch (UnauthorizedAccessException)
		{
		}
	}

	private static void TryDeleteDirectory(string path)
	{
		try
		{
			if (Directory.Exists(path))
			{
				Directory.Delete(path, recursive: true);
			}
		}
		catch (IOException)
		{
		}
		catch (UnauthorizedAccessException)
		{
		}
	}
}
