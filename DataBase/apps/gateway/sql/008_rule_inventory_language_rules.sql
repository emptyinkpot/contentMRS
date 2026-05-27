INSERT INTO creative_quality_rules
  (id, protocol_id, rule_type, severity, rule_text, check_hint)
VALUES
  (
    'LANG-PUNCT-001',
    'immersive_historical_synthetic_narrative',
    'language',
    'block',
    '小说正文禁用小括号、冒号和破折号；不得用括号补充、冒号解释或破折号插入修饰来替代场景行动。',
    'detector=punctuation_scan; banned=（,）,(:),：,:,——,--,—; enforcement=generation_quality_gate'
  ),
  (
    'LANG-ASCII-001',
    'immersive_historical_synthetic_narrative',
    'language',
    'block',
    '小说正文不得出现孤立英文 token、乱码、JSON 残片、Markdown 代码块或不可见控制字符。',
    'detector=ascii_mojibake_scan; patterns=latin_token,mojibake,replacement_char,code_fence,json_fragment; enforcement=generation_quality_gate'
  ),
  (
    'LANG-EURO-001',
    'immersive_historical_synthetic_narrative',
    'language',
    'block',
    '小说正文禁止欧化中文句式，包括被字所字结构、进行式名词化、通过来、对于而言、基于、具有性、之一、其之、作为一个等翻译腔。',
    'detector=euro_syntax_scan; enforcement=generation_quality_gate'
  ),
  (
    'CORPUS-IMITATION-001',
    'immersive_historical_synthetic_narrative',
    'corpus',
    'block',
    '语料只能化用意象、句法节奏、语义姿态、钩子和景物功能；禁止整句复写、资料摘抄或同义词替换式改写。',
    'detector=corpus_imitation_boundary; enforcement=prompt_contract_and_review_gate'
  ),
  (
    'NARRATIVE-DELTA-001',
    'immersive_historical_synthetic_narrative',
    'narrative',
    'block',
    '小说章节必须发生不可逆变化，至少改变人物选择、关系状态、物证位置、势力信息或身体状态之一。',
    'detector=narrative_delta_scan; enforcement=generation_quality_gate'
  ),
  (
    'NARRATIVE-SCENERY-HOOK-001',
    'immersive_historical_synthetic_narrative',
    'narrative',
    'warn',
    '景物描写必须承担势力、历史、身体代价或观念压力；钩子应由物件、称谓、方位、身体变化或未解释的证据承担。',
    'detector=scenery_hook_scan; enforcement=prompt_contract_and_warning_gate'
  )
ON DUPLICATE KEY UPDATE
  protocol_id = VALUES(protocol_id),
  rule_type = VALUES(rule_type),
  severity = VALUES(severity),
  rule_text = VALUES(rule_text),
  check_hint = VALUES(check_hint),
  updated_at = CURRENT_TIMESTAMP;
