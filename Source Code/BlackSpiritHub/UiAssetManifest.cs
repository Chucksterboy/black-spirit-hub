using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace BlackSpiritHub;

// The manifest is a cache optimization, not a signature or a user-data store.
// Every path is constrained to bundled UI assets. Recipe Book remains hosted
// directly from the installation and must never be copied into this cache.
internal static class UiAssetManifest
{
	internal const string FileName = "ui-assets-manifest.json";
	private const string StateFileName = ".ui-assets-state.json";
	private const int SchemaVersion = 1;
	private const long MaximumManifestBytes = 8 * 1024 * 1024;
	private static readonly string[] Roots = ["Assets", "NavigationAssets", "ThemeAssets"];
	private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

	internal sealed record Entry(string Path, long Length, string Sha256);
	internal sealed record Manifest(int SchemaVersion, string BundleId, Entry[] Files);
	private sealed record FileState(string Path, string ManifestHash, long SourceLength, long SourceWriteTicks,
		long TargetLength, long TargetWriteTicks, string VerifiedHash);
	private sealed record CacheState(int SchemaVersion, string BundleId, FileState[] Files);
	internal sealed class SyncResult
	{
		public bool UsedManifest { get; internal set; }
		public int FilesChecked { get; internal set; }
		public int FilesCopied { get; internal set; }
		public int FilesHashed { get; internal set; }
		public long DataBytesRead { get; internal set; }
		public long ManifestBytesRead { get; internal set; }
		public string? FallbackReason { get; internal set; }
	}

	internal static SyncResult Sync(string sourceRoot, string cacheRoot)
	{
		SyncResult result = new();
		sourceRoot = Path.GetFullPath(sourceRoot);
		cacheRoot = Path.GetFullPath(cacheRoot);
		string manifestPath = Path.Combine(sourceRoot, FileName);
		Manifest? manifest;
		try
		{
			FileInfo info = new(manifestPath);
			if (!info.Exists || info.Length > MaximumManifestBytes) throw new InvalidDataException("Manifest absent or too large.");
			byte[] bytes = File.ReadAllBytes(manifestPath);
			result.ManifestBytesRead += bytes.Length;
			manifest = JsonSerializer.Deserialize<Manifest>(bytes, JsonOptions);
			Validate(manifest);
			string[] actualFiles = EnumerateAssets(sourceRoot).OrderBy(path => path, StringComparer.Ordinal).ToArray();
			if (!actualFiles.SequenceEqual(manifest!.Files.Select(file => file.Path), StringComparer.Ordinal))
				throw new InvalidDataException("Installed asset list differs from its manifest.");
			foreach (Entry entry in manifest.Files)
			{
				EnsureSafeFilePath(sourceRoot, entry.Path);
				EnsureSafeFilePath(cacheRoot, entry.Path);
			}
		}
		catch (Exception error) when (error is IOException or InvalidDataException or UnauthorizedAccessException or JsonException or ArgumentException)
		{
			result.FallbackReason = error.Message;
			SyncWithoutManifest(sourceRoot, cacheRoot, result);
			return result;
		}

		Dictionary<string, FileState> previous = LoadState(cacheRoot);
		List<FileState> next = new();
		foreach (Entry entry in manifest!.Files)
		{
			string source = Path.Combine(sourceRoot, entry.Path);
			string target = Path.Combine(cacheRoot, entry.Path);
			FileInfo sourceInfo = new(source);
			FileInfo targetInfo = new(target);
			result.FilesChecked++;
			previous.TryGetValue(entry.Path, out FileState? prior);
			bool sourceUnchanged = prior is not null && prior.ManifestHash == entry.Sha256
				&& prior.SourceLength == sourceInfo.Length && prior.SourceWriteTicks == sourceInfo.LastWriteTimeUtc.Ticks;
			bool targetUnchanged = sourceUnchanged && targetInfo.Exists
				&& prior!.TargetLength == targetInfo.Length && prior.TargetWriteTicks == targetInfo.LastWriteTimeUtc.Ticks;
			string sourceHash = sourceUnchanged ? prior!.VerifiedHash : HashFile(source, result);
			if (!targetUnchanged && (!targetInfo.Exists || targetInfo.Length != sourceInfo.Length
				|| HashFile(target, result) != sourceHash))
			{
				CopyAsset(source, target, result);
				targetInfo.Refresh();
			}
			next.Add(new(entry.Path, entry.Sha256, sourceInfo.Length, sourceInfo.LastWriteTimeUtc.Ticks,
				targetInfo.Length, targetInfo.LastWriteTimeUtc.Ticks, sourceHash));
		}
		result.UsedManifest = true;
		SaveStateIfChanged(cacheRoot, new(SchemaVersion, manifest.BundleId, next.ToArray()));
		return result;
	}

	private static void Validate(Manifest? manifest)
	{
		if (manifest is null || manifest.SchemaVersion != SchemaVersion || !IsHash(manifest.BundleId)
			|| manifest.Files is null || manifest.Files.Length is < 1 or > 20000)
			throw new InvalidDataException("Unsupported UI asset manifest.");
		HashSet<string> paths = new(StringComparer.OrdinalIgnoreCase);
		foreach (Entry entry in manifest.Files)
		{
			if (entry is null || !IsAssetPath(entry.Path) || !paths.Add(entry.Path)
				|| entry.Length < 0 || !IsHash(entry.Sha256))
				throw new InvalidDataException("Invalid UI asset entry.");
		}
		if (!manifest.Files.Select(file => file.Path).SequenceEqual(
			manifest.Files.Select(file => file.Path).OrderBy(path => path, StringComparer.Ordinal)))
			throw new InvalidDataException("UI asset manifest is not canonical.");
		string canonical = string.Concat(manifest.Files.Select(file =>
			file.Path + "\t" + file.Length.ToString(CultureInfo.InvariantCulture) + "\t" + file.Sha256 + "\n"));
		if (Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical))).ToLowerInvariant() != manifest.BundleId)
			throw new InvalidDataException("UI asset manifest content ID does not match.");
	}

	private static bool IsHash(string? value) => value is { Length: 64 } && value.All(character =>
		character is >= '0' and <= '9' or >= 'a' and <= 'f');

	private static bool IsAssetPath(string? path)
	{
		if (string.IsNullOrEmpty(path) || path.Contains('\\') || path.Contains(':') || path.StartsWith('/')
			|| path.Split('/').Any(part => part.Length == 0 || part is "." or ".."
				|| part.EndsWith('.') || part.EndsWith(' ') || part.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)) return false;
		if (path.Equals("gold-coins.png", StringComparison.Ordinal)) return true;
		if (path.Equals("Assets/RecipeBook", StringComparison.OrdinalIgnoreCase)
			|| path.StartsWith("Assets/RecipeBook/", StringComparison.OrdinalIgnoreCase)) return false;
		return Roots.Any(root => path.StartsWith(root + "/", StringComparison.Ordinal));
	}

	private static void EnsureSafeFilePath(string root, string relative)
	{
		if (!IsAssetPath(relative)) throw new InvalidDataException("Unsafe UI asset path.");
		string full = Path.GetFullPath(Path.Combine(root, relative));
		if (!full.StartsWith(root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
			throw new InvalidDataException("UI asset path escaped its root.");
		string current = root;
		foreach (string part in relative.Split('/'))
		{
			current = Path.Combine(current, part);
			if ((File.Exists(current) || Directory.Exists(current))
				&& (File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0)
				throw new InvalidDataException("UI asset links are not supported.");
		}
	}

	private static IEnumerable<string> EnumerateAssets(string root)
	{
		foreach (string directory in Roots)
		{
			if (!Directory.Exists(Path.Combine(root, directory))) continue;
			foreach (string file in Visit(directory)) yield return file;
		}
		if (File.Exists(Path.Combine(root, "gold-coins.png"))) yield return "gold-coins.png";
		IEnumerable<string> Visit(string relative)
		{
			if (relative.Equals("Assets/RecipeBook", StringComparison.OrdinalIgnoreCase)) yield break;
			string absolute = Path.Combine(root, relative);
			if ((File.GetAttributes(absolute) & FileAttributes.ReparsePoint) != 0)
				throw new InvalidDataException("UI asset links are not supported.");
			foreach (string file in Directory.EnumerateFiles(absolute))
			{
				string path = relative + "/" + Path.GetFileName(file);
				EnsureSafeFilePath(root, path);
				yield return path;
			}
			foreach (string child in Directory.EnumerateDirectories(absolute))
				foreach (string file in Visit(relative + "/" + Path.GetFileName(child))) yield return file;
		}
	}

	private static Dictionary<string, FileState> LoadState(string root)
	{
		try
		{
			string statePath = Path.Combine(root, StateFileName);
			if (new FileInfo(statePath).Length > MaximumManifestBytes) return new(StringComparer.Ordinal);
			CacheState? state = JsonSerializer.Deserialize<CacheState>(File.ReadAllBytes(statePath), JsonOptions);
			if (state?.SchemaVersion != SchemaVersion || !IsHash(state.BundleId) || state.Files is null
				|| state.Files.Any(file => file is null || !IsAssetPath(file.Path)
					|| !IsHash(file.ManifestHash) || !IsHash(file.VerifiedHash))) return new(StringComparer.Ordinal);
			return state.Files.ToDictionary(file => file.Path, StringComparer.Ordinal);
		}
		catch (Exception error) when (error is IOException or UnauthorizedAccessException or JsonException or ArgumentException)
		{
			return new(StringComparer.Ordinal);
		}
	}

	private static void SaveStateIfChanged(string root, CacheState state)
	{
		string path = Path.Combine(root, StateFileName);
		byte[] bytes = JsonSerializer.SerializeToUtf8Bytes(state, JsonOptions);
		try
		{
			if (File.Exists(path) && File.ReadAllBytes(path).AsSpan().SequenceEqual(bytes)) return;
			Directory.CreateDirectory(root);
			string temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
			try { File.WriteAllBytes(temporary, bytes); File.Move(temporary, path, overwrite: true); }
			finally { if (File.Exists(temporary)) File.Delete(temporary); }
		}
		catch (Exception error) when (error is IOException or UnauthorizedAccessException)
		{
			// A read-only cache index must not make otherwise usable assets unavailable.
		}
	}

	private static string HashFile(string path, SyncResult result)
	{
		using FileStream stream = new(path, FileMode.Open, FileAccess.Read, FileShare.Read);
		result.FilesHashed++;
		result.DataBytesRead += stream.Length;
		return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
	}

	private static void CopyAsset(string source, string target, SyncResult result)
	{
		Directory.CreateDirectory(Path.GetDirectoryName(target)!);
		string temporary = target + "." + Guid.NewGuid().ToString("N") + ".tmp";
		try
		{
			File.Copy(source, temporary, overwrite: false);
			File.Move(temporary, target, overwrite: true);
			result.FilesCopied++;
			result.DataBytesRead += new FileInfo(source).Length;
		}
		finally { if (File.Exists(temporary)) File.Delete(temporary); }
	}

	private static void SyncWithoutManifest(string sourceRoot, string cacheRoot, SyncResult result)
	{
		// Missing/stale development manifests remain content-aware, including newly
		// added files. No manifest path is used by this compatibility fallback.
		foreach (string relative in EnumerateAssets(sourceRoot))
		{
			EnsureSafeFilePath(cacheRoot, relative);
			string source = Path.Combine(sourceRoot, relative);
			string target = Path.Combine(cacheRoot, relative);
			result.FilesChecked++;
			if (File.Exists(target) && new FileInfo(source).Length == new FileInfo(target).Length
				&& HashFile(source, result) == HashFile(target, result)) continue;
			CopyAsset(source, target, result);
		}
	}
}
