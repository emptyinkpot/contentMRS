function normalizeInputText(input) {
    return String(input.text || "");
}
function excerptAt(text, index, length) {
    const start = Math.max(0, index - 12);
    const end = Math.min(text.length, index + length + 12);
    return text.slice(start, end).replace(/\s+/g, " ").trim();
}
function detectRegexMatches(input, rule, patterns, message, fixAction, fixInstruction, limit = 24) {
    const text = normalizeInputText(input);
    const violations = [];
    for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
        let match;
        while ((match = regex.exec(text)) && violations.length < limit) {
            const index = match.index;
            const value = match[0];
            violations.push({
                ruleId: rule.id,
                category: rule.category,
                severity: rule.severity,
                message,
                fixAction,
                fixInstruction,
                excerpt: excerptAt(text, index, value.length),
                index,
            });
            if (value.length === 0)
                regex.lastIndex += 1;
        }
    }
    return violations;
}
/** Maps ContentBase article evaluation task types to creative-rule appliesTo buckets. */
export function resolveCreativeRuleTaskType(taskType) {
    const raw = String(taskType || "").trim().toLowerCase();
    if (!raw)
        return "essay";
    if (raw === "film_commentary" || raw === "film-contemporary-essay")
        return "film_commentary";
    if (raw === "article_draft" || raw === "article")
        return "essay";
    return raw;
}
function ruleAppliesToTask(rule, taskType) {
    const bucket = resolveCreativeRuleTaskType(taskType);
    return rule.appliesTo.includes(bucket);
}
function toInventoryItem(rule) {
    return {
        id: rule.id,
        category: rule.category,
        owner: rule.owner,
        severity: rule.severity,
        appliesTo: [...rule.appliesTo],
        definition: rule.definition,
        detectorId: rule.detectorId,
        enforcement: rule.enforcement,
        failureMode: rule.failureMode,
        rationale: rule.rationale,
    };
}
function hasMeaningfulDirectCopy(source, text) {
    const normalizedSource = source.replace(/\s+/g, "");
    const normalizedText = text.replace(/\s+/g, "");
    if (normalizedSource.length < 24 || normalizedText.length < 24)
        return false;
    for (let index = 0; index <= normalizedSource.length - 24; index += 8) {
        const chunk = normalizedSource.slice(index, index + 24);
        if (/^[\p{P}\p{S}\dA-Za-z]+$/u.test(chunk))
            continue;
        if (normalizedText.includes(chunk))
            return true;
    }
    return false;
}
function normalizeTextForAnchor(value) {
    return value.replace(/\s+/g, "").trim();
}
function extractChineseAnchors(values, limit) {
    const stopWords = new Set([
        "本章",
        "必须",
        "通过",
        "一个",
        "一种",
        "开始",
        "最终",
        "角色",
        "情节",
        "场景",
        "关系",
        "世界",
        "发现",
        "选择",
        "推进",
    ]);
    const anchors = new Set();
    for (const value of values) {
        String(value || "")
            .split(/[，。,；;、\s《》“”"『』「」【】\[\]！？!?…]+/)
            .map((item) => item.trim())
            .filter((item) => item.length >= 2)
            .forEach((item) => {
            if (stopWords.has(item))
                return;
            if (/^[A-Za-z0-9]+$/.test(item))
                return;
            if (item.length <= 8) {
                anchors.add(item);
                return;
            }
            anchors.add(item.slice(0, 6));
            anchors.add(item.slice(-6));
        });
    }
    return Array.from(anchors).slice(0, limit);
}
function hasAnchor(text, anchor) {
    const normalizedText = normalizeTextForAnchor(text);
    const normalizedAnchor = normalizeTextForAnchor(anchor);
    if (!normalizedText || !normalizedAnchor)
        return false;
    if (normalizedText.includes(normalizedAnchor))
        return true;
    return normalizedAnchor.length >= 4
        ? normalizedText.includes(normalizedAnchor.slice(0, 4)) || normalizedText.includes(normalizedAnchor.slice(-4))
        : false;
}
export const CREATIVE_EXECUTABLE_RULES = [
    {
        id: "LANG-PUNCT-001",
        category: "language",
        owner: "DataBase.schemas.creative.creative-rules",
        severity: "block",
        appliesTo: ["fiction_chapter", "essay", "historical_short_video"],
        definition: "正文禁止小括号、冒号、破折号或双连字符进入最终稿（影评 film_commentary 走 LANG-PUNCT-FILM-001）。",
        detectorId: "detect-banned-punctuation-v1",
        enforcement: "generation_quality_gate",
        failureMode: "revise_once_then_fail",
        rationale: "这些标点会诱发括号补充、解释腔、翻译腔和 AI 式结构提示。",
        detect(input) {
            return detectRegexMatches(input, this, [/[()（）:：]/u, /——|—|--/u], "正文含禁用标点，必须改写为自然句读。", "remove_banned_punctuation", "删除小括号、冒号、破折号和双连字符。把括号补充改成正文句子，把冒号解释改成自然承接，把破折号转折改成短句或逗号句。");
        },
    },
    {
        id: "LANG-PUNCT-FILM-001",
        category: "language",
        owner: "DataBase.schemas.creative.creative-rules",
        severity: "block",
        appliesTo: ["film_commentary"],
        definition: "影视评论散文：禁括号旁白；冒号/破折号限量；禁分镜说明书体。",
        detectorId: "detect-film-commentary-surface-v1",
        enforcement: "generation_quality_gate",
        failureMode: "revise_until_pass",
        rationale: "议论可抒情，但括号旁白与镜头推近属于 AI/说明书病，不是作者散文节奏。",
        detect(input) {
            const text = normalizeInputText(input);
            const violations = [];
            const paren = detectRegexMatches(input, this, [/[()（）]/u], "影评正文禁止括号旁白，把补充写进自然句。", "remove_banned_punctuation", "删除小括号，把括号内信息并入前后句。", 8);
            violations.push(...paren);
            const camera = detectRegexMatches(input, this, [/镜头(?:推近|拉远|缓缓|一转)|画面一转|镜头语言/gu], "禁止分镜说明书体（可用银幕、场面、剪辑，不用镜头推近/画面一转）。", "remove_banned_punctuation", "改成银幕场面或演员动作，不写摄影机运动指令。", 6);
            violations.push(...camera);
            const colonDashCount = (text.match(/:：/gu) || []).length + (text.match(/——|—|--/gu) || []).length;
            const charBudget = Math.max(800, text.length);
            const limit = Math.max(3, Math.ceil(charBudget / 600));
            if (colonDashCount > limit) {
                violations.push({
                    ruleId: "LANG-PUNCT-FILM-001",
                    category: "language",
                    severity: "block",
                    message: `冒号/破折号过多（${colonDashCount}，影评建议 ≤${limit}），改短句承接。`,
                    fixAction: "remove_banned_punctuation",
                    fixInstruction: "把冒号解释和破折号转折拆成两到三句，用逗号或句号承接。",
                    excerpt: text.slice(0, 80),
                });
            }
            return violations;
        },
    },
    {
        id: "LANG-ASCII-001",
        category: "language",
        owner: "DataBase.schemas.creative.creative-rules",
        severity: "block",
        appliesTo: ["fiction_chapter", "essay", "historical_short_video", "commentary", "film_commentary"],
        definition: "正文禁止孤立英文 token、乱码、替换字符、JSON/Markdown/code fence 泄漏。",
        detectorId: "detect-ascii-mojibake-markdown-leak-v1",
        enforcement: "generation_quality_gate",
        failureMode: "revise_once_then_fail",
        rationale: "孤立英文和格式残留说明模型没有停留在中文正文执行路径。",
        detect(input) {
            return detectRegexMatches(input, this, [
                /\b[A-Za-z]{2,}(?:[-_][A-Za-z0-9]+)*\b/u,
                /[\uFFFD\uFEFF]/u,
                /Ã.|Â.|â[€\u0080-\u00BF]|锟斤拷/u,
                /```|~~~|^\s{0,3}#{1,6}\s|\{[\s\S]{0,80}"[A-Za-z0-9_]+"/mu,
            ], "正文含英文、乱码或格式泄漏，必须删除并改写为中文正文。", "remove_ascii_noise", "删除孤立英文 token、乱码、Markdown 标记、代码围栏和 JSON 片段。保留其含义时必须重写成自然中文正文。");
        },
    },
    {
        id: "LANG-EURO-001",
        category: "language",
        owner: "DataBase.schemas.creative.creative-rules",
        severity: "block",
        appliesTo: ["fiction_chapter", "essay", "historical_short_video", "commentary", "film_commentary"],
        definition: "正文禁止欧化中文、翻译腔和抽象名词堆叠句式。",
        detectorId: "detect-europeanized-chinese-v1",
        enforcement: "generation_quality_gate",
        failureMode: "revise_once_then_fail",
        rationale: "欧化句式会把场景写成解释，把人物行动写成概念报告。",
        detect(input) {
            return detectRegexMatches(input, this, [
                /被[^。！？\n]{1,24}所/u,
                /通过[^。！？\n]{1,30}来/u,
                /对于[^。！？\n]{1,20}而言/u,
                /具有[^。！？\n]{1,16}性/u,
                /进行[^。！？\n]{1,18}的/u,
                /作为一(?:个|种|名)[^。！？\n]{1,24}/u,
                /在[^。！？\n]{1,20}方面/u,
            ], "正文含欧化或翻译腔句式，必须改为人物动作、物象和短判断。", "rewrite_europeanized_chinese", "把欧化结构改成中文自然语序。避免通过……来、对于……而言、具有……性、被……所等结构，改成人物动作、物象变化或短判断。");
        },
    },
    {
        id: "CORPUS-IMITATION-001",
        category: "corpus",
        owner: "DataBase.schemas.creative.creative-rules",
        severity: "block",
        appliesTo: ["fiction_chapter", "essay", "historical_short_video", "commentary", "film_commentary"],
        definition: "只能迁移语料的意象、节奏、语义姿态和叙事位置，禁止复写来源句子。",
        detectorId: "detect-direct-corpus-copy-v1",
        enforcement: "generation_quality_gate",
        failureMode: "revise_once_then_fail",
        rationale: "作者语料化用必须是结构迁移，不是复制或同义替换。",
        detect(input) {
            const text = normalizeInputText(input);
            const violations = [];
            for (const passage of input.sourcePassages || []) {
                const source = String(passage.text || passage.excerpt || "");
                if (!source || !hasMeaningfulDirectCopy(source, text))
                    continue;
                violations.push({
                    ruleId: this.id,
                    category: this.category,
                    severity: this.severity,
                    message: `正文疑似复写来源语料：${passage.title || passage.sourceId || "unknown_source"}。`,
                    fixAction: "remove_corpus_copy",
                    fixInstruction: "删除疑似复写来源语料的句群，只保留意象、节奏、语义姿态或叙事位置，并用当前人物、场景和情节重新写。",
                });
            }
            return violations;
        },
    },
    {
        id: "NARRATIVE-DELTA-001",
        category: "narrative",
        owner: "DataBase.schemas.creative.creative-rules",
        severity: "warn",
        appliesTo: ["fiction_chapter"],
        definition: "小说章节必须产生不可逆变化，不能只有气氛、设定或解释。",
        detectorId: "detect-weak-narrative-delta-v1",
        enforcement: "generation_warning_gate",
        failureMode: "warn_and_report",
        rationale: "章节必须改变人物处境、关系、线索或世界认知。",
        detect(input) {
            const text = normalizeInputText(input);
            const hasDelta = /决定|选择|失去|得到|发现|确认|拒绝|背叛|倒塌|死亡|离开|留下|承认|隐瞒|交出|带走|改变/.test(text);
            const mustAdvanceAnchors = extractChineseAnchors(input.narrative?.mustAdvanceBeats || [], 8);
            const missingMustAdvance = mustAdvanceAnchors.filter((anchor) => !hasAnchor(text, anchor));
            const scenePlan = String(input.narrative?.scenePlan || "");
            const plannedDeltaCount = (scenePlan.match(/冲突变化|角色选择|信息增量|结尾钩子/g) || []).length;
            const textDeltaCount = (text.match(/决定|选择|失去|得到|发现|确认|拒绝|背叛|倒塌|死亡|离开|留下|承认|隐瞒|交出|带走|改变/g) || []).length;
            const violations = [];
            if (!hasDelta) {
                violations.push({
                    ruleId: this.id,
                    category: this.category,
                    severity: this.severity,
                    message: "未检测到明确的不可逆变化信号，需要让人物处境、关系或线索发生变化。",
                    fixAction: "restore_narrative_delta",
                    fixInstruction: "补入一个不可逆行动结果，让人物处境、关系、线索或世界认知在本章结束时发生改变。",
                });
            }
            if (missingMustAdvance.length > 0) {
                violations.push({
                    ruleId: this.id,
                    category: this.category,
                    severity: this.severity,
                    message: `本章必须推进项未落地：${missingMustAdvance.slice(0, 5).join("、")}。`,
                    fixAction: "restore_narrative_delta",
                    fixInstruction: `把缺失的必须推进项写成正文行动结果：${missingMustAdvance.slice(0, 5).join("、")}。`,
                });
            }
            if (plannedDeltaCount >= 3 && textDeltaCount < 2) {
                violations.push({
                    ruleId: this.id,
                    category: this.category,
                    severity: this.severity,
                    message: "场景计划要求多次冲突变化，但正文缺少足够的行动结果信号。",
                    fixAction: "restore_narrative_delta",
                    fixInstruction: "按场景计划补足冲突变化、角色选择和信息增量，每个场景至少留下一个可见行动结果。",
                });
            }
            return violations;
        },
    },
    {
        id: "NARRATIVE-OUTLINE-001",
        category: "narrative",
        owner: "DataBase.schemas.creative.creative-rules",
        severity: "warn",
        appliesTo: ["fiction_chapter"],
        definition: "正文必须覆盖章节概要和关键情节锚点，不能只写气氛或旁枝。",
        detectorId: "detect-outline-anchor-coverage-v1",
        enforcement: "generation_warning_gate",
        failureMode: "warn_and_report",
        rationale: "章节生成必须服从当前细纲，否则会产生漂亮但偏航的文本。",
        detect(input) {
            const text = normalizeInputText(input);
            const anchors = extractChineseAnchors([
                input.narrative?.chapterTitle,
                input.narrative?.chapterSummary,
                ...(input.narrative?.keyEvents || []),
            ], 16);
            if (anchors.length < 2)
                return [];
            const hits = anchors.filter((anchor) => hasAnchor(text, anchor));
            const coverage = hits.length / anchors.length;
            return coverage >= 0.35 ? [] : [{
                    ruleId: this.id,
                    category: this.category,
                    severity: this.severity,
                    message: `章节细纲锚点覆盖偏低：${hits.length}/${anchors.length}。缺失锚点：${anchors.filter((anchor) => !hasAnchor(text, anchor)).slice(0, 6).join("、")}。`,
                    fixAction: "restore_outline_anchor",
                    fixInstruction: `把缺失的章节概要或关键情节锚点写进正文行动中：${anchors.filter((anchor) => !hasAnchor(text, anchor)).slice(0, 6).join("、")}。`,
                }];
        },
    },
    {
        id: "NARRATIVE-SCENERY-HOOK-001",
        category: "narrative",
        owner: "DataBase.schemas.creative.creative-rules",
        severity: "warn",
        appliesTo: ["fiction_chapter", "essay", "historical_short_video", "commentary", "film_commentary"],
        definition: "景物描写必须承担叙事压力，开头或结尾应留下物证、称谓、地名或问题钩子。",
        detectorId: "detect-scenery-hook-signal-v1",
        enforcement: "generation_warning_gate",
        failureMode: "warn_and_report",
        rationale: "景物和钩子要参与意义生成，不能成为装饰段落。",
        detect(input) {
            const text = normalizeInputText(input);
            const hasHook = /石|碑|门|雨|风|灰|血|灯|火|地图|名字|称谓|印|信|刀|枪|花|神像|为什么|谁|何处/.test(text);
            return hasHook ? [] : [{
                    ruleId: this.id,
                    category: this.category,
                    severity: this.severity,
                    message: "未检测到足够的物证、称谓、地名或景物钩子信号。",
                    fixAction: "restore_scenery_hook",
                    fixInstruction: "补入承担叙事压力的景物或物证，让它改变人物处境、暴露称谓/地名裂缝，或在章末留下可追踪钩子。",
                }];
        },
    },
];
export function getCreativeRuleInventory() {
    const rules = CREATIVE_EXECUTABLE_RULES.map(toInventoryItem);
    const byCategory = (category) => rules.filter((rule) => rule.category === category);
    return {
        rules,
        languageRules: byCategory("language"),
        narrativeRules: byCategory("narrative"),
        styleRules: byCategory("style"),
        corpusRules: byCategory("corpus"),
        qualityRules: rules.filter((rule) => !["language", "narrative", "corpus", "style"].includes(rule.category)),
    };
}
export function runCreativeRules(input) {
    return CREATIVE_EXECUTABLE_RULES.flatMap((rule) => (ruleAppliesToTask(rule, input.taskType) ? rule.detect(input) : []));
}
