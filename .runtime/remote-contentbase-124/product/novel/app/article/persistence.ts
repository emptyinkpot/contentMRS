import { createHash } from 'crypto';
import { createDataBaseGatewayClient } from '../../core/utils/database-gateway-client';
import { createContentDatabaseClient } from '../../core/utils/database-gateway-client';
import type { RuntimeArticleContext } from './runtime';

export interface ArticlePersistenceDeps {
  recordGenerationOutput?: (input: {
    idempotencyKey: string;
    envelope: {
      requestId: string;
      actor: string;
      payload: Record<string, unknown>;
    };
  }) => Promise<Record<string, any>>;
  recordArticleAcceptanceReport?: (input: {
    idempotencyKey: string;
    envelope: {
      requestId: string;
      actor: string;
      payload: Record<string, unknown>;
    };
  }) => Promise<Record<string, any>>;
  recordArticleReferenceUsageReport?: (input: {
    idempotencyKey: string;
    envelope: {
      requestId: string;
      actor: string;
      payload: Record<string, unknown>;
    };
  }) => Promise<Record<string, any>>;
  recordStyleRevisionPair?: (input: {
    idempotencyKey: string;
    envelope: {
      requestId: string;
      actor: string;
      payload: Record<string, unknown>;
    };
  }) => Promise<Record<string, any>>;
  recordExperience?: (input: {
    idempotencyKey: string;
    envelope: {
      requestId: string;
      actor: string;
      payload: Record<string, unknown>;
    };
  }) => Promise<Record<string, any>>;
}

export function readPositiveInteger(value: unknown, field: string): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${field} is required when persist is true`);
  }
  return Math.trunc(numberValue);
}

export function readGenerationOutputStatus(value: unknown): 'first_draft' | 'polished' {
  const status = String(value || 'first_draft').trim();
  if (status === 'first_draft' || status === 'polished') {
    return status;
  }
  throw new Error('persistStatus must be first_draft or polished');
}

export async function persistGeneratedArticleIfRequested(input: {
  input: Record<string, any>;
  topic: string;
  target: string;
  finalBody: string;
  semanticTopology: Record<string, any>;
  quality: Record<string, any>;
  trace: Record<string, any>;
  deps: ArticlePersistenceDeps;
}) {
  if (input.input.persist !== true) {
    return null;
  }

  const workId = readPositiveInteger(input.input.workId, 'workId');
  const chapterNumber = readPositiveInteger(input.input.chapterNumber, 'chapterNumber');
  const chapterId = input.input.chapterId == null || input.input.chapterId === ''
    ? undefined
    : readPositiveInteger(input.input.chapterId, 'chapterId');
  const status = readGenerationOutputStatus(input.input.persistStatus || input.input.status);
  const idempotencyKey = String(input.input.persistIdempotencyKey || '').trim()
    || buildArticlePersistIdempotencyKey({
      workId,
      chapterId,
      chapterNumber,
      topic: input.topic,
      target: input.target,
      body: input.finalBody,
      status,
    });
  const envelope = {
    requestId: `contentbase-article-generation-${workId}-${chapterNumber}`,
    actor: String(input.input.operator || 'contentbase-runtime').trim() || 'contentbase-runtime',
    payload: {
      workId,
      ...(chapterId ? { chapterId } : {}),
      chapterNumber,
      title: String(input.input.title || input.topic).trim() || input.topic,
      body: input.finalBody,
      status,
      operator: String(input.input.operator || 'contentbase-runtime').trim() || 'contentbase-runtime',
      metadata: {
        source: 'contentbase-runtime.generate.article',
        target: input.target,
        topic: input.topic,
        semanticTopologyVersion: String(input.semanticTopology.version || ''),
        evaluationRole: 'observation_report_only',
        generationMode: String(input.trace.generationMode || ''),
        tracePipeline: String(input.trace.pipeline || ''),
      },
    },
  };

  if (input.deps.recordGenerationOutput) {
    return persistGatewayWrite({
      operation: 'recordGenerationOutput',
      write: () => input.deps.recordGenerationOutput!({ idempotencyKey, envelope }),
    });
  }

  return persistGatewayWrite({
    operation: 'recordGenerationOutput',
    write: () => createDataBaseGatewayClient().recordGenerationOutput({
      xDataBaseIdempotencyKey: idempotencyKey,
      gatewayWriteEnvelope: envelope,
    }) as Promise<Record<string, any>>,
  });
}

export async function persistArticleAcceptanceReportIfRequested(input: {
  input: Record<string, any>;
  topic: string;
  target: string;
  acceptance: Record<string, any>;
  trace: Record<string, any>;
  deps: ArticlePersistenceDeps;
}) {
  if (input.input.recordAcceptanceReport !== true) {
    return null;
  }

  const workId = readPositiveInteger(input.input.workId, 'workId');
  const chapterNumber = readPositiveInteger(input.input.chapterNumber, 'chapterNumber');
  const chapterId = input.input.chapterId == null || input.input.chapterId === ''
    ? undefined
    : readPositiveInteger(input.input.chapterId, 'chapterId');
  const contractId = String(input.acceptance.contractId || 'article-acceptance-default');
  const idempotencyKey = String(input.input.acceptanceReportIdempotencyKey || '').trim()
    || buildArticleAcceptanceReportIdempotencyKey({
      version: 'v2',
      workId,
      chapterId,
      chapterNumber,
      contractId,
      passed: Boolean(input.acceptance.passed),
      violationCount: Array.isArray(input.acceptance.violations) ? input.acceptance.violations.length : 0,
      reportDigest: digestJson(input.acceptance),
    });
  const envelope = {
    requestId: `contentbase-article-acceptance-${workId}-${chapterNumber}`,
    actor: String(input.input.operator || 'contentbase-runtime').trim() || 'contentbase-runtime',
    payload: {
      workId,
      ...(chapterId ? { chapterId } : {}),
      chapterNumber,
      ...(input.input.partId ? { partId: String(input.input.partId) } : {}),
      reportId: String(input.input.acceptanceReportId || '').trim() || undefined,
      report: input.acceptance,
      operator: String(input.input.operator || 'contentbase-runtime').trim() || 'contentbase-runtime',
      metadata: {
        source: 'contentbase-runtime.generate.article.acceptance',
        target: input.target,
        topic: input.topic,
        generationMode: String(input.trace.generationMode || ''),
        tracePipeline: String(input.trace.pipeline || ''),
      },
    },
  };

  if (input.deps.recordArticleAcceptanceReport) {
    return persistGatewayWrite({
      operation: 'recordArticleAcceptanceReport',
      write: () => input.deps.recordArticleAcceptanceReport!({ idempotencyKey, envelope }),
    });
  }

  return persistGatewayWrite({
    operation: 'recordArticleAcceptanceReport',
    write: () => createDataBaseGatewayClient().recordArticleAcceptanceReport({
      xDataBaseIdempotencyKey: idempotencyKey,
      gatewayWriteEnvelope: envelope,
    }) as Promise<Record<string, any>>,
  });
}

export async function persistArticleReferenceUsageReportIfRequested(input: {
  input: Record<string, any>;
  topic: string;
  target: string;
  plan: Record<string, any>;
  context: RuntimeArticleContext;
  trace: Record<string, any>;
  referenceCoverage?: {
    score: number;
    threshold: number;
    paragraphCount: number;
    materialBackedParagraphCount: number;
    materialBackedParagraphRatio: number;
    kindCoverage: Record<string, number>;
    matchedByText: string[];
    paragraphs: Array<{
      index: number;
      text: string;
      anchorNames: string[];
      kinds: string[];
      sourceIds: string[];
    }>;
  };
  deps: ArticlePersistenceDeps;
}) {
  if (input.input.recordReferenceUsageReport !== true) {
    return null;
  }

  const workId = readPositiveInteger(input.input.workId, 'workId');
  const chapterNumber = readPositiveInteger(input.input.chapterNumber, 'chapterNumber');
  const chapterId = input.input.chapterId == null || input.input.chapterId === ''
    ? undefined
    : readPositiveInteger(input.input.chapterId, 'chapterId');
  const referenceWeave = input.plan.referenceWeave || {};
  const anchors = (Array.isArray(referenceWeave.anchors) ? referenceWeave.anchors : [])
    .filter((anchor: any) => isBodyReferenceUsageAnchor(anchor));
  const sectionPlans = (Array.isArray(referenceWeave.sectionPlans) ? referenceWeave.sectionPlans : [])
    .map((section: any) => ({
      ...section,
      anchors: Array.isArray(section.anchors)
        ? section.anchors.filter((anchor: any) => isBodyReferenceUsageAnchor(anchor))
        : [],
    }));
  const sourcePassageReadback = buildArticleReferenceUsageSourcePassages({
    sourcePassages: Array.isArray(input.input.sourcePassages) ? input.input.sourcePassages : [],
    anchors,
    sectionPlans,
  });
  const report = {
    version: 'article-reference-usage-report.v1',
    articlePlanVersion: String(input.plan.version || ''),
    topic: input.topic,
    target: input.target,
    referenceWeaveVersion: String(referenceWeave.version || ''),
    anchors: anchors.map((anchor: any) => ({
      kind: normalizeSourcePassageKind(anchor.kind || 'document'),
      name: String(anchor.name || ''),
      use: String(anchor.use || ''),
      source: normalizeReferenceUsageSource(anchor.source) || inferReferenceUsageSource(anchor, input.context),
      ...(anchor.sourceId ? { sourceId: String(anchor.sourceId) } : {}),
      ...(anchor.sectionHint ? { sectionTitle: String(anchor.sectionHint) } : {}),
      required: Boolean(anchor.required),
    })).filter((anchor: any) => anchor.name && anchor.use),
    sourcePassages: sourcePassageReadback,
    sectionUsage: sectionPlans.map((section: any) => ({
      sectionTitle: String(section.sectionTitle || ''),
      anchorNames: Array.isArray(section.anchors)
        ? section.anchors.map((anchor: any) => String(anchor.name || '')).filter(Boolean)
        : [],
      ...(section.weaveInstruction ? { instruction: String(section.weaveInstruction) } : {}),
    })).filter((section: any) => section.sectionTitle),
    actualUsage: input.referenceCoverage
      ? {
        score: input.referenceCoverage.score,
        threshold: input.referenceCoverage.threshold,
        paragraphCount: input.referenceCoverage.paragraphCount,
        materialBackedParagraphCount: input.referenceCoverage.materialBackedParagraphCount,
        materialBackedParagraphRatio: input.referenceCoverage.materialBackedParagraphRatio,
        kindCoverage: input.referenceCoverage.kindCoverage,
        matchedAnchorNames: input.referenceCoverage.matchedByText,
        paragraphs: input.referenceCoverage.paragraphs.slice(0, 20).map((paragraph) => ({
          index: paragraph.index,
          anchorNames: paragraph.anchorNames.slice(0, 20),
          kinds: paragraph.kinds.slice(0, 10).map((kind) => normalizeSourcePassageKind(kind)),
          sourceIds: paragraph.sourceIds.slice(0, 20),
          excerpt: compactReferenceUsageExcerpt(paragraph.text),
        })),
      }
      : undefined,
    contextSources: {
      creativeSourceMaterials: input.context.styleContract.sourceMaterials.length,
      creativeSourceMaterialsRole: 'style_and_citation_boundary_only',
      semanticUnits: input.context.semantic.units.length,
      memoryItems: input.context.memory.items.length,
      literatureItems: input.context.literature.items.length,
      learningEvents: input.context.learning.events.length,
    },
    warnings: input.context.warnings,
  };
  const idempotencyKey = String(input.input.referenceUsageReportIdempotencyKey || '').trim()
    || buildArticleReferenceUsageReportIdempotencyKey({
      version: 'v2',
      workId,
      chapterId,
      chapterNumber,
      topic: input.topic,
      anchorCount: report.anchors.length,
      sectionCount: report.sectionUsage.length,
      reportDigest: digestJson(report),
    });
  const envelope = {
    requestId: `contentbase-article-reference-usage-${workId}-${chapterNumber}`,
    actor: String(input.input.operator || 'contentbase-runtime').trim() || 'contentbase-runtime',
    payload: {
      workId,
      ...(chapterId ? { chapterId } : {}),
      chapterNumber,
      ...(input.input.partId ? { partId: String(input.input.partId) } : {}),
      reportId: String(input.input.referenceUsageReportId || '').trim() || undefined,
      report,
      operator: String(input.input.operator || 'contentbase-runtime').trim() || 'contentbase-runtime',
      metadata: {
        source: 'contentbase-runtime.generate.article.reference-usage',
        target: input.target,
        topic: input.topic,
        generationMode: String(input.trace.generationMode || ''),
        tracePipeline: String(input.trace.pipeline || ''),
      },
    },
  };

  if (input.deps.recordArticleReferenceUsageReport) {
    return persistGatewayWrite({
      operation: 'recordArticleReferenceUsageReport',
      write: () => input.deps.recordArticleReferenceUsageReport!({ idempotencyKey, envelope }),
    });
  }

  return persistGatewayWrite({
    operation: 'recordArticleReferenceUsageReport',
    write: () => createDataBaseGatewayClient().recordArticleReferenceUsageReport({
      xDataBaseIdempotencyKey: idempotencyKey,
      recordArticleReferenceUsageReportRequest: envelope as any,
    }) as Promise<Record<string, any>>,
  });
}

export async function persistStyleRevisionPairsIfRequested(input: {
  input: Record<string, any>;
  topic: string;
  target: string;
  trace: Record<string, any>;
  finalBody: string;
  deps: ArticlePersistenceDeps;
}) {
  if (input.input.recordStyleRevisionPairs !== true) {
    return null;
  }

  const pairs = collectStyleRevisionPairs({
    trace: input.trace,
    finalBody: input.finalBody,
  });
  if (!pairs.length) {
    return {
      ok: true,
      action: 'record_style_revision_pairs',
      count: 0,
      items: [],
    };
  }

  const actor = String(input.input.operator || 'contentbase-runtime').trim() || 'contentbase-runtime';
  const items = [];
  for (const [index, pair] of pairs.entries()) {
    const severity: 'info' | 'warn' | 'block' = pair.severity === 'block'
      ? 'block'
      : pair.severity === 'info'
        ? 'info'
        : 'warn';
    const payload = {
      sourceId: 'contentbase.syntax-reviewer',
      sourceTitle: 'ContentBase SyntaxReviewer',
      sourceLocator: pair.paragraphIndex == null ? `article:${input.topic}` : `article:${input.topic}:paragraph:${pair.paragraphIndex + 1}`,
      topic: input.topic,
      target: input.target,
      issueType: pair.issueType,
      ruleId: pair.ruleId,
      severity,
      originalText: pair.originalText,
      revisedText: pair.revisedText,
      reviewerEvidence: pair.reviewerEvidence,
      status: 'active' as const,
      // 这里保存的是生成正文的审稿证据，不保存作家原文；长期真相仍归 DataBase semantic_units。
      metadata: {
        source: 'contentbase-runtime.generate.article.syntax-reviewer',
        strategy: pair.strategy,
        topic: input.topic,
        target: input.target,
      },
      tags: [
        { layer: 'style', value: 'style-revision-pair', description: 'Reusable style revision pair.' },
        { layer: 'style', value: 'syntax-eval-case', description: 'Syntax reviewer case.' },
        { layer: 'source', value: 'contentbase-syntax-reviewer', description: 'ContentBase reviewer evidence.' },
        { layer: 'usable_for', value: 'article-style-evaluation', description: 'Reusable as article style evaluation sample.' },
      ],
    };
    const idempotencyKey = String(input.input.styleRevisionPairIdempotencyKey || '').trim()
      || buildStyleRevisionPairIdempotencyKey({
        topic: input.topic,
        target: input.target,
        index,
        payloadDigest: digestJson(payload),
      });
    const envelope = {
      requestId: `contentbase-style-revision-${Date.now()}-${index + 1}`,
      actor,
      payload,
    };
    const item = input.deps.recordStyleRevisionPair
      ? await persistGatewayWrite({
        operation: 'recordStyleRevisionPair',
        write: () => input.deps.recordStyleRevisionPair!({ idempotencyKey, envelope }),
      })
      : await persistGatewayWrite({
        operation: 'recordStyleRevisionPair',
        // 句法修订样本只能走 DataBase 专用写入口，避免落回通用资料池形成第二套语义。
        write: () => createContentDatabaseClient().semantic.recordStyleRevisionPair(payload, {
          idempotencyKey,
          requestId: envelope.requestId,
          actor: envelope.actor,
        }) as Promise<Record<string, any>>,
      });
    items.push(item);
  }

  return {
    ok: true,
    action: 'record_style_revision_pairs',
    count: items.length,
    items,
  };
}

export async function persistArticleExperienceIfRequested(input: {
  input: Record<string, any>;
  topic: string;
  target: string;
  trace: Record<string, any>;
  quality: Record<string, any>;
  acceptance: Record<string, any>;
  referenceCoverage?: Record<string, any>;
  persisted?: Record<string, any> | null;
  acceptancePersisted?: Record<string, any> | null;
  referenceUsagePersisted?: Record<string, any> | null;
  styleRevisionPairsPersisted?: Record<string, any> | null;
  deps: ArticlePersistenceDeps;
}) {
  const enabled = input.input.recordExperience === true || input.input.recordArticleExperience === true;
  if (!enabled) {
    return null;
  }

  const body = String((input.trace?.workflow?.draft?.body || input.trace?.workflow?.final?.body || '') as string);
  const report = buildArticleExperienceReport({
    topic: input.topic,
    target: input.target,
    trace: input.trace,
    quality: input.quality,
    acceptance: input.acceptance,
    referenceCoverage: input.referenceCoverage,
    persisted: input.persisted,
    acceptancePersisted: input.acceptancePersisted,
    referenceUsagePersisted: input.referenceUsagePersisted,
    styleRevisionPairsPersisted: input.styleRevisionPairsPersisted,
    body,
  });
  const idempotencyKey = String(input.input.experienceIdempotencyKey || '').trim()
    || buildArticleExperienceIdempotencyKey(report);
  const envelope = {
    requestId: `contentbase-article-experience-${Date.now()}`,
    actor: String(input.input.operator || 'contentbase-runtime').trim() || 'contentbase-runtime',
    payload: report,
  };

  if (input.deps.recordExperience) {
    return persistGatewayWrite({
      operation: 'recordExperience',
      write: () => input.deps.recordExperience!({ idempotencyKey, envelope }),
    });
  }

  return persistGatewayWrite({
    operation: 'recordExperience',
    write: () => createDataBaseGatewayClient().recordExperience({
      xDataBaseIdempotencyKey: idempotencyKey,
      gatewayWriteEnvelope: envelope,
    }) as Promise<Record<string, any>>,
  });
}

function buildArticlePersistIdempotencyKey(input: {
  workId: number;
  chapterId?: number;
  chapterNumber: number;
  topic: string;
  target: string;
  body: string;
  status: 'first_draft' | 'polished';
}) {
  // 幂等键只表达“同一篇正文写回”这一稳定 mutation，不把观察结果或临时 trace 混进去。
  const digest = createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 24);
  return `contentbase-article-generation-v2-${input.workId}-${input.chapterNumber}-${input.status}-${digest}`;
}

function buildArticleAcceptanceReportIdempotencyKey(input: {
  version: 'v2';
  workId: number;
  chapterId?: number;
  chapterNumber: number;
  contractId: string;
  passed: boolean;
  violationCount: number;
  reportDigest: string;
}) {
  const digest = createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 24);
  return `contentbase-article-acceptance-v2-${input.workId}-${input.chapterNumber}-${digest}`;
}

function buildArticleReferenceUsageReportIdempotencyKey(input: {
  version: 'v2';
  workId: number;
  chapterId?: number;
  chapterNumber: number;
  topic: string;
  anchorCount: number;
  sectionCount: number;
  reportDigest: string;
}) {
  const digest = createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 24);
  return `contentbase-article-reference-usage-v2-${input.workId}-${input.chapterNumber}-${digest}`;
}

function buildStyleRevisionPairIdempotencyKey(input: {
  topic: string;
  target: string;
  index: number;
  payloadDigest: string;
}): string {
  return `contentbase-style-revision-pair-${digestJson(input)}`;
}

function buildArticleExperienceIdempotencyKey(input: Record<string, any>): string {
  return `contentbase-article-experience-${digestJson(input)}`;
}

function buildArticleExperienceReport(input: {
  topic: string;
  target: string;
  trace: Record<string, any>;
  quality: Record<string, any>;
  acceptance: Record<string, any>;
  referenceCoverage?: Record<string, any>;
  persisted?: Record<string, any> | null;
  acceptancePersisted?: Record<string, any> | null;
  referenceUsagePersisted?: Record<string, any> | null;
  styleRevisionPairsPersisted?: Record<string, any> | null;
  body: string;
}) {
  const workflow = input.trace?.workflow || {};
  const materialPack = workflow.materialPack || {};
  const referenceCoverage = input.referenceCoverage || workflow.draft?.referenceCoverage || {};
  return {
    version: 'article-experience-report.v1',
    topic: input.topic,
    target: input.target,
    runtimeVersion: input.trace?.runtimeVersion || workflow.runtimeVersion || null,
    generationMode: input.trace?.generationMode || workflow.generationMode || null,
    pipeline: input.trace?.pipeline || null,
    bodyChars: input.body.length,
    bodyParagraphs: String(input.body || '').split(/\n{2,}/).filter(Boolean).length,
    passed: Boolean(input.quality?.passed && input.acceptance?.passed),
    qualityPassed: Boolean(input.quality?.passed),
    acceptancePassed: Boolean(input.acceptance?.passed),
    qualityBlockRules: Array.isArray(input.quality?.violations)
      ? input.quality.violations.filter((item: any) => item?.severity === 'block').map((item: any) => String(item.ruleId || 'UNKNOWN')).slice(0, 20)
      : [],
    qualityWarnRules: Array.isArray(input.quality?.violations)
      ? input.quality.violations.filter((item: any) => item?.severity === 'warn').map((item: any) => String(item.ruleId || 'UNKNOWN')).slice(0, 20)
      : [],
    acceptanceRuleIds: Array.isArray(input.acceptance?.violations)
      ? input.acceptance.violations.map((item: any) => String(item.ruleId || 'UNKNOWN')).slice(0, 20)
      : [],
    referenceCoverageScore: Number(referenceCoverage.score || 0),
    referenceCoverageThreshold: Number(referenceCoverage.threshold || 0),
    referenceCoverageParagraphCount: Number(referenceCoverage.paragraphCount || 0),
    materialBackedParagraphCount: Number(referenceCoverage.materialBackedParagraphCount || 0),
    materialFunctionPlanVersion: String(materialPack?.materialFunctionPlan?.version || ''),
    argumentDigestVersion: String(materialPack?.argumentDigest?.version || ''),
    stylePackVersion: String(workflow.writingBrief?.materialPolicy?.stylePackVersion || workflow.writingBrief?.materialPolicy?.stylePack?.version || ''),
    evidenceQuery: String(workflow.writingBrief?.materialPolicy?.evidenceQuery || ''),
    queries: Array.isArray(workflow.materialPack?.evidencePack?.queryRun?.rounds)
      ? workflow.materialPack.evidencePack.queryRun.rounds.length
      : Number(workflow.materialPack?.evidencePack?.counts?.queryRounds || 0),
    sourceCount: Number(workflow.materialPack?.evidencePack?.counts?.sources || 0),
    chunkCount: Number(workflow.materialPack?.evidencePack?.counts?.chunks || 0),
    citationCount: Number(workflow.materialPack?.evidencePack?.counts?.citations || 0),
    memoryItemCount: Number(workflow.materialPack?.memoryItems?.length || 0),
    semanticUnitCount: Number(workflow.materialPack?.semanticUnits?.length || 0),
    literatureItemCount: Number(workflow.materialPack?.literatureItems?.length || 0),
    learningEventCount: Number(workflow.materialPack?.learningEvents?.length || 0),
    writerPromptLength: String(workflow.writingBrief?.writerPrompt || '').length,
    reviewerWarnings: Array.isArray(input.trace?.review?.materialDigestion?.findings)
      ? input.trace.review.materialDigestion.findings.map((item: any) => String(item.ruleId || item.issueType || 'UNKNOWN')).slice(0, 20)
      : [],
    reviewMaterialScreening: input.trace?.review?.materialScreening || {},
    persisted: {
      generationOutput: Boolean(input.persisted),
      acceptanceReport: Boolean(input.acceptancePersisted),
      referenceUsageReport: Boolean(input.referenceUsagePersisted),
      styleRevisionPairs: Boolean(input.styleRevisionPairsPersisted),
    },
    tags: [
      { layer: 'runtime', value: 'article-generation' },
      { layer: 'runtime', value: 'experience-record' },
      { layer: 'quality', value: input.quality?.passed ? 'quality-pass' : 'quality-fail' },
      { layer: 'quality', value: input.acceptance?.passed ? 'acceptance-pass' : 'acceptance-fail' },
    ],
  };
}

function digestJson(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')
    .slice(0, 24);
}

async function persistGatewayWrite(input: {
  operation: 'recordGenerationOutput' | 'recordArticleAcceptanceReport' | 'recordArticleReferenceUsageReport' | 'recordStyleRevisionPair' | 'recordExperience';
  write: () => Promise<Record<string, any>>;
}): Promise<Record<string, any>> {
  try {
    return await input.write();
  } catch (error) {
    if (await isIdempotencyConflict(error)) {
      // 幂等冲突只表示这次 mutation 已经写过，不应该把整条文章生成链打成失败。
      return {
        ok: true,
        conflict: true,
        operation: input.operation,
        error: 'idempotency_conflict',
      };
    }
    throw error;
  }
}

function collectStyleRevisionPairs(input: {
  trace: Record<string, any>;
  finalBody: string;
}): Array<{
  strategy: string;
  ruleId: string;
  severity: string;
  issueType: string;
  paragraphIndex?: number;
  originalText: string;
  revisedText?: string;
  reviewerEvidence: {
    badReason: string;
    rewriteActions: string[];
    forbiddenMoves: string[];
    targetShape: string;
  };
}> {
  const layeredRevision = input.trace.workflow?.generationPolicy?.layeredRevision;
  const issues = Array.isArray(layeredRevision?.plan?.issues) ? layeredRevision.plan.issues : [];
  const revisedParagraphs = splitParagraphs(input.finalBody);
  return issues
    .filter((issue: any) => issue?.category === 'syntax_ai_tone' && issue?.reviewerEvidence)
    .map((issue: any) => {
      const paragraphIndex = Number.isInteger(Number(issue.paragraphIndex)) ? Number(issue.paragraphIndex) : undefined;
      const evidence = issue.reviewerEvidence || {};
      return {
        strategy: String(layeredRevision?.strategy || ''),
        ruleId: String(issue.ruleId || 'ARTICLE-SYNTAX-AI-TONE'),
        severity: normalizeStyleRevisionPairSeverity(issue.severity),
        issueType: String(issue.issueType || 'syntax_ai_tone'),
        paragraphIndex,
        originalText: String(issue.excerpt || '').trim() || String(issue.message || '').trim(),
        revisedText: paragraphIndex == null ? undefined : revisedParagraphs[paragraphIndex],
        reviewerEvidence: {
          badReason: String(evidence.badReason || ''),
          rewriteActions: Array.isArray(evidence.rewriteActions) ? evidence.rewriteActions.map(String).filter(Boolean) : [],
          forbiddenMoves: Array.isArray(evidence.forbiddenMoves) ? evidence.forbiddenMoves.map(String).filter(Boolean) : [],
          targetShape: String(evidence.targetShape || ''),
        },
      };
    })
    .filter((pair) => pair.originalText && pair.reviewerEvidence.badReason);
}

function normalizeStyleRevisionPairSeverity(value: unknown): 'info' | 'warn' | 'block' {
  if (value === 'block') return 'block';
  if (value === 'info') return 'info';
  return 'warn';
}

function splitParagraphs(value: string): string[] {
  return String(value || '')
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function isIdempotencyConflict(error: unknown): Promise<boolean> {
  const message = error instanceof Error ? error.message : String(error || '');
  const response = error && typeof error === 'object' ? (error as Record<string, any>).response : null;
  const status = Number(response?.status || response?.statusCode || 0);
  let payloadText = '';
  try {
    if (response && typeof response.text === 'function') {
      payloadText = String(await response.text().catch(() => ''));
    } else {
      const body = response?.body;
      if (typeof body === 'string') {
        payloadText = body;
      }
    }
  } catch {
    payloadText = '';
  }
  return status === 409
    || /idempotency_conflict/i.test(message)
    || /idempotency conflict/i.test(message)
    || /idempotency_conflict/i.test(payloadText);
}

function buildArticleReferenceUsageSourcePassages(input: {
  sourcePassages: Array<Record<string, any>>;
  anchors: Array<Record<string, any>>;
  sectionPlans: Array<Record<string, any>>;
}) {
  const sourceAnchors = input.anchors.filter((anchor) => String(anchor.source || '') === 'sourcePassage');
  return input.sourcePassages.slice(0, 16).map((item, index) => {
    const sourceId = String(item.sourceId || item.id || item.anchorId || '').trim();
    const title = String(item.title || item.sourceTitle || item.name || item.label || sourceId || `来源${index + 1}`).trim();
    const kind = normalizeSourcePassageKind(item.kind || item.type || item.category || item.sourceType || item.sourceKind);
    const promotedAnchors = sourceAnchors.filter((anchor) => {
      const anchorSourceId = String(anchor.sourceId || '').trim();
      const anchorName = String(anchor.name || '').trim();
      return (sourceId && anchorSourceId === sourceId) || anchorName === title;
    });
    const promotedAnchorNames = uniqueStrings(promotedAnchors.map((anchor) => String(anchor.name || '').trim()).filter(Boolean));
    const sectionTitles = uniqueStrings(input.sectionPlans
      .filter((section) => Array.isArray(section.anchors) && section.anchors.some((anchor: any) => promotedAnchorNames.includes(String(anchor.name || '').trim())))
      .map((section) => String(section.sectionTitle || '').trim())
      .filter(Boolean));
    return {
      ...(sourceId ? { sourceId } : {}),
      title,
      kind,
      ...(String(item.excerpt || item.text || item.summary || '').trim()
        ? { excerpt: String(item.excerpt || item.text || item.summary || '').trim().slice(0, 500) }
        : {}),
      promotedAnchorNames,
      sectionTitles,
    };
  }).filter((item) => item.title);
}

function inferReferenceUsageSource(anchor: Record<string, any>, context: RuntimeArticleContext): string {
  const name = String(anchor.name || '');
  const use = String(anchor.use || '');
  if (context.semantic.units.some((item) => item.sourceTitle === name || item.summary === use || item.excerpt === use)) return 'semanticUnit';
  if (context.memory.items.some((item) => item.title === name || item.summary === use)) return 'storyMemory';
  if (context.literature.items.some((item) => name.includes(item.title))) return 'literature';
  if (context.learning.events.some((event) => event === use)) return 'learningEvent';
  if (String(anchor.source || '').trim() === 'sourcePassage') return 'sourcePassage';
  return 'request';
}

function normalizeReferenceUsageSource(value: unknown): string | null {
  const source = String(value || '').trim();
  if (source === 'database-creative-contract' || source === 'creativeContract') return null;
  if (source === 'context.semantic.units') return 'semanticUnit';
  if (source === 'context.evidence.items') return 'request';
  return [
    'request',
    'semanticUnit',
    'storyMemory',
    'literature',
    'learningEvent',
    'sourcePassage',
  ].includes(source) ? source : null;
}

function isBodyReferenceUsageAnchor(anchor: Record<string, any>): boolean {
  return String(anchor?.source || '').trim() !== 'creativeContract';
}

type SourcePassageMaterialKind = 'document' | 'theory' | 'comparison' | 'observer' | 'literary';

function normalizeSourcePassageKind(value: unknown): SourcePassageMaterialKind {
  const raw = String(value || '').trim().toLowerCase();
  if (
    raw.includes('theory')
    || raw.includes('理论')
    || raw.includes('学说')
    || raw.includes('主义')
    || raw.includes('再生产')
    || raw.includes('新阶级')
    || raw.includes('权力精英')
    || raw.includes('寡头')
    || raw.includes('地租')
    || raw.includes('寻租')
  ) return 'theory';
  if (raw.includes('comparison') || raw.includes('比较') || raw.includes('对照')) return 'comparison';
  if (raw.includes('observer') || raw.includes('观察') || raw.includes('记者') || raw.includes('新闻') || raw.includes('报道') || raw.includes('舆情')) return 'observer';
  if (
    raw.includes('literary')
    || raw.includes('literature')
    || raw.includes('文献')
    || raw.includes('文学')
    || raw.includes('史料')
    || raw.includes('典籍')
    || raw.includes('诗')
    || raw.includes('小说')
    || raw.includes('典故')
  ) return 'literary';
  return 'document';
}

function compactReferenceUsageExcerpt(value: unknown): string | undefined {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > 500 ? `${text.slice(0, 500)}...` : text;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((item) => String(item || '').trim()).filter(Boolean)));
}
