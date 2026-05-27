CREATE TABLE IF NOT EXISTS semantic_units (
  id VARCHAR(128) NOT NULL,
  source_id VARCHAR(128) NULL,
  source_title VARCHAR(255) NOT NULL,
  source_author VARCHAR(255) NULL,
  source_locator VARCHAR(255) NULL,
  excerpt TEXT NOT NULL,
  summary TEXT NULL,
  status ENUM('candidate','active','retired') NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_semantic_units_source (source_id),
  KEY idx_semantic_units_status (status),
  FULLTEXT KEY ft_semantic_units_text (source_title, excerpt, summary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS semantic_tag_taxonomy (
  id VARCHAR(128) NOT NULL,
  tag_layer ENUM('image','concept','civilization','emotion','narrative_function','style','usable_for','narrative_position') NOT NULL,
  tag_value VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status ENUM('candidate','active','retired') NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_semantic_tag_layer_value (tag_layer, tag_value),
  KEY idx_semantic_tag_layer (tag_layer),
  KEY idx_semantic_tag_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS semantic_unit_tags (
  unit_id VARCHAR(128) NOT NULL,
  tag_id VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (unit_id, tag_id),
  KEY idx_semantic_unit_tags_tag (tag_id),
  CONSTRAINT fk_semantic_unit_tags_unit
    FOREIGN KEY (unit_id) REFERENCES semantic_units(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_semantic_unit_tags_tag
    FOREIGN KEY (tag_id) REFERENCES semantic_tag_taxonomy(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS semantic_relations (
  id VARCHAR(128) NOT NULL,
  from_unit_id VARCHAR(128) NULL,
  from_tag_id VARCHAR(128) NULL,
  relation_type ENUM('resonates_with','contrasts_with','develops_into','materializes','supports_entrance','belongs_to_civilization','usable_as') NOT NULL,
  to_unit_id VARCHAR(128) NULL,
  to_tag_id VARCHAR(128) NULL,
  description TEXT NULL,
  status ENUM('candidate','active','retired') NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_semantic_relations_from_unit (from_unit_id),
  KEY idx_semantic_relations_from_tag (from_tag_id),
  KEY idx_semantic_relations_to_unit (to_unit_id),
  KEY idx_semantic_relations_to_tag (to_tag_id),
  KEY idx_semantic_relations_type (relation_type),
  CONSTRAINT fk_semantic_relations_from_unit
    FOREIGN KEY (from_unit_id) REFERENCES semantic_units(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_semantic_relations_from_tag
    FOREIGN KEY (from_tag_id) REFERENCES semantic_tag_taxonomy(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_semantic_relations_to_unit
    FOREIGN KEY (to_unit_id) REFERENCES semantic_units(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_semantic_relations_to_tag
    FOREIGN KEY (to_tag_id) REFERENCES semantic_tag_taxonomy(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS semantic_unit_promotions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unit_id VARCHAR(128) NOT NULL,
  from_status VARCHAR(32) NOT NULL,
  to_status VARCHAR(32) NOT NULL,
  reason TEXT NOT NULL,
  promoted_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_semantic_unit_promotions_unit (unit_id),
  CONSTRAINT fk_semantic_unit_promotions_unit
    FOREIGN KEY (unit_id) REFERENCES semantic_units(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO semantic_tag_taxonomy
  (id, tag_layer, tag_value, description, status)
VALUES
  ('concept_identity_instability', 'concept', '身份不稳定', '命名、归属和自我理解发生摇晃。', 'active'),
  ('concept_civilization_crack', 'concept', '文明裂缝', '同一符号暴露不同文明位置之间的断裂。', 'active'),
  ('concept_unreachable_beauty', 'concept', '不可抵达的美', '美作为观念高悬，现实无法与之统一。', 'active'),
  ('concept_modern_fatigue', 'concept', '近代疲劳', '近代化压力下的精神疲惫和认知错位。', 'active'),
  ('concept_false_divinity', 'concept', '伪神性', '被制造出来的神圣姿态在现实压力下暴露人造本质。', 'active'),
  ('concept_authority_collapse', 'concept', '权威崩塌', '权力、信仰或制度人格在公开场域失去支配力。', 'active'),
  ('image_name', 'image', '称谓', '以名称、译名、称号或外部命名作为入口。', 'active'),
  ('image_kinkaku', 'image', '金阁', '作为美、距离和毁灭冲动的观念物。', 'active'),
  ('image_dusk', 'image', '黄昏', '用于疲惫、过渡、衰落和未完成的时间感。', 'active'),
  ('image_kneeling_body', 'image', '跪伏的身体', '身体姿态从支配转为乞求，成为权威失效的可见证据。', 'active'),
  ('civilization_east_asia_order', 'civilization', '东亚秩序', '东亚内部的文明、朝贡、近代国家与外部凝视关系。', 'active'),
  ('civilization_japan_modernity', 'civilization', '日本近代', '日本近代化焦虑、审美紧张和制度压力。', 'active'),
  ('narrative_image_concept_entry', 'narrative_function', '意象-概念入口', '从具体符号进入概念和文明问题。', 'active'),
  ('narrative_concept_materialization', 'narrative_function', '观念物化', '让建筑、器物或动作承担哲学观念。', 'active'),
  ('narrative_authority_unmasking', 'narrative_function', '权威卸妆', '让宏大身份通过具体丑态失去神圣外壳。', 'active'),
  ('emotion_disgust', 'emotion', '厌弃', '由幻灭、丑态和公开失格引发的冷硬排斥。', 'active'),
  ('position_opening', 'narrative_position', 'opening', '适合开篇。', 'active'),
  ('position_transition', 'narrative_position', 'transition', '适合转折。', 'active'),
  ('position_climax', 'narrative_position', 'climax', '适合高潮揭露。', 'active'),
  ('position_fadeout', 'narrative_position', 'fadeout', '适合收尾悬置。', 'active'),
  ('style_souseki', 'style', '漱石式', '意识裂缝、文明疲劳和认知入口。', 'active'),
  ('style_mishima', 'style', '三岛式', '观念物化、高张力和冷美学。', 'active')
ON DUPLICATE KEY UPDATE
  tag_layer = VALUES(tag_layer),
  tag_value = VALUES(tag_value),
  description = VALUES(description),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO semantic_units
  (id, source_id, source_title, source_author, source_locator, excerpt, summary, status)
VALUES
  ('sem_name_china_khitai_shina', 'source_manual_civilization_names', 'China、契丹、支那与文明命名', 'operator', 'manual seed', 'China、契丹、支那、南越这类称谓不是普通名词，而是外部凝视、历史路径和文明位置的残留。', '用于从名称漂移进入身份不稳定和文明裂缝。', 'active'),
  ('sem_kinkaku_unreachable_beauty', 'source_manual_mishima_kinkakuji', '金阁寺与不可抵达的美', 'operator', 'manual seed', '金阁不是单纯建筑，而是绝对美被物化后对现实形成的审判。', '用于观念物化、美与现实失败、毁灭冲动等语义路径。', 'active'),
  ('sem_dusk_modern_fatigue', 'source_manual_souseki_modernity', '黄昏与近代疲劳', 'operator', 'manual seed', '黄昏、静默、走廊和冷茶这类细节可以先建立精神空间，再让近代化不适慢慢显影。', '用于漱石式意识裂缝、文明疲劳和延迟点题。', 'active'),
  ('sem_false_god_authority_collapse', 'source_manual_authority_unmasking', '伪神权威崩塌与信仰幻灭', 'operator', 'manual seed', '被供奉为神的人一旦跪伏求饶，鼻涕、眼泪和失禁都会把神圣身份拉回凡人的丑态。', '用于伪神性、权威崩塌、信徒幻灭和公开揭露场景。', 'active')
ON DUPLICATE KEY UPDATE
  source_id = VALUES(source_id),
  source_title = VALUES(source_title),
  source_author = VALUES(source_author),
  source_locator = VALUES(source_locator),
  excerpt = VALUES(excerpt),
  summary = VALUES(summary),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;

INSERT IGNORE INTO semantic_unit_tags (unit_id, tag_id)
VALUES
  ('sem_name_china_khitai_shina', 'concept_identity_instability'),
  ('sem_name_china_khitai_shina', 'concept_civilization_crack'),
  ('sem_name_china_khitai_shina', 'image_name'),
  ('sem_name_china_khitai_shina', 'civilization_east_asia_order'),
  ('sem_name_china_khitai_shina', 'narrative_image_concept_entry'),
  ('sem_name_china_khitai_shina', 'position_opening'),
  ('sem_kinkaku_unreachable_beauty', 'concept_unreachable_beauty'),
  ('sem_kinkaku_unreachable_beauty', 'image_kinkaku'),
  ('sem_kinkaku_unreachable_beauty', 'civilization_japan_modernity'),
  ('sem_kinkaku_unreachable_beauty', 'narrative_concept_materialization'),
  ('sem_kinkaku_unreachable_beauty', 'style_mishima'),
  ('sem_kinkaku_unreachable_beauty', 'position_transition'),
  ('sem_dusk_modern_fatigue', 'concept_modern_fatigue'),
  ('sem_dusk_modern_fatigue', 'image_dusk'),
  ('sem_dusk_modern_fatigue', 'civilization_japan_modernity'),
  ('sem_dusk_modern_fatigue', 'narrative_image_concept_entry'),
  ('sem_dusk_modern_fatigue', 'style_souseki'),
  ('sem_dusk_modern_fatigue', 'position_opening'),
  ('sem_dusk_modern_fatigue', 'position_fadeout'),
  ('sem_false_god_authority_collapse', 'concept_false_divinity'),
  ('sem_false_god_authority_collapse', 'concept_authority_collapse'),
  ('sem_false_god_authority_collapse', 'image_kneeling_body'),
  ('sem_false_god_authority_collapse', 'narrative_authority_unmasking'),
  ('sem_false_god_authority_collapse', 'emotion_disgust'),
  ('sem_false_god_authority_collapse', 'position_climax');

INSERT INTO semantic_relations
  (id, from_unit_id, from_tag_id, relation_type, to_unit_id, to_tag_id, description, status)
VALUES
  ('rel_name_to_identity_instability', 'sem_name_china_khitai_shina', NULL, 'supports_entrance', NULL, 'concept_identity_instability', '名称漂移支撑身份不稳定的意象-概念入口。', 'active'),
  ('rel_kinkaku_materializes_beauty', 'sem_kinkaku_unreachable_beauty', NULL, 'materializes', NULL, 'concept_unreachable_beauty', '金阁把不可抵达的美变成可见建筑。', 'active'),
  ('rel_dusk_to_modern_fatigue', 'sem_dusk_modern_fatigue', NULL, 'supports_entrance', NULL, 'concept_modern_fatigue', '黄昏和静默细节支撑近代疲劳入口。', 'active'),
  ('rel_false_god_to_authority_collapse', 'sem_false_god_authority_collapse', NULL, 'develops_into', NULL, 'concept_authority_collapse', '伪神性在公开露怯后发展为权威崩塌。', 'active')
ON DUPLICATE KEY UPDATE
  from_unit_id = VALUES(from_unit_id),
  from_tag_id = VALUES(from_tag_id),
  relation_type = VALUES(relation_type),
  to_unit_id = VALUES(to_unit_id),
  to_tag_id = VALUES(to_tag_id),
  description = VALUES(description),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;
