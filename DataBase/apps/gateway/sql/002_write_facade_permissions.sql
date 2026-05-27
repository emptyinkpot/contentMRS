-- Grants required for the DataBase Gateway write facade.
-- Run this as a MySQL administrator after reviewing the target tables.

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`notes`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`experience_records`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`vocabulary`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`banned_words`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`content_works`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`content_parts`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`content_blocks`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`content_assets`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`content_relations`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`publication_targets`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`fanqie_works`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`fanqie_remote_chapter_snapshots`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`fanqie_remote_chapter_detail_snapshots`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE
ON `cloudbase-4glvyyq9f61b19cd`.`fanqie_accounts`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE
ON `cloudbase-4glvyyq9f61b19cd`.`fanqie_account_sessions`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`works`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`chapters`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`volume_outlines`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`chapter_outlines`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`characters`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`world_settings`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`story_events`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`character_growth`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`important_items`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`semantic_units`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`semantic_tag_taxonomy`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`semantic_unit_tags`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`openlist_storage_mounts`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`openlist_file_targets`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`myblog_reader_memory`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`myblog_reader_highlights`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`myblog_visual_sources`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`myblog_visual_pins`
TO `database_content_rw`@`%`;

GRANT SELECT, INSERT, UPDATE, DELETE
ON `cloudbase-4glvyyq9f61b19cd`.`myblog_visual_sync_runs`
TO `database_content_rw`@`%`;

FLUSH PRIVILEGES;
