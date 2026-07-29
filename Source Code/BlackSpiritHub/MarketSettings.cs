using System.Runtime.CompilerServices;

namespace BlackSpiritHub;

internal sealed record MarketSettings(string Region, int IntervalMinutes)
{
	public static MarketSettings Default { get; } = new MarketSettings("eu", 360);

	[CompilerGenerated]
	private MarketSettings(MarketSettings original)
	{
		Region = original.Region;
		IntervalMinutes = original.IntervalMinutes;
	}
}

