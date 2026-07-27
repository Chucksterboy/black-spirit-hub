using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.IO.Pipes;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Data.Sqlite;

namespace BlackSpiritHub;

internal static class Program
{
	private const string SingleInstanceMutexName = "Local\\BlackSpiritHub.SingleInstance";

	private const string SingleInstancePipeName = "BlackSpiritHub.SingleInstance.Restore";

	private static readonly string PreviousSingleInstanceMutexName = string.Concat("Local\\BDO", "Multi", "Tool.SingleInstance");

	private static readonly string PreviousSingleInstancePipeName = string.Concat("BDO", "Multi", "Tool.SingleInstance.Restore");

	[STAThread]
	private static void Main(string[] args)
	{
		ApplicationConfiguration.Initialize();
		Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
		if (args.Any(a => string.Equals(a, "--coupon-smoke-test", StringComparison.OrdinalIgnoreCase)))
		{
			string root = Path.Combine(Path.GetTempPath(), $"bdo-coupon-smoke-{Guid.NewGuid():N}");
			AppPaths testPaths = AppPaths.CreateAt(root);
			testPaths.EnsureDirectories();
			using AppLogger testLogger = new AppLogger(testPaths.LogPath);
			using CouponService service = new CouponService(testPaths, testLogger);
			JsonElement dashboard = JsonSerializer.SerializeToElement(service.InitializeAsync(CancellationToken.None).GetAwaiter().GetResult());
			JsonElement refresh = JsonSerializer.SerializeToElement(service.RefreshAsync(CancellationToken.None).GetAwaiter().GetResult());
			int result = dashboard.GetProperty("coupons").GetArrayLength() >= 3
				&& dashboard.GetProperty("availableCount").GetInt32() >= 1
				&& File.Exists(testPaths.CouponsCachePath)
				&& File.Exists(testPaths.CouponSettingsPath)
				&& refresh.TryGetProperty("lastAttempt", out _)
				&& refresh.TryGetProperty("refreshDebug", out _)
				&& refresh.GetProperty("status").GetString() == "LIVE"
				&& refresh.GetProperty("coupons").GetArrayLength() >= 1 ? 0 : 41;
			try { Directory.Delete(root, true); } catch { }
			Environment.Exit(result);
			return;
		}
		if (args.Any(a => string.Equals(a, "--grind-market-smoke-test", StringComparison.OrdinalIgnoreCase)))
		{
			string root = Path.Combine(Path.GetTempPath(), $"bdo-grind-market-smoke-{Guid.NewGuid():N}");
			AppPaths testPaths = AppPaths.CreateAt(root);
			testPaths.EnsureDirectories();
			using AppLogger testLogger = new(testPaths.LogPath);
			using GrindMarketPriceProvider provider = new(testLogger);
			GrindMarketPriceResponse response = provider.GetPricesAsync(
				[16_001, 721_003],
				"eu",
				CancellationToken.None).GetAwaiter().GetResult();
			Console.WriteLine(JsonSerializer.Serialize(response));
			int result = response.Prices.Count == 2
				&& response.Prices.All(price => price.Price > 0)
				&& response.Missing.Count == 0 ? 0 : 61;
			try { Directory.Delete(root, true); } catch { }
			Environment.Exit(result);
			return;
		}
		if (args.Any((string a) => string.Equals(a, "--portrait-smoke-test", StringComparison.OrdinalIgnoreCase)))
		{
			string text = Path.Combine(Path.GetTempPath(), $"bdo-portrait-app-smoke-{Guid.NewGuid():N}");
			AppPaths appPaths = AppPaths.CreateAt(text);
			appPaths.EnsureDirectories();
			using AppLogger logger = new AppLogger(appPaths.LogPath);
			int result = RunPortraitSmokeTestAsync(appPaths, logger).GetAwaiter().GetResult();
			try
			{
				if (result == 0)
				{
					Directory.Delete(text, recursive: true);
				}
			}
			catch
			{
			}
			Environment.Exit(result);
			return;
		}
		if (args.Any((string a) => string.Equals(a, "--font-smoke-test", StringComparison.OrdinalIgnoreCase)))
		{
			string text2 = Path.Combine(Path.GetTempPath(), $"bdo-font-app-smoke-{Guid.NewGuid():N}");
			AppPaths appPaths2 = AppPaths.CreateAt(text2);
			appPaths2.EnsureDirectories();
			using AppLogger logger2 = new AppLogger(appPaths2.LogPath);
			int result2 = RunFontSmokeTestAsync(appPaths2, logger2).GetAwaiter().GetResult();
			try
			{
				if (result2 == 0)
				{
					Directory.Delete(text2, recursive: true);
				}
			}
			catch
			{
			}
			Environment.Exit(result2);
			return;
		}
		if (args.Any((string a) => string.Equals(a, "--product-migration-smoke-test", StringComparison.OrdinalIgnoreCase)))
		{
			Environment.Exit(RunProductMigrationSmokeTest());
			return;
		}
		bool runOnlineSmokeTest = args.Any((string a) => string.Equals(a, "--smoke-test", StringComparison.OrdinalIgnoreCase));
		bool runOfflineSmokeTest = args.Any((string a) => string.Equals(a, "--offline-smoke-test", StringComparison.OrdinalIgnoreCase));
		if (runOnlineSmokeTest || runOfflineSmokeTest)
		{
			Environment.Exit(RunIsolatedAppSmokeTest(runOfflineSmokeTest));
			return;
		}
		AppPaths appPaths3 = AppPaths.Create();
		appPaths3.EnsureDirectories();
		PrepareUiFiles(appPaths3);
		using AppLogger logger3 = new AppLogger(appPaths3.LogPath);
		Application.ThreadException += (_, e) => logger3.Error("Unhandled UI exception.", e.Exception);
		AppDomain.CurrentDomain.UnhandledException += (_, e) =>
		{
			if (e.ExceptionObject is Exception exception)
			{
				logger3.Error("Unhandled app exception.", exception);
			}
		};
		if (args.Any((string a) => string.Equals(a, "--market-scheduled-update", StringComparison.OrdinalIgnoreCase)))
		{
			Environment.Exit(RunScheduledMarketUpdateAsync(appPaths3, logger3).GetAwaiter().GetResult());
		}
		else
		{
			using Mutex singleInstanceMutex = new Mutex(initiallyOwned: true, SingleInstanceMutexName, out bool ownsSingleInstance);
			using Mutex previousSingleInstanceMutex = new Mutex(initiallyOwned: true, PreviousSingleInstanceMutexName, out bool ownsPreviousSingleInstance);
			if (!ownsSingleInstance || !ownsPreviousSingleInstance)
			{
				SendRestoreRequestToExistingInstance();
				return;
			}

			using CancellationTokenSource singleInstanceServer = new CancellationTokenSource();
			using CalculatorForm form = new CalculatorForm(appPaths3, logger3);
			_ = RunSingleInstanceServerAsync(form, singleInstanceServer.Token);
			Application.Run(form);
			singleInstanceServer.Cancel();
		}
	}

	private static int RunIsolatedAppSmokeTest(bool offline)
	{
		string root = Path.Combine(Path.GetTempPath(), $"black-spirit-hub-app-smoke-{Guid.NewGuid():N}");
		try
		{
			AppPaths paths = AppPaths.CreateAt(root);
			paths.EnsureDirectories();
			if (!offline)
			{
				PrepareUiFiles(paths);
			}
			using AppLogger logger = new(paths.LogPath);
			return offline
				? RunOfflineSmokeTestAsync(logger).GetAwaiter().GetResult()
				: RunSmokeTestAsync(paths, logger).GetAwaiter().GetResult();
		}
		finally
		{
			try
			{
				if (Directory.Exists(root))
				{
					Directory.Delete(root, recursive: true);
				}
			}
			catch
			{
			}
		}
	}

	private static async Task<int> RunScheduledMarketUpdateAsync(AppPaths paths, AppLogger logger)
	{
		try
		{
			MarketDatabase database = new MarketDatabase(paths.DatabasePath);
			using BlackDesertMarketProvider provider = new BlackDesertMarketProvider(logger);
			using MarketAnalyticsService service = new MarketAnalyticsService(database, provider, logger);
			await service.InitializeAsync(CancellationToken.None, startForegroundUpdates: false);
			await service.RefreshDueMarketSamplesAsync(MarketAnalyticsService.DefaultCollectorInterval, "Windows scheduled task", CancellationToken.None);
			return 0;
		}
		catch (Exception exception)
		{
			logger.Error("Scheduled market collector failed.", exception);
			return 1;
		}
	}

	private static int RunProductMigrationSmokeTest()
	{
		string root = Path.Combine(Path.GetTempPath(), $"black-spirit-hub-migration-{Guid.NewGuid():N}");
		try
		{
			string previousRoot = Path.Combine(root, "previous");
			string currentRoot = Path.Combine(root, "current");
			Directory.CreateDirectory(Path.Combine(previousRoot, "logs"));
			File.WriteAllText(Path.Combine(previousRoot, "grind-sessions.json"), "[{\"spotId\":\"test\"}]");
			string previousLogName = string.Concat("bdo", "-multi", "-tool.log");
			File.WriteAllText(Path.Combine(previousRoot, "logs", previousLogName), "previous log");
			string previousRotatedLogName = previousLogName + ".1";
			File.WriteAllText(Path.Combine(previousRoot, "logs", previousRotatedLogName), "previous rotated log");
			string previousNativeLogName = string.Concat("bdo", "-multi", "-tool-native.log");
			File.WriteAllText(Path.Combine(previousRoot, "logs", previousNativeLogName), "previous native log");
			string previousResourceStem = string.Concat("BDO", "Multi", "Tool.Resources.", "BDO", "_Multi", "_Tool");
			File.WriteAllText(Path.Combine(previousRoot, previousResourceStem + ".css"), "retired");

			AppPaths.MigratePreviousProductDataForTest(previousRoot, currentRoot);
			if (Directory.Exists(previousRoot)
				|| !File.Exists(Path.Combine(currentRoot, "grind-sessions.json"))
				|| !File.Exists(Path.Combine(currentRoot, "logs", "black-spirit-hub.log"))
				|| !File.Exists(Path.Combine(currentRoot, "logs", "black-spirit-hub.log.1"))
				|| !File.Exists(Path.Combine(currentRoot, "logs", "black-spirit-hub-native.log"))
				|| File.Exists(Path.Combine(currentRoot, "logs", previousRotatedLogName))
				|| File.Exists(Path.Combine(currentRoot, "logs", previousNativeLogName))
				|| File.Exists(Path.Combine(currentRoot, previousResourceStem + ".css")))
			{
				return 71;
			}

			string mergePreviousRoot = Path.Combine(root, "merge-previous");
			string mergeCurrentRoot = Path.Combine(root, "merge-current");
			Directory.CreateDirectory(mergePreviousRoot);
			Directory.CreateDirectory(mergeCurrentRoot);
			string sharedFileName = "app-behavior-settings.json";
			string previousSharedPath = Path.Combine(mergePreviousRoot, sharedFileName);
			string currentSharedPath = Path.Combine(mergeCurrentRoot, sharedFileName);
			File.WriteAllText(previousSharedPath, "previous");
			File.SetLastWriteTimeUtc(previousSharedPath, DateTime.UtcNow.AddMinutes(-2));
			File.WriteAllText(currentSharedPath, "current");
			File.SetLastWriteTimeUtc(currentSharedPath, DateTime.UtcNow);
			File.WriteAllText(Path.Combine(mergePreviousRoot, "market-analytics.db"), "market");

			AppPaths.MigratePreviousProductDataForTest(mergePreviousRoot, mergeCurrentRoot);
			if (Directory.Exists(mergePreviousRoot)
				|| File.ReadAllText(currentSharedPath) != "current"
				|| !File.Exists(Path.Combine(mergeCurrentRoot, "market-analytics.db")))
			{
				return 72;
			}

			return 0;
		}
		catch
		{
			return 73;
		}
		finally
		{
			try
			{
				if (Directory.Exists(root))
				{
					Directory.Delete(root, recursive: true);
				}
			}
			catch
			{
			}
		}
	}

	private static void SendRestoreRequestToExistingInstance()
	{
		if (TrySendSingleInstanceRequest(SingleInstancePipeName, "restore"))
		{
			return;
		}
		TrySendSingleInstanceRequest(PreviousSingleInstancePipeName, "restore");
	}

	private static bool TrySendSingleInstanceRequest(string pipeName, string command)
	{
		try
		{
			using NamedPipeClientStream client = new NamedPipeClientStream(".", pipeName, PipeDirection.Out);
			client.Connect(750);
			using StreamWriter writer = new StreamWriter(client);
			writer.WriteLine(command);
			writer.Flush();
			return true;
		}
		catch
		{
			return false;
		}
	}

	private static async Task RunSingleInstanceServerAsync(CalculatorForm form, CancellationToken cancellationToken)
	{
		while (!cancellationToken.IsCancellationRequested)
		{
			try
			{
				using NamedPipeServerStream server = new NamedPipeServerStream(
					SingleInstancePipeName,
					PipeDirection.In,
					1,
					PipeTransmissionMode.Byte,
					PipeOptions.Asynchronous);
				await server.WaitForConnectionAsync(cancellationToken);
				using StreamReader reader = new(server);
				string? command = await reader.ReadLineAsync(cancellationToken);
				if (string.Equals(command, "shutdown-for-update", StringComparison.OrdinalIgnoreCase))
				{
					form.ExitForUpdate();
				}
				else
				{
					form.RestoreFromExternalLaunch();
				}
			}
			catch (OperationCanceledException)
			{
				break;
			}
			catch
			{
				await Task.Delay(250, cancellationToken).ContinueWith(_ => { }, TaskScheduler.Default);
			}
		}
	}

	private static async Task<int> RunSmokeTestAsync(AppPaths paths, AppLogger logger)
	{
		if (!File.Exists(paths.HtmlPath))
		{
			return 2;
		}
		string testDatabasePath = Path.Combine(Path.GetTempPath(), $"bdo-market-smoke-{Guid.NewGuid():N}.db");
		try
		{
			MarketDatabase database = new MarketDatabase(testDatabasePath);
			await database.InitializeAsync(CancellationToken.None);
			await database.SaveSettingsAsync(MarketSettings.Default, CancellationToken.None);
			using BlackDesertMarketProvider provider = new BlackDesertMarketProvider(logger);
			IReadOnlyList<MarketItem> source = await provider.SearchAsync("Black Stone Powder", "na", CancellationToken.None);
			MarketItem marketItem = source.FirstOrDefault((MarketItem x) => x.ItemId == 4901) ?? source.FirstOrDefault();
			if ((object)marketItem == null)
			{
				return 3;
			}
			MarketItem variant = (await provider.GetVariantsAsync(marketItem.ItemId, "na", CancellationToken.None)).First();
			await database.AddTrackedItemAsync(variant, "na", CancellationToken.None);
			TrackedItem tracked = (await database.GetTrackedItemsAsync("na", CancellationToken.None)).Single();
			await database.SaveSnapshotAsync(tracked, variant, await provider.GetSnapshotAsync(variant.ItemId, variant.Enhancement, "na", CancellationToken.None), CancellationToken.None);
			if (!((await database.GetAnalyticsAsync(variant.ItemId, variant.Enhancement, "na", 30, CancellationToken.None))?.CurrentPrice).HasValue)
			{
				return 4;
			}
			MarketItem[] outfits = (from x in (await provider.GetCategoryAsync(55, 1, "eu", CancellationToken.None)).Concat(await provider.GetCategoryAsync(55, 2, "eu", CancellationToken.None))
				group x by x.ItemId into x
				select x.First()).ToArray();
			if (outfits.Length < 1000)
			{
				return 5;
			}
			await database.SyncOutfitCatalogAsync(outfits.Take(3).ToArray(), "eu", CancellationToken.None);
			MarketItem outfit = outfits[0];
			MarketItem outfitVariant = (await provider.GetVariantsAsync(outfit.ItemId, "eu", CancellationToken.None)).First();
			await database.SaveOutfitDetailAsync(outfit, outfitVariant, await provider.GetSnapshotAsync(outfitVariant.ItemId, outfitVariant.Enhancement, "eu", CancellationToken.None), "eu", CancellationToken.None);
			OutfitReport outfitReport = await database.GetOutfitReportAsync("eu", CancellationToken.None);
			return (outfitReport.CatalogCount != 3 || outfitReport.DetailedCount != 1) ? 6 : 0;
		}
		catch (Exception exception)
		{
			logger.Error("Smoke test failed.", exception);
			return 1;
		}
		finally
		{
			SqliteCleanup(testDatabasePath);
		}
	}

	private static void SqliteCleanup(string path)
	{
		SqliteConnection.ClearAllPools();
		string[] array = new string[3]
		{
			path,
			path + "-wal",
			path + "-shm"
		};
		foreach (string path2 in array)
		{
			if (File.Exists(path2))
			{
				try
				{
					File.Delete(path2);
				}
				catch (IOException)
				{
				}
			}
		}
	}

	private static async Task<int> RunPortraitSmokeTestAsync(AppPaths paths, AppLogger logger)
	{
		string root = Path.Combine(Path.GetTempPath(), $"bdo-portrait-smoke-{Guid.NewGuid():N}");
		string faceTexture = Path.Combine(root, "FaceTexture");
		Directory.CreateDirectory(faceTexture);
		string oldPath = Path.Combine(faceTexture, "portrait.bmp");
		string text = Path.Combine(root, "replacement.png");
		try
		{
			using (Bitmap bitmap = new Bitmap(624, 804))
			{
				using Graphics graphics = Graphics.FromImage(bitmap);
				graphics.Clear(Color.DarkRed);
				bitmap.Save(oldPath, ImageFormat.Bmp);
			}
			using (Bitmap bitmap2 = new Bitmap(1200, 700))
			{
				using Graphics graphics2 = Graphics.FromImage(bitmap2);
				graphics2.Clear(Color.CornflowerBlue);
				bitmap2.Save(text, ImageFormat.Png);
			}
			PortraitReplacerService service = new PortraitReplacerService(paths);
			await service.ReplaceAsync(faceTexture, oldPath, text, "crop", 50.0, 50.0, 1.0, CancellationToken.None);
			using (Image image = Image.FromFile(oldPath))
			{
				if (image.Width != 624 || image.Height != 804)
				{
					return 21;
				}
			}
			if (Directory.GetFiles(Path.Combine(faceTexture, "_BlackSpiritHubBackups"), "portrait_*.bmp").Length != 1)
			{
				return 22;
			}
			await service.RestoreLastBackupAsync(faceTexture, oldPath, CancellationToken.None);
			return (!File.Exists(oldPath)) ? 23 : 0;
		}
		catch (Exception exception)
		{
			logger.Error("Portrait replacer smoke test failed.", exception);
			return 20;
		}
		finally
		{
			try
			{
				Directory.Delete(root, recursive: true);
			}
			catch
			{
			}
		}
	}

	private static async Task<int> RunFontSmokeTestAsync(AppPaths paths, AppLogger logger)
	{
		string root = Path.Combine(Path.GetTempPath(), $"bdo-font-smoke-{Guid.NewGuid():N}");
		Directory.CreateDirectory(Path.Combine(root, "bin64"));
		try
		{
			FontChangerService service = new FontChangerService(paths);
			await service.SaveBdoFolderAsync(root, CancellationToken.None);
			int arrayLength = JsonSerializer.SerializeToElement(service.GetPresetGallery()).GetProperty("presets").GetArrayLength();
			if (arrayLength == 0)
			{
				return 31;
			}
			string[] presetFiles = (from fileName in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "Assets", "Fonts"), "*.ttf", SearchOption.TopDirectoryOnly).Select(Path.GetFileName)
				where !string.IsNullOrWhiteSpace(fileName)
				select fileName).Cast<string>().OrderBy<string, string>((string fileName) => fileName, StringComparer.OrdinalIgnoreCase).Take(2)
				.ToArray();
			if (presetFiles.Length < 2)
			{
				return 31;
			}
			if (arrayLength != Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "Assets", "Fonts"), "*.ttf", SearchOption.TopDirectoryOnly).Length)
			{
				return 31;
			}
			await service.ApplyPresetAsync(root, presetFiles[0], CancellationToken.None);
			string pearlPath = Path.Combine(root, "prestringtable", "font", "pearl.ttf");
			if (!File.Exists(pearlPath))
			{
				return 32;
			}
			await service.ApplyPresetAsync(root, presetFiles[1], CancellationToken.None);
			if (Directory.GetFiles(Path.Combine(root, "prestringtable", "font_BlackSpiritHubBackups"), "pearl_*.ttf").Length != 1)
			{
				return 33;
			}
			await service.RestoreLastBackupAsync(root, CancellationToken.None);
			await service.RemoveCustomFontAsync(root, CancellationToken.None);
			return File.Exists(pearlPath) ? 34 : 0;
		}
		catch (Exception exception)
		{
			logger.Error("Font changer smoke test failed.", exception);
			return 30;
		}
		finally
		{
			try
			{
				Directory.Delete(root, recursive: true);
			}
			catch
			{
			}
		}
	}

	private static void PrepareUiFiles(AppPaths paths)
	{
		string baseDirectory = AppContext.BaseDirectory;
		string htmlSource = Path.Combine(baseDirectory, "BlackSpiritHub.Resources.Black_Spirit_Hub.html");
		string cssSource = Path.Combine(baseDirectory, "BlackSpiritHub.Resources.Black_Spirit_Hub.css");
		string scriptSource = Path.Combine(baseDirectory, "BlackSpiritHub.Resources.Black_Spirit_Hub.js");
		string cssTarget = Path.Combine(paths.Root, Path.GetFileName(cssSource));
		string scriptTarget = Path.Combine(paths.Root, Path.GetFileName(scriptSource));
		string versionStampPath = Path.Combine(paths.Root, ".assets-version");
		if (!File.Exists(htmlSource) || !File.Exists(cssSource) || !File.Exists(scriptSource))
		{
			throw new FileNotFoundException("The application interface is missing.", htmlSource);
		}

		// Core UI files are cheap to compare and must never be trusted solely from the
		// version stamp. Older builds could leave a current stamp beside stale HTML.
		CopyFileIfChanged(htmlSource, paths.HtmlPath);
		CopyFileIfChanged(cssSource, cssTarget);
		CopyFileIfChanged(scriptSource, scriptTarget);
		CopyDirectoryIfPresent(
			Path.Combine(baseDirectory, "Assets", "AppIcon"),
			Path.Combine(paths.Root, "Assets", "AppIcon"));

		bool assetsReady = Directory.Exists(Path.Combine(paths.Root, "Assets"))
			&& Directory.Exists(paths.ThemeAssetsPath)
			&& File.Exists(versionStampPath)
			&& string.Equals(File.ReadAllText(versionStampPath).Trim(), AppVersion.Current, StringComparison.Ordinal);
		if (assetsReady)
		{
			return;
		}

		CopyFileIfChanged(Path.Combine(baseDirectory, "gold-coins.png"), Path.Combine(paths.Root, "gold-coins.png"));
		CopyDirectoryIfPresent(Path.Combine(baseDirectory, "Assets"), Path.Combine(paths.Root, "Assets"));
		CopyDirectoryIfPresent(Path.Combine(baseDirectory, "ThemeAssets"), paths.ThemeAssetsPath);
		File.WriteAllText(versionStampPath, AppVersion.Current);
		TryDeleteFile(Path.Combine(paths.Root, "BlackSpiritHub.Resources.Black_Spirit_Hub.html"));
	}

	private static async Task<int> RunOfflineSmokeTestAsync(AppLogger logger)
	{
		string testDatabasePath = Path.Combine(Path.GetTempPath(), $"bdo-market-offline-smoke-{Guid.NewGuid():N}.db");
		string testStateRoot = Path.Combine(Path.GetTempPath(), $"bdo-state-offline-smoke-{Guid.NewGuid():N}");
		try
		{
			MarketDatabase database = new(testDatabasePath);
			await database.InitializeAsync(CancellationToken.None);
			await database.SaveSettingsAsync(new MarketSettings("eu", 1440), CancellationToken.None);

			MarketItem trackedItem = new(4901, 0, "Test Black Stone Powder", 1, 10_000, 25, 50, 20, 1);
			await database.AddTrackedItemAsync(trackedItem, "eu", CancellationToken.None);
			TrackedItem tracked = (await database.GetTrackedItemsAsync("eu", CancellationToken.None)).Single();
			MarketSnapshot trackedSnapshot = new(10_000, 25, 50, 0, 9_500, 10_500, 10_000, Array.Empty<ProviderHistoryPoint>());
			await database.SaveSnapshotAsync(tracked, trackedItem, trackedSnapshot, CancellationToken.None);
			ItemAnalytics? analytics = await database.GetAnalyticsAsync(trackedItem.ItemId, 0, "eu", 30, CancellationToken.None);
			if (analytics?.CurrentPrice != 10_000)
			{
				return 51;
			}

			MarketItem outfit = new(700_001, 0, "Test Premium Outfit", 4, 2_200_000_000, 0, 123, 55, 1);
			await database.SyncOutfitCatalogAsync([outfit], "eu", CancellationToken.None);
			if ((await database.GetOutfitsDueAsync("eu", 10, CancellationToken.None)).Count != 1)
			{
				return 52;
			}
			MarketSnapshot outfitSnapshot = new(2_200_000_000, 0, 123, 7, 2_100_000_000, 2_200_000_000, 2_150_000_000, Array.Empty<ProviderHistoryPoint>());
			await database.SaveOutfitDetailAsync(outfit, outfit, outfitSnapshot, "eu", CancellationToken.None);
			OutfitReport report = await database.GetOutfitReportAsync("eu", CancellationToken.None);
			if (report.CatalogCount != 1 || report.DetailedCount != 1 || report.Opportunities.Count != 1)
			{
				return 53;
			}

			AppPaths statePaths = AppPaths.CreateAt(testStateRoot);
			statePaths.EnsureDirectories();
			AppStateStore stateStore = new(statePaths, logger);
			JsonElement firstSessions = JsonSerializer.SerializeToElement(new[]
			{
				new { id = "session-backup", spotId = "test-spot", minutes = 60 }
			});
			JsonElement secondSessions = JsonSerializer.SerializeToElement(new[]
			{
				new { id = "session-current", spotId = "test-spot", minutes = 90 }
			});
			await stateStore.SaveGrindSessionsAsync(firstSessions, CancellationToken.None);
			await stateStore.SaveGrindSessionsAsync(secondSessions, CancellationToken.None);
			await File.WriteAllTextAsync(statePaths.GrindSessionsPath, "{not valid json", CancellationToken.None);

			JsonElement recoveredSessions = await stateStore.LoadGrindSessionsAsync(CancellationToken.None);
			if (recoveredSessions.GetArrayLength() != 1
				|| recoveredSessions[0].GetProperty("id").GetString() != "session-backup")
			{
				return 54;
			}
			JsonElement persistedRecovery = JsonSerializer.Deserialize<JsonElement>(
				await File.ReadAllTextAsync(statePaths.GrindSessionsPath, CancellationToken.None));
			EventService.EventDateRange? twitchRange = EventService.FindLikelyEventRange(
				"Twitch Drops July 26, 2026 (Sun) 00:30 UTC - July 29, 2026 (Wed) 12:00 UTC",
				new DateTimeOffset(2026, 7, 30, 8, 0, 0, TimeSpan.Zero));
			if (twitchRange?.StartUtc != new DateTimeOffset(2026, 7, 26, 0, 30, 0, TimeSpan.Zero)
				|| twitchRange.EndUtc != new DateTimeOffset(2026, 7, 29, 12, 0, 0, TimeSpan.Zero))
			{
				return 56;
			}

			EventService.EventDateRange? revisedRange = EventService.FindLikelyEventRange(
				"Mar 5, 2026 (Thu) after maintenance - November 19, 2026 (Thu) before maintenance "
					+ "Mar 5, 2026 (Thu) after maintenance - July 26, 2026 (Sun) 01:00 (UTC)",
				new DateTimeOffset(2026, 7, 27, 8, 0, 0, TimeSpan.Zero));
			if (revisedRange?.EndUtc != new DateTimeOffset(2026, 7, 26, 1, 0, 0, TimeSpan.Zero))
			{
				return 57;
			}

			object cachedEvents = new { status = "CACHED", totalCount = 24 };
			object liveEvents = new { status = "LIVE", totalCount = 24 };
			object emptyEvents = new { status = "CACHED", totalCount = 0 };
			if (!CalculatorForm.ShouldUseEventsBrowserFallback(cachedEvents, forceRefresh: true)
				|| CalculatorForm.ShouldUseEventsBrowserFallback(cachedEvents, forceRefresh: false)
				|| CalculatorForm.ShouldUseEventsBrowserFallback(liveEvents, forceRefresh: true)
				|| !CalculatorForm.ShouldUseEventsBrowserFallback(emptyEvents, forceRefresh: false))
			{
				return 58;
			}

			const string featuredOnlyHtml =
				"<a href=\"/en-US/News/Detail?groupContentNo=1\">Featured</a>"
				+ "<div class=\"event_list\"><ul></ul>";
			const string renderedEventHtml =
				"<a href=\"/en-US/News/Detail?groupContentNo=1\">Featured</a>"
				+ "<div class=\"event_list\"><ul><li>"
				+ "<a href=\"/en-US/News/Detail?groupContentNo=2\">Event</a>"
				+ "</li></ul></div>";
			if (CalculatorForm.LooksLikeOfficialEventsPage(featuredOnlyHtml)
				|| !CalculatorForm.LooksLikeOfficialEventsPage(renderedEventHtml))
			{
				return 59;
			}

			const string ongoingEventHtml =
				"<div class=\"event_list\"><ul><li>"
				+ "<a href=\"/en-US/News/Detail?groupContentNo=42\">"
				+ "<strong class=\"title\"><em>Always-On Test Event</em></strong>"
				+ "<span class=\"count\">Ongoing</span>"
				+ "</a></li></ul></div>";
			List<EventService.EventEntry> ongoingEntries = EventService.ParseList(ongoingEventHtml);
			if (ongoingEntries.Count != 1
				|| ongoingEntries[0].TimeLeftText != "Ongoing"
				|| ongoingEntries[0].RemainingHours != null
				|| ongoingEntries[0].Status != "active")
			{
				return 60;
			}

			if (CalculatorForm.DecideWebViewRecovery(
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedKind.BrowserProcessExited,
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedReason.Unexpected,
					0) != CalculatorForm.WebViewRecoveryAction.Recreate
				|| CalculatorForm.DecideWebViewRecovery(
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedKind.RenderProcessExited,
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedReason.Crashed,
					0) != CalculatorForm.WebViewRecoveryAction.Recreate
				|| CalculatorForm.DecideWebViewRecovery(
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedKind.GpuProcessExited,
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedReason.Crashed,
					0) != CalculatorForm.WebViewRecoveryAction.CheckHealth
				|| CalculatorForm.DecideWebViewRecovery(
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedKind.UnknownProcessExited,
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedReason.Crashed,
					0) != CalculatorForm.WebViewRecoveryAction.CheckHealth
				|| CalculatorForm.DecideWebViewRecovery(
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedKind.RenderProcessUnresponsive,
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedReason.Unresponsive,
					1) != CalculatorForm.WebViewRecoveryAction.None
				|| CalculatorForm.DecideWebViewRecovery(
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedKind.RenderProcessUnresponsive,
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedReason.Unresponsive,
					2) != CalculatorForm.WebViewRecoveryAction.Recreate
				|| CalculatorForm.DecideWebViewRecovery(
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedKind.UtilityProcessExited,
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedReason.Crashed,
					0) != CalculatorForm.WebViewRecoveryAction.None
				|| CalculatorForm.DecideWebViewRecovery(
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedKind.GpuProcessExited,
					Microsoft.Web.WebView2.Core.CoreWebView2ProcessFailedReason.IntegrityFailure,
					0) != CalculatorForm.WebViewRecoveryAction.ShowIntegrityError)
			{
				return 62;
			}

			return persistedRecovery.GetArrayLength() == 1
				&& persistedRecovery[0].GetProperty("id").GetString() == "session-backup" ? 0 : 55;
		}
		catch (Exception exception)
		{
			logger.Error("Offline smoke test failed.", exception);
			return 50;
		}
		finally
		{
			SqliteCleanup(testDatabasePath);
			try
			{
				if (Directory.Exists(testStateRoot))
				{
					Directory.Delete(testStateRoot, recursive: true);
				}
			}
			catch
			{
			}
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

	private static void CopyDirectoryIfPresent(string sourceDirectory, string targetDirectory)
	{
		if (!Directory.Exists(sourceDirectory))
		{
			return;
		}

		foreach (string sourcePath in Directory.EnumerateFiles(sourceDirectory, "*", SearchOption.AllDirectories))
		{
			string relativePath = Path.GetRelativePath(sourceDirectory, sourcePath);
			CopyFileIfChanged(sourcePath, Path.Combine(targetDirectory, relativePath));
		}
	}

	private static void CopyFileIfChanged(string sourcePath, string targetPath)
	{
		if (!File.Exists(sourcePath))
		{
			return;
		}

		string targetDirectory = Path.GetDirectoryName(targetPath);
		if (!string.IsNullOrWhiteSpace(targetDirectory))
		{
			Directory.CreateDirectory(targetDirectory);
		}

		FileInfo sourceInfo = new FileInfo(sourcePath);
		FileInfo targetInfo = new FileInfo(targetPath);
		if (targetInfo.Exists
			&& targetInfo.Length == sourceInfo.Length
			&& FilesAreEqual(sourcePath, targetPath))
		{
			return;
		}

		File.Copy(sourcePath, targetPath, overwrite: true);
	}

	private static bool FilesAreEqual(string firstPath, string secondPath)
	{
		const int bufferSize = 64 * 1024;
		using FileStream first = new(firstPath, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize, FileOptions.SequentialScan);
		using FileStream second = new(secondPath, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize, FileOptions.SequentialScan);
		if (first.Length != second.Length)
		{
			return false;
		}

		byte[] firstBuffer = new byte[bufferSize];
		byte[] secondBuffer = new byte[bufferSize];
		while (true)
		{
			int firstRead = first.Read(firstBuffer, 0, firstBuffer.Length);
			int secondRead = second.Read(secondBuffer, 0, secondBuffer.Length);
			if (firstRead != secondRead)
			{
				return false;
			}
			if (firstRead == 0)
			{
				return true;
			}
			if (!firstBuffer.AsSpan(0, firstRead).SequenceEqual(secondBuffer.AsSpan(0, secondRead)))
			{
				return false;
			}
		}
	}
}
