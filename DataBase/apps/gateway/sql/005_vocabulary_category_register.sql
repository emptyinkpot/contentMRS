-- Category -> lexicon register tags (replaces hardcoded CATEGORY_REGISTER_TAGS in app code).
CREATE TABLE IF NOT EXISTS vocabulary_category_register (
  category VARCHAR(64) NOT NULL PRIMARY KEY,
  tags JSON NOT NULL,
  note VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO vocabulary_category_register (category, tags, note) VALUES
  ('日方语境', CAST('["japanese-right-context"]' AS JSON), 'register map'),
  ('中方语境', CAST('["chinese-resistance-context"]' AS JSON), 'register map'),
  ('苏联语境', CAST('["left-soviet-context"]' AS JSON), 'register map'),
  ('古典语境', CAST('["classical-imperial-context"]' AS JSON), 'register map'),
  ('明代海洋', CAST('["ming-maritime-context"]' AS JSON), 'register map'),
  ('明代制度', CAST('["ming-maritime-context"]' AS JSON), 'register map'),
  ('宏大叙事', CAST('["historical-narrative"]' AS JSON), 'register map'),
  ('政权与制度', CAST('["historical-narrative"]' AS JSON), 'register map'),
  ('历史术语', CAST('["historical-term"]' AS JSON), 'register map'),
  ('比喻系统', CAST('["metaphor-system"]' AS JSON), 'register map'),
  ('象征物', CAST('["metaphor-system"]' AS JSON), 'register map'),
  ('情态', CAST('["emotional-register"]' AS JSON), 'register map'),
  ('动作', CAST('["action-image"]' AS JSON), 'register map'),
  ('语言', CAST('["author-active"]' AS JSON), 'register map'),
  ('物境', CAST('["material-detail"]' AS JSON), 'register map'),
  ('思辨', CAST('["author-active"]' AS JSON), 'register map'),
  ('社会', CAST('["author-active"]' AS JSON), 'register map'),
  ('语法', CAST('["author-active"]' AS JSON), 'register map')
ON DUPLICATE KEY UPDATE
  tags = VALUES(tags),
  note = VALUES(note),
  updated_at = CURRENT_TIMESTAMP;
