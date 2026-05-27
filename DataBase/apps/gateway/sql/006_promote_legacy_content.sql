INSERT INTO content_works
  (id, kind, title, subtitle, status, author_profile_id, metadata_json, created_at, updated_at)
SELECT
  CONCAT('legacy_work_', w.id),
  'novel',
  w.title,
  NULL,
  CASE w.status
    WHEN 'ongoing' THEN 'active'
    WHEN 'draft' THEN 'draft'
  END,
  'emptyinkpot_primary_author',
  JSON_OBJECT(
    'source', 'works',
    'sourceId', w.id,
    'description', w.description,
    'alternativeTitles', w.alternative_titles,
    'tags', w.tags,
    'style', w.style,
    'platform', w.platform,
    'targetChapters', w.target_chapters,
    'currentChapters', w.current_chapters
  ),
  COALESCE(w.created_at, CURRENT_TIMESTAMP),
  COALESCE(w.updated_at, CURRENT_TIMESTAMP)
FROM works w
WHERE w.status IN ('ongoing', 'draft')
ON DUPLICATE KEY UPDATE
  kind = VALUES(kind),
  title = VALUES(title),
  subtitle = VALUES(subtitle),
  status = VALUES(status),
  author_profile_id = VALUES(author_profile_id),
  metadata_json = VALUES(metadata_json),
  updated_at = VALUES(updated_at);

INSERT INTO content_works
  (id, kind, title, subtitle, status, author_profile_id, metadata_json, created_at, updated_at)
SELECT
  CONCAT('fanqie_work_', fw.work_id),
  'novel',
  fw.title,
  NULL,
  CASE fw.status
    WHEN '已签约' THEN 'published'
    WHEN '连载中' THEN 'active'
    WHEN '已停止推荐' THEN 'retired'
  END,
  'emptyinkpot_primary_author',
  JSON_OBJECT(
    'source', 'fanqie_works',
    'sourceId', fw.id,
    'accountIdentity', fw.account_id,
    'remoteWorkId', fw.work_id,
    'author', fw.author,
    'coverUrl', fw.cover_url,
    'chapterCount', fw.chapter_count,
    'wordCount', fw.word_count,
    'remoteStatus', fw.status,
    'lastSyncedAt', fw.last_synced_at
  ),
  COALESCE(fw.created_at, CURRENT_TIMESTAMP),
  COALESCE(fw.updated_at, CURRENT_TIMESTAMP)
FROM fanqie_works fw
LEFT JOIN works w
  ON w.title COLLATE utf8mb4_unicode_ci = fw.title COLLATE utf8mb4_unicode_ci
WHERE w.id IS NULL
  AND fw.status IN ('已签约', '连载中', '已停止推荐')
ON DUPLICATE KEY UPDATE
  kind = VALUES(kind),
  title = VALUES(title),
  subtitle = VALUES(subtitle),
  status = VALUES(status),
  author_profile_id = VALUES(author_profile_id),
  metadata_json = VALUES(metadata_json),
  updated_at = VALUES(updated_at);

INSERT INTO content_parts
  (id, work_id, parent_part_id, kind, part_order, title, status, metadata_json, created_at, updated_at)
SELECT
  CONCAT('legacy_chapter_', c.id),
  CONCAT('legacy_work_', c.work_id),
  NULL,
  'chapter',
  c.chapter_number,
  c.title,
  CASE c.status
    WHEN 'published' THEN 'published'
    WHEN 'audited' THEN 'ready'
    WHEN 'first_draft' THEN 'draft'
    WHEN 'outline' THEN 'draft'
  END,
  JSON_OBJECT(
    'source', 'chapters',
    'sourceId', c.id,
    'volumeNumber', c.volume_number,
    'chapterNumber', c.chapter_number,
    'wordCount', c.word_count,
    'auditStatus', c.audit_status,
    'auditIssues', c.audit_issues,
    'publishedAt', c.published_at,
    'auditScore', c.audit_score,
    'suggestedAction', c.suggested_action,
    'auditedAt', c.audited_at
  ),
  COALESCE(c.created_at, CURRENT_TIMESTAMP),
  COALESCE(c.updated_at, CURRENT_TIMESTAMP)
FROM chapters c
JOIN works w ON w.id = c.work_id
WHERE c.status IN ('published', 'audited', 'first_draft', 'outline')
ON DUPLICATE KEY UPDATE
  parent_part_id = VALUES(parent_part_id),
  kind = VALUES(kind),
  part_order = VALUES(part_order),
  title = VALUES(title),
  status = VALUES(status),
  metadata_json = VALUES(metadata_json),
  updated_at = VALUES(updated_at);

INSERT INTO content_blocks
  (id, work_id, part_id, asset_id, kind, block_order, text_content, payload_json, created_at, updated_at)
SELECT
  CONCAT('legacy_chapter_', c.id, '_body'),
  CONCAT('legacy_work_', c.work_id),
  CONCAT('legacy_chapter_', c.id),
  NULL,
  'paragraph',
  1,
  c.content,
  JSON_OBJECT(
    'source', 'chapters.content',
    'sourceId', c.id,
    'chapterNumber', c.chapter_number,
    'wordCount', c.word_count
  ),
  COALESCE(c.created_at, CURRENT_TIMESTAMP),
  COALESCE(c.updated_at, CURRENT_TIMESTAMP)
FROM chapters c
JOIN works w ON w.id = c.work_id
WHERE c.status IN ('published', 'audited', 'first_draft', 'outline')
  AND c.content IS NOT NULL
  AND c.content <> ''
ON DUPLICATE KEY UPDATE
  asset_id = VALUES(asset_id),
  kind = VALUES(kind),
  block_order = VALUES(block_order),
  text_content = VALUES(text_content),
  payload_json = VALUES(payload_json),
  updated_at = VALUES(updated_at);

INSERT INTO content_relations
  (id, from_entity_type, from_entity_id, relation_type, to_entity_type, to_entity_id, payload_json)
SELECT
  CONCAT('rel_legacy_work_', w.id, '_author_emptyinkpot_primary_author'),
  'content_work',
  CONCAT('legacy_work_', w.id),
  'uses_style',
  'author_profile',
  'emptyinkpot_primary_author',
  JSON_OBJECT('source', 'works', 'sourceId', w.id)
FROM works w
ON DUPLICATE KEY UPDATE
  payload_json = VALUES(payload_json);

INSERT INTO content_relations
  (id, from_entity_type, from_entity_id, relation_type, to_entity_type, to_entity_id, payload_json)
SELECT
  CONCAT('rel_legacy_chapter_', c.id, '_continues_legacy_work_', c.work_id),
  'content_part',
  CONCAT('legacy_chapter_', c.id),
  'continues',
  'content_work',
  CONCAT('legacy_work_', c.work_id),
  JSON_OBJECT('source', 'chapters', 'sourceId', c.id, 'chapterNumber', c.chapter_number)
FROM chapters c
JOIN works w ON w.id = c.work_id
ON DUPLICATE KEY UPDATE
  payload_json = VALUES(payload_json);

INSERT INTO content_relations
  (id, from_entity_type, from_entity_id, relation_type, to_entity_type, to_entity_id, payload_json)
SELECT
  CONCAT('rel_legacy_work_', ch.work_id, '_character_', ch.id),
  'content_work',
  CONCAT('legacy_work_', ch.work_id),
  'depicts_character',
  'character',
  CAST(ch.id AS CHAR),
  JSON_OBJECT('source', 'characters', 'sourceId', ch.id, 'name', ch.name, 'roleType', ch.role_type)
FROM characters ch
JOIN works w ON w.id = ch.work_id
ON DUPLICATE KEY UPDATE
  payload_json = VALUES(payload_json);

INSERT INTO publication_targets
  (id, platform, account_identity, local_work_id, remote_work_id, status, metadata_json, created_at, updated_at)
SELECT
  CONCAT('fanqie_target_', fw.id),
  'fanqie',
  fw.account_id,
  IF(w.id IS NOT NULL, CONCAT('legacy_work_', w.id), CONCAT('fanqie_work_', fw.work_id)),
  fw.work_id,
  CASE fw.status
    WHEN '已签约' THEN 'active'
    WHEN '连载中' THEN 'active'
    WHEN '已停止推荐' THEN 'retired'
  END,
  JSON_OBJECT(
    'source', 'fanqie_works',
    'sourceId', fw.id,
    'title', fw.title,
    'author', fw.author,
    'coverUrl', fw.cover_url,
    'chapterCount', fw.chapter_count,
    'wordCount', fw.word_count,
    'remoteStatus', fw.status,
    'lastSyncedAt', fw.last_synced_at
  ),
  COALESCE(fw.created_at, CURRENT_TIMESTAMP),
  COALESCE(fw.updated_at, CURRENT_TIMESTAMP)
FROM fanqie_works fw
LEFT JOIN works w
  ON w.title COLLATE utf8mb4_unicode_ci = fw.title COLLATE utf8mb4_unicode_ci
WHERE fw.status IN ('已签约', '连载中', '已停止推荐')
ON DUPLICATE KEY UPDATE
  local_work_id = VALUES(local_work_id),
  remote_work_id = VALUES(remote_work_id),
  status = VALUES(status),
  metadata_json = VALUES(metadata_json),
  updated_at = VALUES(updated_at);

INSERT INTO content_relations
  (id, from_entity_type, from_entity_id, relation_type, to_entity_type, to_entity_id, payload_json)
SELECT
  CONCAT('rel_pub_', pt.id),
  'content_work',
  pt.local_work_id,
  'published_as',
  'publication_target',
  pt.id,
  JSON_OBJECT('platform', pt.platform, 'remoteWorkId', pt.remote_work_id)
FROM publication_targets pt
ON DUPLICATE KEY UPDATE
  payload_json = VALUES(payload_json);
