import { Hono } from "hono";
import { EvidencePackSchema, } from "@emptyinkpot/database-content-contracts";
import { query } from "../db.js";
import { HttpError, validatedResponse } from "../http.js";
import { clampLimit } from "../utils.js";
function fallbackTitle(row) {
    return row.title || row.source || `${row.source_table}:${row.source_id}`;
}
function toStableId(parts) {
    return parts.map((part) => String(part ?? "").replace(/[^a-zA-Z0-9_-]+/g, "_")).join("__");
}
function normalizeSearchText(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}
function hostOfUrl(value) {
    try {
        return new URL(String(value || "")).hostname.replace(/^www\./, "").toLowerCase();
    }
    catch {
        return "";
    }
}
function normalizeWebEvidenceText(value) {
    return String(value || "")
        .replace(/[#＃][\p{L}\p{N}_-]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function isReliableWebEvidenceItem(item) {
    const title = String(item.title || "").trim();
    const url = String(item.url || item.source || "").trim();
    const host = hostOfUrl(url);
    const text = normalizeWebEvidenceText(item.snippet || item.excerpt || item.text || "");
    const trustedHost = /(?:bbc\.com|reuters\.com|apnews\.com|wsj\.com|ft\.com|bloomberg\.com|aljazeera\.com|xinhua(?:net)?\.com|news\.cn|cctv\.com|cn\.wsj\.com|eia\.gov|iea\.org|spglobal\.com|argusmedia\.com|lloydslist\.com|tradewindsnews\.com|maritime-executive\.com|splash247\.com|xindemarinenews\.com)$/i.test(host);
    if (!trustedHost)
        return false;
    if (/youtube\.com|youtu\.be|reddit\.com|bilibili\.com|tiktok\.com|x\.com|twitter\.com|facebook\.com|zhihu\.com|molihua\.org|substack\.com|medium\.com|blogspot\.com/.test(host))
        return false;
    const titleHay = `${title} ${text}`;
    const currentAffairsHit = /霍尔木兹|霍爾木茲|伊朗|波斯湾|波斯灣|阿曼湾|阿曼灣|油轮|油輪|原油|石油|能源|航运|航運|保险|保險/.test(titleHay);
    if (!text || text.length < (trustedHost || currentAffairsHit ? 50 : 80))
        return false;
    if (/彻底|不料|横空出世|坐收|终极|震惊|刚刚|突发|内幕|独家|一文看懂|报复美以|这国|大国重器|强国/i.test(titleHay))
        return false;
    if (/[#＃]/.test(titleHay))
        return false;
    return true;
}
function isHormuzCurrentAffairsQuery(value) {
    return /霍尔木兹|霍爾木茲|伊朗|波斯湾|波斯灣|阿曼湾|阿曼灣|海峡|海峽|原油|石油|油轮|油輪|航运|航運|能源|保险|保險|中东|中東/.test(String(value || ""));
}
function hasHormuzCurrentAffairsOverlap(value) {
    const text = String(value || "");
    return /霍尔木兹|霍爾木茲|阿曼湾|阿曼灣|油轮|油輪|原油|石油|能源|航运|航運|保险|保險|海上通行|海事|第五舰队/.test(text);
}
function isBroadHistoricalSeaPassage(row) {
    const text = [
        row.title,
        row.source,
        row.source_id,
        row.chunk_text,
        row.summary,
        row.excerpt,
        row.source_title,
        row.source_locator,
        row.chunk_metadata,
    ].filter(Boolean).join(" ");
    return /兴亡的世界史|室利佛逝|夏连特拉|马六甲|郑和|达伽马|卡利卡特|江华岛|摩尼山|云扬号|马拉巴尔|科摩令角|汉书|厄立特利亚海航行记|朝鲜王朝|南越港都|印度洋海域世界/.test(text);
}
function parseRecord(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return value;
    }
    if (typeof value !== "string" || !value.trim())
        return {};
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : {};
    }
    catch {
        return {};
    }
}
function uniqueStrings(values) {
    return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}
function parseListQuery(value) {
    return uniqueStrings(String(value || "")
        .split(/[，,、\s]+/)
        .map((item) => item.trim())
        .filter(Boolean));
}
function tokenizeEvidenceQuery(value) {
    const normalized = normalizeSearchText(value);
    const cjk = normalized.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const ascii = normalized.match(/[a-z0-9_]{2,}/g) || [];
    const tokens = [];
    for (const token of [...cjk, ...ascii]) {
        tokens.push(token);
        if (/[\u4e00-\u9fa5]/.test(token)) {
            for (let size = 2; size <= Math.min(6, token.length); size += 1) {
                for (let index = 0; index <= token.length - size; index += 1) {
                    tokens.push(token.slice(index, index + size));
                }
            }
        }
    }
    return uniqueStrings(tokens)
        .filter((item) => item.length >= 2)
        .filter((item) => !/^(文章|生成|资料|材料|target|draft|article|the|and|with)$/.test(item))
        .slice(0, 32);
}
function buildEvidenceQueries(input) {
    const seeds = [
        input.q,
        input.topic || "",
        input.target || "",
        input.semanticTags.join(" "),
    ].map((item) => String(item || "").trim()).filter(Boolean);
    const tokenGroups = tokenizeEvidenceQuery(seeds.join(" "))
        .filter((item) => item.length >= 2)
        .slice(0, 12);
    const grouped = [
        ...seeds,
        ...input.semanticTags,
        tokenGroups.slice(0, 4).join(" "),
        tokenGroups.slice(4, 8).join(" "),
        tokenGroups.slice(8, 12).join(" "),
        ...tokenGroups.slice(0, 6),
    ];
    return uniqueStrings(grouped)
        .filter((item) => item.length >= 2)
        .slice(0, Math.max(1, Math.min(input.maxRounds, 12)));
}
function buildWebEvidenceQueries(input) {
    const base = buildEvidenceQueries(input);
    const haystack = [input.q, input.topic, input.target, input.semanticTags.join(" ")].filter(Boolean).join(" ");
    const authorityQueries = isHormuzCurrentAffairsQuery(haystack)
        ? [
            "Strait of Hormuz closure oil shipping risk EIA Reuters",
            "Iran Strait of Hormuz closure oil prices shipping insurance Reuters",
            "Hormuz Strait oil LNG transit EIA",
            "霍尔木兹 海峡 原油 航运 风险 BBC EIA",
        ]
        : [];
    return uniqueStrings([...authorityQueries, ...base])
        .filter((item) => item.length >= 2)
        .slice(0, Math.max(1, Math.min(input.maxRounds + authorityQueries.length, 12)));
}
function scoreEvidenceRow(row, queryText, tokens) {
    const chunkText = normalizeSearchText(row.chunk_text || "");
    const metadata = parseRecord(row.chunk_metadata);
    const locatorText = normalizeSearchText([
        metadata.locator,
        metadata.chapter,
        metadata.section,
    ].filter(Boolean).join(" "));
    const titleText = normalizeSearchText([row.title, row.source, row.source_id].filter(Boolean).join(" "));
    const query = normalizeSearchText(queryText);
    const chunkQueryHit = query && chunkText.includes(query) ? 1 : 0;
    const locatorQueryHit = query && locatorText.includes(query) ? 1 : 0;
    const chunkHits = tokens.filter((token) => chunkText.includes(normalizeSearchText(token)));
    const locatorHits = tokens.filter((token) => locatorText.includes(normalizeSearchText(token)));
    const titleTokenHits = tokens.filter((token) => titleText.includes(normalizeSearchText(token)));
    const matchedTokens = uniqueStrings([...chunkHits, ...locatorHits, ...titleTokenHits]);
    const titleHits = titleTokenHits.length;
    const textLength = String(row.chunk_text || "").length;
    const lengthScore = textLength > 180 ? 4 : textLength > 60 ? 2 : 0;
    // 正文命中是主信号，章节/locator 是定位信号；书名/sourceId 只作弱信号，避免目录、版权页或书名重复段落压过正文片段。
    const score = chunkQueryHit * 70
        + locatorQueryHit * 18
        + chunkHits.length * 18
        + locatorHits.length * 8
        + titleHits * 2
        + lengthScore;
    return {
        ...row,
        score,
        matchedQuery: queryText,
        matchedTokens,
    };
}
function scoreSemanticEvidenceRow(row, queryText, tokens) {
    const bodyText = normalizeSearchText([row.summary, row.excerpt, row.tags].filter(Boolean).join(" "));
    const locatorText = normalizeSearchText(row.source_locator || "");
    const titleText = normalizeSearchText([row.source_title, row.source_author].filter(Boolean).join(" "));
    const query = normalizeSearchText(queryText);
    const bodyQueryHit = query && bodyText.includes(query) ? 1 : 0;
    const locatorQueryHit = query && locatorText.includes(query) ? 1 : 0;
    const bodyHits = tokens.filter((token) => bodyText.includes(normalizeSearchText(token)));
    const locatorHits = tokens.filter((token) => locatorText.includes(normalizeSearchText(token)));
    const titleTokenHits = tokens.filter((token) => titleText.includes(normalizeSearchText(token)));
    const matchedTokens = uniqueStrings([...bodyHits, ...locatorHits, ...titleTokenHits]);
    const titleHits = titleTokenHits.length;
    const textLength = [row.summary, row.excerpt].filter(Boolean).join(" ").length;
    const lengthScore = textLength > 180 ? 4 : textLength > 60 ? 2 : 0;
    // semantic_units 是二级资料卡，仍以摘要/摘录/标签命中为主，来源题名只作弱背书。
    const score = bodyQueryHit * 60
        + locatorQueryHit * 16
        + bodyHits.length * 16
        + locatorHits.length * 7
        + titleHits * 2
        + lengthScore;
    return {
        ...row,
        score,
        matchedQuery: queryText,
        matchedTokens,
    };
}
async function searchDatabaseEvidence(input) {
    const rankedByChunk = new Map();
    const rounds = [];
    for (const queryText of input.queries) {
        const tokens = tokenizeEvidenceQuery(queryText).slice(0, 10);
        const likeTerms = uniqueStrings([queryText, ...tokens]).filter((item) => item.length >= 2).slice(0, 8);
        if (!likeTerms.length)
            continue;
        const where = likeTerms.map(() => "(c.chunk_text LIKE ? OR CAST(c.metadata_json AS CHAR) LIKE ?)").join(" OR ");
        const sourceWhere = input.sourceIds.length
            ? `AND d.source_id IN (${input.sourceIds.map(() => "?").join(", ")})`
            : "";
        const params = [
            ...input.sourceIds,
            ...likeTerms.flatMap((term) => [`%${term}%`, `%${term}%`]),
            Math.max(input.limit * 4, 20),
        ];
        const rows = await query(input.pool, `
      SELECT
        c.document_id,
        d.source_table,
        d.source_id,
        d.source,
        d.title,
        c.privacy_level,
        c.chunk_index,
        c.chunk_text,
        CAST(c.metadata_json AS CHAR) AS chunk_metadata,
        c.updated_at
      FROM search_chunks c
      JOIN search_documents d ON d.id = c.document_id
      WHERE c.privacy_level IN ('public', 'private')
        AND c.index_status = 'indexed'
        ${sourceWhere}
        AND (${where})
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT ?
      `, params);
        rounds.push({
            query: queryText,
            tokenCount: likeTerms.length,
            resultCount: rows.length,
            provider: "database.search_chunks",
            sourceFilterCount: input.sourceIds.length || undefined,
        });
        for (const row of rows) {
            if (input.requireCurrentAffairsOverlap && isBroadHistoricalSeaPassage(row)) {
                continue;
            }
            const ranked = scoreEvidenceRow(row, queryText, likeTerms);
            if (ranked.score <= 0)
                continue;
            const key = `${row.document_id}:${row.chunk_index}`;
            const current = rankedByChunk.get(key);
            if (!current || ranked.score > current.score) {
                rankedByChunk.set(key, ranked);
            }
        }
    }
    const rows = Array.from(rankedByChunk.values())
        .sort((left, right) => right.score - left.score)
        .slice(0, input.limit);
    return { rows, rounds };
}
async function searchSemanticEvidence(input) {
    const rankedByUnit = new Map();
    const rounds = [];
    for (const queryText of input.queries) {
        const tokens = tokenizeEvidenceQuery(queryText).slice(0, 10);
        const likeTerms = uniqueStrings([queryText, ...tokens]).filter((item) => item.length >= 2).slice(0, 8);
        if (!likeTerms.length)
            continue;
        const textWhere = likeTerms.map(() => "(u.source_title LIKE ? OR u.summary LIKE ? OR u.excerpt LIKE ?)").join(" OR ");
        const tagWhere = likeTerms.map(() => "stt_filter.tag_value LIKE ? OR stt_filter.description LIKE ?").join(" OR ");
        const textParams = likeTerms.flatMap((term) => [`%${term}%`, `%${term}%`, `%${term}%`]);
        const tagParams = likeTerms.flatMap((term) => [`%${term}%`, `%${term}%`]);
        const sourceWhere = input.sourceIds.length
            ? `AND u.source_id IN (${input.sourceIds.map(() => "?").join(", ")})`
            : "";
        const rows = await query(input.pool, `
      SELECT
        u.id,
        u.source_id,
        u.source_title,
        u.source_author,
        u.source_locator,
        u.excerpt,
        u.summary,
        u.status,
        COALESCE(
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', tag_rows.id,
                'layer', tag_rows.tag_layer,
                'value', tag_rows.tag_value,
                'description', tag_rows.description
              )
            )
            FROM (
              SELECT stt_inner.id, stt_inner.tag_layer, stt_inner.tag_value, stt_inner.description
              FROM semantic_unit_tags sut_inner
              JOIN semantic_tag_taxonomy stt_inner ON stt_inner.id = sut_inner.tag_id
              WHERE sut_inner.unit_id = u.id AND stt_inner.status = 'active'
              ORDER BY stt_inner.tag_layer ASC, stt_inner.tag_value ASC
            ) tag_rows
          ),
          JSON_ARRAY()
        ) AS tags,
        u.updated_at
      FROM semantic_units u
      WHERE u.status = 'active'
        ${sourceWhere}
        AND (
          ${textWhere}
          OR EXISTS (
            SELECT 1
            FROM semantic_unit_tags sut_filter
            JOIN semantic_tag_taxonomy stt_filter ON stt_filter.id = sut_filter.tag_id
            WHERE sut_filter.unit_id = u.id
              AND stt_filter.status = 'active'
              AND (${tagWhere})
          )
        )
      ORDER BY u.updated_at DESC, u.id ASC
      LIMIT ?
      `, [
            ...input.sourceIds,
            ...textParams,
            ...tagParams,
            Math.max(input.limit * 4, 20),
        ]);
        rounds.push({
            query: queryText,
            tokenCount: likeTerms.length,
            resultCount: rows.length,
            provider: "database.semantic_units",
            sourceFilterCount: input.sourceIds.length || undefined,
        });
        for (const row of rows) {
            if (input.requireCurrentAffairsOverlap && isBroadHistoricalSeaPassage(row)) {
                continue;
            }
            const ranked = scoreSemanticEvidenceRow(row, queryText, likeTerms);
            if (ranked.score <= 0)
                continue;
            const current = rankedByUnit.get(row.id);
            if (!current || ranked.score > current.score) {
                rankedByUnit.set(row.id, ranked);
            }
        }
    }
    const rows = Array.from(rankedByUnit.values())
        .sort((left, right) => right.score - left.score)
        .slice(0, input.limit);
    return { rows, rounds };
}
async function searchWebEvidence(input) {
    const endpoint = new URL(input.url);
    endpoint.searchParams.set("q", input.q);
    endpoint.searchParams.set("limit", String(input.limit));
    const response = await fetch(endpoint, {
        headers: {
            accept: "application/json",
            "X-Request-Id": input.requestId,
        },
        signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
        throw new HttpError(503, "web_evidence_search_failed", `web evidence provider failed: HTTP ${response.status}`);
    }
    const payload = await response.json();
    const items = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.results)
            ? payload.results
            : [];
    const filteredItems = items.filter(isReliableWebEvidenceItem);
    return {
        items: filteredItems,
        round: {
            query: input.q,
            tokenCount: tokenizeEvidenceQuery(input.q).length,
            resultCount: filteredItems.length,
            provider: "web.search",
            rawResultCount: items.length,
        },
    };
}
async function searchRagflowEvidence(input) {
    if (!input.config.baseUrl || !input.config.apiKey || input.config.datasetIds.length === 0) {
        throw new HttpError(503, "ragflow_evidence_search_not_configured", "DATABASE_EVIDENCE_RAGFLOW_URL, DATABASE_EVIDENCE_RAGFLOW_API_KEY and DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS are required when includeRagflow=true");
    }
    const endpoint = `${input.config.baseUrl.replace(/\/+$/, "")}/api/v1/retrieval`;
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            accept: "application/json",
            "content-type": "application/json",
            authorization: `Bearer ${input.config.apiKey}`,
            "X-Request-Id": input.requestId,
        },
        body: JSON.stringify({
            question: input.q,
            dataset_ids: input.config.datasetIds,
            document_ids: input.config.documentIds,
            page: 1,
            page_size: input.limit,
            similarity_threshold: input.config.similarityThreshold,
            vector_similarity_weight: input.config.vectorSimilarityWeight,
            top_k: input.config.topK,
            keyword: true,
            highlight: false,
            use_kg: input.config.useKg,
            toc_enhance: input.config.tocEnhance,
        }),
        signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
        throw new HttpError(503, "ragflow_evidence_search_failed", `RAGFlow evidence provider failed: HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (payload?.code !== 0) {
        throw new HttpError(503, "ragflow_evidence_search_failed", `RAGFlow evidence provider failed: ${String(payload?.message || "unknown error")}`);
    }
    const chunks = Array.isArray(payload?.data?.chunks) ? payload.data.chunks : [];
    return {
        chunks,
        round: {
            query: input.q,
            tokenCount: tokenizeEvidenceQuery(input.q).length,
            resultCount: chunks.length,
            provider: "ragflow.retrieval",
        },
    };
}
function appendDatabaseRows(input) {
    input.rows.forEach((row, index) => {
        const sourceId = String(row.document_id);
        const chunkMetadata = parseRecord(row.chunk_metadata);
        const locator = String(chunkMetadata.locator || "").trim();
        const chapter = String(chunkMetadata.chapter || "").trim();
        const section = String(chunkMetadata.section || "").trim();
        if (!input.sourceById.has(sourceId)) {
            input.sourceById.set(sourceId, {
                id: sourceId,
                title: fallbackTitle(row),
                sourceType: "database.search_document",
                sourceTable: row.source_table,
                sourceId: row.source_id,
                source: row.source,
                externalRefs: [],
                metadata: {
                    matchedQuery: row.matchedQuery,
                    matchedTokens: row.matchedTokens,
                    relevanceScore: row.score,
                    locator,
                    chapter,
                    section,
                },
            });
        }
        // chunk/citation 是写作运行时的证据边界，不承担文件本体真源。
        const chunkId = toStableId([row.document_id, row.chunk_index]);
        const text = String(row.chunk_text || "").slice(0, 1200);
        input.chunks.push({
            id: chunkId,
            sourceId,
            chunkIndex: Number(row.chunk_index || 0),
            text,
            privacyLevel: row.privacy_level,
            relevanceScore: row.score,
            location: {
                chunkIndex: row.chunk_index,
                ...(locator ? { locator } : {}),
                ...(chapter ? { chapter } : {}),
                ...(section ? { section } : {}),
                ...(chunkMetadata.startLine ? { startLine: chunkMetadata.startLine } : {}),
                ...(chunkMetadata.endLine ? { endLine: chunkMetadata.endLine } : {}),
            },
            metadata: {
                sourceTable: row.source_table,
                sourceId: row.source_id,
                locator,
                chapter,
                section,
                matchedQuery: row.matchedQuery,
                matchedTokens: row.matchedTokens,
            },
        });
        input.citations.push({
            id: toStableId(["citation", row.document_id, row.chunk_index, index]),
            sourceId,
            chunkId,
            title: fallbackTitle(row),
            excerpt: text.slice(0, 500),
            locator: locator || `chunk:${row.chunk_index}`,
            relevanceScore: row.score,
            metadata: {
                sourceTable: row.source_table,
                sourceId: row.source_id,
                locator,
                chapter,
                section,
                matchedQuery: row.matchedQuery,
                matchedTokens: row.matchedTokens,
            },
        });
    });
}
function appendSemanticRows(input) {
    input.rows.forEach((row, index) => {
        const sourceId = toStableId(["semantic", row.id]);
        const title = row.source_title || row.source_id || row.id;
        const materialText = [row.summary, row.excerpt].filter(Boolean).join("\n\n").trim();
        const text = materialText.slice(0, 1200);
        if (!text)
            return;
        const tags = parseSemanticTags(row.tags);
        const materialKind = tags
            .map((tag) => String(tag.value || ""))
            .find((value) => value.startsWith("reference:"))
            ?.replace(/^reference:/, "");
        if (!input.sourceById.has(sourceId)) {
            input.sourceById.set(sourceId, {
                id: sourceId,
                title,
                sourceType: "database.semantic_unit",
                sourceTable: "semantic_units",
                sourceId: row.id,
                source: row.source_id,
                externalRefs: row.source_id ? [{ system: "semantic.source_id", externalId: row.source_id }] : [],
                metadata: {
                    sourceAuthor: row.source_author,
                    sourceLocator: row.source_locator,
                    materialKind: materialKind || "",
                    matchedQuery: row.matchedQuery,
                    matchedTokens: row.matchedTokens,
                    relevanceScore: row.score,
                },
            });
        }
        // 语义单元是 DataBase 已归档的资料切面，这里只投影为 EvidencePack 的 chunk/citation。
        const chunkId = toStableId([sourceId, 0]);
        input.chunks.push({
            id: chunkId,
            sourceId,
            chunkIndex: 0,
            text,
            privacyLevel: "private",
            relevanceScore: row.score,
            location: row.source_locator ? { locator: row.source_locator } : {},
            metadata: {
                sourceTable: "semantic_units",
                sourceId: row.source_id,
                semanticUnitId: row.id,
                sourceAuthor: row.source_author,
                materialKind: materialKind || "",
                matchedQuery: row.matchedQuery,
                matchedTokens: row.matchedTokens,
            },
        });
        input.citations.push({
            id: toStableId(["citation", sourceId, index]),
            sourceId,
            chunkId,
            title,
            excerpt: text.slice(0, 500),
            locator: row.source_locator || undefined,
            relevanceScore: row.score,
            metadata: {
                sourceTable: "semantic_units",
                sourceId: row.source_id,
                semanticUnitId: row.id,
                sourceAuthor: row.source_author,
                materialKind: materialKind || "",
                matchedQuery: row.matchedQuery,
                matchedTokens: row.matchedTokens,
            },
        });
    });
}
function parseSemanticTags(value) {
    if (Array.isArray(value))
        return value.filter((item) => item && typeof item === "object" && !Array.isArray(item));
    if (typeof value !== "string" || !value.trim())
        return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
            ? parsed.filter((item) => item && typeof item === "object" && !Array.isArray(item))
            : [];
    }
    catch {
        return [];
    }
}
function appendWebItems(input) {
    input.items.forEach((item, index) => {
        const title = String(item.title || item.url || `Web source ${index + 1}`).trim();
        const url = String(item.url || item.source || "").trim();
        if (!isReliableWebEvidenceItem(item))
            return;
        const text = normalizeWebEvidenceText(item.snippet || item.excerpt || item.text || "").slice(0, 1200);
        if (!title && !text)
            return;
        const sourceId = toStableId(["web", item.id || url || title || index]);
        const chunkId = toStableId([sourceId, 0]);
        const score = Number.isFinite(Number(item.score)) ? Number(item.score) : input.items.length - index;
        input.sourceById.set(sourceId, {
            id: sourceId,
            title,
            sourceType: "web.search_result",
            sourceTable: "web",
            sourceId: item.id ? String(item.id) : url || sourceId,
            source: url || null,
            externalRefs: url ? [{ system: "url", url }] : [],
            metadata: {
                url,
                publishedAt: item.publishedAt || "",
                relevanceScore: score,
            },
        });
        input.chunks.push({
            id: chunkId,
            sourceId,
            chunkIndex: 0,
            text,
            privacyLevel: "public",
            relevanceScore: score,
            location: url ? { url } : {},
            metadata: {
                provider: "web.search",
                url,
                publishedAt: item.publishedAt || "",
            },
        });
        input.citations.push({
            id: toStableId(["citation", sourceId, index]),
            sourceId,
            chunkId,
            title,
            excerpt: text.slice(0, 500),
            locator: url || undefined,
            relevanceScore: score,
            metadata: {
                provider: "web.search",
                url,
                publishedAt: item.publishedAt || "",
            },
        });
    });
}
function appendRagflowChunks(input) {
    input.chunks.forEach((item, index) => {
        const datasetId = String(item.dataset_id || item.kb_id || "").trim();
        const documentId = String(item.document_id || "").trim();
        const title = String(item.document_name || item.document_keyword || documentId || `RAGFlow document ${index + 1}`).trim();
        const text = String(item.content || item.content_ltks || "").trim().slice(0, 1200);
        if (!text)
            return;
        const haystack = `${title} ${text} ${documentId}`.trim();
        if (isHistoricalStyleRagflowMaterial(haystack))
            return;
        const sourceId = toStableId(["ragflow", datasetId, documentId || title]);
        const chunkId = toStableId(["ragflow", item.id || index, documentId || datasetId]);
        const score = Number.isFinite(Number(item.similarity)) ? Number(item.similarity) : input.chunks.length - index;
        if (!input.sourceById.has(sourceId)) {
            input.sourceById.set(sourceId, {
                id: sourceId,
                title,
                sourceType: "ragflow.retrieval_document",
                sourceTable: "ragflow",
                sourceId: documentId || sourceId,
                source: datasetId || null,
                externalRefs: [
                    datasetId ? { system: "ragflow.dataset_id", externalId: datasetId } : null,
                    documentId ? { system: "ragflow.document_id", externalId: documentId } : null,
                ].filter(Boolean),
                metadata: {
                    provider: "ragflow.retrieval",
                    datasetId,
                    documentId,
                    relevanceScore: score,
                },
            });
        }
        // RAGFlow 负责成熟 RAG 召回；DataBase 只把它收束成统一 EvidencePack 投影。
        input.outputChunks.push({
            id: chunkId,
            sourceId,
            chunkIndex: index,
            text,
            privacyLevel: "private",
            relevanceScore: score,
            location: { datasetId, documentId, positions: item.positions || [] },
            metadata: {
                provider: "ragflow.retrieval",
                ragflowChunkId: item.id || "",
                datasetId,
                documentId,
                termSimilarity: item.term_similarity,
                vectorSimilarity: item.vector_similarity,
                importantKeywords: item.important_keywords || [],
                tagKeywords: item.tag_kwd || [],
                questions: item.questions || [],
            },
        });
        input.citations.push({
            id: toStableId(["citation", "ragflow", item.id || index, documentId || datasetId]),
            sourceId,
            chunkId,
            title,
            excerpt: text.slice(0, 500),
            locator: documentId ? `ragflow:${documentId}` : undefined,
            relevanceScore: score,
            metadata: {
                provider: "ragflow.retrieval",
                ragflowChunkId: item.id || "",
                datasetId,
                documentId,
            },
        });
    });
}
function isHistoricalStyleRagflowMaterial(value) {
    return /xingwang-world-history|兴亡的世界史|苏美|埃兰|苏萨|亚历山大|塞琉古|艾哈努姆|帕提亚|安地斯文明|旧波斯帝国|马其顿人|希腊人/u.test(String(value || ""));
}
export function evidenceRoutes({ pool, config }) {
    const app = new Hono();
    app.get("/evidence/search", async (c) => {
        const q = (c.req.query("q") || "").trim();
        const topic = (c.req.query("topic") || "").trim();
        const target = (c.req.query("target") || "").trim();
        const semanticTags = parseListQuery(c.req.query("semanticTags"));
        const sourceIds = parseListQuery(c.req.query("sourceIds"));
        const includeWeb = ["1", "true", "yes", "on"].includes(String(c.req.query("includeWeb") || "").toLowerCase());
        const includeRagflow = ["1", "true", "yes", "on"].includes(String(c.req.query("includeRagflow") || "").toLowerCase());
        const ragflowDatasetIds = parseListQuery(c.req.query("ragflowDatasetIds"));
        const maxRounds = clampLimit(c.req.query("rounds") || null, 4, 12);
        const limit = clampLimit(c.req.query("limit") || null, 10, 50);
        if (!q) {
            return c.json(validatedResponse(EvidencePackSchema, {
                version: "evidence-pack.v1",
                query: q,
                mode: "empty_query",
                queryRun: {
                    id: `evidence_query_${c.get("requestId")}`,
                    provider: "database.search_chunks",
                    status: "read_projection",
                    rounds: [],
                },
                sources: [],
                chunks: [],
                citations: [],
                constraints: ["empty query returns no evidence"],
                counts: { sources: 0, chunks: 0, citations: 0, queryRounds: 0, webSources: 0 },
                screening: {
                    version: "evidence-screening.v1",
                    requestedLimit: limit,
                    queryCount: 0,
                    sourceFilterIds: sourceIds,
                    selectedChunkCount: 0,
                    selectedCitationCount: 0,
                    sourceDiversityCount: 0,
                    droppedDuplicateChunkCount: 0,
                    rankingSignals: [],
                },
                requestId: c.get("requestId"),
            }));
        }
        if (includeWeb && !config.evidenceWebSearchUrl) {
            throw new HttpError(503, "web_evidence_search_not_configured", "DATABASE_EVIDENCE_WEB_SEARCH_URL is required when includeWeb=true");
        }
        if (includeRagflow && !config.evidenceRagflow) {
            throw new HttpError(503, "ragflow_evidence_search_not_configured", "DATABASE_EVIDENCE_RAGFLOW_URL, DATABASE_EVIDENCE_RAGFLOW_API_KEY and DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS are required when includeRagflow=true");
        }
        const evidenceQueries = buildEvidenceQueries({ q, topic, target, semanticTags, maxRounds });
        const requireCurrentAffairsOverlap = isHormuzCurrentAffairsQuery([q, topic, target].filter(Boolean).join(" "));
        const databaseSearch = await searchDatabaseEvidence({ pool, queries: evidenceQueries, limit, sourceIds, requireCurrentAffairsOverlap });
        const semanticSearch = await searchSemanticEvidence({ pool, queries: evidenceQueries, limit, sourceIds, requireCurrentAffairsOverlap });
        const sourceById = new Map();
        const chunks = [];
        const citations = [];
        appendDatabaseRows({ rows: databaseSearch.rows, sourceById, chunks, citations });
        appendSemanticRows({ rows: semanticSearch.rows, sourceById, chunks, citations });
        let webSources = 0;
        let ragflowSources = 0;
        const rounds = [
            ...databaseSearch.rounds,
            ...semanticSearch.rounds,
        ];
        if (includeWeb && config.evidenceWebSearchUrl) {
            const webQueries = buildWebEvidenceQueries({ q, topic, target, semanticTags, maxRounds });
            const webItems = [];
            for (const webQuery of webQueries) {
                const web = await searchWebEvidence({
                    url: config.evidenceWebSearchUrl,
                    q: webQuery,
                    limit: Math.min(limit, 10),
                    requestId: c.get("requestId"),
                });
                webItems.push(...web.items);
                rounds.push(web.round);
            }
            appendWebItems({ items: webItems, sourceById, chunks, citations });
            webSources = chunks.filter((item) => String(item.metadata?.provider || "") === "web.search").length;
            if (webSources === 0) {
                throw new HttpError(503, "web_evidence_no_reliable_sources", "Web evidence search returned no reliable sources after source hygiene filtering");
            }
        }
        if (includeRagflow && config.evidenceRagflow) {
            const ragflowConfig = ragflowDatasetIds.length
                ? { ...config.evidenceRagflow, datasetIds: ragflowDatasetIds }
                : config.evidenceRagflow;
            try {
                const ragflow = await searchRagflowEvidence({
                    config: ragflowConfig,
                    q,
                    limit: Math.min(limit, 20),
                    requestId: c.get("requestId"),
                });
                appendRagflowChunks({ chunks: ragflow.chunks, sourceById, outputChunks: chunks, citations });
                ragflowSources = ragflow.chunks.length;
                rounds.push(ragflow.round);
            }
            catch (error) {
                rounds.push({
                    query: q,
                    tokenCount: tokenizeEvidenceQuery(q).length,
                    resultCount: 0,
                    provider: "ragflow.retrieval",
                    status: "provider_error",
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        }
        const rankChunks = (items) => [...items].sort((left, right) => Number(right.relevanceScore || 0) - Number(left.relevanceScore || 0));
        const isWebChunk = (item) => String(item.metadata?.provider || "") === "web.search";
        const isRagflowChunk = (item) => String(item.metadata?.provider || "") === "ragflow.retrieval";
        const webChunkLimit = includeWeb ? Math.min(limit, Math.max(3, Math.ceil(limit / 3))) : 0;
        const selectedWebChunks = includeWeb
            ? rankChunks(chunks.filter(isWebChunk)).slice(0, webChunkLimit)
            : [];
        const selectedWebChunkIds = new Set(selectedWebChunks.map((item) => item.id));
        const remainingAfterWeb = chunks.filter((item) => !selectedWebChunkIds.has(item.id));
        const ragflowChunkLimit = includeRagflow ? Math.min(Math.max(0, limit - selectedWebChunks.length), Math.max(2, Math.ceil(limit / 4))) : 0;
        const selectedRagflowChunks = includeRagflow
            ? rankChunks(remainingAfterWeb.filter(isRagflowChunk)).slice(0, ragflowChunkLimit)
            : [];
        const selectedRagflowChunkIds = new Set(selectedRagflowChunks.map((item) => item.id));
        const selectedChunks = [
            ...selectedWebChunks,
            ...selectedRagflowChunks,
            ...rankChunks(chunks.filter((item) => !selectedWebChunkIds.has(item.id) && !selectedRagflowChunkIds.has(item.id))).slice(0, Math.max(0, limit - selectedWebChunks.length - selectedRagflowChunks.length)),
        ];
        const selectedChunkIds = new Set(selectedChunks.map((item) => item.id));
        const selectedCitations = citations
            .filter((item) => selectedChunkIds.has(item.chunkId))
            .sort((left, right) => Number(right.relevanceScore || 0) - Number(left.relevanceScore || 0))
            .slice(0, limit);
        const selectedSourceIds = new Set([
            ...selectedChunks.map((item) => item.sourceId),
            ...selectedCitations.map((item) => item.sourceId),
        ]);
        const selectedSources = Array.from(sourceById.values()).filter((item) => selectedSourceIds.has(item.id));
        const providerParts = [
            "database.search_chunks",
            semanticSearch.rows.length ? "database.semantic_units" : "",
            includeWeb ? "web.search" : "",
            includeRagflow ? "ragflow.retrieval" : "",
        ].filter(Boolean);
        const provider = providerParts.join("+");
        const mode = includeWeb && selectedChunks.some((item) => String(item.metadata?.provider || "") === "web.search")
            ? "mixed_projection"
            : includeRagflow && selectedChunks.some((item) => String(item.metadata?.provider || "") === "ragflow.retrieval")
                ? "mixed_projection"
                : evidenceQueries.length > 1
                    ? "multi_query_projection"
                    : "keyword_projection";
        return c.json(validatedResponse(EvidencePackSchema, {
            version: "evidence-pack.v1",
            query: q,
            mode,
            queryRun: {
                id: `evidence_query_${c.get("requestId")}`,
                provider,
                status: "read_projection",
                rounds,
            },
            sources: selectedSources,
            chunks: selectedChunks,
            citations: selectedCitations,
            constraints: [
                "DataBase owns this evidence projection",
                "OpenList and file backends are source access surfaces, not semantic search by themselves",
                "ContentBase may use citations as writing context but must not treat missing evidence as permission to invent facts",
                sourceIds.length
                    ? `Evidence search was constrained to sourceIds: ${sourceIds.join(", ")}`
                    : "Evidence search was not constrained to sourceIds",
                includeWeb
                    ? "Web evidence entered through DataBase Gateway provider configuration and remains query-run evidence, not durable source truth until persisted by a DataBase importer"
                    : "Web evidence was not requested for this query run",
                includeRagflow
                    ? "RAGFlow retrieval entered through DataBase Gateway provider configuration and was projected into EvidencePack; RAGFlow remains a retrieval backend, not a ContentBase source of truth"
                    : "RAGFlow retrieval was not requested for this query run",
            ],
            counts: {
                sources: selectedSources.length,
                chunks: selectedChunks.length,
                citations: selectedCitations.length,
                webSources,
                ragflowSources,
                queryRounds: rounds.length,
            },
            screening: {
                version: "evidence-screening.v1",
                requestedLimit: limit,
                queryCount: evidenceQueries.length,
                sourceFilterIds: sourceIds,
                selectedChunkCount: selectedChunks.length,
                selectedCitationCount: selectedCitations.length,
                sourceDiversityCount: selectedSources.length,
                droppedDuplicateChunkCount: Math.max(0, databaseSearch.rounds.reduce((sum, round) => sum + round.resultCount, 0) - databaseSearch.rows.length),
                rankingSignals: [
                    "exact query hit",
                    "chunk body token overlap",
                    "locator/chapter/section overlap",
                    "weak title/sourceId overlap",
                    "chunk length floor",
                    "source diversity",
                    sourceIds.length ? "explicit sourceIds filter" : "unfiltered source pool",
                    semanticSearch.rows.length ? "semantic reference material recall" : "semantic reference material checked",
                    includeWeb ? "explicit web provider results" : "database-only provider",
                    includeRagflow ? "RAGFlow dataset retrieval" : "RAGFlow provider not requested",
                ],
            },
            requestId: c.get("requestId"),
        }));
    });
    return app;
}
