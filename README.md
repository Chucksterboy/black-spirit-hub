# Black Spirit Hub

Desktop helper app for Black Desert Online.

## Install

[Get Black Spirit Hub from Microsoft Store](https://apps.microsoft.com/detail/9PNLW455K1GN)

Microsoft Store is the only supported public installation and update channel.
This repository remains the home for source code, documentation, issues, and
release notes; it no longer distributes routine installer downloads.

## Updates and the legacy migration

Store-installed copies are updated by Microsoft Store. At startup, the Store
edition checks Microsoft Store for a package update that is available to that
specific installation. When one is ready, it shows **New update available** in
the bottom bar. Selecting it opens Microsoft Store and closes Black Spirit Hub
so the package is not locked when the user selects **Update**.
Black Spirit Hub never downloads or runs a GitHub installer from a Store
installation.

The Store edition also reads a small public Worker announcement for the latest
published Store version. This can show a passive rollout notice promptly, but
the actionable update control still waits for Microsoft Store to confirm that
the package is available for that device.

Existing GitHub-installed copies receive one final transition update because
their already-published updater cannot be changed remotely to launch Microsoft Store.
After that update is installed, its bottom-right action reads **New update
available** and opens the Black Spirit Hub Store page. The user chooses
**Get** or **Install** there. On first Store launch, existing app data is copied
into the Store package's local data folder without deleting the old copy. This
includes saved app data and browser-stored interface preferences.

Keep the old direct copy until the Store version has opened successfully. It can
then be uninstalled normally from Windows Settings.

## Microsoft Store release flow

1. Make and test the app change.
2. Build a higher-version MSIX upload bundle with `scripts/build-store-msix.ps1`.
3. Create an Update submission for Black Spirit Hub in Partner Center.
4. Upload the `.msixupload`, complete the submission, and submit it for
   certification.
5. Once approved, Microsoft Store delivers the update to Store users.

The old `scripts/release.ps1` route is deliberately locked to that one final
GitHub-to-Store transition update. It must be invoked with
`-MigrationToMicrosoftStore`; it is not for routine releases.

End users do not need to install .NET. The Store package includes the runtime it
needs. See the [game-data review workflow](docs/game-data-maintenance.md) for
maintenance guidance.
Use `scripts/verify.ps1` for the nonvisual regression suite.
