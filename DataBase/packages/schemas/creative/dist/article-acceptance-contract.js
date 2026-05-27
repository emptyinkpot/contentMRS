import { z } from "zod";
import { EvidenceFactAtomSchema } from "@emptyinkpot/database-content-contracts";
import { runCreativeRules } from "./creative-rules.js";
export const ArticleAcceptancePartContractSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    minNonWhitespaceChars: z.number().int().nonnegative().default(0),
    requiredCases: z.array(z.string()).default([]),
    forbiddenCases: z.array(z.string()).default([]),
    requiredSources: z.array(z.string()).default([]),
});
export const ArticleFactAtomSchema = EvidenceFactAtomSchema;
export const ArticleFactClaimSchema = z.object({
    text: z.string().optional(),
    atomIds: z.array(z.string()).default([]),
    inference: z.boolean().default(false),
});
export const ArticleAcceptancePolicySchema = z.object({
    bannedPunctuation: z.array(z.string()).default(["：", ":", "—", "——", "(", ")", "（", "）"]),
    bannedHeadings: z.array(z.string()).default(["文章计划", "语义上下文", "风格约束摘录", "可用证据", "草稿"]),
    bannedNarratorPhrases: z.array(z.string()).default([
        "我们可以看到",
        "我认为",
        "这告诉我们",
        "本文将",
        "接下来",
        "总之",
        "值得注意的是",
        "令人深思的是",
    ]),
    bannedAiPhrases: z.array(z.string()).default([
        "不仅是",
        "更是",
        "通过",
        "实现",
        "基于",
        "进行",
        "围绕",
        "层面",
        "维度",
        "机制",
        "体系",
        "链路",
        "场景",
        "赋能",
        "打造",
        "沉淀",
    ]),
    bannedSyntaxPatterns: z.array(z.string()).default([
        "不仅[^。！？\\n]{0,24}更是",
        "通过[^。！？\\n]{1,40}实现",
        "基于[^。！？\\n]{1,40}进行",
        "在[^。！？\\n]{1,24}层面",
        "从[^。！？\\n]{1,24}维度",
        "呈现出一种",
        "折射出",
        "背后是",
        "某种意义上",
    ]),
    bannedInstallmentMarkers: z.array(z.string()).default([
        "上篇",
        "下篇",
        "上一期",
        "下一期",
        "下期再讲",
        "我们接着说",
    ]),
    bannedUnsupportedImageryPatterns: z.array(z.string()).default([
        "协和医院东门第[一二三四五六七八九十0-9]+根",
        "一九三七年[^。！？\\n]{0,24}修缮",
        "某间办公室[^。！？\\n]{0,24}灯",
        "某人[^。！？\\n]{0,24}表情",
    ]),
    forbidInlineSourceCitations: z.boolean().default(true),
    inlineSourceCitationPatterns: z.array(z.string()).default([
        "\\[S\\d{1,4}\\]",
        "\\[s\\d{1,4}\\]",
    ]),
    preferredTerms: z.array(z.string()).default([]),
    minPreferredTermHits: z.number().int().nonnegative().default(0),
    bannedTerms: z.array(z.string()).default([]),
    factBoundaryStrict: z.boolean().default(false),
    factBoundaryAllowedTerms: z.array(z.string()).default([]),
    factBoundaryIgnoredTerms: z.array(z.string()).default([]),
    factBoundaryForbiddenTerms: z.array(z.string()).default([]),
    factBoundaryRequiredTerms: z.array(z.string()).default([]),
    factBoundaryAtoms: z.array(ArticleFactAtomSchema).default([]),
    factBoundaryRequiredAtomIds: z.array(z.string()).default([]),
});
export const ArticleAcceptanceContractSchema = z.object({
    version: z.literal("article-acceptance-contract.v1").default("article-acceptance-contract.v1"),
    id: z.string().default("article-acceptance-default"),
    taskType: z.string().default("commentary"),
    seamlessInstallments: z.boolean().default(false),
    parts: z.array(ArticleAcceptancePartContractSchema).default([]),
    globalRequiredCases: z.array(z.string()).default([]),
    globalForbiddenCases: z.array(z.string()).default([]),
    globalRequiredSources: z.array(z.string()).default([]),
    policy: ArticleAcceptancePolicySchema.default(() => ArticleAcceptancePolicySchema.parse({})),
});
export const ArticleAcceptanceViolationSchema = z.object({
    ruleId: z.string(),
    severity: z.enum(["block", "warn"]),
    category: z.string(),
    message: z.string(),
    excerpt: z.string().optional(),
    partId: z.string().optional(),
});
export const ArticleAcceptanceReportSchema = z.object({
    version: z.literal("article-acceptance-report.v1"),
    passed: z.boolean(),
    contractId: z.string(),
    violations: z.array(ArticleAcceptanceViolationSchema),
    metrics: z.object({
        partCount: z.number().int().nonnegative(),
        totalNonWhitespaceChars: z.number().int().nonnegative(),
        wordCounts: z.array(z.object({
            partId: z.string(),
            nonWhitespaceChars: z.number().int().nonnegative(),
            minNonWhitespaceChars: z.number().int().nonnegative(),
        })),
        requiredCaseCoverage: z.record(z.string(), z.boolean()),
        forbiddenCaseHits: z.array(z.string()),
        requiredSourceCoverage: z.record(z.string(), z.boolean()),
        preferredTermHits: z.number().int().nonnegative(),
        bannedTermHits: z.array(z.string()),
        creativeRuleBlockCount: z.number().int().nonnegative(),
        factBoundary: z.object({
            strict: z.boolean(),
            atomCount: z.number().int().nonnegative(),
            claimCount: z.number().int().nonnegative(),
            usedAtomIds: z.array(z.string()),
            unauthorizedAtomIds: z.array(z.string()),
            missingRequiredAtomIds: z.array(z.string()),
            unboundClaimCount: z.number().int().nonnegative(),
        }),
    }),
});
export const RecordArticleAcceptanceReportResultSchema = z.object({
    workId: z.number(),
    chapterId: z.number().nullable(),
    chapterNumber: z.number(),
    partId: z.string(),
    blockId: z.string(),
    reportId: z.string(),
    passed: z.boolean(),
    contractId: z.string(),
    blockCount: z.number(),
    warningCount: z.number(),
});
export const RecordArticleAcceptanceReportMutationResponseSchema = z.object({
    ok: z.literal(true),
    action: z.literal("record_article_acceptance_report"),
    idempotencyKey: z.string(),
    actor: z.string(),
    result: z.object({
        affectedRows: z.number(),
        insertId: z.number(),
        warningStatus: z.number(),
    }),
    item: RecordArticleAcceptanceReportResultSchema,
    requestId: z.string(),
});
export const RecordArticleAcceptanceReportPayloadSchema = z.object({
    workId: z.number(),
    chapterId: z.number().optional(),
    chapterNumber: z.number(),
    partId: z.string().optional(),
    reportId: z.string().optional(),
    report: ArticleAcceptanceReportSchema,
    operator: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export function parseArticleAcceptanceContract(value) {
    return ArticleAcceptanceContractSchema.parse(value || {});
}
export function runArticleAcceptance(input) {
    const contract = parseArticleAcceptanceContract(input.contract);
    const parts = normalizeParts(input.body || "", input.partBodies || [], contract.parts);
    const allText = parts.map((part) => part.body).join("\n\n");
    const violations = [];
    const sourcePassages = input.sourcePassages || [];
    let factBoundaryMetrics = {
        strict: Boolean(contract.policy.factBoundaryStrict),
        atomCount: contract.policy.factBoundaryAtoms.length,
        claimCount: input.factClaims?.length || 0,
        usedAtomIds: [],
        unauthorizedAtomIds: [],
        missingRequiredAtomIds: unique(contract.policy.factBoundaryRequiredAtomIds),
        unboundClaimCount: 0,
    };
    const creativeViolations = runCreativeRules({
        text: allText,
        taskType: contract.taskType || "commentary",
        sourcePassages,
    });
    violations.push(...creativeViolations.map(mapCreativeViolation));
    const wordCounts = parts.map((part) => {
        const minNonWhitespaceChars = part.contract?.minNonWhitespaceChars || 0;
        const nonWhitespaceChars = countNonWhitespace(part.body);
        if (minNonWhitespaceChars > 0 && nonWhitespaceChars < minNonWhitespaceChars) {
            violations.push({
                ruleId: "ARTICLE-WORDCOUNT-001",
                severity: "block",
                category: "length",
                partId: part.id,
                message: `文章分段字数不足：${nonWhitespaceChars}/${minNonWhitespaceChars}`,
            });
        }
        return { partId: part.id, nonWhitespaceChars, minNonWhitespaceChars };
    });
    const requiredCases = unique([
        ...contract.globalRequiredCases,
        ...parts.flatMap((part) => part.contract?.requiredCases || []),
    ]);
    const forbiddenCases = unique([
        ...contract.globalForbiddenCases,
        ...parts.flatMap((part) => part.contract?.forbiddenCases || []),
    ]);
    const requiredSources = unique([
        ...contract.globalRequiredSources,
        ...parts.flatMap((part) => part.contract?.requiredSources || []),
    ]);
    const requiredCaseCoverage = Object.fromEntries(requiredCases.map((item) => [item, allText.includes(item)]));
    for (const [item, covered] of Object.entries(requiredCaseCoverage)) {
        if (!covered) {
            violations.push({
                ruleId: "ARTICLE-CASE-REQUIRED-001",
                severity: "block",
                category: "case_coverage",
                message: `缺少必需案例：${item}`,
            });
        }
    }
    const forbiddenCaseHits = forbiddenCases.filter((item) => allText.includes(item));
    for (const item of forbiddenCaseHits) {
        violations.push({
            ruleId: "ARTICLE-CASE-FORBIDDEN-001",
            severity: "block",
            category: "case_coverage",
            message: `命中禁用案例：${item}`,
            excerpt: excerptFor(allText, item),
        });
    }
    const requiredSourceCoverage = Object.fromEntries(requiredSources.map((item) => [
        item,
        allText.includes(item) || sourcePassages.some((source) => source.sourceId === item || source.title === item),
    ]));
    for (const [item, covered] of Object.entries(requiredSourceCoverage)) {
        if (!covered) {
            violations.push({
                ruleId: "ARTICLE-CITATION-001",
                severity: "block",
                category: "citation",
                message: `缺少必需来源或引用锚点：${item}`,
            });
        }
    }
    if (contract.policy.forbidInlineSourceCitations) {
        scanRegexList(allText, contract.policy.inlineSourceCitationPatterns, "ARTICLE-INLINE-SOURCE-CITATION-001", "citation", "正文不得内嵌来源编号，来源应收束到文末来源列表或结构化引用报告", violations);
    }
    scanLiteralList(allText, contract.policy.bannedPunctuation, "ARTICLE-PUNCT-001", "punctuation", "命中禁止符号", violations);
    scanLiteralList(allText, contract.policy.bannedHeadings, "ARTICLE-HEADING-001", "structure", "内部结构标题泄漏到正文", violations);
    scanLiteralList(allText, contract.policy.bannedNarratorPhrases, "ARTICLE-NARRATOR-001", "narrator", "作者讲课口吻泄漏", violations);
    scanLiteralList(allText, contract.policy.bannedAiPhrases, "ARTICLE-AI-PHRASE-001", "style", "命中 AI 腔或现代空泛词", violations, "warn");
    scanLiteralList(allText, contract.policy.bannedTerms, "ARTICLE-BANNED-TERM-001", "lexicon", "命中禁用词", violations);
    scanLiteralList(allText, contract.policy.factBoundaryForbiddenTerms, "ARTICLE-FACT-BOUNDARY-001", "fact_boundary", "命中来源外具体事实词", violations);
    scanMissingLiteralList(allText, contract.policy.factBoundaryRequiredTerms, "ARTICLE-FACT-BOUNDARY-REQUIRED-001", "fact_boundary", "缺少事实边界必需词", violations);
    if (contract.policy.factBoundaryStrict) {
        factBoundaryMetrics = scanStrictFactBoundary(input.factClaims || [], contract.policy.factBoundaryAtoms, contract.policy.factBoundaryRequiredAtomIds, violations);
    }
    scanRegexList(allText, contract.policy.bannedSyntaxPatterns, "ARTICLE-SYNTAX-001", "syntax", "命中欧化或翻译腔结构", violations);
    scanRegexList(allText, contract.policy.bannedUnsupportedImageryPatterns, "ARTICLE-IMAGERY-001", "imagery", "命中无来源具体物象风险", violations);
    if (contract.seamlessInstallments) {
        scanLiteralList(allText, contract.policy.bannedInstallmentMarkers, "ARTICLE-INSTALLMENT-001", "installment", "上下篇衔接标记泄漏", violations);
    }
    const preferredTermHits = contract.policy.preferredTerms
        .map((term) => countOccurrences(allText, term))
        .reduce((sum, count) => sum + count, 0);
    if (contract.policy.minPreferredTermHits > 0 && preferredTermHits < contract.policy.minPreferredTermHits) {
        violations.push({
            ruleId: "ARTICLE-PREFERRED-TERM-001",
            severity: "block",
            category: "lexicon",
            message: `当用词覆盖不足：${preferredTermHits}/${contract.policy.minPreferredTermHits}`,
        });
    }
    const bannedTermHits = unique([
        ...contract.policy.bannedTerms.filter((term) => allText.includes(term)),
        ...contract.policy.bannedAiPhrases.filter((term) => allText.includes(term)),
        ...contract.policy.factBoundaryForbiddenTerms.filter((term) => allText.includes(term)),
    ]);
    const creativeRuleBlockCount = creativeViolations.filter((item) => item.severity === "block").length;
    const blockCount = violations.filter((item) => item.severity === "block").length;
    return {
        version: "article-acceptance-report.v1",
        passed: blockCount === 0,
        contractId: contract.id,
        violations,
        metrics: {
            partCount: parts.length,
            totalNonWhitespaceChars: countNonWhitespace(allText),
            wordCounts,
            requiredCaseCoverage,
            forbiddenCaseHits,
            requiredSourceCoverage,
            preferredTermHits,
            bannedTermHits,
            creativeRuleBlockCount,
            factBoundary: factBoundaryMetrics,
        },
    };
}
function normalizeParts(body, partBodies, contracts) {
    if (partBodies.length > 0) {
        return partBodies.map((part, index) => ({
            id: part.id || contracts[index]?.id || `part_${index + 1}`,
            title: part.title || contracts[index]?.title,
            body: String(part.body || ""),
            contract: contracts[index],
        }));
    }
    return [{
            id: contracts[0]?.id || "body",
            title: contracts[0]?.title,
            body,
            contract: contracts[0],
        }];
}
function countNonWhitespace(value) {
    return String(value || "").replace(/\s/g, "").length;
}
function unique(values) {
    return Array.from(new Set(values.map((item) => String(item || "").trim()).filter(Boolean)));
}
function scanLiteralList(text, items, ruleId, category, message, violations, severity = "block") {
    for (const item of unique(items)) {
        if (!text.includes(item))
            continue;
        violations.push({
            ruleId,
            severity,
            category,
            message: `${message}：${item}`,
            excerpt: excerptFor(text, item),
        });
    }
}
function scanMissingLiteralList(text, items, ruleId, category, message, violations) {
    for (const item of unique(items)) {
        if (text.includes(item))
            continue;
        violations.push({
            ruleId,
            severity: "block",
            category,
            message: `${message}：${item}`,
        });
    }
}
function scanStrictFactBoundary(factClaims, factAtoms, requiredAtomIds, violations) {
    const atomIds = new Set(factAtoms.map((atom) => atom.id));
    const usedAtomIds = new Set();
    const unauthorizedAtomIds = new Set();
    let unboundClaimCount = 0;
    if (factAtoms.length === 0) {
        violations.push({
            ruleId: "ARTICLE-FACT-BOUNDARY-STRICT-001",
            severity: "block",
            category: "fact_boundary",
            message: "严格事实边界缺少 typed fact atoms",
        });
        return {
            strict: true,
            atomCount: 0,
            claimCount: factClaims.length,
            usedAtomIds: [],
            unauthorizedAtomIds: [],
            missingRequiredAtomIds: unique(requiredAtomIds),
            unboundClaimCount: factClaims.length,
        };
    }
    if (factClaims.length === 0) {
        violations.push({
            ruleId: "ARTICLE-FACT-BOUNDARY-STRICT-002",
            severity: "block",
            category: "fact_boundary",
            message: "严格事实边界缺少生成事实声明 factClaims",
        });
    }
    for (const claim of factClaims) {
        const claimAtomIds = unique((claim.atomIds || []).map(String));
        if (claimAtomIds.length === 0) {
            unboundClaimCount += 1;
            violations.push({
                ruleId: "ARTICLE-FACT-BOUNDARY-STRICT-003",
                severity: "block",
                category: "fact_boundary",
                message: "事实声明未绑定 typed fact atom",
                excerpt: claim.text,
            });
            continue;
        }
        for (const atomId of claimAtomIds) {
            if (!atomIds.has(atomId)) {
                violations.push({
                    ruleId: "ARTICLE-FACT-BOUNDARY-STRICT-004",
                    severity: "block",
                    category: "fact_boundary",
                    message: `事实声明引用未授权 typed fact atom：${atomId}`,
                    excerpt: claim.text,
                });
                unauthorizedAtomIds.add(atomId);
            }
            else {
                usedAtomIds.add(atomId);
            }
        }
    }
    const missingRequiredAtomIds = [];
    for (const atomId of unique(requiredAtomIds)) {
        if (usedAtomIds.has(atomId))
            continue;
        missingRequiredAtomIds.push(atomId);
        violations.push({
            ruleId: "ARTICLE-FACT-BOUNDARY-STRICT-005",
            severity: "block",
            category: "fact_boundary",
            message: `必需 typed fact atom 未被声明使用：${atomId}`,
        });
    }
    return {
        strict: true,
        atomCount: factAtoms.length,
        claimCount: factClaims.length,
        usedAtomIds: Array.from(usedAtomIds),
        unauthorizedAtomIds: Array.from(unauthorizedAtomIds),
        missingRequiredAtomIds,
        unboundClaimCount,
    };
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function scanRegexList(text, patterns, ruleId, category, message, violations) {
    for (const pattern of unique(patterns)) {
        const regex = new RegExp(pattern, "u");
        const match = regex.exec(text);
        if (!match)
            continue;
        violations.push({
            ruleId,
            severity: "block",
            category,
            message: `${message}：${pattern}`,
            excerpt: excerptFor(text, match[0]),
        });
    }
}
function countOccurrences(text, term) {
    if (!term)
        return 0;
    let count = 0;
    let index = 0;
    while ((index = text.indexOf(term, index)) >= 0) {
        count += 1;
        index += Math.max(1, term.length);
    }
    return count;
}
function excerptFor(text, term) {
    const index = text.indexOf(term);
    if (index < 0)
        return undefined;
    const start = Math.max(0, index - 16);
    const end = Math.min(text.length, index + term.length + 16);
    return text.slice(start, end).replace(/\s+/g, " ").trim();
}
function mapCreativeViolation(item) {
    return {
        ruleId: item.ruleId,
        severity: item.severity === "block" ? "block" : "warn",
        category: item.category,
        message: item.message,
        excerpt: item.excerpt,
    };
}
