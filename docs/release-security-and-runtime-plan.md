# Release security and runtime maintenance

## Publisher signing: integration ready, certificate still required

The release script can now sign the application **before** packaging, sign the
installer, and compute the updater's SHA-256 **after** signing. A selected signing
configuration is validated before release mutations. Signing, timestamping or
verification failure stops the release; it never silently substitutes unsigned
files. `-RequireSigning` also rejects missing signing configuration.

Configure `BSH_SIGNING_CERT_THUMBPRINT` and `BSH_SIGNING_TIMESTAMP_URL` outside the
repository. The certificate must be a valid publisher code-signing certificate
in the CurrentUser `My` store with its private key accessible to Windows signing
tools. LocalMachine storage is supported with `-SigningCertificateStore
LocalMachine`. Use the signing provider's HTTPS RFC 3161 timestamp endpoint.
No certificate passwords or exported private keys belong in scripts or Git.

Run `scripts/sign-release-file.ps1 -CertificateThumbprint THUMBPRINT
-TimestampUrl HTTPS_ENDPOINT -ValidateOnly` to check local readiness without
changing a release file. Actual signing additionally requires `-FilePath` pointing
to the exact executable. Timestamp verification requires network access.

No usable signing certificate was found on the development machine during this
implementation. Therefore this change does **not** make existing releases signed.
Unsigned development builds remain possible with an explicit warning in the
release script; use `-RequireSigning` once publisher provisioning is complete.
Signing supplies publisher identity but does not promise removal of SmartScreen
warnings. See [Microsoft SignTool documentation](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool).

Draft releases now stop before publishing `update.json` to `main`. After a draft
is deliberately published, verify its public installer and final hash before
promoting the release commit. Implementing these safeguards does not itself
create or publish a release; publication remains an explicit release step.

## BDO Alerts credential: distribution permission is unresolved

The current build embeds an API key in assembly metadata. Moving the key out of
source control is useful but does not make a distributed desktop key secret.
Anyone with the executable may recover it.

The [provider's API documentation](https://bdoalerts.net/docs/api.html?section=authentication)
requires a use-case application and lists limits of 100 requests/minute and
5,000/day. It does not explicitly authorize redistribution of one key to all
desktop installations. Do not interpret its JavaScript sample as permission.
Confirm written approval for this exact public desktop use, quota allocation,
abuse handling and rotation before calling the design approved.

If the provider approves a public client credential, document that approval and
its limits without recording the key. If it is private/shared-quota, choose with
the owner between per-user keys or a controlled backend that retains the secret,
authenticates clients and enforces caching and rate limits. A backend has hosting,
privacy and operational implications and is not silently created by this patch.
Do not rotate or remove the active key until its replacement and migration are
ready; that could break existing users. No credential was exposed or changed in
this implementation.

## .NET 10 LTS migration plan

This patch retains the installed .NET 8 build target. The local machine currently
has SDK 8.0.424; no .NET 10 compatibility result is claimed. Per the
[official support policy](https://dotnet.microsoft.com/en-us/platform/support/policy),
.NET 8 support ends November 10, 2026, and .NET 10 LTS runs through November 14,
2028. Complete the following migration before the .NET 8 deadline:

1. Provision the .NET 10 SDK in development and CI. Pin a serviced SDK version.
2. Change the Windows application and native test harness targets together;
   update hardcoded `net8.0-windows` verification paths and SDK messages.
3. Validate supported Windows versions, WebView2, SQLite/native SQLite and
   ONNX/OCR compatibility. Upgrade dependencies deliberately; retain their
   licenses and native packaging checks.
4. Run the complete verification suite, including OCR fixtures, weekly reset
   journeys, migration/backup recovery, the background scheduler fakes, and
   startup cold/warm cache tests.
5. Publish self-contained win-x64 artifacts. Test the native installer with no
   external .NET runtime, then test upgrading an isolated older profile and
   preserving coupons, weeklies, recipe resources and preferences.
6. Measure cold/warm launch and memory use with the same workload. Test tray
   restore, notification delivery and background collection separately.
7. Obtain owner approval for the tested runtime release, retain a recovery
   installer and profile backup, then publish using the ordinary release flow.

## Verification boundaries

Automated workflow tests execute production functions but replace network,
Windows task execution and user storage with controlled boundaries. They are
not a claim of full end-to-end visual or live-service testing. The user requested
no visual QA. The UI manifest measures asset synchronization only, not total
application startup. The game-data manifest records provenance and outstanding
review needs; it is neither a signature nor automatic proof of current game data.
