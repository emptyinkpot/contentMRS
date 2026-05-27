-- Ming maritime / tribute voyage register (郑和、永乐朝贡海洋史)
-- Tags: ming-maritime-context + creative-style

INSERT INTO vocabulary (content, type, category, tags, note)
VALUES
  ('宝船', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('永乐', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('朝贡', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('册封', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('市舶', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('下西洋', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('敕书', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('天妃', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('满剌加', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('锡兰', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('爪哇', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('榜葛剌', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('忽鲁谟斯', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('占城', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('暹罗', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('西洋', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('舟师', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('标指', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('针路', 'vocabulary', '明代海洋', CAST('["creative-style","ming-maritime-context","historical-term"]' AS JSON), 'creative-style import: 明代航海/朝贡语汇'),
  ('纲纪', 'vocabulary', '明代制度', CAST('["creative-style","ming-maritime-context","historical-narrative"]' AS JSON), 'creative-style import: 明代制度语汇')
ON DUPLICATE KEY UPDATE
  type = COALESCE(NULLIF(type, ''), VALUES(type)),
  category = COALESCE(NULLIF(category, ''), VALUES(category)),
  tags = CASE WHEN tags IS NULL THEN VALUES(tags) ELSE tags END,
  note = CASE
    WHEN note IS NULL OR note = '' THEN VALUES(note)
    WHEN note LIKE '%creative-style import:%' THEN note
    ELSE CONCAT(note, ' | ', VALUES(note))
  END,
  updated_at = CURRENT_TIMESTAMP;
