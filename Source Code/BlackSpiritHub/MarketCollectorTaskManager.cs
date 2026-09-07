using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal static class MarketCollectorTaskManager
{
	internal const string TaskName = "Black Spirit Hub Market Collector";
	private static readonly string PreviousTaskName = string.Concat("BDO ", "Multi", "-Tool Market Collector");

	internal delegate Task<MarketTaskCommandResult> CommandRunner(
		IReadOnlyList<string> arguments, TimeSpan timeout, CancellationToken cancellationToken);

	internal static bool Install(string executablePath, out string details)
	{
		MarketTaskOperationResult result = InstallAsync(executablePath, CancellationToken.None).GetAwaiter().GetResult();
		details = result.Details;
		return result.Success;
	}

	internal static void RemoveKnownTasks()
	{
		_ = RemoveKnownTasksAsync(CancellationToken.None).GetAwaiter().GetResult();
	}

	internal static async Task<MarketTaskOperationResult> InstallAsync(
		string executablePath, CancellationToken cancellationToken, CommandRunner? runner = null)
	{
		if (string.IsNullOrWhiteSpace(executablePath) || !File.Exists(executablePath))
		{
			return new(false, "The installed application executable could not be found.");
		}
		runner ??= RunSchtasksAsync;
		List<string> errors = new();
		// Create the replacement before retiring old registrations. A denied or failed
		// registration must never silently remove the user's currently working task.
		foreach (string name in new[] { TaskName, GetUserTaskName(TaskName) }.Distinct(StringComparer.OrdinalIgnoreCase))
		{
			string command = "\"" + Path.GetFullPath(executablePath) + "\" --market-scheduled-update";
			MarketTaskCommandResult created = await runner(
				new[] { "/Create", "/TN", name, "/TR", command, "/SC", "HOURLY", "/MO", "1", "/RL", "LIMITED", "/IT", "/F" },
				TimeSpan.FromSeconds(15), cancellationToken).ConfigureAwait(false);
			if (!created.Success)
			{
				errors.Add(created.Details);
				continue;
			}

			MarketTaskOperationResult cleanup = await RemoveKnownTasksAsync(cancellationToken, runner, name).ConfigureAwait(false);
			return new(true, cleanup.Success
				? "Background market checks are registered with Windows."
				: "Background market checks were registered, but an older registration could not be removed. " + cleanup.Details);
		}
		return new(false, "Windows could not register background market checks. " + JoinDetails(errors));
	}

	internal static async Task<MarketTaskOperationResult> RemoveKnownTasksAsync(
		CancellationToken cancellationToken, CommandRunner? runner = null, string? keepTaskName = null)
	{
		runner ??= RunSchtasksAsync;
		MarketTaskRegistrationStatus before = await QueryAsync(cancellationToken, runner).ConfigureAwait(false);
		if (!before.QuerySucceeded)
		{
			return new(false, before.Error ?? "Windows task registrations could not be checked.");
		}
		List<string> errors = new();
		foreach (MarketTaskRegistration task in before.Tasks.Where(task =>
			!string.Equals(task.Name, keepTaskName, StringComparison.OrdinalIgnoreCase)))
		{
			MarketTaskCommandResult removed = await runner(
				new[] { "/Delete", "/TN", task.Name, "/F" }, TimeSpan.FromSeconds(5), cancellationToken).ConfigureAwait(false);
			if (!removed.Success)
			{
				errors.Add(removed.Details);
			}
		}
		return errors.Count == 0
			? new(true, "Background market checks are disabled. Your market history has been kept.")
			: new(false, "Windows could not remove every background market registration. " + JoinDetails(errors));
	}

	internal static async Task<MarketTaskRegistrationStatus> QueryAsync(
		CancellationToken cancellationToken, CommandRunner? runner = null)
	{
		runner ??= RunSchtasksAsync;
		// Query once, rather than interpreting localized 'task not found' messages as
		// absence. Non-verbose CSV exposes only task name, next run and state, avoiding
		// unrelated tasks' command lines and their potentially non-CSV-safe quoting.
		MarketTaskCommandResult result = await runner(
			new[] { "/Query", "/FO", "CSV", "/NH" }, TimeSpan.FromSeconds(10), cancellationToken).ConfigureAwait(false);
		if (!result.Success)
		{
			return new(false, Array.Empty<MarketTaskRegistration>(), "Windows background task status is unavailable. " + result.Details);
		}
		try
		{
			HashSet<string> names = KnownTaskNames();
			List<MarketTaskRegistration> tasks = new();
			foreach (string[] row in ParseCsv(result.StandardOutput))
			{
				if (row.Length != 3)
				{
					throw new FormatException("Unexpected task CSV columns.");
				}
				string name = row[0].TrimStart('\\');
				if (names.Contains(name))
				{
					tasks.Add(new(name, ParseScheduledTime(row[1]), row[2]));
				}
			}
			return new(true, tasks, null);
		}
		catch (FormatException)
		{
			return new(false, Array.Empty<MarketTaskRegistration>(), "Windows returned unreadable background task information.");
		}
	}

	private static HashSet<string> KnownTaskNames() => new(new[]
	{
		TaskName, GetUserTaskName(TaskName), PreviousTaskName, GetUserTaskName(PreviousTaskName)
	}, StringComparer.OrdinalIgnoreCase);

	internal static DateTimeOffset? ParseScheduledTime(string value)
	{
		// Windows may return localized 'N/A' or disabled-task text. Never infer an
		// hourly next run from those strings: an unavailable time stays unavailable.
		return DateTimeOffset.TryParse(value, CultureInfo.CurrentCulture, DateTimeStyles.AllowWhiteSpaces, out DateTimeOffset parsed)
			&& parsed.Year >= 2000 ? parsed.ToUniversalTime() : null;
	}

	internal static IEnumerable<string[]> ParseCsv(string csv)
	{
		List<string> fields = new();
		StringBuilder field = new();
		bool quoted = false;
		for (int index = 0; index < csv.Length; index++)
		{
			char character = csv[index];
			if (character == '"')
			{
				if (quoted && index + 1 < csv.Length && csv[index + 1] == '"')
				{
					field.Append('"');
					index++;
				}
				else
				{
					quoted = !quoted;
				}
			}
			else if (!quoted && character == ',')
			{
				fields.Add(field.ToString());
				field.Clear();
			}
			else if (!quoted && character is '\r' or '\n')
			{
				if (fields.Count > 0 || field.Length > 0)
				{
					fields.Add(field.ToString());
					yield return fields.ToArray();
					fields.Clear();
					field.Clear();
				}
			}
			else
			{
				field.Append(character);
			}
		}
		if (quoted)
		{
			throw new FormatException("Unterminated task CSV field.");
		}
		if (fields.Count > 0 || field.Length > 0)
		{
			fields.Add(field.ToString());
			yield return fields.ToArray();
		}
	}

	private static async Task<MarketTaskCommandResult> RunSchtasksAsync(
		IReadOnlyList<string> arguments, TimeSpan timeout, CancellationToken cancellationToken)
	{
		cancellationToken.ThrowIfCancellationRequested();
		try
		{
			ProcessStartInfo startInfo = new(Path.Combine(Environment.SystemDirectory, "schtasks.exe"))
			{
				CreateNoWindow = true, UseShellExecute = false,
				RedirectStandardError = true, RedirectStandardOutput = true
			};
			foreach (string argument in arguments)
			{
				startInfo.ArgumentList.Add(argument);
			}
			using Process process = Process.Start(startInfo)
				?? throw new InvalidOperationException("Could not start Windows Task Scheduler.");
			using CancellationTokenSource deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
			deadline.CancelAfter(timeout);
			// Drain both pipes while waiting. Reading only after WaitForExit can block a
			// large task listing indefinitely once a redirected pipe fills up.
			Task<string> output = process.StandardOutput.ReadToEndAsync(deadline.Token);
			Task<string> error = process.StandardError.ReadToEndAsync(deadline.Token);
			try
			{
				await process.WaitForExitAsync(deadline.Token).ConfigureAwait(false);
				return new(process.ExitCode, await output.ConfigureAwait(false), await error.ConfigureAwait(false));
			}
			catch (OperationCanceledException)
			{
				try { process.Kill(entireProcessTree: true); }
				catch (InvalidOperationException) { }
				catch (System.ComponentModel.Win32Exception) { }
				try { await Task.WhenAll(output, error).ConfigureAwait(false); }
				catch (OperationCanceledException) { }
				catch (IOException) { }
				cancellationToken.ThrowIfCancellationRequested();
				return new(-1, string.Empty, "Windows Task Scheduler timed out. Please try again.");
			}
		}
		catch (Exception exception) when (exception is not OperationCanceledException)
		{
			return new(-1, string.Empty, exception.Message);
		}
	}

	private static string JoinDetails(IEnumerable<string> details) => string.Join(" ", details
		.Where(detail => !string.IsNullOrWhiteSpace(detail)).Distinct(StringComparer.Ordinal));

	private static string GetUserTaskName(string taskName)
	{
		string safeUserName = new string(Environment.UserName.Select(character =>
			char.IsLetterOrDigit(character) || character is '-' or '_' or '.' ? character : '_').ToArray()).Trim('_');
		return string.IsNullOrWhiteSpace(safeUserName) ? taskName : taskName + " - " + safeUserName;
	}
}

internal sealed record MarketTaskOperationResult(bool Success, string Details);
internal sealed record MarketTaskCommandResult(int ExitCode, string StandardOutput, string StandardError)
{
	internal bool Success => ExitCode == 0;
	internal string Details => (string.IsNullOrWhiteSpace(StandardError) ? StandardOutput : StandardError).Trim();
}
internal sealed record MarketTaskRegistration(string Name, DateTimeOffset? NextRunUtc, string WindowsStatus);
internal sealed record MarketTaskRegistrationStatus(bool QuerySucceeded, IReadOnlyList<MarketTaskRegistration> Tasks, string? Error);
