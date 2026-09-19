using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

/// <summary>
/// Persists the BDO Layout Editor's library independently from the game's
/// configuration files. The stored value is the editor's raw state object, not
/// an import/export envelope.
/// </summary>
internal sealed class LayoutEditorStore : IDisposable
{
	internal const int MaxStateBytes = 2 * 1024 * 1024;

	private const int MaxProfiles = 100;
	private const double PositionEpsilon = 1e-6;

	private static readonly JsonDocumentOptions DocumentOptions = new()
	{
		MaxDepth = 16
	};

	private readonly SemaphoreSlim operationGate = new(1, 1);
	private int disposed;

	/// <summary>
	/// Gets the primary layout library path. Its previous valid contents are
	/// retained by <see cref="AtomicFile"/> as <c>.bak</c> on replacement.
	/// </summary>
	public string Filename { get; }

	public string BackupFilename => Filename + ".bak";

	public LayoutEditorStore(string appDataRoot)
	{
		ArgumentException.ThrowIfNullOrWhiteSpace(appDataRoot);
		Filename = Path.Combine(
			Path.GetFullPath(appDataRoot),
			"LayoutEditor",
			"layouts.json");
	}

	/// <summary>
	/// Loads a validated editor state. A missing state file returns
	/// <see langword="null"/>. Invalid or corrupt data is intentionally retained
	/// and reported rather than repaired from a backup implicitly.
	/// </summary>
	public async Task<JsonElement?> LoadAsync(CancellationToken cancellationToken = default)
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
	/// Validates and atomically persists a complete editor state. The existing
	/// primary is validated before it can be replaced so a corrupt primary never
	/// rotates a known-good backup out of recovery.
	/// </summary>
	public async Task SaveAsync(JsonElement state, CancellationToken cancellationToken = default)
	{
		ThrowIfDisposed();
		await operationGate.WaitAsync(cancellationToken);
		try
		{
			ThrowIfDisposed();
			cancellationToken.ThrowIfCancellationRequested();
			Validate(state);

			// JsonElement already owns parsed JSON. Preserve its raw form instead of
			// serializing through an object model that could coerce numeric values.
			string json = state.GetRawText();
			if (Encoding.UTF8.GetByteCount(json) > MaxStateBytes)
			{
				throw Invalid("Layout data exceeds the 2 MiB limit.");
			}

			await LoadCoreAsync(cancellationToken);
			cancellationToken.ThrowIfCancellationRequested();
			await AtomicFile.WriteAllTextAsync(Filename, json, cancellationToken);
		}
		finally
		{
			operationGate.Release();
		}
	}

	private async Task<JsonElement?> LoadCoreAsync(CancellationToken cancellationToken)
	{
		FileStream stream;
		try
		{
			stream = new FileStream(
				Filename,
				FileMode.Open,
				FileAccess.Read,
				FileShare.Read,
				8192,
				FileOptions.Asynchronous | FileOptions.SequentialScan);
		}
		catch (FileNotFoundException)
		{
			return null;
		}
		catch (DirectoryNotFoundException)
		{
			return null;
		}

		await using (stream)
		{
			if (stream.Length > MaxStateBytes)
			{
				throw Invalid("Saved layout data exceeds the 2 MiB limit; the file was retained.");
			}

			using MemoryStream bytes = new();
			byte[] buffer = new byte[8192];
			while (true)
			{
				// Permit one byte beyond the maximum so growth after the initial
				// length check is detected without allocating unbounded memory.
				int maximumRead = (int)Math.Min(
					buffer.Length,
					MaxStateBytes - bytes.Length + 1);
				int count = await stream.ReadAsync(
					buffer.AsMemory(0, maximumRead),
					cancellationToken);
				if (count == 0)
				{
					break;
				}

				if (bytes.Length + count > MaxStateBytes)
				{
					throw Invalid("Saved layout data exceeds the 2 MiB limit; the file was retained.");
				}

				bytes.Write(buffer, 0, count);
			}

			try
			{
				using JsonDocument document = JsonDocument.Parse(
					bytes.GetBuffer().AsMemory(0, (int)bytes.Length),
					DocumentOptions);
				Validate(document.RootElement);
				return document.RootElement.Clone();
			}
			catch (JsonException exception)
			{
				throw new InvalidDataException(
					"Saved layout data is invalid JSON; the file was retained.",
					exception);
			}
		}
	}

	/// <summary>
	/// Mirrors the editor engine's strict state validation, including duplicate
	/// JSON-property rejection. It is intentionally callable by future bridge
	/// code before an apply workflow starts.
	/// </summary>
	internal static void Validate(JsonElement state)
	{
		Dictionary<string, JsonElement> root = Record(
			state,
			"layout data",
			"profiles",
			"active",
			"library",
			"editing");
		Dictionary<string, JsonElement> profiles = Record(root["profiles"], "profiles");
		if (profiles.Count < 3 || profiles.Count > MaxProfiles)
		{
			throw Invalid("There must be between 3 and 100 layouts.");
		}

		foreach (string id in profiles.Keys)
		{
			if (!ValidId(id))
			{
				throw Invalid("Invalid or reserved layout identity.");
			}
		}

		JsonElement active = Array(root["active"], "active presets", 3, 3);
		JsonElement library = Array(root["library"], "saved layouts", 0, MaxProfiles - 3);
		HashSet<string> assigned = new(StringComparer.Ordinal);
		foreach (JsonElement location in new[] { active, library })
		{
			foreach (JsonElement entry in location.EnumerateArray())
			{
				string? id = Text(entry);
				if (!ValidId(id) || !profiles.ContainsKey(id!))
				{
					throw Invalid("Unknown assigned layout.");
				}

				if (!assigned.Add(id!))
				{
					throw Invalid("A layout may occupy only one location.");
				}
			}
		}

		string? editing = Text(root["editing"]);
		if (!ValidId(editing) || !profiles.ContainsKey(editing!))
		{
			throw Invalid("Unknown editing layout.");
		}

		foreach (KeyValuePair<string, JsonElement> pair in profiles)
		{
			string id = pair.Key;
			Dictionary<string, JsonElement> profile = Record(
				pair.Value,
				"profile",
				"id",
				"name",
				"slots",
				"width",
				"height",
				"uiScale");
			if (Text(profile["id"]) != id || !ValidText(Text(profile["name"])))
			{
				throw Invalid("Invalid profile identity.");
			}

			if (!assigned.Contains(id))
			{
				throw Invalid("Every layout must occupy an active preset or library location.");
			}

			double width = Number(profile["width"]);
			double height = Number(profile["height"]);
			double scale = Number(profile["uiScale"]);
			if (!IntegerBetween(width, 800, 7680)
				|| !IntegerBetween(height, 600, 4320)
				|| !double.IsFinite(scale)
				|| scale < 50
				|| scale > 150)
			{
				throw Invalid("Invalid display settings.");
			}

			JsonElement slots = Array(profile["slots"], "slots", 40, 40);
			HashSet<string> slotIds = new(StringComparer.Ordinal);
			double size = 40 * scale / 100;
			foreach (JsonElement element in slots.EnumerateArray())
			{
				Dictionary<string, JsonElement> slot = Record(
					element,
					"slot",
					"id",
					"family",
					"number",
					"x",
					"y");
				string? family = Text(slot["family"]);
				double number = Number(slot["number"]);
				string? slotId = Text(slot["id"]);
				if ((family != "cd" && family != "quick") || !IntegerBetween(number, 1, 20))
				{
					throw Invalid("Invalid slot identity.");
				}

				string canonicalId = (family == "cd" ? "cd-" : "q-")
					+ ((int)number).ToString(System.Globalization.CultureInfo.InvariantCulture);
				if (slotId != canonicalId || !slotIds.Add(canonicalId))
				{
					throw Invalid("Invalid or duplicate slot identity.");
				}

				double x = Number(slot["x"]);
				double y = Number(slot["y"]);
				if (!double.IsFinite(x)
					|| !double.IsFinite(y)
					|| x < -PositionEpsilon
					|| y < -PositionEpsilon
					|| x + size > width + PositionEpsilon
					|| y + size > height + PositionEpsilon)
				{
					throw Invalid("Slot position is outside the layout viewport.");
				}
			}
		}
	}

	private static Dictionary<string, JsonElement> Record(
		JsonElement element,
		string label,
		params string[] keys)
	{
		if (element.ValueKind != JsonValueKind.Object)
		{
			throw Invalid($"Invalid {label} object.");
		}

		Dictionary<string, JsonElement> fields = new(StringComparer.Ordinal);
		int maximum = keys.Length > 0 ? keys.Length : MaxProfiles;
		foreach (JsonProperty property in element.EnumerateObject())
		{
			if (fields.Count >= maximum || !fields.TryAdd(property.Name, property.Value))
			{
				throw Invalid($"Extra or duplicate properties in {label}.");
			}
		}

		if (keys.Length > 0)
		{
			if (fields.Count != keys.Length)
			{
				throw Invalid($"Missing properties in {label}.");
			}

			foreach (string key in keys)
			{
				if (!fields.ContainsKey(key))
				{
					throw Invalid($"Unexpected properties in {label}.");
				}
			}
		}

		return fields;
	}

	private static JsonElement Array(JsonElement element, string label, int minimum, int maximum)
	{
		if (element.ValueKind != JsonValueKind.Array
			|| element.GetArrayLength() < minimum
			|| element.GetArrayLength() > maximum)
		{
			throw Invalid($"Invalid number of {label}.");
		}

		return element;
	}

	private static string? Text(JsonElement element) =>
		element.ValueKind == JsonValueKind.String ? element.GetString() : null;

	private static double Number(JsonElement element) =>
		element.ValueKind == JsonValueKind.Number && element.TryGetDouble(out double value)
			? value
			: double.NaN;

	private static bool IntegerBetween(double value, int minimum, int maximum) =>
		double.IsFinite(value)
		&& Math.Truncate(value) == value
		&& value >= minimum
		&& value <= maximum;

	private static bool ValidId(string? value) =>
		ValidText(value)
		&& value is not ("__proto__" or "prototype" or "constructor");

	private static bool ValidText(string? value)
	{
		if (string.IsNullOrEmpty(value)
			|| value.Length > 60
			|| JavaScriptWhitespace(value[0])
			|| JavaScriptWhitespace(value[^1]))
		{
			return false;
		}

		foreach (char character in value)
		{
			if (character <= '\u001f' || character == '\u007f')
			{
				return false;
			}
		}

		return true;
	}

	// ECMAScript String.trim() differs from .NET Trim() for U+0085 and U+FEFF.
	private static bool JavaScriptWhitespace(char value) =>
		value is >= '\u0009' and <= '\u000d'
		or '\u0020'
		or '\u00a0'
		or '\u1680'
		or >= '\u2000' and <= '\u200a'
		or '\u2028'
		or '\u2029'
		or '\u202f'
		or '\u205f'
		or '\u3000'
		or '\ufeff';

	private static InvalidDataException Invalid(string message) => new(message);

	private void ThrowIfDisposed()
	{
		if (Volatile.Read(ref disposed) != 0)
		{
			throw new ObjectDisposedException(nameof(LayoutEditorStore));
		}
	}

	public void Dispose()
	{
		// Leave the semaphore available for an in-flight asynchronous operation to
		// release during shutdown; it owns no unmanaged resource in this usage.
		Interlocked.Exchange(ref disposed, 1);
	}
}
