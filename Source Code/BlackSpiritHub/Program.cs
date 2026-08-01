using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
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
			await database.SaveSettingsAsync(MarketSettings.Default, CancellationToken.None);

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
			MarketSnapshot outfitSnapshot = new(2_200_000_000, 0, 123, 7, 2_100_000_000, 2_200_000_000, 2_150_000_000, Array.Empty<ProviderHistoryPoint>());
			await database.SaveOutfitDetailAsync(outfit, outfit, outfitSnapshot, "eu", CancellationToken.None);
			OutfitReport report = await database.GetOutfitReportAsync("eu", CancellationToken.None);
			if (report.CatalogCount != 1
				|| report.DetailedCount != 1
				|| report.Opportunities.Count != 1
				|| !report.Opportunities[0].Sales24Hours.HasValue
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
			GrindMarketPrice staleBaseline = olderOutfitSample with
			{
				ItemId = staleLatestOutfit.ItemId,
				Name = staleLatestOutfit.Name,
				TradeCount = 100,
				CapturedUtc = bulkCapturedUtc.AddHours(-37)
			};
			GrindMarketPrice staleCurrent = staleBaseline with
			{
				TradeCount = 112,
				CapturedUtc = bulkCapturedUtc.AddHours(-13)
			};
			await database.SaveOutfitBulkSamplesAsync(
				[oldBaseline, nearBaseline, staleBaseline],
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
			if (staleLatestResult.Sales24Hours.HasValue
				|| staleLatestResult.Sales3Days.HasValue
				|| staleLatestResult.Sales7Days.HasValue)
			{
				return 79;
			}

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
			GrindMarketPrice[] coverageSamples = coverageCatalog
				.Take(94)
				.Select(item => currentOutfitSample with
				{
					ItemId = item.ItemId,
					Name = item.Name,
					Price = item.CurrentPrice,
					BasePrice = item.CurrentPrice,
					TradeCount = 1_000 + item.ItemId,
					CapturedUtc = DateTimeOffset.UtcNow
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
						CapturedUtc = DateTimeOffset.UtcNow
					}
				],
				"eu",
				CancellationToken.None);
			IReadOnlyList<MarketItem> fivePending = await database.GetOutfitCatalogDueForBulkAsync(
				"eu",
				TimeSpan.FromHours(6),
				CancellationToken.None);
			if (await database.IsOutfitBulkRefreshDueAsync("eu", TimeSpan.FromHours(6), CancellationToken.None)
				|| fivePending.Count != 5)
			{
				return 86;
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
					apiKey: "bdo_ABCDEFGHIJKLMNOPQRSTUVWXYZ"))
			{
				if (!apiKeyScheduleRequest.Headers.TryGetValues("X-API-Key", out IEnumerable<string>? apiKeys)
					|| !apiKeys.SequenceEqual(["bdo_ABCDEFGHIJKLMNOPQRSTUVWXYZ"])
					|| apiKeyScheduleRequest.Headers.Referrer is not null
					|| apiKeyScheduleRequest.Headers.Contains("Origin"))
				{
					return 89;
				}
			}

			using (HttpRequestMessage untrustedScheduleRequest =
				BossScheduleService.CreateRequestForTest(
					new Uri("https://example.com/schedule"),
					apiKey: "bdo_MUSTNOTLEAKABCDEFGHIJKLMNOPQRSTUVWXYZ"))
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
						"bdo_ABCDEFGHIJKLMNOPQRSTUVWXYZ")
					|| !apiKeyCouponRequest.Headers.TryGetValues(
						"X-API-Key",
						out IEnumerable<string>? couponApiKeys)
					|| !couponApiKeys.SequenceEqual(["bdo_ABCDEFGHIJKLMNOPQRSTUVWXYZ"]))
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

			return 0;
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

		protected override async Task<HttpResponseMessage> SendAsync(
			HttpRequestMessage request,
			CancellationToken cancellationToken)
		{
			Interlocked.Increment(ref requestCount);
			string body = request.Content == null
				? "[]"
				: await request.Content.ReadAsStringAsync(cancellationToken);
			long[] ids = JsonSerializer.Deserialize<long[]>(body) ?? Array.Empty<long>();
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
