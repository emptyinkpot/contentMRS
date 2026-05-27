import { Hono } from "hono";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  ResolvedCreativeContextSchema,
  CreativeStyleContractSchema,
  getCreativeRuleInventory,
  type ResolvedCreativeContext,
  type CreativeStyleContract
} from "@emptyinkpot/database-creative-contracts";
import type { SemanticUnit } from "@emptyinkpot/database-semantic-contracts";
import type { AppBindings, RouteDependencies } from "../types.js";
import { query } from "../db.js";
import { validatedResponse } from "../http.js";
import { clampLimit } from "../utils.js";
import { loadCategoryRegisterMap } from "../lib/category-register.js";
import { filterLexiconTermsByTopicEntry, setCategoryRegisterMap, type LexiconTermRow } from "../lib/lexicon-register.js";
import { getTopicEntry } from "../lib/topic-corpus.js";
import { resolveSemanticUnits } from "./semantic.js";

interface ProtocolRow {
  id: string;
  name: string;
  domain: string;
  status: string;
  perspective_rule: string | null;
  tone_rule: string | null;
  execution_rule: string | null;
  payload_json: unknown;
  source_doc: string | null;
  updated_at: Date | string | null;
}

interface ModuleRow {
  code: string;
  parent_code: string | null;
  category: string;
  name: string;
  module_kind: string;
  description: string | null;
  payload_json: unknown;
}

interface EditingStepRow {
  protocol_id: string;
  step_order: number;
  name: string;
  task_summary: string;
  required_report_json: unknown;
  hard_rules_json: unknown;
}

interface QualityRuleRow {
  id: string;
  protocol_id: string | null;
  rule_type: string;
  severity: string;
  rule_text: string;
  check_hint: string | null;
}

interface SourceMaterialRow {
  id: string;
  category: string;
  title: string;
  use_case: string | null;
  payload_json: unknown;
}

interface VocabularyContractRow {
  content: string;
  type: string;
  category: string;
  tags: unknown;
  note: string | null;
}

interface BannedWordContractRow {
  content: string;
  type: string;
  category: string;
  reason: string | null;
  alternative: string | null;
}

interface WritingTechniqueRow {
  id: string;
  name: string;
  layer: string;
  description: string;
  mechanism: string;
  suitable_for_json: unknown;
  avoid_when_json: unknown;
  prompt_instruction: string;
  quality_check: string;
  status: string;
}

interface AuthorTechniqueRow {
  author_profile_id: string;
  technique_id: string;
  weight: number;
  priority: string;
  task_types_json: unknown;
  trigger_text: string;
  constraint_text: string;
  status: string;
}

interface AuthorProfileRow {
  id: string;
  display_name: string;
  stance: string | null;
  voice_json: unknown;
  status: string;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface AuthorInterestClusterRow {
  id: string;
  author_profile_id: string;
  name: string;
  terms_json: unknown;
  applies_to_json: unknown;
  evidence_json: unknown;
  status: string;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface AuthorLexiconReviewRow {
  id: number;
  author_profile_id: string;
  term: string;
  decision: "candidate" | "approved_preferred" | "approved_banned" | "rejected";
  source_kind: string;
  source_ref: string | null;
  reason: string;
  category: string;
  note: string | null;
  created_at: Date | string | null;
}

interface CreativeContextWorkRow {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  status: string;
  author_profile_id: string | null;
  metadata_json: unknown;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface CreativeContextPartRow {
  id: string;
  work_id: string;
  parent_part_id: string | null;
  kind: string;
  part_order: number;
  title: string | null;
  status: string;
  metadata_json: unknown;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface LegacyChapterMaterialRow {
  id: number | string;
  title: string | null;
  plot_summary: string | null;
  content: string | null;
  word_count: number | null;
}

interface LegacyCharacterRow {
  id: number | string;
  name: string;
  role_type: string | null;
  description: string | null;
  created_at: Date | string | null;
}

interface LegacyWorldSettingRow {
  id: number | string;
  setting_type: string | null;
  title: string | null;
  content: string | null;
  examples: string | null;
  created_at: Date | string | null;
}

interface CreativeContextBlockRow {
  id: string;
  work_id: string;
  part_id: string | null;
  asset_id: string | null;
  kind: string;
  block_order: number;
  text_content: string | null;
  payload_json: unknown;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface CreativeContextPublicationTargetRow {
  id: string;
  platform: string;
  account_identity: string;
  local_work_id: string;
  remote_work_id: string | null;
  status: string;
  metadata_json: unknown;
  updated_at: Date | string | null;
  created_at: Date | string | null;
}

interface CreativeContextResolvedAuthorProfile {
  profile: AuthorProfileRow;
  interestClusters: AuthorInterestClusterRow[];
  authorTechniques: AuthorTechniqueRow[];
}

interface CreativeContextResolvedStyleContract {
  protocol: ProtocolRow;
  modules: ModuleRow[];
  editingSteps: EditingStepRow[];
  qualityRules: QualityRuleRow[];
  sourceMaterials: SourceMaterialRow[];
  vocabulary: VocabularyContractRow[];
  bannedWords: BannedWordContractRow[];
  techniques: WritingTechniqueRow[];
  authorTechniques: AuthorTechniqueRow[];
}

function normalizeProtocolId(value: string | undefined): string {
  const id = value?.trim();
  return id || "immersive_historical_synthetic_narrative";
}

function normalizeAuthorProfileId(value: string | null | undefined): string {
  const id = value?.trim();
  return id || "emptyinkpot_primary_author";
}

function requireQueryParam(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`missing_required_query:${name}`);
  }
  return normalized;
}

function toRecord(value: unknown): Record<string, unknown> {
  const parsed = parseJsonValue(value);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return {};
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toStringArray(value: unknown): string[] {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is string => typeof item === "string");
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number): string {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

function deriveChapterSummary(content: string | null): string | null {
  const normalized = normalizeWhitespace(content || "");
  if (!normalized) return null;
  if (normalized.length <= 900) return normalized;
  return `${normalized.slice(0, 520)}……${normalized.slice(-260)}`;
}

function readChapterNumberFromPart(part: CreativeContextPartRow): number {
  const metadata = toRecord(part.metadata_json);
  return (
    toPositiveNumber(metadata.chapterNumber)
    ?? toPositiveNumber(metadata.chapter_number)
    ?? toPositiveNumber(metadata.sequence)
    ?? toPositiveNumber(metadata.sourceId)
    ?? part.part_order
  );
}

function readLegacyChapterSourceId(part: CreativeContextPartRow): number | null {
  const metadata = toRecord(part.metadata_json);
  const sourceId = toPositiveNumber(metadata.sourceId);
  if (sourceId) return sourceId;

  const match = part.id.match(/^legacy_chapter_(\d+)$/);
  return match ? toPositiveNumber(match[1]) : null;
}

function readLegacyWorkSourceId(work: CreativeContextWorkRow): number | null {
  const metadata = toRecord(work.metadata_json);
  const sourceId = toPositiveNumber(metadata.sourceId);
  if (sourceId) return sourceId;

  const match = work.id.match(/^legacy_work_(\d+)$/);
  return match ? toPositiveNumber(match[1]) : null;
}

function mapLegacyCharacter(row: LegacyCharacterRow) {
  return {
    id: `legacy_character_${row.id}`,
    name: row.name,
    roleType: row.role_type ?? "",
    role_type: row.role_type ?? "",
    description: row.description ?? "",
    summary: row.description ?? "",
    source: "characters",
    sourceId: Number(row.id),
    createdAt: toIsoString(row.created_at)
  };
}

function mapLegacyWorldSetting(row: LegacyWorldSettingRow) {
  return {
    id: `legacy_world_setting_${row.id}`,
    type: row.setting_type ?? "",
    settingType: row.setting_type ?? "",
    setting_type: row.setting_type ?? "",
    title: row.title ?? "",
    content: row.content ?? "",
    examples: row.examples ?? "",
    source: "world_settings",
    sourceId: Number(row.id),
    createdAt: toIsoString(row.created_at)
  };
}

async function resolveLegacyCharacters(
  pool: RouteDependencies["pool"],
  work: CreativeContextWorkRow
) {
  const legacyWorkId = readLegacyWorkSourceId(work);
  if (!legacyWorkId) return [];

  const rows = await query<LegacyCharacterRow[]>(
    pool,
    `
    SELECT id, name, role_type, description, created_at
    FROM characters
    WHERE work_id = ?
    ORDER BY id ASC
    LIMIT 200
    `,
    [legacyWorkId]
  );

  return rows.map(mapLegacyCharacter);
}

async function resolveLegacyWorldSettings(
  pool: RouteDependencies["pool"],
  work: CreativeContextWorkRow
) {
  const legacyWorkId = readLegacyWorkSourceId(work);
  if (!legacyWorkId) return [];

  const rows = await query<LegacyWorldSettingRow[]>(
    pool,
    `
    SELECT id, setting_type, title, content, examples, created_at
    FROM world_settings
    WHERE work_id = ?
    ORDER BY id ASC
    LIMIT 200
    `,
    [legacyWorkId]
  );

  return rows.map(mapLegacyWorldSetting);
}

async function enrichLegacyChapterParts(
  pool: RouteDependencies["pool"],
  parts: CreativeContextPartRow[]
): Promise<CreativeContextPartRow[]> {
  const legacySourceIds = Array.from(new Set(
    parts
      .filter((part) => part.kind === "chapter")
      .map(readLegacyChapterSourceId)
      .filter((id): id is number => id !== null)
  ));

  if (legacySourceIds.length === 0) return parts;

  const rows = await query<LegacyChapterMaterialRow[]>(
    pool,
    `
    SELECT id, title, plot_summary, content, word_count
    FROM chapters
    WHERE id IN (${legacySourceIds.map(() => "?").join(", ")})
    `,
    legacySourceIds
  );
  const byId = new Map(rows.map((row) => [Number(row.id), row]));

  return parts.map((part) => {
    const sourceId = readLegacyChapterSourceId(part);
    if (!sourceId) return part;

    const material = byId.get(sourceId);
    if (!material) return part;

    const metadata = toRecord(part.metadata_json);
    const plotSummary = normalizeWhitespace(material.plot_summary || "");
    const derivedSummary = plotSummary || deriveChapterSummary(material.content);
    const wordCount = toPositiveNumber(metadata.wordCount) ?? toPositiveNumber(material.word_count);

    return {
      ...part,
      title: part.title || material.title,
      metadata_json: {
        ...metadata,
        source: metadata.source || "chapters",
        sourceId,
        wordCount: wordCount ?? metadata.wordCount,
        targetWordCount: toPositiveNumber(metadata.targetWordCount) ?? wordCount ?? undefined,
        plotSummary: plotSummary || metadata.plotSummary,
        summary: metadata.summary || derivedSummary || undefined,
        summarySource: metadata.summarySource || (derivedSummary ? (plotSummary ? "chapters.plot_summary" : "chapters.content") : undefined)
      }
    };
  });
}

function toIsoString(value: Date | string | null): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }
  return new Date(0).toISOString();
}

function mapCreativeContextWork(row: CreativeContextWorkRow) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    subtitle: row.subtitle,
    status: row.status,
    authorProfileId: row.author_profile_id,
    metadata: toRecord(row.metadata_json),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapCreativeContextPart(row: CreativeContextPartRow) {
  return {
    id: row.id,
    workId: row.work_id,
    parentPartId: row.parent_part_id,
    kind: row.kind,
    partOrder: row.part_order,
    title: row.title,
    status: row.status,
    metadata: toRecord(row.metadata_json),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapCreativeContextBlock(row: CreativeContextBlockRow) {
  return {
    id: row.id,
    workId: row.work_id,
    partId: row.part_id,
    assetId: row.asset_id,
    kind: row.kind,
    blockOrder: row.block_order,
    textContent: row.text_content,
    payload: toRecord(row.payload_json),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapCreativeContextAuthorProfile(
  resolved: CreativeContextResolvedAuthorProfile
) {
  return {
    profile: {
      id: resolved.profile.id,
      displayName: resolved.profile.display_name,
      stance: resolved.profile.stance,
      voice: toStringArray(resolved.profile.voice_json),
      status: resolved.profile.status,
      createdAt: toIsoString(resolved.profile.created_at),
      updatedAt: toIsoString(resolved.profile.updated_at)
    },
    interestClusters: resolved.interestClusters.map((cluster) => ({
      id: cluster.id,
      authorProfileId: cluster.author_profile_id,
      name: cluster.name,
      terms: toStringArray(cluster.terms_json),
      appliesTo: toStringArray(cluster.applies_to_json),
      evidence: toRecord(cluster.evidence_json),
      status: cluster.status,
      createdAt: toIsoString(cluster.created_at),
      updatedAt: toIsoString(cluster.updated_at)
    })),
    authorTechniques: resolved.authorTechniques.map((technique) => ({
      authorProfileId: technique.author_profile_id,
      techniqueId: technique.technique_id,
      weight: technique.weight,
      priority: technique.priority,
      taskTypes: toStringArray(technique.task_types_json),
      trigger: technique.trigger_text,
      constraint: technique.constraint_text,
      status: technique.status
    }))
  };
}

function mapCreativeContextPublicationTarget(
  row: CreativeContextPublicationTargetRow
) {
  return {
    id: row.id,
    platform: row.platform,
    accountIdentity: row.account_identity,
    localWorkId: row.local_work_id,
    remoteWorkId: row.remote_work_id,
    status: row.status,
    metadata: toRecord(row.metadata_json),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapAuthorLexiconReview(row: AuthorLexiconReviewRow) {
  return {
    id: row.id,
    authorProfileId: row.author_profile_id,
    term: row.term,
    decision: row.decision,
    sourceKind: row.source_kind,
    sourceRef: row.source_ref,
    reason: row.reason,
    category: row.category,
    note: row.note,
    createdAt: toIsoString(row.created_at)
  };
}

type CreativeContextPart = ResolvedCreativeContext["parts"][number];
type CreativeContextBlock = ResolvedCreativeContext["recentBlocks"][number];
type CreativeContextPublicationTarget =
  ResolvedCreativeContext["publicationTargets"][number];
type CreativeContextLexiconReview =
  ResolvedCreativeContext["lexiconLearning"]["recentReviews"][number];

function buildChapterBrief(part: CreativeContextPart): ResolvedCreativeContext["narrativeState"]["previousChapters"][number] {
  const metadata = toRecord(part.metadata);
  const chapterNumber = (
    toPositiveNumber(metadata.chapterNumber)
    ?? toPositiveNumber(metadata.chapter_number)
    ?? toPositiveNumber(metadata.sequence)
    ?? toPositiveNumber(metadata.sourceId)
    ?? part.partOrder
  ) || part.partOrder;
  const summary = normalizeWhitespace(
    String(
      metadata.summary
      ?? metadata.plotSummary
      ?? metadata.plot_summary
      ?? metadata.mainContent
      ?? metadata.main_content
      ?? ""
    )
  );
  const wordCount = (
    toPositiveNumber(metadata.wordCount)
    ?? toPositiveNumber(metadata.word_count)
    ?? toPositiveNumber(metadata.targetWordCount)
    ?? toPositiveNumber(metadata.target_word_count)
  );

  return {
    chapterNumber,
    partId: part.id,
    title: part.title || `Chapter ${chapterNumber}`,
    summary: truncateText(summary, 900),
    status: part.status,
    wordCount
  };
}

function buildNarrativeState(
  parts: CreativeContextPart[],
  currentPart: CreativeContextPart | null,
  styleContract: CreativeStyleContract,
  blocks: CreativeContextBlock[]
): ResolvedCreativeContext["narrativeState"] {
  const chapterParts = parts
    .filter((part) => part.kind === "chapter" || part.kind === "article_section" || part.kind === "script_segment")
    .sort((left, right) => left.partOrder - right.partOrder || left.id.localeCompare(right.id));
  const current = currentPart ?? chapterParts.at(-1) ?? null;
  const currentOrder = current?.partOrder ?? Number.POSITIVE_INFINITY;
  const previousChapters = chapterParts
    .filter((part) => !current || part.partOrder < currentOrder)
    .slice(-6)
    .map(buildChapterBrief);
  const nextChapters = chapterParts
    .filter((part) => current && part.partOrder > currentOrder)
    .slice(0, 3)
    .map(buildChapterBrief);
  const payload = toRecord(styleContract.protocol.payload);
  const payloadCharacters = [
    ...asRecordArray(payload.activeCharacters),
    ...asRecordArray(payload.characters)
  ];
  const characters = payloadCharacters
    .map((item) => ({
      name: normalizeWhitespace(String(item.name ?? "")),
      roleType: normalizeWhitespace(String(item.roleType ?? item.role_type ?? "")),
      summary: truncateText(String(item.summary ?? item.description ?? ""), 500)
    }))
    .filter((item) => item.name)
    .slice(0, 24);
  const payloadWorldRules = [
    ...asRecordArray(payload.worldRules),
    ...asRecordArray(payload.worldSettings)
  ];
  const worldRules = payloadWorldRules
    .map((item) => ({
      type: normalizeWhitespace(String(item.type ?? item.settingType ?? item.setting_type ?? "")),
      title: normalizeWhitespace(String(item.title ?? item.name ?? "world_rule")),
      content: truncateText(String(item.content ?? item.summary ?? item.description ?? ""), 800)
    }))
    .filter((item) => item.content || item.title)
    .slice(0, 24);
  const currentBrief = current ? buildChapterBrief(current) : null;
  const recentBlockBrief = blocks
    .map((block) => truncateText(block.textContent || "", 220))
    .filter(Boolean)
    .slice(-3)
    .join("\n");

  return {
    currentChapter: currentBrief,
    previousChapters,
    nextChapters,
    characters,
    worldRules,
    continuityBrief: truncateText([
      currentBrief ? `Current: ${currentBrief.title}. ${currentBrief.summary}` : "",
      previousChapters.length > 0
        ? `Previous: ${previousChapters.map((chapter) => `${chapter.chapterNumber}. ${chapter.title}`).join("; ")}`
        : "",
      recentBlockBrief ? `Recent text: ${recentBlockBrief}` : ""
    ].filter(Boolean).join("\n"), 1600)
  };
}

function buildSemanticState(
  queryText: string,
  semanticUnits: SemanticUnit[]
): ResolvedCreativeContext["semanticState"] {
  const memoryBrief = semanticUnits
    .slice(0, 8)
    .map((unit) => truncateText(unit.summary || unit.excerpt || unit.sourceTitle, 260))
    .filter(Boolean)
    .join("\n");

  return {
    query: queryText,
    units: semanticUnits,
    memoryBrief: truncateText(memoryBrief, 1800)
  };
}

function buildStyleState(
  authorProfileId: string,
  styleContract: CreativeStyleContract
): ResolvedCreativeContext["styleState"] {
  return {
    authorProfileId,
    protocol: styleContract.protocol.id,
    preferredTerms: styleContract.lexicon.preferred
      .map((term) => term.content || term.word)
      .filter(Boolean)
      .slice(0, 80),
    bannedTerms: styleContract.lexicon.banned
      .map((term) => term.content || term.word)
      .filter(Boolean)
      .slice(0, 80),
    qualityRules: styleContract.qualityRules
      .map((rule) => rule.ruleText)
      .filter(Boolean)
      .slice(0, 40),
    techniques: styleContract.authorTechniques
      .map((technique) => technique.techniqueId)
      .filter(Boolean)
      .slice(0, 40)
  };
}

function buildLexiconLearning(
  reviews: CreativeContextLexiconReview[]
): ResolvedCreativeContext["lexiconLearning"] {
  const counts = reviews.reduce(
    (acc, review) => {
      acc.recentReviews += 1;
      if (review.decision === "candidate") acc.candidate += 1;
      if (review.decision === "approved_preferred") acc.approvedPreferred += 1;
      if (review.decision === "approved_banned") acc.approvedBanned += 1;
      if (review.decision === "rejected") acc.rejected += 1;
      return acc;
    },
    {
      recentReviews: 0,
      candidate: 0,
      approvedPreferred: 0,
      approvedBanned: 0,
      rejected: 0
    }
  );

  const summary = reviews.length === 0
    ? "No lexicon review evidence has been recorded yet."
    : truncateText(
        reviews
          .slice(0, 8)
          .map((review) =>
            `${review.decision} ${review.term} (${review.sourceKind})${review.sourceRef ? ` @ ${review.sourceRef}` : ""}: ${review.reason}`
          )
          .join("\n"),
        1600
      );

  return {
    recentReviews: reviews,
    counts,
    summary
  };
}

function readPayloadKeywords(payload: unknown): string[] {
  const record = toRecord(payload);
  const keywords = [
    ...toStringArray(record.keywords),
    ...toStringArray(record.images),
    ...toStringArray(record.imageTags),
    ...toStringArray(record.image_tags),
    ...toStringArray(record.concepts),
    ...toStringArray(record.conceptTags),
    ...toStringArray(record.concept_tags)
  ];
  return Array.from(new Set(keywords.map(normalizeWhitespace).filter(Boolean))).slice(0, 10);
}

function inferNarrativePositions(category: string, useCase: string): string[] {
  const text = `${category} ${useCase}`;
  const positions = new Set<string>();
  if (/开篇|入口|称谓|命名|意象|视觉/.test(text)) positions.add("opening");
  if (/转折|矛盾|并置|合法性|冲突/.test(text)) positions.add("turning_point");
  if (/景物|建筑|视觉|末世|悲凉|余韵|故国/.test(text)) positions.add("scenery");
  if (/结尾|余韵|白茫茫|悬置|命运/.test(text)) positions.add("ending");
  if (/权力|政治|军政|现实政治|调查|条款/.test(text)) positions.add("argument_pressure");
  if (positions.size === 0) positions.add("supporting_texture");
  return Array.from(positions);
}

function inferSemanticPosture(category: string, title: string, useCase: string): string {
  const text = `${category} ${title} ${useCase}`;
  if (/历史|报告|宣言|议定书|电文|调查/.test(text)) {
    return "以冷材料承载权力结构，不把资料解释成旁白结论";
  }
  if (/诗词|红楼|视觉|建筑|意象/.test(text)) {
    return "以物象、颜色、空间和余韵承担情绪，不直接抒情";
  }
  if (/君主论|修昔底德|现实政治|权力/.test(text)) {
    return "以行动代价和力量关系显出判断，不写成格言摘抄";
  }
  if (/AI味|style_reference/.test(text)) {
    return "作为反面门禁，压低套话、空泛总结和解释性段落";
  }
  return "只借语义姿态和材料功能，不复写原句";
}

function inferSentenceRhythms(category: string, title: string, useCase: string): string[] {
  const text = `${category} ${title} ${useCase}`;
  const rhythms = new Set<string>();
  if (/报告|调查|条款|宣言|议定书/.test(text)) {
    rhythms.add("冷静列举后落到一个不可回避的事实");
    rhythms.add("短句压实事实，长句展开制度后果");
  }
  if (/诗词|红楼|末世|悲凉|白茫茫/.test(text)) {
    rhythms.add("先给可见物，再留下悬置余味");
    rhythms.add("用收束性短句压住情绪，不喊出主题");
  }
  if (/建筑|视觉|帝冠|兴亚式/.test(text)) {
    rhythms.add("从材质、形制、方位进入合法性装饰");
  }
  if (/权力|君主论|修昔底德|现实政治/.test(text)) {
    rhythms.add("以选择、代价、受迫位置组织句群");
  }
  if (rhythms.size === 0) {
    rhythms.add("由具体物进入观念，再回到人物动作");
  }
  return Array.from(rhythms);
}

function buildTransformationInstruction(category: string, title: string, useCase: string): string {
  const base = useCase || title;
  if (/style_reference|AI味/.test(`${category} ${title}`)) {
    return "仅作为反面质量门禁使用，删除空泛套话、解释性总结和任务回应语";
  }
  return `化用《${title}》的材料功能：${base}；只能迁移意象、节奏、论证姿态和叙事位置，不得复写原文句子`;
}

function buildCorpusImitation(
  styleContract: CreativeStyleContract
): ResolvedCreativeContext["corpusImitation"] {
  const payload = toRecord(styleContract.protocol.payload);
  const payloadPunctuation = toRecord(payload.punctuationProfile);
  const sourcePassages = styleContract.sourceMaterials.slice(0, 24).map((material) => {
    const keywords = readPayloadKeywords(material.payload);
    const category = normalizeWhitespace(material.category);
    const title = normalizeWhitespace(material.title);
    const useCase = normalizeWhitespace(material.useCase);
    return {
      sourceId: material.id,
      category,
      title,
      useCase,
      reusableImages: keywords,
      sentenceRhythms: inferSentenceRhythms(category, title, useCase),
      semanticPosture: inferSemanticPosture(category, title, useCase),
      narrativePositions: inferNarrativePositions(category, useCase),
      transformationInstruction: buildTransformationInstruction(category, title, useCase)
    };
  });

  const reusableImages = Array.from(new Set([
    ...sourcePassages.flatMap((item) => item.reusableImages),
    ...toStringArray(payload.reusableImages)
  ].map(normalizeWhitespace).filter(Boolean))).slice(0, 80);
  const sentenceRhythms = Array.from(new Set([
    ...sourcePassages.flatMap((item) => item.sentenceRhythms),
    ...toStringArray(payload.sentenceRhythms)
  ].map(normalizeWhitespace).filter(Boolean))).slice(0, 32);
  const hookPatterns = Array.from(new Set([
    ...toStringArray(payload.hookPatterns),
    "用未解释的物件、称谓或地名变化开场",
    "用人物的具体选择暴露更大的制度压力",
    "章末留下一个物证、方位、称谓或身体变化，不用作者解释"
  ])).slice(0, 24);
  const sceneryPatterns = Array.from(new Set([
    ...toStringArray(payload.sceneryPatterns),
    "景物必须承担势力、历史、身体代价或观念压力",
    "先写材质、温度、声音、方位，再让意义渗出",
    "景物描写后必须改变人物处境或读者对世界的理解"
  ])).slice(0, 24);

  return {
    sourcePassages,
    reusableImages,
    sentenceRhythms,
    punctuationProfile: {
      prefer: [
        ...toStringArray(payloadPunctuation.prefer),
        "用句号压住判断",
        "用逗号和句号完成制度、称谓、物证的解释",
        "认知转折必须改写成自然短句，不使用破折号"
      ].slice(0, 24),
      avoid: [
        ...toStringArray(payloadPunctuation.avoid),
        "连续感叹号",
        "省略号堆叠",
        "括号式作者说明",
        "过密顿号堆概念",
        "冒号",
        "破折号"
      ].slice(0, 24),
      cadence: [
        ...toStringArray(payloadPunctuation.cadence),
        "长句铺开历史压力，短句落到动作或物证",
        "段尾避免解释主题，保留可见余波"
      ].slice(0, 24)
    },
    hookPatterns,
    sceneryPatterns,
    forbiddenImitationRules: [
      "不得整句、整段复写来源材料",
      "不得把材料写成资料摘抄或百科说明",
      "不得只替换同义词保留原句结构",
      "不得引用未在正文中被行动或物象消化的概念"
    ],
    transformationInstructions: Array.from(new Set(sourcePassages.map((item) => item.transformationInstruction))).slice(0, 32)
  };
}

function buildPublicationState(
  targets: CreativeContextPublicationTarget[]
): ResolvedCreativeContext["publicationState"] {
  const constraints = targets
    .flatMap((target) => {
      const metadata = toRecord(target.metadata);
      return [
        ...toStringArray(metadata.constraints),
        ...toStringArray(metadata.platformConstraints),
        ...toStringArray(metadata.platform_constraints)
      ];
    })
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);

  return {
    targets,
    constraints: Array.from(new Set(constraints)).slice(0, 40)
  };
}

function buildContextHash(input: unknown): string {
  const stableJson = JSON.stringify(input);
  return createHash("sha256").update(stableJson).digest("hex");
}

function buildRuntimeSnapshot(input: {
  workId: string;
  partId: string | null;
  authorProfileId: string;
  protocolId: string;
  semanticLimit: number;
  resolvedAt: string;
  parts: CreativeContextPart[];
  blocks: CreativeContextBlock[];
  semanticUnits: SemanticUnit[];
  publicationTargets: CreativeContextPublicationTarget[];
  narrativeState: ResolvedCreativeContext["narrativeState"];
  corpusImitation: ResolvedCreativeContext["corpusImitation"];
  ruleInventory: ResolvedCreativeContext["ruleInventory"];
  lexiconLearning: ResolvedCreativeContext["lexiconLearning"];
}): ResolvedCreativeContext["runtimeSnapshot"] {
  return {
    contextHash: buildContextHash({
      workId: input.workId,
      partId: input.partId,
      authorProfileId: input.authorProfileId,
      protocolId: input.protocolId,
      semanticLimit: input.semanticLimit,
      parts: input.parts.map((part) => [part.id, part.updatedAt]),
      blocks: input.blocks.map((block) => [block.id, block.updatedAt]),
      semanticUnits: input.semanticUnits.map((unit) => [unit.id, unit.updatedAt, unit.searchScore ?? null]),
      publicationTargets: input.publicationTargets.map((target) => [target.id, target.updatedAt]),
      lexiconReviews: input.lexiconLearning.recentReviews.map((review) => [review.id, review.createdAt, review.decision]),
      narrative: {
        current: input.narrativeState.currentChapter?.partId ?? null,
        previous: input.narrativeState.previousChapters.map((chapter) => chapter.partId),
        next: input.narrativeState.nextChapters.map((chapter) => chapter.partId)
      },
      corpusImitation: {
        sourcePassages: input.corpusImitation.sourcePassages.map((item) => item.sourceId),
        reusableImages: input.corpusImitation.reusableImages.slice(0, 24),
        sentenceRhythms: input.corpusImitation.sentenceRhythms.slice(0, 12)
      },
      ruleInventory: {
        rules: input.ruleInventory.rules.map((rule) => [rule.id, rule.severity]),
        languageRules: input.ruleInventory.languageRules.map((rule) => rule.id),
        narrativeRules: input.ruleInventory.narrativeRules.map((rule) => rule.id),
        corpusRules: input.ruleInventory.corpusRules.map((rule) => rule.id)
      }
    }),
    resolvedAt: input.resolvedAt,
    sourceCounts: {
      parts: input.parts.length,
      recentBlocks: input.blocks.length,
      semanticUnits: input.semanticUnits.length,
      publicationTargets: input.publicationTargets.length,
      characters: input.narrativeState.characters.length,
      worldRules: input.narrativeState.worldRules.length,
      lexiconReviews: input.lexiconLearning.recentReviews.length
    }
  };
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === "object" && !Array.isArray(item)
  );
}

function buildCreativeStyleContract(
  resolved: CreativeContextResolvedStyleContract
): CreativeStyleContract {
  return CreativeStyleContractSchema.parse({
    protocol: {
      id: resolved.protocol.id,
      name: resolved.protocol.name,
      domain: resolved.protocol.domain,
      perspectiveRule: resolved.protocol.perspective_rule ?? "",
      toneRule: resolved.protocol.tone_rule ?? "",
      executionRule: resolved.protocol.execution_rule ?? "",
      payload: toRecord(resolved.protocol.payload_json)
    },
    modules: resolved.modules.map((module) => ({
      code: module.code,
      parentCode: module.parent_code ?? "",
      category: module.category,
      name: module.name,
      moduleKind: module.module_kind,
      description: module.description ?? "",
      payload: module.payload_json
    })),
    editingSteps: resolved.editingSteps.map((step) => ({
      stepOrder: step.step_order,
      name: step.name,
      taskSummary: step.task_summary,
      requiredReport: step.required_report_json,
      hardRules: step.hard_rules_json
    })),
    qualityRules: resolved.qualityRules.map((rule) => ({
      id: rule.id,
      ruleType: rule.rule_type,
      severity: rule.severity,
      ruleText: rule.rule_text,
      checkHint: rule.check_hint ?? ""
    })),
    sourceMaterials: resolved.sourceMaterials.map((source) => ({
      id: source.id,
      category: source.category,
      title: source.title,
      useCase: source.use_case ?? "",
      payload: source.payload_json
    })),
    techniques: resolved.techniques.map((technique) => ({
      id: technique.id,
      name: technique.name,
      layer: technique.layer,
      description: technique.description,
      mechanism: technique.mechanism,
      suitableFor: toStringArray(technique.suitable_for_json),
      avoidWhen: toStringArray(technique.avoid_when_json),
      promptInstruction: technique.prompt_instruction,
      qualityCheck: technique.quality_check,
      status: technique.status
    })),
    authorTechniques: resolved.authorTechniques.map((technique) => ({
      authorProfileId: technique.author_profile_id,
      techniqueId: technique.technique_id,
      weight: technique.weight,
      priority: technique.priority,
      taskTypes: toStringArray(technique.task_types_json),
      trigger: technique.trigger_text,
      constraint: technique.constraint_text,
      status: technique.status
    })),
    lexicon: {
      preferred: resolved.vocabulary.map((term) => ({
        word: term.content,
        content: term.content,
        type: term.type,
        category: term.category,
        tags: term.tags,
        note: term.note ?? ""
      })),
      banned: resolved.bannedWords.map((term) => ({
        word: term.content,
        content: term.content,
        type: term.type,
        category: term.category,
        reason: term.reason ?? "",
        replacement: term.alternative ?? "",
        alternative: term.alternative ?? ""
      }))
    }
  });
}

const CreativeStyleContractResponseSchema = CreativeStyleContractSchema.extend({
  topicId: z.string().nullable().optional(),
  lexiconRegisterFilter: z
    .object({
      forbiddenLexiconTags: z.array(z.string()),
      allowedLexiconTags: z.array(z.string()),
      preferredRemoved: z.number(),
      bannedRemoved: z.number(),
    })
    .nullable()
    .optional(),
  counts: z.object({
    modules: z.number(),
    editingSteps: z.number(),
    qualityRules: z.number(),
    sourceMaterials: z.number(),
    techniques: z.number(),
    authorTechniques: z.number(),
    preferredTerms: z.number(),
    bannedTerms: z.number(),
  }),
  requestId: z.string(),
});

async function resolveAuthorProfile(
  pool: RouteDependencies["pool"],
  authorProfileId: string
): Promise<CreativeContextResolvedAuthorProfile | null> {
  const profiles = await query<AuthorProfileRow[]>(
    pool,
    `
    SELECT id, display_name, stance, voice_json, status, updated_at, created_at
    FROM author_profiles
    WHERE id = ? AND status = 'active'
    LIMIT 1
    `,
    [authorProfileId]
  );
  const profile = profiles[0] ?? null;
  if (!profile) return null;

  const [interestClusters, authorTechniques] = await Promise.all([
    query<AuthorInterestClusterRow[]>(
      pool,
      `
      SELECT id, author_profile_id, name, terms_json, applies_to_json, evidence_json, status, updated_at, created_at
      FROM author_interest_clusters
      WHERE author_profile_id = ? AND status = 'active'
      ORDER BY id ASC
      `,
      [authorProfileId]
    ),
    query<AuthorTechniqueRow[]>(
      pool,
      `
      SELECT author_profile_id, technique_id, weight, priority, task_types_json, trigger_text, constraint_text, status
      FROM creative_author_techniques
      WHERE author_profile_id = ? AND status = 'active'
      ORDER BY weight DESC, technique_id ASC
      `,
      [authorProfileId]
    )
  ]);

  return { profile, interestClusters, authorTechniques };
}

async function resolveStyleContract(
  pool: RouteDependencies["pool"],
  protocolId: string
): Promise<CreativeContextResolvedStyleContract | null> {
  const protocols = await query<ProtocolRow[]>(
    pool,
    `
    SELECT id, name, domain, status, perspective_rule, tone_rule, execution_rule, payload_json, source_doc, updated_at
    FROM creative_style_protocols
    WHERE id = ? AND status = 'active'
    LIMIT 1
    `,
    [protocolId]
  );
  const protocol = protocols[0] ?? null;
  if (!protocol) return null;

  const [modules, editingSteps, qualityRules, sourceMaterials, vocabulary, bannedWords, techniques, authorTechniques] = await Promise.all([
    query<ModuleRow[]>(
      pool,
      `
      SELECT code, parent_code, category, name, module_kind, description, payload_json
      FROM creative_style_modules
      ORDER BY code ASC
      `
    ),
    query<EditingStepRow[]>(
      pool,
      `
      SELECT protocol_id, step_order, name, task_summary, required_report_json, hard_rules_json
      FROM creative_editing_steps
      WHERE protocol_id = ?
      ORDER BY step_order ASC
      `,
      [protocolId]
    ),
    query<QualityRuleRow[]>(
      pool,
      `
      SELECT id, protocol_id, rule_type, severity, rule_text, check_hint
      FROM creative_quality_rules
      WHERE protocol_id = ? OR protocol_id IS NULL
      ORDER BY severity ASC, id ASC
      `,
      [protocolId]
    ),
    query<SourceMaterialRow[]>(
      pool,
      `
      SELECT id, category, title, use_case, payload_json
      FROM creative_source_materials
      ORDER BY category ASC, id ASC
      `
    ),
    query<VocabularyContractRow[]>(
      pool,
      `
      SELECT content, type, category, tags, note
      FROM vocabulary
      WHERE JSON_CONTAINS(tags, JSON_QUOTE('creative-style'))
         OR note LIKE 'creative-style import:%'
      ORDER BY category ASC, content ASC
      `
    ),
    query<BannedWordContractRow[]>(
      pool,
      `
      SELECT content, type, category, reason, alternative
      FROM banned_words
      WHERE reason LIKE '%creative-style ban:%'
      ORDER BY category ASC, content ASC
      `
    ),
    query<WritingTechniqueRow[]>(
      pool,
      `
      SELECT id, name, layer, description, mechanism, suitable_for_json, avoid_when_json, prompt_instruction, quality_check, status
      FROM creative_writing_techniques
      WHERE status = 'active'
      ORDER BY layer ASC, id ASC
      `
    ),
    query<AuthorTechniqueRow[]>(
      pool,
      `
      SELECT author_profile_id, technique_id, weight, priority, task_types_json, trigger_text, constraint_text, status
      FROM creative_author_techniques
      WHERE status = 'active'
      ORDER BY weight DESC, technique_id ASC
      `
    )
  ]);

  return {
    protocol,
    modules,
    editingSteps,
    qualityRules,
    sourceMaterials,
    vocabulary,
    bannedWords,
    techniques,
    authorTechniques
  };
}

export function creativeRoutes({ pool }: RouteDependencies) {
  const app = new Hono<AppBindings>();

  app.get("/creative/context", async (c) => {
    let workId: string;
    try {
      workId = requireQueryParam(c.req.query("workId"), "workId");
    } catch (error) {
      const message = error instanceof Error ? error.message : "missing_required_query";
      return c.json({
        ok: false,
        error: "invalid_request",
        message,
        requestId: c.get("requestId")
      }, 400);
    }

    const partId = (c.req.query("partId") || "").trim();
    const protocolId = normalizeProtocolId(c.req.query("protocol"));
    const semanticSearch = (c.req.query("semanticSearch") || "").trim();
    const semanticLimit = clampLimit(c.req.query("semanticLimit") || null, 12, 50);

    const works = await query<CreativeContextWorkRow[]>(
      pool,
      `
      SELECT id, kind, title, subtitle, status, author_profile_id, metadata_json, updated_at, created_at
      FROM content_works
      WHERE id = ?
      LIMIT 1
      `,
      [workId]
    );
    const work = works[0] ?? null;
    if (!work) {
      return c.json({
        ok: false,
        error: "content_work_not_found",
        workId,
        requestId: c.get("requestId")
      }, 404);
    }

    const authorProfileId = normalizeAuthorProfileId(work.author_profile_id);
    const [authorProfile, resolvedStyleContract, publicationTargets, semanticUnits, legacyCharacters, legacyWorldSettings, lexiconReviewRows] = await Promise.all([
      resolveAuthorProfile(pool, authorProfileId),
      resolveStyleContract(pool, protocolId),
      query<CreativeContextPublicationTargetRow[]>(
        pool,
        `
        SELECT id, platform, account_identity, local_work_id, remote_work_id, status, metadata_json, updated_at, created_at
        FROM publication_targets
        WHERE local_work_id = ? AND status = 'active'
        ORDER BY platform ASC, id ASC
        `,
        [workId]
      ),
      resolveSemanticUnits(pool, {
        status: "active",
        search: semanticSearch || `${work.title} ${work.subtitle || ""}`,
        tag: "",
        materialKind: "",
        limit: semanticLimit
      }),
      resolveLegacyCharacters(pool, work),
      resolveLegacyWorldSettings(pool, work),
      query<AuthorLexiconReviewRow[]>(
        pool,
        `
        SELECT id, author_profile_id, term, decision, source_kind, source_ref, reason, category, note, created_at
        FROM author_lexicon_reviews
        WHERE author_profile_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 24
        `,
        [authorProfileId]
      )
    ]);

    if (!authorProfile) {
      return c.json({
        ok: false,
        error: "author_profile_not_found",
        authorProfileId,
        requestId: c.get("requestId")
      }, 404);
    }

    if (!resolvedStyleContract) {
      return c.json({
        ok: false,
        error: "creative_protocol_not_found",
        protocol: protocolId,
        requestId: c.get("requestId")
      }, 404);
    }

    const rawParts = await query<CreativeContextPartRow[]>(
      pool,
      `
      SELECT id, work_id, parent_part_id, kind, part_order, title, status, metadata_json, updated_at, created_at
      FROM content_parts
      WHERE work_id = ?
      ORDER BY part_order ASC, id ASC
      LIMIT 500
      `,
      [workId]
    );
    const parts = await enrichLegacyChapterParts(pool, rawParts);

    const currentPart = partId
      ? parts.find((part) => part.id === partId) ?? null
      : null;

    if (partId && !currentPart) {
      return c.json({
        ok: false,
        error: "content_part_not_found",
        workId,
        partId,
        requestId: c.get("requestId")
      }, 404);
    }

    const blockPartIds = currentPart
      ? [currentPart.id]
      : parts
        .filter((part) => part.kind === "chapter" || part.kind === "article_section" || part.kind === "script_segment")
        .slice(-3)
        .map((part) => part.id);

    const blocks = blockPartIds.length > 0
      ? await query<CreativeContextBlockRow[]>(
        pool,
        `
        SELECT id, work_id, part_id, asset_id, kind, block_order, text_content, payload_json, updated_at, created_at
        FROM content_blocks
        WHERE part_id IN (${blockPartIds.map(() => "?").join(", ")})
        ORDER BY part_id ASC, block_order ASC, id ASC
        LIMIT 500
        `,
        blockPartIds
      )
      : [];

    const styleContract = buildCreativeStyleContract(resolvedStyleContract);
    if (legacyCharacters.length > 0 || legacyWorldSettings.length > 0) {
      const payload = toRecord(styleContract.protocol.payload);
      const configuredCharacters = Array.isArray(payload.characters)
        ? payload.characters
        : [];
      const configuredActiveCharacters = Array.isArray(payload.activeCharacters)
        ? payload.activeCharacters
        : [];
      const configuredWorldRules = Array.isArray(payload.worldRules)
        ? payload.worldRules
        : [];
      const configuredWorldSettings = Array.isArray(payload.worldSettings)
        ? payload.worldSettings
        : [];
      styleContract.protocol.payload = {
        ...payload,
        characters: configuredCharacters.length > 0 ? configuredCharacters : legacyCharacters,
        activeCharacters: configuredActiveCharacters.length > 0
          ? configuredActiveCharacters
          : legacyCharacters.slice(0, 12),
        worldRules: configuredWorldRules.length > 0 ? configuredWorldRules : legacyWorldSettings,
        worldSettings: configuredWorldSettings.length > 0 ? configuredWorldSettings : legacyWorldSettings
      };
    }
    const contextWork = mapCreativeContextWork(work);
    const contextParts = parts.map(mapCreativeContextPart);
    const contextCurrentPart = currentPart
      ? mapCreativeContextPart(currentPart)
      : null;
    const contextBlocks = blocks.map(mapCreativeContextBlock);
    const contextAuthorProfile = mapCreativeContextAuthorProfile(authorProfile);
    const contextPublicationTargets = publicationTargets.map(
      mapCreativeContextPublicationTarget
    );
    const lexiconLearning = buildLexiconLearning(
      lexiconReviewRows.map(mapAuthorLexiconReview)
    );
    const semanticQuery = semanticSearch || `${work.title} ${work.subtitle || ""}`.trim();
    const resolvedAt = new Date().toISOString();
    const narrativeState = buildNarrativeState(
      contextParts,
      contextCurrentPart,
      styleContract,
      contextBlocks
    );
    const corpusImitation = buildCorpusImitation(styleContract);
    const ruleInventory = getCreativeRuleInventory();
    styleContract.protocol.payload = {
      ...toRecord(styleContract.protocol.payload),
      corpusImitation,
      ruleInventory
    };
    const semanticState = buildSemanticState(semanticQuery, semanticUnits);
    const styleState = buildStyleState(authorProfileId, styleContract);
    const publicationState = buildPublicationState(contextPublicationTargets);
    const runtimeSnapshot = buildRuntimeSnapshot({
      workId,
      partId: contextCurrentPart?.id ?? null,
      authorProfileId,
      protocolId,
      semanticLimit,
      resolvedAt,
      parts: contextParts,
      blocks: contextBlocks,
      semanticUnits,
      publicationTargets: contextPublicationTargets,
      narrativeState,
      corpusImitation,
      ruleInventory,
      lexiconLearning
    });

    return c.json(validatedResponse(ResolvedCreativeContextSchema, {
      ok: true,
      contextVersion: "creative-context.v1",
      work: contextWork,
      narrativeState,
      semanticState,
      styleState,
      corpusImitation,
      ruleInventory,
      publicationState,
      runtimeSnapshot,
      lexiconLearning,
      currentPart: contextCurrentPart,
      parts: contextParts,
      recentBlocks: contextBlocks,
      authorProfile: contextAuthorProfile,
      styleContract,
      semanticContext: {
        query: semanticQuery,
        units: semanticUnits
      },
      publicationTargets: contextPublicationTargets,
      snapshot: {
        workId,
        partId: currentPart?.id ?? null,
        authorProfileId,
        protocol: protocolId,
        semanticLimit,
        resolvedAt
      },
      counts: {
        parts: parts.length,
        recentBlocks: blocks.length,
        semanticUnits: semanticUnits.length,
        publicationTargets: publicationTargets.length,
        preferredTerms: styleContract.lexicon.preferred.length,
        bannedTerms: styleContract.lexicon.banned.length,
        qualityRules: styleContract.qualityRules.length,
        techniques: styleContract.techniques.length,
        lexiconReviews: lexiconReviewRows.length
      },
      requestId: c.get("requestId")
    }));
  });

  app.get("/creative/author-profile", async (c) => {
    const authorProfileId = (c.req.query("id") || "emptyinkpot_primary_author").trim();

    const resolved = await resolveAuthorProfile(pool, authorProfileId);
    if (!resolved) {
      return c.json({
        ok: false,
        error: "author_profile_not_found",
        authorProfileId,
        requestId: c.get("requestId")
      }, 404);
    }

    return c.json({
      profile: resolved.profile,
      interestClusters: resolved.interestClusters,
      authorTechniques: resolved.authorTechniques,
      counts: {
        interestClusters: resolved.interestClusters.length,
        authorTechniques: resolved.authorTechniques.length
      },
      requestId: c.get("requestId")
    });
  });

  app.get("/creative/style-contract", async (c) => {
    const protocolId = normalizeProtocolId(c.req.query("protocol"));
    const topicId = String(c.req.query("topicId") || "").trim();
    const topicEntry = topicId ? getTopicEntry(topicId) : undefined;

    const resolved = await resolveStyleContract(pool, protocolId);
    if (!resolved) {
      return c.json({
        ok: false,
        error: "creative_protocol_not_found",
        protocol: protocolId,
        requestId: c.get("requestId")
      }, 404);
    }

    setCategoryRegisterMap(await loadCategoryRegisterMap(pool));
    const rawContract = buildCreativeStyleContract(resolved);
    const preferredBefore = rawContract.lexicon.preferred.length;
    const bannedBefore = rawContract.lexicon.banned.length;
    const contract = topicEntry
      ? {
          ...rawContract,
          lexicon: {
            preferred: filterLexiconTermsByTopicEntry(
              rawContract.lexicon.preferred as LexiconTermRow[],
              topicEntry,
            ),
            banned: filterLexiconTermsByTopicEntry(
              rawContract.lexicon.banned as LexiconTermRow[],
              topicEntry,
            ),
          },
        }
      : rawContract;

    return c.json(validatedResponse(CreativeStyleContractResponseSchema, {
      ...contract,
      topicId: topicId || null,
      lexiconRegisterFilter: topicEntry
        ? {
            forbiddenLexiconTags: topicEntry.forbiddenLexiconTags || [],
            allowedLexiconTags: topicEntry.allowedLexiconTags || [],
            preferredRemoved: preferredBefore - contract.lexicon.preferred.length,
            bannedRemoved: bannedBefore - contract.lexicon.banned.length,
          }
        : null,
      counts: {
        modules: contract.modules.length,
        editingSteps: contract.editingSteps.length,
        qualityRules: contract.qualityRules.length,
        sourceMaterials: contract.sourceMaterials.length,
        techniques: contract.techniques.length,
        authorTechniques: contract.authorTechniques.length,
        preferredTerms: contract.lexicon.preferred.length,
        bannedTerms: contract.lexicon.banned.length
      },
      requestId: c.get("requestId")
    }));
  });

  return app;
}
