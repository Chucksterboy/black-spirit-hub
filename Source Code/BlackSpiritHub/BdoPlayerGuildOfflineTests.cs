using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal static class BdoPlayerGuildOfflineTests
{
	internal static async Task<int> RunAsync(string stateRoot, AppLogger logger)
	{
		string fakeApiKey = "bdo_" + new string('G', 28);
		string root = Path.Combine(stateRoot, "player-guild-cache-test");
		AppPaths paths = AppPaths.CreateAt(root);
		paths.EnsureDirectories();
		DateTimeOffset now = new(2026, 8, 10, 4, 0, 0, TimeSpan.Zero);

		using PlayerGuildStubHandler handler = new(fakeApiKey);
		using (BdoPlayerGuildService service = new(
			paths,
			logger,
			handler,
			fakeApiKey,
			() => now))
		{
			BdoPlayerGuildSearchResponse playerSearch = await service.SearchAsync(
				"player",
				"EU",
				"Psyko",
				CancellationToken.None);
			BdoPlayerGuildSearchResponse cachedPlayerSearch = await service.SearchAsync(
				"player",
				"eu",
				"Psyko",
				CancellationToken.None);
			string serializedPlayerSearch = JsonSerializer.Serialize(playerSearch);
			if (playerSearch.Status != "LIVE"
				|| service.RequestTimeoutForTest != TimeSpan.FromSeconds(30)
				|| playerSearch.Players.Count != 1
				|| playerSearch.Guilds.Count != 0
				|| playerSearch.Players[0].MainCharacter?.Class != "Wizard"
				|| playerSearch.Players[0].ProfileTarget != "target-PsykoQT"
				|| serializedPlayerSearch.Contains("profileTarget", StringComparison.OrdinalIgnoreCase)
				|| serializedPlayerSearch.Contains("profile_target", StringComparison.OrdinalIgnoreCase)
				|| cachedPlayerSearch.Status != "CACHED"
				|| handler.PlayerSearchRequests != 1)
			{
				return 193;
			}

			BdoPlayerGuildSearchResponse guildSearch = await service.SearchAsync(
				"guild",
				"eu",
				"Luminous",
				CancellationToken.None);
			if (guildSearch.Status != "LIVE"
				|| guildSearch.Players.Count != 0
				|| guildSearch.Guilds.Single().MemberCount != 2
				|| handler.GuildSearchRequests != 1)
			{
				return 194;
			}

			BdoGuildProfileResponse guild = await service.GetGuildProfileAsync(
				"eu",
				"Luminous",
				CancellationToken.None);
			BdoGuildProfileResponse cachedGuild = await service.GetGuildProfileAsync(
				"eu",
				"Luminous",
				CancellationToken.None);
			BdoGuildProfileResponse reloadedGuild = await service.GetGuildProfileAsync(
				"eu",
				"Luminous",
				CancellationToken.None,
				forceRefresh: true);
			if (guild.Members.Count != 4
				|| !guild.Members.SequenceEqual(["EmptyFamily", "PrivateFamily", "PsykoQT", "Thunvass"])
				|| guild.MembersDetailed.Count != 4
				|| guild.MembersDetailed.Any(member =>
					member.HasCachedProfile
					|| member.IsPrivate is not null
					|| member.MainCharacter is not null)
				|| cachedGuild.Status != "CACHED"
				|| reloadedGuild.Status != "LIVE"
				|| handler.GuildProfileRequests != 2
				|| handler.PlayerProfileRequests != 0
				|| handler.ForceRefreshQueryObserved)
			{
				return 195;
			}

			BdoPlayerProfileResponse player = await service.GetPlayerProfileAsync(
				"eu",
				"PsykoQT",
				CancellationToken.None);
			BdoPlayerProfileResponse cachedPlayer = await service.GetPlayerProfileAsync(
				"eu",
				"PsykoQT",
				CancellationToken.None);
			if (player.MaxGearScore != 809
				|| player.Energy != 481
				|| player.ContributionPoints != 415
				|| player.Characters.Count != 2
				|| player.Characters[0].Name != "HighestAlt"
				|| player.Characters[0].Level != 68
				|| player.Characters[0].IsMain
				|| player.Characters[1].Name != "PsykoQT"
				|| !player.Characters[1].IsMain
				|| player.LifeSkills.Single().Name != "Fishing"
				|| player.LifeSkills.Single().Rank != "Guru"
				|| player.LifeSkills.Single().Mastery != 1345
				|| player.IsPrivate != false
				|| player.IsComplete != true
				|| cachedPlayer.Status != "CACHED"
				|| handler.PlayerProfileRequests != 1)
			{
				return 196;
			}

			BdoPlayerProfileResponse privatePlayer = await service.GetPlayerProfileAsync(
				"eu",
				"PrivateFamily",
				CancellationToken.None);
			BdoPlayerProfileResponse emptyPlayer = await service.GetPlayerProfileAsync(
				"eu",
				"EmptyFamily",
				CancellationToken.None);
			if (privatePlayer.IsPrivate != true
				|| privatePlayer.IsComplete != false
				|| privatePlayer.Characters.Count != 2
				|| privatePlayer.Characters.Any(character => character.Level.HasValue)
				|| emptyPlayer.IsPrivate is not null
				|| emptyPlayer.IsComplete is not null
				|| handler.PlayerProfileRequests != 3)
			{
				return 203;
			}

			BdoGuildProfileResponse enrichedGuild = await service.GetGuildProfileAsync(
				"eu",
				"Luminous",
				CancellationToken.None);
			BdoGuildMemberSummary publicMember = enrichedGuild.MembersDetailed
				.Single(member => member.FamilyName == "PsykoQT");
			BdoGuildMemberSummary privateMember = enrichedGuild.MembersDetailed
				.Single(member => member.FamilyName == "PrivateFamily");
			BdoGuildMemberSummary unknownMember = enrichedGuild.MembersDetailed
				.Single(member => member.FamilyName == "EmptyFamily");
			BdoGuildMemberSummary unavailableMember = enrichedGuild.MembersDetailed
				.Single(member => member.FamilyName == "Thunvass");
			if (!publicMember.HasCachedProfile
				|| publicMember.IsPrivate != false
				|| publicMember.MainCharacter?.Name != "PsykoQT"
				|| publicMember.MainCharacter?.Class != "Wizard"
				|| publicMember.MainCharacter?.Level != 67
				|| !privateMember.HasCachedProfile
				|| privateMember.IsPrivate != true
				|| privateMember.MainCharacter is not null
				|| !unknownMember.HasCachedProfile
				|| unknownMember.IsPrivate is not null
				|| unknownMember.MainCharacter is not null
				|| unavailableMember.HasCachedProfile
				|| unavailableMember.IsPrivate is not null
				|| unavailableMember.MainCharacter is not null
				|| handler.PlayerProfileRequests != 3
				|| handler.GuildProfileRequests != 2)
			{
				return 205;
			}
		}

		if (!File.Exists(paths.BdoPlayerGuildCachePath))
		{
			return 197;
		}
		string persisted = await File.ReadAllTextAsync(
			paths.BdoPlayerGuildCachePath,
			CancellationToken.None);
		using JsonDocument persistedDocument = JsonDocument.Parse(persisted);
		JsonElement persistedGuild = persistedDocument.RootElement
			.GetProperty("guilds")
			.GetProperty("eu|guild|LUMINOUS")
			.GetProperty("value");
		if (persisted.Contains(fakeApiKey, StringComparison.Ordinal)
			|| !persistedGuild.TryGetProperty("membersDetailed", out JsonElement persistedDetails)
			|| persistedDetails.ValueKind != JsonValueKind.Array
			|| persistedDetails.GetArrayLength() != 0
			|| !handler.ExactAuthenticationObserved
			|| !handler.SecretStayedInApprovedHeader)
		{
			return 198;
		}

		AppPaths legacyPaths = AppPaths.CreateAt(
			Path.Combine(stateRoot, "player-guild-legacy-visibility-test"));
		legacyPaths.EnsureDirectories();
		string legacyCacheJson = $$"""
			{
			  "schemaVersion": 1,
			  "searches": {},
			  "guilds": {},
			  "players": {
			    "eu|player|LEGACYPRIVATE": {
			      "cachedAtUtc": "{{now:O}}",
			      "value": {
			        "status": "LIVE",
			        "sourceStatus": "fresh",
			        "region": "eu",
			        "familyName": "LegacyPrivate",
			        "guild": null,
			        "maxGearScore": null,
			        "energy": null,
			        "contributionPoints": null,
			        "familyCreated": "Nov 5, 2016 (UTC)",
			        "characters": [
			          { "name": "HiddenOne", "class": "Wizard", "level": null, "isMain": false }
			        ],
			        "lifeSkills": [],
			        "guildHistory": [],
			        "scrapedAtUtc": "2026-08-10T04:02:31Z",
			        "cachedAtUtc": "{{now:O}}",
			        "isStale": false,
			        "message": null
			      }
			    }
			  }
			}
			""";
		await File.WriteAllTextAsync(
			legacyPaths.BdoPlayerGuildCachePath,
			legacyCacheJson,
			CancellationToken.None);
		using (AlwaysUnavailableHandler legacyNetwork = new())
		using (BdoPlayerGuildService legacyService = new(
			legacyPaths,
			logger,
			legacyNetwork,
			fakeApiKey,
			() => now))
		{
			BdoPlayerProfileResponse upgraded = await legacyService.GetPlayerProfileAsync(
				"eu",
				"LegacyPrivate",
				CancellationToken.None);
			string upgradedJson = await File.ReadAllTextAsync(
				legacyPaths.BdoPlayerGuildCachePath,
				CancellationToken.None);
			using JsonDocument upgradedDocument = JsonDocument.Parse(upgradedJson);
			JsonElement upgradedValue = upgradedDocument.RootElement
				.GetProperty("players")
				.GetProperty("eu|player|LEGACYPRIVATE")
				.GetProperty("value");
			if (upgraded.Status != "CACHED"
				|| upgraded.IsPrivate != true
				|| upgraded.IsComplete != false
				|| legacyNetwork.RequestCount != 0
				|| !upgradedValue.GetProperty("isPrivate").GetBoolean()
				|| upgradedValue.GetProperty("isComplete").GetBoolean())
			{
				return 204;
			}
		}

		AppPaths legacyIdentityPaths = AppPaths.CreateAt(
			Path.Combine(stateRoot, "player-identity-legacy-search-cache-test"));
		legacyIdentityPaths.EnsureDirectories();
		string legacyIdentityCacheJson = $$"""
			{
			  "schemaVersion": 1,
			  "searches": {
			    "eu|player|LEGACYTARGET": {
			      "cachedAtUtc": "{{now:O}}",
			      "value": {
			        "status": "LIVE",
			        "mode": "player",
			        "region": "eu",
			        "query": "LegacyTarget",
			        "players": [
			          {
			            "familyName": "LegacyTarget",
			            "guild": null,
			            "region": "eu",
			            "mainCharacter": null
			          }
			        ],
			        "guilds": [],
			        "cachedAtUtc": "{{now:O}}",
			        "isStale": false,
			        "message": null
			      }
			    },
			    "eu|player|LEGACYPARTIAL": {
			      "cachedAtUtc": "{{now:O}}",
			      "value": {
			        "status": "LIVE",
			        "mode": "player",
			        "region": "eu",
			        "query": "LegacyPartial",
			        "players": [
			          {
			            "familyName": "LegacyPartialExtra",
			            "guild": null,
			            "region": "eu",
			            "mainCharacter": null
			          }
			        ],
			        "guilds": [],
			        "cachedAtUtc": "{{now:O}}",
			        "isStale": false,
			        "message": null
			      }
			    }
			  },
			  "guilds": {},
			  "players": {}
			}
			""";
		await File.WriteAllTextAsync(
			legacyIdentityPaths.BdoPlayerGuildCachePath,
			legacyIdentityCacheJson,
			CancellationToken.None);
		using PlayerIdentityRecoveryHandler legacyIdentityHandler = new(fakeApiKey);
		using (BdoPlayerGuildService legacyIdentityService = new(
			legacyIdentityPaths,
			logger,
			legacyIdentityHandler,
			fakeApiKey,
			() => now))
		{
			BdoPlayerProfileResponse upgradedTarget =
				await legacyIdentityService.GetPlayerProfileAsync(
					"eu",
					"LegacyTarget",
					CancellationToken.None);
			BdoPlayerProfileResponse upgradedPartial =
				await legacyIdentityService.GetPlayerProfileAsync(
					"eu",
					"LegacyPartial",
					CancellationToken.None);
			string upgradedIdentityJson = await File.ReadAllTextAsync(
				legacyIdentityPaths.BdoPlayerGuildCachePath,
				CancellationToken.None);
			using JsonDocument upgradedIdentityDocument = JsonDocument.Parse(
				upgradedIdentityJson);
			JsonElement upgradedIdentities = upgradedIdentityDocument.RootElement
				.GetProperty("playerIdentities");
			if (upgradedTarget.FamilyName != "LegacyTarget"
				|| upgradedPartial.FamilyName != "LegacyPartial"
				|| legacyIdentityHandler.SearchRequests != 2
				|| legacyIdentityHandler.ProfileRequests != 2
				|| legacyIdentityHandler.DirectProfileRequests != 0
				|| legacyIdentityHandler.RequestCount != 4
				|| upgradedIdentities
					.GetProperty("eu|player|LEGACYTARGET")
					.GetProperty("profileTarget")
					.GetString() != "Legacy+/Target=="
				|| upgradedIdentities
					.GetProperty("eu|player|LEGACYPARTIAL")
					.GetProperty("profileTarget")
					.GetString() != "Partial+/Target==")
			{
				return 212;
			}
		}

		now = now.AddHours(2);
		using (AlwaysUnavailableHandler unavailable = new())
		using (BdoPlayerGuildService offlineService = new(
			paths,
			logger,
			unavailable,
			fakeApiKey,
			() => now))
		{
			BdoGuildProfileResponse staleGuild = await offlineService.GetGuildProfileAsync(
				"eu",
				"Luminous",
				CancellationToken.None);
			BdoPlayerProfileResponse stale = await offlineService.GetPlayerProfileAsync(
				"eu",
				"PsykoQT",
				CancellationToken.None);
			if (staleGuild.Status != "CACHED"
				|| !staleGuild.IsStale
				|| staleGuild.MembersDetailed.Any(member =>
					member.HasCachedProfile
					|| member.IsPrivate is not null
					|| member.MainCharacter is not null)
				|| stale.Status != "CACHED"
				|| !stale.IsStale
				|| stale.MaxGearScore != 809
				|| unavailable.RequestCount != 2)
			{
				return 199;
			}
		}

		AppPaths cancellationPaths = AppPaths.CreateAt(
			Path.Combine(stateRoot, "player-guild-cancellation-test"));
		cancellationPaths.EnsureDirectories();
		using (CancellationRecoveryHandler recovery = new())
		using (BdoPlayerGuildService cancellationService = new(
			cancellationPaths,
			logger,
			recovery,
			fakeApiKey,
			() => now))
		using (CancellationTokenSource requestTimeout = new(
			TimeSpan.FromMilliseconds(75)))
		{
			bool cancelled = false;
			try
			{
				await cancellationService.SearchAsync(
					"player",
					"eu",
					"HangTest",
					requestTimeout.Token);
			}
			catch (OperationCanceledException) when (requestTimeout.IsCancellationRequested)
			{
				cancelled = true;
			}

			BdoPlayerGuildSearchResponse recovered =
				await cancellationService.SearchAsync(
					"player",
					"eu",
					"HangTest",
					CancellationToken.None);
			if (!cancelled
				|| recovery.RequestCount != 2
				|| recovered.Status != "LIVE"
				|| recovered.Players.Single().FamilyName != "RecoveredFamily")
			{
				return 202;
			}
		}

		AppPaths identityPaths = AppPaths.CreateAt(
			Path.Combine(stateRoot, "player-identity-recovery-test"));
		identityPaths.EnsureDirectories();
		using PlayerIdentityRecoveryHandler identityHandler = new(fakeApiKey);
		using (BdoPlayerGuildService identityService = new(
			identityPaths,
			logger,
			identityHandler,
			fakeApiKey,
			() => now))
		{
			BdoPlayerProfileResponse resolved = await identityService.GetPlayerProfileAsync(
				"eu",
				"mixedcase",
				CancellationToken.None);
			BdoPlayerProfileResponse refreshed = await identityService.GetPlayerProfileAsync(
				"eu",
				"MIXEDCASE",
				CancellationToken.None,
				forceRefresh: true);
			if (resolved.FamilyName != "MixedCase"
				|| refreshed.FamilyName != "MixedCase"
				|| identityHandler.SearchRequests != 1
				|| identityHandler.ProfileRequests != 2
				|| identityHandler.DirectProfileRequests != 0
				|| !identityHandler.CanonicalTargetObserved)
			{
				return 206;
			}
		}

		using (BdoPlayerGuildService restoredIdentityService = new(
			identityPaths,
			logger,
			identityHandler,
			fakeApiKey,
			() => now))
		{
			BdoPlayerProfileResponse restoredIdentity = await restoredIdentityService.GetPlayerProfileAsync(
				"eu",
				"MixedCase",
				CancellationToken.None,
				forceRefresh: true);
			if (restoredIdentity.FamilyName != "MixedCase"
				|| identityHandler.SearchRequests != 1
				|| identityHandler.ProfileRequests != 3
				|| identityHandler.DirectProfileRequests != 0)
			{
				return 207;
			}
		}

		AppPaths identityEdgePaths = AppPaths.CreateAt(
			Path.Combine(stateRoot, "player-identity-edge-test"));
		identityEdgePaths.EnsureDirectories();
		using PlayerIdentityRecoveryHandler identityEdgeHandler = new(fakeApiKey);
		using (BdoPlayerGuildService identityEdgeService = new(
			identityEdgePaths,
			logger,
			identityEdgeHandler,
			fakeApiKey,
			() => now))
		{
			string ambiguousFailure = await CapturePlayerProfileFailureAsync(
				identityEdgeService,
				"Ambiguous");
			string missingFailure = await CapturePlayerProfileFailureAsync(
				identityEdgeService,
				"Missing");
			if (!ambiguousFailure.Contains("more than one", StringComparison.OrdinalIgnoreCase)
				|| !missingFailure.Contains("not found or is not public", StringComparison.OrdinalIgnoreCase)
				|| ambiguousFailure.Contains("BDO Alerts", StringComparison.OrdinalIgnoreCase)
				|| missingFailure.Contains("BDO Alerts", StringComparison.OrdinalIgnoreCase)
				|| identityEdgeHandler.SearchRequests != 2
				|| identityEdgeHandler.ProfileRequests != 0)
			{
				return 208;
			}
		}

		AppPaths persistentIdentityPaths = AppPaths.CreateAt(
			Path.Combine(stateRoot, "player-identity-persistent-failure-test"));
		persistentIdentityPaths.EnsureDirectories();
		using PlayerIdentityRecoveryHandler persistentIdentityHandler = new(fakeApiKey);
		using (BdoPlayerGuildService persistentIdentityService = new(
			persistentIdentityPaths,
			logger,
			persistentIdentityHandler,
			fakeApiKey,
			() => now))
		{
			string persistentFailure = await CapturePlayerProfileFailureAsync(
				persistentIdentityService,
				"Persistent");
			if (!persistentFailure.Contains("not found or is not public", StringComparison.OrdinalIgnoreCase)
				|| persistentFailure.Contains("BDO Alerts", StringComparison.OrdinalIgnoreCase)
				|| persistentIdentityHandler.SearchRequests != 2
				|| persistentIdentityHandler.ProfileRequests != 2
				|| persistentIdentityHandler.RequestCount != 4)
			{
				return 209;
			}
		}

		AppPaths refreshSuccessPaths = AppPaths.CreateAt(
			Path.Combine(stateRoot, "player-profile-force-refresh-success-test"));
		refreshSuccessPaths.EnsureDirectories();
		using PlayerRefreshHandler refreshSuccessHandler = new(fakeApiKey);
		using (BdoPlayerGuildService refreshSuccessService = new(
			refreshSuccessPaths,
			logger,
			refreshSuccessHandler,
			fakeApiKey,
			() => now))
		{
			BdoPlayerProfileResponse original = await refreshSuccessService.GetPlayerProfileAsync(
				"eu",
				"RefreshFamily",
				CancellationToken.None);
			BdoPlayerProfileResponse cached = await refreshSuccessService.GetPlayerProfileAsync(
				"eu",
				"RefreshFamily",
				CancellationToken.None);
			BdoPlayerProfileResponse refreshed = await refreshSuccessService.GetPlayerProfileAsync(
				"eu",
				"RefreshFamily",
				CancellationToken.None,
				forceRefresh: true);
			if (original.MaxGearScore != 700
				|| cached.Status != "CACHED"
				|| refreshed.MaxGearScore != 801
				|| refreshed.Status != "LIVE"
				|| refreshed.SourceStatus != "fresh"
				|| refreshed.IsStale
				|| refreshed.Message is not null
				|| refreshSuccessHandler.SearchRequests != 1
				|| refreshSuccessHandler.ProfileRequests != 2
				|| refreshSuccessHandler.ForceRefreshRequests != 1
				|| refreshSuccessHandler.RequestCount != 3
				|| !refreshSuccessHandler.ExactForceRefreshUriObserved)
			{
				return 213;
			}
		}

		AppPaths refreshTransientPaths = AppPaths.CreateAt(
			Path.Combine(stateRoot, "player-profile-force-refresh-transient-test"));
		refreshTransientPaths.EnsureDirectories();
		using PlayerRefreshHandler refreshTransientHandler = new(
			fakeApiKey,
			HttpStatusCode.ServiceUnavailable);
		using (BdoPlayerGuildService refreshTransientService = new(
			refreshTransientPaths,
			logger,
			refreshTransientHandler,
			fakeApiKey,
			() => now))
		{
			await refreshTransientService.GetPlayerProfileAsync(
				"eu",
				"RefreshFamily",
				CancellationToken.None);
			BdoPlayerProfileResponse fallback = await refreshTransientService.GetPlayerProfileAsync(
				"eu",
				"RefreshFamily",
				CancellationToken.None,
				forceRefresh: true);
			if (fallback.Status != "CACHED"
				|| !fallback.IsStale
				|| fallback.MaxGearScore != 700
				|| fallback.Message != "Refresh failed; showing the saved profile. Player and guild data is temporarily unavailable."
				|| refreshTransientHandler.SearchRequests != 1
				|| refreshTransientHandler.ProfileRequests != 2
				|| refreshTransientHandler.ForceRefreshRequests != 1
				|| refreshTransientHandler.RequestCount != 3)
			{
				return 214;
			}
		}

		AppPaths refreshNotFoundPaths = AppPaths.CreateAt(
			Path.Combine(stateRoot, "player-profile-force-refresh-not-found-test"));
		refreshNotFoundPaths.EnsureDirectories();
		using PlayerRefreshHandler refreshNotFoundHandler = new(
			fakeApiKey,
			HttpStatusCode.NotFound);
		using (BdoPlayerGuildService refreshNotFoundService = new(
			refreshNotFoundPaths,
			logger,
			refreshNotFoundHandler,
			fakeApiKey,
			() => now))
		{
			await refreshNotFoundService.GetPlayerProfileAsync(
				"eu",
				"RefreshFamily",
				CancellationToken.None);
			string failure = await CapturePlayerProfileFailureAsync(
				refreshNotFoundService,
				"RefreshFamily",
				forceRefresh: true);
			if (!failure.Contains("not found or is not public", StringComparison.OrdinalIgnoreCase)
				|| failure.Contains("BDO Alerts", StringComparison.OrdinalIgnoreCase)
				|| refreshNotFoundHandler.SearchRequests != 2
				|| refreshNotFoundHandler.ProfileRequests != 3
				|| refreshNotFoundHandler.ForceRefreshRequests != 2
				|| refreshNotFoundHandler.RequestCount != 5)
			{
				return 215;
			}
		}

		Uri trustedSearch = BdoPlayerGuildService.BuildSearchEndpointForTest(
			"guild",
			"eu",
			"Luminous");
		using (HttpRequestMessage trusted = new(HttpMethod.Get, trustedSearch))
		{
			if (!BdoAlertsApiCredentials.TryApply(trusted, trustedSearch, fakeApiKey)
				|| !trusted.Headers.TryGetValues("X-API-Key", out IEnumerable<string>? values)
				|| !values.SequenceEqual([fakeApiKey])
				|| trusted.RequestUri!.AbsoluteUri.Contains(fakeApiKey, StringComparison.Ordinal))
			{
				return 200;
			}
		}

		const string trustedProfileTarget = "Opaque+/Target==";
		Uri trustedProfile = BdoPlayerGuildService.BuildProfileEndpointForTest(
			"player",
			"eu",
			"MixedCase",
			trustedProfileTarget);
		using (HttpRequestMessage trusted = new(HttpMethod.Get, trustedProfile))
		{
			if (!BdoAlertsApiCredentials.TryApply(trusted, trustedProfile, fakeApiKey)
				|| !trusted.Headers.TryGetValues("X-API-Key", out IEnumerable<string>? values)
				|| !values.SequenceEqual([fakeApiKey])
				|| trusted.RequestUri!.AbsoluteUri.Contains(fakeApiKey, StringComparison.Ordinal)
				|| trusted.RequestUri.Query.Contains("+", StringComparison.Ordinal)
				|| trusted.RequestUri.Query.Contains("/", StringComparison.Ordinal))
			{
				return 210;
			}
		}

		Uri trustedForcedProfile = BdoPlayerGuildService.BuildProfileEndpointForTest(
			"player",
			"eu",
			"MixedCase",
			trustedProfileTarget,
			forceRefresh: true);
		using (HttpRequestMessage trusted = new(HttpMethod.Get, trustedForcedProfile))
		{
			if (trustedForcedProfile.Query
					!= "?profile_target=Opaque%2B%2FTarget%3D%3D&force_refresh=true"
				|| !BdoAlertsApiCredentials.TryApply(
					trusted,
					trustedForcedProfile,
					fakeApiKey)
				|| !trusted.Headers.TryGetValues(
					"X-API-Key",
					out IEnumerable<string>? values)
				|| !values.SequenceEqual([fakeApiKey])
				|| trusted.RequestUri!.AbsoluteUri.Contains(fakeApiKey, StringComparison.Ordinal))
			{
				return 216;
			}
		}

		string[] rejectedEndpoints =
		[
			"https://api.bdoalerts.net/api/guild/search/console_eu?query=Luminous",
			"https://api.bdoalerts.net/api/guild/search/eu?query=Luminous&force_refresh=true",
			"https://api.bdoalerts.net/api/guild/search/eu?query=Luminous&query=Other",
			"https://api.bdoalerts.net/api/guild/eu/Luminous?force_refresh=true",
			"https://api.bdoalerts.net/api/player/eu/Bad%2FName",
			"https://api.bdoalerts.net/api/player/eu/MixedCase?profile_target=",
			"https://api.bdoalerts.net/api/player/eu/MixedCase?profileTarget=Opaque%2B%2FTarget%3D%3D",
			"https://api.bdoalerts.net/api/player/eu/MixedCase?force_refresh=true&profile_target=Opaque%2B%2FTarget%3D%3D",
			"https://api.bdoalerts.net/api/player/eu/MixedCase?profile_target=Opaque%2B%2FTarget%3D%3D&force_refresh=false",
			"https://api.bdoalerts.net/api/player/eu/MixedCase?profile_target=Opaque%2B%2FTarget%3D%3D&force_refresh=True",
			"https://api.bdoalerts.net/api/player/eu/MixedCase?profile_target=Opaque%2B%2FTarget%3D%3D&force_refresh=true&extra=1",
			"https://api.bdoalerts.net/api/player/eu/MixedCase?profile_target=One&profile_target=Two",
			"https://api.bdoalerts.net/api/player/eu/MixedCase?profile_target=Bad%0ATarget",
			"https://api.bdoalerts.net/api/guild/eu/Luminous?profile_target=Opaque%2B%2FTarget%3D%3D",
			"https://example.com/api/player/eu/PsykoQT"
		];
		foreach (string endpointValue in rejectedEndpoints)
		{
			Uri endpoint = new(endpointValue);
			using HttpRequestMessage rejected = new(HttpMethod.Get, endpoint);
			if (BdoAlertsApiCredentials.TryApply(rejected, endpoint, fakeApiKey)
				|| rejected.Headers.Contains("X-API-Key"))
			{
				return 201;
			}
		}

		if (CalculatorForm.GetCommandTimeout("getBdoPlayerProfile") != TimeSpan.FromSeconds(70)
			|| CalculatorForm.GetCommandTimeout("searchBdoPlayersGuilds") != TimeSpan.FromSeconds(33)
			|| CalculatorForm.GetCommandTimeout("getBdoGuildProfile") != TimeSpan.FromSeconds(33))
		{
			return 211;
		}

		return 0;
	}

	private static async Task<string> CapturePlayerProfileFailureAsync(
		BdoPlayerGuildService service,
		string familyName,
		bool forceRefresh = false)
	{
		try
		{
			await service.GetPlayerProfileAsync(
				"eu",
				familyName,
				CancellationToken.None,
				forceRefresh);
			return string.Empty;
		}
		catch (InvalidOperationException ex)
		{
			return ex.Message;
		}
	}

	private sealed class PlayerGuildStubHandler : HttpMessageHandler
	{
		private readonly string expectedApiKey;

		public PlayerGuildStubHandler(string expectedApiKey)
		{
			this.expectedApiKey = expectedApiKey;
		}

		public int PlayerSearchRequests { get; private set; }
		public int GuildSearchRequests { get; private set; }
		public int GuildProfileRequests { get; private set; }
		public int PlayerProfileRequests { get; private set; }
		public bool ExactAuthenticationObserved { get; private set; } = true;
		public bool SecretStayedInApprovedHeader { get; private set; } = true;
		public bool ForceRefreshQueryObserved { get; private set; }

		protected override Task<HttpResponseMessage> SendAsync(
			HttpRequestMessage request,
			CancellationToken cancellationToken)
		{
			string[] keyValues = request.Headers.TryGetValues(
				"X-API-Key",
				out IEnumerable<string>? values)
					? values.ToArray()
					: [];
			ExactAuthenticationObserved &= keyValues.SequenceEqual([expectedApiKey]);
			string uri = request.RequestUri?.AbsoluteUri ?? string.Empty;
			SecretStayedInApprovedHeader &= !uri.Contains(expectedApiKey, StringComparison.Ordinal)
				&& request.Content is null
				&& request.Headers.Authorization is null;
			ForceRefreshQueryObserved |= uri.Contains("force_refresh", StringComparison.OrdinalIgnoreCase);

			string path = request.RequestUri?.AbsolutePath ?? string.Empty;
			string json;
			if (path == "/api/player/search/eu")
			{
				PlayerSearchRequests++;
				string query = ReadQueryValue(request.RequestUri, "query");
				string familyName = query switch
				{
					"PrivateFamily" => "PrivateFamily",
					"EmptyFamily" => "EmptyFamily",
					_ => "PsykoQT"
				};
				json = $$"""
					{
					  "region":"eu",
					  "query":"{{query}}",
					  "results":[{
					    "family_name":"{{familyName}}",
					    "guild":"Luminous",
					    "region":"EU",
					    "profile_target":"target-{{familyName}}",
					    "main_character":{"name":"{{familyName}}","class":"Wizard","level":67}
					  }],
					  "total":1
					}
					""";
			}
			else if (path == "/api/guild/search/eu")
			{
				GuildSearchRequests++;
				json = """
					{
					  "region":"eu",
					  "query":"Luminous",
					  "results":[{
					    "guild_name":"Luminous",
					    "guild_master":"MazeYasha",
					    "member_count":2,
					    "last_updated":"2026-08-10T03:59:38"
					  }],
					  "total":1
					}
					""";
			}
			else if (path == "/api/guild/eu/Luminous")
			{
				GuildProfileRequests++;
				json = """
					{
					  "status":"cached",
					  "guild_name":"Luminous",
					  "region":"eu",
					  "guild_master":"MazeYasha",
					  "member_count":4,
					  "members":["Thunvass","PsykoQT","PrivateFamily","EmptyFamily"],
					  "members_detailed":[],
					  "scraped_at":"2026-08-10T03:59:37",
					  "updated_at":"2026-08-10T03:59:38"
					}
					""";
			}
			else if (path == "/api/player/eu/PsykoQT")
			{
				PlayerProfileRequests++;
				json = """
					{
					  "status":"cached",
					  "family_name":"PsykoQT",
					  "region":"eu",
					  "guild":"Luminous",
					  "max_gear_score":809,
					  "energy":481,
					  "contribution_points":415,
					  "family_created":"Nov 5, 2016 (UTC)",
					  "characters":[
					    {"character_name":"PsykoQT","character_class":"Wizard","level":67,"is_main":"1"},
					    {"character_name":"HighestAlt","character_class":"Witch","level":68,"is_main":0}
					  ],
					  "life_skills":[
					    {"skill_name":"Fishing","level_rank":"Guru","level_num":11,"mastery":1345}
					  ],
					  "scraped_at":"2026-08-10T04:02:31",
					  "guild_history":[
					    {"guild_name":"Luminous","joined_at":"2026-08-10T04:02:32","left_at":null}
					  ]
					}
					""";
			}
			else if (path == "/api/player/eu/PrivateFamily")
			{
				PlayerProfileRequests++;
				json = """
					{
					  "status":"fresh",
					  "family_name":"PrivateFamily",
					  "region":"eu",
					  "guild":null,
					  "max_gear_score":null,
					  "energy":null,
					  "contribution_points":null,
					  "family_created":"Nov 5, 2016 (UTC)",
					  "characters":[
					    {"character_name":"HiddenOne","character_class":"Wizard","level":null,"is_main":false},
					    {"character_name":"HiddenTwo","character_class":"Witch","level":null,"is_main":false}
					  ],
					  "life_skills":[],
					  "scraped_at":"2026-08-10T04:02:31",
					  "guild_history":[]
					}
					""";
			}
			else if (path == "/api/player/eu/EmptyFamily")
			{
				PlayerProfileRequests++;
				json = """
					{
					  "status":"fresh",
					  "family_name":"EmptyFamily",
					  "region":"eu",
					  "guild":null,
					  "max_gear_score":null,
					  "energy":null,
					  "contribution_points":null,
					  "family_created":null,
					  "characters":[],
					  "life_skills":[],
					  "scraped_at":"2026-08-10T04:02:31",
					  "guild_history":[]
					}
					""";
			}
			else
			{
				return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
			}

			return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
			{
				Content = new StringContent(json, Encoding.UTF8, "application/json")
			});
		}

		private static string ReadQueryValue(Uri? endpoint, string key)
		{
			if (endpoint is null || endpoint.Query.Length <= 1)
			{
				return string.Empty;
			}
			foreach (string pair in endpoint.Query[1..].Split('&', StringSplitOptions.RemoveEmptyEntries))
			{
				int separator = pair.IndexOf('=');
				if (separator > 0
					&& Uri.UnescapeDataString(pair[..separator]).Equals(key, StringComparison.Ordinal))
				{
					return Uri.UnescapeDataString(pair[(separator + 1)..]);
				}
			}
			return string.Empty;
		}
	}

	private sealed class PlayerRefreshHandler : HttpMessageHandler
	{
		private const string FamilyName = "RefreshFamily";
		private const string ProfileTarget = "Refresh+/Target==";
		private const string ExpectedForcedQuery =
			"?profile_target=Refresh%2B%2FTarget%3D%3D&force_refresh=true";
		private readonly string expectedApiKey;
		private readonly HttpStatusCode? forcedFailureStatus;

		public PlayerRefreshHandler(
			string expectedApiKey,
			HttpStatusCode? forcedFailureStatus = null)
		{
			this.expectedApiKey = expectedApiKey;
			this.forcedFailureStatus = forcedFailureStatus;
		}

		public int RequestCount { get; private set; }
		public int SearchRequests { get; private set; }
		public int ProfileRequests { get; private set; }
		public int ForceRefreshRequests { get; private set; }
		public bool ExactForceRefreshUriObserved { get; private set; } = true;

		protected override Task<HttpResponseMessage> SendAsync(
			HttpRequestMessage request,
			CancellationToken cancellationToken)
		{
			RequestCount++;
			if (!request.Headers.TryGetValues("X-API-Key", out IEnumerable<string>? values)
				|| !values.SequenceEqual([expectedApiKey])
				|| request.RequestUri!.AbsoluteUri.Contains(expectedApiKey, StringComparison.Ordinal)
				|| request.Content is not null
				|| request.Headers.Authorization is not null)
			{
				return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Forbidden));
			}

			Uri endpoint = request.RequestUri;
			if (endpoint.AbsolutePath == "/api/player/search/eu")
			{
				SearchRequests++;
				return Task.FromResult(JsonResponse($$"""
					{
					  "region":"eu",
					  "query":"{{FamilyName}}",
					  "results":[
					    {"family_name":"{{FamilyName}}","guild":null,"region":"EU","profile_target":"{{ProfileTarget}}","main_character":null}
					  ],
					  "total":1
					}
					"""));
			}

			if (endpoint.AbsolutePath != "/api/player/eu/RefreshFamily"
				|| ReadQueryValue(endpoint, "profile_target") != ProfileTarget)
			{
				return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
			}

			ProfileRequests++;
			bool forced = endpoint.Query.Contains(
				"force_refresh=true",
				StringComparison.Ordinal);
			if (forced)
			{
				ForceRefreshRequests++;
				ExactForceRefreshUriObserved &= endpoint.Query == ExpectedForcedQuery;
				if (forcedFailureStatus.HasValue)
				{
					return Task.FromResult(new HttpResponseMessage(forcedFailureStatus.Value));
				}
			}

			return Task.FromResult(JsonResponse(ProfilePayload(
				forced ? 801 : 700,
				forced ? "fresh" : "cached")));
		}

		private static string ProfilePayload(int gearScore, string sourceStatus)
		{
			return $$"""
				{
				  "status":"{{sourceStatus}}",
				  "family_name":"{{FamilyName}}",
				  "region":"eu",
				  "guild":null,
				  "max_gear_score":{{gearScore}},
				  "energy":400,
				  "contribution_points":400,
				  "family_created":"Nov 5, 2016 (UTC)",
				  "characters":[
				    {"character_name":"RefreshMain","character_class":"Wizard","level":67,"is_main":true}
				  ],
				  "life_skills":[
				    {"skill_name":"Fishing","level_rank":"Guru","level_num":1,"mastery":1000}
				  ],
				  "scraped_at":"2026-08-10T04:02:31",
				  "guild_history":[]
				}
				""";
		}

		private static HttpResponseMessage JsonResponse(string json)
		{
			return new HttpResponseMessage(HttpStatusCode.OK)
			{
				Content = new StringContent(json, Encoding.UTF8, "application/json")
			};
		}

		private static string ReadQueryValue(Uri endpoint, string key)
		{
			if (endpoint.Query.Length <= 1)
			{
				return string.Empty;
			}
			foreach (string pair in endpoint.Query[1..].Split('&', StringSplitOptions.RemoveEmptyEntries))
			{
				int separator = pair.IndexOf('=');
				if (separator > 0
					&& Uri.UnescapeDataString(pair[..separator]).Equals(key, StringComparison.Ordinal))
				{
					return Uri.UnescapeDataString(pair[(separator + 1)..]);
				}
			}
			return string.Empty;
		}
	}

	private sealed class PlayerIdentityRecoveryHandler : HttpMessageHandler
	{
		private const string CanonicalTarget = "Canonical+/Target==";
		private const string LegacyTarget = "Legacy+/Target==";
		private const string PartialTarget = "Partial+/Target==";
		private const string PersistentTarget = "Persistent+/Target==";
		private readonly string expectedApiKey;

		public PlayerIdentityRecoveryHandler(string expectedApiKey)
		{
			this.expectedApiKey = expectedApiKey;
		}

		public int RequestCount { get; private set; }
		public int SearchRequests { get; private set; }
		public int ProfileRequests { get; private set; }
		public int DirectProfileRequests { get; private set; }
		public bool CanonicalTargetObserved { get; private set; }

		protected override Task<HttpResponseMessage> SendAsync(
			HttpRequestMessage request,
			CancellationToken cancellationToken)
		{
			RequestCount++;
			if (!request.Headers.TryGetValues("X-API-Key", out IEnumerable<string>? values)
				|| !values.SequenceEqual([expectedApiKey])
				|| request.RequestUri!.AbsoluteUri.Contains(expectedApiKey, StringComparison.Ordinal)
				|| request.Content is not null
				|| request.Headers.Authorization is not null)
			{
				return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Forbidden));
			}

			Uri endpoint = request.RequestUri;
			if (endpoint.AbsolutePath == "/api/player/search/eu")
			{
				SearchRequests++;
				return Task.FromResult(JsonResponse(SearchPayload(ReadQueryValue(endpoint, "query"))));
			}

			if (endpoint.AbsolutePath.StartsWith("/api/player/eu/", StringComparison.Ordinal))
			{
				string target = ReadQueryValue(endpoint, "profile_target");
				if (target.Length == 0)
				{
					DirectProfileRequests++;
					return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
				}
				ProfileRequests++;
				if (endpoint.AbsolutePath == "/api/player/eu/MixedCase"
					&& target.Equals(CanonicalTarget, StringComparison.Ordinal))
				{
					CanonicalTargetObserved = true;
					return Task.FromResult(JsonResponse(ProfilePayload("MixedCase")));
				}
				if (endpoint.AbsolutePath == "/api/player/eu/Persistent"
					&& target.Equals(PersistentTarget, StringComparison.Ordinal))
				{
					return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
				}
				if (endpoint.AbsolutePath == "/api/player/eu/LegacyTarget"
					&& target.Equals(LegacyTarget, StringComparison.Ordinal))
				{
					return Task.FromResult(JsonResponse(ProfilePayload("LegacyTarget")));
				}
				if (endpoint.AbsolutePath == "/api/player/eu/LegacyPartial"
					&& target.Equals(PartialTarget, StringComparison.Ordinal))
				{
					return Task.FromResult(JsonResponse(ProfilePayload("LegacyPartial")));
				}
			}

			return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
		}

		private static string SearchPayload(string query)
		{
			return query switch
			{
				"mixedcase" or "MIXEDCASE" or "MixedCase" => $$"""
					{
					  "region":"eu",
					  "query":"{{query}}",
					  "results":[
					    {"family_name":"mixedcase","guild":null,"region":"NA","profile_target":"WrongRegionTarget","main_character":null},
					    {"family_name":"MixedCaseExtra","guild":null,"region":"EU","profile_target":"NearMatchTarget","main_character":null},
					    {"family_name":"MixedCase","guild":null,"region":"EU","profile_target":"{{CanonicalTarget}}","main_character":null}
					  ],
					  "total":3
					}
					""",
				"Ambiguous" => """
					{
					  "region":"eu",
					  "query":"Ambiguous",
					  "results":[
					    {"family_name":"Ambiguous","guild":null,"region":"EU","profile_target":"FirstTarget","main_character":null},
					    {"family_name":"AMBIGUOUS","guild":null,"region":"eu","profile_target":"SecondTarget","main_character":null}
					  ],
					  "total":2
					}
					""",
				"Persistent" => $$"""
					{
					  "region":"eu",
					  "query":"Persistent",
					  "results":[
					    {"family_name":"Persistent","guild":null,"region":"EU","profile_target":"{{PersistentTarget}}","main_character":null}
					  ],
					  "total":1
					}
					""",
				"LegacyTarget" => $$"""
					{
					  "region":"eu",
					  "query":"LegacyTarget",
					  "results":[
					    {"family_name":"LegacyTarget","guild":null,"region":"EU","profile_target":"{{LegacyTarget}}","main_character":null}
					  ],
					  "total":1
					}
					""",
				"LegacyPartial" => $$"""
					{
					  "region":"eu",
					  "query":"LegacyPartial",
					  "results":[
					    {"family_name":"LegacyPartial","guild":null,"region":"EU","profile_target":"{{PartialTarget}}","main_character":null}
					  ],
					  "total":1
					}
					""",
				_ => $$"""
					{
					  "region":"eu",
					  "query":"{{query}}",
					  "results":[
					    {"family_name":"{{query}}Extra","guild":null,"region":"EU","profile_target":"NearMatchTarget","main_character":null}
					  ],
					  "total":1
					}
					"""
			};
		}

		private static string ProfilePayload(string familyName)
		{
			return $$"""
				{
				  "status":"fresh",
				  "family_name":"{{familyName}}",
				  "region":"eu",
				  "guild":"Luminous",
				  "max_gear_score":800,
				  "energy":400,
				  "contribution_points":400,
				  "family_created":"Nov 5, 2016 (UTC)",
				  "characters":[
				    {"character_name":"MainCharacter","character_class":"Wizard","level":67,"is_main":true}
				  ],
				  "life_skills":[
				    {"skill_name":"Fishing","level_rank":"Guru","level_num":1,"mastery":1000}
				  ],
				  "scraped_at":"2026-08-10T04:02:31",
				  "guild_history":[]
				}
				""";
		}

		private static HttpResponseMessage JsonResponse(string json)
		{
			return new HttpResponseMessage(HttpStatusCode.OK)
			{
				Content = new StringContent(json, Encoding.UTF8, "application/json")
			};
		}

		private static string ReadQueryValue(Uri endpoint, string key)
		{
			if (endpoint.Query.Length <= 1)
			{
				return string.Empty;
			}
			foreach (string pair in endpoint.Query[1..].Split('&', StringSplitOptions.RemoveEmptyEntries))
			{
				int separator = pair.IndexOf('=');
				if (separator > 0
					&& Uri.UnescapeDataString(pair[..separator]).Equals(key, StringComparison.Ordinal))
				{
					return Uri.UnescapeDataString(pair[(separator + 1)..]);
				}
			}
			return string.Empty;
		}
	}

	private sealed class AlwaysUnavailableHandler : HttpMessageHandler
	{
		public int RequestCount { get; private set; }

		protected override Task<HttpResponseMessage> SendAsync(
			HttpRequestMessage request,
			CancellationToken cancellationToken)
		{
			RequestCount++;
			return Task.FromResult(new HttpResponseMessage((HttpStatusCode)429));
		}
	}

	private sealed class CancellationRecoveryHandler : HttpMessageHandler
	{
		public int RequestCount { get; private set; }

		protected override async Task<HttpResponseMessage> SendAsync(
			HttpRequestMessage request,
			CancellationToken cancellationToken)
		{
			RequestCount++;
			if (RequestCount == 1)
			{
				await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
			}

			const string json = """
				{
				  "region":"eu",
				  "query":"HangTest",
				  "results":[{
				    "family_name":"RecoveredFamily",
				    "guild":null,
				    "region":"EU",
				    "main_character":null
				  }],
				  "total":1
				}
				""";
			return new HttpResponseMessage(HttpStatusCode.OK)
			{
				Content = new StringContent(json, Encoding.UTF8, "application/json")
			};
		}
	}
}
