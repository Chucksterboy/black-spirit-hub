using System;
using System.Diagnostics;
using System.IO;
using System.Linq;

namespace BlackSpiritHub;

internal static class MarketCollectorTaskManager
{
	internal const string TaskName = "Black Spirit Hub Market Collector";

	private static readonly string PreviousTaskName = string.Concat(
		"BDO ",
		"Multi",
		"-Tool Market Collector");

	internal static bool Install(string executablePath, out string details)
	{
		if (string.IsNullOrWhiteSpace(executablePath) || !File.Exists(executablePath))
		{
			details = "The installed application executable could not be found.";
			return false;
		}

		RemoveKnownTasks();
		if (TryCreateTask(TaskName, executablePath, out details))
		{
			return true;
		}

		string userTaskName = GetUserTaskName(TaskName);
		return !string.Equals(userTaskName, TaskName, StringComparison.OrdinalIgnoreCase)
			&& TryCreateTask(userTaskName, executablePath, out details);
	}

	internal static void RemoveKnownTasks()
	{
		foreach (string taskName in new[]
		{
			TaskName,
			GetUserTaskName(TaskName),
			PreviousTaskName,
			GetUserTaskName(PreviousTaskName)
		}.Distinct(StringComparer.OrdinalIgnoreCase))
		{
			RunSchtasks("/Delete /TN \"" + taskName + "\" /F", 5000, out _);
		}
	}

	private static bool TryCreateTask(string taskName, string executablePath, out string details)
	{
		// Importing a custom XML task can require elevated Task Scheduler rights
		// even when the XML requests LeastPrivilege. Standard schtasks switches
		// create the same hourly interactive-user check without an admin prompt.
		// The collector's database freshness guard keeps successful bulk samples
		// on the three-hour cadence while inexpensive due checks run hourly.
		string taskCommand =
			"\\\"" + executablePath.Replace("\"", "\\\"", StringComparison.Ordinal) +
			"\\\" --market-scheduled-update";
		string arguments =
			"/Create /TN \"" + taskName +
			"\" /TR \"" + taskCommand +
			"\" /SC HOURLY /MO 1 /RL LIMITED /F";
		int exitCode = RunSchtasks(arguments, 15000, out details);
		return exitCode == 0;
	}

	private static int RunSchtasks(string arguments, int timeoutMilliseconds, out string output)
	{
		try
		{
			ProcessStartInfo startInfo = new("schtasks.exe", arguments)
			{
				CreateNoWindow = true,
				UseShellExecute = false,
				RedirectStandardError = true,
				RedirectStandardOutput = true
			};
			using Process process = Process.Start(startInfo)
				?? throw new InvalidOperationException("Could not start Windows Task Scheduler.");
			if (!process.WaitForExit(timeoutMilliseconds))
			{
				try
				{
					process.Kill(entireProcessTree: true);
				}
				catch
				{
				}

				output = "Windows Task Scheduler timed out.";
				return -1;
			}

			string error = process.StandardError.ReadToEnd();
			string standardOutput = process.StandardOutput.ReadToEnd();
			output = string.IsNullOrWhiteSpace(error) ? standardOutput.Trim() : error.Trim();
			return process.ExitCode;
		}
		catch (Exception exception)
		{
			output = exception.Message;
			return -1;
		}
	}

	private static string GetUserTaskName(string taskName)
	{
		char[] safeChars = Environment.UserName
			.Select(character => char.IsLetterOrDigit(character)
				|| character is '-' or '_' or '.'
					? character
					: '_')
			.ToArray();
		string safeUserName = new string(safeChars).Trim('_');
		return string.IsNullOrWhiteSpace(safeUserName)
			? taskName
			: taskName + " - " + safeUserName;
	}
}
