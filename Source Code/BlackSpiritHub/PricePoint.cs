using System;

namespace BlackSpiritHub;

internal sealed record PricePoint(DateTimeOffset Timestamp, long Price, long? Stock, long? TradeCount);

