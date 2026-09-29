using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal sealed class UpdateCheckerService
{
	public Task<UpdateCheckResult> CheckAsync(CancellationToken cancellationToken)
	{
		cancellationToken.ThrowIfCancellationRequested();
		if (DistributionChannel.IsMicrosoftStore)
		{
			return Task.FromResult(new UpdateCheckResult(
				UpdateAvailable: false,
				CurrentVersion: AppVersion.Current,
				LatestVersion: AppVersion.Current,
				Url: AppVersion.MicrosoftStoreWebUrl,
				RepositoryUrl: AppVersion.RepositoryUrl,
				Message: DistributionChannel.MicrosoftStoreUpdateMessage,
				CheckFailed: false,
				Sha256: null,
				StoreManaged: true));
		}

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
	bool MicrosoftStoreMigration = false);

