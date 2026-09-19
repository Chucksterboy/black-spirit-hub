using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal sealed record BdoAccountCandidate(
	string id,
	string label,
	string path,
	string modifiedAt);

internal sealed record BdoDiscovery(
	string documentsPath,
	BdoAccountCandidate[] candidates,
	[property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? lastAccountId);

/// <summary>
/// Identifies an exact BDO settings file. The hash is lowercase SHA-256 over
/// the source file's original bytes, including any encoding marker, so a future
/// save-and-apply bridge can reject a stale renderer request.
/// </summary>
internal sealed record BdoReadSource(
	string id,
	string label,
	string path,
	string modifiedAt,
	string documentsPath,
	string hash);

internal sealed record BdoReadResult(
	string xml,
	string gameOptionsText,
	BdoReadSource source);

/// <summary>
/// Reads only the fixed Black Desert settings locations in the current user's
/// configured Documents folder. It does not accept renderer-provided paths.
/// </summary>
internal sealed class BdoDocumentsReader : IDisposable
{
	internal const int MaximumXmlBytes = 20 * 1024 * 1024;
	internal const int MaximumOptionsBytes = 1024 * 1024;

	private const int MaximumPreferenceBytes = 4096;
	private const int MaximumAccountIdLength = 30;

	private readonly string documentsPath;
	private readonly string blackDesertPath;
	private readonly string userCachePath;
	private readonly string gameOptionsPath;
	private readonly string preferencesPath;
	private readonly SemaphoreSlim operationGate = new(1, 1);
	private int disposed;

	public string DocumentsPath => documentsPath;

	public string PreferenceFilename => preferencesPath;

	public BdoDocumentsReader(string appDataRoot)
		: this(
			appDataRoot,
			Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments))
	{
	}

	// Tests and native integration smoke checks may supply an isolated
	// redirected Documents fixture. No renderer-facing method accepts this path.
	internal BdoDocumentsReader(string appDataRoot, string documentsPath)
	{
		ArgumentException.ThrowIfNullOrWhiteSpace(appDataRoot);
		ArgumentException.ThrowIfNullOrWhiteSpace(documentsPath);

		this.documentsPath = Path.GetFullPath(documentsPath);
		blackDesertPath = Path.Combine(this.documentsPath, "Black Desert");
		userCachePath = Path.Combine(blackDesertPath, "UserCache");
		gameOptionsPath = Path.Combine(blackDesertPath, "GameOption.txt");
		preferencesPath = Path.Combine(
			Path.GetFullPath(appDataRoot),
			"LayoutEditor",
			"bdo-preferences.json");
	}

	/// <summary>
	/// Lists direct numeric account folders whose regular <c>gamevariable.xml</c>
	/// files are safely located under the configured Documents folder.
	/// </summary>
	public async Task<BdoDiscovery> DiscoverAsync(CancellationToken cancellationToken = default)
	{
		ThrowIfDisposed();
		await operationGate.WaitAsync(cancellationToken);
		try
		{
			ThrowIfDisposed();
			List<BdoAccountCandidate> candidates = new();
			DirectoryInfo cache = new(userCachePath);
			cache.Refresh();
			if (cache.Exists)
			{
				EnsureNonLinkDirectory(new DirectoryInfo(blackDesertPath), "Black Desert");
				EnsureNonLinkDirectory(cache, "Black Desert UserCache");
				foreach (string path in Directory.EnumerateDirectories(
					userCachePath,
					"*",
					SearchOption.TopDirectoryOnly))
				{
					cancellationToken.ThrowIfCancellationRequested();
					DirectoryInfo account = new(path);
					account.Refresh();
					if (!account.Exists || !ValidAccountId(account.Name) || IsLink(account))
					{
						continue;
					}

					FileInfo file = new(Path.Combine(account.FullName, "gamevariable.xml"));
					file.Refresh();
					if (!file.Exists || IsLink(file))
					{
						continue;
					}

					candidates.Add(Candidate(account.Name, file));
				}
			}

			BdoAccountCandidate[] ordered = candidates
				.OrderByDescending(candidate => candidate.modifiedAt, StringComparer.Ordinal)
				.ThenBy(candidate => candidate.id, StringComparer.Ordinal)
				.ToArray();
			string? remembered = await ReadPreferenceAsync(cancellationToken);
			if (!ordered.Any(candidate => candidate.id == remembered))
			{
				remembered = null;
			}

			return new BdoDiscovery(documentsPath, ordered, remembered);
		}
		finally
		{
			operationGate.Release();
		}
	}

	/// <summary>
	/// Reads a discovered account's XML and optional game options from their
	/// fixed paths. The returned source includes a byte-exact SHA-256 token.
	/// </summary>
	public async Task<BdoReadResult> ReadAsync(
		string accountId,
		CancellationToken cancellationToken = default)
	{
		if (!ValidAccountId(accountId))
		{
			throw new ArgumentException(
				"Choose a numeric BDO account ID from the discovered accounts.",
				nameof(accountId));
		}

		ThrowIfDisposed();
		await operationGate.WaitAsync(cancellationToken);
		try
		{
			ThrowIfDisposed();
			EnsureSafeUserCacheForRead();

			DirectoryInfo account = new(Path.Combine(userCachePath, accountId));
			account.Refresh();
			FileInfo xmlFile = new(Path.Combine(account.FullName, "gamevariable.xml"));
			xmlFile.Refresh();
			if (!account.Exists
				|| IsLink(account)
				|| !xmlFile.Exists
				|| IsLink(xmlFile))
			{
				throw new FileNotFoundException(
					"The selected BDO account no longer contains a regular gamevariable.xml file.");
			}

			BoundedText xml = await ReadBoundedTextAsync(
				xmlFile.FullName,
				MaximumXmlBytes,
				"gamevariable.xml",
				cancellationToken);

			string options = string.Empty;
			FileInfo optionsFile = new(gameOptionsPath);
			optionsFile.Refresh();
			if (optionsFile.Exists)
			{
				if (IsLink(optionsFile))
				{
					throw new InvalidDataException(
						"GameOption.txt must be a regular file in Black Desert's Documents folder.");
				}

				try
				{
					options = (await ReadBoundedTextAsync(
						optionsFile.FullName,
						MaximumOptionsBytes,
						"GameOption.txt",
						cancellationToken)).Text;
				}
				catch (FileNotFoundException)
				{
					// It is optional and may disappear between the existence check and
					// the bounded read while BDO is closing.
					options = string.Empty;
				}
			}

			EnsureSourceUnchanged(xmlFile.FullName, xml);
			BdoReadSource source = new(
				accountId,
				"Account " + accountId,
				xmlFile.FullName,
				xml.ModifiedAtUtc.ToString("O", CultureInfo.InvariantCulture),
				documentsPath,
				xml.Hash);

			// Remembering a picker choice is helpful but never changes the result of
			// a successful read when app-data storage is unavailable.
			try
			{
				await AtomicFile.WriteAllTextAsync(
					preferencesPath,
					JsonSerializer.Serialize(new { lastAccountId = accountId }),
					cancellationToken);
			}
			catch (Exception error) when (error is IOException or UnauthorizedAccessException)
			{
			}

			return new BdoReadResult(xml.Text, options, source);
		}
		finally
		{
			operationGate.Release();
		}
	}

	private async Task<string?> ReadPreferenceAsync(CancellationToken cancellationToken)
	{
		try
		{
			BoundedText preference = await ReadBoundedTextAsync(
				preferencesPath,
				MaximumPreferenceBytes,
				"Saved account preference",
				cancellationToken);
			using JsonDocument document = JsonDocument.Parse(
				preference.Text,
				new JsonDocumentOptions { MaxDepth = 4 });
			if (document.RootElement.ValueKind != JsonValueKind.Object
				|| !document.RootElement.TryGetProperty("lastAccountId", out JsonElement value)
				|| value.ValueKind != JsonValueKind.String)
			{
				return null;
			}

			string? id = value.GetString();
			return ValidAccountId(id) ? id : null;
		}
		catch (Exception error) when (error is IOException
			or UnauthorizedAccessException
			or JsonException
			or DecoderFallbackException
			or InvalidDataException)
		{
			return null;
		}
	}

	private void EnsureSafeUserCacheForRead()
	{
		DirectoryInfo blackDesert = new(blackDesertPath);
		DirectoryInfo cache = new(userCachePath);
		blackDesert.Refresh();
		cache.Refresh();
		if (!blackDesert.Exists || !cache.Exists)
		{
			throw new FileNotFoundException(
				"The selected BDO account no longer contains a regular gamevariable.xml file.");
		}

		EnsureNonLinkDirectory(blackDesert, "Black Desert");
		EnsureNonLinkDirectory(cache, "Black Desert UserCache");
	}

	private static void EnsureNonLinkDirectory(DirectoryInfo directory, string label)
	{
		directory.Refresh();
		if (!directory.Exists)
		{
			throw new DirectoryNotFoundException(label + " is no longer available.");
		}

		if (IsLink(directory))
		{
			throw new InvalidDataException(label + " must not be a symbolic link or junction.");
		}
	}

	private static void EnsureSourceUnchanged(string path, BoundedText source)
	{
		FileInfo current = new(path);
		current.Refresh();
		if (!current.Exists
			|| IsLink(current)
			|| current.Length != source.Length
			|| current.LastWriteTimeUtc != source.ModifiedAtUtc)
		{
			throw new IOException(
				"gamevariable.xml changed while being read. Try loading the presets again.");
		}
	}

	private static BdoAccountCandidate Candidate(string id, FileInfo file) => new(
		id,
		"Account " + id,
		file.FullName,
		file.LastWriteTimeUtc.ToString("O", CultureInfo.InvariantCulture));

	private static bool ValidAccountId(string? id)
	{
		if (string.IsNullOrEmpty(id) || id.Length > MaximumAccountIdLength)
		{
			return false;
		}

		foreach (char character in id)
		{
			if (character is < '0' or > '9')
			{
				return false;
			}
		}

		return true;
	}

	// LinkTarget detects symbolic links and junctions without treating an
	// ordinary redirected Documents known folder or cloud placeholder as unsafe.
	private static bool IsLink(FileSystemInfo entry) =>
		!string.IsNullOrEmpty(entry.LinkTarget);

	private static async Task<BoundedText> ReadBoundedTextAsync(
		string path,
		int maximumBytes,
		string label,
		CancellationToken cancellationToken)
	{
		FileInfo before = new(path);
		before.Refresh();
		if (!before.Exists)
		{
			throw new FileNotFoundException(label + " is no longer available.", path);
		}

		if (IsLink(before))
		{
			throw new InvalidDataException(label + " must be a regular file.");
		}

		long lengthBefore = before.Length;
		DateTime modifiedBefore = before.LastWriteTimeUtc;
		if (lengthBefore > maximumBytes)
		{
			throw new InvalidDataException(
				label + " exceeds the " + DescribeLimit(maximumBytes) + " read limit.");
		}

		await using FileStream stream = new(
			path,
			FileMode.Open,
			FileAccess.Read,
			FileShare.ReadWrite | FileShare.Delete,
			8192,
			FileOptions.Asynchronous | FileOptions.SequentialScan);
		if (stream.Length > maximumBytes)
		{
			throw new InvalidDataException(
				label + " exceeds the " + DescribeLimit(maximumBytes) + " read limit.");
		}

		using MemoryStream bytes = new(capacity: (int)Math.Min(lengthBefore, maximumBytes));
		byte[] buffer = new byte[8192];
		while (true)
		{
			int maximumRead = (int)Math.Min(
				buffer.Length,
				maximumBytes - bytes.Length + 1);
			int count = await stream.ReadAsync(
				buffer.AsMemory(0, maximumRead),
				cancellationToken);
			if (count == 0)
			{
				break;
			}

			if (bytes.Length + count > maximumBytes)
			{
				throw new InvalidDataException(
					label + " exceeds the " + DescribeLimit(maximumBytes) + " read limit.");
			}

			bytes.Write(buffer, 0, count);
		}

		long lengthAfterHandleRead = stream.Length;
		FileInfo after = new(path);
		after.Refresh();
		if (!after.Exists
			|| IsLink(after)
			|| lengthAfterHandleRead != lengthBefore
			|| after.Length != lengthBefore
			|| after.LastWriteTimeUtc != modifiedBefore)
		{
			throw new IOException(
				label + " changed while being read. Try loading the presets again.");
		}

		byte[] content = bytes.ToArray();
		return new BoundedText(
			DecodeText(content),
			Convert.ToHexString(SHA256.HashData(content)).ToLowerInvariant(),
			modifiedBefore,
			lengthBefore);
	}

	private static string DecodeText(byte[] bytes)
	{
		if (bytes.Length >= 2 && bytes[0] == 0xff && bytes[1] == 0xfe)
		{
			return new UnicodeEncoding(
				bigEndian: false,
				byteOrderMark: false,
				throwOnInvalidBytes: true).GetString(bytes, 2, bytes.Length - 2);
		}

		if (bytes.Length >= 2 && bytes[0] == 0xfe && bytes[1] == 0xff)
		{
			return new UnicodeEncoding(
				bigEndian: true,
				byteOrderMark: false,
				throwOnInvalidBytes: true).GetString(bytes, 2, bytes.Length - 2);
		}

		int offset = bytes.Length >= 3
			&& bytes[0] == 0xef
			&& bytes[1] == 0xbb
			&& bytes[2] == 0xbf
			? 3
			: 0;
		return new UTF8Encoding(
			encoderShouldEmitUTF8Identifier: false,
			throwOnInvalidBytes: true).GetString(bytes, offset, bytes.Length - offset);
	}

	private static string DescribeLimit(int maximumBytes) =>
		maximumBytes % (1024 * 1024) == 0
			? (maximumBytes / (1024 * 1024)).ToString(CultureInfo.InvariantCulture) + " MiB"
			: maximumBytes.ToString("N0", CultureInfo.InvariantCulture) + " bytes";

	private void ThrowIfDisposed()
	{
		if (Volatile.Read(ref disposed) != 0)
		{
			throw new ObjectDisposedException(nameof(BdoDocumentsReader));
		}
	}

	public void Dispose()
	{
		Interlocked.Exchange(ref disposed, 1);
	}

	private sealed record BoundedText(
		string Text,
		string Hash,
		DateTime ModifiedAtUtc,
		long Length);
}
