CREATE TABLE IF NOT EXISTS openlist_storage_mounts (
  id VARCHAR(128) NOT NULL,
  mount_path VARCHAR(512) NOT NULL,
  driver VARCHAR(128) NULL,
  remark VARCHAR(512) NULL,
  openlist_status VARCHAR(128) NULL,
  disabled TINYINT(1) NOT NULL DEFAULT 0,
  source VARCHAR(128) NOT NULL DEFAULT 'openlist',
  metadata_json JSON NULL,
  last_synced_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_openlist_storage_mounts_mount_path (mount_path),
  KEY idx_openlist_storage_mounts_driver (driver),
  KEY idx_openlist_storage_mounts_disabled (disabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS openlist_file_targets (
  id VARCHAR(128) NOT NULL,
  provider VARCHAR(128) NOT NULL DEFAULT 'openlist',
  purpose VARCHAR(128) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  mount_path VARCHAR(512) NOT NULL,
  remote_dir VARCHAR(1024) NOT NULL,
  local_cache_path VARCHAR(1024) NULL,
  status ENUM('active','paused','retired') NOT NULL DEFAULT 'active',
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_openlist_file_targets_provider_remote (provider, remote_dir(512)),
  KEY idx_openlist_file_targets_provider (provider),
  KEY idx_openlist_file_targets_purpose (purpose),
  KEY idx_openlist_file_targets_status (status),
  KEY idx_openlist_file_targets_mount_path (mount_path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO openlist_storage_mounts
  (id, mount_path, driver, remark, openlist_status, disabled, source, metadata_json, last_synced_at)
VALUES
  (
    'quark-drive',
    '/夸克网盘',
    'Quark',
    'Quark Netdisk',
    'work',
    0,
    'mortis-private-openlist-blog-storage',
    CAST('{"truth":"mounted_backend","accessProjection":"openlist","note":"OpenList 是访问投影，文件本体真相属于夸克网盘挂载后端。"}' AS JSON),
    CURRENT_TIMESTAMP
  )
ON DUPLICATE KEY UPDATE
  driver = VALUES(driver),
  remark = VALUES(remark),
  openlist_status = VALUES(openlist_status),
  disabled = VALUES(disabled),
  source = VALUES(source),
  metadata_json = VALUES(metadata_json),
  last_synced_at = VALUES(last_synced_at),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO openlist_file_targets
  (id, provider, purpose, display_name, mount_path, remote_dir, local_cache_path, status, metadata_json)
VALUES
  (
    'mortis-ai-society',
    'openlist',
    'mortis_export',
    'Mortis AI Society 夸克网盘目标',
    '/夸克网盘',
    '/夸克网盘/Mortis-AI-Society',
    '/srv/multica/openlist-export',
    'active',
    CAST('{"backend":"quark","accessProjection":"openlist","verifiedProbeFile":"/夸克网盘/Mortis-AI-Society/_probe.json","localCacheOnly":true,"source":"E:/My Project/mortis-multica-source/docs/private-openlist-blog-storage.json"}' AS JSON)
  )
ON DUPLICATE KEY UPDATE
  provider = VALUES(provider),
  purpose = VALUES(purpose),
  display_name = VALUES(display_name),
  mount_path = VALUES(mount_path),
  remote_dir = VALUES(remote_dir),
  local_cache_path = VALUES(local_cache_path),
  status = VALUES(status),
  metadata_json = VALUES(metadata_json),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO openlist_file_targets
  (id, provider, purpose, display_name, mount_path, remote_dir, local_cache_path, status, metadata_json)
VALUES
  (
    'myblog-books-original',
    'openlist',
    'myblog_books',
    'MyBlog 原始书籍目录',
    '/夸克网盘',
    '/Obsidian/docs/books/original',
    NULL,
    'active',
    CAST('{"backend":"quark","accessProjection":"openlist","consumer":"MyBlog","projection":"public-data/books/books-index.json","note":"DataBase owns the target id and remote directory; MyBlog only materializes a static public books index."}' AS JSON)
  )
ON DUPLICATE KEY UPDATE
  provider = VALUES(provider),
  purpose = VALUES(purpose),
  display_name = VALUES(display_name),
  mount_path = VALUES(mount_path),
  remote_dir = VALUES(remote_dir),
  local_cache_path = VALUES(local_cache_path),
  status = VALUES(status),
  metadata_json = VALUES(metadata_json),
  updated_at = CURRENT_TIMESTAMP;
