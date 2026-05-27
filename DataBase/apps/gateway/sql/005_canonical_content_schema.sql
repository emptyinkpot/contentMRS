CREATE TABLE IF NOT EXISTS author_profiles (
  id VARCHAR(128) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  stance TEXT NULL,
  voice_json JSON NOT NULL,
  status ENUM('active','retired') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_author_profiles_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS author_interest_clusters (
  id VARCHAR(128) NOT NULL,
  author_profile_id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  terms_json JSON NOT NULL,
  applies_to_json JSON NOT NULL,
  evidence_json JSON NULL,
  status ENUM('candidate','active','retired') NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_author_interest_clusters_profile (author_profile_id),
  KEY idx_author_interest_clusters_status (status),
  CONSTRAINT fk_author_interest_clusters_profile
    FOREIGN KEY (author_profile_id) REFERENCES author_profiles(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS author_lexicon_reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  author_profile_id VARCHAR(128) NOT NULL,
  term VARCHAR(255) NOT NULL,
  decision ENUM('candidate','approved_preferred','approved_banned','rejected') NOT NULL,
  source_kind VARCHAR(128) NOT NULL,
  source_ref VARCHAR(512) NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_author_lexicon_reviews_profile (author_profile_id),
  KEY idx_author_lexicon_reviews_term (term),
  KEY idx_author_lexicon_reviews_decision (decision),
  CONSTRAINT fk_author_lexicon_reviews_profile
    FOREIGN KEY (author_profile_id) REFERENCES author_profiles(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_assets (
  id VARCHAR(128) NOT NULL,
  kind ENUM('cover_image','comic_page','panel_crop','reference_image','audio','video','pdf','markdown_export','epub_export') NOT NULL,
  title VARCHAR(255) NULL,
  storage_provider VARCHAR(128) NOT NULL,
  storage_uri VARCHAR(1024) NOT NULL,
  mime_type VARCHAR(255) NULL,
  byte_size BIGINT UNSIGNED NULL,
  checksum_sha256 CHAR(64) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_content_assets_kind (kind),
  KEY idx_content_assets_storage_provider (storage_provider),
  UNIQUE KEY uq_content_assets_storage_uri (storage_provider, storage_uri(512))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_works (
  id VARCHAR(128) NOT NULL,
  kind ENUM('novel','fiction_series','blog_post','essay','current_affairs_commentary','historical_short_video','business_copywriting','comic_series','comic_one_shot','image_collection','manuscript') NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255) NULL,
  status ENUM('draft','active','reviewing','ready','published','retired') NOT NULL DEFAULT 'draft',
  author_profile_id VARCHAR(128) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_content_works_kind (kind),
  KEY idx_content_works_status (status),
  KEY idx_content_works_author_profile (author_profile_id),
  FULLTEXT KEY ft_content_works_title (title, subtitle),
  CONSTRAINT fk_content_works_author_profile
    FOREIGN KEY (author_profile_id) REFERENCES author_profiles(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_parts (
  id VARCHAR(128) NOT NULL,
  work_id VARCHAR(128) NOT NULL,
  parent_part_id VARCHAR(128) NULL,
  kind ENUM('volume','chapter','scene','article_section','script_segment','comic_episode','comic_page_ref','appendix') NOT NULL,
  part_order INT NOT NULL,
  title VARCHAR(255) NULL,
  status ENUM('draft','active','reviewing','ready','published','retired') NOT NULL DEFAULT 'draft',
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_content_parts_work_order (work_id, kind, part_order),
  KEY idx_content_parts_work (work_id),
  KEY idx_content_parts_parent (parent_part_id),
  KEY idx_content_parts_status (status),
  CONSTRAINT fk_content_parts_work
    FOREIGN KEY (work_id) REFERENCES content_works(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_content_parts_parent
    FOREIGN KEY (parent_part_id) REFERENCES content_parts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_blocks (
  id VARCHAR(128) NOT NULL,
  work_id VARCHAR(128) NOT NULL,
  part_id VARCHAR(128) NULL,
  asset_id VARCHAR(128) NULL,
  kind ENUM('paragraph','heading','quote','image','comic_panel','dialogue','caption','page_break','evidence_citation','semantic_unit_ref','prompt_context') NOT NULL,
  block_order INT NOT NULL,
  text_content MEDIUMTEXT NULL,
  payload_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_content_blocks_part_order (part_id, block_order),
  KEY idx_content_blocks_work (work_id),
  KEY idx_content_blocks_part (part_id),
  KEY idx_content_blocks_asset (asset_id),
  KEY idx_content_blocks_kind (kind),
  FULLTEXT KEY ft_content_blocks_text (text_content),
  CONSTRAINT fk_content_blocks_work
    FOREIGN KEY (work_id) REFERENCES content_works(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_content_blocks_part
    FOREIGN KEY (part_id) REFERENCES content_parts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_content_blocks_asset
    FOREIGN KEY (asset_id) REFERENCES content_assets(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_relations (
  id VARCHAR(128) NOT NULL,
  from_entity_type ENUM('content_work','content_part','content_block','content_asset','author_profile','semantic_unit','character','publication_target','publication_record') NOT NULL,
  from_entity_id VARCHAR(128) NOT NULL,
  relation_type ENUM('contains','references','uses_style','uses_evidence','depicts_character','has_asset','published_as','derived_from','continues','contrasts_with') NOT NULL,
  to_entity_type ENUM('content_work','content_part','content_block','content_asset','author_profile','semantic_unit','character','publication_target','publication_record') NOT NULL,
  to_entity_id VARCHAR(128) NOT NULL,
  payload_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_content_relations_edge (from_entity_type, from_entity_id, relation_type, to_entity_type, to_entity_id),
  KEY idx_content_relations_from (from_entity_type, from_entity_id),
  KEY idx_content_relations_to (to_entity_type, to_entity_id),
  KEY idx_content_relations_type (relation_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publication_targets (
  id VARCHAR(128) NOT NULL,
  platform VARCHAR(128) NOT NULL,
  account_identity VARCHAR(255) NOT NULL,
  local_work_id VARCHAR(128) NOT NULL,
  remote_work_id VARCHAR(255) NULL,
  status ENUM('active','paused','retired') NOT NULL DEFAULT 'active',
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_publication_targets_remote (platform, account_identity, remote_work_id),
  KEY idx_publication_targets_work (local_work_id),
  KEY idx_publication_targets_platform (platform),
  CONSTRAINT fk_publication_targets_work
    FOREIGN KEY (local_work_id) REFERENCES content_works(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publication_records (
  id VARCHAR(128) NOT NULL,
  target_id VARCHAR(128) NOT NULL,
  content_part_id VARCHAR(128) NULL,
  action VARCHAR(128) NOT NULL,
  remote_part_id VARCHAR(255) NULL,
  observed_status VARCHAR(128) NOT NULL,
  idempotency_key VARCHAR(191) NOT NULL,
  result_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_publication_records_idempotency (idempotency_key),
  KEY idx_publication_records_target (target_id),
  KEY idx_publication_records_part (content_part_id),
  KEY idx_publication_records_observed_status (observed_status),
  CONSTRAINT fk_publication_records_target
    FOREIGN KEY (target_id) REFERENCES publication_targets(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_publication_records_part
    FOREIGN KEY (content_part_id) REFERENCES content_parts(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO author_profiles
  (id, display_name, stance, voice_json, status)
VALUES
  (
    'emptyinkpot_primary_author',
    'emptyinkpot primary author',
    '有限视角、制度压力、物质细节和历史冷感优先；不以作者口吻裁判人物。',
    CAST('["冷静","克制","制度性压迫感","文学性但不空泛","客观事实并置"]' AS JSON),
    'active'
  )
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  stance = VALUES(stance),
  voice_json = VALUES(voice_json),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO author_interest_clusters
  (id, author_profile_id, name, terms_json, applies_to_json, evidence_json, status)
VALUES
  (
    'interest_imperial_geopolitics',
    'emptyinkpot_primary_author',
    '帝国地缘政治',
    CAST('["满蒙","生命线","绝对防卫圈","特殊权益","总力战","生存空间"]' AS JSON),
    CAST('["novel","historical_short_video","current_affairs_commentary"]' AS JSON),
    CAST('{"source":"creative_style_protocols.payload_json.interestClusters"}' AS JSON),
    'active'
  ),
  (
    'interest_institutional_decay',
    'emptyinkpot_primary_author',
    '制度腐败与秩序崩塌',
    CAST('["王纲解纽","礼崩乐坏","痼疾","毒瘤","瓦砾","基石"]' AS JSON),
    CAST('["novel","historical_short_video","current_affairs_commentary"]' AS JSON),
    CAST('{"source":"creative_style_protocols.payload_json.interestClusters"}' AS JSON),
    'active'
  ),
  (
    'interest_war_mobilization',
    'emptyinkpot_primary_author',
    '战争动员与资源压力',
    CAST('["统制","戡乱","绥靖","焦土抗战","持久战","空间换时间"]' AS JSON),
    CAST('["novel","historical_short_video"]' AS JSON),
    CAST('{"source":"creative_style_protocols.payload_json.interestClusters"}' AS JSON),
    'active'
  ),
  (
    'interest_engineering_metaphor',
    'emptyinkpot_primary_author',
    '工程与水文比喻',
    CAST('["轴承","齿轮","熔炉","暗流","堰塞湖","支流"]' AS JSON),
    CAST('["novel","current_affairs_commentary","business_copywriting"]' AS JSON),
    CAST('{"source":"creative_style_protocols.payload_json.interestClusters"}' AS JSON),
    'active'
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  terms_json = VALUES(terms_json),
  applies_to_json = VALUES(applies_to_json),
  evidence_json = VALUES(evidence_json),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
