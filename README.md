# Black Spirit Hub

Desktop helper app for Black Desert Online.

## Updates

The app checks `update.json` on startup. When `update.json` reports a version newer than the local app version, the app shows a clickable update badge in the bottom-right status bar. One click downloads the version-pinned installer, verifies its SHA-256 hash, launches it, and closes the running app so the update can proceed.

Current public manifest:

```text
https://raw.githubusercontent.com/Chucksterboy/black-spirit-hub/main/update.json
```

## Release Flow

Run this from the repository root:

```powershell
.\scripts\release.ps1 -Version v0.9.21 -Notes "Short release notes here."
```

The script:

- updates the app version
- updates `update.json`
- publishes the app self-contained for Windows x64
- builds a native Inno Setup installer around that single app payload
- commits the release
- tags the version
- pushes to GitHub
- creates a GitHub Release
- uploads the installer

End users do not need to install .NET. The app carries its own .NET runtime; the
installer is native and does not bundle a second copy. Release machines need the
.NET 8 SDK and Inno Setup 6.

GitHub CLI must be logged in before releasing:

```powershell
gh auth status
```
