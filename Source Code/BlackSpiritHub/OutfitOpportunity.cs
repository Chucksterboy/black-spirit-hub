using System;

namespace BlackSpiritHub;

internal sealed record OutfitOpportunity(long ItemId, string Name, long Price, long Stock, long? PreorderCount, long? LifetimeSales, long? Sales24Hours, long? Sales3Days, long? Sales7Days, double? SalesPerDay, double? SevenDayChancePercent, double? EstimatedQueueDays, double? DemandMomentumPercent, double ConfidencePercent, double Score, bool RecommendationEligible, bool PreorderDataFresh, bool SalesSignalEligible, double SalesSignalScore, int SampleCount, DateTimeOffset? LastSalesSampleUtc, bool SalesDataStale, DateTimeOffset? LastDetailedUtc);

