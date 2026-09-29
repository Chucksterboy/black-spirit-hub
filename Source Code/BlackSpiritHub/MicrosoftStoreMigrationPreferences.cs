using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;

namespace BlackSpiritHub;

/// <summary>
/// Carries only app-owned browser preferences from the final unpackaged build
/// to the Store package. A WebView profile contains process locks and browser
/// internals, so it is deliberately not copied wholesale.
/// </summary>
internal static class MicrosoftStoreMigrationPreferences
{
	internal const string FileName = "store-migration-preferences.json";

	private const int SchemaVersion = 1;
	private const int MaximumPayloadBytes = 2 * 1024 * 1024;
	private const int MaximumPreferenceCount = 500;
	private const int MaximumKeyLength = 160;
	private const int MaximumValueLength = 256 * 1024;
	private static readonly string PreviousPreferencePrefix = string.Concat("bdo", "Multi", "Tool.");

	private static readonly JsonDocumentOptions DocumentOptions = new()
	{
		MaxDepth = 8
	};

	internal static int Save(string appDataRoot, JsonElement preferences)
	{
		SortedDictionary<string, string> validated = ReadPreferences(preferences);
		string json = JsonSerializer.Serialize(new MigrationPayload(SchemaVersion, validated));
		if (Encoding.UTF8.GetByteCount(json) > MaximumPayloadBytes)
		{
			throw new InvalidDataException("Saved interface preferences are too large to move to Microsoft Store.");
		}

		AtomicFile.WriteAllText(Path.Combine(Path.GetFullPath(appDataRoot), FileName), json);
		return validated.Count;
	}

	internal static string? BuildDocumentCreatedScript(string appDataRoot, string localAppOrigin)
	{
		if (!TryRead(appDataRoot, out SortedDictionary<string, string>? preferences)
			|| preferences.Count == 0)
		{
			return null;
		}

		string originJson = JsonSerializer.Serialize(localAppOrigin);
		string preferencesJson = JsonSerializer.Serialize(preferences);
		return "(() => {"
			+ "if (globalThis.location?.origin !== " + originJson + ") return;"
			+ "const values = " + preferencesJson + ";"
			+ "try { for (const [key, value] of Object.entries(values)) {"
			+ "if (typeof key === 'string' && typeof value === 'string' && localStorage.getItem(key) === null) { localStorage.setItem(key, value); }"
			+ "} } catch (_) { }"
			+ "})();";
	}

	private static bool TryRead(string appDataRoot, out SortedDictionary<string, string> preferences)
	{
		preferences = new SortedDictionary<string, string>(StringComparer.Ordinal);
		string path = Path.Combine(Path.GetFullPath(appDataRoot), FileName);
		try
		{
			FileInfo file = new(path);
			if (!file.Exists || file.Length <= 0 || file.Length > MaximumPayloadBytes)
			{
				return false;
			}

			using JsonDocument document = JsonDocument.Parse(File.ReadAllText(path, Encoding.UTF8), DocumentOptions);
			if (document.RootElement.ValueKind != JsonValueKind.Object
				|| !document.RootElement.TryGetProperty("schemaVersion", out JsonElement schema)
				|| schema.ValueKind != JsonValueKind.Number
				|| !schema.TryGetInt32(out int version)
				|| version != SchemaVersion
				|| !document.RootElement.TryGetProperty("preferences", out JsonElement value))
			{
				return false;
			}

			preferences = ReadPreferences(value);
			return true;
		}
		catch (Exception error) when (error is IOException or UnauthorizedAccessException or JsonException or InvalidDataException)
		{
			return false;
		}
	}

	private static SortedDictionary<string, string> ReadPreferences(JsonElement value)
	{
		if (value.ValueKind != JsonValueKind.Object)
		{
			throw new InvalidDataException("Saved interface preferences are invalid.");
		}

		SortedDictionary<string, string> result = new(StringComparer.Ordinal);
		foreach (JsonProperty property in value.EnumerateObject())
		{
			if (result.Count >= MaximumPreferenceCount
				|| property.Name.Length == 0
				|| property.Name.Length > MaximumKeyLength
				|| !IsAppPreferenceKey(property.Name)
				|| property.Value.ValueKind != JsonValueKind.String)
			{
				throw new InvalidDataException("Saved interface preferences are invalid.");
			}

			string preferenceValue = property.Value.GetString() ?? string.Empty;
			if (preferenceValue.Length > MaximumValueLength)
			{
				throw new InvalidDataException("Saved interface preferences are too large to move to Microsoft Store.");
			}
			result[property.Name] = preferenceValue;
		}

		return result;
	}

	private static bool IsAppPreferenceKey(string key)
	{
		return key.StartsWith("blackSpiritHub.", StringComparison.Ordinal)
			|| key.StartsWith(PreviousPreferencePrefix, StringComparison.Ordinal)
			|| key.Equals("bdoFontFavorites", StringComparison.Ordinal)
			|| key.Equals("bdoTradeCalculatorAppearance", StringComparison.Ordinal)
			|| key.Equals("bsh.uiRefresh.navigation.v1", StringComparison.Ordinal);
	}

	private sealed record MigrationPayload(int schemaVersion, IReadOnlyDictionary<string, string> preferences);
}
