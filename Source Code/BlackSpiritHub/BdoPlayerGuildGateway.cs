using System;
using System.Linq;
using System.Reflection;

namespace BlackSpiritHub;

/// <summary>
/// Selects the transport for player and guild lookups. Direct installations
/// retain their existing BDO Alerts credential flow; Microsoft Store builds
/// use the public gateway endpoint embedded by the Store packaging step.
/// </summary>
internal readonly record struct BdoPlayerGuildRequestRoute(
	Uri RequestUri,
	bool RequiresBdoAlertsCredential);

internal static class BdoPlayerGuildGateway
{
	private const string AssemblyMetadataKey = "BdoPlayerGuildGatewayUrl";

	internal static BdoPlayerGuildRequestRoute Resolve(Uri upstreamEndpoint)
	{
		ArgumentNullException.ThrowIfNull(upstreamEndpoint);

#if BLACK_SPIRIT_HUB_STORE
		return RouteThroughGateway(upstreamEndpoint, ResolveConfiguredGatewayUri());
#else
		// Direct installations intentionally keep the exact BDO Alerts request
		// and X-API-Key behavior used before the Store edition existed.
		return new BdoPlayerGuildRequestRoute(upstreamEndpoint, true);
#endif
	}

	// Kept independent of the Store compile symbol so the offline suite can
	// prove that a routed request cannot carry the direct-service credential.
	internal static BdoPlayerGuildRequestRoute RouteThroughGatewayForTest(
		Uri upstreamEndpoint,
		Uri gatewayBaseUri)
	{
		ArgumentNullException.ThrowIfNull(upstreamEndpoint);
		ArgumentNullException.ThrowIfNull(gatewayBaseUri);
		return RouteThroughGateway(upstreamEndpoint, gatewayBaseUri);
	}

	private static BdoPlayerGuildRequestRoute RouteThroughGateway(
		Uri upstreamEndpoint,
		Uri gatewayBaseUri)
	{
		if (!IsSupportedPlayerGuildEndpoint(upstreamEndpoint))
		{
			throw new InvalidOperationException(
				"Player and guild lookup gateway received an unsupported endpoint.");
		}
		if (!IsValidGatewayBaseUri(gatewayBaseUri))
		{
			throw new InvalidOperationException(
				"Player and guild lookup gateway is not configured correctly.");
		}

		// The gateway contract deliberately mirrors BDO Alerts' approved
		// player/guild API paths. Keeping the exact escaped path and query avoids
		// turning the Worker into a generic URL proxy.
		Uri requestUri = new(gatewayBaseUri, upstreamEndpoint.PathAndQuery);
		return new BdoPlayerGuildRequestRoute(
			requestUri,
			RequiresBdoAlertsCredential: false);
	}

#if BLACK_SPIRIT_HUB_STORE
	private static Uri ResolveConfiguredGatewayUri()
	{
		string? configured = Assembly.GetExecutingAssembly()
			.GetCustomAttributes<AssemblyMetadataAttribute>()
			.FirstOrDefault(attribute => string.Equals(
				attribute.Key,
				AssemblyMetadataKey,
				StringComparison.Ordinal))
			?.Value;
		if (!Uri.TryCreate(configured, UriKind.Absolute, out Uri? gatewayBaseUri)
			|| !IsValidGatewayBaseUri(gatewayBaseUri))
		{
			throw new UnauthorizedAccessException(
				"Player and guild lookup gateway is not configured for this Store build.");
		}
		return gatewayBaseUri;
	}
#endif

	private static bool IsSupportedPlayerGuildEndpoint(Uri upstreamEndpoint)
	{
		return BdoAlertsApiCredentials.IsSupportedEndpoint(upstreamEndpoint)
			&& (upstreamEndpoint.AbsolutePath.StartsWith(
					"/api/player/",
					StringComparison.Ordinal)
				|| upstreamEndpoint.AbsolutePath.StartsWith(
					"/api/guild/",
					StringComparison.Ordinal));
	}

	private static bool IsValidGatewayBaseUri(Uri gatewayBaseUri)
	{
		return gatewayBaseUri.IsAbsoluteUri
			&& gatewayBaseUri.Scheme.Equals(
				Uri.UriSchemeHttps,
				StringComparison.OrdinalIgnoreCase)
			&& gatewayBaseUri.IsDefaultPort
			&& gatewayBaseUri.Host.Length > 0
			&& gatewayBaseUri.UserInfo.Length == 0
			&& gatewayBaseUri.Query.Length == 0
			&& gatewayBaseUri.Fragment.Length == 0
			&& gatewayBaseUri.AbsolutePath.Equals("/", StringComparison.Ordinal);
	}
}
