using System;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
#if BLACK_SPIRIT_HUB_STORE
using Windows.ApplicationModel;
#endif

namespace BlackSpiritHub;

/// <summary>
/// Reads the public Store-release announcement from the BSHub Worker. The
/// announcement is deliberately advisory: only StoreContext decides whether a
/// package can actually be installed on this device.
/// </summary>
internal sealed record MicrosoftStoreUpdateAnnouncement(
	Version PackageVersion,
	string PackageVersionText);

internal static class MicrosoftStoreUpdateManifest
{
	private const string AssemblyMetadataKey = "MicrosoftStoreUpdateManifestUrl";
	private const int ManifestSchemaVersion = 1;
	private const int MaximumManifestBytes = 4 * 1024;
#if BLACK_SPIRIT_HUB_STORE
	private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(5);
	private static readonly HttpClient Client = CreateClient();
	private static readonly SemaphoreSlim CheckGate = new(1, 1);
	private static MicrosoftStoreUpdateAnnouncement? cachedAnnouncement;
	private static DateTimeOffset nextCheckUtc;

	internal static async Task<MicrosoftStoreUpdateAnnouncement?> GetLiveAnnouncementAsync(
		CancellationToken cancellationToken)
	{
		Uri? endpoint = ResolveConfiguredEndpoint();
		if (endpoint is null)
		{
			return null;
		}

		await CheckGate.WaitAsync(cancellationToken);
		try
		{
			if (DateTimeOffset.UtcNow < nextCheckUtc)
			{
				return cachedAnnouncement;
			}

			cachedAnnouncement = await FetchLiveAnnouncementAsync(endpoint, cancellationToken);
			nextCheckUtc = DateTimeOffset.UtcNow + CheckInterval;
			return cachedAnnouncement;
		}
		finally
		{
			CheckGate.Release();
		}
	}
#else
	internal static Task<MicrosoftStoreUpdateAnnouncement?> GetLiveAnnouncementAsync(
		CancellationToken cancellationToken)
	{
		return Task.FromResult<MicrosoftStoreUpdateAnnouncement?>(null);
	}
#endif

	internal static bool TryParseLiveAnnouncement(
		string? json,
		out MicrosoftStoreUpdateAnnouncement? announcement)
	{
		announcement = null;
		if (string.IsNullOrWhiteSpace(json) || json.Length > MaximumManifestBytes)
		{
			return false;
		}

		try
		{
			using JsonDocument document = JsonDocument.Parse(json);
			JsonElement root = document.RootElement;
			if (root.ValueKind != JsonValueKind.Object
				|| !root.TryGetProperty("schemaVersion", out JsonElement schemaVersion)
				|| !schemaVersion.TryGetInt32(out int schema)
				|| schema != ManifestSchemaVersion
				|| !HasExactString(root, "channel", "microsoft-store")
				|| !HasExactString(root, "availability", "live")
				|| !root.TryGetProperty("version", out JsonElement versionElement)
				|| versionElement.ValueKind != JsonValueKind.String)
			{
				return false;
			}

			string? rawVersion = versionElement.GetString();
			if (!TryParsePackageVersion(rawVersion, out Version? packageVersion))
			{
				return false;
			}

			announcement = new MicrosoftStoreUpdateAnnouncement(
				packageVersion,
				packageVersion.ToString(4));
			return true;
		}
		catch (JsonException)
		{
			return false;
		}
	}

	internal static Version? TryGetInstalledPackageVersion()
	{
#if BLACK_SPIRIT_HUB_STORE
		try
		{
			var version = Package.Current.Id.Version;
			return new Version(version.Major, version.Minor, version.Build, version.Revision);
		}
		catch
		{
			return null;
		}
#else
		return null;
#endif
	}

#if BLACK_SPIRIT_HUB_STORE
	private static async Task<MicrosoftStoreUpdateAnnouncement?> FetchLiveAnnouncementAsync(
		Uri endpoint,
		CancellationToken cancellationToken)
	{
		using CancellationTokenSource timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
		timeout.CancelAfter(TimeSpan.FromSeconds(5));
		try
		{
			using HttpRequestMessage request = new(HttpMethod.Get, endpoint);
			request.Headers.Accept.ParseAdd("application/json");
			using HttpResponseMessage response = await Client.SendAsync(
				request,
				HttpCompletionOption.ResponseHeadersRead,
				timeout.Token);
			if (!response.IsSuccessStatusCode
				|| response.Content.Headers.ContentLength is long length
					&& (length < 0 || length > MaximumManifestBytes))
			{
				return null;
			}

			string json = await response.Content.ReadAsStringAsync(timeout.Token);
			return TryParseLiveAnnouncement(json, out MicrosoftStoreUpdateAnnouncement? announcement)
				? announcement
				: null;
		}
		catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
		{
			throw;
		}
		catch
		{
			// A Worker announcement is optional. Keep Store update checks fully
			// functional while a network, service, or manifest problem is present.
			return null;
		}
	}

	private static Uri? ResolveConfiguredEndpoint()
	{
		string? configured = Assembly.GetExecutingAssembly()
			.GetCustomAttributes<AssemblyMetadataAttribute>()
			.FirstOrDefault(attribute => string.Equals(
				attribute.Key,
				AssemblyMetadataKey,
				StringComparison.Ordinal))
			?.Value;
		if (!Uri.TryCreate(configured, UriKind.Absolute, out Uri? endpoint)
			|| !IsValidEndpoint(endpoint))
		{
			return null;
		}
		return endpoint;
	}
#endif

	private static HttpClient CreateClient()
	{
		HttpClientHandler handler = new()
		{
			AllowAutoRedirect = false
		};
		return new HttpClient(handler)
		{
			Timeout = Timeout.InfiniteTimeSpan
		};
	}

	private static bool HasExactString(JsonElement root, string propertyName, string expected)
	{
		return root.TryGetProperty(propertyName, out JsonElement value)
			&& value.ValueKind == JsonValueKind.String
			&& string.Equals(value.GetString(), expected, StringComparison.Ordinal);
	}

	private static bool TryParsePackageVersion(string? rawVersion, out Version? packageVersion)
	{
		packageVersion = null;
		if (string.IsNullOrWhiteSpace(rawVersion))
		{
			return false;
		}

		string[] parts = rawVersion.Split('.', StringSplitOptions.None);
		if (parts.Length != 4)
		{
			return false;
		}

		int[] values = new int[4];
		for (int index = 0; index < values.Length; index++)
		{
			if (!ushort.TryParse(parts[index], out ushort value)
				|| !string.Equals(value.ToString(), parts[index], StringComparison.Ordinal))
			{
				return false;
			}
			values[index] = value;
		}

		packageVersion = new Version(values[0], values[1], values[2], values[3]);
		return true;
	}

	private static bool IsValidEndpoint(Uri endpoint)
	{
		return endpoint.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
			&& endpoint.IsDefaultPort
			&& endpoint.Host.EndsWith(".workers.dev", StringComparison.OrdinalIgnoreCase)
			&& endpoint.UserInfo.Length == 0
			&& endpoint.Query.Length == 0
			&& endpoint.Fragment.Length == 0
			&& endpoint.AbsolutePath.Equals("/status/update", StringComparison.Ordinal);
	}
}
