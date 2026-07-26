internal static class InstallerConfig
{
	public const string AppName = "Black Spirit Hub";
	public const string ShortcutName = "Black Spirit Hub";
	public const string ExeName = "Black Spirit Hub.exe";
	public const string InstallFolderName = "Black Spirit Hub";

	public static string PreviousAppName => string.Concat("BDO ", "Multi", "-", "Tool");
	public static string PreviousShortcutName => PreviousAppName;
	public static string PreviousExeName => PreviousAppName + ".exe";
	public static string PreviousInstallFolderName => PreviousAppName;
	public static string PreviousMarketCollectorTaskName => PreviousAppName + " Market Collector";
	public static string PreviousSingleInstancePipeName => string.Concat("BDO", "Multi", "Tool.SingleInstance.Restore");
}
