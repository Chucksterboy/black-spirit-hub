using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.IO.Pipes;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security;
using System.Security.Cryptography.X509Certificates;
using System.Security.Principal;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;
using Microsoft.Web.WebView2.Core;

internal static class Program
{
	[STAThread]
	private static void Main(string[] args)
	{
		SetSafeWorkingDirectory();
		if (args.Any(arg => string.Equals(arg, "--self-test", StringComparison.OrdinalIgnoreCase)))
		{
			Environment.ExitCode = InstallerSelfTest.Run();
			return;
		}
		if (args.Length == 2
			&& string.Equals(args[0], "--verify-webview2-bootstrapper", StringComparison.OrdinalIgnoreCase))
		{
			try
			{
				WebView2RuntimePrerequisite.ValidateMicrosoftBootstrapper(args[1]);
				Environment.ExitCode = 0;
			}
			catch
			{
				Environment.ExitCode = 1;
			}
			return;
		}

		ApplicationConfiguration.Initialize();
		Application.Run(new InstallerForm(args));
	}

	internal static void SetSafeWorkingDirectory()
	{
		string processPath = Environment.ProcessPath ?? string.Empty;
		string safeDirectory = Path.GetDirectoryName(processPath) ?? Path.GetTempPath();
		if (Directory.Exists(safeDirectory))
			Environment.CurrentDirectory = safeDirectory;
	}
}

internal sealed class InstallerForm : Form
{
	private const string MarketCollectorTaskName = "Black Spirit Hub Market Collector";
	private const string SingleInstancePipeName = "BlackSpiritHub.SingleInstance.Restore";

	private readonly CheckBox desktopShortcut;
	private readonly Button installButton;
	private readonly Button cancelButton;
	private readonly Button webView2Button;
	private readonly ProgressBar progress;
	private readonly Label status;
	private readonly Label webView2Status;
	private readonly string installPath;
	private readonly string previousInstallPath;
	private readonly int? sourceProcessId;
	private bool webView2OperationActive;
	private bool missingRuntimePromptShown;

	public InstallerForm(string[] args)
	{
		InstallTarget target = ResolveInstallTarget(args);
		installPath = target.Path;
		previousInstallPath = target.PreviousPath;
		sourceProcessId = target.SourceProcessId;
		Text = InstallerConfig.AppName + " Setup";
		StartPosition = FormStartPosition.CenterScreen;
		FormBorderStyle = FormBorderStyle.FixedDialog;
		MaximizeBox = false;
		MinimizeBox = false;
		ClientSize = new Size(520, 345);
		BackColor = Color.FromArgb(12, 18, 28);
		ForeColor = Color.White;
		Font = new Font("Segoe UI", 9f);

		Label title = new Label
		{
			Text = "Install " + InstallerConfig.AppName,
			Font = new Font("Segoe UI", 18f, FontStyle.Bold),
			AutoSize = false,
			Location = new Point(24, 22),
			Size = new Size(470, 42)
		};

		Label body = new Label
		{
			Text = "This will install the application for your Windows user account.",
			AutoSize = false,
			Location = new Point(26, 72),
			Size = new Size(460, 24),
			ForeColor = Color.FromArgb(210, 220, 235)
		};

		Label path = new Label
		{
			Text = "Install location:\r\n" + installPath,
			AutoSize = false,
			Location = new Point(26, 105),
			Size = new Size(465, 45),
			ForeColor = Color.FromArgb(170, 185, 205)
		};

		webView2Status = new Label
		{
			AutoSize = false,
			Location = new Point(28, 157),
			Size = new Size(275, 42),
			ForeColor = Color.FromArgb(170, 185, 205)
		};

		webView2Button = new Button
		{
			Text = "Install / Repair WebView2",
			Location = new Point(310, 160),
			Size = new Size(182, 31)
		};
		webView2Button.Click += async (_, _) => await OfferWebView2InstallOrRepairAsync();

		desktopShortcut = new CheckBox
		{
			Text = "Create desktop shortcut",
			Checked = true,
			AutoSize = true,
			Location = new Point(29, 207),
			ForeColor = Color.White
		};

		progress = new ProgressBar
		{
			Location = new Point(28, 239),
			Size = new Size(464, 18),
			Style = ProgressBarStyle.Continuous
		};

		status = new Label
		{
			Text = "Ready to install.",
			AutoSize = false,
			Location = new Point(28, 263),
			Size = new Size(464, 22),
			ForeColor = Color.FromArgb(170, 185, 205)
		};

		installButton = new Button
		{
			Text = "Install",
			Location = new Point(316, 306),
			Size = new Size(84, 28)
		};
		installButton.Click += async (_, _) => await StartInstallAsync();

		cancelButton = new Button
		{
			Text = "Cancel",
			Location = new Point(408, 306),
			Size = new Size(84, 28)
		};
		cancelButton.Click += (_, _) => Close();

		Controls.AddRange(new Control[]
		{
			title,
			body,
			path,
			webView2Status,
			webView2Button,
			desktopShortcut,
			progress,
			status,
			installButton,
			cancelButton
		});
		RefreshWebView2Status();
	}

	protected override void OnShown(EventArgs e)
	{
		base.OnShown(e);
		if (!Directory.Exists(installPath)
			&& (string.IsNullOrWhiteSpace(previousInstallPath) || !Directory.Exists(previousInstallPath)))
			return;

		BeginInvoke(new Action(() =>
		{
			try
			{
				UseWaitCursor = true;
				status.Text = "Closing running application...";
				CloseRunningInstalledApp();
				status.Text = "Ready to update.";
			}
			catch (Exception ex)
			{
				status.Text = "Close Black Spirit Hub and try again.";
				MessageBox.Show(ex.Message, InstallerConfig.AppName + " Setup", MessageBoxButtons.OK, MessageBoxIcon.Warning);
			}
			finally
			{
				UseWaitCursor = false;
			}
		}));
	}

	protected override void OnFormClosing(FormClosingEventArgs e)
	{
		if (webView2OperationActive && e.CloseReason == CloseReason.UserClosing)
		{
			e.Cancel = true;
			status.Text = "Finishing Microsoft WebView2 setup safely. Please wait...";
			return;
		}
		base.OnFormClosing(e);
	}

	private async Task StartInstallAsync()
	{
		if (webView2OperationActive)
			return;

		if (!WebView2RuntimePrerequisite.TryGetInstalledVersion(out _))
		{
			RefreshWebView2Status();
			if (missingRuntimePromptShown)
			{
				status.Text = "WebView2 is required. Use Install / Repair WebView2, then click Install again.";
				return;
			}

			missingRuntimePromptShown = true;
			DialogResult choice = MessageBox.Show(
				"Microsoft Edge WebView2 Runtime is required to display " + InstallerConfig.AppName + ".\r\n\r\n"
				+ "Download and install Microsoft's official Evergreen Runtime now?",
				InstallerConfig.AppName + " Setup",
				MessageBoxButtons.YesNo,
				MessageBoxIcon.Question,
				MessageBoxDefaultButton.Button1);
			if (choice != DialogResult.Yes)
			{
				status.Text = "WebView2 is required before the application can be installed.";
				return;
			}

			if (!await InstallOrRepairWebView2Async())
				return;
		}

		Install();
	}

	private async Task OfferWebView2InstallOrRepairAsync()
	{
		if (webView2OperationActive)
			return;

		bool installed = WebView2RuntimePrerequisite.TryGetInstalledVersion(out string version);
		string message = installed
			? "WebView2 Runtime " + version + " is installed.\r\n\r\n"
				+ "Download and run Microsoft's official Evergreen Bootstrapper to repair or update it?"
			: "WebView2 Runtime was not detected.\r\n\r\n"
				+ "Download and install Microsoft's official Evergreen Runtime now?";
		DialogResult choice = MessageBox.Show(
			message,
			InstallerConfig.AppName + " Setup",
			MessageBoxButtons.YesNo,
			MessageBoxIcon.Question,
			MessageBoxDefaultButton.Button1);
		if (choice != DialogResult.Yes)
			return;

		await InstallOrRepairWebView2Async();
	}

	private async Task<bool> InstallOrRepairWebView2Async()
	{
		if (webView2OperationActive)
			return false;

		webView2OperationActive = true;
		bool runtimeWasInstalled = WebView2RuntimePrerequisite.TryGetInstalledVersion(out _);
		string bootstrapperPath = Path.Combine(
			Path.GetTempPath(),
			"MicrosoftEdgeWebView2Setup-" + Guid.NewGuid().ToString("N") + ".exe");
		ProgressBarStyle previousProgressStyle = progress.Style;
		int previousProgressValue = progress.Value;
		try
		{
			installButton.Enabled = false;
			webView2Button.Enabled = false;
			cancelButton.Enabled = false;
			UseWaitCursor = true;
			progress.Style = ProgressBarStyle.Marquee;
			status.Text = "Downloading the official Microsoft WebView2 installer...";
			await WebView2RuntimePrerequisite.DownloadOfficialBootstrapperAsync(
				bootstrapperPath,
				CancellationToken.None);

			status.Text = "Verifying Microsoft's digital signature...";
			WebView2RuntimePrerequisite.ValidateMicrosoftBootstrapper(bootstrapperPath);

			status.Text = runtimeWasInstalled
				? "Repairing WebView2 Runtime..."
				: "Installing WebView2 Runtime...";
			using Process bootstrapper = Process.Start(new ProcessStartInfo(
				bootstrapperPath,
				"/silent /install")
			{
				UseShellExecute = true
			}) ?? throw new InvalidOperationException("Microsoft's WebView2 installer could not be started.");

			bool runtimeAvailable = await WaitForWebView2RuntimeAsync(bootstrapper);
			if (!runtimeAvailable)
			{
				int? exitCode = null;
				try
				{
					if (bootstrapper.HasExited)
						exitCode = bootstrapper.ExitCode;
				}
				catch
				{
				}

				string exitDetails = exitCode.HasValue ? " (exit code " + exitCode.Value + ")" : string.Empty;
				throw new InvalidOperationException(
					"Microsoft's WebView2 installer finished, but the runtime was not detected"
					+ exitDetails
					+ ". Restart Windows, then use Install / Repair WebView2 and try again.");
			}

			RefreshWebView2Status();
			status.Text = runtimeWasInstalled
				? "WebView2 repair completed. Ready to install."
				: "WebView2 installed. Ready to install.";
			return true;
		}
		catch (Exception ex)
		{
			RefreshWebView2Status();
			status.Text = "WebView2 setup did not complete. The application was not installed.";
			MessageBox.Show(
				"WebView2 could not be installed or repaired safely.\r\n\r\n"
				+ ex.Message
				+ "\r\n\r\nYou can also install it from Microsoft's official WebView2 page, then reopen this installer:\r\n"
				+ "https://developer.microsoft.com/en-us/microsoft-edge/webview2/",
				InstallerConfig.AppName + " Setup",
				MessageBoxButtons.OK,
				MessageBoxIcon.Error);
			return false;
		}
		finally
		{
			TryDeleteFile(bootstrapperPath);
			progress.Style = previousProgressStyle;
			progress.Value = Math.Min(previousProgressValue, progress.Maximum);
			UseWaitCursor = false;
			installButton.Enabled = true;
			webView2Button.Enabled = true;
			cancelButton.Enabled = true;
			webView2OperationActive = false;
		}
	}

	private static async Task<bool> WaitForWebView2RuntimeAsync(Process bootstrapper)
	{
		DateTime startedAt = DateTime.UtcNow;
		DateTime deadline = DateTime.UtcNow.AddMinutes(3);
		DateTime? processExitTime = null;
		int? processExitCode = null;
		do
		{
			try
			{
				if (bootstrapper.HasExited)
				{
					processExitTime ??= DateTime.UtcNow;
					processExitCode ??= bootstrapper.ExitCode;
				}
			}
			catch
			{
				processExitTime ??= DateTime.UtcNow;
				processExitCode ??= -1;
			}

			if (processExitCode.HasValue && processExitCode.Value != 0)
				return false;

			if (processExitTime.HasValue)
			{
				// The documented bootstrapper can return before its updater child has
				// finished. Never launch the app merely because the old registration
				// still exists: allow the child to settle, then perform two real,
				// fresh-profile environment probes.
				DateTime stableAfter = startedAt.AddSeconds(30);
				DateTime postExitStableAfter = processExitTime.Value.AddSeconds(15);
				if (postExitStableAfter > stableAfter)
					stableAfter = postExitStableAfter;

				if (DateTime.UtcNow >= stableAfter
					&& WebView2RuntimePrerequisite.TryGetInstalledVersion(out _)
					&& await WebView2RuntimePrerequisite.ProbeRuntimeAsync())
				{
					await Task.Delay(2000);
					return WebView2RuntimePrerequisite.TryGetInstalledVersion(out _)
						&& await WebView2RuntimePrerequisite.ProbeRuntimeAsync();
				}
			}

			await Task.Delay(1500);
		}
		while (DateTime.UtcNow < deadline);

		return false;
	}

	private void RefreshWebView2Status()
	{
		if (WebView2RuntimePrerequisite.TryGetInstalledVersion(out string version))
		{
			webView2Status.Text = "WebView2 Runtime: installed\r\nVersion " + version;
			webView2Status.ForeColor = Color.FromArgb(119, 226, 170);
		}
		else
		{
			webView2Status.Text = "WebView2 Runtime: not detected\r\nRequired to display the application.";
			webView2Status.ForeColor = Color.FromArgb(255, 188, 104);
		}
	}

	private static void TryDeleteFile(string path)
	{
		try
		{
			if (File.Exists(path))
				File.Delete(path);
		}
		catch
		{
			// Windows may briefly retain the verified bootstrapper after it hands off to its elevated process.
		}
	}

	private void Install()
	{
		string stagingPath = null;
		try
		{
			installButton.Enabled = false;
			cancelButton.Enabled = false;
			UseWaitCursor = true;
			string existingInstallPath = Directory.Exists(installPath)
				? installPath
				: (!string.IsNullOrWhiteSpace(previousInstallPath) && Directory.Exists(previousInstallPath)
					? previousInstallPath
					: null);
			bool updating = existingInstallPath != null;
			status.Text = updating ? "Preparing update..." : "Installing files...";
			progress.Value = 10;

			if (updating)
			{
				UseWaitCursor = false;
				DialogResult updateChoice = MessageBox.Show(
					InstallerConfig.AppName + " is already installed.\r\n\r\nWould you like to update the existing files?\r\n\r\nYour saved settings, market samples, coupons, and other app data will be kept.",
					InstallerConfig.AppName + " Update",
					MessageBoxButtons.YesNo,
					MessageBoxIcon.Question,
					MessageBoxDefaultButton.Button1);
				if (updateChoice != DialogResult.Yes)
				{
					status.Text = "Update cancelled.";
					installButton.Enabled = true;
					cancelButton.Enabled = true;
					return;
				}

			}

			UseWaitCursor = true;
			status.Text = "Preparing application files...";
			stagingPath = StagePayload();
			progress.Value = 20;

			if (updating)
			{
				status.Text = "Closing running app...";
				CloseRunningInstalledApp();
			}

			status.Text = updating ? "Updating files..." : "Installing files...";
			ReplaceApplicationFiles(stagingPath, installPath, existingInstallPath);
			stagingPath = null;
			progress.Value = 65;

			string exePath = Path.Combine(installPath, InstallerConfig.ExeName);
			if (!File.Exists(exePath))
				throw new FileNotFoundException("Installed application executable was not found.", exePath);

			status.Text = "Removing retired shortcuts...";
			RemovePreviousProductIntegrations();
			status.Text = "Creating shortcuts...";
			CreateStartMenuShortcut(exePath, exePath);
			if (desktopShortcut.Checked)
			{
				string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
				CreateShortcut(Path.Combine(desktop, InstallerConfig.ShortcutName + ".lnk"), exePath, exePath);
			}
			status.Text = "Scheduling market collector...";
			bool marketCollectorScheduled = CreateMarketCollectorTask(exePath);
			progress.Value = 90;

			status.Text = marketCollectorScheduled ? "Market collector scheduled." : "Market collector will refresh when the app opens.";
			WriteUninstallHelper();
			progress.Value = 100;
			UseWaitCursor = false;

			DialogResult result = MessageBox.Show(
				InstallerConfig.AppName + (updating ? " has been updated." : " has been installed.") + "\r\n\r\nOpen it now?",
				InstallerConfig.AppName + " Setup",
				MessageBoxButtons.YesNo,
				MessageBoxIcon.Information);
			if (result == DialogResult.Yes)
				Process.Start(new ProcessStartInfo(exePath) { UseShellExecute = true });
			Close();
		}
		catch (Exception ex)
		{
			if (!string.IsNullOrWhiteSpace(stagingPath))
				TryDeleteDirectory(stagingPath);
			UseWaitCursor = false;
			installButton.Enabled = true;
			cancelButton.Enabled = true;
			status.Text = "Install failed.";
			MessageBox.Show(
				"The application could not be installed safely. No working installation was removed.\r\n\r\n" + ex.Message,
				InstallerConfig.AppName + " Setup",
				MessageBoxButtons.OK,
				MessageBoxIcon.Error);
		}
	}

	private string StagePayload()
	{
		string parentPath = Directory.GetParent(installPath)?.FullName
			?? throw new InvalidOperationException("The application install folder is invalid.");
		Directory.CreateDirectory(parentPath);
		string stagingPath = Path.Combine(parentPath, $".{InstallerConfig.InstallFolderName}.staging-{Guid.NewGuid():N}");
		Directory.CreateDirectory(stagingPath);
		try
		{
			using Stream payload = Assembly.GetExecutingAssembly().GetManifestResourceStream("Payload.zip")
				?? throw new InvalidOperationException("Installer payload is missing.");
			using ZipArchive archive = new ZipArchive(payload, ZipArchiveMode.Read);
			ValidatePayloadArchive(archive);
			archive.ExtractToDirectory(stagingPath, true);
			ValidateStagedPayload(stagingPath);
			return stagingPath;
		}
		catch
		{
			TryDeleteDirectory(stagingPath);
			throw;
		}
	}

	private static readonly string[] RequiredPayloadFiles =
	{
		InstallerConfig.ExeName,
		"WebView2Loader.dll",
		"e_sqlite3.dll",
		"BlackSpiritHub.Resources.Black_Spirit_Hub.html",
		"BlackSpiritHub.Resources.Black_Spirit_Hub.css",
		"BlackSpiritHub.Resources.Black_Spirit_Hub.js",
		"gold-coins.png",
		"Assets/AppIcon/app-icon.ico",
		"Assets/AppIcon/app-icon.png",
		"Assets/AppIcon/app-icon-ui.png",
		"Assets/GrindTracker/grind-spots.js"
	};

	internal static void ValidatePayloadArchive(ZipArchive archive)
	{
		HashSet<string> names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
		Dictionary<string, ZipArchiveEntry> files = new Dictionary<string, ZipArchiveEntry>(
			StringComparer.OrdinalIgnoreCase);
		foreach (ZipArchiveEntry entry in archive.Entries)
		{
			string normalized = entry.FullName.Replace('\\', '/');
			string[] segments = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries);
			if (string.IsNullOrWhiteSpace(normalized)
				|| normalized.StartsWith("/", StringComparison.Ordinal)
				|| normalized.Contains(':')
				|| segments.Any(segment => segment == "..")
				|| !names.Add(normalized))
			{
				throw new InvalidDataException("Installer payload contains an unsafe or duplicate path.");
			}
			if (!normalized.EndsWith("/", StringComparison.Ordinal))
				files[normalized] = entry;
		}

		foreach (string requiredPath in RequiredPayloadFiles)
		{
			if (!files.TryGetValue(requiredPath, out ZipArchiveEntry entry) || entry.Length <= 0)
				throw new InvalidDataException("Installer payload is missing: " + requiredPath);
		}
	}

	internal static void ValidateStagedPayload(string root)
	{
		string fullRoot = Path.GetFullPath(root).TrimEnd(
			Path.DirectorySeparatorChar,
			Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
		foreach (string requiredPath in RequiredPayloadFiles)
		{
			string path = Path.GetFullPath(Path.Combine(root, requiredPath.Replace('/', Path.DirectorySeparatorChar)));
			if (!path.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase)
				|| !File.Exists(path)
				|| new FileInfo(path).Length <= 0)
			{
				throw new InvalidDataException("Prepared application payload is missing: " + requiredPath);
			}
		}
	}

	private void CloseRunningInstalledApp()
	{
		RequestGracefulAppShutdown();
		DateTime deadline = DateTime.UtcNow.AddSeconds(20);
		Exception lastError = null;
		do
		{
			Process[] processes = GetTargetProcesses();
			if (processes.Length == 0)
				return;

			foreach (Process process in processes)
			{
				using (process)
				{
					try
					{
						process.CloseMainWindow();
						process.WaitForExit(1500);
					}
					catch (InvalidOperationException)
					{
						// The process exited between enumeration and inspection.
					}
					catch (Exception ex)
					{
						lastError = ex;
					}
				}
			}

			Thread.Sleep(250);
		}
		while (DateTime.UtcNow < deadline);

		throw new InvalidOperationException(
			"The Black Spirit Hub instance being updated is still running. Close it from the system tray and try again.",
			lastError);
	}

	private static void RequestGracefulAppShutdown()
	{
		TryRequestGracefulAppShutdown(SingleInstancePipeName);
		TryRequestGracefulAppShutdown(InstallerConfig.PreviousSingleInstancePipeName);
	}

	private static void TryRequestGracefulAppShutdown(string pipeName)
	{
		try
		{
			using NamedPipeClientStream client = new NamedPipeClientStream(".", pipeName, PipeDirection.Out);
			client.Connect(1500);
			using StreamWriter writer = new StreamWriter(client);
			writer.WriteLine("shutdown-for-update");
			writer.Flush();
		}
		catch
		{
			// Older builds do not understand the shutdown command; their normal update flow still exits itself.
		}
	}

	private Process[] GetTargetProcesses()
	{
		HashSet<string> targetExecutables = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
		{
			Path.GetFullPath(Path.Combine(installPath, InstallerConfig.ExeName)),
			Path.GetFullPath(Path.Combine(installPath, InstallerConfig.PreviousExeName))
		};
		if (!string.IsNullOrWhiteSpace(previousInstallPath))
		{
			targetExecutables.Add(Path.GetFullPath(Path.Combine(previousInstallPath, InstallerConfig.ExeName)));
			targetExecutables.Add(Path.GetFullPath(Path.Combine(previousInstallPath, InstallerConfig.PreviousExeName)));
		}

		List<Process> targets = new List<Process>();
		HashSet<int> seenProcessIds = new HashSet<int>();
		foreach (string processName in new[]
		{
			Path.GetFileNameWithoutExtension(InstallerConfig.ExeName),
			Path.GetFileNameWithoutExtension(InstallerConfig.PreviousExeName)
		})
		{
			foreach (Process process in Process.GetProcessesByName(processName))
			{
				if (!seenProcessIds.Add(process.Id))
				{
					process.Dispose();
					continue;
				}

				bool isTarget = sourceProcessId.HasValue && process.Id == sourceProcessId.Value;
				if (!isTarget)
				{
					try
					{
						string processPath = process.MainModule?.FileName ?? string.Empty;
						isTarget = !string.IsNullOrWhiteSpace(processPath)
							&& targetExecutables.Contains(Path.GetFullPath(processPath));
					}
					catch
					{
					}
				}

				if (isTarget)
					targets.Add(process);
				else
					process.Dispose();
			}
		}
		return targets.ToArray();
	}

	internal static InstallTarget ResolveInstallTarget(string[] args)
	{
		string defaultPath = Path.Combine(
			Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
			"Programs",
			InstallerConfig.InstallFolderName);
		string previousDefaultPath = Path.Combine(
			Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
			"Programs",
			InstallerConfig.PreviousInstallFolderName);
		int? requestedProcessId = TryReadIntArgument(args, "--source-pid");
		string requestedPath = TryReadStringArgument(args, "--install-path");
		if (!string.IsNullOrWhiteSpace(requestedPath))
		{
			string fullPath = Path.GetFullPath(requestedPath).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
			if (!string.Equals(fullPath, Path.GetFullPath(defaultPath), StringComparison.OrdinalIgnoreCase)
				&& !string.Equals(fullPath, Path.GetFullPath(previousDefaultPath), StringComparison.OrdinalIgnoreCase)
				&& !File.Exists(Path.Combine(fullPath, InstallerConfig.ExeName))
				&& !File.Exists(Path.Combine(fullPath, InstallerConfig.PreviousExeName)))
			{
				throw new InvalidOperationException("The requested update folder does not contain Black Spirit Hub.");
			}
			return CreateInstallTarget(fullPath, defaultPath, previousDefaultPath, requestedProcessId);
		}

		List<InstallTarget> candidates = new List<InstallTarget>();
		int currentSessionId = Process.GetCurrentProcess().SessionId;
		HashSet<int> seenProcessIds = new HashSet<int>();
		foreach (string processName in new[]
		{
			Path.GetFileNameWithoutExtension(InstallerConfig.ExeName),
			Path.GetFileNameWithoutExtension(InstallerConfig.PreviousExeName)
		})
		{
			foreach (Process process in Process.GetProcessesByName(processName))
			{
				using (process)
				{
					if (!seenProcessIds.Add(process.Id))
						continue;
					try
					{
						if (process.SessionId != currentSessionId)
							continue;
						string processPath = process.MainModule?.FileName ?? string.Empty;
						string directory = Path.GetDirectoryName(processPath) ?? string.Empty;
						if (!string.IsNullOrWhiteSpace(directory))
						{
							candidates.Add(CreateInstallTarget(
								Path.GetFullPath(directory),
								defaultPath,
								previousDefaultPath,
								process.Id));
						}
					}
					catch
					{
					}
				}
			}
		}

		InstallTarget detected = candidates.FirstOrDefault(candidate =>
			string.Equals(candidate.Path, Path.GetFullPath(defaultPath), StringComparison.OrdinalIgnoreCase))
			?? candidates.FirstOrDefault();
		if (detected != null)
			return detected;
		if (Directory.Exists(defaultPath))
			return new InstallTarget(defaultPath, null, requestedProcessId);
		if (Directory.Exists(previousDefaultPath))
			return new InstallTarget(defaultPath, previousDefaultPath, requestedProcessId);
		return new InstallTarget(defaultPath, null, requestedProcessId);
	}

	private static InstallTarget CreateInstallTarget(
		string existingPath,
		string defaultPath,
		string previousDefaultPath,
		int? sourceProcessId)
	{
		bool usesPreviousExecutable = File.Exists(Path.Combine(existingPath, InstallerConfig.PreviousExeName));
		bool usesPreviousFolderName = string.Equals(
			Path.GetFileName(existingPath),
			InstallerConfig.PreviousInstallFolderName,
			StringComparison.OrdinalIgnoreCase);
		bool isPreviousDefault = string.Equals(
			Path.GetFullPath(existingPath),
			Path.GetFullPath(previousDefaultPath),
			StringComparison.OrdinalIgnoreCase);
		if (usesPreviousExecutable && (usesPreviousFolderName || isPreviousDefault))
		{
			string targetPath = isPreviousDefault
				? defaultPath
				: Path.Combine(
					Directory.GetParent(existingPath)?.FullName
						?? throw new InvalidOperationException("The existing install folder is invalid."),
					InstallerConfig.InstallFolderName);
			return new InstallTarget(targetPath, existingPath, sourceProcessId);
		}

		return new InstallTarget(existingPath, null, sourceProcessId);
	}

	private static string TryReadStringArgument(string[] args, string name)
	{
		for (int index = 0; index < args.Length - 1; index++)
		{
			if (string.Equals(args[index], name, StringComparison.OrdinalIgnoreCase))
				return args[index + 1];
		}
		return string.Empty;
	}

	private static int? TryReadIntArgument(string[] args, string name)
	{
		string value = TryReadStringArgument(args, name);
		return int.TryParse(value, out int parsed) && parsed > 0 ? parsed : null;
	}

	internal static void ReplaceApplicationFiles(string stagingPath, string targetPath, bool updating)
	{
		ReplaceApplicationFiles(stagingPath, targetPath, updating ? targetPath : null);
	}

	internal static void ReplaceApplicationFiles(string stagingPath, string targetPath, string existingPath)
	{
		string backupPath = null;
		bool existingMoved = false;
		bool stagedFilesInstalled = false;
		try
		{
			if (!string.IsNullOrWhiteSpace(existingPath) && Directory.Exists(existingPath))
			{
				string backupParent = Directory.GetParent(targetPath)?.FullName
					?? throw new InvalidOperationException("The application install folder is invalid.");
				backupPath = Path.Combine(
					backupParent,
					$".{InstallerConfig.InstallFolderName}.backup-{Guid.NewGuid():N}");
				RetryFileSystemAction(
					() => Directory.Move(existingPath, backupPath),
					"Windows did not release the existing application files in time.");
				existingMoved = true;
			}

			RetryFileSystemAction(
				() => Directory.Move(stagingPath, targetPath),
				"The prepared application files could not be moved into place.");
			stagedFilesInstalled = true;

			if (!File.Exists(Path.Combine(targetPath, InstallerConfig.ExeName)))
				throw new InvalidDataException("The installed application executable is missing after replacement.");

			if (existingMoved && backupPath != null)
				TryDeleteDirectory(backupPath);
		}
		catch
		{
			if (stagedFilesInstalled)
				TryDeleteDirectory(targetPath);
			if (existingMoved
				&& backupPath != null
				&& Directory.Exists(backupPath)
				&& !Directory.Exists(existingPath))
			{
				RetryFileSystemAction(
					() => Directory.Move(backupPath, existingPath),
					"The previous application files could not be restored.");
			}
			throw;
		}
		finally
		{
			if (Directory.Exists(stagingPath))
				TryDeleteDirectory(stagingPath);
		}
	}

	internal static void RetryFileSystemAction(Action action, string failureMessage)
	{
		Exception lastError = null;
		for (int attempt = 1; attempt <= 12; attempt++)
		{
			try
			{
				action();
				return;
			}
			catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
			{
				lastError = ex;
				if (attempt < 12)
					Thread.Sleep(500);
			}
		}

		throw new IOException(failureMessage, lastError);
	}

	internal static void TryDeleteDirectory(string path)
	{
		if (!Directory.Exists(path))
			return;

		try
		{
			foreach (string file in Directory.EnumerateFiles(path, "*", SearchOption.AllDirectories))
				File.SetAttributes(file, FileAttributes.Normal);
			RetryFileSystemAction(() => Directory.Delete(path, true), "Temporary installer files could not be removed.");
		}
		catch
		{
			// A stale staging or backup folder is safer than removing a working installation.
		}
	}

	private static void CreateShortcut(string shortcutPath, string targetPath, string iconPath = null)
	{
		Directory.CreateDirectory(Path.GetDirectoryName(shortcutPath)!);
		Type shellType = Type.GetTypeFromProgID("WScript.Shell")
			?? throw new InvalidOperationException("Windows shortcut support is not available.");
		dynamic shell = Activator.CreateInstance(shellType)!;
		dynamic shortcut = shell.CreateShortcut(shortcutPath);
		shortcut.TargetPath = targetPath;
		shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath);
		shortcut.IconLocation = (iconPath ?? targetPath) + ",0";
		shortcut.Save();
		Marshal.FinalReleaseComObject(shortcut);
		Marshal.FinalReleaseComObject(shell);
	}

	private static void CreateStartMenuShortcut(string targetPath, string iconPath)
	{
		string programs = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
		string folder = Path.Combine(programs, InstallerConfig.ShortcutName);
		CreateShortcut(Path.Combine(folder, InstallerConfig.ShortcutName + ".lnk"), targetPath, iconPath);
	}

	private void RemovePreviousProductIntegrations()
	{
		string desktopShortcutPath = Path.Combine(
			Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),
			InstallerConfig.PreviousShortcutName + ".lnk");
		try
		{
			if (File.Exists(desktopShortcutPath))
				File.Delete(desktopShortcutPath);
		}
		catch
		{
		}

		string startMenuFolder = Path.Combine(
			Environment.GetFolderPath(Environment.SpecialFolder.Programs),
			InstallerConfig.PreviousShortcutName);
		TryDeleteDirectory(startMenuFolder);
		RunSchtasks("/Delete /TN \"" + InstallerConfig.PreviousMarketCollectorTaskName + "\" /F", 5000, out _);
		RunSchtasks(
			"/Delete /TN \"" + GetUserMarketCollectorTaskName(InstallerConfig.PreviousMarketCollectorTaskName) + "\" /F",
			5000,
			out _);

		if (!string.IsNullOrWhiteSpace(previousInstallPath)
			&& !string.Equals(
				Path.GetFullPath(previousInstallPath),
				Path.GetFullPath(installPath),
				StringComparison.OrdinalIgnoreCase))
		{
			TryDeleteDirectory(previousInstallPath);
		}
	}

	private void WriteUninstallHelper()
	{
		string uninstallPath = Path.Combine(installPath, "Uninstall " + InstallerConfig.ShortcutName + ".cmd");
		string desktopShortcutPath = Path.Combine(
			Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),
			InstallerConfig.ShortcutName + ".lnk");
		string startMenuFolder = Path.Combine(
			Environment.GetFolderPath(Environment.SpecialFolder.Programs),
			InstallerConfig.ShortcutName);
		string script = "@echo off\r\n"
			+ "echo Closing " + InstallerConfig.AppName + " if it is running...\r\n"
			+ "taskkill /IM \"" + InstallerConfig.ExeName + "\" /F >nul 2>nul\r\n"
			+ "schtasks /Delete /TN \"" + MarketCollectorTaskName + "\" /F >nul 2>nul\r\n"
			+ "schtasks /Delete /TN \"" + GetUserMarketCollectorTaskName(MarketCollectorTaskName) + "\" /F >nul 2>nul\r\n"
			+ "del \"" + desktopShortcutPath + "\" >nul 2>nul\r\n"
			+ "rmdir /S /Q \"" + startMenuFolder + "\" >nul 2>nul\r\n"
			+ "cd /d \"%TEMP%\"\r\n"
			+ "rmdir /S /Q \"" + installPath + "\"\r\n";
		File.WriteAllText(uninstallPath, script);
		CreateShortcut(Path.Combine(startMenuFolder, "Uninstall " + InstallerConfig.ShortcutName + ".lnk"), uninstallPath);
	}

	private bool CreateMarketCollectorTask(string exePath)
	{
		string details;
		if (TryCreateMarketCollectorTask(MarketCollectorTaskName, exePath, out details))
		{
			return true;
		}

		string userTaskName = GetUserMarketCollectorTaskName(MarketCollectorTaskName);
		if (!string.Equals(userTaskName, MarketCollectorTaskName, StringComparison.OrdinalIgnoreCase)
			&& TryCreateMarketCollectorTask(userTaskName, exePath, out details))
		{
			return true;
		}

		try
		{
			File.AppendAllText(
				Path.Combine(installPath, "install.log"),
				DateTime.Now.ToString("s") + " Market collector task was not created. " + details + Environment.NewLine);
		}
		catch
		{
		}

		return false;
	}

	private bool TryCreateMarketCollectorTask(string taskName, string exePath, out string details)
	{
		string xmlPath = Path.Combine(Path.GetTempPath(), "bdo-market-collector-task-" + Guid.NewGuid().ToString("N") + ".xml");
		try
		{
			string startBoundary = DateTime.Now.AddMinutes(5).ToString("yyyy-MM-ddTHH:mm:ss");
			string workingDirectory = Path.GetDirectoryName(exePath) ?? installPath;
			string userId = WindowsIdentity.GetCurrent().Name;
			RunSchtasks("/Delete /TN \"" + taskName + "\" /F", 5000, out _);
			string xml = @"<?xml version=""1.0"" encoding=""UTF-16""?>
<Task version=""1.4"" xmlns=""http://schemas.microsoft.com/windows/2004/02/mit/task"">
  <RegistrationInfo>
    <Author>Black Spirit Hub</Author>
    <Description>Keeps Black Spirit Hub EU market analytics samples fresh once per day.</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
    <TimeTrigger>
      <Repetition>
        <Interval>PT24H</Interval>
        <StopAtDurationEnd>false</StopAtDurationEnd>
      </Repetition>
      <StartBoundary>" + SecurityElement.Escape(startBoundary) + @"</StartBoundary>
      <Enabled>true</Enabled>
    </TimeTrigger>
  </Triggers>
  <Principals>
    <Principal id=""Author"">
      <UserId>" + SecurityElement.Escape(userId) + @"</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>true</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT45M</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context=""Author"">
    <Exec>
      <Command>" + SecurityElement.Escape(exePath) + @"</Command>
      <Arguments>--market-scheduled-update</Arguments>
      <WorkingDirectory>" + SecurityElement.Escape(workingDirectory) + @"</WorkingDirectory>
    </Exec>
  </Actions>
</Task>";
			File.WriteAllText(xmlPath, xml, System.Text.Encoding.Unicode);
			int exitCode = RunSchtasks("/Create /TN \"" + taskName + "\" /XML \"" + xmlPath + "\" /F", 15000, out details);
			return exitCode == 0;
		}
		catch (Exception ex)
		{
			details = ex.Message;
			return false;
		}
		finally
		{
			try { if (File.Exists(xmlPath)) File.Delete(xmlPath); } catch { }
		}
	}

	private static int RunSchtasks(string arguments, int timeoutMilliseconds, out string output)
	{
		ProcessStartInfo startInfo = new ProcessStartInfo("schtasks.exe", arguments)
		{
			CreateNoWindow = true,
			UseShellExecute = false,
			RedirectStandardError = true,
			RedirectStandardOutput = true
		};
		using Process process = Process.Start(startInfo) ?? throw new InvalidOperationException("Could not start Task Scheduler.");
		if (!process.WaitForExit(timeoutMilliseconds))
		{
			try { process.Kill(entireProcessTree: true); } catch { }
			output = "Task Scheduler timed out.";
			return -1;
		}

		string error = process.StandardError.ReadToEnd();
		string standardOutput = process.StandardOutput.ReadToEnd();
		output = string.IsNullOrWhiteSpace(error) ? standardOutput.Trim() : error.Trim();
		return process.ExitCode;
	}

	private static string GetUserMarketCollectorTaskName(string taskName)
	{
		string userName = Environment.UserName;
		char[] safeChars = userName.Select(ch => char.IsLetterOrDigit(ch) || ch == '-' || ch == '_' || ch == '.' ? ch : '_').ToArray();
		string safeUserName = new string(safeChars).Trim('_');
		if (string.IsNullOrWhiteSpace(safeUserName))
		{
			return taskName;
		}

		return taskName + " - " + safeUserName;
	}

	internal sealed record InstallTarget(string Path, string PreviousPath, int? SourceProcessId);
}

internal static class WebView2RuntimePrerequisite
{
	internal const string EvergreenBootstrapperUrl = "https://go.microsoft.com/fwlink/p/?LinkId=2124703";
	private const string RuntimeRegistryPath =
		@"SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
	private const long MinimumBootstrapperBytes = 256 * 1024;
	private const long MaximumBootstrapperBytes = 25 * 1024 * 1024;
	private const int MaximumRedirects = 8;
	private static readonly Guid WinTrustActionGenericVerifyV2 =
		new Guid("00AAC56B-CD44-11d0-8CC2-00C04FC295EE");

	internal static bool TryGetInstalledVersion(out string version)
	{
		try
		{
			version = CoreWebView2Environment.GetAvailableBrowserVersionString(
				browserExecutableFolder: null,
				CreateStableRuntimeOptions())?.Trim() ?? string.Empty;
			if (IsUsableRuntimeVersion(version))
				return true;
		}
		catch
		{
		}

		// The loader/API can be blocked by a damaged app-local loader or environment
		// override even though Evergreen is correctly registered. Microsoft documents
		// the EdgeUpdate `pv` values as the installer-safe fallback check.
		foreach (RegistryHive hive in new[] { RegistryHive.LocalMachine, RegistryHive.CurrentUser })
		{
			foreach (RegistryView view in Environment.Is64BitOperatingSystem
				? new[] { RegistryView.Registry32, RegistryView.Registry64 }
				: new[] { RegistryView.Default })
			{
				try
				{
					using RegistryKey baseKey = RegistryKey.OpenBaseKey(hive, view);
					using RegistryKey key = baseKey.OpenSubKey(RuntimeRegistryPath, writable: false);
					string candidate = key?.GetValue("pv") as string ?? string.Empty;
					if (IsUsableRuntimeVersion(candidate))
					{
						version = candidate.Trim();
						return true;
					}
				}
				catch
				{
				}
			}
		}

		version = string.Empty;
		return false;
	}

	internal static bool IsUsableRuntimeVersion(string value)
	{
		string candidate = (value ?? string.Empty).Trim();
		return Version.TryParse(candidate, out Version parsed)
			&& parsed > new Version(0, 0, 0, 0);
	}

	internal static async Task<bool> ProbeRuntimeAsync()
	{
		string probeFolder = Path.Combine(
			Path.GetTempPath(),
			"BlackSpiritHub-WebView2-Probe-" + Guid.NewGuid().ToString("N"));
		try
		{
			Directory.CreateDirectory(probeFolder);
			CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(
				browserExecutableFolder: null,
				userDataFolder: probeFolder,
				CreateStableRuntimeOptions());
			return IsUsableRuntimeVersion(environment.BrowserVersionString);
		}
		catch
		{
			return false;
		}
		finally
		{
			InstallerForm.TryDeleteDirectory(probeFolder);
		}
	}

	private static CoreWebView2EnvironmentOptions CreateStableRuntimeOptions()
	{
		return new CoreWebView2EnvironmentOptions
		{
			ReleaseChannels = CoreWebView2ReleaseChannels.Stable,
			ChannelSearchKind = CoreWebView2ChannelSearchKind.MostStable
		};
	}

	internal static bool IsApprovedMicrosoftDownloadUri(Uri uri)
	{
		if (uri == null
			|| !uri.IsAbsoluteUri
			|| !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
			|| !string.IsNullOrEmpty(uri.UserInfo))
		{
			return false;
		}

		string host = uri.IdnHost.TrimEnd('.');
		return string.Equals(host, "microsoft.com", StringComparison.OrdinalIgnoreCase)
			|| host.EndsWith(".microsoft.com", StringComparison.OrdinalIgnoreCase);
	}

	internal static bool IsRedirectStatusCode(HttpStatusCode statusCode)
	{
		return statusCode == HttpStatusCode.MovedPermanently
			|| statusCode == HttpStatusCode.Redirect
			|| statusCode == HttpStatusCode.RedirectMethod
			|| statusCode == HttpStatusCode.TemporaryRedirect
			|| (int)statusCode == 308;
	}

	internal static async Task DownloadOfficialBootstrapperAsync(
		string destinationPath,
		CancellationToken cancellationToken)
	{
		ArgumentException.ThrowIfNullOrWhiteSpace(destinationPath);
		Directory.CreateDirectory(
			Path.GetDirectoryName(Path.GetFullPath(destinationPath))
			?? throw new InvalidOperationException("The WebView2 download folder is invalid."));

		using HttpClientHandler handler = new HttpClientHandler
		{
			AllowAutoRedirect = false,
			AutomaticDecompression = DecompressionMethods.All
		};
		using HttpClient client = new HttpClient(handler)
		{
			Timeout = TimeSpan.FromMinutes(2)
		};
		client.DefaultRequestHeaders.UserAgent.ParseAdd("Black-Spirit-Hub-Installer/1.0");

		Uri currentUri = new Uri(EvergreenBootstrapperUrl, UriKind.Absolute);
		for (int redirectCount = 0; redirectCount <= MaximumRedirects; redirectCount++)
		{
			if (!IsApprovedMicrosoftDownloadUri(currentUri))
			{
				throw new SecurityException(
					"The WebView2 download was redirected outside Microsoft's HTTPS domains.");
			}

			using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Get, currentUri);
			using HttpResponseMessage response = await client.SendAsync(
				request,
				HttpCompletionOption.ResponseHeadersRead,
				cancellationToken);
			if (IsRedirectStatusCode(response.StatusCode))
			{
				if (response.Headers.Location == null)
					throw new InvalidDataException("Microsoft's WebView2 download returned an invalid redirect.");
				if (redirectCount == MaximumRedirects)
					throw new InvalidDataException("Microsoft's WebView2 download returned too many redirects.");

				currentUri = response.Headers.Location.IsAbsoluteUri
					? response.Headers.Location
					: new Uri(currentUri, response.Headers.Location);
				continue;
			}

			response.EnsureSuccessStatusCode();
			long? declaredLength = response.Content.Headers.ContentLength;
			if (declaredLength.HasValue
				&& (declaredLength.Value < MinimumBootstrapperBytes
					|| declaredLength.Value > MaximumBootstrapperBytes))
			{
				throw new InvalidDataException("Microsoft's WebView2 download returned an unexpected file size.");
			}

			await using Stream source = await response.Content.ReadAsStreamAsync(cancellationToken);
			await using FileStream destination = new FileStream(
				destinationPath,
				FileMode.Create,
				FileAccess.Write,
				FileShare.None,
				81920,
				useAsync: true);
			byte[] buffer = new byte[81920];
			long totalBytes = 0;
			while (true)
			{
				int bytesRead = await source.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken);
				if (bytesRead == 0)
					break;

				totalBytes += bytesRead;
				if (totalBytes > MaximumBootstrapperBytes)
					throw new InvalidDataException("Microsoft's WebView2 download exceeded the maximum expected size.");
				await destination.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
			}
			await destination.FlushAsync(cancellationToken);

			if (totalBytes < MinimumBootstrapperBytes)
				throw new InvalidDataException("Microsoft's WebView2 download was incomplete.");
			return;
		}

		throw new InvalidDataException("Microsoft's WebView2 download could not be resolved.");
	}

	internal static void ValidateMicrosoftBootstrapper(string path)
	{
		if (!File.Exists(path))
			throw new FileNotFoundException("The downloaded WebView2 installer was not found.", path);

		FileInfo file = new FileInfo(path);
		if (file.Length < MinimumBootstrapperBytes || file.Length > MaximumBootstrapperBytes)
			throw new SecurityException("The downloaded WebView2 installer has an unexpected file size.");

		uint trustResult = VerifyAuthenticodeSignature(path);
		if (trustResult != 0)
		{
			throw new SecurityException(
				"Windows could not verify the WebView2 installer's Authenticode signature "
				+ "(trust result 0x"
				+ trustResult.ToString("X8")
				+ ").");
		}

		try
		{
#pragma warning disable SYSLIB0057
			using X509Certificate signedCertificate = X509Certificate.CreateFromSignedFile(path);
			using X509Certificate2 signer = new X509Certificate2(signedCertificate);
#pragma warning restore SYSLIB0057
			string simpleName = signer.GetNameInfo(X509NameType.SimpleName, forIssuer: false);
			string decodedSubject = signer.SubjectName.Decode(
				X500DistinguishedNameFlags.UseNewLines
				| X500DistinguishedNameFlags.DoNotUsePlusSign
				| X500DistinguishedNameFlags.DoNotUseQuotes);
			if (!IsMicrosoftPublisherSubject(decodedSubject, simpleName))
				throw new SecurityException("The WebView2 installer is not digitally signed by Microsoft Corporation.");
		}
		catch (SecurityException)
		{
			throw;
		}
		catch (Exception ex)
		{
			throw new SecurityException("The WebView2 installer's Microsoft publisher could not be verified.", ex);
		}
	}

	internal static bool IsMicrosoftPublisherSubject(string decodedSubject, string simpleName)
	{
		if (string.Equals(simpleName?.Trim(), "Microsoft Corporation", StringComparison.OrdinalIgnoreCase))
			return true;

		string[] subjectParts = (decodedSubject ?? string.Empty).Split(
			new[] { '\r', '\n', ',' },
			StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
		return subjectParts.Any(part =>
			string.Equals(part, "O=Microsoft Corporation", StringComparison.OrdinalIgnoreCase)
			|| string.Equals(part, "CN=Microsoft Corporation", StringComparison.OrdinalIgnoreCase));
	}

	private static uint VerifyAuthenticodeSignature(string path)
	{
		WinTrustFileInfo fileInfo = new WinTrustFileInfo
		{
			StructureSize = (uint)Marshal.SizeOf<WinTrustFileInfo>(),
			FilePath = path,
			FileHandle = IntPtr.Zero,
			KnownSubject = IntPtr.Zero
		};
		IntPtr fileInfoPointer = Marshal.AllocHGlobal(Marshal.SizeOf<WinTrustFileInfo>());
		try
		{
			Marshal.StructureToPtr(fileInfo, fileInfoPointer, fDeleteOld: false);
			WinTrustData trustData = new WinTrustData
			{
				StructureSize = (uint)Marshal.SizeOf<WinTrustData>(),
				PolicyCallbackData = IntPtr.Zero,
				SipClientData = IntPtr.Zero,
				UiChoice = 2,
				RevocationChecks = 1,
				UnionChoice = 1,
				FileInfoPointer = fileInfoPointer,
				StateAction = 0,
				StateData = IntPtr.Zero,
				UrlReference = IntPtr.Zero,
				ProviderFlags = 0x00000080,
				UiContext = 0
			};
			return WinVerifyTrust(
				new IntPtr(-1),
				WinTrustActionGenericVerifyV2,
				ref trustData);
		}
		finally
		{
			Marshal.DestroyStructure<WinTrustFileInfo>(fileInfoPointer);
			Marshal.FreeHGlobal(fileInfoPointer);
		}
	}

	[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
	private struct WinTrustFileInfo
	{
		internal uint StructureSize;

		[MarshalAs(UnmanagedType.LPWStr)]
		internal string FilePath;

		internal IntPtr FileHandle;
		internal IntPtr KnownSubject;
	}

	[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
	private struct WinTrustData
	{
		internal uint StructureSize;
		internal IntPtr PolicyCallbackData;
		internal IntPtr SipClientData;
		internal uint UiChoice;
		internal uint RevocationChecks;
		internal uint UnionChoice;
		internal IntPtr FileInfoPointer;
		internal uint StateAction;
		internal IntPtr StateData;
		internal IntPtr UrlReference;
		internal uint ProviderFlags;
		internal uint UiContext;
	}

	[DllImport("wintrust.dll", ExactSpelling = true, CharSet = CharSet.Unicode)]
	private static extern uint WinVerifyTrust(
		IntPtr windowHandle,
		[MarshalAs(UnmanagedType.LPStruct)] Guid actionId,
		ref WinTrustData trustData);
}

internal static class InstallerSelfTest
{
	public static int Run()
	{
		string root = Path.Combine(Path.GetTempPath(), $"BlackSpiritHub-Installer-SelfTest-{Guid.NewGuid():N}");
		try
		{
			Directory.CreateDirectory(root);
			TestWebView2DownloadValidation();
			TestEmbeddedPayload(root);
			TestInheritedWorkingDirectory(root);
			TestRetryBehavior();
			TestInstallTargetMigration(root);
			TestLockedInstallReplacement(root);
			TestExistingInstallReplacement(root);
			TestRenamedInstallReplacement(root);
			TestRollback(root);
			TestFreshInstall(root);
			return 0;
		}
		catch
		{
			return 1;
		}
		finally
		{
			InstallerForm.TryDeleteDirectory(root);
		}
	}

	private static void TestEmbeddedPayload(string root)
	{
		string extracted = Path.Combine(root, "embedded-payload");
		Directory.CreateDirectory(extracted);
		using Stream payload = Assembly.GetExecutingAssembly().GetManifestResourceStream("Payload.zip")
			?? throw new InvalidOperationException("Embedded payload self-test could not find Payload.zip.");
		using ZipArchive archive = new ZipArchive(payload, ZipArchiveMode.Read);
		InstallerForm.ValidatePayloadArchive(archive);
		archive.ExtractToDirectory(extracted, overwriteFiles: true);
		InstallerForm.ValidateStagedPayload(extracted);

		string emptyDotnetRoot = Path.Combine(root, "empty-dotnet");
		Directory.CreateDirectory(emptyDotnetRoot);
		string appPath = Path.Combine(extracted, InstallerConfig.ExeName);
		ProcessStartInfo startInfo = new ProcessStartInfo(appPath, "--offline-smoke-test")
		{
			UseShellExecute = false,
			CreateNoWindow = true,
			WorkingDirectory = extracted
		};
		startInfo.Environment["DOTNET_ROOT"] = emptyDotnetRoot;
		startInfo.Environment["DOTNET_ROOT_X64"] = emptyDotnetRoot;
		startInfo.Environment["DOTNET_MULTILEVEL_LOOKUP"] = "0";
		startInfo.Environment["DOTNET_DISABLE_GUI_ERRORS"] = "1";
		using Process app = Process.Start(startInfo)
			?? throw new InvalidOperationException("Embedded application self-test could not start.");
		if (!app.WaitForExit(120_000))
		{
			try { app.Kill(entireProcessTree: true); } catch { }
			throw new TimeoutException("Embedded application self-test timed out.");
		}
		if (app.ExitCode != 0)
		{
			throw new InvalidOperationException(
				"Embedded application is not self-contained or failed its offline smoke test "
				+ "(exit " + app.ExitCode + ").");
		}
	}

	private static void TestWebView2DownloadValidation()
	{
		Uri officialLink = new Uri(WebView2RuntimePrerequisite.EvergreenBootstrapperUrl);
		Uri officialDelivery = new Uri(
			"https://msedge.sf.dl.delivery.mp.microsoft.com/filestreamingservice/files/runtime.exe");
		Uri insecureLink = new Uri("http://go.microsoft.com/runtime.exe");
		Uri deceptiveLink = new Uri("https://microsoft.com.attacker.example/runtime.exe");
		Uri credentialTrick = new Uri("https://microsoft.com@attacker.example/runtime.exe");
		if (!WebView2RuntimePrerequisite.IsApprovedMicrosoftDownloadUri(officialLink)
			|| !WebView2RuntimePrerequisite.IsApprovedMicrosoftDownloadUri(officialDelivery)
			|| WebView2RuntimePrerequisite.IsApprovedMicrosoftDownloadUri(insecureLink)
			|| WebView2RuntimePrerequisite.IsApprovedMicrosoftDownloadUri(deceptiveLink)
			|| WebView2RuntimePrerequisite.IsApprovedMicrosoftDownloadUri(credentialTrick))
		{
			throw new InvalidOperationException("WebView2 download-origin validation self-test failed.");
		}

		if (!WebView2RuntimePrerequisite.IsRedirectStatusCode(HttpStatusCode.MovedPermanently)
			|| !WebView2RuntimePrerequisite.IsRedirectStatusCode(HttpStatusCode.TemporaryRedirect)
			|| !WebView2RuntimePrerequisite.IsRedirectStatusCode((HttpStatusCode)308)
			|| WebView2RuntimePrerequisite.IsRedirectStatusCode(HttpStatusCode.OK))
		{
			throw new InvalidOperationException("WebView2 redirect validation self-test failed.");
		}

		if (!WebView2RuntimePrerequisite.IsMicrosoftPublisherSubject(
				"CN=Microsoft Corporation\r\nO=Microsoft Corporation\r\nC=US",
				"Microsoft Corporation")
			|| WebView2RuntimePrerequisite.IsMicrosoftPublisherSubject(
				"CN=Microsoft Corporation Support\r\nO=Contoso Ltd",
				"Microsoft Corporation Support"))
		{
			throw new InvalidOperationException("WebView2 publisher validation self-test failed.");
		}

		if (!WebView2RuntimePrerequisite.IsUsableRuntimeVersion("142.0.3595.0")
			|| WebView2RuntimePrerequisite.IsUsableRuntimeVersion("142.0.3595.0 dev")
			|| WebView2RuntimePrerequisite.IsUsableRuntimeVersion("0.0.0.0")
			|| WebView2RuntimePrerequisite.IsUsableRuntimeVersion("not-a-version"))
		{
			throw new InvalidOperationException("WebView2 runtime-version validation self-test failed.");
		}
	}

	private static void TestInheritedWorkingDirectory(string root)
	{
		string inheritedDirectory = Path.Combine(root, "inherited-working-directory");
		string movedDirectory = inheritedDirectory + "-moved";
		Directory.CreateDirectory(inheritedDirectory);
		Environment.CurrentDirectory = inheritedDirectory;
		Program.SetSafeWorkingDirectory();
		Directory.Move(inheritedDirectory, movedDirectory);
		if (!Directory.Exists(movedDirectory))
			throw new InvalidOperationException("Working-directory release self-test failed.");
	}

	private static void TestRetryBehavior()
	{
		int attempts = 0;
		InstallerForm.RetryFileSystemAction(() =>
		{
			attempts++;
			if (attempts < 3)
				throw new UnauthorizedAccessException("Simulated transient file lock.");
		}, "Retry self-test failed.");
		if (attempts != 3)
			throw new InvalidOperationException("The installer retry loop did not recover as expected.");
	}

	private static void TestInstallTargetMigration(string root)
	{
		string parent = Path.Combine(root, "target-resolution");
		string previousPath = Path.Combine(parent, InstallerConfig.PreviousInstallFolderName);
		Directory.CreateDirectory(previousPath);
		File.WriteAllText(Path.Combine(previousPath, InstallerConfig.PreviousExeName), "previous");
		InstallerForm.InstallTarget migrated = InstallerForm.ResolveInstallTarget(
			new[] { "--install-path", previousPath, "--source-pid", "42" });
		string expectedPath = Path.Combine(parent, InstallerConfig.InstallFolderName);
		if (!string.Equals(migrated.Path, expectedPath, StringComparison.OrdinalIgnoreCase)
			|| !string.Equals(migrated.PreviousPath, previousPath, StringComparison.OrdinalIgnoreCase)
			|| migrated.SourceProcessId != 42)
		{
			throw new InvalidOperationException("Install-target migration self-test failed.");
		}

		string customPath = Path.Combine(parent, "Custom App Files");
		Directory.CreateDirectory(customPath);
		File.WriteAllText(Path.Combine(customPath, InstallerConfig.PreviousExeName), "previous");
		InstallerForm.InstallTarget inPlace = InstallerForm.ResolveInstallTarget(
			new[] { "--install-path", customPath });
		if (!string.Equals(inPlace.Path, customPath, StringComparison.OrdinalIgnoreCase)
			|| !string.IsNullOrWhiteSpace(inPlace.PreviousPath))
		{
			throw new InvalidOperationException("Custom install-target preservation self-test failed.");
		}
	}

	private static void TestExistingInstallReplacement(string root)
	{
		string target = Path.Combine(root, "update-target");
		string staging = Path.Combine(root, "update-staging");
		Directory.CreateDirectory(target);
		Directory.CreateDirectory(staging);
		File.WriteAllText(Path.Combine(target, InstallerConfig.ExeName), "old");
		File.WriteAllText(Path.Combine(target, "old-only.txt"), "old");
		File.WriteAllText(Path.Combine(staging, InstallerConfig.ExeName), "new");
		File.WriteAllText(Path.Combine(staging, "new-only.txt"), "new");

		InstallerForm.ReplaceApplicationFiles(staging, target, updating: true);
		if (File.ReadAllText(Path.Combine(target, InstallerConfig.ExeName)) != "new"
			|| File.Exists(Path.Combine(target, "old-only.txt"))
			|| !File.Exists(Path.Combine(target, "new-only.txt")))
		{
			throw new InvalidOperationException("Existing-install replacement self-test failed.");
		}
	}

	private static void TestLockedInstallReplacement(string root)
	{
		string target = Path.Combine(root, "locked-target");
		string staging = Path.Combine(root, "locked-staging");
		Directory.CreateDirectory(target);
		Directory.CreateDirectory(staging);
		string lockedExe = Path.Combine(target, InstallerConfig.ExeName);
		File.WriteAllText(lockedExe, "locked-old-version");
		File.WriteAllText(Path.Combine(staging, InstallerConfig.ExeName), "replacement");

		FileStream lockStream = new FileStream(lockedExe, FileMode.Open, FileAccess.Read, FileShare.Read);
		Thread releaseLock = new Thread(() =>
		{
			Thread.Sleep(1200);
			lockStream.Dispose();
		})
		{
			IsBackground = true
		};
		releaseLock.Start();
		try
		{
			InstallerForm.ReplaceApplicationFiles(staging, target, updating: true);
		}
		finally
		{
			lockStream.Dispose();
			releaseLock.Join(5000);
		}

		if (File.ReadAllText(Path.Combine(target, InstallerConfig.ExeName)) != "replacement")
			throw new InvalidOperationException("Locked-file replacement self-test failed.");
	}

	private static void TestRenamedInstallReplacement(string root)
	{
		string previous = Path.Combine(root, "previous-install");
		string target = Path.Combine(root, "renamed-install");
		string staging = Path.Combine(root, "renamed-staging");
		Directory.CreateDirectory(previous);
		Directory.CreateDirectory(staging);
		File.WriteAllText(Path.Combine(previous, InstallerConfig.PreviousExeName), "previous");
		File.WriteAllText(Path.Combine(staging, InstallerConfig.ExeName), "renamed");

		InstallerForm.ReplaceApplicationFiles(staging, target, previous);
		if (Directory.Exists(previous)
			|| !File.Exists(Path.Combine(target, InstallerConfig.ExeName))
			|| File.ReadAllText(Path.Combine(target, InstallerConfig.ExeName)) != "renamed")
		{
			throw new InvalidOperationException("Renamed-install replacement self-test failed.");
		}
	}

	private static void TestRollback(string root)
	{
		string target = Path.Combine(root, "rollback-target");
		string staging = Path.Combine(root, "rollback-staging");
		Directory.CreateDirectory(target);
		Directory.CreateDirectory(staging);
		File.WriteAllText(Path.Combine(target, InstallerConfig.ExeName), "working-old-version");
		File.WriteAllText(Path.Combine(staging, "incomplete.txt"), "missing executable");

		try
		{
			InstallerForm.ReplaceApplicationFiles(staging, target, updating: true);
			throw new InvalidOperationException("Rollback self-test did not reject an incomplete payload.");
		}
		catch (InvalidDataException)
		{
		}

		if (!File.Exists(Path.Combine(target, InstallerConfig.ExeName))
			|| File.ReadAllText(Path.Combine(target, InstallerConfig.ExeName)) != "working-old-version")
		{
			throw new InvalidOperationException("Rollback self-test did not restore the working installation.");
		}
	}

	private static void TestFreshInstall(string root)
	{
		string target = Path.Combine(root, "fresh-target");
		string staging = Path.Combine(root, "fresh-staging");
		Directory.CreateDirectory(staging);
		File.WriteAllText(Path.Combine(staging, InstallerConfig.ExeName), "fresh");

		InstallerForm.ReplaceApplicationFiles(staging, target, updating: false);
		if (!File.Exists(Path.Combine(target, InstallerConfig.ExeName)))
			throw new InvalidOperationException("Fresh-install self-test failed.");
	}
}
