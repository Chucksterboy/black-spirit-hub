namespace BlackSpiritHub;

/// <summary>
/// Build-time distribution behavior. The Microsoft Store build deliberately
/// avoids executing downloaded installers and registering long-lived scheduled
/// tasks because the Store owns package updates and versioned install paths.
/// </summary>
internal static class DistributionChannel
{
	internal const string DirectInstanceMutexName = "Local\\BlackSpiritHub.SingleInstance";
	internal const string DirectInstancePipeName = "BlackSpiritHub.SingleInstance.Restore";
	internal const string StoreInstanceMutexName = "Local\\BlackSpiritHub.Store.SingleInstance";
	internal const string StoreInstancePipeName = "BlackSpiritHub.Store.SingleInstance.Restore";

#if BLACK_SPIRIT_HUB_STORE
	internal static readonly bool IsMicrosoftStore = true;
#else
	internal static readonly bool IsMicrosoftStore = false;
#endif

	internal static string InstanceMutexName => IsMicrosoftStore
		? StoreInstanceMutexName
		: DirectInstanceMutexName;

	internal static string InstancePipeName => IsMicrosoftStore
		? StoreInstancePipeName
		: DirectInstancePipeName;

	internal static bool UsesPreviousProductInstanceEndpoint => !IsMicrosoftStore;

	internal const string MicrosoftStoreUpdateMessage =
		"Updates are managed by the Microsoft Store.";

	internal const string MicrosoftStoreMigrationMessage =
		"A new version is available in the Microsoft Store. Select New update available in the bottom bar to continue receiving updates.";

	internal const string MicrosoftStoreBackgroundMarketMessage =
		"Background market collection while the app is closed is unavailable in the Microsoft Store edition. Market updates continue while Black Spirit Hub is open.";
}
