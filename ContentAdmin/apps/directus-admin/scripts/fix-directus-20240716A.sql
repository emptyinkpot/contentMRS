ALTER TABLE directus_files ADD COLUMN uploaded_on TIMESTAMP NULL DEFAULT NULL;
UPDATE directus_files SET uploaded_on = created_on WHERE uploaded_on IS NULL;
INSERT IGNORE INTO directus_migrations (version, name) VALUES ('20240716A', 'Update Files Date Fields');
