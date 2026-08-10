using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Security;
using System.Text.RegularExpressions;

namespace BlackSpiritHub;

internal static class BdoAlertsApiCredentials
{
	internal const string EnvironmentVariableName = "BLACK_SPIRIT_HUB_BDOALERTS_API_KEY";
	private const string AssemblyMetadataKey = "BdoAlertsApiKey";

	private static readonly Regex ApiKeyPattern = new(
		@"^bdo_[A-Za-z0-9]{20,128}$",
		RegexOptions.CultureInvariant,
		TimeSpan.FromSeconds(1));

	private static readonly HashSet<string> PlayerGuildRegions = new(StringComparer.Ordinal)
	{
		"eu",
		"na",
		"kr",
		"sa",
		"asia"
	};

	internal static string? Resolve()
	{
		string? processValue = Normalize(
			Environment.GetEnvironmentVariable(EnvironmentVariableName));
		if (processValue is not null)
		{
			return processValue;
		}

		if (OperatingSystem.IsWindows())
		{
			try
			{
				string? userValue = Normalize(
					Environment.GetEnvironmentVariable(
						EnvironmentVariableName,
						EnvironmentVariableTarget.User));
				if (userValue is not null)
				{
					return userValue;
				}
			}
			catch (Exception ex) when (
				ex is SecurityException
				or UnauthorizedAccessException)
			{
			}
		}

		try
		{
			foreach (AssemblyMetadataAttribute metadata in Assembly
				.GetExecutingAssembly()
				.GetCustomAttributes<AssemblyMetadataAttribute>())
			{
				if (string.Equals(
						metadata.Key,
						AssemblyMetadataKey,
						StringComparison.Ordinal))
				{
					return Normalize(metadata.Value);
				}
			}
			return null;
		}
		catch (Exception ex) when (
			ex is InvalidOperationException
			or NotSupportedException)
		{
			return null;
		}
	}

	internal static bool TryApply(
		HttpRequestMessage request,
		Uri endpoint)
	{
		return TryApply(request, endpoint, Resolve());
	}

	internal static bool TryApply(
		HttpRequestMessage request,
		Uri endpoint,
		string? apiKey)
	{
		if (request.RequestUri is null
			|| !string.Equals(
				request.RequestUri.AbsoluteUri,
				endpoint.AbsoluteUri,
				StringComparison.Ordinal)
			|| !IsSupportedEndpoint(endpoint)
			|| !IsSupportedMethod(request.Method, endpoint))
		{
			return false;
		}

		string? resolved = Normalize(apiKey);
		if (resolved is null)
		{
			return false;
		}

		request.Headers.TryAddWithoutValidation("X-API-Key", resolved);
		return true;
	}

	internal static bool IsSupportedEndpoint(Uri endpoint)
	{
		if (!endpoint.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
			|| !endpoint.IsDefaultPort
			|| !endpoint.Host.Equals("api.bdoalerts.net", StringComparison.OrdinalIgnoreCase)
			|| endpoint.UserInfo.Length != 0
			|| endpoint.Fragment.Length != 0)
		{
			return false;
		}

		string path = endpoint.AbsolutePath;
		if (path.Equals("/api/boss-schedule/eu", StringComparison.Ordinal)
			|| path.Equals("/api/coupons", StringComparison.Ordinal))
		{
			return endpoint.Query.Length == 0;
		}

		if (path.Equals("/api/market/price-history", StringComparison.Ordinal))
		{
			return IsValidPriceHistoryQuery(endpoint.Query);
		}

		if (IsSupportedPlayerGuildEndpoint(endpoint))
		{
			return true;
		}

		return false;
	}

	private static bool IsSupportedPlayerGuildEndpoint(Uri endpoint)
	{
		string escapedPath = endpoint.GetComponents(
			UriComponents.Path,
			UriFormat.UriEscaped);
		string[] segments = escapedPath.Split('/', StringSplitOptions.None);
		if (segments.Length != 4
			|| !segments[0].Equals("api", StringComparison.Ordinal)
			|| (segments[1] != "player" && segments[1] != "guild"))
		{
			return false;
		}

		if (segments[2].Equals("search", StringComparison.Ordinal))
		{
			return PlayerGuildRegions.Contains(segments[3])
				&& TryParseQuery(endpoint.Query, out IReadOnlyDictionary<string, string> values)
				&& values.Count == 1
				&& values.TryGetValue("query", out string? query)
				&& IsSafeLookupText(query, minimumLength: 2);
		}

		if (!PlayerGuildRegions.Contains(segments[2]))
		{
			return false;
		}

		string name;
		try
		{
			name = Uri.UnescapeDataString(segments[3]);
		}
		catch (UriFormatException)
		{
			return false;
		}
		if (!Uri.EscapeDataString(name).Equals(segments[3], StringComparison.Ordinal)
			|| !IsSafeLookupText(name, minimumLength: 1))
		{
			return false;
		}

		return endpoint.Query.Length == 0
			|| (segments[1].Equals("player", StringComparison.Ordinal)
				&& IsValidPlayerProfileTargetQuery(endpoint.Query));
	}

	private static bool IsValidPlayerProfileTargetQuery(string query)
	{
		const string prefix = "?profile_target=";
		const string forceRefreshSuffix = "&force_refresh=true";
		if (!query.StartsWith(prefix, StringComparison.Ordinal))
		{
			return false;
		}

		string escapedValue = query[prefix.Length..];
		if (escapedValue.EndsWith(forceRefreshSuffix, StringComparison.Ordinal))
		{
			escapedValue = escapedValue[..^forceRefreshSuffix.Length];
		}
		if (escapedValue.Length == 0 || escapedValue.Contains('&'))
		{
			return false;
		}

		string value;
		try
		{
			value = Uri.UnescapeDataString(escapedValue);
		}
		catch (UriFormatException)
		{
			return false;
		}

		return Uri.EscapeDataString(value).Equals(escapedValue, StringComparison.Ordinal)
			&& value.Length is > 0 and <= 2048
			&& !value.Any(character => char.IsControl(character) || char.IsSurrogate(character));
	}

	private static bool IsSafeLookupText(string value, int minimumLength)
	{
		return value.Length >= minimumLength
			&& value.Length <= 64
			&& value.Equals(value.Trim(), StringComparison.Ordinal)
			&& !value.Any(character =>
				char.IsControl(character)
				|| char.IsSurrogate(character)
				|| character is '/' or '\\' or '?' or '#' or '%' or '&' or '=');
	}

	private static bool IsSupportedMethod(HttpMethod method, Uri endpoint)
	{
		return method == HttpMethod.Get
			&& IsSupportedEndpoint(endpoint);
	}

	private static bool IsValidPriceHistoryQuery(string query)
	{
		if (!TryParseQuery(query, out IReadOnlyDictionary<string, string> values)
			|| values.Count != 3
			|| !values.TryGetValue("item_ids", out string? rawIds)
			|| !values.TryGetValue("region", out string? region)
			|| !values.TryGetValue("days", out string? rawDays)
			|| !region.Equals("eu", StringComparison.Ordinal)
			|| !int.TryParse(rawDays, NumberStyles.None, CultureInfo.InvariantCulture, out int days)
			|| days is < 1 or > 30)
		{
			return false;
		}

		string[] ids = rawIds.Split(',', StringSplitOptions.None);
		return ids.Length is > 0 and <= 100
			&& ids.All(value => long.TryParse(
				value,
				NumberStyles.None,
				CultureInfo.InvariantCulture,
				out long id) && id > 0)
			&& ids.Distinct(StringComparer.Ordinal).Count() == ids.Length;
	}

	private static bool TryParseQuery(
		string query,
		out IReadOnlyDictionary<string, string> values)
	{
		Dictionary<string, string> parsed = new(StringComparer.Ordinal);
		values = parsed;
		if (string.IsNullOrEmpty(query) || query[0] != '?')
		{
			return false;
		}

		foreach (string pair in query[1..].Split('&', StringSplitOptions.None))
		{
			int separator = pair.IndexOf('=');
			if (separator <= 0 || separator == pair.Length - 1)
			{
				return false;
			}

			string key;
			string value;
			try
			{
				key = Uri.UnescapeDataString(pair[..separator]);
				value = Uri.UnescapeDataString(pair[(separator + 1)..]);
			}
			catch (UriFormatException)
			{
				return false;
			}
			if (key.Length == 0
				|| value.Length == 0
				|| !parsed.TryAdd(key, value))
			{
				return false;
			}
		}

		return parsed.Count > 0;
	}

	private static string? Normalize(string? value)
	{
		string candidate = value?.Trim() ?? string.Empty;
		return ApiKeyPattern.IsMatch(candidate) ? candidate : null;
	}
}
