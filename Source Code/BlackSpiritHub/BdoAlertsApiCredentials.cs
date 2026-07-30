using System;
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
		if (!IsSupportedEndpoint(endpoint))
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
			|| endpoint.Query.Length != 0
			|| endpoint.Fragment.Length != 0)
		{
			return false;
		}

		string path = endpoint.AbsolutePath.TrimEnd('/');
		return path.Equals("/api/boss-schedule/eu", StringComparison.OrdinalIgnoreCase)
			|| path.Equals("/api/coupons", StringComparison.OrdinalIgnoreCase);
	}

	private static string? Normalize(string? value)
	{
		string candidate = value?.Trim() ?? string.Empty;
		return ApiKeyPattern.IsMatch(candidate) ? candidate : null;
	}
}
