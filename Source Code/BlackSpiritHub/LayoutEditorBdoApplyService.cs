using System;
using System.Buffers;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Win32.SafeHandles;

namespace BlackSpiritHub;

/// <summary>Exception returned by the native BDO transaction with a renderer-safe error code.</summary>
internal sealed class LayoutEditorApplyException : InvalidOperationException
{
	public string Code { get; }

	public LayoutEditorApplyException(string code, string message, Exception? innerException = null)
		: base(message, innerException)
	{
		Code = code;
	}
}

internal enum LayoutEditorApplyMode
{
	ClosedGame,
	CharacterSelection,
	GameOpen
}

/// <summary>Source metadata returned after a successful, registered BDO read.</summary>
internal sealed record BdoTrackedSource(
	[property: JsonPropertyName("id")] string Id,
	[property: JsonPropertyName("label")] string Label,
	[property: JsonPropertyName("path")] string Path,
	[property: JsonPropertyName("modifiedAt")] string ModifiedAt,
	[property: JsonPropertyName("hash")] string Hash,
	[property: JsonPropertyName("documentsPath")] string DocumentsPath);

/// <summary>Raw BDO read plus the immutable source token required by Save &amp; apply.</summary>
internal sealed record BdoTrackedReadResult(
	[property: JsonPropertyName("xml")] string Xml,
	[property: JsonPropertyName("gameOptionsText")] string GameOptionsText,
	[property: JsonPropertyName("source")] BdoTrackedSource Source);

internal sealed record BdoApplyRequest(
	JsonElement State,
	string? AccountId,
	string? ExpectedHash,
	LayoutEditorApplyMode ApplyMode = LayoutEditorApplyMode.ClosedGame);

internal sealed record BdoApplyProgress(
	[property: JsonPropertyName("phase")] string Phase,
	[property: JsonPropertyName("message")] string Message);

internal sealed record BdoApplyFailure(
	[property: JsonPropertyName("code")] string Code,
	[property: JsonPropertyName("error")] string Error,
	[property: JsonPropertyName("failedAt")] string FailedAt);

internal sealed record BdoDisplay(
	[property: JsonPropertyName("width")] int Width,
	[property: JsonPropertyName("height")] int Height,
	[property: JsonPropertyName("uiScale")] double UiScale,
	[property: JsonPropertyName("resolutionSource")] string ResolutionSource,
	[property: JsonPropertyName("uiScaleSource")] string UiScaleSource);

internal sealed class BdoRelativeCalibrationReport
{
	[JsonPropertyName("denominator")]
	public int Denominator { get; init; }

	[JsonPropertyName("offsets")]
	public required Dictionary<string, double> Offsets { get; init; }
}

internal sealed class BdoWritePresetReport
{
	[JsonPropertyName("number")]
	public int Number { get; init; }

	[JsonPropertyName("profileId")]
	public required string ProfileId { get; init; }

	[JsonPropertyName("name")]
	public required string Name { get; init; }

	[JsonPropertyName("changedSlots")]
	public int ChangedSlots { get; set; }

	[JsonPropertyName("changedAttributes")]
	public int ChangedAttributes { get; set; }

	[JsonPropertyName("calibration")]
	public Dictionary<string, BdoRelativeCalibrationReport> Calibration { get; } = new(StringComparer.Ordinal);
}

internal sealed class BdoWriteReport
{
	[JsonPropertyName("changed")]
	public bool Changed { get; set; }

	[JsonPropertyName("changedSlots")]
	public int ChangedSlots { get; set; }

	[JsonPropertyName("changedAttributes")]
	public int ChangedAttributes { get; set; }

	[JsonPropertyName("roundedSlots")]
	public int RoundedSlots { get; set; }

	[JsonPropertyName("scope")]
	public string Scope { get; init; } = "cooldown-and-quickslot-positions";

	[JsonPropertyName("presets")]
	public List<BdoWritePresetReport> Presets { get; } = new();

	[JsonPropertyName("warnings")]
	public List<string> Warnings { get; } = new();
}

internal sealed class BdoApplyStatus
{
	[JsonPropertyName("pending")]
	public bool Pending { get; init; }

	[JsonPropertyName("accountId")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? AccountId { get; init; }

	[JsonPropertyName("stateHash")]
	public required string StateHash { get; init; }

	[JsonPropertyName("applyMode")]
	public required string ApplyMode { get; init; }

	[JsonPropertyName("failure")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public BdoApplyFailure? Failure { get; init; }
}

internal sealed record class BdoApplyResult
{
	[JsonPropertyName("applyMode")]
	public required string ApplyMode { get; init; }

	[JsonPropertyName("requiresInGameCheck")]
	public bool RequiresInGameCheck { get; init; }

	[JsonPropertyName("sourceRefreshed")]
	public bool SourceRefreshed { get; init; }

	[JsonPropertyName("localSaved")]
	public bool LocalSaved { get; init; }

	[JsonPropertyName("applied")]
	public bool Applied { get; init; }

	[JsonPropertyName("unchanged")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public bool? Unchanged { get; init; }

	[JsonPropertyName("savedState")]
	public JsonElement SavedState { get; init; }

	[JsonPropertyName("code")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? Code { get; init; }

	[JsonPropertyName("error")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? Error { get; init; }

	[JsonPropertyName("backupPath")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? BackupPath { get; init; }

	[JsonPropertyName("source")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public BdoTrackedSource? Source { get; init; }

	[JsonPropertyName("report")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public BdoWriteReport? Report { get; init; }

	[JsonPropertyName("warning")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? Warning { get; init; }
}

internal sealed record class BdoApplyCheckResult
{
	[JsonPropertyName("status")]
	public required string Status { get; init; }

	[JsonPropertyName("accountId")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? AccountId { get; init; }

	[JsonPropertyName("applyMode")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? ApplyMode { get; init; }

	[JsonPropertyName("requiresInGameCheck")]
	public bool RequiresInGameCheck { get; init; }

	[JsonPropertyName("checkedAt")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? CheckedAt { get; init; }

	[JsonPropertyName("pendingTargetSaved")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public bool? PendingTargetSaved { get; init; }

	[JsonPropertyName("code")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? Code { get; init; }

	[JsonPropertyName("error")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? Error { get; init; }

	[JsonPropertyName("warning")]
	[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
	public string? Warning { get; init; }
}

/// <summary>
/// Owns the native half of the Layout Editor's Save &amp; apply transaction.
/// It accepts only an inventoried account id and a registered source hash; no renderer-supplied
/// path, XML or process command is ever used for a BDO file mutation.
/// </summary>
internal sealed class LayoutEditorBdoApplyService : IDisposable
{
	private const int MaximumXmlBytes = 20 * 1024 * 1024;
	private const int MaximumStatusBytes = 4096;
	private const int MaximumQueuedOperations = 8;
	private const int StabilityMilliseconds = 500;
	private const int ProcessExitGraceMilliseconds = 15_000;
	private const int ProcessPollMilliseconds = 500;
	private static readonly Regex AccountIdPattern = new("^[0-9]{1,30}$", RegexOptions.CultureInvariant | RegexOptions.Compiled);
	private static readonly Regex HashPattern = new("^[a-f0-9]{64}$", RegexOptions.CultureInvariant | RegexOptions.Compiled);
	private static readonly Regex BdoProcessPattern = new("^BlackDesert(?:32|64)?(?:_.*)?$", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase | RegexOptions.Compiled);
	private static readonly JsonSerializerOptions ReceiptJsonOptions = new()
	{
		PropertyNamingPolicy = null,
		WriteIndented = false,
		DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
	};

	private readonly AppPaths paths;
	private readonly LayoutEditorStore store;
	private readonly BdoDocumentsReader bdoDocuments;
	private readonly string documentsPath;
	private readonly string dataPath;
	private readonly SemaphoreSlim operationGate = new(1, 1);
	private readonly Func<bool> isGameRunning;
	private readonly Dictionary<string, SourceBaseline> baselines = new(StringComparer.Ordinal);
	private int pendingOperations;
	private int disposed;
	private LastApplyContext? lastApply;

	public event EventHandler<BdoApplyProgress>? ProgressChanged;

	internal static bool TryParseApplyMode(string? value, out LayoutEditorApplyMode mode)
	{
		switch (value)
		{
			case "closed-game": mode = LayoutEditorApplyMode.ClosedGame; return true;
			case "character-selection": mode = LayoutEditorApplyMode.CharacterSelection; return true;
			case "game-open": mode = LayoutEditorApplyMode.GameOpen; return true;
			default: mode = LayoutEditorApplyMode.ClosedGame; return false;
		}
	}

	internal static string ToApplyModeToken(LayoutEditorApplyMode mode) => ToWireMode(mode);

	public LayoutEditorBdoApplyService(AppPaths paths, LayoutEditorStore store, BdoDocumentsReader bdoDocuments)
		: this(paths, store, bdoDocuments,
			Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), IsBdoProcessRunning)
	{
	}

	// Kept internal for synthetic Documents fixtures. Production bridge code never exposes either override.
	internal LayoutEditorBdoApplyService(AppPaths paths, LayoutEditorStore store, BdoDocumentsReader bdoDocuments,
		string documentsPath, Func<bool> isGameRunning)
	{
		this.paths = paths ?? throw new ArgumentNullException(nameof(paths));
		this.store = store ?? throw new ArgumentNullException(nameof(store));
		this.bdoDocuments = bdoDocuments ?? throw new ArgumentNullException(nameof(bdoDocuments));
		ArgumentException.ThrowIfNullOrWhiteSpace(documentsPath);
		this.documentsPath = Path.GetFullPath(documentsPath);
		dataPath = Path.Combine(Path.GetFullPath(paths.Root), "LayoutEditor");
		this.isGameRunning = isGameRunning ?? throw new ArgumentNullException(nameof(isGameRunning));
	}

	public Task<BdoDiscovery> DiscoverAsync(CancellationToken cancellationToken = default)
	{
		ThrowIfDisposed();
		return bdoDocuments.DiscoverAsync(cancellationToken);
	}

	/// <summary>Reads the BDO source and records its exact-byte baseline for a later apply.</summary>
	public async Task<BdoTrackedReadResult> ReadAndRememberAsync(string accountId, CancellationToken cancellationToken = default)
	{
		ThrowIfDisposed();
		BdoReadResult result = await bdoDocuments.ReadAsync(accountId, cancellationToken);
		return await RememberReadAsync(result, cancellationToken);
	}

	/// <summary>
	/// Registers a source that was just read by the trusted native reader. This second validation closes
	/// the read-to-apply race and returns the source hash which the renderer must echo unchanged.
	/// </summary>
	public Task<BdoTrackedReadResult> RememberReadAsync(BdoReadResult bundle, CancellationToken cancellationToken = default)
	{
		ArgumentNullException.ThrowIfNull(bundle);
		return EnqueueAsync(async token =>
		{
			BdoTrackedSource source = await CandidateForAsync(bundle.source.id, token);
			if (!PathEquals(bundle.source.path, source.Path) || bundle.xml is null || !IsValidHash(bundle.source.hash))
			{
				throw Fail("INVALID_SOURCE", "The imported BDO settings source is invalid. Reload BDO Presets.");
			}

			BdoReadResult fresh = await bdoDocuments.ReadAsync(source.Id, token);
			RawBdoFile raw = await ReadRawAsync(source.Path, token);
			if (!string.Equals(raw.Text, bundle.xml, StringComparison.Ordinal)
				|| !string.Equals(fresh.xml, bundle.xml, StringComparison.Ordinal)
				|| !string.Equals(fresh.gameOptionsText, bundle.gameOptionsText, StringComparison.Ordinal)
				|| !string.Equals(bundle.source.hash, raw.Hash, StringComparison.Ordinal))
			{
				throw Fail("SOURCE_CHANGED", "BDO settings changed while loading. Reload BDO Presets before editing.");
			}

			BdoTrackedSource tracked = source with { ModifiedAt = raw.ModifiedAt, Hash = raw.Hash };
			baselines[source.Id] = new SourceBaseline(raw.Hash, SourceFingerprint(raw.Text, bundle.gameOptionsText),
				bundle.gameOptionsText, tracked);
			return new BdoTrackedReadResult(bundle.xml, bundle.gameOptionsText, tracked);
		}, cancellationToken);
	}

	/// <summary>Saves locally first, then performs the verified backup-and-replace transaction.</summary>
	public Task<BdoApplyResult> SaveAndApplyAsync(BdoApplyRequest request, CancellationToken cancellationToken = default)
	{
		ArgumentNullException.ThrowIfNull(request);
		if (!IsSupportedApplyMode(request.ApplyMode))
		{
			throw Fail("INVALID_APPLY_MODE", "Choose a supported BDO apply mode.");
		}

		JsonElement state = NormalizeState(request.State);
		string? accountId = request.AccountId;
		string? expectedHash = request.ExpectedHash;
		LayoutEditorApplyMode applyMode = request.ApplyMode;
		return EnqueueAsync(token => SaveAndApplyCoreAsync(state, accountId, expectedHash, applyMode, token), cancellationToken);
	}

	/// <summary>Returns only a receipt tied to the currently persisted layout library.</summary>
	public Task<BdoApplyStatus?> ReadStatusAsync(CancellationToken cancellationToken = default)
	{
		return EnqueueAsync(async token =>
		{
			try
			{
				string receiptPath = Path.Combine(dataPath, "bdo-apply-status.json");
				string text = await ReadBoundedTextAsync(receiptPath, MaximumStatusBytes, token);
				using JsonDocument document = JsonDocument.Parse(text, new JsonDocumentOptions { MaxDepth = 8 });
				if (!TryReadReceipt(document.RootElement, out BdoApplyStatus? status) || status is null)
				{
					return null;
				}

				JsonElement? current = await store.LoadAsync(token);
				if (current is null || !string.Equals(HashState(current.Value), status.StateHash, StringComparison.Ordinal))
				{
					return null;
				}
				return status;
			}
			catch (OperationCanceledException) when (token.IsCancellationRequested)
			{
				throw;
			}
			catch
			{
				return null;
			}
		}, cancellationToken);
	}

	/// <summary>Read-only comparison of the current file against this app instance's last successful apply.</summary>
	public Task<BdoApplyCheckResult> CheckLastApplyAsync(CancellationToken cancellationToken = default)
	{
		return EnqueueAsync(async token =>
		{
			if (lastApply is null)
			{
				return new BdoApplyCheckResult { Status = "no-apply", RequiresInGameCheck = false };
			}

			LastApplyContext context = lastApply;
			BdoApplyCheckResult detail = new()
			{
				Status = "unavailable",
				AccountId = context.AccountId,
				ApplyMode = ToWireMode(context.ApplyMode),
				RequiresInGameCheck = true,
				CheckedAt = UtcNowString()
			};

			try
			{
				BdoTrackedSource source = await CandidateForAsync(context.AccountId, token);
				BdoReadResult fresh = await bdoDocuments.ReadAsync(context.AccountId, token);
				RawBdoFile raw = await ReadRawAsync(source.Path, token);
				if (!string.Equals(raw.Text, fresh.xml, StringComparison.Ordinal))
				{
					throw Fail("SOURCE_CHANGED", "BDO settings changed during the check. Try checking again.");
				}

				ParsedGameFile parsed = ParseGameFile(raw.Text, fresh.gameOptionsText);
				string positions = SerializeActualPositions(parsed);
				await CheckCurrentSourceAsync(context.AccountId, source, raw, fresh.gameOptionsText,
					SourceFingerprint(raw.Text, fresh.gameOptionsText), token);
				if (string.Equals(positions, context.Positions, StringComparison.Ordinal))
				{
					return detail with { Status = "matches" };
				}

				bool pendingTargetSaved = false;
				string? warning = null;
				try
				{
					JsonElement? current = await store.LoadAsync(token);
					if (current is not null && string.Equals(HashState(current.Value), context.StateHash, StringComparison.Ordinal))
					{
						await WriteReceiptAsync(context.State, context.AccountId, pending: true, context.ApplyMode, null, token);
						pendingTargetSaved = true;
					}
				}
				catch (OperationCanceledException) when (token.IsCancellationRequested)
				{
					throw;
				}
				catch
				{
					warning = "BDO settings changed, but the pending apply status could not be stored. Keep the editor open and save your intended layouts again.";
				}

				return detail with
				{
					Status = "changed",
					PendingTargetSaved = pendingTargetSaved,
					Warning = warning
				};
			}
			catch (OperationCanceledException) when (token.IsCancellationRequested)
			{
				throw;
			}
			catch (Exception exception)
			{
				return detail with
				{
					Status = "unavailable",
					Code = ErrorCode(exception, "CHECK_FAILED"),
					Error = exception.Message
				};
			}
		}, cancellationToken);
	}

	private async Task<BdoApplyResult> SaveAndApplyCoreAsync(JsonElement state, string? accountId, string? expectedHash,
		LayoutEditorApplyMode applyMode, CancellationToken cancellationToken)
	{
		// A local persistence failure is deliberately not caught here. No BDO operation follows it.
		await store.SaveAsync(state, cancellationToken);
		string? backupPath = null;
		string? temporaryPath = null;
		bool sourceRefreshed = false;
		string applyModeWire = ToWireMode(applyMode);
		bool requiresInGameCheck = PermitsRunningGame(applyMode);

		try
		{
			try
			{
				await WriteReceiptAsync(state, accountId, pending: true, applyMode, null, cancellationToken);
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch
			{
				throw Fail("RECEIPT_FAILED", "Saved locally, but the pending apply status could not be stored. BDO was not changed. Try saving again.");
			}

			if (!IsValidAccountId(accountId) || !IsValidHash(expectedHash) || !baselines.TryGetValue(accountId!, out SourceBaseline? baseline)
				|| !string.Equals(expectedHash, baseline.Hash, StringComparison.Ordinal))
			{
				throw Fail("SOURCE_NOT_LOADED", "Saved locally. Reload BDO Presets before applying so its current settings can be checked.");
			}

			PreparedSource prepared = await PrepareSourceAsync(accountId!, expectedHash!, baseline, applyMode, cancellationToken);
			BdoTrackedSource source = prepared.Source;
			RawBdoFile raw = prepared.Raw;
			BdoReadResult fresh = prepared.Fresh;
			string? fingerprint = prepared.Fingerprint;
			sourceRefreshed = prepared.SourceRefreshed;

			if (PermitsRunningGame(applyMode))
			{
				await CheckGameAsync(applyMode, cancellationToken);
				await Task.Delay(StabilityMilliseconds, cancellationToken);
				await CheckCurrentSourceAsync(accountId!, source, raw, fresh.gameOptionsText, fingerprint, cancellationToken);
			}

			BdoWritePlan plan = BuildWritePlan(raw.Text, state, fresh.gameOptionsText);
			byte[] output = EncodeText(plan.Xml, raw.TextFormat);
			if (output.Length > MaximumXmlBytes)
			{
				throw Fail("SOURCE_TOO_LARGE", "The updated settings exceed the 20 MiB apply limit. Your layouts are saved locally.");
			}
			string outputHash = Digest(output);

			if (!string.Equals(outputHash, raw.Hash, StringComparison.Ordinal) && applyMode == LayoutEditorApplyMode.ClosedGame
				&& await WaitForGameExitAsync(cancellationToken))
			{
				// BDO can save during shutdown. Re-plan from the fresh bytes instead of committing an old plan.
				prepared = await PrepareSourceAsync(accountId!, expectedHash!, baseline, applyMode, cancellationToken);
				source = prepared.Source;
				raw = prepared.Raw;
				fresh = prepared.Fresh;
				fingerprint = prepared.Fingerprint;
				sourceRefreshed = prepared.SourceRefreshed;
				plan = BuildWritePlan(raw.Text, state, fresh.gameOptionsText);
				output = EncodeText(plan.Xml, raw.TextFormat);
				if (output.Length > MaximumXmlBytes)
				{
					throw Fail("SOURCE_TOO_LARGE", "The updated settings exceed the 20 MiB apply limit. Your layouts are saved locally.");
				}
				outputHash = Digest(output);
			}

			if (string.Equals(outputHash, raw.Hash, StringComparison.Ordinal))
			{
				await CheckCurrentSourceAsync(accountId!, source, raw, fresh.gameOptionsText, fingerprint, cancellationToken);
				BdoTrackedSource updatedSource = source with { ModifiedAt = raw.ModifiedAt, Hash = outputHash };
				baselines[accountId!] = new SourceBaseline(outputHash, fingerprint, fresh.gameOptionsText, updatedSource);
				RememberApply(state, accountId!, applyMode);
				return await AcknowledgeAsync(state, accountId!, new BdoApplyResult
				{
					ApplyMode = applyModeWire,
					RequiresInGameCheck = requiresInGameCheck,
					SourceRefreshed = sourceRefreshed,
					LocalSaved = true,
					Applied = true,
					Unchanged = true,
					SavedState = state.Clone(),
					Source = updatedSource,
					Report = plan.Report
				}, cancellationToken);
			}

			string backupDirectory = await CreateBackupDirectoryAsync(accountId!, cancellationToken);
			string timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH-mm-ss-fff'Z'", CultureInfo.InvariantCulture);
			backupPath = Path.Combine(backupDirectory, "gamevariable." + timestamp + "." + Guid.NewGuid().ToString("N") + ".xml.bak");
			await WriteExclusiveBytesAsync(backupPath, raw.Bytes, cancellationToken);
			if (!string.Equals(Digest(await File.ReadAllBytesAsync(backupPath, cancellationToken)), raw.Hash, StringComparison.Ordinal))
			{
				throw Fail("BACKUP_FAILED", "The BDO backup could not be verified. Your layouts are saved locally.");
			}

			temporaryPath = Path.Combine(Path.GetDirectoryName(source.Path)!, ".gamevariable." + Guid.NewGuid().ToString("N") + ".tmp");
			await WriteExclusiveBytesAsync(temporaryPath, output, cancellationToken);
			await CheckGameAsync(applyMode, cancellationToken);
			await CheckCurrentSourceAsync(accountId!, source, raw, fresh.gameOptionsText, fingerprint, cancellationToken);
			AtomicReplace(temporaryPath, source.Path);
			temporaryPath = null;

			BdoTrackedSource writtenSource = source with { ModifiedAt = UtcNowString(), Hash = outputHash };
			baselines[accountId!] = new SourceBaseline(outputHash, SourceFingerprint(plan.Xml, fresh.gameOptionsText), fresh.gameOptionsText, writtenSource);
			RememberApply(state, accountId!, applyMode);
			return await AcknowledgeAsync(state, accountId!, new BdoApplyResult
			{
				ApplyMode = applyModeWire,
				RequiresInGameCheck = requiresInGameCheck,
				SourceRefreshed = sourceRefreshed,
				LocalSaved = true,
				Applied = true,
				Unchanged = false,
				SavedState = state.Clone(),
				BackupPath = backupPath,
				Source = writtenSource,
				Report = plan.Report
			}, cancellationToken);
		}
		catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
		{
			throw;
		}
		catch (Exception exception)
		{
			string code = ErrorCode(exception, "APPLY_FAILED");
			string message = applyMode == LayoutEditorApplyMode.GameOpen && string.Equals(code, "SOURCE_CHANGED", StringComparison.Ordinal)
				? "BDO settings changed while saving. Let the current game load finish, then Retry apply. Your edited layouts are kept locally."
				: string.IsNullOrWhiteSpace(exception.Message) ? "BDO could not be updated." : exception.Message;
			BdoApplyFailure failure = new(code, Truncate(message, 768), UtcNowString());
			string? warning = null;
			try
			{
				await WriteReceiptAsync(state, accountId, pending: true, applyMode, failure, cancellationToken);
			}
			catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
			{
				throw;
			}
			catch
			{
				warning = "The apply failure details could not be stored for the next editor session.";
			}

			return new BdoApplyResult
			{
				ApplyMode = applyModeWire,
				RequiresInGameCheck = requiresInGameCheck,
				SourceRefreshed = sourceRefreshed,
				LocalSaved = true,
				Applied = false,
				SavedState = state.Clone(),
				Code = failure.Code,
				Error = failure.Error,
				BackupPath = backupPath,
				Warning = warning
			};
		}
		finally
		{
			if (!string.IsNullOrWhiteSpace(temporaryPath))
			{
				TryDeleteFile(temporaryPath);
			}
		}
	}

	private async Task<BdoApplyResult> AcknowledgeAsync(JsonElement state, string accountId, BdoApplyResult result, CancellationToken cancellationToken)
	{
		try
		{
			await WriteReceiptAsync(state, accountId, pending: false, ParseWireMode(result.ApplyMode), null, cancellationToken);
			return result;
		}
		catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
		{
			throw;
		}
		catch
		{
			return result with
			{
				Warning = "Saved and applied to BDO, but the completion status could not be stored. The editor may offer to apply again next time."
			};
		}
	}

	private async Task<PreparedSource> PrepareSourceAsync(string accountId, string expectedHash, SourceBaseline baseline,
		LayoutEditorApplyMode applyMode, CancellationToken cancellationToken)
	{
		BdoTrackedSource source = await CandidateForAsync(accountId, cancellationToken);
		RawBdoFile raw = await ReadRawAsync(source.Path, cancellationToken);
		BdoReadResult fresh = await bdoDocuments.ReadAsync(accountId, cancellationToken);
		if (!string.Equals(fresh.xml, raw.Text, StringComparison.Ordinal))
		{
			throw Fail("SOURCE_CHANGED", "Saved locally. BDO settings changed outside the editor. Reload BDO Presets before applying.");
		}

		string? fingerprint = SourceFingerprint(raw.Text, fresh.gameOptionsText);
		bool sourceRefreshed = !string.Equals(raw.Hash, expectedHash, StringComparison.Ordinal)
			|| !string.Equals(fresh.gameOptionsText, baseline.GameOptionsText, StringComparison.Ordinal);
		if (applyMode != LayoutEditorApplyMode.GameOpen && sourceRefreshed
			&& (baseline.Fingerprint is null || !string.Equals(fingerprint, baseline.Fingerprint, StringComparison.Ordinal)))
		{
			throw Fail("SOURCE_CHANGED", "Saved locally. BDO UI presets or display settings changed outside the editor. Reload BDO Presets before applying.");
		}

		return new PreparedSource(source, raw, fresh, fingerprint, sourceRefreshed);
	}

	private async Task CheckCurrentSourceAsync(string accountId, BdoTrackedSource source, RawBdoFile raw,
		string optionsText, string? fingerprint, CancellationToken cancellationToken)
	{
		await CandidateForAsync(accountId, cancellationToken);
		BdoReadResult latest = await bdoDocuments.ReadAsync(accountId, cancellationToken);
		if (!string.Equals(latest.xml, raw.Text, StringComparison.Ordinal)
			|| (!string.Equals(latest.gameOptionsText, optionsText, StringComparison.Ordinal)
				&& (fingerprint is null || !string.Equals(SourceFingerprint(latest.xml, latest.gameOptionsText), fingerprint, StringComparison.Ordinal))))
		{
			throw Fail("SOURCE_CHANGED", "Saved locally. BDO settings changed during saving. Reload BDO Presets before applying.");
		}

		RawBdoFile finalRead = await ReadRawAsync(source.Path, cancellationToken);
		if (!string.Equals(finalRead.Hash, raw.Hash, StringComparison.Ordinal))
		{
			throw Fail("SOURCE_CHANGED", "Saved locally. BDO settings changed during saving. Reload BDO Presets before applying.");
		}
	}

	private async Task<BdoTrackedSource> CandidateForAsync(string? accountId, CancellationToken cancellationToken)
	{
		if (!IsValidAccountId(accountId))
		{
			throw Fail("NO_SOURCE", "Load an account from Windows Documents before applying to BDO. Your layouts are saved locally.");
		}

		BdoDiscovery inventory = await bdoDocuments.DiscoverAsync(cancellationToken);
		BdoAccountCandidate? candidate = inventory.candidates.FirstOrDefault(item => string.Equals(item.id, accountId, StringComparison.Ordinal));
		if (candidate is null)
		{
			throw Fail("NO_SOURCE", "That BDO account is no longer available. Reload BDO Presets before applying.");
		}

		string expected = EnsureSafeDescendants(documentsPath,
			new[] { "Black Desert", "UserCache", accountId!, "gamevariable.xml" }, lastIsFile: true);
		if (!PathEquals(candidate.path, expected))
		{
			throw Fail("UNSAFE_SOURCE", "The selected account has an unexpected settings path.");
		}

		return new BdoTrackedSource(candidate.id, candidate.label, expected, candidate.modifiedAt, string.Empty, documentsPath);
	}

	private async Task CheckGameAsync(LayoutEditorApplyMode applyMode, CancellationToken cancellationToken)
	{
		bool running = await IsGameRunningAsync(cancellationToken);
		if (running && !PermitsRunningGame(applyMode))
		{
			throw Fail("GAME_RUNNING", "A Black Desert process is still detected. Let the game finish closing, then Retry apply. Your edits are saved locally.");
		}
	}

	private async Task<bool> WaitForGameExitAsync(CancellationToken cancellationToken)
	{
		Stopwatch stopwatch = Stopwatch.StartNew();
		if (!await IsGameRunningAsync(cancellationToken))
		{
			return false;
		}

		PublishProgress("waiting-for-game", "Waiting for BDO to finish closing…");
		while (stopwatch.ElapsedMilliseconds < ProcessExitGraceMilliseconds)
		{
			int remaining = ProcessExitGraceMilliseconds - (int)Math.Min(ProcessExitGraceMilliseconds, stopwatch.ElapsedMilliseconds);
			await Task.Delay(Math.Min(ProcessPollMilliseconds, remaining), cancellationToken);
			if (!await IsGameRunningAsync(cancellationToken))
			{
				return true;
			}
		}

		throw Fail("GAME_RUNNING", "A Black Desert process is still detected after 15 seconds. Let the game finish closing, then Retry apply. Your edits are saved locally.");
	}

	private Task<bool> IsGameRunningAsync(CancellationToken cancellationToken)
	{
		cancellationToken.ThrowIfCancellationRequested();
		try
		{
			return Task.FromResult(isGameRunning());
		}
		catch (Exception exception) when (exception is InvalidOperationException or System.ComponentModel.Win32Exception or UnauthorizedAccessException)
		{
			throw Fail("PROCESS_CHECK_FAILED", "Could not check whether BDO is running. Your layouts are saved locally; try applying again.");
		}
	}

	private Task<string> CreateBackupDirectoryAsync(string accountId, CancellationToken cancellationToken)
	{
		cancellationToken.ThrowIfCancellationRequested();
		Directory.CreateDirectory(dataPath);
		EnsureSafeDescendants(Path.GetFullPath(paths.Root), new[] { "LayoutEditor" }, lastIsFile: false);
		string backupRoot = Path.Combine(dataPath, "bdo-backups");
		Directory.CreateDirectory(backupRoot);
		EnsureSafeDescendants(dataPath, new[] { "bdo-backups" }, lastIsFile: false);
		string accountDirectory = Path.Combine(backupRoot, accountId);
		Directory.CreateDirectory(accountDirectory);
		EnsureSafeDescendants(dataPath, new[] { "bdo-backups", accountId }, lastIsFile: false);
		return Task.FromResult(accountDirectory);
	}

	private async Task WriteReceiptAsync(JsonElement state, string? accountId, bool pending, LayoutEditorApplyMode applyMode,
		BdoApplyFailure? failure, CancellationToken cancellationToken)
	{
		Directory.CreateDirectory(dataPath);
		EnsureSafeDescendants(Path.GetFullPath(paths.Root), new[] { "LayoutEditor" }, lastIsFile: false);
		BdoApplyStatus status = new()
		{
			Pending = pending,
			AccountId = IsValidAccountId(accountId) ? accountId : null,
			StateHash = HashState(state),
			ApplyMode = ToWireMode(applyMode),
			Failure = pending ? failure : null
		};
		string json = JsonSerializer.Serialize(status, ReceiptJsonOptions) + "\n";
		await WriteAtomicTextAsync(Path.Combine(dataPath, "bdo-apply-status.json"), json, cancellationToken);
	}

	private static async Task WriteAtomicTextAsync(string filename, string text, CancellationToken cancellationToken)
	{
		string temporary = Path.Combine(Path.GetDirectoryName(filename)!, ".bdo-apply-status." + Guid.NewGuid().ToString("N") + ".tmp");
		try
		{
			await WriteExclusiveBytesAsync(temporary, new UTF8Encoding(false).GetBytes(text), cancellationToken);
			AtomicReplace(temporary, filename);
		}
		finally
		{
			TryDeleteFile(temporary);
		}
	}

	private static async Task WriteExclusiveBytesAsync(string filename, byte[] bytes, CancellationToken cancellationToken)
	{
		await using FileStream stream = new(filename, FileMode.CreateNew, FileAccess.Write, FileShare.None, 8192,
			FileOptions.Asynchronous | FileOptions.WriteThrough | FileOptions.SequentialScan);
		await stream.WriteAsync(bytes.AsMemory(), cancellationToken);
		await stream.FlushAsync(cancellationToken);
		stream.Flush(flushToDisk: true);
	}

	private static void TryDeleteFile(string filename)
	{
		try
		{
			if (File.Exists(filename)) File.Delete(filename);
		}
		catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
		{
		}
	}

	private static void AtomicReplace(string temporary, string destination)
	{
		// Both files are in the same directory. File.Replace maps to the Windows replace primitive;
		// never delete the destination and retry as a non-atomic fallback. A receipt may be
		// created for the first time, in which case the same-directory move is atomic as well.
		if (File.Exists(destination))
		{
			File.Replace(temporary, destination, destinationBackupFileName: null, ignoreMetadataErrors: true);
		}
		else
		{
			File.Move(temporary, destination, overwrite: false);
		}
	}

	private async Task<T> EnqueueAsync<T>(Func<CancellationToken, Task<T>> operation, CancellationToken cancellationToken)
	{
		ThrowIfDisposed();
		if (Interlocked.Increment(ref pendingOperations) > MaximumQueuedOperations)
		{
			Interlocked.Decrement(ref pendingOperations);
			throw new InvalidOperationException("A save is already in progress. Try again when it finishes.");
		}

		try
		{
			await operationGate.WaitAsync(cancellationToken);
			try
			{
				return await operation(cancellationToken);
			}
			finally
			{
				operationGate.Release();
			}
		}
		finally
		{
			Interlocked.Decrement(ref pendingOperations);
		}
	}

	private void RememberApply(JsonElement state, string accountId, LayoutEditorApplyMode applyMode)
	{
		JsonElement snapshot = CloneJson(state);
		lastApply = new LastApplyContext(snapshot, accountId, applyMode, HashState(snapshot), SerializeIntendedPositions(snapshot));
	}

	private void PublishProgress(string phase, string message)
	{
		try
		{
			ProgressChanged?.Invoke(this, new BdoApplyProgress(phase, message));
		}
		catch
		{
			// A UI progress listener must never alter the durable transaction.
		}
	}

	private sealed record SourceBaseline(string Hash, string? Fingerprint, string GameOptionsText, BdoTrackedSource Source);
	private sealed record PreparedSource(BdoTrackedSource Source, RawBdoFile Raw, BdoReadResult Fresh, string? Fingerprint, bool SourceRefreshed);
	private sealed record LastApplyContext(JsonElement State, string AccountId, LayoutEditorApplyMode ApplyMode, string StateHash, string Positions);

	private void ThrowIfDisposed()
	{
		if (Volatile.Read(ref disposed) != 0)
		{
			throw new ObjectDisposedException(nameof(LayoutEditorBdoApplyService));
		}
	}

	/// <summary>
	/// Does not cancel an in-flight apply or dispose shared reader/store instances owned by the host.
	/// It only prevents new operations after the hosting tab has been torn down.
	/// </summary>
	public void Dispose()
	{
		Interlocked.Exchange(ref disposed, 1);
	}

	private static bool IsSupportedApplyMode(LayoutEditorApplyMode mode) => mode is LayoutEditorApplyMode.ClosedGame
		or LayoutEditorApplyMode.CharacterSelection or LayoutEditorApplyMode.GameOpen;

	private static bool PermitsRunningGame(LayoutEditorApplyMode mode) => mode is LayoutEditorApplyMode.CharacterSelection or LayoutEditorApplyMode.GameOpen;

	private static string ToWireMode(LayoutEditorApplyMode mode) => mode switch
	{
		LayoutEditorApplyMode.ClosedGame => "closed-game",
		LayoutEditorApplyMode.CharacterSelection => "character-selection",
		LayoutEditorApplyMode.GameOpen => "game-open",
		_ => throw Fail("INVALID_APPLY_MODE", "Choose a supported BDO apply mode.")
	};

	private static LayoutEditorApplyMode ParseWireMode(string? mode) => mode switch
	{
		"closed-game" => LayoutEditorApplyMode.ClosedGame,
		"character-selection" => LayoutEditorApplyMode.CharacterSelection,
		"game-open" => LayoutEditorApplyMode.GameOpen,
		_ => LayoutEditorApplyMode.ClosedGame
	};

	private static bool IsValidAccountId(string? value) => value is not null && AccountIdPattern.IsMatch(value);
	private static bool IsValidHash(string? value) => value is not null && HashPattern.IsMatch(value);

	private static LayoutEditorApplyException Fail(string code, string message) => new(code, message);

	private static string ErrorCode(Exception exception, string fallback) => exception is LayoutEditorApplyException apply
		&& Regex.IsMatch(apply.Code, "^[A-Z0-9_]{1,64}$", RegexOptions.CultureInvariant) ? apply.Code : fallback;

	private static string UtcNowString() => DateTime.UtcNow.ToString("O", CultureInfo.InvariantCulture);
	private static string Truncate(string value, int maximum) => value.Length <= maximum ? value : value[..maximum];

	private static bool PathEquals(string? left, string? right)
	{
		if (string.IsNullOrWhiteSpace(left) || string.IsNullOrWhiteSpace(right)) return false;
		try
		{
			return string.Equals(Path.GetFullPath(left), Path.GetFullPath(right), StringComparison.OrdinalIgnoreCase);
		}
		catch (Exception exception) when (exception is ArgumentException or NotSupportedException or PathTooLongException)
		{
			return false;
		}
	}

	private static bool IsBdoProcessRunning()
	{
		foreach (Process process in Process.GetProcesses())
		{
			using (process)
			{
				try
				{
					if (BdoProcessPattern.IsMatch(process.ProcessName)) return true;
				}
				catch (InvalidOperationException)
				{
					// A process may exit while the snapshot is enumerated; it is not BDO evidence.
				}
			}
		}
		return false;
	}

	private static async Task<string> ReadBoundedTextAsync(string filename, int maximumBytes, CancellationToken cancellationToken)
	{
		await using FileStream stream = new(filename, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete, 8192,
			FileOptions.Asynchronous | FileOptions.SequentialScan);
		if (stream.Length > maximumBytes)
		{
			throw new InvalidDataException(Path.GetFileName(filename) + " exceeds its permitted read limit.");
		}

		using MemoryStream bytes = new();
		byte[] buffer = ArrayPool<byte>.Shared.Rent(8192);
		try
		{
			while (true)
			{
				int permitted = (int)Math.Min(buffer.Length, maximumBytes - bytes.Length + 1L);
				int count = await stream.ReadAsync(buffer.AsMemory(0, permitted), cancellationToken);
				if (count == 0) break;
				if (bytes.Length + count > maximumBytes)
				{
					throw new InvalidDataException(Path.GetFileName(filename) + " grew beyond its permitted read limit.");
				}
				bytes.Write(buffer, 0, count);
			}
		}
		finally
		{
			ArrayPool<byte>.Shared.Return(buffer);
		}

		return DecodeText(bytes.ToArray()).Text;
	}

	private static async Task<RawBdoFile> ReadRawAsync(string filename, CancellationToken cancellationToken)
	{
		FileInfo entry = new(filename);
		EnsureRegularFile(entry, "gamevariable.xml must be a regular file, without links.");
		await using FileStream stream = new(filename, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete, 64 * 1024,
			FileOptions.Asynchronous | FileOptions.SequentialScan);
		FileIdentity before = GetIdentity(stream.SafeFileHandle);
		if (before.NumberOfLinks != 1)
		{
			throw Fail("UNSAFE_SOURCE", "gamevariable.xml must be a regular file, without links.");
		}
		if (stream.Length > MaximumXmlBytes)
		{
			throw Fail("SOURCE_TOO_LARGE", "gamevariable.xml exceeds the 20 MiB apply limit.");
		}

		DateTime initialWrite = entry.LastWriteTimeUtc;
		DateTime initialCreation = entry.CreationTimeUtc;
		long initialLength = stream.Length;
		using MemoryStream bytes = new((int)Math.Min(initialLength, MaximumXmlBytes));
		byte[] buffer = ArrayPool<byte>.Shared.Rent(64 * 1024);
		try
		{
			while (true)
			{
				int permitted = (int)Math.Min(buffer.Length, MaximumXmlBytes - bytes.Length + 1L);
				int count = await stream.ReadAsync(buffer.AsMemory(0, permitted), cancellationToken);
				if (count == 0) break;
				if (bytes.Length + count > MaximumXmlBytes)
				{
					throw Fail("SOURCE_TOO_LARGE", "gamevariable.xml exceeds the 20 MiB apply limit.");
				}
				bytes.Write(buffer, 0, count);
			}
		}
		finally
		{
			ArrayPool<byte>.Shared.Return(buffer);
		}

		FileIdentity after = GetIdentity(stream.SafeFileHandle);
		entry.Refresh();
		EnsureRegularFile(entry, "gamevariable.xml must be a regular file, without links.");
		FileIdentity current = GetIdentityForPath(filename);
		if (!before.Equals(after) || !before.Equals(current) || entry.Length != initialLength
			|| entry.LastWriteTimeUtc != initialWrite || entry.CreationTimeUtc != initialCreation)
		{
			throw Fail("SOURCE_CHANGED", "The BDO settings file changed while being read. Reload BDO Presets before applying.");
		}

		byte[] contents = bytes.ToArray();
		DecodedText decoded;
		try
		{
			decoded = DecodeText(contents);
		}
		catch (DecoderFallbackException)
		{
			throw Fail("INVALID_XML", "Cannot read gamevariable.xml with its declared text encoding.");
		}
		return new RawBdoFile(contents, Digest(contents), decoded.Text, decoded.Format,
			entry.LastWriteTimeUtc.ToString("O", CultureInfo.InvariantCulture));
	}

	private static void EnsureRegularFile(FileInfo file, string message)
	{
		file.Refresh();
		if (!file.Exists || !string.IsNullOrEmpty(file.LinkTarget))
		{
			throw Fail("UNSAFE_SOURCE", message);
		}
	}

	private static FileIdentity GetIdentityForPath(string filename)
	{
		FileInfo file = new(filename);
		EnsureRegularFile(file, "gamevariable.xml must be a regular file, without links.");
		using FileStream stream = new(filename, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete,
			1, FileOptions.SequentialScan);
		return GetIdentity(stream.SafeFileHandle);
	}

	private static string EnsureSafeDescendants(string root, IReadOnlyList<string> parts, bool lastIsFile)
	{
		string lexicalRoot;
		try
		{
			DirectoryInfo rootInfo = new(Path.GetFullPath(root));
			if (!rootInfo.Exists)
			{
				throw Fail("UNSAFE_SOURCE", "BDO settings and backup folders must not contain links.");
			}
			// The known Documents folder itself can legitimately be redirected (including
			// OneDrive). Treat that root as trusted, then reject a link at every descendant.
			lexicalRoot = rootInfo.FullName;
		}
		catch (LayoutEditorApplyException)
		{
			throw;
		}
		catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or ArgumentException or NotSupportedException)
		{
			throw Fail("UNSAFE_SOURCE", "BDO settings and backup folders must not contain links.");
		}

		string lexical = lexicalRoot;
		for (int index = 0; index < parts.Count; index++)
		{
			lexical = Path.Combine(lexical, parts[index]);
			bool file = lastIsFile && index == parts.Count - 1;
			FileSystemInfo info = file ? new FileInfo(lexical) : new DirectoryInfo(lexical);
			info.Refresh();
			if (!info.Exists || !string.IsNullOrEmpty(info.LinkTarget))
			{
				throw Fail("UNSAFE_SOURCE", "BDO settings and backup folders must not contain links.");
			}

			string expectedRelative = Path.Combine(parts.Take(index + 1).ToArray());
			string relative = Path.GetRelativePath(lexicalRoot, info.FullName);
			if (!string.Equals(relative, expectedRelative, StringComparison.OrdinalIgnoreCase))
			{
				throw Fail("UNSAFE_SOURCE", "The BDO settings path changed or points outside its expected folder.");
			}
		}

		return lexical;
	}

	private static DecodedText DecodeText(byte[] bytes)
	{
		Encoding encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);
		TextFormat format = new(TextEncodingKind.Utf8, Array.Empty<byte>());
		int offset = 0;
		if (bytes.Length >= 2 && bytes[0] == 0xff && bytes[1] == 0xfe)
		{
			encoding = new UnicodeEncoding(bigEndian: false, byteOrderMark: false, throwOnInvalidBytes: true);
			format = new TextFormat(TextEncodingKind.Utf16LittleEndian, new byte[] { 0xff, 0xfe });
			offset = 2;
		}
		else if (bytes.Length >= 2 && bytes[0] == 0xfe && bytes[1] == 0xff)
		{
			encoding = new UnicodeEncoding(bigEndian: true, byteOrderMark: false, throwOnInvalidBytes: true);
			format = new TextFormat(TextEncodingKind.Utf16BigEndian, new byte[] { 0xfe, 0xff });
			offset = 2;
		}
		else if (bytes.Length >= 3 && bytes[0] == 0xef && bytes[1] == 0xbb && bytes[2] == 0xbf)
		{
			format = new TextFormat(TextEncodingKind.Utf8, new byte[] { 0xef, 0xbb, 0xbf });
			offset = 3;
		}
		return new DecodedText(encoding.GetString(bytes, offset, bytes.Length - offset), format);
	}

	private static byte[] EncodeText(string text, TextFormat format)
	{
		Encoding encoding = format.Encoding switch
		{
			TextEncodingKind.Utf8 => new UTF8Encoding(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true),
			TextEncodingKind.Utf16LittleEndian => new UnicodeEncoding(bigEndian: false, byteOrderMark: false, throwOnInvalidBytes: true),
			TextEncodingKind.Utf16BigEndian => new UnicodeEncoding(bigEndian: true, byteOrderMark: false, throwOnInvalidBytes: true),
			_ => throw new InvalidOperationException("Unsupported BDO text encoding.")
		};
		byte[] payload = encoding.GetBytes(text);
		byte[] result = new byte[format.Bom.Length + payload.Length];
		Buffer.BlockCopy(format.Bom, 0, result, 0, format.Bom.Length);
		Buffer.BlockCopy(payload, 0, result, format.Bom.Length, payload.Length);
		return result;
	}

	private static string Digest(byte[] value) => Convert.ToHexString(SHA256.HashData(value)).ToLowerInvariant();

	private static bool TryReadReceipt(JsonElement root, out BdoApplyStatus? status)
	{
		status = null;
		if (root.ValueKind != JsonValueKind.Object || !root.TryGetProperty("pending", out JsonElement pendingElement)
			|| (pendingElement.ValueKind is not JsonValueKind.True and not JsonValueKind.False)
			|| !root.TryGetProperty("stateHash", out JsonElement hashElement) || hashElement.ValueKind != JsonValueKind.String
			|| !IsValidHash(hashElement.GetString()))
		{
			return false;
		}

		string? accountId = null;
		if (root.TryGetProperty("accountId", out JsonElement accountElement) && accountElement.ValueKind != JsonValueKind.Null)
		{
			if (accountElement.ValueKind != JsonValueKind.String || !IsValidAccountId(accountElement.GetString())) return false;
			accountId = accountElement.GetString();
		}

		LayoutEditorApplyMode mode = LayoutEditorApplyMode.ClosedGame;
		if (root.TryGetProperty("applyMode", out JsonElement modeElement))
		{
			if (modeElement.ValueKind != JsonValueKind.String) return false;
			string? value = modeElement.GetString();
			if (value is not ("closed-game" or "character-selection" or "game-open")) return false;
			mode = ParseWireMode(value);
		}

		BdoApplyFailure? failure = null;
		if (root.TryGetProperty("failure", out JsonElement failureElement))
		{
			if (!pendingElement.GetBoolean() || failureElement.ValueKind != JsonValueKind.Object
				|| !failureElement.TryGetProperty("code", out JsonElement codeElement) || codeElement.ValueKind != JsonValueKind.String
				|| !Regex.IsMatch(codeElement.GetString() ?? string.Empty, "^[A-Z0-9_]{1,64}$", RegexOptions.CultureInvariant)
				|| !failureElement.TryGetProperty("error", out JsonElement errorElement) || errorElement.ValueKind != JsonValueKind.String
				|| string.IsNullOrEmpty(errorElement.GetString()) || errorElement.GetString()!.Length > 768
				|| !failureElement.TryGetProperty("failedAt", out JsonElement failedAtElement) || failedAtElement.ValueKind != JsonValueKind.String
				|| !DateTimeOffset.TryParse(failedAtElement.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out _))
			{
				return false;
			}
			failure = new BdoApplyFailure(codeElement.GetString()!, errorElement.GetString()!, failedAtElement.GetString()!);
		}

		status = new BdoApplyStatus
		{
			Pending = pendingElement.GetBoolean(),
			AccountId = accountId,
			StateHash = hashElement.GetString()!,
			ApplyMode = ToWireMode(mode),
			Failure = failure
		};
		return true;
	}

	private static JsonElement NormalizeState(JsonElement state)
	{
		try
		{
			LayoutEditorStore.Validate(state);
			JsonNode? rootNode = JsonNode.Parse(state.GetRawText());
			if (rootNode is not JsonObject root || root["profiles"] is not JsonObject profiles || root["active"] is not JsonArray active)
			{
				throw Fail("INVALID_LAYOUT", "Cannot apply this library: Missing profile data.");
			}

			foreach (JsonNode? activeIdNode in active)
			{
				string? activeId = activeIdNode?.GetValue<string>();
				if (activeId is null || profiles[activeId] is not JsonObject profile || profile["slots"] is not JsonArray slots)
				{
					throw Fail("INVALID_LAYOUT", "Cannot apply this library: Unknown assigned layout.");
				}
				double width = profile["width"]!.GetValue<double>();
				double height = profile["height"]!.GetValue<double>();
				double scale = profile["uiScale"]!.GetValue<double>();
				double size = 40 * scale / 100;
				foreach (JsonNode? slotNode in slots)
				{
					if (slotNode is not JsonObject slot) throw Fail("INVALID_LAYOUT", "Cannot apply this library: Invalid slot data.");
					double x = slot["x"]!.GetValue<double>();
					double y = slot["y"]!.GetValue<double>();
					slot["x"] = Math.Min(Math.Floor(width - size), Math.Max(0, JavaScriptRound(x)));
					slot["y"] = Math.Min(Math.Floor(height - size), Math.Max(0, JavaScriptRound(y)));
				}
			}

			using JsonDocument normalized = JsonDocument.Parse(rootNode.ToJsonString());
			LayoutEditorStore.Validate(normalized.RootElement);
			return normalized.RootElement.Clone();
		}
		catch (LayoutEditorApplyException)
		{
			throw;
		}
		catch (Exception exception) when (exception is InvalidDataException or JsonException or InvalidOperationException or FormatException)
		{
			throw new LayoutEditorApplyException("INVALID_LAYOUT", "Cannot apply this library: " + exception.Message, exception);
		}
	}

	private static double JavaScriptRound(double value) => Math.Floor(value + 0.5);

	private static JsonElement CloneJson(JsonElement value)
	{
		using JsonDocument document = JsonDocument.Parse(value.GetRawText());
		return document.RootElement.Clone();
	}

	private static string HashState(JsonElement state)
	{
		byte[] encoded = EncodeState(state);
		return Digest(encoded);
	}

	// JSON.stringify-style compact JSON in the existing property order. The schema validator has already
	// ruled out duplicate properties and unsupported values, so this stays stable across receipt reads.
	private static byte[] EncodeState(JsonElement state)
	{
		using MemoryStream stream = new();
		using (Utf8JsonWriter writer = new(stream, new JsonWriterOptions { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping, Indented = false }))
		{
			WriteJsonElement(writer, state);
		}
		return stream.ToArray();
	}

	private static void WriteJsonElement(Utf8JsonWriter writer, JsonElement value)
	{
		switch (value.ValueKind)
		{
			case JsonValueKind.Object:
				writer.WriteStartObject();
				foreach (JsonProperty property in value.EnumerateObject())
				{
					writer.WritePropertyName(property.Name);
					WriteJsonElement(writer, property.Value);
				}
				writer.WriteEndObject();
				break;
			case JsonValueKind.Array:
				writer.WriteStartArray();
				foreach (JsonElement item in value.EnumerateArray()) WriteJsonElement(writer, item);
				writer.WriteEndArray();
				break;
			case JsonValueKind.String:
				writer.WriteStringValue(value.GetString());
				break;
			case JsonValueKind.Number:
				writer.WriteRawValue(value.GetRawText(), skipInputValidation: true);
				break;
			case JsonValueKind.True:
				writer.WriteBooleanValue(true);
				break;
			case JsonValueKind.False:
				writer.WriteBooleanValue(false);
				break;
			case JsonValueKind.Null:
				writer.WriteNullValue();
				break;
			default:
				throw Fail("INVALID_LAYOUT", "Cannot apply this library: unsupported JSON value.");
		}
	}

	private sealed record RawBdoFile(byte[] Bytes, string Hash, string Text, TextFormat TextFormat, string ModifiedAt);
	private sealed record DecodedText(string Text, TextFormat Format);
	private enum TextEncodingKind { Utf8, Utf16LittleEndian, Utf16BigEndian }
	private sealed record TextFormat(TextEncodingKind Encoding, byte[] Bom);

	[StructLayout(LayoutKind.Sequential)]
	private struct ByHandleFileInformation
	{
		public uint FileAttributes;
		public uint CreationTimeLow;
		public uint CreationTimeHigh;
		public uint LastAccessTimeLow;
		public uint LastAccessTimeHigh;
		public uint LastWriteTimeLow;
		public uint LastWriteTimeHigh;
		public uint VolumeSerialNumber;
		public uint FileSizeHigh;
		public uint FileSizeLow;
		public uint NumberOfLinks;
		public uint FileIndexHigh;
		public uint FileIndexLow;
	}

	[DllImport("kernel32.dll", SetLastError = true)]
	[return: MarshalAs(UnmanagedType.Bool)]
	private static extern bool GetFileInformationByHandle(SafeFileHandle file, out ByHandleFileInformation information);

	private readonly record struct FileIdentity(uint VolumeSerialNumber, uint FileIndexHigh, uint FileIndexLow, uint NumberOfLinks)
	{
		public static FileIdentity From(ByHandleFileInformation information) => new(information.VolumeSerialNumber,
			information.FileIndexHigh, information.FileIndexLow, information.NumberOfLinks);
	}

	private static FileIdentity GetIdentity(SafeFileHandle handle)
	{
		if (!GetFileInformationByHandle(handle, out ByHandleFileInformation information))
		{
			throw new IOException("Could not inspect the BDO settings file.", new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error()));
		}
		return FileIdentity.From(information);
	}

	private static BdoWritePlan BuildWritePlan(string xml, JsonElement requestedState, string gameOptionsText)
	{
		JsonElement state = NormalizeState(requestedState);
		ParsedGameFile original = ParseGameFile(xml, gameOptionsText);
		if (original.ClampedSlotCount != 0)
		{
			throw Fail("UNSUPPORTED_OFFSCREEN_POSITION", "The BDO file contains offscreen slots that were fitted to the preview. Save those presets inside BDO, then reload before applying changes. Your local library can still be saved.");
		}

		JsonElement profiles = state.GetProperty("profiles");
		string[] activeIds = state.GetProperty("active").EnumerateArray().Select(element => element.GetString()!).ToArray();
		if (activeIds.Length != 3)
		{
			throw Fail("INVALID_LAYOUT", "Cannot apply this library: There must be three active preset slots.");
		}

		for (int index = 0; index < 3; index++)
		{
			JsonElement profile = profiles.GetProperty(activeIds[index]);
			int width = (int)profile.GetProperty("width").GetDouble();
			int height = (int)profile.GetProperty("height").GetDouble();
			double scale = profile.GetProperty("uiScale").GetDouble();
			if (width != original.Display.Width || height != original.Display.Height || scale != original.Display.UiScale)
			{
				string name = profile.GetProperty("name").GetString() ?? activeIds[index];
				throw Fail("DISPLAY_MISMATCH", $"Preset {index + 1} ({name}) uses {width} × {height} at {FormatJsNumber(scale)}%. BDO is saved at {original.Display.Width} × {original.Display.Height} and {FormatJsNumber(original.Display.UiScale)}%. Match the preset's display settings to BDO before applying. Your layouts are saved locally.");
			}
		}

		List<XmlEdit> edits = new();
		List<ExpectedPosition> expected = new();
		BdoWriteReport report = new();
		for (int index = 0; index < 3; index++)
		{
			ParsedPreset source = original.Presets[index];
			JsonElement profile = profiles.GetProperty(activeIds[index]);
			string profileId = profile.GetProperty("id").GetString() ?? activeIds[index];
			string profileName = profile.GetProperty("name").GetString() ?? profileId;
			BdoWritePresetReport assignment = new()
			{
				Number = index + 1,
				ProfileId = profileId,
				Name = profileName
			};
			report.Presets.Add(assignment);

			Dictionary<string, SlotPosition> desired = ReadProfileSlots(profile);
			for (int axisIndex = 0; axisIndex < 2; axisIndex++)
			{
				char axis = axisIndex == 0 ? 'x' : 'y';
				if (source.Slots.Any(detail => GetAxis(desired[detail.Id], axis) != GetAxis(detail, axis)))
				{
					RelativeCalibration calibration = Calibrate(source, axis, axis == 'x' ? original.Display.Width : original.Display.Height);
					assignment.Calibration[axis.ToString()] = new BdoRelativeCalibrationReport
					{
						Denominator = calibration.Denominator,
						Offsets = new Dictionary<string, double>(StringComparer.Ordinal)
						{
							["cd"] = calibration.CooldownOffset,
							["quick"] = calibration.QuickslotOffset
						}
					};
				}
			}

			foreach (ParsedSlot detail in source.Slots)
			{
				if (!desired.TryGetValue(detail.Id, out SlotPosition slot))
				{
					throw Fail("AMBIGUOUS_FORMAT", "The requested slot could not be matched to one saved BDO panel.");
				}

				double size = 40 * original.Display.UiScale / 100;
				if (slot.X < 0 || slot.Y < 0 || slot.X + size > original.Display.Width || slot.Y + size > original.Display.Height)
				{
					throw Fail("INVALID_POSITION", $"Preset {index + 1}, {detail.Id}, is outside the saved BDO display.");
				}

				expected.Add(new ExpectedPosition(index, slot.Id, slot.X, slot.Y));
				bool changedSlot = false;
				AppendPositionEdit("PosX", "RelativePosX", slot.X, detail.OriginalX, 'x');
				AppendPositionEdit("PosY", "RelativePosY", slot.Y, detail.OriginalY, 'y');
				if (changedSlot) assignment.ChangedSlots++;

				void AppendPositionEdit(string absoluteAttribute, string relativeAttribute, double desiredValue, double originalValue, char axis)
				{
					if (desiredValue == originalValue) return;
					if (!detail.Node.Attributes.TryGetValue(absoluteAttribute, out XmlAttributeValue? absoluteRange))
					{
						throw Fail("AMBIGUOUS_FORMAT", $"Cannot locate {absoluteAttribute} for {source.Name}, panel {detail.PanelIndex}.");
					}
					if (!detail.Node.Attributes.TryGetValue(relativeAttribute, out XmlAttributeValue? relativeRange))
					{
						throw Fail("UNSUPPORTED_RELATIVE_POSITION", $"Cannot locate {relativeAttribute} for {source.Name}, panel {detail.PanelIndex}.");
					}
					if (!assignment.Calibration.TryGetValue(axis.ToString(), out BdoRelativeCalibrationReport? model))
					{
						throw Fail("UNCALIBRATED_RELATIVE_POSITION", $"{source.Name}'s {char.ToUpperInvariant(axis)} coordinate mapping could not be calibrated.");
					}

					double offset = detail.Family == "cd" ? model.Offsets["cd"] : model.Offsets["quick"];
					double relativeValue = (desiredValue + offset) / model.Denominator;
					edits.Add(new XmlEdit(absoluteRange.Start, absoluteRange.End, FormatJsNumber(desiredValue)));
					edits.Add(new XmlEdit(relativeRange.Start, relativeRange.End, relativeValue.ToString("F10", CultureInfo.InvariantCulture)));
					assignment.ChangedAttributes += 2;
					changedSlot = true;
				}
			}

			report.ChangedSlots += assignment.ChangedSlots;
			report.ChangedAttributes += assignment.ChangedAttributes;
		}

		string output = ApplyXmlEdits(xml, edits);
		report.Changed = edits.Count > 0;
		ParsedGameFile verified = ParseGameFile(output, gameOptionsText);
		foreach (ExpectedPosition desired in expected)
		{
			ParsedSlot? found = verified.Presets[desired.PresetIndex].Slots.FirstOrDefault(slot => slot.Id == desired.Id);
			if (found is null || found.OriginalX != desired.X || found.OriginalY != desired.Y)
			{
				throw Fail("WRITE_VERIFICATION_FAILED", "The generated BDO positions did not match the requested presets. Nothing was applied.");
			}
		}

		for (int index = 0; index < report.Presets.Count; index++)
		{
			foreach ((string axis, BdoRelativeCalibrationReport originalCalibration) in report.Presets[index].Calibration)
			{
				RelativeCalibration verification = Calibrate(verified.Presets[index], axis[0],
					axis == "x" ? original.Display.Width : original.Display.Height);
				if (verification.Denominator != originalCalibration.Denominator)
				{
					throw Fail("WRITE_VERIFICATION_FAILED", "The generated relative coordinate mapping did not match the source. Nothing was applied.");
				}
			}
		}

		return new BdoWritePlan(output, report);
	}

	private static string ApplyXmlEdits(string xml, List<XmlEdit> edits)
	{
		if (edits.Count == 0) return xml;
		edits.Sort((left, right) => left.Start.CompareTo(right.Start));
		StringBuilder output = new(xml.Length + edits.Sum(edit => edit.Value.Length - (edit.End - edit.Start)));
		int cursor = 0;
		foreach (XmlEdit edit in edits)
		{
			if (edit.Start < cursor || edit.End > xml.Length || edit.End <= edit.Start)
			{
				throw Fail("AMBIGUOUS_FORMAT", "The BDO attribute replacement ranges overlap.");
			}
			output.Append(xml, cursor, edit.Start - cursor);
			output.Append(edit.Value);
			cursor = edit.End;
		}
		output.Append(xml, cursor, xml.Length - cursor);
		return output.ToString();
	}

	private static Dictionary<string, SlotPosition> ReadProfileSlots(JsonElement profile)
	{
		Dictionary<string, SlotPosition> slots = new(StringComparer.Ordinal);
		foreach (JsonElement slot in profile.GetProperty("slots").EnumerateArray())
		{
			string id = slot.GetProperty("id").GetString()!;
			slots.Add(id, new SlotPosition(id, slot.GetProperty("x").GetDouble(), slot.GetProperty("y").GetDouble()));
		}
		return slots;
	}

	private static double GetAxis(SlotPosition value, char axis) => axis == 'x' ? value.X : value.Y;
	private static double GetAxis(ParsedSlot value, char axis) => axis == 'x' ? value.OriginalX : value.OriginalY;

	private static RelativeCalibration Calibrate(ParsedPreset source, char axis, int dimension)
	{
		string relativeKey = axis == 'x' ? "RelativePosX" : "RelativePosY";
		foreach (ParsedSlot detail in source.Slots)
		{
			if (!TryNumeric(detail.Node.AttributeValue("RelativePosX"), out _)
				|| !TryNumeric(detail.Node.AttributeValue("RelativePosY"), out _))
			{
				throw Fail("UNSUPPORTED_RELATIVE_POSITION", $"{source.Name}, panel {detail.PanelIndex}, has no usable RelativePosX/RelativePosY. Reload a preset saved by BDO before applying position changes.");
			}
		}

		List<ParsedSlot[]> groups = new()
		{
			source.Slots.Where(slot => slot.Family == "cd").ToArray(),
			source.Slots.Where(slot => slot.Family == "quick").ToArray()
		};
		bool hasSpread = groups.Any(group => group.Select(slot => GetAxis(slot, axis)).Distinct().Count() > 1);
		if (!hasSpread)
		{
			throw Fail("UNCALIBRATED_RELATIVE_POSITION", $"{source.Name} has no position spread to verify the {char.ToUpperInvariant(axis)} coordinate mapping. Arrange a few slots along that axis in BDO, save its preset, and reload.");
		}

		List<RelativeCalibration> candidates = new();
		foreach (int denominator in new[] { dimension - 1, dimension, dimension + 1 })
		{
			if (denominator <= 0) continue;
			double[] offsets = new double[2];
			bool valid = true;
			for (int groupIndex = 0; groupIndex < groups.Count; groupIndex++)
			{
				double low = double.NegativeInfinity;
				double high = double.PositiveInfinity;
				foreach (ParsedSlot detail in groups[groupIndex])
				{
					string literal = detail.Node.AttributeValue(relativeKey)!;
					if (!TryNumeric(literal, out double relative))
					{
						valid = false;
						break;
					}
					double unit = QuantizationUnit(literal);
					double offset = relative * denominator - GetAxis(detail, axis);
					double tolerance = denominator * unit / 2 + 1e-7;
					low = Math.Max(low, offset - tolerance);
					high = Math.Min(high, offset + tolerance);
				}
				if (!valid || low > high || !double.IsFinite(low) || !double.IsFinite(high))
				{
					valid = false;
					break;
				}
				offsets[groupIndex] = (low + high) / 2;
			}
			if (valid) candidates.Add(new RelativeCalibration(denominator, offsets[0], offsets[1]));
		}

		if (candidates.Count != 1)
		{
			string reason = candidates.Count > 0 ? "is ambiguous" : "does not match a supported saved display";
			throw Fail("UNCALIBRATED_RELATIVE_POSITION", $"{source.Name}'s {char.ToUpperInvariant(axis)} coordinate mapping {reason}. Reload presets saved at BDO's current resolution before applying. Your local library can still be saved.");
		}
		return candidates[0];
	}

	private static double QuantizationUnit(string literal)
	{
		string normalized = literal.Trim().ToLowerInvariant();
		string[] components = normalized.Split('e');
		if (components.Length is < 1 or > 2 || !int.TryParse(components.Length == 2 ? components[1] : "0", NumberStyles.AllowLeadingSign,
			CultureInfo.InvariantCulture, out int exponent))
		{
			throw Fail("UNSUPPORTED_RELATIVE_POSITION", "A saved relative coordinate has unsupported numeric precision.");
		}
		int decimalIndex = components[0].IndexOf('.', StringComparison.Ordinal);
		int decimals = decimalIndex < 0 ? 0 : components[0].Length - decimalIndex - 1;
		double unit = Math.Pow(10, exponent - decimals);
		if (!double.IsFinite(unit) || unit <= 0)
		{
			throw Fail("UNSUPPORTED_RELATIVE_POSITION", "A saved relative coordinate has unsupported numeric precision.");
		}
		return unit;
	}

	private static string FormatJsNumber(double value)
	{
		if (!double.IsFinite(value)) throw Fail("INVALID_POSITION", "A BDO position is not finite.");
		if (value == Math.Truncate(value) && value is >= long.MinValue and <= long.MaxValue)
		{
			return ((long)value).ToString(CultureInfo.InvariantCulture);
		}
		return value.ToString("R", CultureInfo.InvariantCulture);
	}

	private sealed record BdoWritePlan(string Xml, BdoWriteReport Report);
	private sealed record XmlEdit(int Start, int End, string Value);
	private sealed record SlotPosition(string Id, double X, double Y);
	private sealed record ExpectedPosition(int PresetIndex, string Id, double X, double Y);
	private sealed record RelativeCalibration(int Denominator, double CooldownOffset, double QuickslotOffset);

	private sealed class ParsedGameFile
	{
		public required XmlNode Document { get; init; }
		public required XmlNode Section { get; init; }
		public required BdoDisplay Display { get; init; }
		public required List<ParsedPreset> Presets { get; init; }
		public int ClampedSlotCount { get; init; }
	}

	private sealed class ParsedPreset
	{
		public required string Name { get; init; }
		public required string SourceTag { get; init; }
		public required List<ParsedSlot> Slots { get; init; }
	}

	private sealed class ParsedSlot
	{
		public required string Id { get; init; }
		public required string Family { get; init; }
		public required int Number { get; init; }
		public required int PanelIndex { get; init; }
		public required double OriginalX { get; init; }
		public required double OriginalY { get; init; }
		public required XmlNode Node { get; init; }
		public bool Clamped { get; init; }
	}

	private static ParsedGameFile ParseGameFile(string xml, string? gameOptionsText)
	{
		XmlNode document = ParseXmlFragment(xml);
		XmlNode? section = OneChild(document, "UISettingPreset");
		if (section is null)
		{
			throw Fail("MISSING_PRESET", "No UISettingPreset section was found. Choose the account gamevariable.xml under Documents/Black Desert/UserCache.");
		}
		if (section.AttributeValue("Version") != "1")
		{
			throw Fail("UNSUPPORTED_GAME_FORMAT", "UISettingPreset version " + (section.AttributeValue("Version") ?? "(missing)") + " is not supported.");
		}

		BdoDisplay display = ReadDisplay(document, gameOptionsText);
		IReadOnlyList<PanelMapping> mappings = BuildMappings();
		List<ParsedPreset> presets = new();
		int clampedSlots = 0;
		for (int presetIndex = 0; presetIndex < 3; presetIndex++)
		{
			string sourceTag = "UISettingPreset" + presetIndex.ToString(CultureInfo.InvariantCulture);
			List<XmlNode> entries = Children(section, sourceTag).ToList();
			string name = "BDO Preset " + (presetIndex + 1).ToString(CultureInfo.InvariantCulture);
			if (entries.Count == 0)
			{
				throw Fail("MISSING_PRESET", $"BDO Preset {presetIndex + 1} is not saved in this file. Save all three presets in BDO's Edit UI, then reload Documents.");
			}

			List<ParsedSlot> slots = new();
			foreach (PanelMapping mapping in mappings)
			{
				List<XmlNode> panels = entries.Where(entry => TryNumeric(entry.AttributeValue("Index"), out double index) && index == mapping.PanelIndex).ToList();
				if (panels.Count != 1)
				{
					throw Fail(panels.Count == 0 ? "MISSING_PANEL" : "DUPLICATE_PANEL",
						$"{name} { (panels.Count == 0 ? "is missing" : "has duplicate") } panel {mapping.PanelIndex}. Save this preset again in BDO's Edit UI before importing.");
				}

				XmlNode panel = panels[0];
				if (!TryNumeric(panel.AttributeValue("PosX"), out double originalX) || !TryNumeric(panel.AttributeValue("PosY"), out double originalY))
				{
					throw Fail("MISSING_POSITION", $"{name}, panel {mapping.PanelIndex}, has no usable PosX/PosY. This importer does not guess positions from another preset or relative coordinates.");
				}
				string? anchor = panel.AttributeValue("PendingType");
				if (anchor != "LeftTop")
				{
					throw Fail("UNSUPPORTED_ANCHOR", $"{name}, panel {mapping.PanelIndex}, uses {anchor ?? "an unspecified"} anchor. Only explicit LeftTop positions are supported.");
				}
				string? visible = panel.AttributeValue("IsShow");
				if (visible is not ("true" or "false"))
				{
					throw Fail("UNSUPPORTED_GAME_FORMAT", $"{name}, panel {mapping.PanelIndex}, has no supported IsShow value.");
				}

				double size = 40 * display.UiScale / 100;
				double editorX = Math.Min(display.Width - size, Math.Max(0, originalX));
				double editorY = Math.Min(display.Height - size, Math.Max(0, originalY));
				bool clamped = editorX != originalX || editorY != originalY;
				if (clamped) clampedSlots++;
				slots.Add(new ParsedSlot
				{
					Id = mapping.Id,
					Family = mapping.Family,
					Number = mapping.Number,
					PanelIndex = mapping.PanelIndex,
					OriginalX = originalX,
					OriginalY = originalY,
					Node = panel,
					Clamped = clamped
				});
			}
			presets.Add(new ParsedPreset { Name = name, SourceTag = sourceTag, Slots = slots });
		}

		return new ParsedGameFile { Document = document, Section = section, Display = display, Presets = presets, ClampedSlotCount = clampedSlots };
	}

	private static IReadOnlyList<PanelMapping> BuildMappings()
	{
		List<PanelMapping> mappings = new(40);
		for (int index = 0; index < 10; index++) mappings.Add(new PanelMapping(128 + index, "cd-" + (index + 1), "cd", index + 1));
		for (int index = 0; index < 10; index++) mappings.Add(new PanelMapping(148 + index, "cd-" + (index + 11), "cd", index + 11));
		for (int index = 0; index < 20; index++) mappings.Add(new PanelMapping(91 + index, "q-" + (index + 1), "quick", index + 1));
		return mappings;
	}

	private sealed record PanelMapping(int PanelIndex, string Id, string Family, int Number);

	private static BdoDisplay ReadDisplay(XmlNode document, string? fallbackText)
	{
		XmlNode? global = OneChild(document, "GameOptionGlobal");
		XmlNode? resolution = global is null ? null : OneChild(global, "Resolution");
		XmlNode? scale = global is null ? null : OneChild(global, "UiScale");
		Dictionary<string, string> fallback = resolution is not null && scale is not null
			? new Dictionary<string, string>(StringComparer.Ordinal)
			: ParseGameOptions(fallbackText);

		TryNumeric(resolution?.AttributeValue("Width") ?? GetOption(fallback, "width"), out double width);
		TryNumeric(resolution?.AttributeValue("Height") ?? GetOption(fallback, "height"), out double height);
		TryNumeric(scale?.AttributeValue("Value") ?? GetOption(fallback, "uiscale"), out double rawScale);
		double uiScale = rawScale is >= 0.5 and <= 1.5 ? JavaScriptRound(rawScale * 100 * 1e8) / 1e8 : rawScale;
		if (!IsIntegerBetween(width, 800, 7680) || !IsIntegerBetween(height, 600, 4320))
		{
			throw Fail("INVALID_DISPLAY", "The saved game resolution is missing or unsupported. Expected 800–7680 × 600–4320 in GameOptionGlobal/Resolution or GameOption.txt.");
		}
		if (!double.IsFinite(uiScale) || uiScale < 50 || uiScale > 150)
		{
			throw Fail("INVALID_DISPLAY", "The saved UI scale is missing or unsupported. Expected 50–150% in GameOptionGlobal/UiScale or GameOption.txt.");
		}

		return new BdoDisplay((int)width, (int)height, uiScale,
			resolution is null ? "GameOption.txt" : "GameOptionGlobal/Resolution",
			scale is null ? "GameOption.txt" : "GameOptionGlobal/UiScale");
	}

	private static Dictionary<string, string> ParseGameOptions(string? text)
	{
		Dictionary<string, string> options = new(StringComparer.Ordinal);
		if (string.IsNullOrEmpty(text)) return options;
		if (text.Length > 1024 * 1024)
		{
			throw Fail("INVALID_DISPLAY", "GameOption.txt is invalid or exceeds 1 MiB.");
		}

		string source = text[0] == '\ufeff' ? text[1..] : text;
		foreach (string rawLine in source.Split('\n'))
		{
			string line = rawLine.EndsWith('\r') ? rawLine[..^1] : rawLine;
			Match match = Regex.Match(line, "^\\s*(width|height|uiScale)\\s*=\\s*(.*?)\\s*$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
			if (!match.Success) continue;
			string key = match.Groups[1].Value.ToLowerInvariant();
			if (!options.TryAdd(key, match.Groups[2].Value))
			{
				throw Fail("INVALID_DISPLAY", "GameOption.txt contains duplicate " + match.Groups[1].Value + " settings.");
			}
		}
		return options;
	}

	private static string? GetOption(Dictionary<string, string> options, string key) => options.TryGetValue(key, out string? value) ? value : null;

	private static bool IsIntegerBetween(double value, int lower, int upper) => double.IsFinite(value)
		&& Math.Truncate(value) == value && value >= lower && value <= upper;

	private static readonly Regex NumericPattern = new("^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?$", RegexOptions.CultureInvariant | RegexOptions.Compiled);

	private static bool TryNumeric(string? value, out double result)
	{
		result = double.NaN;
		if (value is null) return false;
		string trimmed = TrimEcmaWhitespace(value);
		if (!NumericPattern.IsMatch(trimmed) || !double.TryParse(trimmed, NumberStyles.Float, CultureInfo.InvariantCulture, out result)
			|| !double.IsFinite(result))
		{
			result = double.NaN;
			return false;
		}
		return true;
	}

	private static string TrimEcmaWhitespace(string value)
	{
		int start = 0, end = value.Length;
		while (start < end && IsEcmaWhitespace(value[start])) start++;
		while (end > start && IsEcmaWhitespace(value[end - 1])) end--;
		return start == 0 && end == value.Length ? value : value[start..end];
	}

	private static bool IsEcmaWhitespace(char value) => value is >= '\u0009' and <= '\u000d'
		or '\u0020' or '\u00a0' or '\u1680' or >= '\u2000' and <= '\u200a'
		or '\u2028' or '\u2029' or '\u202f' or '\u205f' or '\u3000' or '\ufeff';

	private static IEnumerable<XmlNode> Children(XmlNode parent, string name) => parent.Children.Where(child => child.Name == name);

	private static XmlNode? OneChild(XmlNode parent, string name)
	{
		List<XmlNode> matches = Children(parent, name).ToList();
		if (matches.Count > 1)
		{
			throw Fail("AMBIGUOUS_FORMAT", "gamevariable.xml contains more than one " + name + " section.");
		}
		return matches.Count == 0 ? null : matches[0];
	}

	private static string SerializeActualPositions(ParsedGameFile parsed)
	{
		List<SerializedPositionPreset> positions = parsed.Presets.Select(preset => new SerializedPositionPreset(
			parsed.Display.Width, parsed.Display.Height, parsed.Display.UiScale,
			preset.Slots.Select(slot => new SerializedPosition(slot.Id, slot.OriginalX, slot.OriginalY))
				.OrderBy(slot => slot.Id, StringComparer.Ordinal).ToArray())).ToList();
		return JsonSerializer.Serialize(positions, ReceiptJsonOptions);
	}

	private static string SerializeIntendedPositions(JsonElement state)
	{
		JsonElement profiles = state.GetProperty("profiles");
		List<SerializedPositionPreset> positions = new();
		foreach (JsonElement activeIdElement in state.GetProperty("active").EnumerateArray())
		{
			JsonElement profile = profiles.GetProperty(activeIdElement.GetString()!);
			positions.Add(new SerializedPositionPreset((int)profile.GetProperty("width").GetDouble(), (int)profile.GetProperty("height").GetDouble(),
				profile.GetProperty("uiScale").GetDouble(), profile.GetProperty("slots").EnumerateArray()
					.Select(slot => new SerializedPosition(slot.GetProperty("id").GetString()!, slot.GetProperty("x").GetDouble(), slot.GetProperty("y").GetDouble()))
					.OrderBy(slot => slot.Id, StringComparer.Ordinal).ToArray()));
		}
		return JsonSerializer.Serialize(positions, ReceiptJsonOptions);
	}

	private sealed record SerializedPosition(string Id, double X, double Y);
	private sealed record SerializedPositionPreset(int Width, int Height, double UiScale, SerializedPosition[] Slots);

	private static string? SourceFingerprint(string xml, string? gameOptionsText)
	{
		try
		{
			ParsedGameFile parsed = ParseGameFile(xml, gameOptionsText);
			using MemoryStream stream = new();
			using (Utf8JsonWriter writer = new(stream, new JsonWriterOptions { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping }))
			{
				writer.WriteStartObject();
				writer.WritePropertyName("section");
				WriteCanonicalNode(writer, parsed.Section);
				writer.WritePropertyName("display");
				writer.WriteStartObject();
				writer.WriteNumber("width", parsed.Display.Width);
				writer.WriteNumber("height", parsed.Display.Height);
				writer.WriteNumber("uiScale", parsed.Display.UiScale);
				writer.WriteEndObject();
				writer.WriteEndObject();
			}
			return Digest(stream.ToArray());
		}
		catch
		{
			// Unsupported source formats remain protected by exact-byte conflict checks.
			return null;
		}
	}

	private static void WriteCanonicalNode(Utf8JsonWriter writer, XmlNode node)
	{
		writer.WriteStartObject();
		writer.WriteString("name", node.Name);
		writer.WritePropertyName("attributes");
		writer.WriteStartArray();
		foreach ((string key, XmlAttributeValue value) in node.Attributes.OrderBy(pair => pair.Key, StringComparer.Ordinal))
		{
			writer.WriteStartArray();
			writer.WriteStringValue(key);
			writer.WriteStringValue(value.Value);
			writer.WriteEndArray();
		}
		writer.WriteEndArray();
		writer.WritePropertyName("children");
		writer.WriteStartArray();
		foreach (XmlNode child in node.Children) WriteCanonicalNode(writer, child);
		writer.WriteEndArray();
		writer.WriteEndObject();
	}

	private sealed class XmlNode
	{
		public required string Name { get; init; }
		public Dictionary<string, XmlAttributeValue> Attributes { get; } = new(StringComparer.Ordinal);
		public List<XmlNode> Children { get; } = new();
		public int Start { get; init; }
		public int End { get; set; }
		public int StartTagEnd { get; set; }

		public string? AttributeValue(string name) => Attributes.TryGetValue(name, out XmlAttributeValue? value) ? value.Value : null;
	}

	private sealed record XmlAttributeValue(string Value, int Start, int End, char Quote);

	private static XmlNode ParseXmlFragment(string input)
	{
		if (string.IsNullOrEmpty(input) || TrimEcmaWhitespace(input).Length == 0)
		{
			throw Fail("INVALID_XML", "Choose a nonempty gamevariable.xml file.");
		}
		if (input.Length > 32 * 1024 * 1024)
		{
			throw Fail("INVALID_XML", "gamevariable.xml exceeds the 32 MiB import limit.");
		}

		XmlNode document = new() { Name = "#fragment", Start = 0, End = input.Length };
		Stack<XmlNode> stack = new();
		stack.Push(document);
		int cursor = input.Length > 0 && input[0] == '\ufeff' ? 1 : 0;
		int nodes = 0;
		while (cursor < input.Length)
		{
			if (input[cursor] != '<')
			{
				int end = input.IndexOf('<', cursor);
				int next = end < 0 ? input.Length : end;
				string content = input[cursor..next];
				if (content.Contains("]]>", StringComparison.Ordinal)) XmlError("unexpected CDATA terminator", cursor);
				string decoded = DecodeXml(content, cursor);
				if (stack.Count == 1 && TrimEcmaWhitespace(decoded).Length != 0) XmlError("text outside an element", cursor);
				cursor = next;
				continue;
			}

			if (Matches(input, cursor, "<!--"))
			{
				int end = input.IndexOf("-->", cursor + 4, StringComparison.Ordinal);
				if (end < 0 || input.AsSpan(cursor + 4, end - cursor - 4).Contains("--", StringComparison.Ordinal)) XmlError("malformed comment", cursor);
				cursor = end + 3;
				continue;
			}
			if (Matches(input, cursor, "<![CDATA["))
			{
				int end = input.IndexOf("]]>", cursor + 9, StringComparison.Ordinal);
				if (end < 0 || stack.Count == 1) XmlError("malformed CDATA section", cursor);
				cursor = end + 3;
				continue;
			}
			if (Matches(input, cursor, "<?"))
			{
				int end = input.IndexOf("?>", cursor + 2, StringComparison.Ordinal);
				if (end < 0) XmlError("unterminated processing instruction", cursor);
				cursor = end + 2;
				continue;
			}
			if (Matches(input, cursor, "<!")) XmlError("DTD and entity declarations are unsupported", cursor);
			if (Matches(input, cursor, "</"))
			{
				cursor += 2;
				string closingName = ReadXmlName(input, ref cursor);
				SkipXmlWhitespace(input, ref cursor);
				if (cursor >= input.Length || input[cursor] != '>' || stack.Count == 1 || stack.Peek().Name != closingName)
				{
					XmlError("mismatched closing element", cursor);
				}
				cursor++;
				stack.Pop().End = cursor;
				continue;
			}

			int start = cursor++;
			XmlNode element = new() { Name = ReadXmlName(input, ref cursor), Start = start };
			nodes++;
			if (nodes > 200_000 || stack.Count > 128) XmlError("XML structure is too large or deeply nested", cursor);
			bool selfClosing = false;
			while (true)
			{
				int before = cursor;
				SkipXmlWhitespace(input, ref cursor);
				if (Matches(input, cursor, "/>"))
				{
					cursor += 2;
					selfClosing = true;
					break;
				}
				if (cursor < input.Length && input[cursor] == '>')
				{
					cursor++;
					break;
				}
				if (cursor == before) XmlError("expected whitespace before an attribute", cursor);
				string key = ReadXmlName(input, ref cursor);
				if (element.Attributes.ContainsKey(key)) XmlError("duplicate attribute " + key, cursor);
				SkipXmlWhitespace(input, ref cursor);
				if (cursor >= input.Length || input[cursor] != '=') XmlError("expected attribute equals sign", cursor);
				cursor++;
				SkipXmlWhitespace(input, ref cursor);
				if (cursor >= input.Length || (input[cursor] != '\"' && input[cursor] != '\'')) XmlError("attribute values must be quoted", cursor);
				char quote = input[cursor++];
				int valueStart = cursor;
				int valueEnd = input.IndexOf(quote, cursor);
				if (valueEnd < 0 || input.AsSpan(cursor, valueEnd - cursor).Contains('<')) XmlError("malformed attribute value", cursor);
				string decoded = DecodeXml(input[valueStart..valueEnd], valueStart);
				element.Attributes.Add(key, new XmlAttributeValue(decoded, valueStart, valueEnd, quote));
				cursor = valueEnd + 1;
			}

			element.StartTagEnd = cursor;
			if (selfClosing) element.End = cursor;
			stack.Peek().Children.Add(element);
			if (!selfClosing) stack.Push(element);
		}

		if (stack.Count != 1) XmlError("unclosed element", cursor);
		return document;
	}

	private static bool Matches(string value, int start, string token) => start >= 0 && start <= value.Length - token.Length
		&& value.AsSpan(start, token.Length).SequenceEqual(token.AsSpan());

	private static void SkipXmlWhitespace(string value, ref int cursor)
	{
		while (cursor < value.Length && value[cursor] is '\t' or '\r' or '\n' or ' ') cursor++;
	}

	private static string ReadXmlName(string value, ref int cursor)
	{
		if (cursor >= value.Length || !IsXmlNameStart(value[cursor])) XmlError("expected an element or attribute name", cursor);
		int start = cursor++;
		while (cursor < value.Length && IsXmlNameCharacter(value[cursor])) cursor++;
		return value[start..cursor];
	}

	private static bool IsXmlNameStart(char value) => value is >= 'A' and <= 'Z' or >= 'a' and <= 'z' or '_' or ':';
	private static bool IsXmlNameCharacter(char value) => IsXmlNameStart(value) || value is >= '0' and <= '9' or '.' or '-';

	private static string DecodeXml(string value, int offset)
	{
		ValidateXmlCodePoints(value, offset);
		StringBuilder output = new(value.Length);
		int cursor = 0;
		while (cursor < value.Length)
		{
			int ampersand = value.IndexOf('&', cursor);
			if (ampersand < 0)
			{
				output.Append(value, cursor, value.Length - cursor);
				break;
			}
			output.Append(value, cursor, ampersand - cursor);
			int semicolon = value.IndexOf(';', ampersand + 1);
			if (semicolon < 0) XmlError("unknown or malformed entity reference", offset);
			string entity = value[(ampersand + 1)..semicolon];
			switch (entity)
			{
				case "amp": output.Append('&'); break;
				case "lt": output.Append('<'); break;
				case "gt": output.Append('>'); break;
				case "quot": output.Append('\"'); break;
				case "apos": output.Append('\''); break;
				default:
					if (!TryDecodeNumericEntity(entity, out string? decoded)) XmlError("unknown or malformed entity reference", offset);
					output.Append(decoded);
					break;
			}
			cursor = semicolon + 1;
		}
		return output.ToString();
	}

	private static bool TryDecodeNumericEntity(string entity, out string? decoded)
	{
		decoded = null;
		bool hexadecimal = entity.StartsWith("#x", StringComparison.Ordinal);
		if (!entity.StartsWith('#') || (hexadecimal ? entity.Length == 2 : entity.Length == 1)) return false;
		string digits = hexadecimal ? entity[2..] : entity[1..];
		NumberStyles styles = hexadecimal ? NumberStyles.AllowHexSpecifier : NumberStyles.None;
		if (!int.TryParse(digits, styles, CultureInfo.InvariantCulture, out int codePoint) || !IsValidXmlCodePoint(codePoint)) return false;
		decoded = char.ConvertFromUtf32(codePoint);
		return true;
	}

	private static void ValidateXmlCodePoints(string value, int offset)
	{
		for (int index = 0; index < value.Length; index++)
		{
			int codePoint;
			char current = value[index];
			if (char.IsHighSurrogate(current))
			{
				if (index + 1 >= value.Length || !char.IsLowSurrogate(value[index + 1])) XmlError("invalid XML character", offset);
				codePoint = char.ConvertToUtf32(current, value[++index]);
			}
			else if (char.IsLowSurrogate(current))
			{
				XmlError("invalid XML character", offset);
				return;
			}
			else
			{
				codePoint = current;
			}
			if (!IsValidXmlCodePoint(codePoint)) XmlError("invalid XML character", offset);
		}
	}

	private static bool IsValidXmlCodePoint(int value) => value is 9 or 10 or 13 || value is >= 32 and <= 0xd7ff
		|| value is >= 0xe000 and <= 0xfffd || value is >= 0x10000 and <= 0x10ffff;

	private static void XmlError(string message, int offset) => throw Fail("INVALID_XML", "Cannot read gamevariable.xml: " + message + " at character " + offset.ToString(CultureInfo.InvariantCulture) + ".");
}
