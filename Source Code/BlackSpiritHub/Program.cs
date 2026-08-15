using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Globalization;
using System.IO;
using System.IO.Pipes;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
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
			string smokeMessage = refresh.TryGetProperty("message", out JsonElement messageValue)
				? messageValue.GetString() ?? "" : "";
			string smokeFailure = refresh.TryGetProperty("refreshDebug", out JsonElement debugValue)
				&& debugValue.ValueKind == JsonValueKind.Object
				&& debugValue.TryGetProperty("failureReason", out JsonElement failureValue)
					? failureValue.GetString() ?? ""
					: "";
			Console.WriteLine(
				$"Coupon smoke: status={refresh.GetProperty("status").GetString()}, "
				+ $"count={refresh.GetProperty("coupons").GetArrayLength()}, "
				+ $"message={smokeMessage}, "
				+ $"failure={smokeFailure}");
			using JsonDocument refreshedCache = JsonDocument.Parse(File.ReadAllText(testPaths.CouponsCachePath));
			int cachedCouponCount = refreshedCache.RootElement.GetProperty("coupons").GetArrayLength();
			string[] refreshedCodes = refresh
				.GetProperty("coupons")
				.EnumerateArray()
				.Select(coupon =>
				{
					JsonElement code = coupon.TryGetProperty(
						"code",
						out JsonElement camelCaseCode)
							? camelCaseCode
							: coupon.GetProperty("Code");
					return CouponService.CanonicalCouponCode(
						code.GetString() ?? "");
				})
				.Where(code => code.Length > 0)
				.ToArray();
			HashSet<string> validatedCacheCodes = refreshedCache.RootElement
				.GetProperty("naEuCouponCodes")
				.EnumerateArray()
				.Select(code => CouponService.CanonicalCouponCode(
					code.GetString() ?? ""))
				.Where(code => code.Length > 0)
				.ToHashSet(StringComparer.OrdinalIgnoreCase);
			JsonElement liveDebug = refresh.GetProperty("refreshDebug");
			JsonElement liveHttpStatus = liveDebug.TryGetProperty(
				"httpStatus",
				out JsonElement camelCaseHttpStatus)
					? camelCaseHttpStatus
					: liveDebug.GetProperty("HttpStatus");
			JsonElement liveSourceUrl = liveDebug.TryGetProperty(
				"sourceUrl",
				out JsonElement camelCaseSourceUrl)
					? camelCaseSourceUrl
					: liveDebug.GetProperty("SourceUrl");
			int result = dashboard.GetProperty("coupons").GetArrayLength() >= 3
				&& dashboard.GetProperty("availableCount").GetInt32() >= 1
				&& File.Exists(testPaths.CouponsCachePath)
				&& File.Exists(testPaths.CouponSettingsPath)
				&& refresh.TryGetProperty("lastAttempt", out _)
				&& refresh.TryGetProperty("refreshDebug", out _)
				&& refresh.GetProperty("status").GetString() == "LIVE"
				&& liveHttpStatus.GetInt32() is >= 200 and < 300
				&& (liveSourceUrl.GetString() ?? "")
					.Contains(
						"api.bdoalerts.net/api/coupons",
						StringComparison.OrdinalIgnoreCase)
				&& refresh.GetProperty("regionScope").GetString() == "NA / EU"
				&& refresh.GetProperty("coupons").GetArrayLength() == cachedCouponCount
				&& refreshedCodes.Length == refreshedCodes
					.Distinct(StringComparer.OrdinalIgnoreCase)
					.Count()
				&& refreshedCodes.All(validatedCacheCodes.Contains)
				&& cachedCouponCount >= 1 ? 0 : 41;
			try { Directory.Delete(root, true); } catch { }
			Environment.Exit(result);
			return;
		}
		if (args.Any(a => string.Equals(a, "--boss-schedule-smoke-test", StringComparison.OrdinalIgnoreCase)))
		{
			string root = Path.Combine(Path.GetTempPath(), $"bdo-boss-schedule-smoke-{Guid.NewGuid():N}");
			AppPaths testPaths = AppPaths.CreateAt(root);
			testPaths.EnsureDirectories();
			using AppLogger testLogger = new(testPaths.LogPath);
			using BossScheduleService service = new(testPaths, testLogger);
			JsonElement refresh = JsonSerializer.SerializeToElement(
				service.RefreshAsync(CancellationToken.None).GetAwaiter().GetResult());
			JsonElement repeatedRefresh = JsonSerializer.SerializeToElement(
				service.RefreshAsync(CancellationToken.None).GetAwaiter().GetResult());
			Console.WriteLine(refresh.GetRawText());
			JsonElement schedule = refresh.GetProperty("schedule");
			int result = refresh.GetProperty("status").GetString() == "LIVE"
				&& repeatedRefresh.GetProperty("fetchedAtUtc").GetString()
					== refresh.GetProperty("fetchedAtUtc").GetString()
				&& repeatedRefresh.GetProperty("contentHash").GetString()
					== refresh.GetProperty("contentHash").GetString()
				&& schedule.ValueKind == JsonValueKind.Object
				&& schedule.EnumerateObject().Count() == 7
				&& schedule.EnumerateObject().All(day => day.Value.GetArrayLength() > 0)
				&& File.Exists(testPaths.BossScheduleCachePath)
					? 0
					: 91;
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
		if (args.Any((string a) => string.Equals(a, "--app-behavior-smoke-test", StringComparison.OrdinalIgnoreCase)))
		{
			Environment.Exit(RunAppBehaviorSmokeTest());
			return;
		}
		bool runOnlineSmokeTest = args.Any((string a) => string.Equals(a, "--smoke-test", StringComparison.OrdinalIgnoreCase));
		bool runOfflineSmokeTest = args.Any((string a) => string.Equals(a, "--offline-smoke-test", StringComparison.OrdinalIgnoreCase));
		if (runOnlineSmokeTest || runOfflineSmokeTest)
		{
			Environment.Exit(RunIsolatedAppSmokeTest(runOfflineSmokeTest));
			return;
		}
		if (args.Any(a => string.Equals(a, "--shutdown-for-update", StringComparison.OrdinalIgnoreCase)))
		{
			SendShutdownRequestToExistingInstance();
			return;
		}
		if (args.Any(a => string.Equals(a, "--install-market-task", StringComparison.OrdinalIgnoreCase)))
		{
			string executablePath = Environment.ProcessPath
				?? Path.Combine(AppContext.BaseDirectory, "Black Spirit Hub.exe");
			bool installed = MarketCollectorTaskManager.Install(executablePath, out string details);
			if (!installed)
			{
				TryWriteInstallerDiagnostic(
					"Market collector task was not created. " + details);
			}
			Environment.Exit(installed ? 0 : 1);
			return;
		}
		if (args.Any(a => string.Equals(a, "--remove-market-task", StringComparison.OrdinalIgnoreCase)))
		{
			MarketCollectorTaskManager.RemoveKnownTasks();
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
			if (CalculatorForm.DefaultAlertVolumePercent != 50
				|| CalculatorForm.DefaultAlarmMciVolume != 500)
			{
				return 118;
			}

			AppPaths paths = AppPaths.CreateAt(root);
			paths.EnsureDirectories();
			if (offline)
			{
				// Reproduce a same-version update: the general asset copy is skipped,
				// while feature folders still have to self-heal before the early return.
				File.WriteAllText(Path.Combine(paths.Root, ".assets-version"), AppVersion.Current);
			}
			PrepareUiFiles(paths);
			string[] requiredLifeSkillIcons = ["trading.svg", "farming.svg", "barter.svg"];
			if (requiredLifeSkillIcons.Any(fileName =>
				!File.Exists(Path.Combine(paths.MasteryIconsPath, fileName))))
			{
				return 119;
			}
			string recipeBookRoot = Path.Combine(AppContext.BaseDirectory, "Assets", "RecipeBook");
			string[] requiredRecipeBookFiles = ["recipes.json", "manifest.json", "bundle-id.txt", "NOTICE.txt"];
			if (requiredRecipeBookFiles.Any(fileName =>
				!File.Exists(Path.Combine(recipeBookRoot, fileName)))
				|| !Directory.Exists(Path.Combine(recipeBookRoot, "icons", "items"))
				|| !Directory.EnumerateFiles(
					Path.Combine(recipeBookRoot, "icons", "items"),
					"*.webp",
					SearchOption.TopDirectoryOnly).Any())
			{
				return 120;
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

	private static int RunAppBehaviorSmokeTest()
	{
		string root = Path.Combine(Path.GetTempPath(), $"black-spirit-hub-app-behavior-{Guid.NewGuid():N}");
		try
		{
			AppPaths paths = AppPaths.CreateAt(root);
			paths.EnsureDirectories();

			AppBehaviorSettings defaults = AppBehaviorSettings.LoadAsync(paths, CancellationToken.None).GetAwaiter().GetResult();
			if (!defaults.MinimizeToTray)
			{
				return 111;
			}

			AppBehaviorSettings.Save(paths, new AppBehaviorSettings(false));
			AppBehaviorSettings disabled = AppBehaviorSettings.LoadAsync(paths, CancellationToken.None).GetAwaiter().GetResult();
			if (disabled.MinimizeToTray)
			{
				return 112;
			}

			AppBehaviorSettings.Save(paths, new AppBehaviorSettings(true));
			AppBehaviorSettings enabled = AppBehaviorSettings.LoadAsync(paths, CancellationToken.None).GetAwaiter().GetResult();
			if (!enabled.MinimizeToTray)
			{
				return 113;
			}

			using JsonDocument validPayload = JsonDocument.Parse("{\"minimizeToTray\":false}");
			if (CalculatorForm.ReadMinimizeToTraySetting(validPayload.RootElement))
			{
				return 114;
			}

			bool rejectedMissingValue = false;
			try
			{
				using JsonDocument missingPayload = JsonDocument.Parse("{}");
				CalculatorForm.ReadMinimizeToTraySetting(missingPayload.RootElement);
			}
			catch (InvalidOperationException)
			{
				rejectedMissingValue = true;
			}
			if (!rejectedMissingValue)
			{
				return 115;
			}

			bool closePolicyIsCorrect =
				CalculatorForm.ShouldMinimizeToTrayOnClose(false, true, CloseReason.UserClosing)
				&& !CalculatorForm.ShouldMinimizeToTrayOnClose(false, false, CloseReason.UserClosing)
				&& !CalculatorForm.ShouldMinimizeToTrayOnClose(true, true, CloseReason.UserClosing)
				&& !CalculatorForm.ShouldMinimizeToTrayOnClose(false, true, CloseReason.WindowsShutDown);
			return closePolicyIsCorrect ? 0 : 116;
		}
		catch
		{
			return 117;
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

	private static void SendShutdownRequestToExistingInstance()
	{
		TrySendSingleInstanceRequest(SingleInstancePipeName, "shutdown-for-update");
		TrySendSingleInstanceRequest(PreviousSingleInstancePipeName, "shutdown-for-update");
	}

	private static void TryWriteInstallerDiagnostic(string message)
	{
		try
		{
			File.AppendAllText(
				Path.Combine(AppContext.BaseDirectory, "install.log"),
				DateTime.Now.ToString("s") + " " + message + Environment.NewLine);
		}
		catch
		{
		}
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
		// Grind data and artwork can change between builds that share an app version.
		// Keep this comparatively small feature folder content-aware so the WebView
		// never serves stale or missing icons from its per-user runtime directory.
		CopyDirectoryIfPresent(
			Path.Combine(baseDirectory, "Assets", "GrindTracker"),
			Path.Combine(paths.Root, "Assets", "GrindTracker"));
		// Player & Guild reuses the mastery icon set, including icons that can be
		// introduced between builds without an application-version bump. Keep the
		// small folder content-aware so a current version stamp cannot hide new or
		// updated life-skill artwork from the per-user WebView directory.
		CopyDirectoryIfPresent(
			Path.Combine(baseDirectory, "Assets", "MasteryIcons"),
			paths.MasteryIconsPath);
		// Dehkia Fuel artwork was introduced in a same-version build. Copy this
		// compact feature folder before honoring the version stamp so installed
		// users receive every accessory and crystal icon immediately.
		CopyDirectoryIfPresent(
			Path.Combine(baseDirectory, "Assets", "DehkiaFuel"),
			Path.Combine(paths.Root, "Assets", "DehkiaFuel"));
		bool assetsReady = Directory.Exists(Path.Combine(paths.Root, "Assets"))
			&& Directory.Exists(paths.ThemeAssetsPath)
			&& File.Exists(versionStampPath)
			&& string.Equals(File.ReadAllText(versionStampPath).Trim(), AppVersion.Current, StringComparison.Ordinal);
		if (assetsReady)
		{
			return;
		}

		CopyFileIfChanged(Path.Combine(baseDirectory, "gold-coins.png"), Path.Combine(paths.Root, "gold-coins.png"));
		// Recipe Book is served directly from its immutable installed folder through
		// a dedicated WebView2 virtual host. Excluding it here avoids a second ~20 MB
		// per-user copy while all other mutable UI assets keep their existing flow.
		CopyDirectoryIfPresent(
			Path.Combine(baseDirectory, "Assets"),
			Path.Combine(paths.Root, "Assets"),
			"RecipeBook");
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
			int storageMaintenanceResult = await RunMarketStorageMaintenanceSmokeTestAsync();
			if (storageMaintenanceResult != 0)
			{
				return storageMaintenanceResult;
			}

			MarketDatabase database = new(testDatabasePath);
			await database.InitializeAsync(CancellationToken.None);
			await database.SaveSettingsAsync(MarketSettings.Default, CancellationToken.None);
			AppHealthService appHealth = new(database, AppContext.BaseDirectory, logger);
			BlackSpiritHubHealth healthyState = await appHealth.CheckAsync(
				new MarketRefreshHealth("never", null, null),
				CancellationToken.None);
			if (!healthyState.Ok
				|| !healthyState.DatabaseReadable
				|| !healthyState.ContentIndexReadable
				|| healthyState.ContentCount < 1
				|| healthyState.HostVersion != AppVersion.Current)
			{
				return 241;
			}

			using (JsonDocument emptyHealthPayload = JsonDocument.Parse("{}"))
			{
				CalculatorForm.ValidateHealthCheckPayload(emptyHealthPayload.RootElement);
			}
			bool rejectedHealthArguments = false;
			try
			{
				using JsonDocument unsafeHealthPayload = JsonDocument.Parse("{\"sql\":\"SELECT * FROM tracked_items\",\"path\":\"C:\\\\private\"}");
				CalculatorForm.ValidateHealthCheckPayload(unsafeHealthPayload.RootElement);
			}
			catch (InvalidOperationException)
			{
				rejectedHealthArguments = true;
			}
			if (!rejectedHealthArguments || CalculatorForm.GetCommandTimeout("healthCheck") != TimeSpan.FromSeconds(6))
			{
				return 242;
			}

			string uninitializedDatabasePath = Path.Combine(testStateRoot, "uninitialized-health.db");
			AppHealthService unavailableHealth = new(new MarketDatabase(uninitializedDatabasePath), AppContext.BaseDirectory, logger);
			BlackSpiritHubHealth unavailableState = await unavailableHealth.CheckAsync(
				new MarketRefreshHealth("never", null, null),
				CancellationToken.None);
			if (unavailableState.Ok || unavailableState.DatabaseReadable || !unavailableState.ContentIndexReadable)
			{
				return 243;
			}
			MarketSettings persistedSettings = await database.GetSettingsAsync(CancellationToken.None);
			if (MarketSettings.DefaultCheckIntervalMinutes != 60
				|| persistedSettings.IntervalMinutes != 60
				|| MarketAnalyticsService.DefaultCollectorInterval != TimeSpan.FromHours(3)
				|| MarketAnalyticsService.DefaultDetailCollectorInterval != TimeSpan.FromHours(24))
			{
				return 229;
			}

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
			MarketItem retiredOutfit = new(700_099, 0, "Retired Test Outfit", 4, 1_000_000_000, 0, 1, 55, 1);
			await database.SyncOutfitCatalogAsync([outfit, retiredOutfit], "eu", CancellationToken.None);
			if ((await database.GetOutfitsDueAsync("eu", 10, CancellationToken.None)).Count != 2)
			{
				return 52;
			}
			int retiredRemoved = await database.SyncOutfitCatalogAsync(
				[outfit],
				"eu",
				CancellationToken.None,
				removeMissing: true);
			if (retiredRemoved != 1
				|| (await database.GetOutfitCatalogAsync("eu", CancellationToken.None)).Count != 1)
			{
				return 74;
			}
			if (!await database.IsOutfitBulkRefreshDueAsync("eu", TimeSpan.FromHours(6), CancellationToken.None)
				|| await database.IsOutfitDetailRefreshDueAsync("eu", TimeSpan.FromHours(24), CancellationToken.None))
			{
				return 75;
			}

			DateTimeOffset bulkCapturedUtc = DateTimeOffset.UtcNow;
			GrindMarketPrice olderOutfitSample = new(
				outfit.ItemId, 0, outfit.Name, outfit.CurrentPrice, null, outfit.CurrentPrice, null,
				outfit.Stock, 100, "offline-bulk-test", bulkCapturedUtc.AddHours(-24));
			GrindMarketPrice currentOutfitSample = olderOutfitSample with
			{
				TradeCount = 112,
				CapturedUtc = bulkCapturedUtc
			};
			int olderSaved = await database.SaveOutfitBulkSamplesAsync([olderOutfitSample], "eu", CancellationToken.None);
			int currentSaved = await database.SaveOutfitBulkSamplesAsync([currentOutfitSample], "eu", CancellationToken.None);
			OutfitReport bulkReport = await database.GetOutfitReportAsync("eu", CancellationToken.None);
			OutfitOpportunity bulkOpportunity = bulkReport.Opportunities.Single();
			if (olderSaved != 1 || currentSaved != 1)
			{
				return 55;
			}
			if (bulkOpportunity.Sales24Hours != 12)
			{
				return bulkOpportunity.Sales24Hours.HasValue
					? 100 + (int)Math.Clamp(bulkOpportunity.Sales24Hours.Value, 0, 99)
					: 66;
			}
			if (bulkOpportunity.PreorderCount.HasValue)
			{
				return 67;
			}
			if (await database.IsOutfitBulkRefreshDueAsync("eu", TimeSpan.FromHours(6), CancellationToken.None))
			{
				return 76;
			}
			MarketItem outfitDetailVariant = outfit with { TradeCount = 112 };
			MarketSnapshot outfitSnapshot = new(2_200_000_000, 0, 112, 7, 2_100_000_000, 2_200_000_000, 2_150_000_000, Array.Empty<ProviderHistoryPoint>());
			await database.SaveOutfitDetailAsync(outfit, outfitDetailVariant, outfitSnapshot, "eu", CancellationToken.None);
			OutfitReport report = await database.GetOutfitReportAsync("eu", CancellationToken.None);
			if (report.CatalogCount != 1
				|| report.DetailedCount != 1
				|| report.Opportunities.Count != 1
				|| report.Opportunities[0].Sales24Hours != 12
				|| report.Opportunities[0].PreorderCount != 7)
			{
				return 53;
			}

			MarketItem oldBaselineOutfit = new(700_002, 0, "Old Baseline Test Outfit", 4, 1_100_000_000, 0, 0, 55, 1);
			MarketItem nearBaselineOutfit = new(700_003, 0, "Near Baseline Test Outfit", 4, 1_200_000_000, 0, 0, 55, 1);
			MarketItem staleLatestOutfit = new(700_004, 0, "Stale Latest Test Outfit", 4, 1_300_000_000, 0, 0, 55, 1);
			await database.SyncOutfitCatalogAsync(
				[outfit, oldBaselineOutfit, nearBaselineOutfit, staleLatestOutfit],
				"eu",
				CancellationToken.None);

			GrindMarketPrice oldBaseline = olderOutfitSample with
			{
				ItemId = oldBaselineOutfit.ItemId,
				Name = oldBaselineOutfit.Name,
				TradeCount = 100,
				CapturedUtc = bulkCapturedUtc.AddDays(-9)
			};
			GrindMarketPrice oldBaselineCurrent = oldBaseline with
			{
				TradeCount = 500,
				CapturedUtc = bulkCapturedUtc
			};
			GrindMarketPrice nearBaseline = olderOutfitSample with
			{
				ItemId = nearBaselineOutfit.ItemId,
				Name = nearBaselineOutfit.Name,
				TradeCount = 100,
				CapturedUtc = bulkCapturedUtc.AddHours(-20)
			};
			GrindMarketPrice nearBaselineCurrent = nearBaseline with
			{
				TradeCount = 112,
				CapturedUtc = bulkCapturedUtc
			};
			GrindMarketPrice staleSevenDayBaseline = olderOutfitSample with
			{
				ItemId = staleLatestOutfit.ItemId,
				Name = staleLatestOutfit.Name,
				TradeCount = 100,
				CapturedUtc = bulkCapturedUtc.AddHours(-204)
			};
			GrindMarketPrice staleThreeDayBaseline = staleSevenDayBaseline with
			{
				TradeCount = 160,
				CapturedUtc = bulkCapturedUtc.AddHours(-108)
			};
			GrindMarketPrice staleOneDayBaseline = staleSevenDayBaseline with
			{
				TradeCount = 188,
				CapturedUtc = bulkCapturedUtc.AddHours(-60)
			};
			GrindMarketPrice staleCurrent = staleSevenDayBaseline with
			{
				TradeCount = 200,
				CapturedUtc = bulkCapturedUtc.AddHours(-36)
			};
			await database.SaveOutfitBulkSamplesAsync(
				[oldBaseline, nearBaseline, staleSevenDayBaseline],
				"eu",
				CancellationToken.None);
			await database.SaveOutfitBulkSamplesAsync(
				[staleThreeDayBaseline],
				"eu",
				CancellationToken.None);
			await database.SaveOutfitBulkSamplesAsync(
				[staleOneDayBaseline],
				"eu",
				CancellationToken.None);
			await database.SaveOutfitBulkSamplesAsync(
				[oldBaselineCurrent, nearBaselineCurrent, staleCurrent],
				"eu",
				CancellationToken.None);
			OutfitReport windowReport = await database.GetOutfitReportAsync("eu", CancellationToken.None);
			OutfitOpportunity oldBaselineResult = windowReport.Opportunities.Single(item => item.ItemId == oldBaselineOutfit.ItemId);
			OutfitOpportunity nearBaselineResult = windowReport.Opportunities.Single(item => item.ItemId == nearBaselineOutfit.ItemId);
			OutfitOpportunity staleLatestResult = windowReport.Opportunities.Single(item => item.ItemId == staleLatestOutfit.ItemId);
			if (oldBaselineResult.Sales24Hours.HasValue
				|| oldBaselineResult.Sales3Days.HasValue
				|| oldBaselineResult.Sales7Days.HasValue)
			{
				return 77;
			}
			if (nearBaselineResult.Sales24Hours != 14)
			{
				return 78;
			}
			if (staleLatestResult.Sales24Hours != 12) return 201;
			if (staleLatestResult.Sales3Days != 40) return 202;
			if (staleLatestResult.Sales7Days != 100) return 203;
			if (staleLatestResult.LastSalesSampleUtc != staleCurrent.CapturedUtc) return 204;
			if (!staleLatestResult.SalesDataStale) return 205;
			if (staleLatestResult.RecommendationEligible) return 206;
			if (nearBaselineResult.SalesDataStale) return 207;
			if (windowReport.StaleSalesOutfitCount != 1) return 208;
			if (!windowReport.LastSalesSampleUtc.HasValue
				|| windowReport.LastSalesSampleUtc.Value < bulkCapturedUtc
				|| windowReport.LastSalesSampleUtc.Value > DateTimeOffset.UtcNow.AddMinutes(1)) return 209;

			MarketItem weakSignalOutfit = new(700_005, 0, "Weak Signal Test Outfit", 4, 2_020_000_000, 0, 0, 55, 1);
			MarketItem preorderOnlySignalOutfit = new(700_006, 0, "Preorder Only Signal Test Outfit", 4, 2_020_000_000, 0, 0, 55, 1);
			MarketItem strongPartialWindowOutfit = new(700_007, 0, "Strong Partial Window Test Outfit", 4, 2_020_000_000, 0, 0, 55, 1);
			await database.SyncOutfitCatalogAsync(
				[weakSignalOutfit, preorderOnlySignalOutfit, strongPartialWindowOutfit],
				"eu",
				CancellationToken.None);
			DateTimeOffset recommendationCapturedUtc = DateTimeOffset.UtcNow.AddMinutes(-2);
			(TimeSpan Age, long Trades)[] weakSignalSeries =
			[
				(TimeSpan.FromDays(7), 1_000),
				(TimeSpan.FromDays(6), 1_000),
				(TimeSpan.FromDays(5), 1_000),
				(TimeSpan.FromDays(4), 1_000),
				(TimeSpan.FromDays(3), 1_000),
				(TimeSpan.FromDays(2), 1_000),
				(TimeSpan.FromDays(1), 1_001),
				(TimeSpan.FromDays(0.5), 1_002),
				(TimeSpan.FromHours(6), 1_002),
				(TimeSpan.FromHours(3), 1_003),
				(TimeSpan.Zero, 1_004)
			];
			foreach ((TimeSpan age, long trades) in weakSignalSeries)
			{
				await database.SaveOutfitBulkSamplesAsync(
					[olderOutfitSample with
					{
						ItemId = weakSignalOutfit.ItemId,
						Name = weakSignalOutfit.Name,
						Price = weakSignalOutfit.CurrentPrice,
						BasePrice = weakSignalOutfit.CurrentPrice,
						TradeCount = trades,
						CapturedUtc = recommendationCapturedUtc.Subtract(age)
					}],
					"eu",
					CancellationToken.None);
			}
			(TimeSpan Age, long Trades)[] preorderOnlySignalSeries =
			[
				(TimeSpan.FromDays(7), 1_000),
				(TimeSpan.FromDays(6), 1_002),
				(TimeSpan.FromDays(5), 1_004),
				(TimeSpan.FromDays(4), 1_006),
				(TimeSpan.FromDays(3), 1_008),
				(TimeSpan.FromDays(2), 1_009),
				(TimeSpan.FromDays(1), 1_011),
				(TimeSpan.FromDays(0.5), 1_011),
				(TimeSpan.FromHours(6), 1_011),
				(TimeSpan.FromHours(3), 1_011),
				(TimeSpan.Zero, 1_011)
			];
			foreach ((TimeSpan age, long trades) in preorderOnlySignalSeries)
			{
				await database.SaveOutfitBulkSamplesAsync(
					[olderOutfitSample with
					{
						ItemId = preorderOnlySignalOutfit.ItemId,
						Name = preorderOnlySignalOutfit.Name,
						Price = preorderOnlySignalOutfit.CurrentPrice,
						BasePrice = preorderOnlySignalOutfit.CurrentPrice,
						TradeCount = trades,
						CapturedUtc = recommendationCapturedUtc.Subtract(age)
					}],
					"eu",
					CancellationToken.None);
			}
			(TimeSpan Age, long Trades)[] strongSignalSeries =
			[
				(TimeSpan.FromDays(4), 1_000),
				(TimeSpan.FromDays(3.75), 1_020),
				(TimeSpan.FromDays(3.5), 1_040),
				(TimeSpan.FromDays(3.25), 1_060),
				(TimeSpan.FromDays(3), 1_080),
				(TimeSpan.FromDays(2.25), 1_150),
				(TimeSpan.FromDays(2), 1_200),
				(TimeSpan.FromDays(1.75), 1_250),
				(TimeSpan.FromDays(1), 1_300),
				(TimeSpan.FromDays(0.5), 1_400),
				(TimeSpan.Zero, 1_500)
			];
			foreach ((TimeSpan age, long trades) in strongSignalSeries)
			{
				await database.SaveOutfitBulkSamplesAsync(
					[olderOutfitSample with
					{
						ItemId = strongPartialWindowOutfit.ItemId,
						Name = strongPartialWindowOutfit.Name,
						Price = strongPartialWindowOutfit.CurrentPrice,
						BasePrice = strongPartialWindowOutfit.CurrentPrice,
						TradeCount = trades,
						CapturedUtc = recommendationCapturedUtc.Subtract(age)
					}],
					"eu",
					CancellationToken.None);
			}
			await database.SaveOutfitDetailAsync(
				weakSignalOutfit,
				weakSignalOutfit with { TradeCount = 1_004 },
				new MarketSnapshot(weakSignalOutfit.CurrentPrice, 0, 1_004, 6, weakSignalOutfit.CurrentPrice, weakSignalOutfit.CurrentPrice, weakSignalOutfit.CurrentPrice, Array.Empty<ProviderHistoryPoint>()),
				"eu",
				CancellationToken.None);
			await database.SaveOutfitDetailAsync(
				preorderOnlySignalOutfit,
				preorderOnlySignalOutfit with { TradeCount = 1_011 },
				new MarketSnapshot(preorderOnlySignalOutfit.CurrentPrice, 0, 1_011, 4, preorderOnlySignalOutfit.CurrentPrice, preorderOnlySignalOutfit.CurrentPrice, preorderOnlySignalOutfit.CurrentPrice, Array.Empty<ProviderHistoryPoint>()),
				"eu",
				CancellationToken.None);
			await database.SaveOutfitDetailAsync(
				strongPartialWindowOutfit,
				strongPartialWindowOutfit with { TradeCount = 1_500 },
				new MarketSnapshot(strongPartialWindowOutfit.CurrentPrice, 0, 1_500, 323, strongPartialWindowOutfit.CurrentPrice, strongPartialWindowOutfit.CurrentPrice, strongPartialWindowOutfit.CurrentPrice, Array.Empty<ProviderHistoryPoint>()),
				"eu",
				CancellationToken.None);
			OutfitReport recommendationReport = await database.GetOutfitReportAsync("eu", CancellationToken.None);
			OutfitOpportunity weakSignalResult = recommendationReport.Opportunities.Single(item => item.ItemId == weakSignalOutfit.ItemId);
			OutfitOpportunity preorderOnlySignalResult = recommendationReport.Opportunities.Single(item => item.ItemId == preorderOnlySignalOutfit.ItemId);
			OutfitOpportunity strongSignalResult = recommendationReport.Opportunities.Single(item => item.ItemId == strongPartialWindowOutfit.ItemId);
			if (weakSignalResult.Sales24Hours != 3
				|| weakSignalResult.Sales3Days != 4
				|| weakSignalResult.Sales7Days != 4
				|| weakSignalResult.SampleCount != 5) return 210;
			if (weakSignalResult.RecommendationEligible) return 211;
			if (preorderOnlySignalResult.Sales24Hours != 0
				|| preorderOnlySignalResult.Sales3Days != 3
				|| preorderOnlySignalResult.Sales7Days != 11
				|| preorderOnlySignalResult.SampleCount != 7) return 212;
			if (preorderOnlySignalResult.RecommendationEligible) return 213;
			if (strongSignalResult.Sales24Hours != 200
				|| strongSignalResult.Sales3Days != 420
				|| strongSignalResult.Sales7Days.HasValue
				|| strongSignalResult.SampleCount != 11) return 214;
			if (strongSignalResult.RecommendationEligible) return 215;
			await database.SaveOutfitBulkSamplesAsync(
				[olderOutfitSample with
				{
					ItemId = strongPartialWindowOutfit.ItemId,
					Name = strongPartialWindowOutfit.Name,
					Price = strongPartialWindowOutfit.CurrentPrice,
					BasePrice = strongPartialWindowOutfit.CurrentPrice,
					TradeCount = 1_450,
					CapturedUtc = recommendationCapturedUtc.Subtract(TimeSpan.FromDays(0.25))
				}],
				"eu",
				CancellationToken.None);
			strongSignalResult = (await database.GetOutfitReportAsync("eu", CancellationToken.None))
				.Opportunities.Single(item => item.ItemId == strongPartialWindowOutfit.ItemId);
			if (strongSignalResult.Sales24Hours != 200
				|| strongSignalResult.Sales3Days != 420
				|| strongSignalResult.Sales7Days.HasValue
				|| strongSignalResult.SampleCount != 12
				|| !strongSignalResult.RecommendationEligible) return 221;
			if (strongSignalResult.Score <= weakSignalResult.Score
				|| strongSignalResult.Score <= preorderOnlySignalResult.Score) return 216;
			double strongVolumeReliability = Math.Min(
				1.0,
				Math.Sqrt((double)Math.Round(strongSignalResult.SalesPerDay.GetValueOrDefault() * 7.0) / 30.0));
			double expectedStrongScore =
				(strongSignalResult.ConfidencePercent / 100.0)
				* strongVolumeReliability
				/ strongSignalResult.EstimatedQueueDays.GetValueOrDefault();
			if (Math.Abs(strongSignalResult.Score - expectedStrongScore) > 0.000000001) return 220;
			await using (SqliteConnection staleDetailConnection = new($"Data Source={testDatabasePath}"))
			{
				await staleDetailConnection.OpenAsync();
				await using SqliteCommand ageDetail = staleDetailConnection.CreateCommand();
				ageDetail.CommandText = "UPDATE outfit_catalog SET last_detailed_utc=$stale WHERE item_id=$id AND region='eu';";
				ageDetail.Parameters.AddWithValue("$stale", DateTimeOffset.UtcNow.AddDays(-8).ToString("O"));
				ageDetail.Parameters.AddWithValue("$id", strongPartialWindowOutfit.ItemId);
				if (await ageDetail.ExecuteNonQueryAsync() != 1) return 217;
			}
			OutfitOpportunity staleDetailSignalResult = (await database.GetOutfitReportAsync("eu", CancellationToken.None))
				.Opportunities.Single(item => item.ItemId == strongPartialWindowOutfit.ItemId);
			if (staleDetailSignalResult.RecommendationEligible) return 218;
			if (staleDetailSignalResult.Sales24Hours != 200
				|| staleDetailSignalResult.Sales3Days != 420) return 219;

			MarketItem sparseEvidenceOutfit = new(700_008, 0, "Sparse Evidence Test Outfit", 4, 2_020_000_000, 0, 0, 55, 1);
			MarketItem denseEvidenceOutfit = new(700_009, 0, "Dense Evidence Test Outfit", 4, 2_020_000_000, 0, 0, 55, 1);
			MarketItem zeroSalesOutfit = new(700_010, 0, "Zero Sales Test Outfit", 4, 2_020_000_000, 0, 0, 55, 1);
			await database.SyncOutfitCatalogAsync(
				[sparseEvidenceOutfit, denseEvidenceOutfit, zeroSalesOutfit],
				"eu",
				CancellationToken.None);
			DateTimeOffset evidenceLatestUtc = DateTimeOffset.UtcNow.AddMinutes(-2);
			(TimeSpan Age, long Trades)[] sparseEvidenceSeries =
			[
				(TimeSpan.FromDays(7), 1_000),
				(TimeSpan.FromDays(3), 1_040),
				(TimeSpan.FromDays(1), 1_050),
				(TimeSpan.FromHours(6), 1_060),
				(TimeSpan.Zero, 1_060)
			];
			(TimeSpan Age, long Trades)[] denseEvidenceSeries =
			[
				(TimeSpan.FromDays(7), 1_000),
				(TimeSpan.FromDays(6), 1_000),
				(TimeSpan.FromDays(5), 1_000),
				(TimeSpan.FromDays(3), 1_040),
				(TimeSpan.FromDays(2), 1_040),
				(TimeSpan.FromDays(1), 1_050),
				(TimeSpan.FromHours(18), 1_050),
				(TimeSpan.FromHours(12), 1_050),
				(TimeSpan.FromHours(6), 1_060),
				(TimeSpan.FromHours(3), 1_060),
				(TimeSpan.Zero, 1_060)
			];
			foreach ((TimeSpan age, long trades) in sparseEvidenceSeries)
			{
				await database.SaveOutfitBulkSamplesAsync(
					[olderOutfitSample with
					{
						ItemId = sparseEvidenceOutfit.ItemId,
						Name = sparseEvidenceOutfit.Name,
						Price = sparseEvidenceOutfit.CurrentPrice,
						BasePrice = sparseEvidenceOutfit.CurrentPrice,
						TradeCount = trades,
						CapturedUtc = evidenceLatestUtc.Subtract(age)
					}],
					"eu",
					CancellationToken.None);
			}
			foreach ((TimeSpan age, long trades) in denseEvidenceSeries)
			{
				await database.SaveOutfitBulkSamplesAsync(
					[olderOutfitSample with
					{
						ItemId = denseEvidenceOutfit.ItemId,
						Name = denseEvidenceOutfit.Name,
						Price = denseEvidenceOutfit.CurrentPrice,
						BasePrice = denseEvidenceOutfit.CurrentPrice,
						TradeCount = trades,
						CapturedUtc = evidenceLatestUtc.Subtract(age)
					}],
					"eu",
					CancellationToken.None);
			}
			TimeSpan[] zeroSalesAges = Enumerable.Range(0, 15)
				.Select(index => TimeSpan.FromHours((14 - index) * 12.0))
				.ToArray();
			foreach (TimeSpan age in zeroSalesAges)
			{
				await database.SaveOutfitBulkSamplesAsync(
					[olderOutfitSample with
					{
						ItemId = zeroSalesOutfit.ItemId,
						Name = zeroSalesOutfit.Name,
						Price = zeroSalesOutfit.CurrentPrice,
						BasePrice = zeroSalesOutfit.CurrentPrice,
						TradeCount = 500,
						CapturedUtc = evidenceLatestUtc.Subtract(age)
					}],
					"eu",
					CancellationToken.None);
			}
			DateTimeOffset sharedDetailUtc = evidenceLatestUtc.AddMinutes(-1);
			await using (SqliteConnection evidenceConnection = new($"Data Source={testDatabasePath}"))
			{
				await evidenceConnection.OpenAsync();
				await using SqliteCommand markDetailed = evidenceConnection.CreateCommand();
				markDetailed.CommandText = @"
UPDATE outfit_catalog
SET last_detailed_utc=$detailed
WHERE region='eu' AND item_id IN ($sparse,$dense,$zero);";
				markDetailed.Parameters.AddWithValue("$detailed", sharedDetailUtc.ToString("O"));
				markDetailed.Parameters.AddWithValue("$sparse", sparseEvidenceOutfit.ItemId);
				markDetailed.Parameters.AddWithValue("$dense", denseEvidenceOutfit.ItemId);
				markDetailed.Parameters.AddWithValue("$zero", zeroSalesOutfit.ItemId);
				if (await markDetailed.ExecuteNonQueryAsync() != 3) return 222;

				await using SqliteCommand countDenseAnchors = evidenceConnection.CreateCommand();
				countDenseAnchors.CommandText = "SELECT COUNT(*) FROM outfit_snapshots WHERE region='eu' AND item_id=$id AND source='bulk-sales';";
				countDenseAnchors.Parameters.AddWithValue("$id", denseEvidenceOutfit.ItemId);
				if (Convert.ToInt32(await countDenseAnchors.ExecuteScalarAsync()) != denseEvidenceSeries.Length) return 223;
				countDenseAnchors.Parameters["$id"].Value = zeroSalesOutfit.ItemId;
				if (Convert.ToInt32(await countDenseAnchors.ExecuteScalarAsync()) != zeroSalesAges.Length) return 229;
			}
			OutfitReport evidenceReport = await database.GetOutfitReportAsync("eu", CancellationToken.None);
			OutfitOpportunity sparseEvidenceResult = evidenceReport.Opportunities.Single(item => item.ItemId == sparseEvidenceOutfit.ItemId);
			OutfitOpportunity denseEvidenceResult = evidenceReport.Opportunities.Single(item => item.ItemId == denseEvidenceOutfit.ItemId);
			OutfitOpportunity zeroSalesResult = evidenceReport.Opportunities.Single(item => item.ItemId == zeroSalesOutfit.ItemId);
			if (sparseEvidenceResult.SampleCount != 4
				|| denseEvidenceResult.SampleCount != sparseEvidenceResult.SampleCount) return 224;
			if (sparseEvidenceResult.Sales24Hours != 10
				|| sparseEvidenceResult.Sales3Days != 20
				|| sparseEvidenceResult.Sales7Days != 60
				|| denseEvidenceResult.Sales24Hours != sparseEvidenceResult.Sales24Hours
				|| denseEvidenceResult.Sales3Days != sparseEvidenceResult.Sales3Days
				|| denseEvidenceResult.Sales7Days != sparseEvidenceResult.Sales7Days) return 225;
			if (!sparseEvidenceResult.SalesPerDay.HasValue
				|| !denseEvidenceResult.SalesPerDay.HasValue
				|| Math.Abs(sparseEvidenceResult.SalesPerDay.Value - denseEvidenceResult.SalesPerDay.Value) > 0.000000001) return 226;
			if (Math.Abs(sparseEvidenceResult.ConfidencePercent - denseEvidenceResult.ConfidencePercent) > 0.000000001) return 227;
			if (zeroSalesResult.SampleCount != 1
				|| zeroSalesResult.Sales24Hours != 0
				|| zeroSalesResult.Sales3Days != 0
				|| zeroSalesResult.Sales7Days != 0
				|| zeroSalesResult.SalesPerDay != 0.0
				|| zeroSalesResult.ConfidencePercent != 0.0
				|| zeroSalesResult.LifetimeSales != 500
				|| zeroSalesResult.LastSalesSampleUtc != evidenceLatestUtc
				|| zeroSalesResult.SalesDataStale
				|| zeroSalesResult.RecommendationEligible) return 228;

			MarketItem[] coverageCatalog = Enumerable.Range(0, 100)
				.Select(index => new MarketItem(
					710_000 + index,
					0,
					$"Coverage Test Outfit {index}",
					4,
					1_000_000_000 + index,
					0,
					0,
					55,
					1))
				.ToArray();
			await database.SyncOutfitCatalogAsync(
				coverageCatalog,
				"eu",
				CancellationToken.None,
				removeMissing: true);
			DateTimeOffset coverageCapturedUtc = DateTimeOffset.UtcNow;
			GrindMarketPrice[] coverageSamples = coverageCatalog
				.Take(94)
				.Select(item => currentOutfitSample with
				{
					ItemId = item.ItemId,
					Name = item.Name,
					Price = item.CurrentPrice,
					BasePrice = item.CurrentPrice,
					TradeCount = 1_000 + item.ItemId,
					CapturedUtc = coverageCapturedUtc
				})
				.ToArray();
			await database.SaveOutfitBulkSamplesAsync(coverageSamples, "eu", CancellationToken.None);
			IReadOnlyList<MarketItem> sixPending = await database.GetOutfitCatalogDueForBulkAsync(
				"eu",
				TimeSpan.FromHours(6),
				CancellationToken.None);
			if (!await database.IsOutfitBulkRefreshDueAsync("eu", TimeSpan.FromHours(6), CancellationToken.None)
				|| sixPending.Count != 6)
			{
				return 86;
			}
			await database.SaveOutfitBulkSamplesAsync(
				[
					currentOutfitSample with
					{
						ItemId = coverageCatalog[94].ItemId,
						Name = coverageCatalog[94].Name,
						Price = coverageCatalog[94].CurrentPrice,
						BasePrice = coverageCatalog[94].CurrentPrice,
						TradeCount = 1_000 + coverageCatalog[94].ItemId,
						CapturedUtc = coverageCapturedUtc
					}
				],
				"eu",
				CancellationToken.None);
			IReadOnlyList<MarketItem> fivePending = await database.GetOutfitCatalogDueForBulkAsync(
				"eu",
				TimeSpan.FromHours(6),
				CancellationToken.None);
			if (!await database.IsOutfitBulkRefreshDueAsync("eu", TimeSpan.FromHours(6), CancellationToken.None)
				|| fivePending.Count != 5)
			{
				return 86;
			}
			await database.SaveOutfitBulkSamplesAsync(
				coverageCatalog.Skip(95)
					.Select(item => currentOutfitSample with
					{
						ItemId = item.ItemId,
						Name = item.Name,
						Price = item.CurrentPrice,
						BasePrice = item.CurrentPrice,
						TradeCount = 1_000 + item.ItemId,
						CapturedUtc = coverageCapturedUtc
					})
					.ToArray(),
				"eu",
				CancellationToken.None);
			if (await database.IsOutfitBulkRefreshDueAsync("eu", TimeSpan.FromHours(6), CancellationToken.None)
				|| (await database.GetOutfitCatalogDueForBulkAsync(
					"eu",
					TimeSpan.FromHours(6),
					CancellationToken.None)).Count != 0)
			{
				return 89;
			}
			DateTimeOffset secondHourlyCheckUtc = coverageCapturedUtc.AddHours(2);
			if (await database.IsOutfitBulkRefreshDueAsync(
					"eu",
					MarketAnalyticsService.DefaultCollectorInterval,
					secondHourlyCheckUtc,
					CancellationToken.None)
				|| (await database.GetOutfitCatalogDueForBulkAsync(
					"eu",
					MarketAnalyticsService.DefaultCollectorInterval,
					secondHourlyCheckUtc,
					CancellationToken.None)).Count != 0)
			{
				return 230;
			}
			DateTimeOffset justBeforeThirdHourlyCheckUtc = coverageCapturedUtc
				.AddHours(2)
				.AddMinutes(54);
			if (await database.IsOutfitBulkRefreshDueAsync(
					"eu",
					MarketAnalyticsService.DefaultCollectorInterval,
					justBeforeThirdHourlyCheckUtc,
					CancellationToken.None)
				|| (await database.GetOutfitCatalogDueForBulkAsync(
					"eu",
					MarketAnalyticsService.DefaultCollectorInterval,
					justBeforeThirdHourlyCheckUtc,
					CancellationToken.None)).Count != 0)
			{
				return 232;
			}
			DateTimeOffset thirdHourlyCheckUtc = coverageCapturedUtc.AddHours(3);
			if (!await database.IsOutfitBulkRefreshDueAsync(
					"eu",
					MarketAnalyticsService.DefaultCollectorInterval,
					thirdHourlyCheckUtc,
					CancellationToken.None)
				|| (await database.GetOutfitCatalogDueForBulkAsync(
					"eu",
					MarketAnalyticsService.DefaultCollectorInterval,
					thirdHourlyCheckUtc,
					CancellationToken.None)).Count != coverageCatalog.Length)
			{
				return 231;
			}

			using (AnalyticsMarketStubHandler marketHandler = new(invalidItemId: 103))
			using (GrindMarketPriceProvider marketProvider = new(logger, marketHandler))
			{
				long[] testIds = [101, 102, 103, 104, 105];
				GrindMarketPriceResponse recovered = await marketProvider.GetAnalyticsPricesAsync(
					testIds,
					"eu",
					CancellationToken.None);
				if (recovered.Prices.Count != 4
					|| !recovered.Missing.SequenceEqual([103L])
					|| marketHandler.RequestCount > 8)
				{
					return 80;
				}

				int requestsBeforeInteractive = marketHandler.RequestCount;
				GrindMarketPriceResponse interactive = await marketProvider.GetPricesAsync(
					testIds,
					"eu",
					CancellationToken.None);
				if (interactive.Prices.Count != 0
					|| marketHandler.RequestCount - requestsBeforeInteractive > 2)
				{
					return 81;
				}
			}

			using (AnalyticsMarketStubHandler multiPoisonHandler = new([103, 111]))
			using (GrindMarketPriceProvider multiPoisonProvider = new(logger, multiPoisonHandler))
			{
				long[] multiPoisonIds = Enumerable.Range(101, 16).Select(value => (long)value).ToArray();
				GrindMarketPriceResponse recovered = await multiPoisonProvider.GetAnalyticsPricesAsync(
					multiPoisonIds,
					"eu",
					CancellationToken.None);
				if (recovered.Prices.Count != 14
					|| !recovered.Missing.SequenceEqual([103L, 111L])
					|| multiPoisonHandler.RequestCount > 40)
				{
					return 87;
				}
			}

			using (OutfitCategoryMarketStubHandler outfitCategoryHandler = new())
			using (GrindMarketPriceProvider outfitCategoryProvider = new(logger, outfitCategoryHandler))
			{
				long[] outfitIds = [201, 202, 1001, 1002];
				GrindMarketPriceResponse categoryResponse = await outfitCategoryProvider.GetOutfitAnalyticsPricesAsync(
					outfitIds,
					"eu",
					CancellationToken.None);
				if (categoryResponse.Prices.Count != outfitIds.Length
					|| categoryResponse.Missing.Count != 0
					|| categoryResponse.Prices.Any(price => !price.TradeCount.HasValue)
					|| outfitCategoryHandler.RequestCount != 2)
				{
					return 180;
				}
			}

			using (OutfitCategoryMarketStubHandler truncatedOutfitCategoryHandler = new(truncateFirstCategory: true))
			using (GrindMarketPriceProvider truncatedOutfitCategoryProvider = new(logger, truncatedOutfitCategoryHandler))
			{
				long[] outfitIds = [201, 202, 1001, 1002];
				GrindMarketPriceResponse truncatedResponse = await truncatedOutfitCategoryProvider.GetOutfitAnalyticsPricesAsync(
					outfitIds,
					"eu",
					CancellationToken.None);
				if (truncatedResponse.Prices.Count != 0
					|| !truncatedResponse.Missing.SequenceEqual(outfitIds))
				{
					return 181;
				}
			}

			using (OutfitCategoryMarketStubHandler duplicatedOutfitCategoryHandler = new(wrongSecondCategory: true))
			using (GrindMarketPriceProvider duplicatedOutfitCategoryProvider = new(logger, duplicatedOutfitCategoryHandler))
			{
				long[] outfitIds = [201, 202, 1001, 1002];
				GrindMarketPriceResponse duplicatedResponse = await duplicatedOutfitCategoryProvider.GetOutfitAnalyticsPricesAsync(
					outfitIds,
					"eu",
					CancellationToken.None);
				if (duplicatedResponse.Prices.Count != 0
					|| !duplicatedResponse.Missing.SequenceEqual(outfitIds))
				{
					return 182;
				}
			}

			int bdoAlertsMarketResult = await RunBdoAlertsMarketOfflineSmokeTestAsync(testStateRoot);
			if (bdoAlertsMarketResult != 0)
			{
				return bdoAlertsMarketResult;
			}

			int playerGuildResult = await BdoPlayerGuildOfflineTests.RunAsync(
				testStateRoot,
				logger);
			if (playerGuildResult != 0)
			{
				return playerGuildResult;
			}

			int dehkiaFuelResult = await DehkiaFuelOfflineTests.RunAsync(
				testStateRoot,
				logger);
			if (dehkiaFuelResult != 0)
			{
				return dehkiaFuelResult;
			}

			AppPaths statePaths = AppPaths.CreateAt(testStateRoot);
			statePaths.EnsureDirectories();
			const string couponFeedJson = """
				{
				  "coupons": [
				    { "code": "TYALLADVENTURERS", "is_expired": false },
				    { "code": " tyal-ladv-entu-rers ", "is_expired": false },
				    { "code": "BLACKDESERT2026", "is_expired": false },
				    { "code": "PEARLABYSSGIFT", "is_expired": false },
				    { "code": "WINDOWSREWARD26", "is_expired": false },
				    { "code": "JAVASCRIPT2026", "is_expired": false },
				    { "code": " community-gift-26 ", "is_expired": false },
				    { "code": "ANNOUNCEMENT", "is_expired": true },
				    { "code": "UPDATEHISTORY26", "is_expired": false },
				    { "code": "DOWNLOADGAME26", "is_expired": false },
				    { "code": "1234567890123456", "is_expired": false },
				    { "code": "ADVENTURER", "is_expired": false },
				    { "code": "EUONLY", "region": "EU", "platform": "PC", "is_expired": false },
				    { "code": "GLOBALPC", "regions": ["global"], "platform": "PC", "is_expired": false },
				    { "code": "MIXEDREGION", "regions": ["KR", "NA"], "platform": "Both", "is_expired": false },
				    { "code": "LEGACYPC", "description": "PC", "is_expired": false },
				    { "code": "KRONLY", "region": "KR", "platform": "PC", "is_expired": false },
				    { "code": "CONSOLENA", "region": "NA", "platform": "Console", "is_expired": false },
				    { "code": "UNKNOWNREGION", "region": "Moon", "platform": "PC", "is_expired": false },
				    { "code": "DESCRIPTIONCONSOLE", "region": "EU", "description": "Console", "is_expired": false },
				    { "code": "DESCRIPTIONCONSOLEPHRASE", "region": "NA", "description": "Console only", "is_expired": false }
				  ]
				}
				""";
			string[] expectedCouponCodes =
			[
				"TYALLADVENTURERS",
				"BLACKDESERT2026",
				"PEARLABYSSGIFT",
				"WINDOWSREWARD26",
				"JAVASCRIPT2026",
				"COMMUNITY-GIFT-26",
				"ANNOUNCEMENT",
				"UPDATEHISTORY26",
				"DOWNLOADGAME26",
				"1234567890123456",
				"ADVENTURER",
				"EUONLY",
				"GLOBALPC",
				"MIXEDREGION",
				"LEGACYPC"
			];
			string[] expectedCanonicalCouponCodes = expectedCouponCodes
				.Select(CouponService.CanonicalCouponCode)
				.ToArray();
			List<CouponEntry> parsedCoupons = CouponService.ParseBdoAlertsResponse(couponFeedJson);
			if (parsedCoupons.Count != expectedCouponCodes.Length
				|| !parsedCoupons
					.Select(coupon => CouponService.CanonicalCouponCode(coupon.Code))
					.SequenceEqual(expectedCanonicalCouponCodes)
				|| parsedCoupons
					.Select(coupon => CouponService.CanonicalCouponCode(coupon.Code))
					.Distinct(StringComparer.OrdinalIgnoreCase)
					.Count() != parsedCoupons.Count)
			{
				return 95;
			}
			HashSet<string> validatedNaEuCouponKeys =
			[
				CouponService.CanonicalCouponCode("TYALLADVENTURERS"),
				CouponService.CanonicalCouponCode("BLACKDESERT2026")
			];
			HashSet<string> expectedStrictNaEuCodes = new(
				[
					"TYALLADVENTURERS",
					"BLACKDESERT2026",
					"EUONLY",
					"GLOBALPC",
					"MIXEDREGION"
				],
				StringComparer.OrdinalIgnoreCase);
			HashSet<string> strictNaEuCodes = CouponService
				.ParseBdoAlertsResponse(
					couponFeedJson,
					validatedNaEuCouponKeys)
				.Select(coupon =>
					CouponService.CanonicalCouponCode(coupon.Code))
				.ToHashSet(StringComparer.OrdinalIgnoreCase);
			if (!strictNaEuCodes.SetEquals(expectedStrictNaEuCodes))
			{
				return 94;
			}

			const string structuredCouponFeedJson = """
				{
				  "coupons": [
				    {
				      "code": "TYALLADVENTURERS",
				      "region": "NAEU",
				      "platform": "PC",
				      "is_expired": false,
				      "rewards_structured": {
				        "items": [
				          { "name": "Choose Your Transcendent Hammer Box", "quantity": 4 },
				          { "name": "Cron Stone", "quantity": 20000 },
				          { "name": "Advice of Valks (+400)", "quantity": 1 }
				        ]
				      }
				    }
				  ]
				}
				""";
			List<CouponReward> structuredRewards = CouponService
				.ParseBdoAlertsResponse(
					structuredCouponFeedJson,
					validatedNaEuCouponKeys)
				.Single()
				.Rewards;
			if (structuredRewards.Count != 3
				|| structuredRewards[0].ItemName !=
					"Choose Your Transcendent Hammer Box"
				|| structuredRewards[0].Quantity != 4
				|| structuredRewards[1].ItemName != "Cron Stone"
				|| structuredRewards[1].Quantity != 20000
				|| structuredRewards[2].ItemName != "Advice of Valks (+400)")
			{
				return 98;
			}

			string codexAutocompleteFixture = "\uFEFF" + """
				[
				  {
				    "value": 830399,
				    "name": "Rare Enhancement Help Kit V",
				    "link_type": "item",
				    "icon": "new_icon/03_etc/00830399.webp",
				    "icon_path": "items",
				    "object_type": "Item"
				  },
				  {
				    "value": 830301,
				    "name": "[Event] Enhancement Help Kit V",
				    "link_type": "item",
				    "icon": "new_icon/03_etc/00830301.webp",
				    "icon_path": "items",
				    "object_type": "Item"
				  }
				]
				""";
			BdoCodexItemIconMatch? exactCodexMatch =
				BdoCodexItemIconResolver.ParseExactMatchForTest(
					"  Enhancement   Help Kit V ",
					codexAutocompleteFixture);
			BdoCodexItemIconMatch? fuzzyCodexMatch =
				BdoCodexItemIconResolver.ParseExactMatchForTest(
					"Enhancement Help Kit V x5",
					codexAutocompleteFixture);
			const string maliciousCodexFixture = """
				[
				  {
				    "value": 830301,
				    "name": "[Event] Enhancement Help Kit V",
				    "link_type": "item",
				    "icon": "../private/00830301.webp",
				    "icon_path": "items",
				    "object_type": "Item"
				  }
				]
				""";
			if (exactCodexMatch?.ItemId != 830301
				|| exactCodexMatch.IconUrl !=
					"https://bdocodex.com/items/new_icon/03_etc/00830301.webp"
				|| exactCodexMatch.IconFileName !=
					"bdocodex-830301.webp"
				|| fuzzyCodexMatch is not null
				|| BdoCodexItemIconResolver.ParseExactMatchForTest(
					"Enhancement Help Kit V",
					maliciousCodexFixture) is not null
				|| BdoCodexItemIconResolver.NormalizeItemNameForTest(
					"[Event]  Enhancement Help Kit V")
					!= "ENHANCEMENT HELP KIT V")
			{
				return 99;
			}
			if (!CouponService.HasExpectedImageSignatureForTest(
					Encoding.ASCII.GetBytes("RIFF0000WEBP"),
					".webp")
				|| CouponService.HasExpectedImageSignatureForTest(
					Encoding.ASCII.GetBytes("<html>not an image</html>"),
					".webp")
				|| !CouponService.HasExpectedImageSignatureForTest(
					[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
					".png")
				|| !CouponService.HasExpectedImageSignatureForTest(
					[0xFF, 0xD8, 0xFF, 0xE0],
					".jpg"))
			{
				return 100;
			}

			JsonSerializerOptions couponJsonOptions = new()
			{
				PropertyNamingPolicy = JsonNamingPolicy.CamelCase
			};
			CouponEntry trustedLegacyCoupon = parsedCoupons.Single(coupon =>
				CouponService.CanonicalCouponCode(coupon.Code)
					== "TYALLADVENTURERS");
			CouponEntry foreignLegacyCoupon = trustedLegacyCoupon with
			{
				Code = "KR-ONLY-LEGACY"
			};
			CouponCache legacyCache = new(
				DateTimeOffset.UtcNow,
				"Legacy cache regression",
				[trustedLegacyCoupon, foreignLegacyCoupon],
				null);
			await File.WriteAllTextAsync(
				statePaths.CouponsCachePath,
				JsonSerializer.Serialize(legacyCache, couponJsonOptions),
				CancellationToken.None);
			await File.WriteAllTextAsync(
				statePaths.CouponItemIconsPath,
				"""{"schemaVersion":1,"items":null}""",
				CancellationToken.None);
			using (CouponService legacyCouponService = new(statePaths, logger))
			{
				JsonElement migratedDashboard = JsonSerializer.SerializeToElement(
					await legacyCouponService.InitializeAsync(CancellationToken.None),
					couponJsonOptions);
				string[] migratedCodes = migratedDashboard
					.GetProperty("coupons")
					.EnumerateArray()
					.Select(coupon => CouponService.CanonicalCouponCode(
						coupon.GetProperty("code").GetString() ?? ""))
					.ToArray();
				using JsonDocument migratedCache = JsonDocument.Parse(
					await File.ReadAllTextAsync(
						statePaths.CouponsCachePath,
						CancellationToken.None));
				using JsonDocument repairedIconCache = JsonDocument.Parse(
					await File.ReadAllTextAsync(
						statePaths.CouponItemIconsPath,
						CancellationToken.None));
				string[] migratedVerifiedCodes = migratedCache.RootElement
					.GetProperty("naEuCouponCodes")
					.EnumerateArray()
					.Select(code => CouponService.CanonicalCouponCode(
						code.GetString() ?? ""))
					.ToArray();
				if (!migratedCodes.SequenceEqual(
						["TYALLADVENTURERS"],
						StringComparer.OrdinalIgnoreCase)
					|| !migratedVerifiedCodes.SequenceEqual(
						["TYALLADVENTURERS"],
						StringComparer.OrdinalIgnoreCase)
					|| repairedIconCache.RootElement
						.GetProperty("items")
						.ValueKind != JsonValueKind.Object)
				{
					return 97;
				}
			}

			CouponCache passThroughCache = new(
				DateTimeOffset.UtcNow,
				"Structured feed regression",
				parsedCoupons,
				null,
				expectedCanonicalCouponCodes.ToList());
			await File.WriteAllTextAsync(
				statePaths.CouponsCachePath,
				JsonSerializer.Serialize(passThroughCache, couponJsonOptions),
				CancellationToken.None);
			using (CouponService couponService = new(statePaths, logger))
			{
				JsonElement couponDashboard = JsonSerializer.SerializeToElement(
					await couponService.InitializeAsync(CancellationToken.None),
					couponJsonOptions);
				string[] dashboardCodes = couponDashboard
					.GetProperty("coupons")
					.EnumerateArray()
					.Select(coupon => CouponService.CanonicalCouponCode(
						coupon.GetProperty("code").GetString() ?? ""))
					.ToArray();
				if (!dashboardCodes.SequenceEqual(expectedCanonicalCouponCodes, StringComparer.OrdinalIgnoreCase)
					|| couponDashboard.GetProperty("totalCount").GetInt32() != expectedCouponCodes.Length
					|| couponDashboard.GetProperty("availableCount").GetInt32() != expectedCouponCodes.Length - 1
					|| couponDashboard.GetProperty("expiredCount").GetInt32() != 1
					|| couponDashboard.GetProperty("regionScope").GetString() != "NA / EU")
				{
					return 64;
				}
			}

			const string officialCouponSample = """
				<main>
				  <div>DOWNLOADGAME26 9999999999999999</div>
				  <div class="tpl_glance glance_coupon_code js-couponCopyWrap">
				    <span class="js-couponNumber">TYAL-LADV-ENTU-RERS</span>
				    <button><span class="js-couponNumber">Copy</span></button>
				  </div>
				  <div class="glance_coupon_code js-couponCopyWrap">
				    <span class="extra js-couponNumber featured">BLAC-KDES-ERT2-026</span>
				  </div>
				  <div class="glance_coupon_code js-couponCopyWrap">
				    <span class="js-couponNumber">COMM-UNIT-YGIF-T202-6</span>
				  </div>
				  <div class="glance_coupon_code js-couponCopyWrap">
				    <span class="js-couponNumber">ANNO-UNCE-MENT</span>
				  </div>
				  <div class="glance_coupon_code js-couponCopyWrap">
				    <span class="js-couponNumber">1234-5678-9012-3456</span>
				  </div>
				</main>
				""";
			HashSet<string> officialCouponCodes = CouponService.ParseOfficialCouponPage(officialCouponSample)
				.Select(coupon => coupon.Code)
				.ToHashSet(StringComparer.OrdinalIgnoreCase);
			string[] expectedOfficialCouponCodes =
			[
				"TYALLADVENTURERS",
				"BLACKDESERT2026",
				"COMMUNITYGIFT2026",
				"ANNOUNCEMENT",
				"1234567890123456"
			];
			if (officialCouponCodes.Count != expectedOfficialCouponCodes.Length
				|| !officialCouponCodes.SetEquals(expectedOfficialCouponCodes))
			{
				return 65;
			}
			List<CouponEntry> mergedDuplicateCoupon = CouponService.MergeCouponSources(
				CouponService.ParseOfficialCouponPage(officialCouponSample)
					.Where(coupon =>
						CouponService.CanonicalCouponCode(coupon.Code)
							== "TYALLADVENTURERS"),
				parsedCoupons.Where(coupon =>
					CouponService.CanonicalCouponCode(coupon.Code)
						== "TYALLADVENTURERS"));
			if (mergedDuplicateCoupon.Count != 1
				|| CouponService.CanonicalCouponCode(
					mergedDuplicateCoupon[0].Code) != "TYALLADVENTURERS"
				|| mergedDuplicateCoupon[0].Source
					!= "Official BDO + BDO Alerts"
				|| mergedDuplicateCoupon[0].Rewards.Count != 1
				|| mergedDuplicateCoupon[0].Rewards[0].ItemName
					!= "Reward details available on BDO Alerts")
			{
				return 96;
			}

			const string bossScheduleFixture = """
				{
				  "Monday": [
				    { "time": "18:30", "bosses": ["Winged Mermaid"] },
				    { "time": "19:30", "bosses": ["Baby Vell", "Baby Vell"] },
				    { "time": "19:30", "bosses": ["Future Event Boss"] }
				  ],
				  "Tuesday": [
				    { "time": "00:15", "bosses": ["Karanda"] },
				    { "time": "02:00", "bosses": [] },
				    { "time": "22:30", "bosses": ["Baby Vell"] }
				  ],
				  "Wednesday": [
				    { "time": "02:00", "bosses": ["Kutum"] },
				    { "time": "23:30", "bosses": ["Future Event Boss"] }
				  ],
				  "Thursday": [
				    { "time": "12:00", "bosses": ["Nouver"] },
				    { "time": "19:00", "bosses": ["Kzarka"] }
				  ],
				  "Friday": [
				    { "time": "14:00", "bosses": ["Garmoth"] },
				    { "time": "22:15", "bosses": ["Offin"] }
				  ],
				  "Saturday": [
				    { "time": "16:00", "bosses": ["Black Shadow"] },
				    { "time": "23:15", "bosses": ["Garmoth"] }
				  ],
				  "Sunday": [
				    { "time": "19:15", "bosses": ["Garmoth"] },
				    { "time": "23:30", "bosses": ["Baby Vell"] }
				  ]
				}
				""";
			DateTimeOffset bossScheduleFetchedAt = new(2026, 7, 29, 10, 0, 0, TimeSpan.Zero);
			BossScheduleSnapshot bossSchedule = BossScheduleService.ParseAndNormalizeForTest(
				bossScheduleFixture,
				bossScheduleFetchedAt);
			BossScheduleSlot mondayEvent = bossSchedule.Schedule["Monday"]
				.Single(slot => slot.Time == "19:30");
			if (bossSchedule.Schedule.Count != 7
				|| bossSchedule.Schedule["Monday"].Count != 2
				|| !mondayEvent.Bosses.SequenceEqual(["Baby Vell", "Future Event Boss"])
				|| bossSchedule.Schedule["Tuesday"].Single(slot => slot.Time == "02:00").Bosses.Count != 0
				|| !bossSchedule.Schedule["Tuesday"].Any(slot => slot.Time == "22:30")
				|| !bossSchedule.Schedule["Wednesday"].Any(slot => slot.Time == "23:30"))
			{
				return 82;
			}
			string fakeBdoAlertsApiKey = "bdo_" + new string('A', 26);
			string fakeUntrustedBdoAlertsApiKey = "bdo_" + new string('L', 32);

			using (HttpRequestMessage unconfiguredScheduleRequest =
				BossScheduleService.CreateRequestForTest(
					new Uri(BossScheduleService.DefaultSourceUrl),
					apiKey: null))
			{
				if (unconfiguredScheduleRequest.Headers.Contains("X-API-Key")
					|| unconfiguredScheduleRequest.Headers.Referrer is not null
					|| unconfiguredScheduleRequest.Headers.Contains("Origin"))
				{
					return 88;
				}
			}

			using (HttpRequestMessage apiKeyScheduleRequest =
				BossScheduleService.CreateRequestForTest(
					new Uri(BossScheduleService.DefaultSourceUrl),
					apiKey: fakeBdoAlertsApiKey))
			{
				if (!apiKeyScheduleRequest.Headers.TryGetValues("X-API-Key", out IEnumerable<string>? apiKeys)
					|| !apiKeys.SequenceEqual([fakeBdoAlertsApiKey])
					|| apiKeyScheduleRequest.Headers.Referrer is not null
					|| apiKeyScheduleRequest.Headers.Contains("Origin"))
				{
					return 89;
				}
			}

			using (HttpRequestMessage untrustedScheduleRequest =
				BossScheduleService.CreateRequestForTest(
					new Uri("https://example.com/schedule"),
					apiKey: fakeUntrustedBdoAlertsApiKey))
			{
				if (untrustedScheduleRequest.Headers.Contains("X-API-Key")
					|| untrustedScheduleRequest.Headers.Referrer is not null
					|| untrustedScheduleRequest.Headers.Contains("Origin"))
				{
					return 92;
				}
			}

			using (HttpRequestMessage apiKeyCouponRequest =
				new(HttpMethod.Get, "https://api.bdoalerts.net/api/coupons"))
			{
				if (!BdoAlertsApiCredentials.TryApply(
						apiKeyCouponRequest,
						apiKeyCouponRequest.RequestUri!,
						fakeBdoAlertsApiKey)
					|| !apiKeyCouponRequest.Headers.TryGetValues(
						"X-API-Key",
						out IEnumerable<string>? couponApiKeys)
					|| !couponApiKeys.SequenceEqual([fakeBdoAlertsApiKey]))
				{
					return 93;
				}
			}

			bool rejectedIncompleteSchedule = false;
			try
			{
				BossScheduleService.ParseAndNormalizeForTest(
					bossScheduleFixture.Replace("\"Sunday\"", "\"NotSunday\"", StringComparison.Ordinal),
					bossScheduleFetchedAt);
			}
			catch (InvalidDataException)
			{
				rejectedIncompleteSchedule = true;
			}
			if (!rejectedIncompleteSchedule)
			{
				return 83;
			}

			bool rejectedInvalidScheduleTime = false;
			try
			{
				BossScheduleService.ParseAndNormalizeForTest(
					bossScheduleFixture.Replace("\"18:30\"", "\"25:30\"", StringComparison.Ordinal),
					bossScheduleFetchedAt);
			}
			catch (InvalidDataException)
			{
				rejectedInvalidScheduleTime = true;
			}
			if (!rejectedInvalidScheduleTime)
			{
				return 84;
			}

			string[] bossScheduleDays =
			[
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
				"Sunday"
			];
			string emptyBossScheduleFixture = JsonSerializer.Serialize(
				bossScheduleDays.ToDictionary(
					day => day,
					_ => new[]
					{
						new { time = "00:15", bosses = Array.Empty<string>() },
						new { time = "12:00", bosses = Array.Empty<string>() }
					}));
			bool rejectedEmptySchedule = false;
			try
			{
				BossScheduleService.ParseAndNormalizeForTest(
					emptyBossScheduleFixture,
					bossScheduleFetchedAt);
			}
			catch (InvalidDataException)
			{
				rejectedEmptySchedule = true;
			}
			if (!rejectedEmptySchedule)
			{
				return 90;
			}

			JsonSerializerOptions bossScheduleJsonOptions = new()
			{
				PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
				PropertyNameCaseInsensitive = true
			};
			await AtomicFile.WriteAllTextAsync(
				statePaths.BossScheduleCachePath,
				JsonSerializer.Serialize(bossSchedule, bossScheduleJsonOptions),
				CancellationToken.None);
			await AtomicFile.WriteAllTextAsync(
				statePaths.BossScheduleCachePath,
				JsonSerializer.Serialize(bossSchedule, bossScheduleJsonOptions),
				CancellationToken.None);
			BossScheduleSnapshot invalidPrimary = bossSchedule with { SchemaVersion = 99 };
			await File.WriteAllTextAsync(
				statePaths.BossScheduleCachePath,
				JsonSerializer.Serialize(invalidPrimary, bossScheduleJsonOptions),
				CancellationToken.None);
			using (BossScheduleService bossScheduleService = new(statePaths, logger))
			{
				JsonElement cachedScheduleDashboard = JsonSerializer.SerializeToElement(
					await bossScheduleService.InitializeAsync(CancellationToken.None),
					bossScheduleJsonOptions);
				if (cachedScheduleDashboard.GetProperty("status").GetString() != "CACHED"
					|| cachedScheduleDashboard.GetProperty("sourceTimeZone").GetString() != "Europe/Berlin"
					|| cachedScheduleDashboard.GetProperty("schedule").GetProperty("Monday").GetArrayLength() != 2)
				{
					return 85;
				}
			}

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

			EventService.EventDateRange? inferredYearRange = EventService.FindLikelyEventRange(
				"[New Class] Agent's Adventures July 30 (Thu) after maintenance - Aug 27, 2026 (Thu) before maintenance");
			if (inferredYearRange?.StartUtc != new DateTimeOffset(2026, 7, 30, 0, 0, 0, TimeSpan.Zero)
				|| inferredYearRange.EndUtc != new DateTimeOffset(2026, 8, 27, 23, 59, 0, TimeSpan.Zero))
			{
				return 131;
			}

			const string maintenanceHtml =
				"<html><title>Under Maintenance</title><script src='/_Incapsula_Resource'></script></html>";
			if (!EventService.IsMaintenancePage(maintenanceHtml)
				|| !EventService.IsMaintenancePage("", new Uri("https://www.naeu.playblackdesert.com/en-US/shutdown/closetime?shutDownType=0"))
				|| !EventService.GetEmptyEventsReason(maintenanceHtml).Contains("maintenance", StringComparison.OrdinalIgnoreCase))
			{
				return 132;
			}

			DateTimeOffset eventTestNow = new(2026, 8, 13, 8, 0, 0, TimeSpan.Zero);
			EventService.EventEntry cachedEventFixture = new(
				"fixture",
				"Fixture event",
				"Adventure",
				"https://example.test/event",
				"",
				"July 30, 2026 after maintenance - Aug 15, 2026 before maintenance",
				null,
				new DateTimeOffset(2026, 7, 30, 0, 0, 0, TimeSpan.Zero),
				new DateTimeOffset(2026, 8, 15, 23, 59, 0, TimeSpan.Zero),
				"4 days left",
				96,
				"active",
				0.5,
				"Jul 30 - Aug 15",
				"Official BDO");
			EventService.EventEntry? agedEvent = EventService.PrepareEventForDashboard(
				cachedEventFixture,
				"CACHED",
				eventTestNow);
			if (agedEvent?.RemainingHours != 64 || agedEvent.TimeLeftText != "3 days left")
			{
				return 133;
			}

			EventService.EventEntry sameDayMaintenanceEvent = cachedEventFixture with
			{
				Summary = "July 30, 2026 after maintenance - Aug 13, 2026 before maintenance",
				EndUtc = new DateTimeOffset(2026, 8, 13, 23, 59, 0, TimeSpan.Zero)
			};
			if (EventService.PrepareEventForDashboard(sameDayMaintenanceEvent, "MAINTENANCE", eventTestNow) != null
				|| EventService.PrepareEventForDashboard(sameDayMaintenanceEvent, "CACHED", eventTestNow) == null
				|| EventService.PrepareEventForDashboard(
					cachedEventFixture with { EndUtc = eventTestNow.AddMinutes(-1), Summary = "" },
					"CACHED",
					eventTestNow) != null)
			{
				return 134;
			}

			object cachedEvents = new { status = "CACHED", totalCount = 24 };
			object liveEvents = new { status = "LIVE", totalCount = 24 };
			object maintenanceEvents = new { status = "MAINTENANCE", totalCount = 19 };
			object emptyEvents = new { status = "CACHED", totalCount = 0 };
			if (!CalculatorForm.ShouldUseEventsBrowserFallback(cachedEvents, forceRefresh: true)
				|| CalculatorForm.ShouldUseEventsBrowserFallback(cachedEvents, forceRefresh: false)
				|| CalculatorForm.ShouldUseEventsBrowserFallback(liveEvents, forceRefresh: true)
				|| CalculatorForm.ShouldUseEventsBrowserFallback(maintenanceEvents, forceRefresh: true)
				|| !CalculatorForm.ShouldUseEventsBrowserFallback(emptyEvents, forceRefresh: false))
			{
				return 58;
			}

			DateTimeOffset cachedAt = DateTimeOffset.UtcNow.AddMinutes(-10);
			EventService.EventEntry maintenanceCacheEntry = cachedEventFixture with
			{
				StartUtc = cachedAt.AddDays(-1),
				EndUtc = cachedAt.AddDays(2),
				Summary = "",
				RemainingHours = 48
			};
			string maintenanceCacheJson = JsonSerializer.Serialize(
				new
				{
					lastRefreshed = cachedAt,
					sourceUrl = EventService.OfficialEventsUrl,
					events = new[] { maintenanceCacheEntry },
					error = (string?)null
				},
				bossScheduleJsonOptions);
			await AtomicFile.WriteAllTextAsync(statePaths.EventsCachePath, maintenanceCacheJson, CancellationToken.None);
			using (EventService maintenanceEventService = new(statePaths, logger))
			{
				JsonElement maintenanceDashboard = JsonSerializer.SerializeToElement(
					await maintenanceEventService.RefreshFromRenderedHtmlAsync(maintenanceHtml, CancellationToken.None),
					bossScheduleJsonOptions);
				string cacheAfterMaintenance = await File.ReadAllTextAsync(statePaths.EventsCachePath);
				if (maintenanceDashboard.GetProperty("status").GetString() != "MAINTENANCE"
					|| cacheAfterMaintenance != maintenanceCacheJson)
				{
					return 135;
				}
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

			return 0;
		}
		catch (Exception exception)
		{
			logger.Error("Offline smoke test failed.", exception);
			Console.Error.WriteLine($"Offline smoke test failed: {exception}");
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

	private static async Task<int> RunMarketStorageMaintenanceSmokeTestAsync()
	{
		string path = Path.Combine(Path.GetTempPath(), $"bdo-market-storage-smoke-{Guid.NewGuid():N}.db");
		try
		{
			MarketDatabase database = new(path);
			await database.InitializeAsync(CancellationToken.None);
			DateTimeOffset nowUtc = DateTimeOffset.UtcNow;
			MarketItem outfit = new(880_001, 0, "Storage Test Outfit", 4, 2_020_000_000, 11, 0, 55, 1);
			await database.SyncOutfitCatalogAsync([outfit], "eu", CancellationToken.None);
			await database.SyncOutfitCatalogAsync(
				[outfit with { CurrentPrice = 2_030_000_000, Stock = 17 }],
				"eu",
				CancellationToken.None);

			await using (SqliteConnection seed = new($"Data Source={path};Pooling=False"))
			{
				await seed.OpenAsync();
				await using (SqliteCommand makeLegacy = seed.CreateCommand())
				{
					makeLegacy.CommandText = "PRAGMA auto_vacuum=NONE; VACUUM;";
					await makeLegacy.ExecuteNonQueryAsync();
				}
				await using SqliteTransaction transaction = (SqliteTransaction)await seed.BeginTransactionAsync();
				await using (SqliteCommand tracked = seed.CreateCommand())
				{
					tracked.Transaction = transaction;
					tracked.CommandText = @"
INSERT INTO tracked_items(item_id,enhancement,region,name,grade,created_utc)
VALUES(990001,0,'eu','Storage Tracked Item',1,$created);
INSERT INTO snapshots(item_id,enhancement,region,captured_utc,price,source)
VALUES(990001,0,'eu',$oldTracked,100,'provider-history'),
      (990001,0,'eu',$keptTracked,110,'provider-history');";
					tracked.Parameters.AddWithValue("$created", nowUtc.AddDays(-100).ToString("O"));
					tracked.Parameters.AddWithValue("$oldTracked", nowUtc.AddDays(-91).ToString("O"));
					tracked.Parameters.AddWithValue("$keptTracked", nowUtc.AddDays(-89).ToString("O"));
					await tracked.ExecuteNonQueryAsync();
				}
				await using (SqliteCommand outfits = seed.CreateCommand())
				{
					outfits.Transaction = transaction;
					outfits.CommandText = @"
INSERT INTO outfit_snapshots(item_id,region,captured_utc,price,stock,trade_count,source)
VALUES($id,'eu',$oldOutfit,2030000000,17,80,'bulk-sales'),
      ($id,'eu',$baseline,2030000000,17,100,'bulk-sales'),
      ($id,'eu',$current,2030000000,17,160,'bulk-sales');
WITH RECURSIVE sequence(value) AS (
    VALUES(1)
    UNION ALL
    SELECT value + 1 FROM sequence WHERE value < 6000
)
INSERT INTO outfit_snapshots(item_id,region,captured_utc,price,stock,trade_count,source)
SELECT $id,'eu',datetime($bloatStart, '+' || value || ' seconds'),2030000000,17,value,'bulk-sales'
FROM sequence;";
					outfits.Parameters.AddWithValue("$id", outfit.ItemId);
					outfits.Parameters.AddWithValue("$oldOutfit", nowUtc.AddDays(-15).ToString("O"));
					outfits.Parameters.AddWithValue("$baseline", nowUtc.AddDays(-7).AddMinutes(-1).ToString("O"));
					outfits.Parameters.AddWithValue("$current", nowUtc.AddMinutes(-1).ToString("O"));
					outfits.Parameters.AddWithValue("$bloatStart", nowUtc.AddDays(-30).UtcDateTime.ToString("yyyy-MM-dd HH:mm:ss"));
					await outfits.ExecuteNonQueryAsync();
				}
				await transaction.CommitAsync();
			}

			await database.InitializeAsync(CancellationToken.None);
			MarketStorageMaintenanceResult result = await database.MaintainStorageAsync(
				MarketAnalyticsService.MarketSampleRetention,
				nowUtc,
				CancellationToken.None);
			if (!result.FullVacuumCompleted
				|| result.IncrementalVacuumCompleted
				|| result.RemovedRows < 6002
				|| result.DeferredReason != null
				|| result.FileBytesAfter >= result.FileBytesBefore)
			{
				return 233;
			}

			await using (SqliteConnection verify = new($"Data Source={path};Pooling=False"))
			{
				await verify.OpenAsync();
				await using SqliteCommand command = verify.CreateCommand();
				command.CommandText = @"
SELECT
    (SELECT auto_vacuum FROM pragma_auto_vacuum),
    (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='ix_outfit_snapshots_item_time'),
    (SELECT COUNT(*) FROM snapshots),
    (SELECT COUNT(*) FROM outfit_snapshots),
    (SELECT COUNT(*) FROM outfit_snapshots WHERE source='catalog'),
    (SELECT price FROM outfit_catalog WHERE item_id=880001 AND region='eu'),
    (SELECT stock FROM outfit_catalog WHERE item_id=880001 AND region='eu'),
    (SELECT quick_check FROM pragma_quick_check);";
				await using SqliteDataReader reader = await command.ExecuteReaderAsync();
				if (!await reader.ReadAsync()
					|| reader.GetInt32(0) != 2
					|| reader.GetInt32(1) != 0
					|| reader.GetInt32(2) != 1
					|| reader.GetInt32(3) != 2
					|| reader.GetInt32(4) != 0
					|| reader.GetInt64(5) != 2_030_000_000
					|| reader.GetInt64(6) != 17
					|| !string.Equals(reader.GetString(7), "ok", StringComparison.OrdinalIgnoreCase))
				{
					return 234;
				}
			}

			OutfitOpportunity opportunity = (await database.GetOutfitReportAsync("eu", CancellationToken.None))
				.Opportunities.Single(item => item.ItemId == outfit.ItemId);
			if (opportunity.Sales7Days != 60)
			{
				return 235;
			}

			await using (SqliteConnection addExpired = new($"Data Source={path};Pooling=False"))
			{
				await addExpired.OpenAsync();
				await using SqliteCommand insert = addExpired.CreateCommand();
				insert.CommandText = @"
INSERT INTO outfit_snapshots(item_id,region,captured_utc,price,stock,trade_count,source)
VALUES(880001,'eu',$expired,2030000000,17,1,'bulk-sales');";
				insert.Parameters.AddWithValue("$expired", nowUtc.AddDays(-20).ToString("O"));
				await insert.ExecuteNonQueryAsync();
			}
			MarketStorageMaintenanceResult incremental = await database.MaintainStorageAsync(
				MarketAnalyticsService.MarketSampleRetention,
				nowUtc,
				CancellationToken.None);
			if (incremental.FullVacuumCompleted
				|| !incremental.IncrementalVacuumCompleted
				|| incremental.RemovedRows != 1
				|| incremental.FileBytesAfter > incremental.FileBytesBefore)
			{
				return 236;
			}

			await using (SqliteConnection blocker = new($"Data Source={path};Pooling=False"))
			{
				await blocker.OpenAsync();
				await using SqliteTransaction writeLock = (SqliteTransaction)await blocker.BeginTransactionAsync();
				await using SqliteCommand hold = blocker.CreateCommand();
				hold.Transaction = writeLock;
				hold.CommandText = "UPDATE outfit_catalog SET stock=stock WHERE item_id=880001 AND region='eu';";
				await hold.ExecuteNonQueryAsync();
				MarketStorageMaintenanceResult deferred = await database.MaintainStorageAsync(
					MarketAnalyticsService.MarketSampleRetention,
					nowUtc,
					CancellationToken.None);
				if (string.IsNullOrWhiteSpace(deferred.DeferredReason))
				{
					return 237;
				}
				await writeLock.RollbackAsync();
			}

			MarketStorageMaintenanceResult retry = await database.MaintainStorageAsync(
				MarketAnalyticsService.MarketSampleRetention,
				nowUtc,
				CancellationToken.None);
			if (retry.DeferredReason != null
				|| !retry.IncrementalVacuumCompleted
				|| !MarketDatabase.HasSufficientVacuumSpace(60_000_000, 0, 200_000_000)
				|| MarketDatabase.HasSufficientVacuumSpace(60_000_000, 0, 100_000_000))
			{
				return 238;
			}

			await using (SqliteConnection expiredBeforeFailure = new($"Data Source={path};Pooling=False"))
			{
				await expiredBeforeFailure.OpenAsync();
				await using SqliteCommand insert = expiredBeforeFailure.CreateCommand();
				insert.CommandText = @"
INSERT INTO outfit_snapshots(item_id,region,captured_utc,price,stock,trade_count,source)
VALUES(880001,'eu',$expired,2030000000,17,1,'bulk-sales');";
				insert.Parameters.AddWithValue("$expired", nowUtc.AddDays(-20).ToString("O"));
				await insert.ExecuteNonQueryAsync();
			}
			FailingMarketDataProvider failingProvider = new(
				path,
				nowUtc.Subtract(MarketDatabase.OutfitSampleRetention));
			using (AppLogger maintenanceLogger = new(path + ".log"))
			using (MarketAnalyticsService service = new(
				database,
				failingProvider,
				maintenanceLogger,
				useProcessUpdateLock: false))
			{
				await service.InitializeAsync(CancellationToken.None, startForegroundUpdates: false);
				await service.RefreshDueMarketSamplesAsync(
					MarketAnalyticsService.DefaultCollectorInterval,
					"storage ordering smoke test",
					CancellationToken.None);
				if (!failingProvider.RequestObserved || !failingProvider.StorageWasPrunedBeforeRequest)
				{
					return 239;
				}
			}
			await using (SqliteConnection verifyFailureOrdering = new($"Data Source={path};Pooling=False"))
			{
				await verifyFailureOrdering.OpenAsync();
				await using SqliteCommand countExpired = verifyFailureOrdering.CreateCommand();
				countExpired.CommandText = "SELECT COUNT(*) FROM outfit_snapshots WHERE captured_utc < $cutoff;";
				countExpired.Parameters.AddWithValue("$cutoff", nowUtc.AddDays(-14).ToString("O"));
				if (Convert.ToInt32(await countExpired.ExecuteScalarAsync()) != 0)
				{
					return 240;
				}
			}
			return 0;
		}
		finally
		{
			SqliteCleanup(path);
			try { File.Delete(path + ".log"); } catch (IOException) { }
		}
	}

	private static async Task<int> RunBdoAlertsMarketOfflineSmokeTestAsync(string stateRoot)
	{
		string fakeApiKey = "bdo_" + new string('T', 28);
		string logPath = Path.Combine(stateRoot, "bdo-alerts-market-smoke.log");
		Directory.CreateDirectory(stateRoot);

		using (AppLogger marketLogger = new(logPath))
		{
			using (AnalyticsMarketStubHandler arshaPrimaryGuard = new(Array.Empty<long>()))
			using (BdoAlertsMarketStubHandler bdoPrimary = new(
				BdoAlertsMarketStubMode.ValidPriceHistory,
				fakeApiKey))
			using (GrindMarketPriceProvider provider = new(
				marketLogger,
				arshaPrimaryGuard,
				bdoPrimary,
				fakeApiKey))
			{
				GrindMarketPriceResponse response = await provider.GetPricesAsync(
					[101, 102],
					"eu",
					CancellationToken.None);
				if (response.Prices.Count != 2
					|| response.Missing.Count != 0
					|| response.Prices.Any(price =>
						price.Source != "bdoalerts-price-history"
						|| price.Price != 1_000_000L + price.ItemId)
					|| arshaPrimaryGuard.RequestCount != 0
					|| bdoPrimary.RequestCount != 1
					|| !bdoPrimary.ExactAuthenticationObserved
					|| !bdoPrimary.SecretStayedInApprovedHeader
					|| ResponseContainsSecret(response, fakeApiKey))
				{
					return 183;
				}
			}

			using (AnalyticsMarketStubHandler forbiddenFallback = new(Array.Empty<long>()))
			using (BdoAlertsMarketStubHandler forbiddenBdo = new(
				BdoAlertsMarketStubMode.Forbidden,
				fakeApiKey))
			using (GrindMarketPriceProvider provider = new(
				marketLogger,
				forbiddenFallback,
				forbiddenBdo,
				fakeApiKey))
			{
				GrindMarketPriceResponse response = await provider.GetPricesAsync(
					[201, 202],
					"eu",
					CancellationToken.None);
				if (response.Prices.Count != 2
					|| response.Missing.Count != 0
					|| response.Prices.Any(price => price.Source != "arsha-sublist-cache")
					|| forbiddenBdo.RequestCount != 1
					|| forbiddenFallback.RequestCount != 1
					|| !forbiddenBdo.ExactAuthenticationObserved
					|| !forbiddenBdo.SecretStayedInApprovedHeader
					|| ResponseContainsSecret(response, fakeApiKey))
				{
					return 184;
				}
			}

			using (AnalyticsMarketStubHandler partialFallback = new(Array.Empty<long>()))
			using (BdoAlertsMarketStubHandler partialBdo = new(
				BdoAlertsMarketStubMode.PartialPriceHistory,
				fakeApiKey))
			using (GrindMarketPriceProvider provider = new(
				marketLogger,
				partialFallback,
				partialBdo,
				fakeApiKey))
			{
				GrindMarketPriceResponse response = await provider.GetPricesAsync(
					[401, 402],
					"eu",
					CancellationToken.None);
				if (response.Prices.Count != 2
					|| response.Prices.Select(price => price.ItemId).Distinct().Count() != 2
					|| response.Missing.Count != 0
					|| response.Provider != "BDO Alerts Central Market + Arsha fallback"
					|| response.Prices.Single(price => price.ItemId == 401).Source
						!= "bdoalerts-price-history"
					|| response.Prices.Single(price => price.ItemId == 402).Source
						!= "arsha-sublist-cache"
					|| !partialFallback.LastRequestedItemIds.SequenceEqual([402L])
					|| partialFallback.RequestCount != 1
					|| partialBdo.RequestCount != 1
					|| !partialBdo.ExactAuthenticationObserved
					|| !partialBdo.SecretStayedInApprovedHeader
					|| ResponseContainsSecret(response, fakeApiKey))
				{
					return 192;
				}
			}

			using (AnalyticsMarketStubHandler malformedFallback = new(Array.Empty<long>()))
			using (BdoAlertsMarketStubHandler malformedBdo = new(
				BdoAlertsMarketStubMode.Malformed,
				fakeApiKey))
			using (GrindMarketPriceProvider provider = new(
				marketLogger,
				malformedFallback,
				malformedBdo,
				fakeApiKey))
			{
				GrindMarketPriceResponse response = await provider.GetPricesAsync(
					[301, 302],
					"eu",
					CancellationToken.None);
				if (response.Prices.Count != 2
					|| response.Missing.Count != 0
					|| response.Prices.Any(price => price.Source != "arsha-sublist-cache")
					|| malformedBdo.RequestCount != 1
					|| malformedFallback.RequestCount != 1
					|| !malformedBdo.ExactAuthenticationObserved
					|| !malformedBdo.SecretStayedInApprovedHeader
					|| ResponseContainsSecret(response, fakeApiKey))
				{
					return 185;
				}
			}

			using (EdaniaMarketFallbackStubHandler liveEdaniaFallback = new(11898, 5_150_000_000))
			using (BdoAlertsMarketStubHandler unavailableBdo = new(
				BdoAlertsMarketStubMode.Forbidden,
				fakeApiKey))
			using (GrindMarketPriceProvider provider = new(
				marketLogger,
				liveEdaniaFallback,
				unavailableBdo,
				fakeApiKey))
			{
				GrindMarketPriceResponse response = await provider.GetPricesAsync(
					[11898],
					"eu",
					CancellationToken.None);
				GrindMarketPrice? price = response.Prices.SingleOrDefault();
				if (price is null
					|| price.ItemId != 11898
					|| price.Enhancement != 0
					|| price.Price != 5_150_000_000
					|| price.Source != "pearl-abyss-sublist-live"
					|| response.Missing.Count != 0
					|| !response.Provider.Contains("Pearl Abyss live fallback", StringComparison.Ordinal)
					|| liveEdaniaFallback.ArshaRequestCount != 2
					|| liveEdaniaFallback.PearlAbyssRequestCount != 1
					|| !liveEdaniaFallback.ExactPearlAbyssRequestObserved)
				{
					return 241;
				}
			}

			using (JsonDocument duplicateHistory = JsonDocument.Parse(
				"""
				{
				  "success": true,
				  "region": "eu",
				  "total_items": 3,
				  "items": [
				    {"item_id": 11898, "sub_key": 1, "item_name": "Apeiron Earring", "current_price": 35000000000, "current_stock": 0, "last_updated": "2026-08-15T11:00:00Z"},
				    {"item_id": 11898, "sub_key": 0, "item_name": "Apeiron Earring", "current_price": 5150000000, "current_stock": 0, "last_updated": "2026-08-15T10:00:00Z"},
				    {"item_id": 11898, "sub_key": 0, "item_name": "Apeiron Earring", "current_price": 5200000000, "current_stock": 0, "last_updated": "2026-08-15T12:00:00Z"}
				  ]
				}
				"""))
			{
				BdoAlertsMarketSnapshot parsedHistory = BdoAlertsCentralMarketClient.ParsePriceHistory(
					duplicateHistory.RootElement,
					[11898],
					"eu",
					DateTimeOffset.UnixEpoch);
				GrindMarketPrice selected = parsedHistory.Prices.Single();
				if (selected.Enhancement != 0
					|| selected.Price != 5_200_000_000
					|| selected.CapturedUtc != DateTimeOffset.Parse(
						"2026-08-15T12:00:00Z",
						CultureInfo.InvariantCulture))
				{
					return 242;
				}
			}

			Uri trustedPriceHistory = new(
				"https://api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=eu&days=1");
			using (HttpRequestMessage trustedRequest = new(HttpMethod.Get, trustedPriceHistory))
			{
				if (!BdoAlertsApiCredentials.TryApply(
						trustedRequest,
						trustedPriceHistory,
						fakeApiKey)
					|| !trustedRequest.Headers.TryGetValues(
						"X-API-Key",
						out IEnumerable<string>? values)
					|| !values.SequenceEqual([fakeApiKey])
					|| trustedRequest.Headers.Authorization is not null
					|| trustedRequest.RequestUri!.AbsoluteUri.Contains(
						fakeApiKey,
						StringComparison.Ordinal)
					|| trustedRequest.Content is not null)
				{
					return 186;
				}
			}

			(string Method, string RequestUri, string EndpointUri)[] rejectedCredentials =
			[
				("POST", trustedPriceHistory.AbsoluteUri, trustedPriceHistory.AbsoluteUri),
				("GET", "http://api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=eu&days=1", "http://api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=eu&days=1"),
				("GET", "https://api.bdoalerts.net:444/api/market/price-history?item_ids=101,102&region=eu&days=1", "https://api.bdoalerts.net:444/api/market/price-history?item_ids=101,102&region=eu&days=1"),
				("GET", "https://untrusted@api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=eu&days=1", "https://untrusted@api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=eu&days=1"),
				("GET", "https://api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=eu&days=1#untrusted", "https://api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=eu&days=1#untrusted"),
				("GET", "https://example.com/api/market/price-history?item_ids=101,102&region=eu&days=1", "https://example.com/api/market/price-history?item_ids=101,102&region=eu&days=1"),
				("GET", "https://api.bdoalerts.net.evil.example/api/market/price-history?item_ids=101,102&region=eu&days=1", "https://api.bdoalerts.net.evil.example/api/market/price-history?item_ids=101,102&region=eu&days=1"),
				("GET", "https://api.bdoalerts.net/api/market/eu/pearlshop?limit=2000", "https://api.bdoalerts.net/api/market/eu/pearlshop?limit=2000"),
				("GET", "https://api.bdoalerts.net/api/market/item/101?region=eu", "https://api.bdoalerts.net/api/market/item/101?region=eu"),
				("GET", "https://api.bdoalerts.net/api/market/price-history", "https://api.bdoalerts.net/api/market/price-history"),
				("GET", "https://api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=na&days=1", "https://api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=na&days=1"),
				("GET", "https://api.bdoalerts.net/api/market/price-history?item_ids=101,101&region=eu&days=1", "https://api.bdoalerts.net/api/market/price-history?item_ids=101,101&region=eu&days=1"),
				("GET", "https://api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=eu&days=0", "https://api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=eu&days=0"),
				("GET", "https://api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=eu&days=1&days=1", "https://api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=eu&days=1&days=1"),
				("GET", "https://api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=eu&days=1&key=leak", "https://api.bdoalerts.net/api/market/price-history?item_ids=101,102&region=eu&days=1&key=leak"),
				("GET", trustedPriceHistory.AbsoluteUri, "https://api.bdoalerts.net/api/market/price-history?item_ids=101,103&region=eu&days=1")
			];
			foreach ((string method, string requestUri, string endpointUri) in rejectedCredentials)
			{
				using HttpRequestMessage rejected = new(
					new HttpMethod(method),
					requestUri);
				if (BdoAlertsApiCredentials.TryApply(
						rejected,
						new Uri(endpointUri),
						fakeApiKey)
					|| rejected.Headers.Contains("X-API-Key")
					|| rejected.RequestUri!.AbsoluteUri.Contains(
						fakeApiKey,
						StringComparison.Ordinal))
				{
					return 187;
				}
			}

			DateTimeOffset pearlShopCaptured = new(
				2026,
				8,
				8,
				10,
				0,
				0,
				TimeSpan.Zero);
			using JsonDocument nearZeroTrades = CreatePearlShopFixture(
				1500,
				pearlShopCaptured,
				index => index == 1500 ? 1L : 0L);
			if (!PearlShopFixtureIsRejected(
					nearZeroTrades,
					Enumerable.Range(1, 1500)
						.Select(index => (long)index)
						.ToArray(),
					pearlShopCaptured))
			{
				return 188;
			}

			using JsonDocument missingCoverage = CreatePearlShopFixture(
				1500,
				pearlShopCaptured,
				index => 10_000L + index);
			if (!PearlShopFixtureIsRejected(
					missingCoverage,
					[1, 999_999],
					pearlShopCaptured))
			{
				return 189;
			}

			using JsonDocument structurallyValid = CreatePearlShopFixture(
				1500,
				pearlShopCaptured,
				index => 10_000L + index);
			BdoAlertsMarketSnapshot parsed = BdoAlertsCentralMarketClient.ParsePearlShop(
				structurallyValid.RootElement,
				[1, 1500],
				"eu",
				pearlShopCaptured.AddMinutes(5));
			if (parsed.CapturedUtc != pearlShopCaptured
				|| parsed.Prices.Count != 2
				|| parsed.Prices.Any(price => price.TradeCount is null or <= 0))
			{
				return 190;
			}
		}

		string logText = File.Exists(logPath)
			? await File.ReadAllTextAsync(logPath, CancellationToken.None)
			: string.Empty;
		return logText.Contains(fakeApiKey, StringComparison.Ordinal)
			? 191
			: 0;
	}

	private static bool ResponseContainsSecret(
		GrindMarketPriceResponse response,
		string secret)
	{
		return response.Provider.Contains(secret, StringComparison.Ordinal)
			|| response.Message.Contains(secret, StringComparison.Ordinal)
			|| response.Prices.Any(price =>
				price.Name.Contains(secret, StringComparison.Ordinal)
				|| price.Source.Contains(secret, StringComparison.Ordinal));
	}

	private static JsonDocument CreatePearlShopFixture(
		int itemCount,
		DateTimeOffset capturedUtc,
		Func<int, long> tradeCountFactory)
	{
		string json = JsonSerializer.Serialize(new
		{
			region = "eu",
			scraped_at = capturedUtc,
			total_items = itemCount,
			items = Enumerable.Range(1, itemCount).Select(index => new
			{
				item_id = index,
				sub_key = 0,
				name = $"Fixture Pearl Item {index}",
				price = 2_020_000_000L,
				stock = 1,
				total_trades = tradeCountFactory(index)
			})
		});
		return JsonDocument.Parse(json);
	}

	private static bool PearlShopFixtureIsRejected(
		JsonDocument fixture,
		IReadOnlyCollection<long> requestedIds,
		DateTimeOffset capturedUtc)
	{
		try
		{
			BdoAlertsCentralMarketClient.ParsePearlShop(
				fixture.RootElement,
				requestedIds,
				"eu",
				capturedUtc);
			return false;
		}
		catch (InvalidDataException)
		{
			return true;
		}
	}

	private enum BdoAlertsMarketStubMode
	{
		ValidPriceHistory,
		PartialPriceHistory,
		Forbidden,
		Malformed
	}

	private sealed class FailingMarketDataProvider : IMarketDataProvider
	{
		private readonly string databasePath;
		private readonly DateTimeOffset retentionCutoff;

		public FailingMarketDataProvider(string databasePath, DateTimeOffset retentionCutoff)
		{
			this.databasePath = databasePath;
			this.retentionCutoff = retentionCutoff;
		}

		public bool RequestObserved { get; private set; }

		public bool StorageWasPrunedBeforeRequest { get; private set; } = true;

		public string Name => "Offline failure fixture";

		public Task<IReadOnlyList<MarketItem>> SearchAsync(
			string query,
			string region,
			CancellationToken cancellationToken)
		{
			throw CreateFailure();
		}

		public Task<IReadOnlyList<MarketItem>> GetVariantsAsync(
			long itemId,
			string region,
			CancellationToken cancellationToken)
		{
			throw CreateFailure();
		}

		public Task<IReadOnlyList<MarketItem>> GetCategoryAsync(
			int mainCategory,
			int subCategory,
			string region,
			CancellationToken cancellationToken)
		{
			throw CreateFailure();
		}

		public Task<MarketSnapshot> GetSnapshotAsync(
			long itemId,
			int enhancement,
			string region,
			CancellationToken cancellationToken)
		{
			throw CreateFailure();
		}

		private InvalidOperationException CreateFailure()
		{
			RequestObserved = true;
			using SqliteConnection connection = new($"Data Source={databasePath};Mode=ReadOnly;Pooling=False");
			connection.Open();
			using SqliteCommand command = connection.CreateCommand();
			command.CommandText = "SELECT COUNT(*) FROM outfit_snapshots WHERE captured_utc < $cutoff;";
			command.Parameters.AddWithValue("$cutoff", retentionCutoff.ToString("O"));
			StorageWasPrunedBeforeRequest &= Convert.ToInt32(command.ExecuteScalar()) == 0;
			return new InvalidOperationException("Offline provider failure fixture.");
		}
	}

	private sealed class BdoAlertsMarketStubHandler : HttpMessageHandler
	{
		private readonly BdoAlertsMarketStubMode mode;
		private readonly string expectedApiKey;
		private int requestCount;

		public BdoAlertsMarketStubHandler(
			BdoAlertsMarketStubMode mode,
			string expectedApiKey)
		{
			this.mode = mode;
			this.expectedApiKey = expectedApiKey;
		}

		public int RequestCount => Volatile.Read(ref requestCount);

		public bool ExactAuthenticationObserved { get; private set; }

		public bool SecretStayedInApprovedHeader { get; private set; }

		protected override async Task<HttpResponseMessage> SendAsync(
			HttpRequestMessage request,
			CancellationToken cancellationToken)
		{
			Interlocked.Increment(ref requestCount);
			string body = request.Content is null
				? string.Empty
				: await request.Content.ReadAsStringAsync(cancellationToken);
			string uri = request.RequestUri?.AbsoluteUri ?? string.Empty;
			string[] apiKeyValues = request.Headers.TryGetValues(
				"X-API-Key",
				out IEnumerable<string>? values)
					? values.ToArray()
					: Array.Empty<string>();
			ExactAuthenticationObserved = request.Method == HttpMethod.Get
				&& request.RequestUri?.Scheme == Uri.UriSchemeHttps
				&& request.RequestUri.Host.Equals(
					"api.bdoalerts.net",
					StringComparison.OrdinalIgnoreCase)
				&& request.RequestUri.AbsolutePath.Equals(
					"/api/market/price-history",
					StringComparison.Ordinal)
				&& apiKeyValues.SequenceEqual([expectedApiKey])
				&& request.Headers.Authorization is null
				&& request.Headers.Referrer is null
				&& !request.Headers.Contains("Origin");
			SecretStayedInApprovedHeader = !uri.Contains(
				expectedApiKey,
				StringComparison.Ordinal)
				&& !body.Contains(expectedApiKey, StringComparison.Ordinal)
				&& request.Headers
					.Where(header => !header.Key.Equals(
						"X-API-Key",
						StringComparison.OrdinalIgnoreCase))
					.SelectMany(header => header.Value)
					.All(value => !value.Contains(
						expectedApiKey,
						StringComparison.Ordinal));

			if (mode == BdoAlertsMarketStubMode.Forbidden)
			{
				return new HttpResponseMessage(HttpStatusCode.Forbidden)
				{
					ReasonPhrase = "Forbidden",
					Content = new StringContent(
						JsonSerializer.Serialize(new
						{
							error = "forbidden",
							detail = expectedApiKey
						}),
						Encoding.UTF8,
						"application/json")
				};
			}
			if (mode == BdoAlertsMarketStubMode.Malformed)
			{
				return new HttpResponseMessage(HttpStatusCode.OK)
				{
					Content = new StringContent(
						"{\"success\":true,\"region\":\"eu\",\"items\":",
						Encoding.UTF8,
						"application/json")
				};
			}

			long[] ids = ExtractPriceHistoryIds(request.RequestUri);
			if (mode == BdoAlertsMarketStubMode.PartialPriceHistory)
			{
				ids = ids.Take(1).ToArray();
			}
			string json = JsonSerializer.Serialize(new
			{
				success = true,
				region = "eu",
				items = ids.Select(id => new
				{
					item_id = id,
					sub_key = 0,
					item_name = $"BDO Alerts Fixture {id}",
					current_price = 1_000_000L + id,
					current_stock = 10 + id,
					last_updated = "2026-08-08T10:00:00Z"
				})
			});
			return new HttpResponseMessage(HttpStatusCode.OK)
			{
				Content = new StringContent(json, Encoding.UTF8, "application/json")
			};
		}

		private static long[] ExtractPriceHistoryIds(Uri? requestUri)
		{
			string query = requestUri?.Query.TrimStart('?') ?? string.Empty;
			string rawIds = query
				.Split('&', StringSplitOptions.RemoveEmptyEntries)
				.Select(pair => pair.Split('=', 2))
				.Where(parts => parts.Length == 2 && parts[0] == "item_ids")
				.Select(parts => Uri.UnescapeDataString(parts[1]))
				.FirstOrDefault() ?? string.Empty;
			return rawIds
				.Split(',', StringSplitOptions.RemoveEmptyEntries)
				.Select(value => long.TryParse(value, out long id) ? id : 0)
				.Where(id => id > 0)
				.ToArray();
		}
	}

	private sealed class EdaniaMarketFallbackStubHandler : HttpMessageHandler
	{
		private readonly long itemId;
		private readonly long basePrice;
		private int arshaRequestCount;
		private int pearlAbyssRequestCount;

		public EdaniaMarketFallbackStubHandler(long itemId, long basePrice)
		{
			this.itemId = itemId;
			this.basePrice = basePrice;
		}

		public int ArshaRequestCount => Volatile.Read(ref arshaRequestCount);

		public int PearlAbyssRequestCount => Volatile.Read(ref pearlAbyssRequestCount);

		public bool ExactPearlAbyssRequestObserved { get; private set; }

		protected override async Task<HttpResponseMessage> SendAsync(
			HttpRequestMessage request,
			CancellationToken cancellationToken)
		{
			string host = request.RequestUri?.Host ?? string.Empty;
			if (host.Equals("api.arsha.io", StringComparison.OrdinalIgnoreCase))
			{
				Interlocked.Increment(ref arshaRequestCount);
				return new HttpResponseMessage(HttpStatusCode.InternalServerError)
				{
					ReasonPhrase = "Internal Server Error",
					Content = new StringContent(
						"""{"status":500,"message":"One or more requests returned invalid data.","code":103}""",
						Encoding.UTF8,
						"application/json")
				};
			}

			if (host.Equals("eu-trade.naeu.playblackdesert.com", StringComparison.OrdinalIgnoreCase))
			{
				Interlocked.Increment(ref pearlAbyssRequestCount);
				string body = request.Content is null
					? string.Empty
					: await request.Content.ReadAsStringAsync(cancellationToken);
				ExactPearlAbyssRequestObserved = request.Method == HttpMethod.Post
					&& request.RequestUri?.Scheme == Uri.UriSchemeHttps
					&& request.RequestUri.AbsolutePath.Equals(
						"/Trademarket/GetWorldMarketSubList",
						StringComparison.Ordinal)
					&& body == $"keyType=0&mainKey={itemId.ToString(CultureInfo.InvariantCulture)}"
					&& request.Content?.Headers.ContentType?.MediaType == "application/x-www-form-urlencoded";
				string row = string.Join(
					'-',
					itemId.ToString(CultureInfo.InvariantCulture),
					"0",
					"0",
					basePrice.ToString(CultureInfo.InvariantCulture),
					"0",
					"77",
					"0",
					"0",
					basePrice.ToString(CultureInfo.InvariantCulture),
					"1786781353|");
				return new HttpResponseMessage(HttpStatusCode.OK)
				{
					Content = new StringContent(
						JsonSerializer.Serialize(new { resultCode = 0, resultMsg = row }),
						Encoding.UTF8,
						"application/json")
				};
			}

			return new HttpResponseMessage(HttpStatusCode.NotFound);
		}
	}

	private sealed class AnalyticsMarketStubHandler : HttpMessageHandler
	{
		private readonly HashSet<long> invalidItemIds;
		private int requestCount;

		public AnalyticsMarketStubHandler(long invalidItemId)
			: this([invalidItemId])
		{
		}

		public AnalyticsMarketStubHandler(IEnumerable<long> invalidItemIds)
		{
			this.invalidItemIds = invalidItemIds.ToHashSet();
		}

		public int RequestCount => Volatile.Read(ref requestCount);

		public IReadOnlyList<long> LastRequestedItemIds { get; private set; } = Array.Empty<long>();

		protected override async Task<HttpResponseMessage> SendAsync(
			HttpRequestMessage request,
			CancellationToken cancellationToken)
		{
			Interlocked.Increment(ref requestCount);
			string body = request.Content == null
				? "[]"
				: await request.Content.ReadAsStringAsync(cancellationToken);
			long[] ids = JsonSerializer.Deserialize<long[]>(body) ?? Array.Empty<long>();
			LastRequestedItemIds = ids;
			if (ids.Any(invalidItemIds.Contains))
			{
				return new HttpResponseMessage(HttpStatusCode.InternalServerError)
				{
					ReasonPhrase = "Internal Server Error",
					Content = new StringContent(
						"""{"status":500,"message":"One or more requests returned invalid data.","code":103}""",
						Encoding.UTF8,
						"application/json")
				};
			}

			string json = JsonSerializer.Serialize(ids.Select(id => new
			{
				name = $"Test Item {id}",
				id,
				sid = 0,
				minEnhance = 0,
				maxEnhance = 0,
				basePrice = 1_000_000L + id,
				currentStock = 0,
				totalTrades = 10_000L + id,
				lastSoldPrice = 1_000_000L + id
			}));
			return new HttpResponseMessage(HttpStatusCode.OK)
			{
				Content = new StringContent(json, Encoding.UTF8, "application/json")
			};
		}
	}

	private sealed class OutfitCategoryMarketStubHandler : HttpMessageHandler
	{
		private readonly bool truncateFirstCategory;
		private readonly bool wrongSecondCategory;
		private int requestCount;

		public OutfitCategoryMarketStubHandler(
			bool truncateFirstCategory = false,
			bool wrongSecondCategory = false)
		{
			this.truncateFirstCategory = truncateFirstCategory;
			this.wrongSecondCategory = wrongSecondCategory;
		}

		public int RequestCount => Volatile.Read(ref requestCount);

		protected override Task<HttpResponseMessage> SendAsync(
			HttpRequestMessage request,
			CancellationToken cancellationToken)
		{
			Interlocked.Increment(ref requestCount);
			string query = request.RequestUri?.Query ?? string.Empty;
			bool isFirstCategory = query.Contains("subCategory=1", StringComparison.OrdinalIgnoreCase);
			int itemCount = isFirstCategory
				? (truncateFirstCategory ? 100 : 500)
				: 1000;
			long[] ids = Enumerable.Range(isFirstCategory ? 201 : 1001, itemCount)
				.Select(value => (long)value)
				.ToArray();
			int responseSubCategory = !isFirstCategory && wrongSecondCategory ? 1 : (isFirstCategory ? 1 : 2);
			string json = JsonSerializer.Serialize(ids.Select(id => new
			{
				name = $"Test Outfit {id}",
				id,
				currentStock = 0,
				totalTrades = 20_000L + id,
				basePrice = 2_020_000_000L,
				mainCategory = 55,
				subCategory = responseSubCategory
			}));
			return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
			{
				Content = new StringContent(json, Encoding.UTF8, "application/json")
			});
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

	private static void CopyDirectoryIfPresent(
		string sourceDirectory,
		string targetDirectory,
		string? excludedRelativeDirectory = null)
	{
		if (!Directory.Exists(sourceDirectory))
		{
			return;
		}

		foreach (string sourcePath in Directory.EnumerateFiles(sourceDirectory, "*", SearchOption.AllDirectories))
		{
			string relativePath = Path.GetRelativePath(sourceDirectory, sourcePath);
			if (!string.IsNullOrWhiteSpace(excludedRelativeDirectory)
				&& (string.Equals(relativePath, excludedRelativeDirectory, StringComparison.OrdinalIgnoreCase)
					|| relativePath.StartsWith(
						excludedRelativeDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
							+ Path.DirectorySeparatorChar,
						StringComparison.OrdinalIgnoreCase)))
			{
				continue;
			}
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
