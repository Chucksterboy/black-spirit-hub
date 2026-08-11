using System.Runtime.CompilerServices;

namespace BlackSpiritHub;

internal sealed record MarketSettings(string Region, int IntervalMinutes)
{
	internal const int DefaultCheckIntervalMinutes = 60;

	public static MarketSettings Default { get; } = new MarketSettings("eu", DefaultCheckIntervalMinutes);

	[CompilerGenerated]
	private MarketSettings(MarketSettings original)
	{
		Region = original.Region;
		IntervalMinutes = original.IntervalMinutes;
	}
}

