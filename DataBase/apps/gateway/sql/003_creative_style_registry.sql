CREATE TABLE IF NOT EXISTS creative_style_protocols (
  id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(128) NOT NULL,
  status ENUM('active','retired') NOT NULL DEFAULT 'active',
  perspective_rule TEXT NULL,
  tone_rule TEXT NULL,
  execution_rule TEXT NULL,
  payload_json JSON NULL,
  source_doc VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_creative_style_protocols_domain (domain),
  KEY idx_creative_style_protocols_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS creative_style_modules (
  code VARCHAR(32) NOT NULL,
  parent_code VARCHAR(32) NULL,
  category VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  module_kind VARCHAR(128) NOT NULL,
  description TEXT NULL,
  payload_json JSON NULL,
  source_doc VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (code),
  KEY idx_creative_style_modules_parent (parent_code),
  KEY idx_creative_style_modules_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS creative_editing_steps (
  protocol_id VARCHAR(128) NOT NULL,
  step_order INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  task_summary TEXT NOT NULL,
  required_report_json JSON NOT NULL,
  hard_rules_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (protocol_id, step_order),
  CONSTRAINT fk_creative_editing_steps_protocol
    FOREIGN KEY (protocol_id) REFERENCES creative_style_protocols(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS creative_quality_rules (
  id VARCHAR(128) NOT NULL,
  protocol_id VARCHAR(128) NULL,
  rule_type VARCHAR(64) NOT NULL,
  severity ENUM('info','warn','block') NOT NULL DEFAULT 'block',
  rule_text TEXT NOT NULL,
  check_hint TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_creative_quality_rules_protocol (protocol_id),
  KEY idx_creative_quality_rules_type (rule_type),
  CONSTRAINT fk_creative_quality_rules_protocol
    FOREIGN KEY (protocol_id) REFERENCES creative_style_protocols(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS creative_source_materials (
  id VARCHAR(128) NOT NULL,
  category VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  use_case TEXT NULL,
  payload_json JSON NULL,
  source_doc VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_creative_source_materials_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS creative_writing_techniques (
  id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  layer ENUM('time','perspective','information_control','psychology','imagery','structure','language','theme') NOT NULL,
  description TEXT NOT NULL,
  mechanism TEXT NOT NULL,
  suitable_for_json JSON NOT NULL,
  avoid_when_json JSON NULL,
  prompt_instruction TEXT NOT NULL,
  quality_check TEXT NOT NULL,
  status ENUM('active','retired') NOT NULL DEFAULT 'active',
  source_doc VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_creative_writing_techniques_layer (layer),
  KEY idx_creative_writing_techniques_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS creative_author_techniques (
  author_profile_id VARCHAR(128) NOT NULL,
  technique_id VARCHAR(128) NOT NULL,
  weight INT NOT NULL,
  priority ENUM('core','supporting','rare') NOT NULL,
  task_types_json JSON NOT NULL,
  trigger_text TEXT NOT NULL,
  constraint_text TEXT NOT NULL,
  status ENUM('active','retired') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (author_profile_id, technique_id),
  KEY idx_creative_author_techniques_profile (author_profile_id),
  KEY idx_creative_author_techniques_technique (technique_id),
  KEY idx_creative_author_techniques_priority (priority),
  CONSTRAINT fk_creative_author_techniques_technique
    FOREIGN KEY (technique_id) REFERENCES creative_writing_techniques(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO creative_writing_techniques
  (id, name, layer, description, mechanism, suitable_for_json, avoid_when_json, prompt_instruction, quality_check, status, source_doc)
VALUES
  ('tech_nonlinear_memory', '非线性回忆', 'time', '当前事件滑入过去，过去再反向解释现在。', '现实触发物 -> 记忆片段 -> 当前选择被重新照亮。', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), CAST('["动作高潮需要连续推进时","读者尚未建立当前场景坐标时"]' AS JSON), '让一个物件、称谓、气味或动作触发短回忆；回忆必须改变读者对当前选择的理解。', '文本是否有现实触发点、回忆片段、回到当前后的意义变化。', 'active', 'gateway/sql/003_creative_style_registry.sql'),
  ('tech_delayed_revelation', '延迟揭示', 'information_control', '关键事实不在开头说明，而在行动后段轻轻显露。', '先给行为和痕迹，再补出真实原因或隐藏身份。', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), CAST('["平台说明文","需要第一段直接给结论的营业文案"]' AS JSON), '不要开头解释全部因果；先写可见痕迹，后段揭示使前文重新变重。', '是否存在后段信息使前文细节获得新意义。', 'active', 'gateway/sql/003_creative_style_registry.sql'),
  ('tech_ellipsis_climax', '省略高潮', 'information_control', '真正剧烈的事件被跳过，只写前后痕迹。', '切掉爆点本身，用结果、沉默、残留物和他人反应承载冲击。', CAST('["fiction_chapter","historical_short_video"]' AS JSON), CAST('["必须明确交代操作步骤时","发布章节需要直接满足细纲动作时"]' AS JSON), '如果高潮本身会变成表演，就省略过程，转写之后的残留和人物反应。', '是否没有空泛跳过关键剧情；省略后仍能从痕迹推回事件。', 'active', 'gateway/sql/003_creative_style_registry.sql'),
  ('tech_limited_pov_bias', '有限视角偏差', 'perspective', '叙述只保留角色能知道、能误解、会回避的东西。', '认知边界限制信息量，偏见和误判形成文本张力。', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), CAST('["需要全局复盘的报告段落"]' AS JSON), '只写视角人物能看见和误判的事实；不要用作者口吻替人物判案。', '是否出现上帝视角、后见之明或人物不可能知道的信息。', 'active', 'gateway/sql/003_creative_style_registry.sql'),
  ('tech_unreliable_self_deception', '自我欺骗', 'psychology', '人物不是不知道真相，而是不愿承认。', '语言声称一套，身体反应、动作选择和物件处理暴露另一套。', CAST('["fiction_chapter","current_affairs_commentary"]' AS JSON), CAST('["纯信息说明","明确操作指南"]' AS JSON), '让人物用行动否认自己说出口的判断；不要直接写“他在自欺”。', '是否有言行冲突或身体反应揭穿人物自述。', 'active', 'gateway/sql/003_creative_style_registry.sql'),
  ('tech_belated_understanding', '迟来的理解', 'time', '年轻时未理解的事实，在之后才显出代价。', '当下判断 -> 时间推移 -> 旧事实被重新命名。', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), CAST('["即时爽点段落","短促转化文案"]' AS JSON), '让文本保留一个迟来的认知回声，但不要写成作者总结。', '是否通过后果和重新命名完成理解，而不是直接讲道理。', 'active', 'gateway/sql/003_creative_style_registry.sql'),
  ('tech_object_bearing_pressure', '日常物件承压', 'imagery', '衣物、杯子、账簿、门槛、票据等普通物件承载命运变化。', '把抽象压力压进可触摸物，物件变化即关系变化。', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary","business_copywriting"]' AS JSON), CAST('["物件会分散核心行动时"]' AS JSON), '选择一个低调物件反复出现，让它承担权力、羞耻、亏欠或制度压力。', '是否有稳定物件承载关系或制度变化。', 'active', 'gateway/sql/003_creative_style_registry.sql'),
  ('tech_image_echo', '意象回声', 'imagery', '同一意象前后出现两次，第二次意义改变。', '首次建立物象，后次在新局面中反转或加重。', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), CAST('["篇幅极短且不允许重复时"]' AS JSON), '让一个物象在开头和后段各出现一次，第二次必须携带变化。', '是否有前后意象重复且意义发生变化。', 'active', 'gateway/sql/003_creative_style_registry.sql'),
  ('tech_body_reveals_truth', '身体细节显露真相', 'psychology', '手指、呼吸、姿势、伤口、步态暴露人物真实状态。', '心理不直说，身体先背叛人物。', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), CAST('["身体细节会变成刺激性卖点时"]' AS JSON), '用身体反应代替心理说明；动作必须推动场景或暴露关系。', '是否用具体身体反应承担心理或权力变化。', 'active', 'gateway/sql/003_creative_style_registry.sql'),
  ('tech_small_cut_big_fate', '小切口大命运', 'structure', '只写一次拜访、一次相遇、一次签押，却牵出整个人生或制度逻辑。', '局部事件压缩宏大结构，微小选择显露长期命运。', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary","business_copywriting"]' AS JSON), CAST('["需要铺陈世界观总览时"]' AS JSON), '不要铺开全景，选一个具体动作或小事件承载整体命运。', '是否由小事件自然推出大结构，而不是抽象概括。', 'active', 'gateway/sql/003_creative_style_registry.sql'),
  ('tech_cold_syntax', '冷静句法', 'language', '用平稳、克制、事实并置的句子写残酷内容。', '降低情绪形容词，提高事实密度和动作准确度。', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), CAST('["需要强烈广告号召时"]' AS JSON), '用事实并置代替抒情判断；句子保持冷，内容自己发热。', '是否减少空泛评价、直接抒情和模板化高级感词。', 'active', 'gateway/sql/003_creative_style_registry.sql'),
  ('tech_thematic_undercurrent', '主题潜流', 'theme', '主题不直接说，而从意象、动作、制度痕迹里渗出。', '表层写事件，底层让文明、制度或身份问题逐步显影。', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), CAST('["结论必须第一时间明确的公文"]' AS JSON), '不要直接点题；让主题通过重复物件、称谓、行动代价和结尾余波浮出。', '是否出现直接空泛点题；是否有可追踪的主题意象链。', 'active', 'gateway/sql/003_creative_style_registry.sql')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  layer = VALUES(layer),
  description = VALUES(description),
  mechanism = VALUES(mechanism),
  suitable_for_json = VALUES(suitable_for_json),
  avoid_when_json = VALUES(avoid_when_json),
  prompt_instruction = VALUES(prompt_instruction),
  quality_check = VALUES(quality_check),
  status = VALUES(status),
  source_doc = VALUES(source_doc),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO creative_author_techniques
  (author_profile_id, technique_id, weight, priority, task_types_json, trigger_text, constraint_text, status)
VALUES
  ('emptyinkpot_primary_author', 'tech_thematic_undercurrent', 96, 'core', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), '任何需要文明、制度、身份或历史冷感的文本。', '主题不得直接喊出，必须通过物件、制度痕迹、行动代价和结尾余波渗出。', 'active'),
  ('emptyinkpot_primary_author', 'tech_object_bearing_pressure', 94, 'core', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary","business_copywriting"]' AS JSON), '需要让抽象压力落地时。', '物件必须推动场景或关系变化，不能只是装饰。', 'active'),
  ('emptyinkpot_primary_author', 'tech_body_reveals_truth', 92, 'core', CAST('["fiction_chapter","historical_short_video"]' AS JSON), '人物崩溃、犹豫、恐惧、权威失效或亲密关系破裂时。', '身体细节只能暴露心理或权力变化，不能写成刺激性卖点。', 'active'),
  ('emptyinkpot_primary_author', 'tech_cold_syntax', 90, 'core', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), '残酷、制度压力、失败、死亡、幻灭场景。', '禁止用空泛情绪词代替事实并置。', 'active'),
  ('emptyinkpot_primary_author', 'tech_image_echo', 86, 'core', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), '章节需要首尾统一、意象复现或结尾回刺时。', '第二次意象必须发生语义变化。', 'active'),
  ('emptyinkpot_primary_author', 'tech_delayed_revelation', 84, 'core', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), '需要避免开头把主题讲死时。', '延迟揭示不能牺牲基础可读性。', 'active'),
  ('emptyinkpot_primary_author', 'tech_small_cut_big_fate', 82, 'core', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary","business_copywriting"]' AS JSON), '需要从小事件进入制度或文明结构时。', '小切口必须有明确行动，不得变成抽象开题。', 'active'),
  ('emptyinkpot_primary_author', 'tech_limited_pov_bias', 78, 'supporting', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), '需要锁定角色、阵营或时代认知边界时。', '不得泄露视角人物不可能知道的信息。', 'active'),
  ('emptyinkpot_primary_author', 'tech_unreliable_self_deception', 74, 'supporting', CAST('["fiction_chapter","current_affairs_commentary"]' AS JSON), '角色正在为自己找理由或制度正在自我辩护时。', '不要明说自欺，让言行冲突完成揭露。', 'active'),
  ('emptyinkpot_primary_author', 'tech_nonlinear_memory', 68, 'supporting', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), '当前物件、称谓或气味能触发过去时。', '回忆必须短，并改变当前选择的意义。', 'active'),
  ('emptyinkpot_primary_author', 'tech_belated_understanding', 64, 'supporting', CAST('["fiction_chapter","historical_short_video","current_affairs_commentary"]' AS JSON), '需要写余波、后果或历史回看时。', '不得用作者总结替代迟来的后果。', 'active'),
  ('emptyinkpot_primary_author', 'tech_ellipsis_climax', 52, 'rare', CAST('["fiction_chapter","historical_short_video"]' AS JSON), '高潮直接写会变成表演或削弱余波时。', '如果细纲要求明确动作，不得省略关键行动。', 'active')
ON DUPLICATE KEY UPDATE
  weight = VALUES(weight),
  priority = VALUES(priority),
  task_types_json = VALUES(task_types_json),
  trigger_text = VALUES(trigger_text),
  constraint_text = VALUES(constraint_text),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO creative_style_protocols
  (id, name, domain, perspective_rule, tone_rule, execution_rule, payload_json, source_doc)
VALUES
  (
    'fiction_blueprint_system',
    '小说创作系统整合模块表',
    'fiction_generation',
    '从单一核心矛盾、主视角角色及其认知边界出发，隐藏模块名，只让模块在人物行动、制度、物件和关系变化中显影。',
    '前工业至线列步兵时代的厚重政治质感；情感克制；展示多于说明。',
    'A0先定元冲突，再选A类世界骨架、B/C/C+角色内外结构、D关系、E情节引擎、F行为逻辑、G结构和H语言契约。',
    CAST('{"workflow":["establish_core_contradiction","build_world_skeleton","inject_character_soul","add_historical_texture","drive_plot_with_character_logic","write_as_fully_internalized_immersive_historical_narrator"],"contractFamilies":["workBlueprint","characterBlueprint","chapterBlueprint","qualityChecklist"]}' AS JSON),
    'gateway/sql/003_creative_style_registry.sql'
  ),
  (
    'immersive_historical_synthetic_narrative',
    '沉浸式历史合成叙事体',
    'historical_narrative',
    '严格锁定单一历史角色或阵营的有限视角，称谓、信息边界和价值判断都必须内化到该视角。',
    '深情的冷酷；理性的悲怆；物哀；命定悲剧；不由作者直接审判。',
    '按六步精校流程执行：语境净化、句式净化、论述深化、象征统一、首尾设计、反向验证。',
    CAST('{"ideologicalBlend":{"heterodoxRightKernel":0.6,"eastAsianHistoricalFramework":0.2,"missionHistoricalRomanticism":0.2},"narrativeGoal":"deconstruction_through_empathy","macroMicroLine":"decision_line_interwoven_with_victim_line","authorProfile":{"id":"emptyinkpot_primary_author","stance":"有限视角、制度压力、物质细节和历史冷感优先；不以作者口吻裁判人物。","voice":["冷静","克制","制度性压迫感","文学性但不空泛","客观事实并置"],"narrativeTechniques":["用行动、物件、光线、气味、沉默展示情绪","用局部人物认知边界替代上帝视角","用制度和资源压力推动选择","用一到两个稳定比喻系统维持章内统一","用事实并置生成反讽而非作者点题","用词语、称谓、地名、器物、建筑、礼仪、气味或制度痕迹作为开篇入口，让主题从历史沉积和认知错位中延迟显影"],"preferredDiction":["军政术语","历史文书感词汇","工程/水文/建筑/身体病理比喻","阵营内部称谓"],"rejectedDiction":["现代商业词","网络词","游戏词","镜头语言","AI高级感空词","后见之明"],"qualityNorthStar":"真实场景、真实行动、真实约束和可追溯语境压过漂亮空话。"},"writingTaskTypes":[{"id":"fiction_chapter","name":"小说章节","goal":"承接前章状态，推进剧情、人物关系、世界规则或冲突局势，产出可发布正文。","requiredInputs":["work","chapter_outline","characters","story_background","continuity_context","creative_contract"],"qualitySignals":["章节开头与结尾局面不同","人物通过行动和选择推进","正文满足平台字数","禁用词清零","当用词自然命中"]},{"id":"historical_short_video","name":"历史类短视频文案","goal":"用清晰矛盾、事实链和强节奏叙述历史事件，避免营销腔和伪客观。","requiredInputs":["topic","time_range","actors","source_materials","stance_boundary"],"qualitySignals":["开场矛盾清楚","事实链可追溯","每段有信息增量","结尾停在判断或余波"]},{"id":"current_affairs_commentary","name":"时事评论","goal":"基于事实、利益结构和制度逻辑展开评价，避免情绪口号和空泛立场。","requiredInputs":["event","known_facts","stakeholders","uncertainties","stance_boundary"],"qualitySignals":["事实与判断分离","不把猜测写成事实","利益关系清楚","结论可被证据支撑"]},{"id":"business_copywriting","name":"营业文案","goal":"用明确对象、利益点、场景和行动号召写可转化文案，避免自嗨和堆词。","requiredInputs":["offer","audience","channel","constraints","desired_action"],"qualitySignals":["第一屏信息明确","卖点落在场景","行动指令清楚","无空泛形容词堆砌"]}],"interestClusters":[{"id":"imperial_geopolitics","name":"帝国地缘政治","terms":["满蒙","生命线","绝对防卫圈","特殊权益","总力战","生存空间"],"appliesTo":["fiction_chapter","historical_short_video","current_affairs_commentary"]},{"id":"institutional_decay","name":"制度腐败与秩序崩塌","terms":["王纲解纽","礼崩乐坏","痼疾","毒瘤","瓦砾","基石"],"appliesTo":["fiction_chapter","historical_short_video","current_affairs_commentary"]},{"id":"war_mobilization","name":"战争动员与资源压力","terms":["统制","戡乱","绥靖","焦土抗战","持久战","空间换时间"],"appliesTo":["fiction_chapter","historical_short_video"]},{"id":"engineering_metaphor","name":"工程与水文比喻","terms":["轴承","齿轮","熔炉","暗流","堰塞湖","支流"],"appliesTo":["fiction_chapter","current_affairs_commentary","business_copywriting"]}],"conceptualEntry":{"id":"image_concept_entry","name":"意象-概念入口","mechanism":"语言符号 -> 历史沉积 -> 认知错位 -> 文明位置 -> 身份不稳定 -> 主题显影","entrySources":["词语","称谓","地名","器物","建筑","礼仪","气味","制度痕迹"],"forbiddenOpening":"禁止直接陈述主题或抽象结论。","preferredOpening":"从具体符号的语义漂移进入历史沉积、认知错位和文明裂缝。"},"lexiconLifecycle":{"activeSource":"vocabulary rows tagged creative-style or author-active","candidateSource":"memory_write_candidates and future author lexicon candidates","promotionRule":"候选词必须有来源、语境、适用任务、置信度和审核结果；未晋升前不得进入 active generation lexicon。","learningEvents":"生成输出、用户修改、发布结果和人工评价只能写学习事件或候选，不得静默改 active 词库。"}}' AS JSON),
    'gateway/sql/003_creative_style_registry.sql'
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  domain = VALUES(domain),
  status = 'active',
  perspective_rule = VALUES(perspective_rule),
  tone_rule = VALUES(tone_rule),
  execution_rule = VALUES(execution_rule),
  payload_json = VALUES(payload_json),
  source_doc = VALUES(source_doc),
  updated_at = CURRENT_TIMESTAMP;

UPDATE creative_style_protocols
SET payload_json = JSON_SET(
  payload_json,
  '$.authorialConstitution',
  CAST('{"coreLaw":"完整文章由模型基于资料、作者模型、视角边界和词汇合同一次性成文；runtime 只提供上下文、观察报告和验收证据，不拼接、不补写、不门禁驱动正文。","cannotDo":["不要用 AST 或提纲投影成正文","不要用 polish mutation 改写模型正文","不要用后见之明替历史现场判断","不要把风格词库当装饰词堆砌","不要绕过 DataBase active 词库与禁用词合同"],"blockers":["manual_prose_generation","ast_body_projection","gate_driven_generation","polish_mutation_body_path","detached_style_registry","hindsight_narration","list_or_heading_article_body"]}' AS JSON),
  '$.processPlan',
  CAST('{"required":true,"series":"沉浸式历史合成叙事","episode":"默认文章生成","timeBoundary":"先锁定故事或论述发生时刻，只使用当时可接触的信息与材料；未来是真正未知，不预支结局。","viewpointBoundary":"选定视角二：有限上帝视角。采用第三人称，但视角集中在单一或少数核心角色、阵营或材料主体身上，知晓范围与该角色或当时材料相同，保留历史迷雾。","knowledgeBoundary":"事实、推断和判断必须能归属到角色认知、当时文件、公共传闻、报刊材料、观察者记录或用户提供材料；不能凭作者全知补齐。","sceneEntrances":["一个具体新闻事件、文件开头、签名时刻、建筑、器物、地名、称谓、气味或制度残片","一个能同时含有宏大蓝图与具体代价的物件或场所"],"eventSequence":["以具体入口把读者抛入现场","交代角色或阵营可见的信息边界","展开内部逻辑、利害计算和恐惧来源","以史料、文件、报刊、日记或观察材料补足判断责任","穿插被制度裹挟者的微观遭遇","回到核心矛盾，让事实并置自行生成反讽","停在象征画面或未完成的余波中"],"narrativeMoves":["开门见山的具象切入","宏观决策线与微观代价线双线交织","石黑一雄式压力闪回","门罗式物件和感官细节","内部逻辑自洽的理性狂奔","口号、文书、利益和血肉的无声并置","意象收束而非道德总结"],"imageMotifs":["文件边角","印章","地图","铁轨","账簿","煤烟","灯火","潮气","祖坟","列车","礼服","旧报纸"],"pacingRules":["长句承载制度压力、利害计算和自我说服","短句钉住不可回避的事实、动作或沉默","宏观推演后必须落回具体人物、物件或制度动作","不要连续概念堆叠"],"dictionRules":["文40%白60%，文白夹杂必须自然","称谓、口号、术语必须服从角色阵营和时代语境","优先时代文献、公文、报刊、私人记述中的特有词汇","比喻必须来自机械工程、水文地理、戏剧棋局、建筑、神学或具体时代经验"],"forbiddenMoves":["禁止分点、列表、小标题式正文","禁止括号旁白","禁止镜头语言","禁止后见之明","禁止作者直接道德审判","禁止网络词、现代商业词、游戏词和 AI 高级感词","禁止编造文献和史实","禁止把资料堆成书单或注释"],"endingHook":"结尾停在具体画面、物件、动作、沉默或矛盾并置上，悬置结论，不写综上所述式总结。"}' AS JSON),
  '$.narrativeProtocol',
  CAST('{"required":true,"perspective":{"mode":"limited_third_person","rules":["视角二：有限上帝视角。第三人称叙述，但贴近单一或少数核心角色、阵营或材料主体。","知晓范围与该角色或当时材料相同，必须保留历史迷雾，未来是真正未知。","所有判断都要能回答谁在判断、凭什么知道、为何如此判断。"],"prohibitions":["禁止全知上帝视角","禁止后来我们知道、历史证明、这注定失败等后见之明","禁止作者直接道德审判","禁止预知未来","禁止把后世概念强塞进历史现场"]},"ideologicalBlend":[{"name":"异端右翼内核","ratio":60,"keywords":["强力","秩序","等级","统制","整体利益","必要牺牲","社会工程"]},{"name":"东洋史学框架","ratio":20,"keywords":["长时段","文明兴衰","制度演进","地缘政治","结构性宿命","冷静分析"]},{"name":"大东亚/使命史观渲染","ratio":20,"keywords":["历史使命","文明天命","秩序输出","解放叙事","末世决战","牺牲美学"]}],"characterMotivationEngine":["具体威胁与深层恐惧","崇高理想","自我说服","排除其他道路","极端行动","代价显影","可能幻灭"],"narrativeGoal":"通过深度共情进入历史行动者的内部逻辑，再用事实、物件、计划与后果的并置完成冷静解构。","narrativeDevices":["彻底历史情境主义","石黑一雄式压力闪回","爱丽丝门罗式细节观察","宏观战略线与微观细节线交替","众声喧哗、真理未定","物哀式意象收束"],"persuasionStrategy":["构建角色世界观内部近乎自洽的逻辑","用危机、敌人、使命和牺牲完成情感动员","系统排除妥协、等待、谈判、渐进改良等其他道路","可以展现代价，但不得让叙述者跳出视角反思或审判"],"ironyMethods":["官方宣言与具体代价并置","公开口号与私下算计并置","宏大蓝图与琐碎现实并置","同一事件的敌我文件、日记、报刊和传闻并置"],"structureLogic":{"opening":"从新闻事件、历史瞬间、民俗文化、经典言论、具体物品或地点切入，禁止虚浮抒情和先下定义。","development":"双线交织，宏观推演、事实链、文献锚点、全球比较与微观感官细节轮替推进。","ending":"不提供简明道德结论，回到开端意象或停在象征画面，留下未完成感和余波。"},"lexicalSystem":{"prioritySource":"故事所处时代的历史文献、公文、报刊、私人记述，以及 DataBase active vocabulary rows tagged creative-style or author-active。","preferredVocabulary":["天命","国运","鼎革","维新","统制","总力战","生命线","生存空间","大义名分","理路","暗流","王道乐土","五族协和","日满亲善","焦土抗战","空间换时间","历史辩证法","罗马的和平","王纲解纽","礼崩乐坏","南满铁路","满铁","绝对防卫圈","基石","蓝图","熔炉","暗渠","余烬","封蜡","账簿"],"contextualVocabulary":[{"term":"生命线","meaning":"战略生存依赖，不是一般重要性的泛称。","register":"军政和国策论述","allowedContexts":["满蒙","南满铁路","资源供给","国防圈"],"forbiddenContexts":["普通物件","随手景物"],"guidance":"必须绑定具体战略依赖对象。"},{"term":"王道乐土","meaning":"日方和满洲国宣传语境中的秩序许诺。","register":"日方右翼和伪满官方辞令","allowedContexts":["满洲国","五族协和","日满亲善","建国宣言"],"forbiddenContexts":["中方抗战者正面自称"],"guidance":"必须让宣传词与制度事实或人物处境形成张力。"},{"term":"伪逆","meaning":"中方抗战语境对附敌政权或人员的称谓。","register":"中方抗战、国统区报刊或政治文书","allowedContexts":["抗战叙述","沦陷区","敌伪组织"],"forbiddenContexts":["日方内部文件自称"],"guidance":"称谓必须服从叙述阵营。"}],"contextualRules":["文40%白60%，1000字内之字不宜超过两处，文言只在正式文书、独白和论述处自然出现。","同一段落只选一到两个比喻系统，不要堆砌词库。","用词必须先判断时代、阵营、阶层和资料来源。"],"bannedTerms":["CEO","商业模式","痛点","赛道","赋能","落地","打造","玩家","解决方案","互联网思维","降维打击","YYDS","绝绝子","静默","冷彻","凛冽","肃杀","优雅地","教科书式","后来我们知道","历史证明","可笑的是","具有讽刺意味的是","让我想起","这不由得让人联想到"]},"rhetoricalSystem":{"metaphorSources":["机械工程","光学方向","戏剧棋局","水文地理","建筑","神学","时代器物"],"metaphorStyle":"辛辣、冗长、华丽、繁复但必须恰如其分，用来强化逻辑和情感，不作装饰。","bannedMetaphors":["电子游戏比喻","副本","通关","氪金","算法","APP","手术刀式分析","精准打击","提线木偶","野兽的瞳孔","像写代码一样","像公司运营一样"]},"sourceUse":{"quotationSources":["石原莞尔《最终战争论》《战争史大观》","北一辉《日本改造法案大纲》","后藤新平文装的武备","《李顿调查团报告》","《满洲国建国宣言》与《日满议定书》","满铁调查报告","汪精卫电文与和平运动论述","郑孝胥日记","溥仪《我的前半生》","马基雅维利《君主论》","克劳塞维茨《战争论》","修昔底德《伯罗奔尼撒战争史》","中国古典诗词与《红楼梦》意象"],"referenceAnchors":[{"kind":"theory","name":"石原莞尔最终战争论","use":"构建满蒙生命线、绝对国防圈和最终战论的内部逻辑。","sectionHint":"宏观决策线","required":false,"source":"creativeContract","sourceId":"src_ishiwara_final_war"},{"kind":"document","name":"《满洲国建国宣言》与《日满议定书》","use":"并置官方辞令与实质条款。","sectionHint":"制度宣言与现实代价","required":false,"source":"creativeContract","sourceId":"src_manchukuo_documents"},{"kind":"document","name":"《李顿调查团报告》","use":"呈现国际承认特殊权益却否认合法性的矛盾。","sectionHint":"外部观察线","required":false,"source":"creativeContract","sourceId":"src_litton_report"},{"kind":"literary","name":"中国古典诗词与《红楼梦》意象","use":"只在结尾或关键转折中化用末世、故国和物哀余韵。","sectionHint":"意象收束","required":false,"source":"creativeContract","sourceId":"src_classical_poetry"}],"citationRules":["只引用或化用真实来源，不私自编造文献。","引用必须服务角色认知闭环、事实链或材料并置，不作书单展示。","正文不写可见来源编号，来源进入结构化引用报告。"]},"corePrinciples":["彻底历史情境主义","有限上帝视角","理想与恐惧共生驱动","深度共情以达冷静解构","拒绝脸谱化","事实、物件、制度与角色有限认知先于结论"],"formatProhibitions":["禁止分点","禁止列表式正文","禁止小标题","禁止 Markdown 标记","禁止括号旁白","禁止系统指令泄漏","禁止红包口令或无效互动信息","禁止镜头语言"]}' AS JSON)
)
WHERE id = 'immersive_historical_synthetic_narrative';

INSERT INTO creative_style_modules
  (code, parent_code, category, name, module_kind, description, payload_json, source_doc)
VALUES
  ('A', NULL, 'worldbuilding', '世界观构造模块', 'module_category', '从核心矛盾、政治格局、时代位面、军事美学、命名、奇异设定、法案称号和技术包构建舞台。', CAST('{"owner":"world_blueprint"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('A0', 'A', 'worldbuilding', '核心矛盾与主题先行', 'world_module', '先确立秩序与自由、真理与谎言、文明与野蛮、牺牲与救赎等元冲突。', CAST('{"contractField":"coreContradiction"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('A1', 'A', 'worldbuilding', '政治格局模块', 'world_module', '邦联、宗教圣域、文明废墟、家族行会垄断网、军事贵族采邑制等碎片化政治结构。', CAST('{"contractField":"politicalStructure"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('A2', 'A', 'worldbuilding', '时代位面模块', 'world_module', '文艺复兴、大航海、启蒙战争、地脉晶石等前工业至线列步兵时代质感。', CAST('{"contractField":"eraPlane"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('A3', 'A', 'worldbuilding', '军事/暴力美学模块', 'world_module', '线列步兵纪律、齐射、刺刀墙与决斗仪式的合法化私刑美学。', CAST('{"contractField":"violenceAesthetic"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('A4', 'A', 'worldbuilding', '命名与符号模块', 'world_module', '政体、姓氏、纹章和色彩象征的系统命名规则。', CAST('{"contractField":"namingAndSymbols"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('A5', 'A', 'worldbuilding', '超自然/奇异设定模块', 'world_module', '生命、记忆、存在、契约、理性等代价体系，以及学院、审判庭、肃正机关等管控机构。', CAST('{"contractField":"supernaturalRules"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('A6', 'A', 'worldbuilding', '法案、条约与计划命名模块', 'world_module', '以庄重、古雅、威慑或欺骗性文书名称驱动冲突。', CAST('{"contractField":"lawsTreatiesPlans"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('A7', 'A', 'worldbuilding', '人物全名与称号体系模块', 'world_module', '姓名、官职、敬称、绰号、贬称和名号变迁构成身份信息。', CAST('{"contractField":"namesAndTitles"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('A8', 'A', 'worldbuilding', '扩展科技/奇异技术包模块', 'world_module', '能源、通讯、军事科技、民生技术和奇异科学决定文明特质。', CAST('{"contractField":"technologyPackage"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('B', NULL, 'character', '角色深层内核模块', 'module_category', '角色的里层驱动力，决定痛苦、执念和行动代价。', CAST('{"owner":"character_blueprint"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('B1', 'B', 'character', '孤独的面壁者', 'inner_kernel', '主动或被迫承担秘密使命，承受误解、骂名和必要的伤害。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('B2', 'B', 'character', '悔恨的赎罪者', 'inner_kernel', '因过往错误造成不可挽回的伤害，以重建、替代或自罚寻求无法完成的救赎。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('B3', 'B', 'character', '冰冷的观测者', 'inner_kernel', '以绝对理性观察文明、人性或奇异现象，并被无法量化的变量反噬。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('B4', 'B', 'character', '绝望的筑城者', 'inner_kernel', '深知制度、城市或理念终将崩塌，仍以建造维系存在意义。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('B5', 'B', 'character', '贪婪的焚毁者', 'inner_kernel', '以毁灭既有秩序换取自由、复仇或短暂真实。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('B6', 'B', 'character', '背负诅咒的先知', 'inner_kernel', '知道未来或真相，却因代价、禁令或不被相信而无法直接改变结局。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('B7', 'B', 'character', '崩坏的完美者', 'inner_kernel', '表面完美，内在被无法承认的裂缝缓慢摧毁。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('B8', 'B', 'character', '末代守墓人', 'inner_kernel', '守护已死传统、王朝、学派或誓言，明知无人继承仍不离弃。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('B9', 'B', 'character', '混沌引信', 'inner_kernel', '自身存在会诱发灾难、揭穿谎言或引爆秩序。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('B10', 'B', 'character', '理性祭品', 'inner_kernel', '被理性、制度或计划献祭，并在献祭中显露非理性的人性。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C', NULL, 'character', '角色表层人格模块', 'module_category', '角色对外显露的社会面具和第一印象。', CAST('{"owner":"character_blueprint"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('C1', 'C', 'character', '圣人/英雄', 'surface_persona', '公众眼中的高洁承担者。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C2', 'C', 'character', '英明领袖', 'surface_persona', '冷静、有威望、能组织秩序的领导者。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C3', 'C', 'character', '纨绔/庸人', 'surface_persona', '看似轻浮、无能或不堪托付的伪装。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C4', 'C', 'character', '学者/医生', 'surface_persona', '以学识、诊断、记录和理性技艺示人。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C5', 'C', 'character', '魅力演说家/艺术家', 'surface_persona', '以语言、审美和感染力塑造他人。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C6', 'C', 'character', '虔诚修士/苦行者', 'surface_persona', '以信仰、戒律和苦行遮蔽内核。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C7', 'C', 'character', '务实匠人/管理者', 'surface_persona', '重视执行、工序、账目和维持运转。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C8', 'C', 'character', '天真收藏家', 'surface_persona', '以收藏、珍爱和迟钝的纯真构成反差。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C9', 'C', 'character', '社交名流/沙龙主人', 'surface_persona', '以礼仪、谈吐和人脉作为行动外壳。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C10', 'C', 'character', '疲惫的调解者', 'surface_persona', '长期夹在冲突中，习惯妥协、缓冲与承受。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+', NULL, 'character', '情感风格与关系模式模块', 'module_category', '表层情感、深层情感和特殊关系模式，用于给角色关系增加病理性、依附性和反差。', CAST('{"owner":"character_and_relationship_blueprint"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('C+1', 'C+', 'character', '阴郁寡言', 'surface_emotion', '表层沉默、压抑、少言，用行动和停顿承载情绪。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+2', 'C+', 'character', '炽烈纯粹', 'surface_emotion', '表层热烈直接，信念和情感都少有遮掩。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+3', 'C+', 'character', '玩世不恭', 'surface_emotion', '以轻佻、戏谑或不在乎遮蔽真正执念。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+4', 'C+', 'character', '脆弱易碎', 'surface_emotion', '情绪容易破裂，细微刺激即可显露不稳。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+5', 'C+', 'character', '沉稳威严', 'surface_emotion', '对外稳定、端严、有压迫感，情绪很少外泄。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+6', 'C+', 'character', '病态依存', 'deep_emotion', '深层依赖他人或关系，一旦失去便出现崩坏倾向。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+7', 'C+', 'character', '施虐慕恋', 'deep_emotion', '爱、伤害、控制与确认存在感纠缠在一起。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+8', 'C+', 'character', '殉道成瘾', 'deep_emotion', '把痛苦和牺牲当作自我确认与情感表达。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+9', 'C+', 'character', '恐惧性掠夺', 'deep_emotion', '因恐惧失去而占有、囚禁、掠夺所爱或所信之物。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+10', 'C+', 'character', '虚无寄生', 'deep_emotion', '自身价值坍塌，寄生于他人的意义、痛苦或理想。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+11', 'C+', 'relationship', '镜像共生', 'relationship_pattern', '双方互为镜像，既依赖对方确认自己，又因相似而互相伤害。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+12', 'C+', 'relationship', '驯化与反抗', 'relationship_pattern', '一方试图塑造、驯服、命名另一方，另一方在依赖中反抗。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+13', 'C+', 'relationship', '共犯依存', 'relationship_pattern', '共同罪行或秘密让双方无法分离，也无法真正信任。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('C+14', 'C+', 'relationship', '救赎妄想', 'relationship_pattern', '一方把拯救对方当作自身存在意义，最终可能变成新的伤害。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('D', NULL, 'relationship', '核心关系模块', 'module_category', '角色之间的长期张力结构。', CAST('{"owner":"relationship_blueprint"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('D1', 'D', 'relationship', '保护者与囚徒', 'relationship_tension', '保护逐渐变成控制，安全逐渐变成囚禁。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('D2', 'D', 'relationship', '镜像与倒影', 'relationship_tension', '双方互为可能的自己，因相似而敌对。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('D3', 'D', 'relationship', '施害者与受害者', 'relationship_tension', '罪愆、补偿、拒绝原谅和无法取消的历史关系。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('D4', 'D', 'relationship', '观测者与实验体', 'relationship_tension', '观察、记录、操控与情感介入之间的滑坡。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('E', NULL, 'plot', '情节引擎模块', 'module_category', '推动故事运转的核心外部压力。', CAST('{"owner":"work_blueprint"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('E1', 'E', 'plot', '外敌威胁', 'plot_engine', '外部军事、文明、灾变或异族压力。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('E2', 'E', 'plot', '内部腐朽', 'plot_engine', '制度、组织、信仰或阶层从内部坏死。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('E3', 'E', 'plot', '末日倒计时', 'plot_engine', '灾难、战争、资源或预言给出明确时间压力。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('E4', 'E', 'plot', '资源争夺', 'plot_engine', '粮食、能源、旧文明遗产、技术或圣物争夺。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('E5', 'E', 'plot', '法统/继承危机', 'plot_engine', '王位、正统、继承、图章与名义合法性的斗争。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('F', NULL, 'plot', '行为逻辑与弧光模块', 'module_category', '用恐惧、欲望、认知、资源和压力推导角色行动。', CAST('{"owner":"character_blueprint"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('F1', 'F', 'plot', '行为驱动公式', 'behavior_logic', '用欲望、恐惧、认知、资源、关系压力和情境约束推导角色言行。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('F2', 'F', 'plot', '弧光类型库', 'character_arc', '规划幻灭、觉醒、堕落、牺牲、和解或彻底异化等角色变化路径。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('G', NULL, 'plot', '情节结构模块', 'module_category', '调查员陷落、改革者异化、四幕五卷等结构骨架。', CAST('{"owner":"work_blueprint"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('G1', 'G', 'plot', '经典结构模型', 'plot_structure', '提供调查员陷落、改革者异化、继承危机等可复用主干结构。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('G2', 'G', 'plot', '四幕/五卷结构节点', 'plot_structure', '以启、承、转、合和关键节点组织长篇节奏。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('H', NULL, 'language', '语言修辞模块', 'module_category', '视角词汇、时代句式、比喻系统和去AI痕迹规则。', CAST('{"owner":"language_contract"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('H1', 'H', 'language', '视角化词汇库', 'language_contract', '按角色阵营、时代、阶层和知识边界选择词汇。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('H2', 'H', 'language', '时代化句式与比喻', 'language_contract', '比喻必须来自角色时代可接触的自然、工程、建筑、水文、宗教、戏剧或棋局。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('H3', 'H', 'language', '去AI感与含蓄表达', 'language_contract', '删除现代词、网络词、AI高级感词、作者评论和直接情绪标签。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('H4', 'H', 'language', '意象-概念入口', 'narrative_opening', '从词语、称谓、地名、器物、建筑、礼仪、气味或制度痕迹进入，让主题延迟显影。', CAST('{"contractField":"protocol.payload_json.conceptualEntry","mechanism":"symbol_to_history_to_identity"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('I', NULL, 'workflow', '项目规划与检查模块', 'module_category', '工作流、模板、冲突生成器、检查清单和快速索引。', CAST('{"owner":"production_workflow"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('I1', 'I', 'workflow', '创作流程总览', 'production_workflow', '从核心矛盾、世界骨架、角色灵魂、情节结构到语言滤镜的完整流程。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('I2', 'I', 'workflow', '项目规划模板', 'production_workflow', '把元设定、世界、角色、结构、叙事风格和卷章细纲落成可填写项目模板。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('I3', 'I', 'workflow', '模块冲突生成器', 'production_workflow', '通过B/C/C+/D/E/A模块错位组合生成天然冲突。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('I4', 'I', 'workflow', '风格融合检查清单', 'quality_workflow', '检查POV内化、展示而非告诉、时代化、物哀节奏和最终隐藏模块验证。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('I5', 'I', 'workflow', '模块快速索引与组合指南', 'production_workflow', '在开局、配角、对手戏和转折点卡顿时提供组合检索路径。', NULL, 'gateway/sql/003_creative_style_registry.sql'),
  ('J', NULL, 'author_model', '作者模型与任务模式模块', 'module_category', '把作者画像、任务类型、兴趣簇、词汇生命周期和质量北极星收束为 DataBase 创作合同的一部分。', CAST('{"owner":"author_writing_contract"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('J1', 'J', 'author_model', '作者声音模型', 'author_profile', '冷静克制、制度压力、物质细节、历史冷感和有限视角构成默认作者声音。', CAST('{"contractField":"protocol.payload_json.authorProfile"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('J2', 'J', 'author_model', '任务类型模型', 'writing_task_type', '小说章节、历史短视频、时事评论和营业文案共享作者模型，但输入合同和质量信号不同。', CAST('{"contractField":"protocol.payload_json.writingTaskTypes"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('J3', 'J', 'author_model', '兴趣簇与词汇扩展', 'interest_cluster', '用兴趣簇引导当用词选择和候选词学习，但 active 词库必须由 DataBase 明确晋升。', CAST('{"contractField":"protocol.payload_json.interestClusters"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('J4', 'J', 'author_model', '词汇生命周期', 'lexicon_lifecycle', '观察样本先进入候选和学习事件，通过证据、评价和晋升后才能进入生成词库。', CAST('{"contractField":"protocol.payload_json.lexiconLifecycle"}' AS JSON), 'gateway/sql/003_creative_style_registry.sql')
ON DUPLICATE KEY UPDATE
  parent_code = VALUES(parent_code),
  category = VALUES(category),
  name = VALUES(name),
  module_kind = VALUES(module_kind),
  description = VALUES(description),
  payload_json = VALUES(payload_json),
  source_doc = VALUES(source_doc),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO creative_editing_steps
  (protocol_id, step_order, name, task_summary, required_report_json, hard_rules_json)
VALUES
  ('immersive_historical_synthetic_narrative', 1, '语境净化与术语锁定', '锁定单一历史视角、阵营、年份、称谓和术语边界，生成禁用词表与强制词表，替换错位术语。', CAST('["lockedPerspectiveAndLexicon","anachronisticTermsReplaced","modernAndAiTermsRemovedCount"]' AS JSON), CAST('["forbid_opposing_camp_terms","replace_terms_not_available_in_target_year","remove_modern_ai_diction"]' AS JSON)),
  ('immersive_historical_synthetic_narrative', 2, '句式净化与节奏格式化', '删除正文括号补充、冒号长论、破折号长插入；拆分欧化长句；控制之字频率；重整段落呼吸。', CAST('["longSentencesSplitExamples","zhiFrequencyAndReplacement","paragraphRhythmAdjustments"]' AS JSON), CAST('["no_parenthetical_asides","no_colon_led_long_exposition","zhi_frequency_lte_4_per_1000_chars"]' AS JSON)),
  ('immersive_historical_synthetic_narrative', 3, '论述深化与情感客体化', '为特定立场补入事实、数据、理论和利益计算，删除作者抒情和后见之明，把情绪转化为动作、环境和感官事实。', CAST('["argumentStrengtheningBeforeAfter","authorVoiceDeletedExamples","emotionObjectificationExamples"]' AS JSON), CAST('["no_authorial_judgment","no_hindsight","show_emotion_as_objective_detail"]' AS JSON)),
  ('immersive_historical_synthetic_narrative', 4, '象征统一与风格熔铸', '提取比喻系统，只保留一到两个主系统；核心象征物前中后变奏；用事实并置生成反讽。', CAST('["primaryMetaphorSystems","privateSensoryDetailsInserted","factualJuxtapositionSites"]' AS JSON), CAST('["metaphor_systems_limited","irony_by_juxtaposition_only","insert_private_sensory_detail_at_turning_points"]' AS JSON)),
  ('immersive_historical_synthetic_narrative', 5, '结构优化与首尾设计', '开头从具体感官场景切入；结尾停在画面、动作、对话、意象或沉默，不总结点题。', CAST('["rewrittenOpening","rewrittenEnding","readAloudAdjustments"]' AS JSON), CAST('["opening_must_be_scene","ending_must_be_suspended","no_final_moral_summary"]' AS JSON)),
  ('immersive_historical_synthetic_narrative', 6, '综合校验与反向验证', '冷读全文，标出生硬处；代入对立视角检查其内部逻辑是否严密、自洽、可理解。', CAST('["coldReadAdjustments","opposingReaderValidation","finalConfirmation"]' AS JSON), CAST('["if_reverse_validation_fails_return_to_step_3","confirm_internal_logic_not_moral_agreement"]' AS JSON))
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  task_summary = VALUES(task_summary),
  required_report_json = VALUES(required_report_json),
  hard_rules_json = VALUES(hard_rules_json),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO creative_quality_rules
  (id, protocol_id, rule_type, severity, rule_text, check_hint)
VALUES
  ('creative_pov_001', 'fiction_blueprint_system', 'perspective', 'block', '正文必须锁定在POV角色的感知和知识范围内，不提前泄露角色未知信息。', 'scan for narrator-only facts and future knowledge'),
  ('creative_show_001', 'fiction_blueprint_system', 'style', 'block', '角色内核、情感和关系必须通过动作、习惯、对话、选择和环境展示，不得用模块标签直说。', 'reject B/C/C+/D module labels in prose'),
  ('creative_period_001', 'fiction_blueprint_system', 'anachronism', 'block', '时代化文本不得出现现代网络词、商业词、心理学术语或错位科技比喻。', 'check banned_words plus target-year term review'),
  ('creative_structure_001', 'fiction_blueprint_system', 'plot', 'warn', '每章必须推动情节、人物、关系、世界揭示或氛围中的至少一项，并造成状态变化。', 'chapter state delta must be non-empty'),
  ('historical_no_hindsight_001', 'immersive_historical_synthetic_narrative', 'perspective', 'block', '禁止后来我们知道、历史证明、这注定失败等后见之明表述。', 'banned_words type god_view'),
  ('historical_lexicon_lock_001', 'immersive_historical_synthetic_narrative', 'lexicon', 'block', '必须先锁定叙事阵营，再使用该阵营强制词表，替换对立阵营称谓。', 'require narrativePosition and requiredLexicon'),
  ('historical_sentence_001', 'immersive_historical_synthetic_narrative', 'syntax', 'block', '正文不得用括号补充、冒号引领长段论述或破折号插入冗长修饰。', 'scan punctuation patterns'),
  ('historical_emotion_001', 'immersive_historical_synthetic_narrative', 'style', 'block', '悲怆、幻灭、决心等强情绪必须客体化为物件、动作、光线、气味和事实并列。', 'require objective detail near emotional turns'),
  ('historical_ending_001', 'immersive_historical_synthetic_narrative', 'structure', 'block', '结尾不得总结全文或点明主旨，必须悬置在具体画面、意象、动作、对话或沉默。', 'last paragraph must be image/action/dialogue/silence'),
  ('historical_plain_article_001', 'immersive_historical_synthetic_narrative', 'format', 'block', '文章正文必须是连续纯文案自然段，禁止分点、列表、小标题、Markdown 标记、章节标题和括号旁白。', 'scan list markers headings markdown and parenthetical narration'),
  ('anti_ai_specificity_001', 'immersive_historical_synthetic_narrative', 'style', 'block', '抽象判断必须落到年份、人物、制度、地点、物件、数据、动作或感官事实之一，禁止只写空泛结论。', 'paragraph with abstract judgment must contain at least one concrete anchor'),
  ('anti_ai_evidence_chain_001', 'immersive_historical_synthetic_narrative', 'argument', 'block', '论述段必须有事实、推断和判断的责任链；不得使用研究表明、有人认为等无来源托辞替代证据。', 'require cited document, observed fact, or POV-accessible source before conclusion'),
  ('anti_ai_paragraph_logic_001', 'immersive_historical_synthetic_narrative', 'structure', 'warn', '段落之间必须形成因果、递进、转折或事实并置，禁止此外、同时、并且式机械平铺。', 'flag repetitive discourse markers and same-shape sentence runs'),
  ('anti_ai_perspective_accountability_001', 'immersive_historical_synthetic_narrative', 'perspective', 'block', '每个判断都必须能回答谁在判断、凭什么知道、为何这样判断；无法归属到POV或文件来源的评语必须删除。', 'judgment must be attributable to POV, document, public rumor, or narrator contract'),
  ('anti_ai_terminology_precision_001', 'immersive_historical_synthetic_narrative', 'lexicon', 'warn', '专业场景不得用做了调查、弄清楚关系等口语泛化，必须改成当时可用的方法、变量、制度、文书或行动。', 'replace vague verbs with period-appropriate procedure terms'),
  ('anti_ai_lexical_signal_001', 'immersive_historical_synthetic_narrative', 'lexicon', 'warn', '空泛套话、模糊引用和逻辑空转词只作为弱信号；词汇命中不能单独判死，必须回到证据链、POV责任、具体锚点和因果结构判断。', 'lexical hit is warning evidence only unless paired with structural failure'),
  ('author_fact_judgment_001', 'immersive_historical_synthetic_narrative', 'argument', 'block', '历史短视频和时事评论必须区分事实、推断和判断，不得把猜测写成事实。', 'require fact inference judgment separation when taskType is commentary or historical_short_video'),
  ('author_scene_action_001', 'immersive_historical_synthetic_narrative', 'fiction', 'block', '小说章节必须先有场景行动和状态变化，不得只用设定说明、情绪旁白或抽象评论填充。', 'chapter opening state and ending state must differ'),
  ('author_image_concept_entry_001', 'immersive_historical_synthetic_narrative', 'opening', 'warn', '开篇优先从词语、称谓、地名、器物、建筑、礼仪、气味或制度痕迹进入，让主题从历史沉积、认知错位和文明位置中延迟显影；禁止直接用抽象判断开场。', 'opening should contain concrete symbolic entry before abstract thesis'),
  ('author_lexicon_lifecycle_001', 'immersive_historical_synthetic_narrative', 'lexicon', 'block', '生成时只能使用 DataBase active 词库；候选词、记忆命中和模型自造词不得静默晋升为当用词。', 'active lexicon must come from vocabulary rows tagged creative-style or author-active'),
  ('author_no_soft_porn_001', 'immersive_historical_synthetic_narrative', 'content_boundary', 'block', '作者模型不得要求擦边软色情；亲密关系、控制、依存和伤害只能作为人物关系张力处理，不能作为刺激性描写目标。', 'reject eroticized task framing')
ON DUPLICATE KEY UPDATE
  protocol_id = VALUES(protocol_id),
  rule_type = VALUES(rule_type),
  severity = VALUES(severity),
  rule_text = VALUES(rule_text),
  check_hint = VALUES(check_hint),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO creative_source_materials
  (id, category, title, use_case, payload_json, source_doc)
VALUES
  ('src_ishiwara_final_war', 'japanese_right', '石原莞尔《最终战争论》《战争史大观》', '用于构建满蒙生命线、绝对国防圈、东方王道与西方霸道决战等内部论证。', CAST('{"keywords":["满蒙","生命线","绝对国防圈","最终战论"]}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('src_kita_ikki_reform', 'japanese_right', '北一辉《日本改造法案大纲》', '用于昭和维新、国家改造、尊皇讨奸等狂热政治语言。', CAST('{"keywords":["昭和维新","国家改造","尊皇讨奸"]}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('src_goto_shinpei', 'japanese_right', '后藤新平“文装的武备”', '用于把经济、文化、交通和调查包装成战略经营手段。', CAST('{"keywords":["文装的武备","经营","调查","同化"]}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('src_litton_report', 'historical_document', '《李顿调查团报告》', '用于并置承认特殊权益与否认满洲国合法性的国际矛盾。', CAST('{"keywords":["国联","特殊权益","合法性"]}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('src_manchukuo_documents', 'historical_document', '《满洲国建国宣言》与《日满议定书》', '用于官方辞令和实质条款之间的事实并置。', CAST('{"keywords":["王道乐土","五族协和","密约"]}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('src_mantetsu_reports', 'historical_document', '满铁调查报告', '用于提供冰冷、详尽、可执行的数据和殖民经营材料。', CAST('{"keywords":["满铁","旧惯调查","经济调查"]}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('src_wang_jingwei', 'chinese_internal', '汪精卫电文与和平运动论述', '用于曲线救国、保存元气、和平运动等自辩逻辑。', CAST('{"keywords":["和平运动","保存国家元气","曲线救国"]}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('src_puyi_memoir', 'chinese_internal', '溥仪《我的前半生》', '用于复辟欲望、图章傀儡和龙椅基石已被替换的心理结构。', CAST('{"keywords":["复辟","傀儡","法统"]}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('src_machiavelli', 'western_classical', '马基雅维利《君主论》', '用于狐狸与狮子、驾驭命运等权力政治比照。', CAST('{"keywords":["狐狸","狮子","命运","权力"]}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('src_thucydides', 'western_classical', '修昔底德《伯罗奔尼撒战争史》', '用于强者行其所能为、弱者忍其所必受的现实政治逻辑。', CAST('{"keywords":["强者","弱者","现实政治"]}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('src_classical_poetry', 'literary_visual', '中国古典诗词与《红楼梦》意象', '用于末世悲凉、故国之思、食尽鸟投林等悬置余韵。', CAST('{"keywords":["故国","国破山河在","白茫茫大地"]}' AS JSON), 'gateway/sql/003_creative_style_registry.sql'),
  ('src_visual_xingya_architecture', 'literary_visual', '兴亚式建筑与帝冠式视觉政治', '用于表现融合、扭曲、合法性装饰和秩序幻象。', CAST('{"keywords":["兴亚式","帝冠式","视觉政治"]}' AS JSON), 'gateway/sql/003_creative_style_registry.sql')
  ,('src_csdn_ai_taste_article_2025', 'style_reference', 'CSDN：AI味检测与论文写作去AI痕迹总结', '用于抽象出空泛套话、表达重复、引用模糊、情绪化判断、内容堆砌、逻辑跳跃和术语不足七类去AI痕迹门禁。', CAST('{"url":"https://blog.csdn.net/qq_64378896/article/details/147399572","verified":"page_readable_2026-05-12","derivedRules":["specificity","evidence_chain","paragraph_logic","perspective_accountability","terminology_precision"]}' AS JSON), 'gateway/sql/003_creative_style_registry.sql')
ON DUPLICATE KEY UPDATE
  category = VALUES(category),
  title = VALUES(title),
  use_case = VALUES(use_case),
  payload_json = VALUES(payload_json),
  source_doc = VALUES(source_doc),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO vocabulary (content, type, category, tags, note)
VALUES
  ('肇建', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('膺惩', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('绥靖', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('戡乱', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('统制', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('总力战', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('生命线', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('绝对防卫圈', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('生存空间', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('千年未有之大变局', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('非常之时', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('行非常之事', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('生死存亡之秋', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('以屈求伸', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('知其不可为而为之', 'vocabulary', '宏大叙事', CAST('["creative-style","historical-narrative"]' AS JSON), 'creative-style import: 核心论述与历史哲学优先词'),
  ('王道乐土', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('日满亲善', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('大东亚共荣', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('圣战', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('现地解决', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('暴支', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('匪贼', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('不逞之徒', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('玉碎', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('御稜威', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('大御心', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('满蒙', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('特殊权益', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('皇军武威', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('帝国眷顾', 'vocabulary', '日方语境', CAST('["creative-style","japanese-right-context"]' AS JSON), 'creative-style import: 日方/右翼历史语境强制词候选'),
  ('日寇', 'vocabulary', '中方语境', CAST('["creative-style","chinese-resistance-context"]' AS JSON), 'creative-style import: 中方/抗战语境词'),
  ('倭贼', 'vocabulary', '中方语境', CAST('["creative-style","chinese-resistance-context"]' AS JSON), 'creative-style import: 中方/抗战语境词'),
  ('伪逆', 'vocabulary', '中方语境', CAST('["creative-style","chinese-resistance-context"]' AS JSON), 'creative-style import: 中方/抗战语境词'),
  ('抗日救国', 'vocabulary', '中方语境', CAST('["creative-style","chinese-resistance-context"]' AS JSON), 'creative-style import: 中方/抗战语境词'),
  ('焦土抗战', 'vocabulary', '中方语境', CAST('["creative-style","chinese-resistance-context"]' AS JSON), 'creative-style import: 中方/抗战语境词'),
  ('战略转进', 'vocabulary', '中方语境', CAST('["creative-style","chinese-resistance-context"]' AS JSON), 'creative-style import: 中方/抗战语境词'),
  ('持久战', 'vocabulary', '中方语境', CAST('["creative-style","chinese-resistance-context"]' AS JSON), 'creative-style import: 中方/抗战语境词'),
  ('空间换时间', 'vocabulary', '中方语境', CAST('["creative-style","chinese-resistance-context"]' AS JSON), 'creative-style import: 中方/抗战语境词'),
  ('地无分南北，人无分老幼', 'vocabulary', '中方语境', CAST('["creative-style","chinese-resistance-context"]' AS JSON), 'creative-style import: 中方/抗战语境词'),
  ('四万万生灵', 'vocabulary', '中方语境', CAST('["creative-style","chinese-resistance-context"]' AS JSON), 'creative-style import: 中方/抗战语境词'),
  ('历史辩证法', 'vocabulary', '苏联语境', CAST('["creative-style","left-soviet-context"]' AS JSON), 'creative-style import: 苏联/左翼语境词'),
  ('唯物主义', 'vocabulary', '苏联语境', CAST('["creative-style","left-soviet-context"]' AS JSON), 'creative-style import: 苏联/左翼语境词'),
  ('集体化', 'vocabulary', '苏联语境', CAST('["creative-style","left-soviet-context"]' AS JSON), 'creative-style import: 苏联/左翼语境词'),
  ('肃反', 'vocabulary', '苏联语境', CAST('["creative-style","left-soviet-context"]' AS JSON), 'creative-style import: 苏联/左翼语境词'),
  ('清洗', 'vocabulary', '苏联语境', CAST('["creative-style","left-soviet-context"]' AS JSON), 'creative-style import: 苏联/左翼语境词'),
  ('人民民主专政', 'vocabulary', '苏联语境', CAST('["creative-style","left-soviet-context"]' AS JSON), 'creative-style import: 苏联/左翼语境词'),
  ('元老院与罗马人民', 'vocabulary', '古典语境', CAST('["creative-style","classical-imperial-context"]' AS JSON), 'creative-style import: 罗马/古典帝国语境词'),
  ('罗马的和平', 'vocabulary', '古典语境', CAST('["creative-style","classical-imperial-context"]' AS JSON), 'creative-style import: 罗马/古典帝国语境词'),
  ('行省', 'vocabulary', '古典语境', CAST('["creative-style","classical-imperial-context"]' AS JSON), 'creative-style import: 罗马/古典帝国语境词'),
  ('凯旋式', 'vocabulary', '古典语境', CAST('["creative-style","classical-imperial-context"]' AS JSON), 'creative-style import: 罗马/古典帝国语境词'),
  ('王纲解纽', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('礼崩乐坏', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('世家大族', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('治外法权', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('南满铁路', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('满铁', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('九国公约', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('李顿调查团', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('满洲国', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('协和会', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('满洲重工业开发株式会社', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('柳条湖事件', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('九一八事变', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('皇道派', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('最终战论', 'vocabulary', '历史术语', CAST('["creative-style","historical-term"]' AS JSON), 'creative-style import: 特定历史术语'),
  ('肌体', 'vocabulary', '比喻系统', CAST('["creative-style","body-disease-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('毒瘤', 'vocabulary', '比喻系统', CAST('["creative-style","body-disease-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('痼疾', 'vocabulary', '比喻系统', CAST('["creative-style","body-disease-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('血脉', 'vocabulary', '比喻系统', CAST('["creative-style","body-disease-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('齿轮', 'vocabulary', '比喻系统', CAST('["creative-style","machine-engineering-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('蓝图', 'vocabulary', '比喻系统', CAST('["creative-style","machine-engineering-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('轴承', 'vocabulary', '比喻系统', CAST('["creative-style","machine-engineering-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('熔炉', 'vocabulary', '比喻系统', CAST('["creative-style","machine-engineering-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('曙光', 'vocabulary', '比喻系统', CAST('["creative-style","optics-direction-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('灯塔', 'vocabulary', '比喻系统', CAST('["creative-style","optics-direction-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('透镜', 'vocabulary', '比喻系统', CAST('["creative-style","optics-direction-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('暗流', 'vocabulary', '比喻系统', CAST('["creative-style","water-geography-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('支流', 'vocabulary', '比喻系统', CAST('["creative-style","water-geography-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('堰塞湖', 'vocabulary', '比喻系统', CAST('["creative-style","water-geography-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('大厦', 'vocabulary', '比喻系统', CAST('["creative-style","architecture-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('基石', 'vocabulary', '比喻系统', CAST('["creative-style","architecture-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('栋梁', 'vocabulary', '比喻系统', CAST('["creative-style","architecture-metaphor"]' AS JSON), 'creative-style import: 比喻系统词'),
  ('瓦砾', 'vocabulary', '比喻系统', CAST('["creative-style","architecture-metaphor"]' AS JSON), 'creative-style import: 比喻系统词')
  ,('回旋余地', 'vocabulary', '制度压力', CAST('["creative-style","author-active","institutional-decay"]' AS JSON), 'creative-style import: 作者模型 active 词；制度和行动空间')
  ,('名义法统', 'vocabulary', '制度压力', CAST('["creative-style","author-active","institutional-decay"]' AS JSON), 'creative-style import: 作者模型 active 词；合法性与权力外壳')
  ,('实质控制', 'vocabulary', '制度压力', CAST('["creative-style","author-active","institutional-decay"]' AS JSON), 'creative-style import: 作者模型 active 词；事实权力结构')
  ,('秩序残骸', 'vocabulary', '制度压力', CAST('["creative-style","author-active","institutional-decay"]' AS JSON), 'creative-style import: 作者模型 active 词；崩塌后的制度质感')
  ,('文书铁轨', 'vocabulary', '制度压力', CAST('["creative-style","author-active","engineering-metaphor"]' AS JSON), 'creative-style import: 作者模型 active 词；官僚流程和不可逆推进')
  ,('税册', 'vocabulary', '物质细节', CAST('["creative-style","author-active","material-detail"]' AS JSON), 'creative-style import: 作者模型 active 词；制度落到纸面和账册')
  ,('军靴', 'vocabulary', '物质细节', CAST('["creative-style","author-active","material-detail"]' AS JSON), 'creative-style import: 作者模型 active 词；军事压迫的可感物')
  ,('煤烟', 'vocabulary', '物质细节', CAST('["creative-style","author-active","material-detail"]' AS JSON), 'creative-style import: 作者模型 active 词；工业和战时气味')
  ,('封蜡', 'vocabulary', '物质细节', CAST('["creative-style","author-active","material-detail"]' AS JSON), 'creative-style import: 作者模型 active 词；文书、密令和旧制度质感')
  ,('潮气', 'vocabulary', '物质细节', CAST('["creative-style","author-active","material-detail"]' AS JSON), 'creative-style import: 作者模型 active 词；环境压迫与腐坏感')
  ,('铁锈', 'vocabulary', '物质细节', CAST('["creative-style","author-active","material-detail"]' AS JSON), 'creative-style import: 作者模型 active 词；机器、武器和废墟')
  ,('账簿', 'vocabulary', '物质细节', CAST('["creative-style","author-active","material-detail"]' AS JSON), 'creative-style import: 作者模型 active 词；利益计算和组织运行')
  ,('沉默的签押', 'vocabulary', '动作意象', CAST('["creative-style","author-active","action-image"]' AS JSON), 'creative-style import: 作者模型 active 词；不直接抒情的权力动作')
  ,('迟疑的印章', 'vocabulary', '动作意象', CAST('["creative-style","author-active","action-image"]' AS JSON), 'creative-style import: 作者模型 active 词；制度动作中的人物裂缝')
  ,('压低的灯火', 'vocabulary', '动作意象', CAST('["creative-style","author-active","action-image"]' AS JSON), 'creative-style import: 作者模型 active 词；克制、密谋和局促空间')
  ,('没有回声的命令', 'vocabulary', '动作意象', CAST('["creative-style","author-active","action-image"]' AS JSON), 'creative-style import: 作者模型 active 词；权力失效和孤立')
  ,('利益绞盘', 'vocabulary', '比喻系统', CAST('["creative-style","author-active","engineering-metaphor"]' AS JSON), 'creative-style import: 作者模型 active 词；利益结构缓慢收紧')
  ,('制度齿缝', 'vocabulary', '比喻系统', CAST('["creative-style","author-active","engineering-metaphor"]' AS JSON), 'creative-style import: 作者模型 active 词；个体被制度夹住的位置')
  ,('暗渠', 'vocabulary', '比喻系统', CAST('["creative-style","author-active","water-geography-metaphor"]' AS JSON), 'creative-style import: 作者模型 active 词；地下流动和隐性秩序')
  ,('断堤', 'vocabulary', '比喻系统', CAST('["creative-style","author-active","water-geography-metaphor"]' AS JSON), 'creative-style import: 作者模型 active 词；秩序失控')
  ,('余烬', 'vocabulary', '比喻系统', CAST('["creative-style","author-active","historical-coldness"]' AS JSON), 'creative-style import: 作者模型 active 词；战后残留和未熄灭的意志')
  ,('冷账', 'vocabulary', '时事评论', CAST('["creative-style","author-active","commentary"]' AS JSON), 'creative-style import: 作者模型 active 词；事实核算与利益盘点')
  ,('利益剖面', 'vocabulary', '时事评论', CAST('["creative-style","author-active","commentary"]' AS JSON), 'creative-style import: 作者模型 active 词；时事评论结构词')
  ,('制度成本', 'vocabulary', '时事评论', CAST('["creative-style","author-active","commentary"]' AS JSON), 'creative-style import: 作者模型 active 词；时事评论结构词')
  ,('事实链', 'vocabulary', '时事评论', CAST('["creative-style","author-active","commentary"]' AS JSON), 'creative-style import: 作者模型 active 词；事实与判断分离')
  ,('转化路径', 'vocabulary', '营业文案', CAST('["creative-style","author-active","copywriting"]' AS JSON), 'creative-style import: 作者模型 active 词；文案目标行动')
  ,('第一屏判断', 'vocabulary', '营业文案', CAST('["creative-style","author-active","copywriting"]' AS JSON), 'creative-style import: 作者模型 active 词；页面文案决策')
  ,('购买理由', 'vocabulary', '营业文案', CAST('["creative-style","author-active","copywriting"]' AS JSON), 'creative-style import: 作者模型 active 词；文案利益点')
  ,('行动指令', 'vocabulary', '营业文案', CAST('["creative-style","author-active","copywriting"]' AS JSON), 'creative-style import: 作者模型 active 词；CTA')
  ,('名称漂移', 'vocabulary', '观念入口', CAST('["creative-style","author-active","image-concept-entry"]' AS JSON), 'creative-style import: 意象-概念入口；称谓变化引出历史视角')
  ,('语义残骸', 'vocabulary', '观念入口', CAST('["creative-style","author-active","image-concept-entry"]' AS JSON), 'creative-style import: 意象-概念入口；词语保留的历史损伤')
  ,('文明裂缝', 'vocabulary', '观念入口', CAST('["creative-style","author-active","image-concept-entry"]' AS JSON), 'creative-style import: 意象-概念入口；符号背后的文明位置冲突')
  ,('认知错位', 'vocabulary', '观念入口', CAST('["creative-style","author-active","image-concept-entry"]' AS JSON), 'creative-style import: 意象-概念入口；同一事物在不同视角中的偏差')
  ,('身份不稳定', 'vocabulary', '观念入口', CAST('["creative-style","author-active","image-concept-entry"]' AS JSON), 'creative-style import: 意象-概念入口；命名和归属的摇晃感')
  ,('历史沉积', 'vocabulary', '观念入口', CAST('["creative-style","author-active","image-concept-entry"]' AS JSON), 'creative-style import: 意象-概念入口；词语、建筑和礼仪中的时间层积')
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

INSERT INTO banned_words (content, type, category, reason, alternative)
VALUES
  ('CEO', 'modern', '现代商业词汇', 'creative-style ban: 现代商业、互联网、游戏术语破坏历史氛围', '掌柜/社首/阁僚，按语境改写'),
  ('商业模式', 'modern', '现代商业词汇', 'creative-style ban: 现代商业、互联网、游戏术语破坏历史氛围', '经营之道'),
  ('痛点', 'modern', '现代商业词汇', 'creative-style ban: 现代商业、互联网、游戏术语破坏历史氛围', '弊病/症结'),
  ('赛道', 'modern', '现代商业词汇', 'creative-style ban: 现代商业、互联网、游戏术语破坏历史氛围', '门类/行当'),
  ('赋能', 'modern', '现代商业词汇', 'creative-style ban: 现代商业、互联网、游戏术语破坏历史氛围', '助成/授力，按语境改写'),
  ('打造', 'modern', '现代商业词汇', 'creative-style ban: 现代商业、互联网、游戏术语破坏历史氛围', '营建/铸成'),
  ('玩家', 'modern', '现代商业词汇', 'creative-style ban: 现代商业、互联网、游戏术语破坏历史氛围', '参与者/局中人'),
  ('降维打击', 'modern', '现代商业词汇', 'creative-style ban: 现代商业、互联网、游戏术语破坏历史氛围', '以高制低'),
  ('闭环', 'modern', '现代商业词汇', 'creative-style ban: 现代商业、互联网、游戏术语破坏历史氛围', '循环/合围'),
  ('内卷', 'modern', '现代网络/商业词汇', 'creative-style ban: 现代网络词破坏历史氛围', '倾轧/内耗'),
  ('绝绝子', 'ai_style', '现代网络/商业词汇', 'creative-style ban: 网络腔破坏文学文本', NULL),
  ('凛冽', 'ai_style', 'AI腔', 'creative-style ban: AI生成文本常见空洞高级感词汇，除非作为审查对象', '寒峭/肃然，按语境改写'),
  ('静默', 'ai_style', 'AI腔', 'creative-style ban: AI生成文本常见空洞高级感词汇，除非作为审查对象', '沉默/寂然'),
  ('勾勒', 'ai_style', 'AI腔', 'creative-style ban: AI生成文本常见空洞高级感词汇', '写出/画出，按语境改写'),
  ('谱写', 'ai_style', 'AI腔', 'creative-style ban: AI生成文本常见空洞高级感词汇', '写下/铸成，按语境改写'),
  ('张力', 'ai_style', 'AI腔', 'creative-style ban: AI生成文本常见抽象评语', '冲突/牵扯，按具体事实改写'),
  ('触目惊心', 'ai_style', 'AI腔', 'creative-style ban: AI生成文本常见空洞评语', '改成具体景物或事实'),
  ('教科书般的', 'ai_style', 'AI腔', 'creative-style ban: AI生成文本常见空洞高级感词汇', NULL),
  ('优雅地', 'ai_style', 'AI腔', 'creative-style ban: AI生成文本常见空洞高级感词汇', NULL),
  ('近年来', 'ai_style', '空泛套话', 'creative-style signal: AI味常见空泛开头；缺少年份、地点、对象或事件锚点', '改为具体年份、时期或事件'),
  ('随着时代的发展', 'ai_style', '空泛套话', 'creative-style signal: AI味常见空泛开头；没有提供有效信息', '删除，改写为具体制度、技术或事件变化'),
  ('引起广泛关注', 'ai_style', '空泛套话', 'creative-style signal: AI味常见泛化判断；未说明谁关注、为何关注、如何体现', '写明报纸、电文、会议、舆论或具体群体反应'),
  ('具有重要意义', 'ai_style', '空泛套话', 'creative-style signal: AI味常见空泛结论；缺少事实承载', '改成具体后果或利益变化'),
  ('产生了深远影响', 'ai_style', '空泛套话', 'creative-style signal: AI味常见空泛结论；缺少时间、对象和机制', '改成具体影响对象、路径和结果'),
  ('顺带一提', 'ai_style', '空泛套话', 'creative-style signal: AI味常见提示腔；常替代真正的段落逻辑', '直接写事实或转折'),
  ('不难发现', 'ai_style', '空泛套话', 'creative-style signal: AI味常见作者代读；削弱证据责任', '用事实推出判断'),
  ('总的来说', 'ai_style', '空泛套话', 'creative-style signal: AI味常见总结腔；成品正文应避免空泛收束', '删除或改成具体画面/结论证据'),
  ('综上所述', 'ai_style', '空泛套话', 'creative-style signal: AI味常见论文式总结；不适合沉浸式历史叙事正文', '删除或改为文件/人物视角结论'),
  ('研究表明', 'ai_style', '模糊引用', 'creative-style signal: 模糊引用；没有作者、年份、材料或样本', '写明文献、档案、报刊、账册或调查来源'),
  ('有学者认为', 'ai_style', '模糊引用', 'creative-style signal: 模糊引用；没有责任主体', '写明人物、著作、年份或删除'),
  ('相关数据显示', 'ai_style', '模糊引用', 'creative-style signal: 模糊引用；没有数据出处和口径', '写明统计来源、口径、年份'),
  ('资料显示', 'ai_style', '模糊引用', 'creative-style signal: 模糊引用；没有材料来源', '写明档案、报纸、电文、账册或证词'),
  ('事实证明', 'god_view', '后见之明', 'creative-style ban: 后见之明和作者预判腔；用结果替代过程', '改为当时可见事实'),
  ('显而易见', 'ai_style', '逻辑空转', 'creative-style signal: 用语气代替论证；缺少推理过程', '补足事实到判断的链条'),
  ('不可否认', 'ai_style', '逻辑空转', 'creative-style signal: 用断言压过证据；缺少可核验依据', '补充证据或删除'),
  ('进一步推动了', 'ai_style', '逻辑空转', 'creative-style signal: AI味常见因果跳跃；未说明机制', '写明推动机制和中介事实'),
  ('起到了积极作用', 'ai_style', '逻辑空转', 'creative-style signal: 空泛价值判断；缺少具体效果', '改成具体效果或删除'),
  ('做了调查', 'ai_style', '术语不足', 'creative-style signal: 口语泛化；专业场景缺少方法和材料', '按语境改为走访、清查、检地、人口普查、旧惯调查等'),
  ('弄清楚关系', 'ai_style', '术语不足', 'creative-style signal: 口语泛化；缺少关系类型和分析方法', '改为厘清权属、派系、血缘、契约、利害或指挥链'),
  ('算法', 'modern', '现代科技比喻', 'creative-style ban: 现代科技比喻破坏历史语境', '算术/法度，按语境改写'),
  ('副本', 'modern', '游戏词汇', 'creative-style ban: 现代游戏词汇破坏历史语境', NULL),
  ('通关', 'modern', '游戏词汇', 'creative-style ban: 现代游戏词汇破坏历史语境', NULL),
  ('氪金', 'modern', '游戏词汇', 'creative-style ban: 现代游戏词汇破坏历史语境', NULL),
  ('潜意识', 'modern', '现代心理学术语', 'creative-style ban: 现代心理学术语不得进入历史POV正文', '心底/隐念，按时代语境改写'),
  ('解构', 'modern', '现代哲学术语', 'creative-style ban: 后世理论词不得进入历史POV正文', '拆解/辨析，按时代语境改写'),
  ('后来我们知道', 'god_view', '后见之明', 'creative-style ban: 禁止上帝视角和后见之明', NULL),
  ('历史证明', 'god_view', '后见之明', 'creative-style ban: 禁止上帝视角和后见之明', NULL),
  ('具有讽刺意味的是', 'god_view', '后见之明', 'creative-style ban: 禁止作者直接点明反讽', '改用事实并置'),
  ('遗憾的是', 'god_view', '作者评论', 'creative-style ban: 禁止作者直接抒情和总结', '删除或改成客观事实'),
  ('这是多么可悲啊', 'subjective', '作者抒情', 'creative-style ban: 禁止作者直接抒情', '改成动作、环境或感官白描'),
  ('镜头', 'format', '镜头语言', 'creative-style ban: 成品正文不得出现影视镜头语言', '直接写可感场景'),
  ('画面感', 'format', '镜头语言', 'creative-style ban: 成品正文不得出现影视镜头语言', '直接写可感场景'),
  ('列表', 'format', '格式问题', 'creative-style ban: 成品文学正文不得列表分点', '改为连续叙述'),
  ('小括号补充', 'parentheses', '括号滥用', 'creative-style ban: 正文不得用括号作旁白补充', '改写为自然句')
  ,('擦边', 'content_boundary', '软色情任务框架', 'creative-style ban: 作者模型不接受擦边软色情作为生成目标', NULL)
  ,('软色情', 'content_boundary', '软色情任务框架', 'creative-style ban: 作者模型不接受擦边软色情作为生成目标', NULL)
  ,('性张力', 'content_boundary', '软色情任务框架', 'creative-style ban: 亲密关系只能作为人物关系张力处理，不能作为刺激性卖点', '关系张力/控制关系，按剧情语境改写')
  ,('荷尔蒙', 'content_boundary', '软色情任务框架', 'creative-style ban: 避免把人物关系写成刺激性身体卖点', '冲动/恐惧/依附，按人物动机改写')
  ,('暧昧拉扯', 'content_boundary', '软色情任务框架', 'creative-style ban: 避免网络化情感营销腔', '依附与反抗/沉默的对峙')
  ,('高级感', 'ai_style', 'AI腔', 'creative-style ban: 空泛审美评价，不进入成品正文', NULL)
  ,('氛围感', 'ai_style', 'AI腔', 'creative-style ban: 空泛审美评价，不进入成品正文', '具体光线、气味、动作或物件')
  ,('宿命感', 'ai_style', 'AI腔', 'creative-style ban: 空泛审美评价，不进入成品正文', '用不可逆行动和事实并置表现')
  ,('史诗感', 'ai_style', 'AI腔', 'creative-style ban: 空泛审美评价，不进入成品正文', '用具体战争、制度和人物代价表现')
  ,('极致', 'ai_style', 'AI腔', 'creative-style ban: 空泛强化词，不进入成品正文', NULL)
  ,('深刻诠释', 'ai_style', 'AI腔', 'creative-style ban: 模板化评论腔', '删除或改成具体论证')
  ,('生动展现', 'ai_style', 'AI腔', 'creative-style ban: 模板化评论腔', '删除或改成具体事实')
  ,('不禁让人思考', 'ai_style', 'AI腔', 'creative-style ban: 模板化总结句', '删除')
  ,('值得注意的是', 'ai_style', '空泛套话', 'creative-style signal: 模板化过渡句；词汇命中只提示段落可能缺少事实推进，不能单独判死', '直接写事实')
ON DUPLICATE KEY UPDATE
  type = COALESCE(NULLIF(type, ''), VALUES(type)),
  category = COALESCE(NULLIF(category, ''), VALUES(category)),
  reason = CASE
    WHEN reason IS NULL OR reason = '' THEN VALUES(reason)
    WHEN VALUES(reason) LIKE '%creative-style signal:%' THEN VALUES(reason)
    WHEN reason LIKE '%creative-style ban:%' THEN reason
    ELSE CONCAT(reason, '；', VALUES(reason))
  END,
  alternative = COALESCE(alternative, VALUES(alternative)),
  updated_at = CURRENT_TIMESTAMP;
