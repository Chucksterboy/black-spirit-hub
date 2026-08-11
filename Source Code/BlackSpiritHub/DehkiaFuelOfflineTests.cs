using System;
using System.Collections.Concurrent;
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

internal static class DehkiaFuelOfflineTests
{
	internal static async Task<int> RunAsync(string root, AppLogger logger)
	{
		string testRoot = Path.Combine(root, "dehkia-fuel");
		Directory.CreateDirectory(testRoot);
		DateTimeOffset capturedUtc = new(2026, 8, 11, 10, 0, 0, TimeSpan.Zero);
		const string fakeApiKey = "bdo_DEHKIAOFFLINETESTKEY123456";

		if (DehkiaFuelService.Catalog.Count != 26
			|| DehkiaFuelService.Catalog.Select(item => item.ItemId).Distinct().Count() != 26
			|| DehkiaFuelService.Catalog.Count(item => item.Tier == "low") != 11
			|| DehkiaFuelService.Catalog.Count(item => item.Tier == "high") != 15
			|| DehkiaFuelService.GetFuelYield("low", 1) != 25
			|| DehkiaFuelService.GetFuelYield("low", 2) != 75
			|| DehkiaFuelService.GetFuelYield("low", 3) != 210
			|| DehkiaFuelService.GetFuelYield("high", 1) != 165
			|| DehkiaFuelService.GetFuelYield("high", 2) != 450
			|| DehkiaFuelService.GetFuelYield("high", 3) != 1275
			|| DehkiaFuelService.CalculateSuggestedCrystalValue(4_340_000) != 723_333)
		{
			return 301;
		}

		DehkiaFuelRow[] reference = DehkiaFuelService.Catalog
			.SelectMany(item => Enumerable.Range(1, 3)
				.Select(enhancement => DehkiaFuelService.CreateRow(
					item,
					enhancement,
					1_000_000L + item.ItemId + enhancement,
					10 + enhancement,
					"fixture",
					capturedUtc)))
			.ToArray();
		if (DehkiaFuelService.OrderAndValidateRows(reference, requireMarketValues: true).Length != 78
			|| !RejectsRows(reference[..^1])
			|| !RejectsRows(reference.Concat([reference[0]])))
		{
			return 302;
		}

		using (DehkiaApiStubHandler completeHandler = new(
			CreateApiFixture("complete", capturedUtc),
			fakeApiKey))
		using (BdoAlertsDehkiaFuelClient api = new(completeHandler, fakeApiKey, () => capturedUtc))
		using (FixtureMarketProvider market = new())
		using (DehkiaFuelService service = new(
			AppPaths.CreateAt(Path.Combine(testRoot, "complete")),
			logger,
			api,
			market,
			() => capturedUtc))
		{
			DehkiaFuelResponse response = await service.GetDataAsync(
				forceRefresh: true,
				CancellationToken.None);
			string serializedResponse = JsonSerializer.Serialize(response);
			string cachedResponse = File.ReadAllText(
				AppPaths.CreateAt(Path.Combine(testRoot, "complete")).DehkiaFuelCachePath);
			if (response.Status != "LIVE"
				|| response.Items.Count != 78
				|| response.Items.Any(row => row.Source != "bdoalerts-dehkia")
				|| response.SuggestedCrystalValue != 723_333
				|| response.CrystalValueSource?.ItemId != 766105
				|| completeHandler.RequestCount != 1
				|| !completeHandler.ExactAuthenticationObserved
				|| market.RequestedIds.Count != 4
				|| market.RequestedIds.Any(id => id < 766104 || id > 766107)
				|| serializedResponse.Contains(fakeApiKey, StringComparison.Ordinal)
				|| cachedResponse.Contains(fakeApiKey, StringComparison.Ordinal))
			{
				Console.Error.WriteLine(
					$"Dehkia complete fixture failed: status={response.Status}, items={response.Items.Count}, "
					+ $"sources={string.Join(',', response.Items.Select(row => row.Source).Distinct())}, "
					+ $"crystal={response.SuggestedCrystalValue}, crystalItem={response.CrystalValueSource?.ItemId}, "
					+ $"apiRequests={completeHandler.RequestCount}, auth={completeHandler.ExactAuthenticationObserved}, "
					+ $"marketRequests={market.RequestedIds.Count}, leaked={serializedResponse.Contains(fakeApiKey, StringComparison.Ordinal) || cachedResponse.Contains(fakeApiKey, StringComparison.Ordinal)}");
				return 303;
			}
		}

		foreach (string mode in new[] { "empty", "partial" })
		{
			string scenarioRoot = Path.Combine(testRoot, mode);
			using DehkiaApiStubHandler handler = new(
				CreateApiFixture(mode, capturedUtc),
				fakeApiKey);
			using BdoAlertsDehkiaFuelClient api = new(handler, fakeApiKey, () => capturedUtc);
			using FixtureMarketProvider market = new();
			using DehkiaFuelService service = new(
				AppPaths.CreateAt(scenarioRoot),
				logger,
				api,
				market,
				() => capturedUtc);
			DehkiaFuelResponse response = await service.GetDataAsync(
				forceRefresh: true,
				CancellationToken.None);
			if (response.Status != "LIVE"
				|| response.Items.Count != 78
				|| response.Items.Any(row => row.Source != "blackdesert-market")
				|| handler.RequestCount != 1
				|| market.RequestedIds.Distinct().Count() != 30
				|| market.RequestedIds.Count != 30)
			{
				return mode == "empty" ? 304 : 305;
			}
		}

		string cacheRoot = Path.Combine(testRoot, "cache");
		using (DehkiaApiStubHandler handler = new(
			CreateApiFixture("empty", capturedUtc),
			fakeApiKey))
		using (BdoAlertsDehkiaFuelClient api = new(handler, fakeApiKey, () => capturedUtc))
		using (FixtureMarketProvider market = new())
		using (DehkiaFuelService service = new(
			AppPaths.CreateAt(cacheRoot),
			logger,
			api,
			market,
			() => capturedUtc))
		{
			DehkiaFuelResponse initial = await service.GetDataAsync(true, CancellationToken.None);
			if (initial.Status != "LIVE")
			{
				return 306;
			}
		}

		using (DehkiaApiStubHandler unusedHandler = new(
			CreateApiFixture("empty", capturedUtc),
			fakeApiKey))
		using (BdoAlertsDehkiaFuelClient api = new(unusedHandler, fakeApiKey, () => capturedUtc))
		using (FixtureMarketProvider market = new(failAll: true))
		using (DehkiaFuelService service = new(
			AppPaths.CreateAt(cacheRoot),
			logger,
			api,
			market,
			() => capturedUtc.AddMinutes(30)))
		{
			DehkiaFuelResponse freshCache = await service.GetDataAsync(false, CancellationToken.None);
			if (freshCache.Status != "CACHE"
				|| unusedHandler.RequestCount != 0
				|| market.RequestedIds.Count != 0)
			{
				return 307;
			}
		}

		using (DehkiaApiStubHandler staleHandler = new(
			CreateApiFixture("empty", capturedUtc),
			fakeApiKey))
		using (BdoAlertsDehkiaFuelClient api = new(staleHandler, fakeApiKey, () => capturedUtc))
		using (FixtureMarketProvider market = new(failAll: true))
		using (DehkiaFuelService service = new(
			AppPaths.CreateAt(cacheRoot),
			logger,
			api,
			market,
			() => capturedUtc.AddHours(2)))
		{
			string cacheBeforeFailedRefresh = File.ReadAllText(
				AppPaths.CreateAt(cacheRoot).DehkiaFuelCachePath);
			DehkiaFuelResponse stale = await service.GetDataAsync(false, CancellationToken.None);
			if (stale.Status != "STALE"
				|| stale.Items.Count != 78
				|| stale.Items.Any(row => row.Price is null or <= 0)
				|| staleHandler.RequestCount != 1
				|| market.RequestedIds.Count != 30
				|| File.ReadAllText(AppPaths.CreateAt(cacheRoot).DehkiaFuelCachePath)
					!= cacheBeforeFailedRefresh)
			{
				return 308;
			}
		}

		using (DehkiaApiStubHandler noKeyHandler = new(
			CreateApiFixture("complete", capturedUtc),
			fakeApiKey))
		using (BdoAlertsDehkiaFuelClient noKeyClient = new(noKeyHandler, apiKey: null))
		{
			bool rejected = false;
			try
			{
				await noKeyClient.GetAsync("eu", CancellationToken.None);
			}
			catch (UnauthorizedAccessException)
			{
				rejected = true;
			}
			if (!rejected || noKeyHandler.RequestCount != 0)
			{
				return 309;
			}
		}

		using (UnconfiguredApiClient api = new())
		using (FixtureMarketProvider market = new(failAll: true))
		using (DehkiaFuelService service = new(
			AppPaths.CreateAt(Path.Combine(testRoot, "reference")),
			logger,
			api,
			market,
			() => capturedUtc))
		{
			DehkiaFuelResponse unavailable = await service.GetDataAsync(true, CancellationToken.None);
			if (unavailable.Status != "REFERENCE"
				|| unavailable.Items.Count != 78
				|| unavailable.Items.Any(row => row.Price is not null || row.Stock is not null)
				|| unavailable.Items.Select(row => (row.ItemId, row.EnhancementLevel)).Distinct().Count() != 78
				|| File.Exists(AppPaths.CreateAt(Path.Combine(testRoot, "reference")).DehkiaFuelCachePath))
			{
				return 310;
			}
		}

		using (HttpRequestMessage trusted = new(HttpMethod.Get, BdoAlertsDehkiaFuelClient.EuEndpoint))
		using (HttpRequestMessage query = new(HttpMethod.Get, BdoAlertsDehkiaFuelClient.EuEndpoint + "?sort=price"))
		using (HttpRequestMessage untrusted = new(HttpMethod.Get, "https://example.com/api/market/eu/dehkia"))
		using (HttpRequestMessage wrongMethod = new(HttpMethod.Post, BdoAlertsDehkiaFuelClient.EuEndpoint))
		{
			if (!BdoAlertsApiCredentials.TryApply(
					trusted,
					BdoAlertsDehkiaFuelClient.EuEndpoint,
					fakeApiKey)
				|| BdoAlertsApiCredentials.TryApply(query, query.RequestUri!, fakeApiKey)
				|| BdoAlertsApiCredentials.TryApply(untrusted, untrusted.RequestUri!, fakeApiKey)
				|| BdoAlertsApiCredentials.TryApply(wrongMethod, wrongMethod.RequestUri!, fakeApiKey)
				|| !trusted.Headers.TryGetValues("X-API-Key", out IEnumerable<string>? keys)
				|| !keys.SequenceEqual([fakeApiKey])
				|| trusted.RequestUri!.AbsoluteUri.Contains(fakeApiKey, StringComparison.Ordinal))
			{
				return 311;
			}
		}

		using (BlackDesertVariantsStubHandler handler = new())
		using (BlackDesertMarketProvider provider = new(logger, handler))
		{
			IReadOnlyList<MarketItem> variants = await provider.GetVariantsAsync(
				12042,
				"eu",
				CancellationToken.None);
			if (handler.RequestCount != 1
				|| variants.Count != 3
				|| variants[0].Enhancement != 1
				|| variants[0].CurrentPrice != 28_100_000
				|| variants[0].Stock != 6
				|| variants[2].Enhancement != 3
				|| variants[2].CurrentPrice != 545_000_000)
			{
				return 312;
			}
		}

		return 0;
	}

	private static bool RejectsRows(IEnumerable<DehkiaFuelRow> rows)
	{
		try
		{
			DehkiaFuelService.OrderAndValidateRows(rows, requireMarketValues: true);
			return false;
		}
		catch (InvalidDataException)
		{
			return true;
		}
	}

	private static string CreateApiFixture(string mode, DateTimeOffset capturedUtc)
	{
		object[] all = DehkiaFuelService.Catalog
			.SelectMany(item => Enumerable.Range(1, 3).Select(enhancement => (object)new
			{
				item_id = item.ItemId,
				name = item.Name,
				enhancement_level = enhancement,
				tier = item.Tier,
				price = 1_000_000L + item.ItemId * 100 + enhancement,
				stock = enhancement,
				fuel_yield = DehkiaFuelService.GetFuelYield(item.Tier, enhancement)
			}))
			.ToArray();
		object[] selected = mode switch
		{
			"complete" => all,
			"partial" => all.Take(1).ToArray(),
			_ => []
		};
		return JsonSerializer.Serialize(new
		{
			region = "eu",
			scraped_at = capturedUtc,
			total_items = selected.Length,
			items = selected
		});
	}

	private sealed class DehkiaApiStubHandler : HttpMessageHandler
	{
		private readonly string json;
		private readonly string expectedApiKey;
		private int requestCount;

		public DehkiaApiStubHandler(string json, string expectedApiKey)
		{
			this.json = json;
			this.expectedApiKey = expectedApiKey;
		}

		public int RequestCount => Volatile.Read(ref requestCount);
		public bool ExactAuthenticationObserved { get; private set; }

		protected override Task<HttpResponseMessage> SendAsync(
			HttpRequestMessage request,
			CancellationToken cancellationToken)
		{
			Interlocked.Increment(ref requestCount);
			ExactAuthenticationObserved = request.Method == HttpMethod.Get
				&& request.RequestUri == BdoAlertsDehkiaFuelClient.EuEndpoint
				&& request.Content is null
				&& request.Headers.TryGetValues("X-API-Key", out IEnumerable<string>? keys)
				&& keys.SequenceEqual([expectedApiKey])
				&& request.Headers.Authorization is null
				&& !request.RequestUri.AbsoluteUri.Contains(expectedApiKey, StringComparison.Ordinal);
			return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
			{
				Content = new StringContent(json, Encoding.UTF8, "application/json")
			});
		}
	}

	private sealed class FixtureMarketProvider : IDehkiaFuelMarketProvider
	{
		private readonly bool failAll;
		private readonly ConcurrentBag<long> requestedIds = [];

		public FixtureMarketProvider(bool failAll = false)
		{
			this.failAll = failAll;
		}

		public IReadOnlyCollection<long> RequestedIds => requestedIds.ToArray();

		public Task<IReadOnlyList<MarketItem>> GetVariantsAsync(
			long itemId,
			string region,
			CancellationToken cancellationToken)
		{
			requestedIds.Add(itemId);
			if (failAll)
			{
				throw new HttpRequestException("Offline failure fixture.");
			}
			(long Price, long Stock) lightstone = itemId switch
			{
				766104 => (4_500_000, 50),
				766105 => (4_340_000, 20),
				766106 => (4_600_000, 0),
				766107 => (4_700_000, 10),
				_ => default
			};
			if (lightstone.Price > 0)
			{
				return Task.FromResult<IReadOnlyList<MarketItem>>
				([
					new MarketItem(itemId, 0, "Imperfect Lightstone", 2, lightstone.Price, lightstone.Stock, 1, 0, 0)
				]);
			}

			DehkiaFuelCatalogItem catalog = DehkiaFuelService.Catalog.Single(item => item.ItemId == itemId);
			return Task.FromResult<IReadOnlyList<MarketItem>>(
				Enumerable.Range(0, 6)
					.Select(enhancement => new MarketItem(
						itemId,
						enhancement,
						catalog.Name,
						3,
						1_000_000L + itemId * 100 + enhancement,
						enhancement,
						100,
						0,
						0))
					.ToArray());
		}

		public void Dispose()
		{
		}
	}

	private sealed class UnconfiguredApiClient : IDehkiaFuelApiClient
	{
		public bool IsConfigured => false;

		public Task<DehkiaFuelProviderSnapshot> GetAsync(
			string region,
			CancellationToken cancellationToken)
		{
			throw new InvalidOperationException("This fixture must not be called.");
		}

		public void Dispose()
		{
		}
	}

	private sealed class BlackDesertVariantsStubHandler : HttpMessageHandler
	{
		private int requestCount;
		public int RequestCount => Volatile.Read(ref requestCount);

		protected override Task<HttpResponseMessage> SendAsync(
			HttpRequestMessage request,
			CancellationToken cancellationToken)
		{
			Interlocked.Increment(ref requestCount);
			if (request.Method != HttpMethod.Get
				|| request.RequestUri?.AbsoluteUri != "https://api.blackdesertmarket.com/item/12042?region=eu&language=en-US")
			{
				return Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadRequest));
			}
			string json = JsonSerializer.Serialize(new
			{
				code = "SUCCESS",
				data = new[]
				{
					new { id = 12042, enhancement = 1, name = "Forest Ronaros Ring", grade = 3, basePrice = 28_100_000, count = 6, tradeCount = 100, mainCategory = 20, subCategory = 1 },
					new { id = 12042, enhancement = 2, name = "Forest Ronaros Ring", grade = 3, basePrice = 153_000_000, count = 1, tradeCount = 50, mainCategory = 20, subCategory = 1 },
					new { id = 12042, enhancement = 3, name = "Forest Ronaros Ring", grade = 3, basePrice = 545_000_000, count = 1, tradeCount = 25, mainCategory = 20, subCategory = 1 }
				}
			});
			return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
			{
				Content = new StringContent(json, Encoding.UTF8, "application/json")
			});
		}
	}
}
