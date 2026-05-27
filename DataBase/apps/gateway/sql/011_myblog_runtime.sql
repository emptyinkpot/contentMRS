CREATE TABLE IF NOT EXISTS myblog_reader_memory (
  object_id VARCHAR(191) PRIMARY KEY,
  object_type VARCHAR(32) NOT NULL,
  title TEXT NOT NULL,
  href TEXT NULL,
  progress DOUBLE NOT NULL DEFAULT 0,
  location_json JSON NULL,
  scroll_top INT NOT NULL DEFAULT 0,
  last_read_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_myblog_reader_memory_last_read_at (last_read_at),
  INDEX idx_myblog_reader_memory_type_last_read_at (object_type, last_read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS myblog_reader_highlights (
  id VARCHAR(191) PRIMARY KEY,
  object_id VARCHAR(191) NOT NULL,
  object_type VARCHAR(32) NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  color VARCHAR(32) NOT NULL DEFAULT 'gold',
  note TEXT NULL,
  anchor_json JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_myblog_reader_highlights_object (object_id, updated_at),
  INDEX idx_myblog_reader_highlights_type_updated (object_type, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS myblog_visual_sources (
  id VARCHAR(191) PRIMARY KEY,
  source_type VARCHAR(48) NOT NULL,
  provider VARCHAR(48) NOT NULL DEFAULT 'pinterest_api',
  source_url TEXT NOT NULL,
  board_id VARCHAR(191) NULL,
  provider_config_json JSON NULL,
  title TEXT NOT NULL,
  collection_title TEXT NOT NULL,
  partition_pattern_json JSON NULL,
  sync_interval_seconds INT NOT NULL DEFAULT 600,
  last_cursor TEXT NULL,
  last_synced_at DATETIME(3) NULL,
  sync_status VARCHAR(32) NOT NULL DEFAULT 'idle',
  pins_snapshot_hash VARCHAR(64) NULL,
  last_error TEXT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_myblog_visual_sources_status (sync_status),
  INDEX idx_myblog_visual_sources_synced (last_synced_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS myblog_visual_pins (
  source_id VARCHAR(191) NOT NULL,
  pin_id VARCHAR(191) NOT NULL,
  pin_url TEXT NOT NULL,
  image_preview_url TEXT NOT NULL,
  title TEXT NULL,
  description TEXT NULL,
  board_id VARCHAR(191) NULL,
  position_index INT NOT NULL DEFAULT 0,
  downloaded TINYINT(1) NOT NULL DEFAULT 0,
  raw_json JSON NULL,
  first_seen_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (source_id, pin_id),
  INDEX idx_myblog_visual_pins_active (source_id, deleted_at, position_index),
  INDEX idx_myblog_visual_pins_seen (source_id, last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS myblog_visual_sync_runs (
  id VARCHAR(191) PRIMARY KEY,
  source_id VARCHAR(191) NOT NULL,
  provider VARCHAR(48) NOT NULL,
  status VARCHAR(32) NOT NULL,
  synced_items INT NOT NULL DEFAULT 0,
  active_items INT NOT NULL DEFAULT 0,
  snapshot_hash VARCHAR(64) NULL,
  error TEXT NULL,
  started_at DATETIME(3) NOT NULL,
  finished_at DATETIME(3) NULL,
  INDEX idx_myblog_visual_sync_runs_source_started (source_id, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO myblog_visual_sources
  (id, source_type, provider, source_url, board_id, provider_config_json, title, collection_title, partition_pattern_json, sync_interval_seconds, created_at, updated_at)
VALUES
  (
    'pinterest-saved-pins',
    'pinterest_saved',
    'pinterest_api',
    'https://www.pinterest.com/emptyinkstand/_pins/',
    '',
    NULL,
    'Pinterest Saved Pins',
    'Pinterest / Saved Pins',
    CAST('[6,4,9,12]' AS JSON),
    600,
    UTC_TIMESTAMP(3),
    UTC_TIMESTAMP(3)
  )
ON DUPLICATE KEY UPDATE
  source_type = VALUES(source_type),
  provider = VALUES(provider),
  source_url = VALUES(source_url),
  title = VALUES(title),
  collection_title = VALUES(collection_title),
  partition_pattern_json = VALUES(partition_pattern_json),
  sync_interval_seconds = VALUES(sync_interval_seconds),
  updated_at = UTC_TIMESTAMP(3);
