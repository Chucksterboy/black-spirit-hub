using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace BlackSpiritHub;

internal static class GarmothCouponProvider
{
	internal const string PageUrl = "https://garmoth.com/coupons/";
	internal const string SourceName = "Garmoth";
	internal const int MaximumPayloadCharacters = 2 * 1024 * 1024;
	internal const int MaximumCoupons = 500;
	internal const int MaximumRewardsPerCoupon = 50;
	private const int MaximumFlattenedValues = 50_000;
	private static readonly Regex SafeIconPath = new(
		@"^new_icon/[A-Za-z0-9_./-]+\.(?:webp|png|jpe?g)$",
		RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
		TimeSpan.FromSeconds(1));

	internal static GarmothCouponSnapshot ParseNuxtPayload(
		string payload,
		DateTimeOffset observedAt)
	{
		if (string.IsNullOrWhiteSpace(payload))
			throw new InvalidDataException("The Garmoth coupon page did not contain its data payload.");
		if (payload.Length > MaximumPayloadCharacters)
			throw new InvalidDataException("The Garmoth coupon payload exceeded the size limit.");

		using JsonDocument document = JsonDocument.Parse(payload, new JsonDocumentOptions
		{
			AllowTrailingCommas = false,
			CommentHandling = JsonCommentHandling.Disallow,
			MaxDepth = 64
		});
		JsonElement flat = document.RootElement;
		if (flat.ValueKind != JsonValueKind.Array
			|| flat.GetArrayLength() == 0
			|| flat.GetArrayLength() > MaximumFlattenedValues)
		{
			throw new InvalidDataException("The Garmoth coupon payload had an invalid root structure.");
		}

		int couponsReference = FindCouponsReference(flat);
		JsonElement couponReferences = ResolveReference(flat, couponsReference);
		if (couponReferences.ValueKind != JsonValueKind.Array
			|| couponReferences.GetArrayLength() == 0
			|| couponReferences.GetArrayLength() > MaximumCoupons)
		{
			throw new InvalidDataException("The Garmoth coupon list was empty or exceeded its limit.");
		}

		List<CouponEntry> coupons = new(couponReferences.GetArrayLength());
		HashSet<string> activeCodes = new(StringComparer.OrdinalIgnoreCase);
		Dictionary<string, GarmothInactiveCoupon> inactiveCoupons =
			new(StringComparer.OrdinalIgnoreCase);
		int structurallyValid = 0;
		int rejected = 0;
		foreach (JsonElement couponReference in couponReferences.EnumerateArray())
		{
			try
			{
				JsonElement coupon = ResolveReference(flat, ReadReference(couponReference));
				if (coupon.ValueKind != JsonValueKind.Object)
					throw new InvalidDataException("A Garmoth coupon entry was malformed.");

				string rawCode = ReadReferencedString(flat, coupon, "code", 64);
				string code = DisplayCode(rawCode);
				string canonicalCode = CouponService.CanonicalCouponCode(code);
				if (canonicalCode.Length == 0)
					throw new InvalidDataException("A Garmoth coupon code was empty.");

				DateTimeOffset? expiry = ReadOptionalReferencedDate(flat, coupon, "expire_at");
				structurallyValid++;
				if (IsExplicitConsolePrefix(rawCode))
				{
					continue;
				}
				if (expiry is { } knownExpiry && knownExpiry <= observedAt)
				{
					if (!activeCodes.Contains(canonicalCode))
						inactiveCoupons[canonicalCode] = new(canonicalCode, knownExpiry);
					continue;
				}
				if (!activeCodes.Add(canonicalCode))
				{
					rejected++;
					continue;
				}
				inactiveCoupons.Remove(canonicalCode);

				DateTimeOffset? created = TryReadReferencedDate(flat, coupon, "created_at");
				long? id = TryReadReferencedInt64(flat, coupon, "id", 1, long.MaxValue);
				List<CouponReward> rewards = ReadRewardsBestEffort(flat, coupon, id);

				coupons.Add(new CouponEntry(
					code,
					created,
					"Added on Garmoth",
					expiry,
					expiry.HasValue ? "Expiry supplied by Garmoth" : "No expiry listed",
					false,
					rewards,
					SourceName));
			}
			catch (InvalidDataException)
			{
				rejected++;
			}
		}
		if (structurallyValid == 0)
			throw new InvalidDataException("No valid Garmoth coupon entries could be read.");

		// The public page currently exposes a bounded recent/history window but no
		// authoritative total or end marker. Treat every read as additive so a
		// shorter future page can never erase previously saved observations.
		return new GarmothCouponSnapshot(
			coupons,
			inactiveCoupons.Values.ToList(),
			couponReferences.GetArrayLength(),
			false,
			rejected);
	}

	private static bool IsExplicitConsolePrefix(string code)
	{
		return Regex.IsMatch(
			code,
			@"^\s*\(\s*console\s*\)",
			RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
			TimeSpan.FromSeconds(1));
	}

	private static int FindCouponsReference(JsonElement flat)
	{
		int? found = null;
		foreach (JsonElement value in flat.EnumerateArray())
		{
			if (value.ValueKind != JsonValueKind.Object)
				continue;
			foreach (JsonProperty property in value.EnumerateObject())
			{
				if (!property.Name.StartsWith(
						"general.getCoupons-",
						StringComparison.Ordinal))
				{
					continue;
				}
				int reference;
				try
				{
					reference = ReadReference(property.Value);
				}
				catch (InvalidDataException)
				{
					continue;
				}
				if (!IsPlausibleCouponReferenceArray(flat, reference))
					continue;
				if (found.HasValue && found.Value != reference)
					throw new InvalidDataException("The Garmoth coupon payload contained conflicting lists.");
				found = reference;
			}
		}
		return found ?? throw new InvalidDataException(
			"The Garmoth coupon payload did not contain the expected public coupon query.");
	}

	private static bool IsPlausibleCouponReferenceArray(
		JsonElement flat,
		int reference)
	{
		if (reference < 0 || reference >= flat.GetArrayLength())
			return false;
		JsonElement candidates = flat[reference];
		if (candidates.ValueKind != JsonValueKind.Array
			|| candidates.GetArrayLength() == 0
			|| candidates.GetArrayLength() > MaximumCoupons)
		{
			return false;
		}
		int plausibleEntries = 0;
		foreach (JsonElement candidateReference in candidates.EnumerateArray())
		{
			if (candidateReference.ValueKind != JsonValueKind.Number
				|| !candidateReference.TryGetInt32(out int candidateIndex)
				|| candidateIndex < 0
				|| candidateIndex >= flat.GetArrayLength())
			{
				continue;
			}
			JsonElement candidate = flat[candidateIndex];
			if (candidate.ValueKind == JsonValueKind.Object
				&& candidate.TryGetProperty("code", out _)
				&& candidate.TryGetProperty("expire_at", out _))
			{
				plausibleEntries++;
			}
		}
		return plausibleEntries > 0;
	}

	private static List<CouponReward> ReadRewardsBestEffort(
		JsonElement flat,
		JsonElement coupon,
		long? couponId)
	{
		if (!couponId.HasValue
			|| !coupon.TryGetProperty("items", out JsonElement itemsReference))
		{
			return PlaceholderRewards();
		}

		JsonElement itemReferences;
		try
		{
			itemReferences = ResolveReference(flat, ReadReference(itemsReference));
		}
		catch (InvalidDataException)
		{
			return PlaceholderRewards();
		}
		if (itemReferences.ValueKind != JsonValueKind.Array
			|| itemReferences.GetArrayLength() == 0
			|| itemReferences.GetArrayLength() > MaximumRewardsPerCoupon)
			return PlaceholderRewards();

		List<CouponReward> rewards = new(itemReferences.GetArrayLength());
		foreach (JsonElement itemReference in itemReferences.EnumerateArray())
		{
			try
			{
				JsonElement item = ResolveReference(flat, ReadReference(itemReference));
				if (item.ValueKind != JsonValueKind.Object)
					throw new InvalidDataException("A Garmoth coupon reward was malformed.");
				long itemCouponId = ReadReferencedInt64(flat, item, "coupon_id", 1, long.MaxValue);
				if (itemCouponId != couponId.Value)
					throw new InvalidDataException("A Garmoth reward referenced the wrong coupon.");
				long mainKey = ReadReferencedInt64(flat, item, "main_key", 1, long.MaxValue);
				long amount = ReadReferencedInt64(flat, item, "amount", 1, int.MaxValue);
				string name = ReadReferencedString(flat, item, "name", 256).Trim();
				if (name.Length == 0)
					throw new InvalidDataException("A Garmoth reward name was empty.");
				string iconPath = ReadOptionalReferencedString(flat, item, "img", 512) ?? string.Empty;
				(string iconUrl, string iconFileName) = BuildIcon(iconPath, mainKey);
				rewards.Add(new CouponReward(
					name,
					checked((int)amount),
					iconUrl,
					iconFileName)
				{
					IconSource = SourceName,
					IconSourceUrl = PageUrl
				});
			}
			catch (InvalidDataException)
			{
				// One changed reward must not hide an otherwise valid active code.
			}
		}
		return rewards.Count > 0 ? rewards : PlaceholderRewards();
	}

	private static List<CouponReward> PlaceholderRewards() =>
	[
		new CouponReward(
			"Reward details available on Garmoth",
			1,
			string.Empty,
			string.Empty)
	];

	private static (string Url, string FileName) BuildIcon(string path, long mainKey)
	{
		string normalized = path.Replace('\\', '/').TrimStart('/');
		if (normalized.Length == 0
			|| normalized.Contains("..", StringComparison.Ordinal)
			|| normalized.Contains('?', StringComparison.Ordinal)
			|| normalized.Contains('#', StringComparison.Ordinal)
			|| !SafeIconPath.IsMatch(normalized))
		{
			return (string.Empty, string.Empty);
		}
		string extension = Path.GetExtension(normalized).ToLowerInvariant();
		return (
			"https://assets.garmoth.com/img/" + normalized,
			$"garmoth-{mainKey.ToString(CultureInfo.InvariantCulture)}{extension}");
	}

	private static string DisplayCode(string value)
	{
		return new string(
			value.Normalize()
				.Where(character => !char.IsWhiteSpace(character))
				.Select(char.ToUpperInvariant)
				.ToArray());
	}

	private static DateTimeOffset ReadReferencedDate(
		JsonElement flat,
		JsonElement owner,
		string propertyName)
	{
		string value = ReadReferencedString(flat, owner, propertyName, 64);
		if (!DateTimeOffset.TryParse(
				value,
				CultureInfo.InvariantCulture,
				DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
				out DateTimeOffset parsed))
		{
			throw new InvalidDataException($"Garmoth coupon field '{propertyName}' was not a valid date.");
		}
		return parsed;
	}

	private static DateTimeOffset? TryReadReferencedDate(
		JsonElement flat,
		JsonElement owner,
		string propertyName)
	{
		try
		{
			return ReadReferencedDate(flat, owner, propertyName);
		}
		catch (InvalidDataException)
		{
			return null;
		}
	}

	private static DateTimeOffset? ReadOptionalReferencedDate(
		JsonElement flat,
		JsonElement owner,
		string propertyName)
	{
		string? value = ReadOptionalReferencedString(flat, owner, propertyName, 64);
		if (value is null)
			return null;
		if (!DateTimeOffset.TryParse(
				value,
				CultureInfo.InvariantCulture,
				DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
				out DateTimeOffset parsed))
		{
			throw new InvalidDataException($"Garmoth coupon field '{propertyName}' was not a valid date.");
		}
		return parsed;
	}

	private static long ReadReferencedInt64(
		JsonElement flat,
		JsonElement owner,
		string propertyName,
		long minimum,
		long maximum)
	{
		JsonElement value = ResolveProperty(flat, owner, propertyName);
		if (value.ValueKind != JsonValueKind.Number
			|| !value.TryGetInt64(out long parsed)
			|| parsed < minimum
			|| parsed > maximum)
		{
			throw new InvalidDataException($"Garmoth coupon field '{propertyName}' was invalid.");
		}
		return parsed;
	}

	private static long? TryReadReferencedInt64(
		JsonElement flat,
		JsonElement owner,
		string propertyName,
		long minimum,
		long maximum)
	{
		try
		{
			return ReadReferencedInt64(flat, owner, propertyName, minimum, maximum);
		}
		catch (InvalidDataException)
		{
			return null;
		}
	}

	private static string ReadReferencedString(
		JsonElement flat,
		JsonElement owner,
		string propertyName,
		int maximumLength)
	{
		string? value = ReadOptionalReferencedString(flat, owner, propertyName, maximumLength);
		return value ?? throw new InvalidDataException(
			$"Garmoth coupon field '{propertyName}' was missing.");
	}

	private static string? ReadOptionalReferencedString(
		JsonElement flat,
		JsonElement owner,
		string propertyName,
		int maximumLength)
	{
		JsonElement value = ResolveProperty(flat, owner, propertyName);
		if (value.ValueKind == JsonValueKind.Null)
			return null;
		if (value.ValueKind != JsonValueKind.String)
			throw new InvalidDataException($"Garmoth coupon field '{propertyName}' was not text.");
		string result = value.GetString() ?? string.Empty;
		if (result.Length > maximumLength)
			throw new InvalidDataException($"Garmoth coupon field '{propertyName}' exceeded its limit.");
		return result;
	}

	private static JsonElement ResolveProperty(
		JsonElement flat,
		JsonElement owner,
		string propertyName)
	{
		if (!owner.TryGetProperty(propertyName, out JsonElement reference))
			throw new InvalidDataException($"Garmoth coupon field '{propertyName}' was missing.");
		return ResolveReference(flat, ReadReference(reference));
	}

	private static int ReadReference(JsonElement value)
	{
		if (value.ValueKind != JsonValueKind.Number || !value.TryGetInt32(out int reference))
			throw new InvalidDataException("The Garmoth coupon payload contained an invalid reference.");
		return reference;
	}

	private static JsonElement ResolveReference(JsonElement flat, int reference)
	{
		if (reference < 0 || reference >= flat.GetArrayLength())
			throw new InvalidDataException("The Garmoth coupon payload contained an out-of-range reference.");
		return flat[reference];
	}
}

internal sealed record GarmothCouponSnapshot(
	List<CouponEntry> Coupons,
	List<GarmothInactiveCoupon> InactiveCoupons,
	int SourceEntryCount,
	bool IsComplete,
	int RejectedEntryCount);
internal sealed record GarmothInactiveCoupon(
	string CanonicalCode,
	DateTimeOffset ExpiryUtc);
