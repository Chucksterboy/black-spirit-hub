using System;
using System.Collections.Generic;

namespace BlackSpiritHub;

internal sealed record OutfitReport(int CatalogCount, int DetailedCount, double CoveragePercent, DateTimeOffset? LastCatalogSyncUtc, DateTimeOffset? LastSalesSampleUtc, int StaleSalesOutfitCount, IReadOnlyList<OutfitOpportunity> Opportunities, IReadOnlyList<OutfitOpportunity> TopOpportunities);

