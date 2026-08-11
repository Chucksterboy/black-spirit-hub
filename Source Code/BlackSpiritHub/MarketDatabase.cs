using System;
using System.Collections.Generic;
using System.Data.Common;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace BlackSpiritHub;

internal sealed class MarketDatabase
{
	private const int CurrentSchemaVersion = 2;
	internal static readonly TimeSpan OutfitSampleRetention = TimeSpan.FromDays(14);
	private static readonly TimeSpan OutfitReportHistory = OutfitSampleRetention;
	private static readonly TimeSpan OutfitSampleFreshness = TimeSpan.FromHours(12);
	private static readonly TimeSpan OutfitClockSkewTolerance = TimeSpan.FromMinutes(5);
	private static readonly TimeSpan OutfitBulkSchedulingTolerance = TimeSpan.FromMinutes(5);
	private const int OutfitRecommendationMinimumSamples = 12;
	private const long OutfitRecommendationActive24HourSales = 10;
	private const long OutfitRecommendationActive3DaySales = 20;
	private const long OutfitRecommendationActive7DaySales = 40;
	private const int OutfitRecommendationMinimumActiveWindows = 2;
	private const double OutfitRecommendationMinimumConfidence = 0.6;
	private static readonly TimeSpan OutfitRecommendationMaximumDetailAge = TimeSpan.FromDays(7);
	private const int IncrementalVacuumPageLimit = 1024;
	private const int MaintenanceBusyTimeoutMilliseconds = 5000;
	private const long VacuumFreeSpaceReserveBytes = 32L * 1024L * 1024L;

	private readonly string connectionString;

	public MarketDatabase(string path)
	{
		DatabasePath = path;
		connectionString = new SqliteConnectionStringBuilder
		{
			DataSource = path,
			Mode = SqliteOpenMode.ReadWriteCreate,
			Cache = SqliteCacheMode.Shared
		}.ToString();
	}

	private string DatabasePath { get; }

	public async Task InitializeAsync(CancellationToken cancellationToken)
	{
		bool isNewDatabase = !File.Exists(DatabasePath) || new FileInfo(DatabasePath).Length == 0;
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		int schemaVersion = await GetSchemaVersionAsync(connection, cancellationToken);
		if (schemaVersion < CurrentSchemaVersion)
		{
			await BackupBeforeMigrationAsync(connection, schemaVersion, cancellationToken);
		}
		if (isNewDatabase)
		{
			await using SqliteCommand autoVacuum = connection.CreateCommand();
			autoVacuum.CommandText = "PRAGMA auto_vacuum=INCREMENTAL;";
			await autoVacuum.ExecuteNonQueryAsync(cancellationToken);
		}
		string commandText = "PRAGMA journal_mode=WAL;\nPRAGMA foreign_keys=ON;\nCREATE TABLE IF NOT EXISTS settings (\n    key TEXT PRIMARY KEY,\n    value TEXT NOT NULL\n);\nCREATE TABLE IF NOT EXISTS tracked_items (\n    item_id INTEGER NOT NULL,\n    enhancement INTEGER NOT NULL,\n    region TEXT NOT NULL,\n    name TEXT NOT NULL,\n    grade INTEGER NOT NULL,\n    main_category INTEGER NOT NULL DEFAULT 0,\n    sub_category INTEGER NOT NULL DEFAULT 0,\n    created_utc TEXT NOT NULL,\n    last_price INTEGER,\n    last_stock INTEGER,\n    last_trade_count INTEGER,\n    last_updated_utc TEXT,\n    PRIMARY KEY (item_id, enhancement, region)\n);\nCREATE TABLE IF NOT EXISTS snapshots (\n    snapshot_id INTEGER PRIMARY KEY AUTOINCREMENT,\n    item_id INTEGER NOT NULL,\n    enhancement INTEGER NOT NULL,\n    region TEXT NOT NULL,\n    captured_utc TEXT NOT NULL,\n    price INTEGER NOT NULL,\n    stock INTEGER,\n    trade_count INTEGER,\n    order_book_min INTEGER,\n    order_book_max INTEGER,\n    order_book_average REAL,\n    source TEXT NOT NULL,\n    UNIQUE(item_id, enhancement, region, captured_utc, source)\n);\nCREATE INDEX IF NOT EXISTS ix_snapshots_item_time\n    ON snapshots(item_id, enhancement, region, captured_utc);\nCREATE INDEX IF NOT EXISTS ix_snapshots_region_item_time\n    ON snapshots(region, item_id, enhancement, captured_utc DESC);\nCREATE TABLE IF NOT EXISTS outfit_catalog (\n    item_id INTEGER NOT NULL,\n    region TEXT NOT NULL,\n    name TEXT NOT NULL,\n    grade INTEGER NOT NULL,\n    sub_category INTEGER NOT NULL,\n    price INTEGER NOT NULL,\n    stock INTEGER NOT NULL,\n    last_catalog_sync_utc TEXT NOT NULL,\n    last_detailed_utc TEXT,\n    PRIMARY KEY(item_id, region)\n);\nCREATE TABLE IF NOT EXISTS outfit_snapshots (\n    snapshot_id INTEGER PRIMARY KEY AUTOINCREMENT,\n    item_id INTEGER NOT NULL,\n    region TEXT NOT NULL,\n    captured_utc TEXT NOT NULL,\n    price INTEGER NOT NULL,\n    stock INTEGER NOT NULL,\n    trade_count INTEGER,\n    preorder_count INTEGER,\n    source TEXT NOT NULL\n);\nCREATE INDEX IF NOT EXISTS ix_outfit_snapshots_item_time\n    ON outfit_snapshots(item_id, region, captured_utc);\nCREATE INDEX IF NOT EXISTS ix_outfit_snapshots_region_item_time\n    ON outfit_snapshots(region, item_id, captured_utc DESC);";
		commandText = commandText.Replace(
			"CREATE INDEX IF NOT EXISTS ix_outfit_snapshots_item_time\\n    ON outfit_snapshots(item_id, region, captured_utc);\\n",
			string.Empty,
			StringComparison.Ordinal)
			+ "\nDROP INDEX IF EXISTS ix_outfit_snapshots_item_time;";
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = commandText;
		await command.ExecuteNonQueryAsync(cancellationToken);
		await using SqliteCommand versionCommand = connection.CreateCommand();
		versionCommand.CommandText = $"PRAGMA user_version={CurrentSchemaVersion};";
		await versionCommand.ExecuteNonQueryAsync(cancellationToken);
	}

	private static async Task<int> GetSchemaVersionAsync(SqliteConnection connection, CancellationToken cancellationToken)
	{
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = "PRAGMA user_version;";
		object? value = await command.ExecuteScalarAsync(cancellationToken);
		return value == null || value == DBNull.Value ? 0 : Convert.ToInt32(value);
	}

	private async Task BackupBeforeMigrationAsync(SqliteConnection source, int schemaVersion, CancellationToken cancellationToken)
	{
		if (!File.Exists(DatabasePath) || new FileInfo(DatabasePath).Length == 0)
		{
			return;
		}

		string backupPath = DatabasePath + $".pre-v{CurrentSchemaVersion}-from-v{schemaVersion}.bak";
		if (File.Exists(backupPath))
		{
			return;
		}

		await using SqliteConnection destination = new(new SqliteConnectionStringBuilder
		{
			DataSource = backupPath,
			Mode = SqliteOpenMode.ReadWriteCreate
		}.ToString());
		await destination.OpenAsync(cancellationToken);
		source.BackupDatabase(destination);
	}

	public async Task<MarketSettings> GetSettingsAsync(CancellationToken cancellationToken)
	{
		Dictionary<string, string> values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
		MarketSettings result2;
		await using (SqliteConnection connection = await OpenAsync(cancellationToken))
		{
			MarketSettings marketSettings2;
			await using (SqliteCommand command = connection.CreateCommand())
			{
				command.CommandText = "SELECT key, value FROM settings;";
				MarketSettings marketSettings;
				await using (SqliteDataReader reader = await command.ExecuteReaderAsync(cancellationToken))
				{
					while (await reader.ReadAsync(cancellationToken))
					{
						values[reader.GetString(0)] = reader.GetString(1);
					}
					string value;
					string region = values.TryGetValue("region", out value) ? NormalizeRegion(value) : MarketSettings.Default.Region;
					string value2;
					int result;
					int intervalMinutes = ((values.TryGetValue("intervalMinutes", out value2) && int.TryParse(value2, out result)) ? Math.Clamp(result, 5, 1440) : MarketSettings.Default.IntervalMinutes);
					marketSettings = new MarketSettings(region, intervalMinutes);
				}
				marketSettings2 = marketSettings;
			}
			result2 = marketSettings2;
		}
		return result2;
	}

	public async Task SaveSettingsAsync(MarketSettings settings, CancellationToken cancellationToken)
	{
		settings = settings with { Region = NormalizeRegion(settings.Region) };
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using DbTransaction transaction = await connection.BeginTransactionAsync(cancellationToken);
		KeyValuePair<string, string>[] array = new KeyValuePair<string, string>[2]
		{
			new KeyValuePair<string, string>("region", settings.Region),
			new KeyValuePair<string, string>("intervalMinutes", settings.IntervalMinutes.ToString())
		};
		for (int i = 0; i < array.Length; i++)
		{
			KeyValuePair<string, string> keyValuePair = array[i];
			await using SqliteCommand command = connection.CreateCommand();
			command.Transaction = (SqliteTransaction)transaction;
			command.CommandText = "INSERT INTO settings(key,value) VALUES($key,$value) ON CONFLICT(key) DO UPDATE SET value=excluded.value;";
			command.Parameters.AddWithValue("$key", keyValuePair.Key);
			command.Parameters.AddWithValue("$value", keyValuePair.Value);
			await command.ExecuteNonQueryAsync(cancellationToken);
		}
		await transaction.CommitAsync(cancellationToken);
	}

	public async Task AddTrackedItemAsync(MarketItem item, string region, CancellationToken cancellationToken)
	{
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = "INSERT INTO tracked_items(\n    item_id, enhancement, region, name, grade, main_category, sub_category,\n    created_utc, last_price, last_stock, last_trade_count, last_updated_utc)\nVALUES($id,$enhancement,$region,$name,$grade,$main,$sub,$created,$price,$stock,$trades,$updated)\nON CONFLICT(item_id,enhancement,region) DO UPDATE SET\n    name=excluded.name, grade=excluded.grade,\n    main_category=excluded.main_category, sub_category=excluded.sub_category;";
		command.Parameters.AddWithValue("$id", item.ItemId);
		command.Parameters.AddWithValue("$enhancement", item.Enhancement);
		command.Parameters.AddWithValue("$region", region);
		command.Parameters.AddWithValue("$name", item.Name);
		command.Parameters.AddWithValue("$grade", item.Grade);
		command.Parameters.AddWithValue("$main", item.MainCategory);
		command.Parameters.AddWithValue("$sub", item.SubCategory);
		command.Parameters.AddWithValue("$created", DateTimeOffset.UtcNow.ToString("O"));
		command.Parameters.AddWithValue("$price", item.CurrentPrice);
		command.Parameters.AddWithValue("$stock", item.Stock);
		command.Parameters.AddWithValue("$trades", item.TradeCount);
		command.Parameters.AddWithValue("$updated", DateTimeOffset.UtcNow.ToString("O"));
		await command.ExecuteNonQueryAsync(cancellationToken);
	}

	public async Task RemoveTrackedItemAsync(long itemId, int enhancement, string region, CancellationToken cancellationToken)
	{
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = "DELETE FROM tracked_items WHERE item_id=$id AND enhancement=$enhancement AND region=$region;";
		command.Parameters.AddWithValue("$id", itemId);
		command.Parameters.AddWithValue("$enhancement", enhancement);
		command.Parameters.AddWithValue("$region", region);
		await command.ExecuteNonQueryAsync(cancellationToken);
	}

	public async Task<IReadOnlyList<TrackedItem>> GetTrackedItemsAsync(string region, CancellationToken cancellationToken)
	{
		List<TrackedItem> items = new List<TrackedItem>();
		IReadOnlyList<TrackedItem> result;
		await using (SqliteConnection connection = await OpenAsync(cancellationToken))
		{
			IReadOnlyList<TrackedItem> readOnlyList2;
			await using (SqliteCommand command = connection.CreateCommand())
			{
				command.CommandText = "SELECT item_id, enhancement, region, name, grade, main_category, sub_category,\n       last_price, last_stock, last_trade_count, last_updated_utc\nFROM tracked_items WHERE region=$region ORDER BY name, enhancement;";
				command.Parameters.AddWithValue("$region", region);
				IReadOnlyList<TrackedItem> readOnlyList;
				await using (SqliteDataReader reader = await command.ExecuteReaderAsync(cancellationToken))
				{
					while (await reader.ReadAsync(cancellationToken))
					{
						items.Add(new TrackedItem(reader.GetInt64(0), reader.GetInt32(1), reader.GetString(2), reader.GetString(3), reader.GetInt32(4), reader.GetInt32(5), reader.GetInt32(6), reader.IsDBNull(7) ? ((long?)null) : new long?(reader.GetInt64(7)), reader.IsDBNull(8) ? ((long?)null) : new long?(reader.GetInt64(8)), reader.IsDBNull(9) ? ((long?)null) : new long?(reader.GetInt64(9)), reader.IsDBNull(10) ? ((DateTimeOffset?)null) : new DateTimeOffset?(DateTimeOffset.Parse(reader.GetString(10)))));
					}
					readOnlyList = items;
				}
				readOnlyList2 = readOnlyList;
			}
			result = readOnlyList2;
		}
		return result;
	}

	public async Task<DateTimeOffset?> GetLatestMarketSampleUtcAsync(string region, CancellationToken cancellationToken)
	{
		DateTimeOffset? latest = null;
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = @"
SELECT MAX(captured_utc) FROM (
    SELECT captured_utc FROM snapshots WHERE region=$region AND source='local-snapshot'
    UNION ALL
    SELECT captured_utc FROM outfit_snapshots WHERE region=$region
);";
		command.Parameters.AddWithValue("$region", NormalizeRegion(region));
		object? value = await command.ExecuteScalarAsync(cancellationToken);
		if (value != null && value != DBNull.Value)
		{
			string text = Convert.ToString(value) ?? string.Empty;
			if (DateTimeOffset.TryParse(text, out DateTimeOffset parsed))
			{
				latest = parsed;
			}
		}
		return latest;
	}

	public async Task<bool> IsMarketRefreshDueAsync(string region, TimeSpan maximumAge, CancellationToken cancellationToken)
	{
		return await IsTrackedItemRefreshDueAsync(region, maximumAge, cancellationToken)
			|| await IsOutfitBulkRefreshDueAsync(region, maximumAge, cancellationToken);
	}

	public async Task<bool> IsTrackedItemRefreshDueAsync(string region, TimeSpan maximumAge, CancellationToken cancellationToken)
	{
		DateTimeOffset cutoff = DateTimeOffset.UtcNow.Subtract(maximumAge);
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = @"
SELECT EXISTS (
    SELECT 1
    FROM tracked_items
    WHERE region=$region
      AND (last_updated_utc IS NULL OR last_updated_utc <= $cutoff)
);";
		command.Parameters.AddWithValue("$region", NormalizeRegion(region));
		command.Parameters.AddWithValue("$cutoff", cutoff.ToString("O"));
		object? value = await command.ExecuteScalarAsync(cancellationToken);
		return Convert.ToInt32(value ?? 1) != 0;
	}

	public async Task<bool> IsOutfitBulkRefreshDueAsync(string region, TimeSpan maximumAge, CancellationToken cancellationToken)
	{
		return await IsOutfitBulkRefreshDueAsync(region, maximumAge, DateTimeOffset.UtcNow, cancellationToken);
	}

	internal async Task<bool> IsOutfitBulkRefreshDueAsync(
		string region,
		TimeSpan maximumAge,
		DateTimeOffset nowUtc,
		CancellationToken cancellationToken)
	{
		DateTimeOffset cutoff = GetOutfitBulkDueCutoff(nowUtc, maximumAge);
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = @"
SELECT
    (SELECT COUNT(*) FROM outfit_catalog WHERE region=$region) AS catalog_count,
    (
        SELECT COUNT(DISTINCT samples.item_id)
        FROM outfit_snapshots samples
        JOIN outfit_catalog catalog
          ON catalog.item_id=samples.item_id
         AND catalog.region=samples.region
        WHERE samples.region=$region
          AND samples.source='bulk-sales'
          AND samples.captured_utc > $cutoff
    ) AS recent_count;";
		command.Parameters.AddWithValue("$region", NormalizeRegion(region));
		command.Parameters.AddWithValue("$cutoff", cutoff.ToString("O"));
		await using SqliteDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
		if (!await reader.ReadAsync(cancellationToken))
		{
			return true;
		}

		int catalogCount = reader.GetInt32(0);
		int recentCount = reader.GetInt32(1);
		if (catalogCount == 0)
		{
			return true;
		}

		return recentCount < catalogCount;
	}

	public async Task<bool> IsOutfitDetailRefreshDueAsync(string region, TimeSpan maximumAge, CancellationToken cancellationToken)
	{
		DateTimeOffset cutoff = DateTimeOffset.UtcNow.Subtract(maximumAge);
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = "SELECT MAX(last_catalog_sync_utc) FROM outfit_catalog WHERE region=$region;";
		command.Parameters.AddWithValue("$region", NormalizeRegion(region));
		object? value = await command.ExecuteScalarAsync(cancellationToken);
		if (value == null || value == DBNull.Value)
		{
			return true;
		}
		return !DateTimeOffset.TryParse(Convert.ToString(value), out DateTimeOffset latest)
			|| latest <= cutoff;
	}

	public async Task SaveSnapshotAsync(TrackedItem item, MarketItem variant, MarketSnapshot snapshot, CancellationToken cancellationToken)
	{
		DateTimeOffset now = DateTimeOffset.UtcNow;
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using DbTransaction transaction = await connection.BeginTransactionAsync(cancellationToken);
		foreach (ProviderHistoryPoint item2 in snapshot.History)
		{
			await InsertSnapshotAsync(connection, (SqliteTransaction)transaction, item, item2.Timestamp, item2.Price, null, null, item2.Price, item2.Price, item2.Price, "provider-history", cancellationToken);
		}
		await InsertSnapshotAsync(connection, (SqliteTransaction)transaction, item, now, snapshot.Price, snapshot.Stock, variant.TradeCount, snapshot.OrderBookMin, snapshot.OrderBookMax, snapshot.OrderBookAverage, "local-snapshot", cancellationToken);
		await using SqliteCommand update = connection.CreateCommand();
		update.Transaction = (SqliteTransaction)transaction;
		update.CommandText = "UPDATE tracked_items SET\n    name=$name, grade=$grade, last_price=$price, last_stock=$stock,\n    last_trade_count=$trades, last_updated_utc=$updated\nWHERE item_id=$id AND enhancement=$enhancement AND region=$region;";
		update.Parameters.AddWithValue("$name", variant.Name);
		update.Parameters.AddWithValue("$grade", variant.Grade);
		update.Parameters.AddWithValue("$price", snapshot.Price);
		update.Parameters.AddWithValue("$stock", snapshot.Stock);
		update.Parameters.AddWithValue("$trades", variant.TradeCount);
		update.Parameters.AddWithValue("$updated", now.ToString("O"));
		update.Parameters.AddWithValue("$id", item.ItemId);
		update.Parameters.AddWithValue("$enhancement", item.Enhancement);
		update.Parameters.AddWithValue("$region", item.Region);
		await update.ExecuteNonQueryAsync(cancellationToken);
		await transaction.CommitAsync(cancellationToken);
	}

	public async Task<ItemAnalytics?> GetAnalyticsAsync(long itemId, int enhancement, string region, int days, CancellationToken cancellationToken)
	{
		TrackedItem item = (await GetTrackedItemsAsync(region, cancellationToken)).FirstOrDefault((TrackedItem x) => x.ItemId == itemId && x.Enhancement == enhancement);
		if ((object)item == null)
		{
			return null;
		}
		DateTimeOffset since = DateTimeOffset.UtcNow.AddDays(-Math.Clamp(days, 1, 90));
		List<PricePoint> points = new List<PricePoint>();
		ItemAnalytics result;
		await using (SqliteConnection connection = await OpenAsync(cancellationToken))
		{
			await using (SqliteCommand command = connection.CreateCommand())
			{
				command.CommandText = "SELECT captured_utc, price, stock, trade_count\nFROM snapshots\nWHERE item_id=$id AND enhancement=$enhancement AND region=$region\n  AND captured_utc >= $since\nORDER BY captured_utc;";
				command.Parameters.AddWithValue("$id", itemId);
				command.Parameters.AddWithValue("$enhancement", enhancement);
				command.Parameters.AddWithValue("$region", region);
				command.Parameters.AddWithValue("$since", since.ToString("O"));
				await using SqliteDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
				while (await reader.ReadAsync(cancellationToken))
				{
					points.Add(new PricePoint(DateTimeOffset.Parse(reader.GetString(0)), reader.GetInt64(1), reader.IsDBNull(2) ? ((long?)null) : new long?(reader.GetInt64(2)), reader.IsDBNull(3) ? ((long?)null) : new long?(reader.GetInt64(3))));
				}
			}
			long[] prices = points.Select((PricePoint x) => x.Price).ToArray();
			long current = item.LastPrice ?? prices.LastOrDefault();
			double? trend = ((prices.Length > 1 && prices[0] != 0L) ? new double?((double)(current - prices[0]) * 100.0 / (double)prices[0]) : ((double?)null));
			List<SalesWindow> sales = new List<SalesWindow>();
			(string, TimeSpan)[] array = new(string, TimeSpan)[4]
			{
				("24 hours", TimeSpan.FromHours(24.0)),
				("3 days", TimeSpan.FromDays(3.0)),
				("7 days", TimeSpan.FromDays(7.0)),
				("30 days", TimeSpan.FromDays(30.0))
			};
			for (int num = 0; num < array.Length; num++)
			{
				(string, TimeSpan) tuple = array[num];
				List<SalesWindow> list = sales;
				list.Add(await GetSalesWindowAsync(connection, itemId, enhancement, region, tuple.Item1, tuple.Item2, cancellationToken));
			}
			result = new ItemAnalytics(item, (current == 0L) ? ((long?)null) : new long?(current), (prices.Length == 0) ? ((long?)null) : new long?(prices.Min()), (prices.Length == 0) ? ((long?)null) : new long?(prices.Max()), (prices.Length == 0) ? ((double?)null) : new double?(((IEnumerable<long>)prices).Average((Func<long, double>)((long x) => x))), trend, sales, points);
		}
		return result;
	}

	public async Task ExportCsvAsync(string region, string path, CancellationToken cancellationToken)
	{
		await using StreamWriter writer = new StreamWriter(path, append: false, new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
		await writer.WriteLineAsync("dataset,item_id,enhancement,region,name,captured_utc,price,stock,cumulative_sales,preorders,order_book_min,order_book_max,order_book_average,source");
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = "SELECT 'tracked_item',s.item_id,s.enhancement,s.region,t.name,s.captured_utc,s.price,s.stock,\n       s.trade_count,NULL,s.order_book_min,s.order_book_max,s.order_book_average,s.source\nFROM snapshots s\nJOIN tracked_items t ON t.item_id=s.item_id AND t.enhancement=s.enhancement AND t.region=s.region\nWHERE s.region=$region\nUNION ALL\nSELECT 'outfit',s.item_id,0,s.region,c.name,s.captured_utc,s.price,s.stock,\n       s.trade_count,s.preorder_count,NULL,NULL,NULL,s.source\nFROM outfit_snapshots s\nJOIN outfit_catalog c ON c.item_id=s.item_id AND c.region=s.region\nWHERE s.region=$region\nORDER BY 5,2,3,6;";
		command.Parameters.AddWithValue("$region", region);
		SqliteDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
		try
		{
			while (await reader.ReadAsync(cancellationToken))
			{
				IEnumerable<string> values = from i in Enumerable.Range(0, reader.FieldCount)
					select (!reader.IsDBNull(i)) ? EscapeCsv(Convert.ToString(reader.GetValue(i)) ?? "") : "";
				await writer.WriteLineAsync(string.Join(",", values));
			}
		}
		finally
		{
			if (reader != null)
			{
				await reader.DisposeAsync();
			}
		}
	}

	public async Task<int> PruneOldMarketSamplesAsync(TimeSpan retention, CancellationToken cancellationToken)
	{
		return await PruneOldMarketSamplesAsync(retention, DateTimeOffset.UtcNow, cancellationToken);
	}

	internal async Task<int> PruneOldMarketSamplesAsync(
		TimeSpan retention,
		DateTimeOffset nowUtc,
		CancellationToken cancellationToken)
	{
		if (retention <= TimeSpan.Zero)
		{
			throw new ArgumentOutOfRangeException(nameof(retention));
		}

		await using SqliteConnection connection = await OpenMaintenanceAsync(cancellationToken);
		return await PruneOldMarketSamplesAsync(connection, retention, nowUtc, cancellationToken);
	}

	public Task<MarketStorageMaintenanceResult> MaintainStorageAsync(
		TimeSpan trackedSampleRetention,
		CancellationToken cancellationToken)
	{
		return MaintainStorageAsync(trackedSampleRetention, DateTimeOffset.UtcNow, cancellationToken);
	}

	internal async Task<MarketStorageMaintenanceResult> MaintainStorageAsync(
		TimeSpan trackedSampleRetention,
		DateTimeOffset nowUtc,
		CancellationToken cancellationToken)
	{
		if (trackedSampleRetention <= TimeSpan.Zero)
		{
			throw new ArgumentOutOfRangeException(nameof(trackedSampleRetention));
		}

		long databaseBytesBefore = GetDatabaseFileLength();
		long storageBytesBefore = GetDatabaseStorageLength();
		int removed;
		try
		{
			await using SqliteConnection pruneConnection = await OpenMaintenanceAsync(cancellationToken);
			removed = await PruneOldMarketSamplesAsync(
				pruneConnection,
				trackedSampleRetention,
				nowUtc,
				cancellationToken);
		}
		catch (Exception exception) when (IsDeferrableMaintenanceFailure(exception))
		{
			return new MarketStorageMaintenanceResult(
				0,
				storageBytesBefore,
				GetDatabaseStorageLength(),
				FullVacuumCompleted: false,
				IncrementalVacuumCompleted: false,
				WalCheckpointDeferred: false,
				DeferredReason: GetMaintenanceFailureReason(exception));
		}

		bool fullVacuumCompleted = false;
		bool incrementalVacuumCompleted = false;
		bool checkpointDeferred = false;
		string? deferredReason = null;
		try
		{
			await using SqliteConnection maintenanceConnection = await OpenMaintenanceAsync(cancellationToken);
			int autoVacuumMode = await GetPragmaIntAsync(maintenanceConnection, "auto_vacuum", cancellationToken);
			if (autoVacuumMode == 0)
			{
				string integrity = await GetPragmaTextAsync(maintenanceConnection, "quick_check", cancellationToken);
				if (!string.Equals(integrity, "ok", StringComparison.OrdinalIgnoreCase))
				{
					deferredReason = "SQLite integrity check did not pass; compaction was skipped.";
				}
				else
				{
					long walBytes = GetFileLengthIfPresent(DatabasePath + "-wal");
					long availableBytes = GetAvailableFreeSpace(DatabasePath);
					if (!HasSufficientVacuumSpace(databaseBytesBefore, walBytes, availableBytes))
					{
						deferredReason = "Not enough temporary disk space is available for safe SQLite compaction.";
					}
					else
					{
						await ExecutePragmaAsync(maintenanceConnection, "auto_vacuum=INCREMENTAL", cancellationToken);
						await ExecutePragmaAsync(maintenanceConnection, "VACUUM", cancellationToken);
						fullVacuumCompleted = true;
					}
				}
			}
			else
			{
				if (autoVacuumMode == 1)
				{
					await ExecutePragmaAsync(maintenanceConnection, "auto_vacuum=INCREMENTAL", cancellationToken);
				}
				await ExecutePragmaAsync(
					maintenanceConnection,
					$"incremental_vacuum({IncrementalVacuumPageLimit})",
					cancellationToken);
				incrementalVacuumCompleted = true;
			}

			checkpointDeferred = await TryCheckpointWalAsync(maintenanceConnection, cancellationToken);
		}
		catch (Exception exception) when (IsDeferrableMaintenanceFailure(exception))
		{
			deferredReason = GetMaintenanceFailureReason(exception);
		}

		return new MarketStorageMaintenanceResult(
			removed,
			storageBytesBefore,
			GetDatabaseStorageLength(),
			fullVacuumCompleted,
			incrementalVacuumCompleted,
			checkpointDeferred,
			deferredReason);
	}

	private static async Task<int> PruneOldMarketSamplesAsync(
		SqliteConnection connection,
		TimeSpan trackedSampleRetention,
		DateTimeOffset nowUtc,
		CancellationToken cancellationToken)
	{
		int removed = 0;
		await using DbTransaction transaction = await connection.BeginTransactionAsync(cancellationToken);
		(string Table, TimeSpan Retention)[] tables =
		[
			("snapshots", trackedSampleRetention),
			("outfit_snapshots", OutfitSampleRetention)
		];
		foreach ((string table, TimeSpan tableRetention) in tables)
		{
			await using SqliteCommand command = connection.CreateCommand();
			command.Transaction = (SqliteTransaction)transaction;
			command.CommandText = $"DELETE FROM {table} WHERE captured_utc < $cutoff;";
			command.Parameters.AddWithValue("$cutoff", nowUtc.Subtract(tableRetention).ToString("O"));
			removed += await command.ExecuteNonQueryAsync(cancellationToken);
		}
		await using (SqliteCommand removeCatalogHistory = connection.CreateCommand())
		{
			removeCatalogHistory.Transaction = (SqliteTransaction)transaction;
			removeCatalogHistory.CommandText = "DELETE FROM outfit_snapshots WHERE source='catalog';";
			removed += await removeCatalogHistory.ExecuteNonQueryAsync(cancellationToken);
		}
		await transaction.CommitAsync(cancellationToken);
		return removed;
	}

	internal static bool HasSufficientVacuumSpace(long databaseBytes, long walBytes, long availableBytes)
	{
		if (databaseBytes < 0 || walBytes < 0 || availableBytes < 0)
		{
			return false;
		}

		long requiredBytes;
		try
		{
			requiredBytes = checked(databaseBytes * 2L + walBytes + VacuumFreeSpaceReserveBytes);
		}
		catch (OverflowException)
		{
			return false;
		}
		return availableBytes >= requiredBytes;
	}

	public async Task<int> SyncOutfitCatalogAsync(
		IReadOnlyList<MarketItem> items,
		string region,
		CancellationToken cancellationToken,
		bool removeMissing = false)
	{
		if (removeMissing && items.Count == 0)
		{
			throw new InvalidDataException("A validated outfit catalog cannot be empty.");
		}

		region = NormalizeRegion(region);
		DateTimeOffset now = DateTimeOffset.UtcNow;
		int removed = 0;
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using DbTransaction transaction = await connection.BeginTransactionAsync(cancellationToken);
		if (removeMissing)
		{
			await using SqliteCommand prepareIds = connection.CreateCommand();
			prepareIds.Transaction = (SqliteTransaction)transaction;
			prepareIds.CommandText = @"
CREATE TEMP TABLE IF NOT EXISTS synced_outfit_ids (
    item_id INTEGER PRIMARY KEY
);
DELETE FROM synced_outfit_ids;";
			await prepareIds.ExecuteNonQueryAsync(cancellationToken);
		}

		foreach (MarketItem item in items)
		{
			if (removeMissing)
			{
				await using SqliteCommand rememberId = connection.CreateCommand();
				rememberId.Transaction = (SqliteTransaction)transaction;
				rememberId.CommandText = "INSERT OR IGNORE INTO synced_outfit_ids(item_id) VALUES($id);";
				rememberId.Parameters.AddWithValue("$id", item.ItemId);
				await rememberId.ExecuteNonQueryAsync(cancellationToken);
			}

			await using (SqliteCommand command = connection.CreateCommand())
			{
				command.Transaction = (SqliteTransaction)transaction;
				command.CommandText = "INSERT INTO outfit_catalog(\n    item_id,region,name,grade,sub_category,price,stock,last_catalog_sync_utc)\nVALUES($id,$region,$name,$grade,$sub,$price,$stock,$sync)\nON CONFLICT(item_id,region) DO UPDATE SET\n    name=excluded.name,grade=excluded.grade,sub_category=excluded.sub_category,\n    price=excluded.price,stock=excluded.stock,last_catalog_sync_utc=excluded.last_catalog_sync_utc;";
				command.Parameters.AddWithValue("$id", item.ItemId);
				command.Parameters.AddWithValue("$region", region);
				command.Parameters.AddWithValue("$name", item.Name);
				command.Parameters.AddWithValue("$grade", item.Grade);
				command.Parameters.AddWithValue("$sub", item.SubCategory);
				command.Parameters.AddWithValue("$price", item.CurrentPrice);
				command.Parameters.AddWithValue("$stock", item.Stock);
				command.Parameters.AddWithValue("$sync", now.ToString("O"));
				await command.ExecuteNonQueryAsync(cancellationToken);
			}
		}

		if (removeMissing)
		{
			await using SqliteCommand prune = connection.CreateCommand();
			prune.Transaction = (SqliteTransaction)transaction;
			prune.CommandText = @"
DELETE FROM outfit_catalog
WHERE region=$region
  AND NOT EXISTS (
      SELECT 1
      FROM synced_outfit_ids synced
      WHERE synced.item_id=outfit_catalog.item_id
  );";
			prune.Parameters.AddWithValue("$region", region);
			removed = await prune.ExecuteNonQueryAsync(cancellationToken);
			await using SqliteCommand dropIds = connection.CreateCommand();
			dropIds.Transaction = (SqliteTransaction)transaction;
			dropIds.CommandText = "DROP TABLE synced_outfit_ids;";
			await dropIds.ExecuteNonQueryAsync(cancellationToken);
		}

		await transaction.CommitAsync(cancellationToken);
		return removed;
	}

	public async Task<IReadOnlyList<MarketItem>> GetOutfitCatalogAsync(string region, CancellationToken cancellationToken)
	{
		List<MarketItem> items = new List<MarketItem>();
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = @"
SELECT item_id,name,grade,price,stock,sub_category
FROM outfit_catalog
WHERE region=$region
ORDER BY item_id;";
		command.Parameters.AddWithValue("$region", NormalizeRegion(region));
		await using SqliteDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
		while (await reader.ReadAsync(cancellationToken))
		{
			items.Add(new MarketItem(
				reader.GetInt64(0),
				0,
				reader.GetString(1),
				reader.GetInt32(2),
				reader.GetInt64(3),
				reader.GetInt64(4),
				0L,
				55,
				reader.GetInt32(5)));
		}
		return items;
	}

	public async Task<IReadOnlyList<MarketItem>> GetOutfitCatalogDueForBulkAsync(
		string region,
		TimeSpan maximumAge,
		CancellationToken cancellationToken)
	{
		return await GetOutfitCatalogDueForBulkAsync(region, maximumAge, DateTimeOffset.UtcNow, cancellationToken);
	}

	internal async Task<IReadOnlyList<MarketItem>> GetOutfitCatalogDueForBulkAsync(
		string region,
		TimeSpan maximumAge,
		DateTimeOffset nowUtc,
		CancellationToken cancellationToken)
	{
		DateTimeOffset cutoff = GetOutfitBulkDueCutoff(nowUtc, maximumAge);
		List<MarketItem> items = new List<MarketItem>();
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = @"
SELECT c.item_id,c.name,c.grade,c.price,c.stock,c.sub_category
FROM outfit_catalog c
WHERE c.region=$region
  AND NOT EXISTS (
      SELECT 1
      FROM outfit_snapshots samples
      WHERE samples.item_id=c.item_id
        AND samples.region=c.region
        AND samples.source='bulk-sales'
        AND samples.captured_utc > $cutoff
  )
ORDER BY c.item_id;";
		command.Parameters.AddWithValue("$region", NormalizeRegion(region));
		command.Parameters.AddWithValue("$cutoff", cutoff.ToString("O"));
		await using SqliteDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
		while (await reader.ReadAsync(cancellationToken))
		{
			items.Add(new MarketItem(
				reader.GetInt64(0),
				0,
				reader.GetString(1),
				reader.GetInt32(2),
				reader.GetInt64(3),
				reader.GetInt64(4),
				0L,
				55,
				reader.GetInt32(5)));
		}
		return items;
	}

	internal static DateTimeOffset GetOutfitBulkDueCutoff(DateTimeOffset nowUtc, TimeSpan maximumAge)
	{
		if (maximumAge < TimeSpan.Zero)
		{
			throw new ArgumentOutOfRangeException(nameof(maximumAge));
		}

		// A successful provider response is captured a little after its hourly
		// task started. Treat the final five minutes as scheduling tolerance so the
		// third hourly check collects again instead of missing by seconds and
		// deferring the next successful sample to hour four.
		TimeSpan effectiveMaximumAge = maximumAge > OutfitBulkSchedulingTolerance
			? maximumAge - OutfitBulkSchedulingTolerance
			: TimeSpan.Zero;
		return nowUtc.Subtract(effectiveMaximumAge);
	}

	public async Task<IReadOnlyList<MarketItem>> GetOutfitsDueAsync(string region, int limit, CancellationToken cancellationToken)
	{
		DateTimeOffset now = DateTimeOffset.UtcNow;
		List<(MarketItem Item, DateTimeOffset? LastDetailed, long Preorders, long Trades)> items = new List<(MarketItem, DateTimeOffset?, long, long)>();
		IReadOnlyList<MarketItem> result;
		await using (SqliteConnection connection = await OpenAsync(cancellationToken))
		{
			IReadOnlyList<MarketItem> readOnlyList2;
			await using (SqliteCommand command = connection.CreateCommand())
			{
				command.CommandText = "WITH latest AS (\n    SELECT item_id,preorder_count,trade_count\n    FROM (\n        SELECT item_id,preorder_count,trade_count,\n               ROW_NUMBER() OVER(PARTITION BY item_id ORDER BY captured_utc DESC) AS row_number\n        FROM outfit_snapshots\n        WHERE region=$region AND trade_count IS NOT NULL\n    )\n    WHERE row_number=1\n)\nSELECT c.item_id,c.name,c.grade,c.price,c.stock,c.sub_category,c.last_detailed_utc,\n       COALESCE(latest.preorder_count,0),COALESCE(latest.trade_count,0)\nFROM outfit_catalog c\nLEFT JOIN latest ON latest.item_id=c.item_id\nWHERE c.region=$region;";
				command.Parameters.AddWithValue("$region", region);
				IReadOnlyList<MarketItem> readOnlyList;
				await using (SqliteDataReader reader = await command.ExecuteReaderAsync(cancellationToken))
				{
					while (await reader.ReadAsync(cancellationToken))
					{
						DateTimeOffset? lastDetailed = reader.IsDBNull(6) ? null : DateTimeOffset.Parse(reader.GetString(6));
						items.Add((new MarketItem(reader.GetInt64(0), 0, reader.GetString(1), reader.GetInt32(2), reader.GetInt64(3), reader.GetInt64(4), 0L, 55, reader.GetInt32(5)), lastDetailed, reader.GetInt64(7), reader.GetInt64(8)));
					}
					readOnlyList = (from item in items
						let missingDetail = item.LastDetailed.HasValue ? 0 : 1
						let sampleAgeHours = item.LastDetailed.HasValue ? Math.Max(0.0, (now - item.LastDetailed.Value).TotalHours) : double.MaxValue
						let preorderBonus = Math.Min(24.0, Math.Log10((double)Math.Max(0L, item.Preorders) + 1.0) * 8.0)
						let stockBonus = item.Item.Stock <= 0 ? 6.0 : 0.0
						let movementBonus = item.Trades > 0 ? 2.0 : 0.0
						orderby missingDetail descending, sampleAgeHours + preorderBonus + stockBonus + movementBonus descending, item.Item.Name
						select item.Item).Take(Math.Clamp(limit, 1, 600)).ToList();
				}
				readOnlyList2 = readOnlyList;
			}
			result = readOnlyList2;
		}
		return result;
	}

	public async Task<int> SaveOutfitBulkSamplesAsync(IReadOnlyList<GrindMarketPrice> samples, string region, CancellationToken cancellationToken)
	{
		GrindMarketPrice[] usable = samples
			.Where(sample => sample.ItemId > 0 && sample.TradeCount.HasValue)
			.GroupBy(sample => sample.ItemId)
			.Select(group => group.First())
			.ToArray();
		if (usable.Length == 0)
		{
			return 0;
		}

		region = NormalizeRegion(region);
		int inserted = 0;
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using DbTransaction transaction = await connection.BeginTransactionAsync(cancellationToken);
		foreach (GrindMarketPrice sample in usable)
		{
			long price = sample.BasePrice.GetValueOrDefault(sample.Price);
			await using (SqliteCommand command = connection.CreateCommand())
			{
				command.Transaction = (SqliteTransaction)transaction;
				command.CommandText = @"
INSERT INTO outfit_snapshots(
    item_id,region,captured_utc,price,stock,trade_count,preorder_count,source)
SELECT c.item_id,c.region,$captured,
       CASE WHEN $price > 0 THEN $price ELSE c.price END,
       COALESCE($stock,c.stock),$trades,
       (
           SELECT previous.preorder_count
           FROM outfit_snapshots previous
           WHERE previous.item_id=c.item_id
             AND previous.region=c.region
             AND previous.preorder_count IS NOT NULL
           ORDER BY previous.captured_utc DESC
           LIMIT 1
       ),
       'bulk-sales'
FROM outfit_catalog c
WHERE c.item_id=$id AND c.region=$region
  AND NOT EXISTS (
      SELECT 1
      FROM outfit_snapshots existing
      WHERE existing.item_id=c.item_id
        AND existing.region=c.region
        AND existing.source='bulk-sales'
        AND existing.captured_utc=$captured
  );";
				command.Parameters.AddWithValue("$id", sample.ItemId);
				command.Parameters.AddWithValue("$region", region);
				command.Parameters.AddWithValue("$captured", sample.CapturedUtc.ToString("O"));
				command.Parameters.AddWithValue("$price", price);
				command.Parameters.AddWithValue("$stock", (object?)sample.Stock ?? DBNull.Value);
				command.Parameters.AddWithValue("$trades", sample.TradeCount!.Value);
				inserted += await command.ExecuteNonQueryAsync(cancellationToken);
			}

			await using SqliteCommand update = connection.CreateCommand();
			update.Transaction = (SqliteTransaction)transaction;
			update.CommandText = @"
UPDATE outfit_catalog
SET price=CASE WHEN $price > 0 THEN $price ELSE price END,
    stock=COALESCE($stock,stock)
WHERE item_id=$id AND region=$region;";
			update.Parameters.AddWithValue("$id", sample.ItemId);
			update.Parameters.AddWithValue("$region", region);
			update.Parameters.AddWithValue("$price", price);
			update.Parameters.AddWithValue("$stock", (object?)sample.Stock ?? DBNull.Value);
			await update.ExecuteNonQueryAsync(cancellationToken);
		}
		await transaction.CommitAsync(cancellationToken);
		return inserted;
	}

	public async Task SaveOutfitDetailAsync(MarketItem item, MarketItem variant, MarketSnapshot snapshot, string region, CancellationToken cancellationToken)
	{
		DateTimeOffset now = DateTimeOffset.UtcNow;
		await using SqliteConnection connection = await OpenAsync(cancellationToken);
		await using DbTransaction transaction = await connection.BeginTransactionAsync(cancellationToken);
		await using (SqliteCommand command = connection.CreateCommand())
		{
			command.Transaction = (SqliteTransaction)transaction;
			command.CommandText = "INSERT INTO outfit_snapshots(\n    item_id,region,captured_utc,price,stock,trade_count,preorder_count,source)\nVALUES($id,$region,$captured,$price,$stock,$trades,$preorders,'detail');";
			command.Parameters.AddWithValue("$id", item.ItemId);
			command.Parameters.AddWithValue("$region", region);
			command.Parameters.AddWithValue("$captured", now.ToString("O"));
			command.Parameters.AddWithValue("$price", snapshot.Price);
			command.Parameters.AddWithValue("$stock", snapshot.Stock);
			command.Parameters.AddWithValue("$trades", variant.TradeCount);
			command.Parameters.AddWithValue("$preorders", snapshot.PreorderCount);
			await command.ExecuteNonQueryAsync(cancellationToken);
		}
		await using (SqliteCommand command = connection.CreateCommand())
		{
			command.Transaction = (SqliteTransaction)transaction;
			command.CommandText = "UPDATE outfit_catalog SET name=$name,price=$price,stock=$stock,last_detailed_utc=$updated\nWHERE item_id=$id AND region=$region;";
			command.Parameters.AddWithValue("$name", variant.Name);
			command.Parameters.AddWithValue("$price", snapshot.Price);
			command.Parameters.AddWithValue("$stock", snapshot.Stock);
			command.Parameters.AddWithValue("$updated", now.ToString("O"));
			command.Parameters.AddWithValue("$id", item.ItemId);
			command.Parameters.AddWithValue("$region", region);
			await command.ExecuteNonQueryAsync(cancellationToken);
		}
		await transaction.CommitAsync(cancellationToken);
	}

	public async Task<OutfitReport> GetOutfitReportAsync(string region, CancellationToken cancellationToken)
	{
		DateTimeOffset reportNow = DateTimeOffset.UtcNow;
		List<(long Id, string Name, long Price, long Stock, DateTimeOffset Sync, DateTimeOffset? Detail)> catalog = new List<(long, string, long, long, DateTimeOffset, DateTimeOffset?)>();
		Dictionary<long, List<(DateTimeOffset Time, long Trades, long Preorders)>> samples = new Dictionary<long, List<(DateTimeOffset, long, long)>>();
		Dictionary<long, long> latestPreorders = new Dictionary<long, long>();
		OutfitReport result;
		await using (SqliteConnection connection = await OpenAsync(cancellationToken))
		{
			await using (SqliteCommand command = connection.CreateCommand())
			{
				command.CommandText = "SELECT item_id,name,price,stock,last_catalog_sync_utc,last_detailed_utc\nFROM outfit_catalog WHERE region=$region;";
				command.Parameters.AddWithValue("$region", region);
				await using SqliteDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
				while (await reader.ReadAsync(cancellationToken))
				{
					catalog.Add((reader.GetInt64(0), reader.GetString(1), reader.GetInt64(2), reader.GetInt64(3), DateTimeOffset.Parse(reader.GetString(4)), reader.IsDBNull(5) ? ((DateTimeOffset?)null) : new DateTimeOffset?(DateTimeOffset.Parse(reader.GetString(5)))));
				}
			}
			await using (SqliteCommand command = connection.CreateCommand())
			{
				command.CommandText = @"
SELECT item_id,captured_utc,trade_count
FROM outfit_snapshots
WHERE region=$region
  AND trade_count IS NOT NULL
  AND captured_utc >= $since
  AND captured_utc <= $latest
ORDER BY item_id,captured_utc,snapshot_id;";
				command.Parameters.AddWithValue("$region", region);
				command.Parameters.AddWithValue("$since", reportNow.Subtract(OutfitReportHistory).ToString("O"));
				command.Parameters.AddWithValue("$latest", reportNow.Add(OutfitClockSkewTolerance).ToString("O"));
				await using SqliteDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
				while (await reader.ReadAsync(cancellationToken))
				{
					long @int = reader.GetInt64(0);
					if (!samples.TryGetValue(@int, out List<(DateTimeOffset, long, long)> value))
					{
						value = (samples[@int] = new List<(DateTimeOffset, long, long)>());
					}
					value.Add((DateTimeOffset.Parse(reader.GetString(1)), reader.GetInt64(2), 0));
				}
			}
			await using (SqliteCommand command = connection.CreateCommand())
			{
				command.CommandText = @"
SELECT item_id,preorder_count
FROM (
    SELECT item_id,preorder_count,
           ROW_NUMBER() OVER(PARTITION BY item_id ORDER BY captured_utc DESC, snapshot_id DESC) AS row_number
    FROM outfit_snapshots
    WHERE region=$region AND preorder_count IS NOT NULL
)
WHERE row_number=1;";
				command.Parameters.AddWithValue("$region", region);
				await using SqliteDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
				while (await reader.ReadAsync(cancellationToken))
				{
					latestPreorders[reader.GetInt64(0)] = reader.GetInt64(1);
				}
			}
			List<OutfitOpportunity> list2 = new List<OutfitOpportunity>();
			foreach (var item2 in catalog)
			{
				samples.TryGetValue(item2.Id, out List<(DateTimeOffset, long, long)> value2);
				if (value2 == null)
				{
					value2 = new List<(DateTimeOffset, long, long)>();
				}
				IReadOnlyList<(DateTimeOffset Time, long Trades, long Preorders)> evidenceSamples =
					CompactOutfitEvidenceSamples(value2);
				DateTimeOffset? lastSalesSampleUtc = value2.Count == 0
					? null
					: value2[value2.Count - 1].Item1;
				bool salesDataStale = lastSalesSampleUtc.HasValue
					&& reportNow - lastSalesSampleUtc.Value > OutfitSampleFreshness;
				long? num = CalculateOutfitSalesWindow(value2, TimeSpan.FromHours(24.0), reportNow);
				long? num2 = CalculateOutfitSalesWindow(value2, TimeSpan.FromDays(3.0), reportNow);
				long? num3 = CalculateOutfitSalesWindow(value2, TimeSpan.FromDays(7.0), reportNow);
				double? num4 = EstimateOutfitSalesPerDay(value2, evidenceSamples, num, num2, num3);
				double? sevenDayChancePercent = null;
				long? preorderCount = item2.Detail.HasValue
					&& latestPreorders.TryGetValue(item2.Id, out long latestPreorderCount)
						? latestPreorderCount
						: null;
				long? obj2;
				if (value2.Count != 0)
				{
					List<(DateTimeOffset, long, long)> list4 = value2;
					obj2 = list4[list4.Count - 1].Item2;
				}
				else
				{
					obj2 = null;
				}
				long? lifetimeSales = obj2;
				double? estimatedQueueDays = null;
				double? demandMomentumPercent = null;
				if (num4 > 0.0)
				{
					double num5 = (double)Math.Max(0L, preorderCount.GetValueOrDefault()) + 1.0;
					estimatedQueueDays = num5 / num4.Value;
					sevenDayChancePercent = (1.0 - Math.Exp((0.0 - num4.Value) * 7.0 / num5)) * 100.0;
				}
				if (num.HasValue && num3.HasValue && num3 > 0)
				{
					double num6 = (double)num3.Value / 7.0;
					demandMomentumPercent = ((double)num.Value - num6) * 100.0 / num6;
				}
				double volumeReliability = Math.Min(1.0, Math.Sqrt(((double)(num3 ?? (long)Math.Round(num4.GetValueOrDefault() * 7.0))) / 30.0));
				double confidence = CalculateOutfitConfidence(evidenceSamples, item2.Detail, num, num2, num3, reportNow);
				double confidencePercent = confidence * 100.0;
				int activeSalesWindows =
					(num.GetValueOrDefault() >= OutfitRecommendationActive24HourSales ? 1 : 0)
					+ (num2.GetValueOrDefault() >= OutfitRecommendationActive3DaySales ? 1 : 0)
					+ (num3.GetValueOrDefault() >= OutfitRecommendationActive7DaySales ? 1 : 0);
				bool hasCurrentPreorderDetail =
					item2.Detail.HasValue
					&& item2.Detail.Value <= reportNow.Add(OutfitClockSkewTolerance)
					&& reportNow - item2.Detail.Value <= OutfitRecommendationMaximumDetailAge;
				bool flag3 =
					!salesDataStale
					&& hasCurrentPreorderDetail
					&& evidenceSamples.Count >= OutfitRecommendationMinimumSamples
					&& confidence >= OutfitRecommendationMinimumConfidence
					&& num4.HasValue
					&& num4.Value > 0.0
					&& sevenDayChancePercent.HasValue
					&& preorderCount.GetValueOrDefault() > 0
					&& activeSalesWindows >= OutfitRecommendationMinimumActiveWindows;
				double score = flag3 && estimatedQueueDays.HasValue && estimatedQueueDays.Value > 0.0
					? confidence * volumeReliability / estimatedQueueDays.Value
					: 0.0;
				list2.Add(new OutfitOpportunity(item2.Id, item2.Name, item2.Price, item2.Stock, preorderCount, lifetimeSales, num, num2, num3, num4, sevenDayChancePercent, estimatedQueueDays, demandMomentumPercent, confidencePercent, score, flag3, evidenceSamples.Count, lastSalesSampleUtc, salesDataStale, item2.Detail));
			}
			int num10 = catalog.Count<(long, string, long, long, DateTimeOffset, DateTimeOffset?)>(delegate((long Id, string Name, long Price, long Stock, DateTimeOffset Sync, DateTimeOffset? Detail) x)
			{
				DateTimeOffset? item = x.Detail;
				return item.HasValue;
			});
			DateTimeOffset? latestSalesSampleUtc = list2
				.Where(opportunity => opportunity.LastSalesSampleUtc.HasValue)
				.Select(opportunity => opportunity.LastSalesSampleUtc)
				.Max();
			int staleSalesOutfitCount = list2.Count(opportunity => opportunity.SalesDataStale);
			result = new OutfitReport(catalog.Count, num10, (catalog.Count == 0) ? 0.0 : ((double)num10 * 100.0 / (double)catalog.Count), (catalog.Count == 0) ? ((DateTimeOffset?)null) : new DateTimeOffset?(catalog.Max<(long, string, long, long, DateTimeOffset, DateTimeOffset?), DateTimeOffset>(((long Id, string Name, long Price, long Stock, DateTimeOffset Sync, DateTimeOffset? Detail) x) => x.Sync)), latestSalesSampleUtc, staleSalesOutfitCount, (from x in list2
				orderby x.Score descending, x.SalesPerDay ?? (-1.0) descending, x.PreorderCount ?? long.MaxValue, x.Name
				select x).ToArray());
		}
		return result;
	}

	private static long? CalculateOutfitSalesWindow(
		IReadOnlyList<(DateTimeOffset Time, long Trades, long Preorders)> samples,
		TimeSpan window,
		DateTimeOffset now)
	{
		if (samples.Count < 2)
		{
			return null;
		}
		(DateTimeOffset Time, long Trades, long Preorders) last = samples[samples.Count - 1];
		if (last.Time > now.Add(OutfitClockSkewTolerance))
		{
			return null;
		}

		DateTimeOffset cutoff = last.Time - window;
		TimeSpan baselineTolerance = TimeSpan.FromHours(
			Math.Min(12.0, Math.Max(8.0, window.TotalHours * 0.25)));
		(DateTimeOffset Time, long Trades, long Preorders)? before = null;
		(DateTimeOffset Time, long Trades, long Preorders)? after = null;
		foreach ((DateTimeOffset Time, long Trades, long Preorders) sample in samples.Take(samples.Count - 1))
		{
			if (sample.Time > last.Time
				|| sample.Time < cutoff.Subtract(baselineTolerance)
				|| sample.Time > cutoff.Add(baselineTolerance))
			{
				continue;
			}
			if (sample.Time <= cutoff)
			{
				before = sample;
			}
			if (!after.HasValue && sample.Time >= cutoff)
			{
				after = sample;
			}
		}
		if (before.HasValue && after.HasValue)
		{
			double baseline = before.Value.Time == after.Value.Time
				? before.Value.Trades
				: InterpolateTradeCount(before.Value, after.Value, cutoff);
			if (double.IsNaN(baseline) || last.Trades < baseline)
			{
				return null;
			}
			return (long)Math.Round(last.Trades - baseline);
		}

		(DateTimeOffset Time, long Trades, long Preorders)? nearest = before ?? after;
		if (!nearest.HasValue)
		{
			return null;
		}
		double observedHours = (last.Time - nearest.Value.Time).TotalHours;
		if (observedHours <= 0.0
			|| Math.Abs(observedHours - window.TotalHours) > baselineTolerance.TotalHours
			|| last.Trades < nearest.Value.Trades)
		{
			return null;
		}
		return (long)Math.Round((last.Trades - nearest.Value.Trades) * window.TotalHours / observedHours);
	}

	private static IReadOnlyList<(DateTimeOffset Time, long Trades, long Preorders)> CompactOutfitEvidenceSamples(
		IReadOnlyList<(DateTimeOffset Time, long Trades, long Preorders)> samples)
	{
		if (samples.Count < 2)
		{
			return samples;
		}

		// A cumulative trade counter that has not moved is still an important time
		// anchor for rolling-window calculations, but it is not independent evidence
		// of demand. Keep every raw anchor in the database and in the window logic,
		// while collapsing consecutive equal observations for confidence and sample
		// count. Retaining the first observation in each run makes a later change span
		// the whole quiet period instead of looking like a burst in only the most recent
		// polling interval.
		List<(DateTimeOffset Time, long Trades, long Preorders)> compacted =
			new List<(DateTimeOffset, long, long)>(samples.Count);
		foreach ((DateTimeOffset Time, long Trades, long Preorders) sample in samples)
		{
			if (compacted.Count == 0 || compacted[compacted.Count - 1].Trades != sample.Trades)
			{
				compacted.Add(sample);
			}
		}
		return compacted;
	}

	private static IReadOnlyList<(DateTimeOffset Time, long Trades, long Preorders)> BuildOutfitRateSamples(
		IReadOnlyList<(DateTimeOffset Time, long Trades, long Preorders)> samples,
		IReadOnlyList<(DateTimeOffset Time, long Trades, long Preorders)> evidenceSamples)
	{
		if (samples.Count < 2 || evidenceSamples.Count == 0)
		{
			return evidenceSamples;
		}

		(DateTimeOffset Time, long Trades, long Preorders) latest = samples[samples.Count - 1];
		(DateTimeOffset Time, long Trades, long Preorders) latestEvidence = evidenceSamples[evidenceSamples.Count - 1];
		if (latest.Time <= latestEvidence.Time || latest.Trades != latestEvidence.Trades)
		{
			return evidenceSamples;
		}

		// A currently-flat run has no later movement to carry its elapsed time into
		// the rate calculation. Append only its latest anchor, so a quiet terminal
		// period contributes one zero-rate interval regardless of how often it was
		// polled, rather than repeatedly damping the moving estimate.
		List<(DateTimeOffset Time, long Trades, long Preorders)> rateSamples =
			new List<(DateTimeOffset, long, long)>(evidenceSamples.Count + 1);
		rateSamples.AddRange(evidenceSamples);
		rateSamples.Add(latest);
		return rateSamples;
	}

	private static double? EstimateOutfitSalesPerDay(
		IReadOnlyList<(DateTimeOffset Time, long Trades, long Preorders)> samples,
		IReadOnlyList<(DateTimeOffset Time, long Trades, long Preorders)> evidenceSamples,
		long? sales24Hours,
		long? sales3Days,
		long? sales7Days)
	{
		double weightedRate = 0.0;
		double totalWeight = 0.0;
		if (sales24Hours.HasValue)
		{
			weightedRate += sales24Hours.Value * 0.55;
			totalWeight += 0.55;
		}
		if (sales3Days.HasValue)
		{
			weightedRate += ((double)sales3Days.Value / 3.0) * 0.3;
			totalWeight += 0.3;
		}
		if (sales7Days.HasValue)
		{
			weightedRate += ((double)sales7Days.Value / 7.0) * 0.15;
			totalWeight += 0.15;
		}
		IReadOnlyList<(DateTimeOffset Time, long Trades, long Preorders)> rateSamples =
			BuildOutfitRateSamples(samples, evidenceSamples);
		double? smoothedRate = EstimateSmoothedOutfitSalesPerDay(rateSamples);
		if (totalWeight > 0.0)
		{
			double windowRate = weightedRate / totalWeight;
			return smoothedRate.HasValue ? (windowRate * 0.7 + smoothedRate.Value * 0.3) : windowRate;
		}
		if (smoothedRate.HasValue)
		{
			return smoothedRate;
		}
		if (samples.Count < 2)
		{
			return null;
		}
		(DateTimeOffset, long, long) first = samples[0];
		(DateTimeOffset, long, long) last = samples[samples.Count - 1];
		double hours = (last.Item1 - first.Item1).TotalHours;
		if (hours < 6.0)
		{
			return null;
		}
		return Math.Max(0L, last.Item2 - first.Item2) * 24.0 / hours;
	}

	private static double InterpolateTradeCount((DateTimeOffset Time, long Trades, long Preorders) before, (DateTimeOffset Time, long Trades, long Preorders) after, DateTimeOffset target)
	{
		double hours = (after.Time - before.Time).TotalHours;
		if (hours <= 0.0 || after.Trades < before.Trades)
		{
			return double.NaN;
		}
		double progress = Math.Clamp((target - before.Time).TotalHours / hours, 0.0, 1.0);
		return before.Trades + (after.Trades - before.Trades) * progress;
	}

	private static double? EstimateSmoothedOutfitSalesPerDay(IReadOnlyList<(DateTimeOffset Time, long Trades, long Preorders)> samples)
	{
		if (samples.Count < 2)
		{
			return null;
		}
		double? smoothedRate = null;
		for (int i = 1; i < samples.Count; i++)
		{
			(DateTimeOffset Time, long Trades, long Preorders) previous = samples[i - 1];
			(DateTimeOffset Time, long Trades, long Preorders) current = samples[i];
			double hours = (current.Time - previous.Time).TotalHours;
			long delta = current.Trades - previous.Trades;
			if (hours < 1.0 || hours > 96.0 || delta < 0)
			{
				continue;
			}
			double rate = delta * 24.0 / hours;
			smoothedRate = smoothedRate.HasValue ? (smoothedRate.Value * 0.55 + rate * 0.45) : rate;
		}
		return smoothedRate;
	}

	private static double CalculateOutfitConfidence(
		IReadOnlyList<(DateTimeOffset Time, long Trades, long Preorders)> samples,
		DateTimeOffset? lastDetailedUtc,
		long? sales24Hours,
		long? sales3Days,
		long? sales7Days,
		DateTimeOffset now)
	{
		if (samples.Count < 2)
		{
			return 0.0;
		}
		double sampleFactor = Math.Min(1.0, Math.Sqrt((double)samples.Count / 12.0));
		double windowFactor = (sales24Hours.HasValue ? 0.4 : 0.0) + (sales3Days.HasValue ? 0.35 : 0.0) + (sales7Days.HasValue ? 0.25 : 0.0);
		double ageFactor = 0.0;
		if (lastDetailedUtc.HasValue)
		{
			double ageHours = Math.Max(0.0, (now - lastDetailedUtc.Value).TotalHours);
			ageFactor = Math.Clamp(1.0 - Math.Max(0.0, ageHours - 6.0) / 42.0, 0.0, 1.0);
		}
		double spacingFactor = CalculateSampleSpacingQuality(samples);
		return Math.Clamp(sampleFactor * 0.35 + windowFactor * 0.35 + ageFactor * 0.2 + spacingFactor * 0.1, 0.0, 1.0);
	}

	private static double CalculateSampleSpacingQuality(IReadOnlyList<(DateTimeOffset Time, long Trades, long Preorders)> samples)
	{
		if (samples.Count < 3)
		{
			return 0.5;
		}
		List<double> intervals = new List<double>();
		for (int i = 1; i < samples.Count; i++)
		{
			double hours = (samples[i].Time - samples[i - 1].Time).TotalHours;
			if (hours > 0.0)
			{
				intervals.Add(hours);
			}
		}
		if (intervals.Count == 0)
		{
			return 0.0;
		}
		double average = intervals.Average();
		double deviation = intervals.Average(x => Math.Abs(x - average));
		return Math.Clamp(1.0 - deviation / Math.Max(1.0, average), 0.0, 1.0);
	}

	private static string NormalizeRegion(string region)
	{
		return string.Equals(region, "na", StringComparison.OrdinalIgnoreCase) ? "na" : "eu";
	}

	private static async Task InsertSnapshotAsync(SqliteConnection connection, SqliteTransaction transaction, TrackedItem item, DateTimeOffset timestamp, long price, long? stock, long? tradeCount, long min, long max, double average, string source, CancellationToken cancellationToken)
	{
		await using SqliteCommand command = connection.CreateCommand();
		command.Transaction = transaction;
		command.CommandText = "INSERT OR IGNORE INTO snapshots(\n    item_id,enhancement,region,captured_utc,price,stock,trade_count,\n    order_book_min,order_book_max,order_book_average,source)\nVALUES($id,$enhancement,$region,$captured,$price,$stock,$trades,$min,$max,$average,$source);";
		command.Parameters.AddWithValue("$id", item.ItemId);
		command.Parameters.AddWithValue("$enhancement", item.Enhancement);
		command.Parameters.AddWithValue("$region", item.Region);
		command.Parameters.AddWithValue("$captured", timestamp.ToString("O"));
		command.Parameters.AddWithValue("$price", price);
		command.Parameters.AddWithValue("$stock", ((object)stock) ?? DBNull.Value);
		command.Parameters.AddWithValue("$trades", ((object)tradeCount) ?? DBNull.Value);
		command.Parameters.AddWithValue("$min", min);
		command.Parameters.AddWithValue("$max", max);
		command.Parameters.AddWithValue("$average", average);
		command.Parameters.AddWithValue("$source", source);
		await command.ExecuteNonQueryAsync(cancellationToken);
	}

	private static async Task<SalesWindow> GetSalesWindowAsync(SqliteConnection connection, long itemId, int enhancement, string region, string label, TimeSpan window, CancellationToken cancellationToken)
	{
		DateTimeOffset cutoff = DateTimeOffset.UtcNow.Subtract(window);
		List<(DateTimeOffset Time, long Count)> samples = new List<(DateTimeOffset, long)>();
		SalesWindow result;
		await using (SqliteCommand command = connection.CreateCommand())
		{
			command.CommandText = "SELECT captured_utc, trade_count FROM snapshots\nWHERE item_id=$id AND enhancement=$enhancement AND region=$region\n  AND trade_count IS NOT NULL\nORDER BY captured_utc;";
			command.Parameters.AddWithValue("$id", itemId);
			command.Parameters.AddWithValue("$enhancement", enhancement);
			command.Parameters.AddWithValue("$region", region);
			SalesWindow salesWindow;
			await using (SqliteDataReader reader = await command.ExecuteReaderAsync(cancellationToken))
			{
				while (await reader.ReadAsync(cancellationToken))
				{
					samples.Add((DateTimeOffset.Parse(reader.GetString(0)), reader.GetInt64(1)));
				}
				if (samples.Count < 2)
				{
					salesWindow = new SalesWindow(label, null, Complete: false, 0.0);
				}
				else
				{
					(DateTimeOffset, long) tuple = samples[samples.Count - 1];
					(DateTimeOffset, long) tuple2 = samples.LastOrDefault(((DateTimeOffset Time, long Count) x) => x.Time <= cutoff);
					(DateTimeOffset, long) tuple3 = tuple2;
					if (tuple3.Item1 == default(DateTimeOffset) && tuple3.Item2 == 0L)
					{
						double coverageHours = Math.Max(0.0, (tuple.Item1 - samples[0].Time).TotalHours);
						salesWindow = new SalesWindow(label, null, Complete: false, coverageHours);
					}
					else
					{
						salesWindow = new SalesWindow(label, Math.Max(0L, tuple.Item2 - tuple2.Item2), Complete: true, Math.Max(0.0, (tuple.Item1 - tuple2.Item1).TotalHours));
					}
				}
			}
			result = salesWindow;
		}
		return result;
	}

	private async Task<SqliteConnection> OpenAsync(CancellationToken cancellationToken)
	{
		SqliteConnection connection = new SqliteConnection(connectionString);
		await connection.OpenAsync(cancellationToken);
		return connection;
	}

	private async Task<SqliteConnection> OpenMaintenanceAsync(CancellationToken cancellationToken)
	{
		SqliteConnection connection = new(new SqliteConnectionStringBuilder
		{
			DataSource = DatabasePath,
			Mode = SqliteOpenMode.ReadWriteCreate,
			Cache = SqliteCacheMode.Private,
			Pooling = false,
			DefaultTimeout = MaintenanceBusyTimeoutMilliseconds / 1000
		}.ToString());
		await connection.OpenAsync(cancellationToken);
		await using SqliteCommand timeout = connection.CreateCommand();
		timeout.CommandText = $"PRAGMA busy_timeout={MaintenanceBusyTimeoutMilliseconds};";
		await timeout.ExecuteNonQueryAsync(cancellationToken);
		return connection;
	}

	private static async Task<int> GetPragmaIntAsync(
		SqliteConnection connection,
		string pragma,
		CancellationToken cancellationToken)
	{
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = $"PRAGMA {pragma};";
		object? value = await command.ExecuteScalarAsync(cancellationToken);
		return value == null || value == DBNull.Value ? 0 : Convert.ToInt32(value);
	}

	private static async Task<string> GetPragmaTextAsync(
		SqliteConnection connection,
		string pragma,
		CancellationToken cancellationToken)
	{
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = $"PRAGMA {pragma};";
		object? value = await command.ExecuteScalarAsync(cancellationToken);
		return Convert.ToString(value) ?? string.Empty;
	}

	private static async Task ExecutePragmaAsync(
		SqliteConnection connection,
		string pragma,
		CancellationToken cancellationToken)
	{
		await using SqliteCommand command = connection.CreateCommand();
		command.CommandText = string.Equals(pragma, "VACUUM", StringComparison.Ordinal)
			? "VACUUM;"
			: $"PRAGMA {pragma};";
		await command.ExecuteNonQueryAsync(cancellationToken);
	}

	private static async Task<bool> TryCheckpointWalAsync(
		SqliteConnection connection,
		CancellationToken cancellationToken)
	{
		try
		{
			await using SqliteCommand timeout = connection.CreateCommand();
			timeout.CommandText = "PRAGMA busy_timeout=1000;";
			await timeout.ExecuteNonQueryAsync(cancellationToken);
			await using SqliteCommand checkpoint = connection.CreateCommand();
			checkpoint.CommandText = "PRAGMA wal_checkpoint(TRUNCATE);";
			await using SqliteDataReader reader = await checkpoint.ExecuteReaderAsync(cancellationToken);
			return await reader.ReadAsync(cancellationToken) && reader.GetInt32(0) != 0;
		}
		catch (Exception exception) when (IsDeferrableMaintenanceFailure(exception))
		{
			return true;
		}
	}

	private long GetDatabaseFileLength()
	{
		return GetFileLengthIfPresent(DatabasePath);
	}

	private long GetDatabaseStorageLength()
	{
		long databaseBytes = GetDatabaseFileLength();
		long walBytes = GetFileLengthIfPresent(DatabasePath + "-wal");
		try
		{
			return checked(databaseBytes + walBytes);
		}
		catch (OverflowException)
		{
			return long.MaxValue;
		}
	}

	private static long GetFileLengthIfPresent(string path)
	{
		try
		{
			return File.Exists(path) ? new FileInfo(path).Length : 0L;
		}
		catch (IOException)
		{
			return 0L;
		}
		catch (UnauthorizedAccessException)
		{
			return 0L;
		}
	}

	private static long GetAvailableFreeSpace(string databasePath)
	{
		try
		{
			string? root = Path.GetPathRoot(Path.GetFullPath(databasePath));
			return string.IsNullOrWhiteSpace(root) ? 0L : new DriveInfo(root).AvailableFreeSpace;
		}
		catch (Exception exception) when (exception is IOException
			or UnauthorizedAccessException
			or ArgumentException)
		{
			return 0L;
		}
	}

	private static bool IsDeferrableMaintenanceFailure(Exception exception)
	{
		return exception is SqliteException sqlite
			&& sqlite.SqliteErrorCode is 5 or 6 or 13;
	}

	private static string GetMaintenanceFailureReason(Exception exception)
	{
		return exception is SqliteException { SqliteErrorCode: 13 }
			? "Not enough temporary disk space is available for safe SQLite compaction."
			: "The market database is currently busy; storage maintenance will retry later.";
	}

	private static string EscapeCsv(string value)
	{
		if (value.IndexOfAny(new char[4] { ',', '"', '\r', '\n' }) < 0)
		{
			return value;
		}
		return "\"" + value.Replace("\"", "\"\"") + "\"";
	}
}

internal readonly record struct MarketStorageMaintenanceResult(
	int RemovedRows,
	long FileBytesBefore,
	long FileBytesAfter,
	bool FullVacuumCompleted,
	bool IncrementalVacuumCompleted,
	bool WalCheckpointDeferred,
	string? DeferredReason);

