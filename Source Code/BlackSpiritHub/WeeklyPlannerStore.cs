using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace BlackSpiritHub;

internal sealed class WeeklyPlannerStore : IDisposable
{
	internal const string StateFileName = "weekly-planner-state.json";

	private const int MaxSelectedIds = 256;
	private const int MaxDoneEntries = 512;
	private const int MaxNotifiedEntries = 1024;
	private const int MaxIdLength = 80;
	private const int MaxCycleKeyLength = 128;
	private const int MaxNotificationKeyLength = 256;

	private static readonly JsonSerializerOptions JsonOptions = new()
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
		PropertyNameCaseInsensitive = true,
		WriteIndented = true
	};

	private readonly string statePath;
	private readonly SemaphoreSlim operationGate = new(1, 1);
	private int disposed;

	public WeeklyPlannerStore(AppPaths paths)
	{
		ArgumentNullException.ThrowIfNull(paths);
		statePath = Path.Combine(paths.Root, StateFileName);
	}

	public async Task<WeeklyPlannerInitialization> InitializeAsync(CancellationToken cancellationToken)
	{
		ThrowIfDisposed();
		await operationGate.WaitAsync(cancellationToken);
		try
		{
			ThrowIfDisposed();
			PersistedWeeklyPlannerState? loaded = await AtomicFile.ReadJsonAsync<PersistedWeeklyPlannerState>(
				statePath,
				JsonOptions,
				cancellationToken);
			WeeklyPlannerState normalized = Normalize(loaded);
			await WriteAsync(normalized, cancellationToken);
			return new WeeklyPlannerInitialization(normalized, loaded is not null);
		}
		finally
		{
			operationGate.Release();
		}
	}

	public async Task<WeeklyPlannerState> SaveAsync(
		WeeklyPlannerState state,
		CancellationToken cancellationToken)
	{
		ArgumentNullException.ThrowIfNull(state);
		ThrowIfDisposed();
		await operationGate.WaitAsync(cancellationToken);
		try
		{
			ThrowIfDisposed();
			WeeklyPlannerState normalized = Normalize(state);
			await WriteAsync(normalized, cancellationToken);
			return normalized;
		}
		finally
		{
			operationGate.Release();
		}
	}

	private async Task WriteAsync(WeeklyPlannerState state, CancellationToken cancellationToken)
	{
		string json = JsonSerializer.Serialize(state, JsonOptions);
		await AtomicFile.WriteAllTextAsync(statePath, json, cancellationToken);
	}

	private static WeeklyPlannerState Normalize(PersistedWeeklyPlannerState? state)
	{
		return Normalize(
			state?.Revision ?? 0,
			state?.OnboardingComplete ?? false,
			state?.SelectedIds,
			state?.ReminderDays ?? WeeklyPlannerState.DefaultReminderDays,
			state?.NotificationsEnabled ?? false,
			state?.DoneById,
			state?.Notified);
	}

	private static WeeklyPlannerState Normalize(WeeklyPlannerState state)
	{
		return Normalize(
			state.Revision,
			state.OnboardingComplete,
			state.SelectedIds,
			state.ReminderDays,
			state.NotificationsEnabled,
			state.DoneById,
			state.Notified);
	}

	private static WeeklyPlannerState Normalize(
		long revision,
		bool onboardingComplete,
		IEnumerable<string?>? selectedIds,
		int reminderDays,
		bool notificationsEnabled,
		IEnumerable<KeyValuePair<string, string?>>? doneById,
		IEnumerable<KeyValuePair<string, bool>>? notified)
	{
		List<string> normalizedIds = NormalizeIds(selectedIds);
		Dictionary<string, string> normalizedDone = NormalizeDoneEntries(doneById);
		Dictionary<string, bool> normalizedNotified = NormalizeNotifiedEntries(notified);

		return new WeeklyPlannerState(
			SchemaVersion: WeeklyPlannerState.CurrentSchemaVersion,
			Revision: Math.Max(0, revision),
			OnboardingComplete: onboardingComplete,
			SelectedIds: Array.AsReadOnly(normalizedIds.ToArray()),
			ReminderDays: Math.Clamp(reminderDays, 0, 3),
			NotificationsEnabled: notificationsEnabled,
			DoneById: new ReadOnlyDictionary<string, string>(normalizedDone),
			Notified: new ReadOnlyDictionary<string, bool>(normalizedNotified));
	}

	private static List<string> NormalizeIds(IEnumerable<string?>? values)
	{
		List<string> normalized = [];
		HashSet<string> seen = new(StringComparer.Ordinal);
		if (values is null)
		{
			return normalized;
		}

		foreach (string? value in values)
		{
			string? id = NormalizeId(value);
			if (id is null || !seen.Add(id))
			{
				continue;
			}

			normalized.Add(id);
			if (normalized.Count >= MaxSelectedIds)
			{
				break;
			}
		}

		return normalized;
	}

	private static Dictionary<string, string> NormalizeDoneEntries(
		IEnumerable<KeyValuePair<string, string?>>? entries)
	{
		Dictionary<string, string> normalized = new(StringComparer.Ordinal);
		if (entries is null)
		{
			return normalized;
		}

		foreach ((string rawId, string? rawCycleKey) in entries)
		{
			string? id = NormalizeId(rawId);
			string? cycleKey = NormalizeStorageKey(rawCycleKey, MaxCycleKeyLength);
			if (id is null || cycleKey is null)
			{
				continue;
			}

			if (normalized.Count >= MaxDoneEntries && !normalized.ContainsKey(id))
			{
				continue;
			}

			normalized[id] = cycleKey;
		}

		return normalized;
	}

	private static Dictionary<string, bool> NormalizeNotifiedEntries(
		IEnumerable<KeyValuePair<string, bool>>? entries)
	{
		Dictionary<string, bool> normalized = new(StringComparer.Ordinal);
		if (entries is null)
		{
			return normalized;
		}

		foreach ((string rawKey, bool delivered) in entries)
		{
			string? key = NormalizeStorageKey(rawKey, MaxNotificationKeyLength);
			if (key is null)
			{
				continue;
			}

			if (normalized.Count >= MaxNotifiedEntries && !normalized.ContainsKey(key))
			{
				continue;
			}

			normalized[key] = delivered;
		}

		return normalized;
	}

	private static string? NormalizeId(string? value)
	{
		if (string.IsNullOrWhiteSpace(value))
		{
			return null;
		}

		string normalized = value.Trim().ToLowerInvariant();
		if (normalized.Length > MaxIdLength
			|| !IsAsciiLetterOrDigit(normalized[0])
			|| !IsAsciiLetterOrDigit(normalized[^1])
			|| IsReservedObjectKey(normalized))
		{
			return null;
		}

		foreach (char character in normalized)
		{
			if (!IsAsciiLetterOrDigit(character) && character is not '-' and not '_' and not '.')
			{
				return null;
			}
		}

		return normalized;
	}

	private static string? NormalizeStorageKey(string? value, int maxLength)
	{
		if (string.IsNullOrWhiteSpace(value))
		{
			return null;
		}

		string normalized = value.Trim();
		if (normalized.Length > maxLength || IsReservedObjectKey(normalized))
		{
			return null;
		}

		foreach (char character in normalized)
		{
			if (!IsAsciiLetterOrDigit(character)
				&& character is not '-' and not '_' and not '.' and not ':' and not '+' and not '|' and not '@')
			{
				return null;
			}
		}

		return normalized;
	}

	private static bool IsAsciiLetterOrDigit(char value)
	{
		return value is >= 'a' and <= 'z'
			or >= 'A' and <= 'Z'
			or >= '0' and <= '9';
	}

	private static bool IsReservedObjectKey(string value)
	{
		return value.Equals("__proto__", StringComparison.OrdinalIgnoreCase)
			|| value.Equals("constructor", StringComparison.OrdinalIgnoreCase)
			|| value.Equals("prototype", StringComparison.OrdinalIgnoreCase);
	}

	private void ThrowIfDisposed()
	{
		if (Volatile.Read(ref disposed) != 0)
		{
			throw new ObjectDisposedException(nameof(WeeklyPlannerStore));
		}
	}

	public void Dispose()
	{
		// Do not dispose the semaphore while an asynchronous write may still be
		// unwinding after shutdown cancellation. It owns no resources unless its
		// wait handle is requested (which this store never does), and allowing an
		// in-flight operation to release it avoids a shutdown race.
		Interlocked.Exchange(ref disposed, 1);
	}

	private sealed class PersistedWeeklyPlannerState
	{
		public int? SchemaVersion { get; init; }
		public long? Revision { get; init; }
		public bool? OnboardingComplete { get; init; }
		public List<string?>? SelectedIds { get; init; }
		public int? ReminderDays { get; init; }
		public bool? NotificationsEnabled { get; init; }
		public Dictionary<string, string?>? DoneById { get; init; }
		public Dictionary<string, bool>? Notified { get; init; }
	}
}

internal sealed record WeeklyPlannerState(
	int SchemaVersion,
	long Revision,
	bool OnboardingComplete,
	IReadOnlyList<string> SelectedIds,
	int ReminderDays,
	bool NotificationsEnabled,
	IReadOnlyDictionary<string, string> DoneById,
	IReadOnlyDictionary<string, bool> Notified)
{
	public const int CurrentSchemaVersion = 1;
	public const int DefaultReminderDays = 1;

	public static WeeklyPlannerState Default => new(
		SchemaVersion: CurrentSchemaVersion,
		Revision: 0,
		OnboardingComplete: false,
		SelectedIds: Array.Empty<string>(),
		ReminderDays: DefaultReminderDays,
		NotificationsEnabled: false,
		DoneById: new ReadOnlyDictionary<string, string>(new Dictionary<string, string>(StringComparer.Ordinal)),
		Notified: new ReadOnlyDictionary<string, bool>(new Dictionary<string, bool>(StringComparer.Ordinal)));
}

internal sealed record WeeklyPlannerInitialization(
	WeeklyPlannerState State,
	bool LoadedPersistedState);
