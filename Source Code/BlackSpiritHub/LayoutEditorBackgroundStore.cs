using System;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

/// <summary>
/// Stores the Layout Editor's optional personal background separately from the
/// shareable layout library. The value is either a canonical JPEG data URL or
/// <see langword="null"/> for the bundled default image.
/// </summary>
internal sealed class LayoutEditorBackgroundStore : IDisposable
{
	internal const int MaxDataUrlLength = 4 * 1024 * 1024;

	private const string JpegPrefix = "data:image/jpeg;base64,";
	private static readonly JsonDocumentOptions DocumentOptions = new()
	{
		MaxDepth = 4
	};

	private readonly SemaphoreSlim operationGate = new(1, 1);
	private int disposed;

	public string Filename { get; }

	public LayoutEditorBackgroundStore(string appDataRoot)
	{
		ArgumentException.ThrowIfNullOrWhiteSpace(appDataRoot);
		Filename = Path.Combine(
			Path.GetFullPath(appDataRoot),
			"LayoutEditor",
			"background.json");
	}

	/// <summary>
	/// Loads the saved personal background. A missing preference is equivalent to
	/// the bundled default. Invalid data is retained and reported, never reset.
	/// </summary>
	public async Task<string?> LoadAsync(CancellationToken cancellationToken = default)
	{
		ThrowIfDisposed();
		await operationGate.WaitAsync(cancellationToken);
		try
		{
			ThrowIfDisposed();
			return await LoadCoreAsync(cancellationToken);
		}
		finally
		{
			operationGate.Release();
		}
	}

	/// <summary>
	/// Atomically saves a validated JPEG data URL, or <see langword="null"/> to
	/// restore the bundled default background.
	/// </summary>
	public async Task SaveAsync(string? dataUrl, CancellationToken cancellationToken = default)
	{
		ThrowIfDisposed();
		string serialized = Encode(dataUrl);
		await operationGate.WaitAsync(cancellationToken);
		try
		{
			ThrowIfDisposed();
			cancellationToken.ThrowIfCancellationRequested();
			await WriteAtomicallyAsync(Filename, serialized, cancellationToken);
		}
		finally
		{
			operationGate.Release();
		}
	}

	/// <summary>
	/// Validates a renderer-provided background before it can reach disk.
	/// </summary>
	internal static void Validate(string? dataUrl)
	{
		_ = Encode(dataUrl);
	}

	private async Task<string?> LoadCoreAsync(CancellationToken cancellationToken)
	{
		string json;
		try
		{
			json = await ReadBoundedUtf8Async(
				Filename,
				MaxDataUrlLength + 3,
				cancellationToken);
		}
		catch (FileNotFoundException)
		{
			return null;
		}
		catch (DirectoryNotFoundException)
		{
			return null;
		}
		catch (Exception error) when (error is IOException
			or UnauthorizedAccessException
			or DecoderFallbackException
			or InvalidDataException)
		{
			throw Invalid(
				"Could not load the saved background. Its file was kept. " + error.Message,
				error);
		}

		try
		{
			using JsonDocument document = JsonDocument.Parse(json, DocumentOptions);
			string? value = document.RootElement.ValueKind switch
			{
				JsonValueKind.Null => null,
				JsonValueKind.String => document.RootElement.GetString(),
				_ => throw Invalid("Saved background must be a JPEG data URL or null.")
			};
			Validate(value);
			return value;
		}
		catch (Exception error) when (error is JsonException or InvalidDataException)
		{
			throw Invalid(
				"Could not load the saved background. Its file was kept. " + error.Message,
				error);
		}
	}

	private static string Encode(string? dataUrl)
	{
		if (dataUrl is null)
		{
			return "null\n";
		}

		if (!dataUrl.StartsWith(JpegPrefix, StringComparison.Ordinal))
		{
			throw Invalid("Choose a JPEG background image or reset the background.");
		}

		if (dataUrl.Length > MaxDataUrlLength)
		{
			throw Invalid("The encoded background exceeds the 4 MiB limit. Choose a smaller image.");
		}

		string base64 = dataUrl[JpegPrefix.Length..];
		if (!IsCanonicalBase64(base64, out byte[]? bytes)
			|| bytes.Length < 6
			|| bytes[0] != 0xff
			|| bytes[1] != 0xd8
			|| bytes[2] != 0xff
			|| bytes[^2] != 0xff
			|| bytes[^1] != 0xd9)
		{
			throw Invalid("The background contains invalid JPEG image data.");
		}

		return JsonSerializer.Serialize(dataUrl) + "\n";
	}

	private static bool IsCanonicalBase64(string base64, out byte[]? bytes)
	{
		bytes = null;
		if (base64.Length == 0 || base64.Length % 4 != 0)
		{
			return false;
		}

		int paddingStart = base64.IndexOf('=');
		int encodedDataLength = paddingStart < 0 ? base64.Length : paddingStart;
		if (paddingStart >= 0)
		{
			int paddingLength = base64.Length - paddingStart;
			if (paddingLength > 2)
			{
				return false;
			}

			for (int index = paddingStart; index < base64.Length; index++)
			{
				if (base64[index] != '=')
				{
					return false;
				}
			}
		}

		for (int index = 0; index < encodedDataLength; index++)
		{
			char character = base64[index];
			if (!(character is >= 'A' and <= 'Z'
				or >= 'a' and <= 'z'
				or >= '0' and <= '9'
				or '+' or '/'))
			{
				return false;
			}
		}

		byte[] decoded = new byte[checked(base64.Length / 4 * 3)];
		if (!Convert.TryFromBase64String(base64, decoded, out int written)
			|| !string.Equals(
				Convert.ToBase64String(decoded, 0, written),
				base64,
				StringComparison.Ordinal))
		{
			return false;
		}

		bytes = decoded.AsSpan(0, written).ToArray();
		return true;
	}

	private static async Task<string> ReadBoundedUtf8Async(
		string path,
		int maximumBytes,
		CancellationToken cancellationToken)
	{
		await using FileStream stream = new(
			path,
			FileMode.Open,
			FileAccess.Read,
			FileShare.Read,
			8192,
			FileOptions.Asynchronous | FileOptions.SequentialScan);
		if (stream.Length > maximumBytes)
		{
			throw Invalid("Saved background exceeds the 4 MiB limit.");
		}

		using MemoryStream bytes = new();
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
				throw Invalid("Saved background exceeds the 4 MiB limit.");
			}

			bytes.Write(buffer, 0, count);
		}

		return new UTF8Encoding(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true)
			.GetString(bytes.GetBuffer(), 0, (int)bytes.Length);
	}

	private static async Task WriteAtomicallyAsync(
		string filename,
		string contents,
		CancellationToken cancellationToken)
	{
		string? directory = Path.GetDirectoryName(filename);
		if (string.IsNullOrWhiteSpace(directory))
		{
			throw new InvalidOperationException("The background storage path does not have a parent directory.");
		}

		Directory.CreateDirectory(directory);
		string temporaryPath = Path.Combine(
			directory,
			"." + Path.GetFileName(filename) + "." + Guid.NewGuid().ToString("N") + ".tmp");
		try
		{
			byte[] bytes = Encoding.UTF8.GetBytes(contents);
			await using (FileStream stream = new(
				temporaryPath,
				FileMode.CreateNew,
				FileAccess.Write,
				FileShare.None,
				4096,
				FileOptions.Asynchronous | FileOptions.WriteThrough))
			{
				await stream.WriteAsync(bytes, cancellationToken);
				await stream.FlushAsync(cancellationToken);
				stream.Flush(flushToDisk: true);
			}

			if (File.Exists(filename))
			{
				File.Replace(
					temporaryPath,
					filename,
					destinationBackupFileName: null,
					ignoreMetadataErrors: true);
			}
			else
			{
				File.Move(temporaryPath, filename);
			}
		}
		finally
		{
			try
			{
				if (File.Exists(temporaryPath))
				{
					File.Delete(temporaryPath);
				}
			}
			catch
			{
				// Preserve the primary background preference if temporary cleanup
				// itself encounters a transient filesystem error.
			}
		}
	}

	private static InvalidDataException Invalid(string message, Exception? innerException = null) =>
		new(message, innerException);

	private void ThrowIfDisposed()
	{
		if (Volatile.Read(ref disposed) != 0)
		{
			throw new ObjectDisposedException(nameof(LayoutEditorBackgroundStore));
		}
	}

	public void Dispose()
	{
		Interlocked.Exchange(ref disposed, 1);
	}
}
