using System;
using System.Threading;
using System.Threading.Tasks;
#if BLACK_SPIRIT_HUB_STORE
using Windows.Services.Store;
#endif

namespace BlackSpiritHub;

internal sealed class UpdateCheckerService
{
#if BLACK_SPIRIT_HUB_STORE
	private static readonly TimeSpan MicrosoftStoreCheckInterval = TimeSpan.FromMinutes(30);

	private readonly SemaphoreSlim microsoftStoreCheckGate = new(1, 1);

	private UpdateCheckResult? cachedMicrosoftStoreCheck;

	private DateTimeOffset nextMicrosoftStoreCheckUtc;
#endif

	public Task<UpdateCheckResult> CheckAsync(CancellationToken cancellationToken)
	{
		return CheckAsync(IntPtr.Zero, cancellationToken);
	}

	public Task<UpdateCheckResult> CheckAsync(
		IntPtr ownerWindowHandle,
		CancellationToken cancellationToken)
	{
		cancellationToken.ThrowIfCancellationRequested();

#if BLACK_SPIRIT_HUB_STORE
		if (DistributionChannel.IsMicrosoftStore)
		{
			return CheckMicrosoftStoreAsync(ownerWindowHandle, cancellationToken);
		}
#endif

		return Task.FromResult(new UpdateCheckResult(
			UpdateAvailable: true,
			CurrentVersion: AppVersion.Current,
			LatestVersion: AppVersion.Current,
			Url: AppVersion.MicrosoftStoreWebUrl,
			RepositoryUrl: AppVersion.RepositoryUrl,
			Message: DistributionChannel.MicrosoftStoreMigrationMessage,
			CheckFailed: false,
			Sha256: null,
			MicrosoftStoreMigration: true));
	}

#if BLACK_SPIRIT_HUB_STORE
	private async Task<UpdateCheckResult> CheckMicrosoftStoreAsync(
		IntPtr ownerWindowHandle,
		CancellationToken cancellationToken)
	{
		// Store smoke builds run unpackaged. The Store API only applies after
		// Windows has given this process the package identity of an MSIX install.
		if (!MicrosoftStorePackagePaths.HasPackageIdentity())
		{
			return CreateMicrosoftStoreResult(updateAvailable: false);
		}

		MicrosoftStoreUpdateAnnouncement? announcement = await MicrosoftStoreUpdateManifest
			.GetLiveAnnouncementAsync(cancellationToken);
		cancellationToken.ThrowIfCancellationRequested();

		await microsoftStoreCheckGate.WaitAsync(cancellationToken);
		try
		{
			if (cachedMicrosoftStoreCheck is not null
				&& DateTimeOffset.UtcNow < nextMicrosoftStoreCheckUtc)
			{
				return ApplyStoreAnnouncement(cachedMicrosoftStoreCheck, announcement);
			}

			StoreContext storeContext = StoreContext.GetDefault();
			if (ownerWindowHandle != IntPtr.Zero)
			{
				WinRT.Interop.InitializeWithWindow.Initialize(storeContext, ownerWindowHandle);
			}

			// Microsoft Store evaluates this package's installed version and the
			// rollout available to this device. A non-empty result is authoritative.
			var updates = await storeContext.GetAppAndOptionalStorePackageUpdatesAsync();
			cancellationToken.ThrowIfCancellationRequested();
			return ApplyStoreAnnouncement(
				CacheMicrosoftStoreCheck(CreateMicrosoftStoreResult(
					updateAvailable: updates.Count > 0)),
				announcement);
		}
		catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
		{
			throw;
		}
		catch (Exception)
		{
			// Store availability is non-essential: leave the app usable if the
			// Store service, network, or account is temporarily unavailable. Do
			// not cache this state so a user can retry from Settings immediately.
			return CreateMicrosoftStoreResult(
				updateAvailable: false,
				checkFailed: true);
		}
		finally
		{
			microsoftStoreCheckGate.Release();
		}
	}

	private UpdateCheckResult CacheMicrosoftStoreCheck(UpdateCheckResult result)
	{
		cachedMicrosoftStoreCheck = result;
		nextMicrosoftStoreCheckUtc = DateTimeOffset.UtcNow + MicrosoftStoreCheckInterval;
		return result;
	}

	private static UpdateCheckResult ApplyStoreAnnouncement(
		UpdateCheckResult storeResult,
		MicrosoftStoreUpdateAnnouncement? announcement)
	{
		if (announcement is null)
		{
			return storeResult;
		}

		Version? installedVersion = MicrosoftStoreUpdateManifest.TryGetInstalledPackageVersion();
		if (installedVersion is null || announcement.PackageVersion <= installedVersion)
		{
			return storeResult;
		}

		return storeResult with
		{
			LatestVersion = announcement.PackageVersionText,
			StoreUpdateAnnounced = !storeResult.UpdateAvailable,
			AnnouncedVersion = storeResult.UpdateAvailable
				? null
				: announcement.PackageVersionText
		};
	}

	private static UpdateCheckResult CreateMicrosoftStoreResult(
		bool updateAvailable,
		bool checkFailed = false)
	{
		return new UpdateCheckResult(
			UpdateAvailable: updateAvailable,
			CurrentVersion: AppVersion.Current,
			LatestVersion: AppVersion.Current,
			Url: AppVersion.MicrosoftStoreWebUrl,
			RepositoryUrl: AppVersion.RepositoryUrl,
			Message: checkFailed
				? DistributionChannel.MicrosoftStoreUpdateCheckFailedMessage
				: updateAvailable
					? DistributionChannel.MicrosoftStoreUpdateAvailableMessage
					: DistributionChannel.MicrosoftStoreUpdateMessage,
			CheckFailed: checkFailed,
			Sha256: null,
			StoreManaged: true);
	}
#endif
}

internal sealed record UpdateCheckResult(
	bool UpdateAvailable,
	string CurrentVersion,
	string LatestVersion,
	string Url,
	string RepositoryUrl,
	string Message,
	bool CheckFailed,
	string? Sha256,
	bool StoreManaged = false,
	bool MicrosoftStoreMigration = false,
	bool StoreUpdateAnnounced = false,
	string? AnnouncedVersion = null);

