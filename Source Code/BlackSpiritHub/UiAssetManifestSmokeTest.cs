using System;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace BlackSpiritHub;

internal static class UiAssetManifestSmokeTest
{
	internal static int Run()
	{
		string root = Path.Combine(Path.GetTempPath(), "black-spirit-hub-ui-assets-" + Guid.NewGuid().ToString("N"));
		try
		{
			string source = Path.Combine(root, "installed");
			string cache = Path.Combine(root, "cached");
			string[] files = ["Assets/GrindTracker/spots.js", "NavigationAssets/icons.svg", "ThemeAssets/frame.svg"];
			for (int index = 0; index < files.Length; index++) Write(source, files[index], "fixture-" + index);
			Write(source, "Assets/RecipeBook/recipes.json", "IMMUTABLE");
			WriteManifest(source, files);
			UiAssetManifest.SyncResult cold = UiAssetManifest.Sync(source, cache);
			Assert(cold.UsedManifest && cold.FilesCopied == 3, "Cold cache copies exactly the managed assets.");
			Assert(!Directory.Exists(Path.Combine(cache, "Assets", "RecipeBook")), "Recipe Book must not be copied.");
			UiAssetManifest.SyncResult warm = UiAssetManifest.Sync(source, cache);
			Assert(warm.UsedManifest && warm.DataBytesRead == 0 && warm.FilesHashed == 0 && warm.FilesCopied == 0,
				"Warm cache reads no asset contents and copies no assets.");

			// Deleted cache entries self-heal, even without a version or manifest change.
			File.Delete(Path.Combine(cache, files[0]));
			Assert(UiAssetManifest.Sync(source, cache).FilesCopied == 1, "Missing cache entry restored.");
			DateTime editedTime = File.GetLastWriteTimeUtc(Path.Combine(cache, files[1])).AddSeconds(10);
			Write(cache, files[1], "CORRUPTED");
			File.SetLastWriteTimeUtc(Path.Combine(cache, files[1]), editedTime);
			Assert(UiAssetManifest.Sync(source, cache).FilesCopied == 1, "Changed cached asset repaired.");

			// Same-version developer hotfixes with unchanged lengths still propagate.
			DateTime sourceTime = File.GetLastWriteTimeUtc(Path.Combine(source, files[0]));
			Write(source, files[0], "hotfix--0");
			File.SetLastWriteTimeUtc(Path.Combine(source, files[0]), sourceTime.AddSeconds(10));
			Assert(UiAssetManifest.Sync(source, cache).FilesCopied == 1, "Hotfix detected with stale development manifest.");
			Assert(File.ReadAllText(Path.Combine(cache, files[0])) == "hotfix--0", "Hotfix content received.");
			Assert(UiAssetManifest.Sync(source, cache).DataBytesRead == 0, "Hotfix has a fast subsequent warm start.");

			// Regeneration also detects equal-length, timestamp-preserving package updates.
			sourceTime = File.GetLastWriteTimeUtc(Path.Combine(source, files[0]));
			Write(source, files[0], "hotfix--1");
			File.SetLastWriteTimeUtc(Path.Combine(source, files[0]), sourceTime);
			WriteManifest(source, files);
			Assert(UiAssetManifest.Sync(source, cache).FilesCopied == 1, "New content manifest invalidates old state.");
			Write(cache, ".ui-assets-state.json", "broken json");
			Assert(UiAssetManifest.Sync(source, cache).FilesHashed == 6, "Corrupt local index is revalidated safely.");

			Write(source, "Assets/GrindTracker/new.svg", "NEW");
			UiAssetManifest.SyncResult stale = UiAssetManifest.Sync(source, cache);
			Assert(!stale.UsedManifest && stale.FilesCopied == 1, "Unlisted installed assets trigger content-aware fallback.");
			File.Delete(Path.Combine(source, UiAssetManifest.FileName));
			Assert(!UiAssetManifest.Sync(source, cache).UsedManifest, "Missing manifest retains legacy compatibility.");
			Write(source, UiAssetManifest.FileName, "{}");
			Assert(!UiAssetManifest.Sync(source, cache).UsedManifest, "Invalid schema triggers fallback.");
			string outside = Path.Combine(root, "sentinel.txt");
			File.WriteAllText(outside, "PROTECTED");
			foreach (string unsafePath in new[] { "../sentinel.txt", "Assets/../../sentinel.txt", "C:/sentinel.txt",
				"Assets\\..\\sentinel.txt", "Assets/RecipeBook/recipes.json", "Assets/thing.svg:stream", "Assets/../sentinel.txt" })
			{
				Write(source, UiAssetManifest.FileName, JsonSerializer.Serialize(new
				{
					schemaVersion = 1, bundleId = new string('0', 64),
					files = new[] { new { path = unsafePath, length = 9, sha256 = new string('0', 64) } }
				}));
				Assert(!UiAssetManifest.Sync(source, cache).UsedManifest, "Unsafe manifest path rejected: " + unsafePath);
				Assert(File.ReadAllText(outside) == "PROTECTED", "Outside files remain untouched.");
			}
			Console.WriteLine("UI asset fixture smoke passed: cold copy, zero-content-read warm start, missing/corrupt cache recovery, same-version hotfixes, stale/invalid/absent manifest fallback, and path validation.");

			// Deterministic counters for the actual published bundle; timings include OS
			// cache effects and are diagnostic, not a promised startup speed improvement.
			if (File.Exists(Path.Combine(AppContext.BaseDirectory, UiAssetManifest.FileName)))
			{
				string realCache = Path.Combine(root, "actual-bundle-cache");
				Stopwatch clock = Stopwatch.StartNew();
				UiAssetManifest.SyncResult actualCold = UiAssetManifest.Sync(AppContext.BaseDirectory, realCache);
				long coldMilliseconds = clock.ElapsedMilliseconds;
				clock.Restart();
				UiAssetManifest.SyncResult actualWarm = UiAssetManifest.Sync(AppContext.BaseDirectory, realCache);
				Assert(actualCold.UsedManifest && actualWarm.UsedManifest, "Published bundle manifest matches installed file list.");
				Assert(actualWarm.FilesCopied == 0 && actualWarm.DataBytesRead == 0, "Published warm start avoids asset-content reads.");
				Console.WriteLine(JsonSerializer.Serialize(new { actualCold, coldMilliseconds, actualWarm, warmMilliseconds = clock.ElapsedMilliseconds }));
			}
			return 0;
		}
		catch (Exception error)
		{
			Console.Error.WriteLine(error);
			return 286;
		}
		finally
		{
			// This unique test-only directory is the sole cleanup target.
			try { if (Directory.Exists(root)) Directory.Delete(root, recursive: true); }
			catch (IOException) { }
			catch (UnauthorizedAccessException) { }
		}
	}

	private static void Assert(bool condition, string message)
	{
		if (!condition) throw new InvalidOperationException(message);
	}

	private static void Write(string root, string relative, string text)
	{
		string file = Path.Combine(root, relative);
		Directory.CreateDirectory(Path.GetDirectoryName(file)!);
		File.WriteAllText(file, text, new UTF8Encoding(false));
	}

	private static void WriteManifest(string root, string[] files)
	{
		UiAssetManifest.Entry[] entries = files.OrderBy(path => path, StringComparer.Ordinal).Select(path =>
		{
			byte[] bytes = File.ReadAllBytes(Path.Combine(root, path));
			return new UiAssetManifest.Entry(path, bytes.Length, Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant());
		}).ToArray();
		string canonical = string.Concat(entries.Select(file => file.Path + "\t" + file.Length.ToString(CultureInfo.InvariantCulture) + "\t" + file.Sha256 + "\n"));
		string bundleId = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical))).ToLowerInvariant();
		Write(root, UiAssetManifest.FileName, JsonSerializer.Serialize(new UiAssetManifest.Manifest(1, bundleId, entries),
			new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
	}
}
