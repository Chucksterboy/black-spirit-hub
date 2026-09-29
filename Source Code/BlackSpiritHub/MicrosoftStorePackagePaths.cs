using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

namespace BlackSpiritHub;

/// <summary>
/// Resolves a durable, package-owned LocalState folder when this process is
/// running inside an MSIX package. The fallback keeps Store-mode smoke builds
/// runnable outside a package, while an actual Store install always receives
/// a package family name from Windows.
/// </summary>
internal static class MicrosoftStorePackagePaths
{
	private const int ErrorInsufficientBuffer = 122;

	internal static bool HasPackageIdentity()
	{
		return !string.IsNullOrWhiteSpace(TryGetCurrentPackageFamilyName());
	}

	internal static string ResolveAppDataRoot(string localAppData, string appFolderName)
	{
		ArgumentException.ThrowIfNullOrWhiteSpace(localAppData);
		ArgumentException.ThrowIfNullOrWhiteSpace(appFolderName);
		string? packageFamilyName = TryGetCurrentPackageFamilyName();
		return string.IsNullOrWhiteSpace(packageFamilyName)
			? Path.Combine(localAppData, appFolderName)
			: BuildLocalStateRoot(localAppData, packageFamilyName, appFolderName);
	}

	internal static string BuildLocalStateRoot(
		string localAppData,
		string packageFamilyName,
		string appFolderName)
	{
		ArgumentException.ThrowIfNullOrWhiteSpace(localAppData);
		ArgumentException.ThrowIfNullOrWhiteSpace(packageFamilyName);
		ArgumentException.ThrowIfNullOrWhiteSpace(appFolderName);
		return Path.Combine(localAppData, "Packages", packageFamilyName, "LocalState", appFolderName);
	}

	private static string? TryGetCurrentPackageFamilyName()
	{
		if (!OperatingSystem.IsWindows())
		{
			return null;
		}

		uint length = 0;
		int result = GetCurrentPackageFamilyName(ref length, null);
		if (result != ErrorInsufficientBuffer || length == 0 || length > 32_768)
		{
			return null;
		}

		StringBuilder value = new((int)length);
		return GetCurrentPackageFamilyName(ref length, value) == 0
			? value.ToString()
			: null;
	}

	[DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
	private static extern int GetCurrentPackageFamilyName(
		ref uint packageFamilyNameLength,
		StringBuilder? packageFamilyName);
}
