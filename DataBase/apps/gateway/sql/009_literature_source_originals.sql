SET @db_name := DATABASE();

SET @has_literature_category := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'literature'
    AND COLUMN_NAME = 'category'
);

SET @sql := IF(
  @has_literature_category = 0,
  'ALTER TABLE literature ADD COLUMN category VARCHAR(128) NULL AFTER author',
  'SELECT ''literature.category already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_literature_source := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'literature'
    AND COLUMN_NAME = 'source'
);

SET @sql := IF(
  @has_literature_source = 0,
  'ALTER TABLE literature ADD COLUMN source VARCHAR(1024) NULL AFTER content',
  'SELECT ''literature.source already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE literature MODIFY COLUMN content LONGTEXT NULL;

SET @has_literature_title_author_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'literature'
    AND INDEX_NAME = 'idx_literature_title_author'
);

SET @sql := IF(
  @has_literature_title_author_index = 0,
  'CREATE INDEX idx_literature_title_author ON literature (title, author)',
  'SELECT ''idx_literature_title_author already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_literature_category_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'literature'
    AND INDEX_NAME = 'idx_literature_category'
);

SET @sql := IF(
  @has_literature_category_index = 0,
  'CREATE INDEX idx_literature_category ON literature (category)',
  'SELECT ''idx_literature_category already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
