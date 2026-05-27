import { runArticleAcceptance, runCreativeRules } from '@emptyinkpot/database-creative-contracts';
import {
  buildRuntimeArticlePlan,
  calculateArticleReferenceCoverage,
  runArticleAstQualityGate,
  type RuntimeArticleContext,
  type RuntimeArticleGenerationMode,
} from './runtime';
import {
  buildArticleObservationReport,
  type ArticleObservationReport,
} from './observation-report';
import {
  evaluateNarrativePressure,
  type ArticlePressureRuntime,
} from './pressure-runtime';
import { runArticleSyntaxReviewer } from './syntax-reviewer';
import {
  buildRestrictedStyleForegroundGuard,
  detectRestrictedStyleForegroundLeak,
} from './style-profile-guard';
import {
  detectArticleSourceDisplayPhrases,
  detectUnsupportedSceneDetails,
  detectWeakHistoricalAnalogies,
} from './context-engineering';

export function evaluateArticleDraftContract(input: {
  body: string;
  draft: Record<string, any>;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  context: RuntimeArticleContext;
  acceptanceContract?: Record<string, any>;
  sourcePassages: Array<Record<string, any>>;
  materialPack?: Record<string, any>;
  partBodies?: string[];
  factClaims?: Array<Record<string, any> | { text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }>;
  paragraphBlueprint?: Record<string, any>;
  generationMode: RuntimeArticleGenerationMode;
}): ArticleObservationReport {
  const creativeViolations = runCreativeRules({
    text: input.body,
    taskType: 'article_draft',
    narrative: {
      chapterTitle: input.plan.topic,
      chapterSummary: `target=${input.plan.target}`,
    },
    sourcePassages: input.sourcePassages,
  });
  const lexicalUsageViolations = runArticleLexicalUsageGate({
    text: input.body,
    plan: input.plan,
  });
  const plainArticleFormatViolations = runArticlePlainFormatGate(input.body);
  const proseDistributionWarnings = runArticleProseDistributionGate(input.body);
  const completenessViolations = runArticleProseCompletenessGate(input.body);
  const runtimeBoundaryViolations = runArticleRuntimeBoundaryGate(input.body);
  const syntaxViolations = runArticleSyntaxReviewer(input.body);
  const styleProfileViolations = runArticleStyleProfileGate({
    text: input.body,
    context: input.context,
    materialPack: input.materialPack,
  });
  const materialDigestionViolations = runArticleMaterialDigestionGate({
    text: input.body,
    context: input.context,
    sourcePassages: input.sourcePassages,
    materialPack: input.materialPack,
  });
  const pressure = (input.plan as any).pressureRuntime as ArticlePressureRuntime | undefined;
  const pressureRequired = Boolean((input.plan as any).pressureRequired);
  const pressureEvaluation = pressure
    ? evaluateNarrativePressure({
      body: input.body,
      pressure,
    })
    : undefined;
  const draftAst = input.draft.draftAst;
  const astGate = runArticleAstQualityGate({
    ast: draftAst,
    plan: input.plan,
    context: input.context,
  });
  const runtimeViolations = [
    ...creativeViolations,
    ...lexicalUsageViolations,
    ...plainArticleFormatViolations,
    ...proseDistributionWarnings,
    ...completenessViolations,
    ...runtimeBoundaryViolations,
    ...syntaxViolations,
    ...styleProfileViolations,
    ...materialDigestionViolations,
  ];
  const referenceCoverage = calculateArticleReferenceCoverage({
    body: input.body,
    plan: input.plan,
    context: input.context,
  });
  const coverageViolations = input.draft.modelInvocation && referenceCoverage.score < referenceCoverage.threshold
    ? [{
      ruleId: 'ARTICLE-REFERENCE-COVERAGE-001',
      severity: 'block' as const,
      category: 'reference_coverage',
      message: `模型正文引用化用覆盖率不足：${referenceCoverage.score}，需要达到 ${referenceCoverage.threshold}。`,
      fixAction: 'rewrite_with_material_grounding',
      fixInstruction: '让理论、史料、文学、观察材料进入段落判断，不要只写空泛概念。',
      excerpt: input.body.slice(0, 160),
      sourceEvidence: referenceCoverage,
    }]
    : [];
  const proseViolations = [
    ...runtimeViolations,
    ...coverageViolations,
    ...normalizeNarrativePressureViolations(pressureEvaluation?.violations || [], pressureRequired),
  ];
  const quality = {
    passed: proseViolations.filter((item) => item.severity === 'block').length === 0
      && (input.generationMode === 'model' || astGate.passed),
    violations: proseViolations,
    fixPlan: buildRuntimeFixPlan(proseViolations),
    astGate,
  };
  const acceptance = runArticleAcceptance({
    body: input.body,
    partBodies: normalizeArticlePartBodies(input.partBodies),
    contract: input.acceptanceContract,
    factClaims: normalizeArticleFactClaims(input.factClaims),
    sourcePassages: input.sourcePassages,
  });
  const factClaimCoverageViolations = runArticleFactClaimCoverageGate({
    body: input.body,
    factClaims: normalizeArticleFactClaims(input.factClaims),
    acceptanceContract: input.acceptanceContract,
    paragraphBlueprint: input.paragraphBlueprint || (input.draft as any)?.paragraphBlueprint,
  });
  quality.passed = quality.passed && acceptance.passed;
  const violations = [
    ...proseViolations,
    ...(acceptance.violations || []),
    ...factClaimCoverageViolations,
  ];
  const blockers = violations.filter((item: any) => item?.severity === 'block');
  const warnings = violations.filter((item: any) => item?.severity && item.severity !== 'block');
  return buildArticleObservationReport({
    passed: blockers.length === 0,
    blockers,
    warnings,
    violations,
    sourceEvidence: {
      referenceCoverage,
      narrativePressure: pressureEvaluation,
      materialDigestion: {
        violationCount: materialDigestionViolations.length,
        ruleIds: materialDigestionViolations.map((item) => item.ruleId),
      },
      sourcePassageCount: input.sourcePassages.length,
      semanticUnitCount: input.context.semantic.units.length,
      evidenceItemCount: input.context.evidence.items.length,
    },
    draftBody: input.body,
    quality,
    acceptance,
    referenceCoverage,
    narrativePressure: pressureEvaluation,
  });
}

function runArticleFactClaimCoverageGate(input: {
  body: string;
  factClaims?: Array<{ text?: string; atomIds: string[]; inference: boolean; paragraphIndex?: number }>;
  acceptanceContract?: Record<string, any>;
  paragraphBlueprint?: Record<string, any>;
}) {
  const strict = Boolean((input.acceptanceContract?.policy as Record<string, any> | undefined)?.factBoundaryStrict);
  if (!strict) return [];
  const violations: Array<Record<string, any>> = [];
  const body = String(input.body || '');
  const claimText = (input.factClaims || [])
    .map((item) => String(item.text || ''))
    .join('\n');
  const precisionHits = uniqueStrings([
    ...(body.match(/[零一二三四五六七八九十百千万亿两\d]{1,8}(?:点[零一二三四五六七八九十\d]+)?(?:年|月|日|天|小时|分钟|周|桶|吨|艘|条|家|名|人|个|处|份|次|页|成|倍|％|%|公里|海里|美元|欧元|人民币|费率|配额|比例|附加费)/g) || []),
    ...(body.match(/[零一二三四五六七八九十百千万亿两\d]{1,8}分之[零一二三四五六七八九十百千万亿两\d]{1,8}/g) || []),
    ...(body.match(/百分之[零一二三四五六七八九十百千万亿两\d]{1,8}/g) || []),
  ]).filter((term) => !claimText.includes(term));
  if (!precisionHits.length) return [];
  const supportText = [
    ...(Array.isArray((input.acceptanceContract?.policy as Record<string, any> | undefined)?.factBoundaryAtoms)
      ? ((input.acceptanceContract?.policy as Record<string, any>).factBoundaryAtoms as Array<Record<string, any>>)
        .flatMap((item) => [item.value, item.sourceText])
      : []),
  ].map((item) => String(item || '')).join('\n');
  const unsupportedPrecisionHits = precisionHits.filter((term) => !supportText.includes(term));
  if (unsupportedPrecisionHits.length) {
    violations.push({
      ruleId: 'ARTICLE-FACT-CLAIM-COVERAGE-001',
      severity: 'block' as const,
      category: 'fact_boundary',
      message: '正文出现未进入 factClaims 的精确事实，严格事实边界下不得交付。',
      fixAction: 'rewrite_or_bind_fact_claims',
      fixInstruction: '回到 Claim Budget 或 Writer。无法绑定 typed fact atom 的数字、时间、地点和具体动作必须删除，不能由交付清洗泛化。',
      excerpt: unsupportedPrecisionHits.slice(0, 10).join('、'),
      sourceEvidence: {
        uncoveredPrecisionHits: unsupportedPrecisionHits.slice(0, 20),
        claimCount: input.factClaims?.length || 0,
      },
    });
  }
  const paragraphs = Array.isArray(input.paragraphBlueprint?.paragraphs)
    ? input.paragraphBlueprint?.paragraphs as Array<Record<string, any>>
    : [];
  if (paragraphs.length && Array.isArray(input.factClaims)) {
    const requiredAtomViolations = paragraphs.map((paragraph, paragraphIndex) => {
      const requiredAtomIds = Array.isArray(paragraph?.requiredAtomIds)
        ? paragraph.requiredAtomIds.map(String).filter(Boolean)
        : [];
      if (!requiredAtomIds.length) return null;
      const paragraphClaims = input.factClaims!.filter((claim) => Number(claim.paragraphIndex) === paragraphIndex);
      const usedAtomIds = new Set(
        paragraphClaims.flatMap((claim) => Array.isArray(claim.atomIds) ? claim.atomIds.map(String) : []),
      );
      const missingAtomIds = requiredAtomIds.filter((atomId) => !usedAtomIds.has(atomId));
      return missingAtomIds.length
        ? {
          paragraphIndex,
          requiredAtomIds,
          missingAtomIds,
        }
        : null;
    }).filter(Boolean) as Array<Record<string, any>>;
    for (const item of requiredAtomViolations) {
      violations.push({
        ruleId: 'ARTICLE-PARAGRAPH-CLAIM-BUDGET-002',
        severity: 'block' as const,
        category: 'fact_boundary',
        message: '段落没有使用本段必须承接的 Fact Atom。',
        fixAction: 'rewrite_paragraph_with_required_atoms',
        fixInstruction: '回到对应 Paragraph Blueprint 或 Paragraph Writer。每段必须先承接 requiredAtomIds，再展开判断。',
        excerpt: item.missingAtomIds.slice(0, 6).join('、'),
        sourceEvidence: {
          paragraphIndex: item.paragraphIndex,
          requiredAtomIds: item.requiredAtomIds,
          missingAtomIds: item.missingAtomIds,
        },
      });
    }
    const invalidClaims = input.factClaims.map((claim, claimIndex) => {
      if (!Number.isInteger(claim.paragraphIndex)) {
        return claim.atomIds.length > 0
          ? {
            claimIndex,
            text: claim.text,
            paragraphIndex: undefined,
            atomIds: claim.atomIds,
            invalidAtomIds: claim.atomIds,
            allowedAtomIds: [],
            issueType: 'missing_paragraph_index',
          }
          : null;
      }
      const paragraph = paragraphs[Number(claim.paragraphIndex)];
      const allowed = new Set(
        Array.isArray(paragraph?.allowedAtoms)
          ? paragraph.allowedAtoms.map((atom: any) => String(atom.id || '')).filter(Boolean)
          : [],
      );
      const invalidAtomIds = claim.atomIds.filter((atomId) => !allowed.has(String(atomId)));
      return invalidAtomIds.length
        ? {
          claimIndex,
          text: claim.text,
          paragraphIndex: claim.paragraphIndex,
          atomIds: claim.atomIds,
          invalidAtomIds,
          allowedAtomIds: Array.from(allowed),
        }
        : null;
    }).filter(Boolean) as Array<Record<string, any>>;
    if (invalidClaims.length) {
      const grouped = new Map<string, Array<Record<string, any>>>();
      for (const claim of invalidClaims) {
        const key = Number.isInteger(Number(claim.paragraphIndex)) ? String(Number(claim.paragraphIndex)) : 'unknown';
        grouped.set(key, [...(grouped.get(key) || []), claim]);
      }
      for (const [key, claims] of grouped.entries()) {
        const paragraphIndex = key === 'unknown' ? undefined : Number(key);
        violations.push({
          ruleId: 'ARTICLE-PARAGRAPH-CLAIM-BUDGET-001',
          severity: 'block' as const,
          category: 'fact_boundary',
          message: '段落 factClaims 越过本段 Claim Budget。',
          fixAction: 'rewrite_paragraph_with_assigned_atoms',
          fixInstruction: '回到对应 Paragraph Blueprint 或 Paragraph Writer。每段只能使用本段 allowedAtoms 支撑具体事实。',
          excerpt: claims.slice(0, 5).map((item) => item.text || item.atomIds?.join(',')).join('；'),
          sourceEvidence: {
            invalidClaimCount: claims.length,
            paragraphIndex,
            invalidClaims: claims.slice(0, 12),
          },
        });
      }
    }
  }
  return violations;
}

function runArticlePlainFormatGate(text: string) {
  const body = String(text || '');
  const lines = body.split(/\r?\n/);
  const violations: Array<{
    ruleId: string;
    severity: 'block';
    category: string;
    message: string;
    fixAction: string;
    fixInstruction: string;
    excerpt?: string;
  }> = [];
  const headingLine = lines.find((line) => /^\s{0,3}#{1,6}\s+\S/.test(line) || /^第[一二三四五六七八九十0-9]+[章节节部篇][：:、\s]/.test(line.trim()));
  const listLine = lines.find((line) => /^\s*(?:[-*+]\s+|\d+[.)、]\s+|[一二三四五六七八九十]+[、.．]\s*)\S/.test(line));
  const parentheticalNarration = body.match(/[（(][^）)\n]{2,80}[）)]/u)?.[0];
  const markdownMarker = body.match(/(?:^|\n)\s*(?:```|>\s+|\|.+\|)/u)?.[0];

  if (headingLine) {
    violations.push({
      ruleId: 'ARTICLE-PLAIN-FORMAT-001',
      severity: 'block',
      category: 'plain_article_format',
      message: '正文出现小标题或章节标题，不是连续纯文案自然段。',
      fixAction: 'rewrite_as_plain_article',
      fixInstruction: '交给模型重写为连续自然段，不使用标题、小标题、章节名或 Markdown heading。',
      excerpt: headingLine.trim(),
    });
  }

  if (listLine) {
    violations.push({
      ruleId: 'ARTICLE-PLAIN-FORMAT-002',
      severity: 'block',
      category: 'plain_article_format',
      message: '正文出现分点、编号或列表格式。',
      fixAction: 'rewrite_as_plain_article',
      fixInstruction: '交给模型重写为完整连贯文章体，段落内部完成承接和转折，不分点。',
      excerpt: listLine.trim(),
    });
  }

  if (parentheticalNarration) {
    violations.push({
      ruleId: 'ARTICLE-PLAIN-FORMAT-003',
      severity: 'block',
      category: 'plain_article_format',
      message: '正文出现括号旁白或括号补充。',
      fixAction: 'rewrite_parenthetical_narration',
      fixInstruction: '交给模型把括号内容融入自然句，或删除无正文价值的旁白。',
      excerpt: parentheticalNarration,
    });
  }

  if (markdownMarker) {
    violations.push({
      ruleId: 'ARTICLE-PLAIN-FORMAT-004',
      severity: 'block',
      category: 'plain_article_format',
      message: '正文出现 Markdown 表格、引用或代码块标记。',
      fixAction: 'rewrite_as_plain_article',
      fixInstruction: '交给模型重写为纯中文文章正文，不使用 Markdown 结构。',
      excerpt: markdownMarker.trim(),
    });
  }

  return violations;
}

function normalizeArticlePartBodies(values: string[] | undefined): Array<{ id?: string; title?: string; body: string }> | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }
  return values
    .map((body, index) => ({
      id: `part-${index + 1}`,
      body: String(body || ''),
    }))
    .filter((item) => item.body.trim());
}

function normalizeArticleFactClaims(
  values: Array<Record<string, any> | { text?: string; atomIds?: string[]; inference?: boolean }> | undefined,
): Array<{ text?: string; atomIds: string[]; inference: boolean; paragraphIndex?: number }> | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }
  return values.map((item) => ({
    text: item?.text == null ? undefined : String(item.text),
    atomIds: Array.isArray(item?.atomIds) ? item.atomIds.map(String).filter(Boolean) : [],
    inference: Boolean(item?.inference),
    paragraphIndex: Number.isInteger(Number((item as any)?.paragraphIndex)) ? Number((item as any).paragraphIndex) : undefined,
  }));
}

function runArticleLexicalUsageGate(input: {
  text: string;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
}) {
  const text = String(input.text || '');
  const contextualVocabulary = input.plan.narrativeProtocol.lexicalSystem.contextualVocabulary;
  const violations: Array<{
    ruleId: string;
    severity: 'block' | 'warn';
    category: string;
    message: string;
    fixAction: string;
    fixInstruction: string;
    excerpt?: string;
  }> = [];

  for (const item of contextualVocabulary) {
    const patterns = item.misusePatterns.length
      ? item.misusePatterns
      : item.forbiddenContexts.map((context) => `${escapeRegExp(item.term)}.{0,12}${escapeRegExp(context)}|${escapeRegExp(context)}.{0,12}${escapeRegExp(item.term)}`);
    for (const pattern of patterns) {
      const match = findLexicalMisuse(text, pattern);
      if (!match) continue;
      violations.push({
        ruleId: 'ARTICLE-LEXICAL-CONTEXT-001',
        severity: 'block',
        category: 'lexical_context',
        message: `词语「${item.term}」出现语境误用。${item.meaning ? `义项：${item.meaning}。` : ''}`,
        fixAction: 'rewrite_contextual_vocabulary',
        fixInstruction: [
          item.guidance || `按「${item.term}」的语义和语域重写，不要只因词面有历史质感而使用。`,
          item.allowedContexts.length ? `可用语境：${item.allowedContexts.join('、')}。` : '',
          item.forbiddenContexts.length ? `禁用语境：${item.forbiddenContexts.join('、')}。` : '',
        ].filter(Boolean).join(''),
        excerpt: match,
      });
      break;
    }
  }

  const authorModel = input.plan.authorModel;
  for (const term of authorModel.rejectedDiction) {
    if (!term || !text.includes(term)) {
      continue;
    }
    violations.push({
      ruleId: 'ARTICLE-AUTHOR-STYLE-001',
      severity: 'block',
      category: 'author_style',
      message: `正文命中作者模型拒绝词域「${term}」。`,
      fixAction: 'rewrite_rejected_author_diction',
      fixInstruction: `按 DataBase 作者模型重写，移除拒绝词域「${term}」，不得用临时偏好覆盖作者模型。`,
      excerpt: term,
    });
  }

  const authorSignals = uniqueStrings([
    ...authorModel.voice,
    ...authorModel.narrativeTechniques,
  ]).filter((item) => item.length >= 2);
  if (authorModel.required && authorSignals.length > 0 && !authorSignals.some((item) => text.includes(item))) {
    violations.push({
      ruleId: 'ARTICLE-AUTHOR-STYLE-002',
      severity: 'warn',
      category: 'author_style',
      message: '正文未命中作者模型的声音、叙事技法或偏好词域信号。',
      fixAction: 'strengthen_author_model_signal',
      fixInstruction: `至少让一个作者模型信号进入正文的论证或叙事执行：${authorSignals.slice(0, 12).join('、')}。`,
    });
  }

  return violations;
}

function runArticleStyleProfileGate(input: {
  text: string;
  context: RuntimeArticleContext;
  materialPack?: Record<string, any>;
}) {
  const guard = buildRestrictedStyleForegroundGuard({
    stylePack: input.context.stylePack,
    materialPack: input.materialPack,
  });
  const leak = detectRestrictedStyleForegroundLeak(input.text, guard);
  if (!leak) {
    return [];
  }
  return [{
    ruleId: 'ARTICLE-STYLE-PROFILE-001',
    severity: 'block' as const,
    category: 'style_profile',
    message: `正文出现受限风格源题材「${leak}」，风格源只能提供句法节奏，不得进入正文材料或意象。`,
    fixAction: 'remove_restricted_style_foreground',
    fixInstruction: '删除风格源人物、地点、书名和标志性意象，只保留句法、段落推进和抽象节奏。',
    excerpt: leak,
  }];
}

function runArticleRuntimeBoundaryGate(text: string) {
  const forbidden = [
    '材料锚点',
    '验收来源',
    '不复写',
    '结构草稿',
    'DataBase',
    'runtime',
    'smoke',
  ];
  return forbidden
    .filter((term) => text.includes(term))
    .map((term) => ({
      ruleId: 'ARTICLE-RUNTIME-LEAK-001',
      severity: 'block' as const,
      category: 'runtime_boundary',
      message: `正文泄漏 runtime/internal token「${term}」。`,
      fixAction: 'regenerate_with_runtime_terms_hidden',
      fixInstruction: 'Runtime 只返回 evidence；必须由模型根据失败证据重写正文，不能由 runtime 删除或替换泄漏词。',
      excerpt: term,
    }));
}

function runArticleMaterialDigestionGate(input: {
  text: string;
  context: RuntimeArticleContext;
  sourcePassages?: Array<Record<string, any>>;
  materialPack?: Record<string, any>;
}) {
  const body = String(input.text || '');
  const paragraphs = body
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const evidencePack = input.context.evidence.pack && typeof input.context.evidence.pack === 'object'
    ? input.context.evidence.pack as Record<string, any>
    : {};
  const materialFunctionPlan = input.materialPack?.materialFunctionPlan && typeof input.materialPack.materialFunctionPlan === 'object'
    ? input.materialPack.materialFunctionPlan as Record<string, any>
    : null;
  const supportText = buildMaterialSupportText({
    context: input.context,
    sourcePassages: input.sourcePassages || [],
    materialPack: input.materialPack,
  });
  const materialNames = collectMaterialDigestionNames(input.context);
  const sourceTitles = collectEvidencePackSourceTitles(evidencePack);
  const violations: Array<{
    ruleId: string;
    severity: 'block' | 'warn';
    category: string;
    message: string;
    fixAction: string;
    fixInstruction: string;
    sourceEvidence: Record<string, any>;
    excerpt?: string;
  }> = [];

  const sourceDisplayHits = detectArticleSourceDisplayPhrases(body);
  if (sourceDisplayHits.length > 0) {
    violations.push({
      ruleId: 'ARTICLE-SOURCE-DISPLAY-001',
      // 材料炫示属于审稿证据：它提示 WriterAgent 需要重新消化资料，
      // 但不能作为 runtime 硬门禁去驱动正文或触发规则化写作。
      severity: 'warn',
      category: 'material_digestion',
      message: '正文把资料来源或理论来源前景化展示，违背资料沉默规则。',
      fixAction: 'rewrite_with_source_silence',
      fixInstruction: '交给模型重写。资料只能支撑判断，删除某某提醒我们、根据某理论、材料显示、来源指出等来源展示句式。',
      sourceEvidence: {
        hits: sourceDisplayHits.slice(0, 12),
        rule: 'sources support argument silently',
      },
      excerpt: sourceDisplayHits.slice(0, 6).join('、'),
    });
  }

  const unsupportedSceneHits = detectUnsupportedSceneDetails({
    body,
    supportText,
  });
  if (unsupportedSceneHits.length > 0) {
    violations.push({
      ruleId: 'ARTICLE-UNSUPPORTED-SCENE-001',
      // Reality-facing article generation must not ship ungrounded scene details.
      severity: 'block',
      category: 'fact_boundary',
      message: '正文出现材料外现场细节，属于无证扩写。',
      fixAction: 'rewrite_without_unsupported_scene_detail',
      fixInstruction: '交给模型重写。没有证据片段支撑时，不得写档案袋、指印、后台记录、具体滞留天数、补墨、表格缺页、办公室动作等现场细节。',
      sourceEvidence: {
        unsupportedTerms: unsupportedSceneHits.slice(0, 12),
        supportTextLength: supportText.length,
      },
      excerpt: unsupportedSceneHits.slice(0, 8).join('、'),
    });
  }

  const weakAnalogies = detectWeakHistoricalAnalogies({
    body,
    topic: String((input.materialPack?.topic || '') || input.context.evidence.query || ''),
    materialFunctionPlan: materialFunctionPlan as any,
  });
  if (weakAnalogies.length > 0) {
    violations.push({
      ruleId: 'ARTICLE-ANALOGY-RELEVANCE-001',
      // 弱类比是论证质量问题，记录给模型下一轮重写理解，不作为
      // gate-driven generation 的硬阻断。
      severity: 'warn',
      category: 'material_digestion',
      message: '正文使用了未绑定中心判断的历史类比，形成牵强附会。',
      fixAction: 'rewrite_without_weak_analogy',
      fixInstruction: '交给模型重写。历史材料只有证明同一结构关系时才可低调使用，否则应沉默。',
      sourceEvidence: {
        weakAnalogies: weakAnalogies.slice(0, 12),
        allowedAnalogies: Array.isArray((materialFunctionPlan as any)?.items)
          ? (materialFunctionPlan as any).items
            .filter((item: any) => item.function === 'analogy_candidate' && item.bodyUse === 'foreground')
            .map((item: any) => item.title)
          : [],
      },
      excerpt: weakAnalogies.slice(0, 8).join('、'),
    });
  }

  paragraphs.forEach((paragraph, index) => {
    const hits = materialNames.filter((name) => paragraph.includes(name));
    const sourceHits = sourceTitles.filter((name) => paragraph.includes(name));
    const entityHits = collectDenseNamedEntityHits(paragraph);
    if (hits.length >= 5 || sourceHits.length >= 3 || entityHits.length >= 9) {
      violations.push({
        ruleId: 'ARTICLE-MATERIAL-PATCHWORK-001',
        severity: 'block',
        category: 'material_digestion',
        message: '单段材料名词密度过高，正文像资料拼贴而不是围绕一个判断推进。',
        fixAction: 'rewrite_with_argument_digest',
        fixInstruction: '交给模型整段重写。每段只前景化一个主要材料对象或理论锚点，其他材料只做背景牵引。',
        sourceEvidence: {
          paragraphIndex: index,
          materialHits: hits.slice(0, 12),
          sourceHits: sourceHits.slice(0, 8),
          entityHits: entityHits.slice(0, 12),
        },
        excerpt: paragraph.slice(0, 180),
      });
    }
  });

  const allHits = materialNames.filter((name) => body.includes(name));
  const uniqueKindishHits = collectDenseNamedEntityHits(body);
  if (paragraphs.length <= 6 && allHits.length >= 10 && uniqueKindishHits.length >= 18) {
    violations.push({
      ruleId: 'ARTICLE-MATERIAL-OVERLOAD-001',
      severity: 'block',
      category: 'material_digestion',
      message: '全文材料前景化过多，EvidencePack 被当成清单使用。',
      fixAction: 'rewrite_with_argument_digest',
      fixInstruction: '重新生成全文。保留三到五个主锚点，删去不服务中心判断的来源名和旁支类比。',
      sourceEvidence: {
        paragraphCount: paragraphs.length,
        materialHitCount: allHits.length,
        denseEntityCount: uniqueKindishHits.length,
        materialHits: allHits.slice(0, 18),
      },
      excerpt: body.slice(0, 220),
    });
  }

  if (paragraphs.length >= 4 && allHits.length <= 1 && materialNames.length >= 3) {
    violations.push({
      ruleId: 'ARTICLE-ARGUMENT-DIGEST-001',
      severity: 'warn',
      category: 'material_digestion',
      message: '正文几乎没有显式承接资料包主锚点，可能偏离材料消化结果。',
      fixAction: 'strengthen_argument_digest_use',
      fixInstruction: '下一轮写作应让主锚点进入判断关系，但不要把来源名堆成索引。',
      sourceEvidence: {
        materialNameCount: materialNames.length,
        materialHitCount: allHits.length,
      },
    });
  }

  return violations;
}

function buildMaterialSupportText(input: {
  context: RuntimeArticleContext;
  sourcePassages: Array<Record<string, any>>;
  materialPack?: Record<string, any>;
}): string {
  const evidencePack = input.context.evidence.pack && typeof input.context.evidence.pack === 'object'
    ? input.context.evidence.pack as Record<string, any>
    : {};
  const chunks = Array.isArray(evidencePack.chunks) ? evidencePack.chunks : [];
  const citations = Array.isArray(evidencePack.citations) ? evidencePack.citations : [];
  const packChunks = Array.isArray(input.materialPack?.evidencePackChunks) ? input.materialPack?.evidencePackChunks : [];
  const packCitations = Array.isArray(input.materialPack?.evidenceCitations) ? input.materialPack?.evidenceCitations : [];
  return [
    ...input.sourcePassages.flatMap((item) => [item.title, item.excerpt, item.text, item.summary]),
    ...input.context.evidence.items.flatMap((item) => [item.title, item.excerpt]),
    ...input.context.semantic.units.flatMap((item) => [item.sourceTitle, item.summary, item.excerpt]),
    ...input.context.memory.items.flatMap((item) => [item.title, item.summary]),
    ...input.context.literature.items.flatMap((item) => [item.title, item.summary, item.content, item.note]),
    ...chunks.flatMap((item: any) => [item?.title, item?.text, item?.content, item?.excerpt, item?.metadata?.title]),
    ...citations.flatMap((item: any) => [item?.title, item?.excerpt, item?.text]),
    ...packChunks.flatMap((item: any) => [item?.title, item?.text, item?.excerpt]),
    ...packCitations.flatMap((item: any) => [item?.title, item?.excerpt]),
  ].map((item) => String(item || '')).join('\n');
}

function collectMaterialDigestionNames(context: RuntimeArticleContext): string[] {
  const evidencePack = context.evidence.pack && typeof context.evidence.pack === 'object'
    ? context.evidence.pack as Record<string, any>
    : {};
  const chunks = Array.isArray(evidencePack.chunks) ? evidencePack.chunks : [];
  const citations = Array.isArray(evidencePack.citations) ? evidencePack.citations : [];
  return uniqueStrings([
    ...collectEvidencePackSourceTitles(evidencePack),
    ...chunks.flatMap((item: any) => [
      item?.title,
      item?.sourceTitle,
      item?.metadata?.title,
      item?.metadata?.sourceTitle,
    ]),
    ...citations.flatMap((item: any) => [item?.title, item?.sourceTitle]),
    ...context.semantic.units.flatMap((item) => [item.sourceTitle, item.sourceAuthor]),
    ...context.memory.items.map((item) => item.title),
    ...context.literature.items.flatMap((item) => [item.title, item.author]),
  ].map((item) => String(item || '').trim())
    .filter((item) => item.length >= 2 && item.length <= 28)
    .filter((item) => !/^(无|未知|Source|Chunk|Citation|EvidencePack)$/i.test(item)));
}

function collectEvidencePackSourceTitles(pack: Record<string, any>): string[] {
  const sources = Array.isArray(pack.sources) ? pack.sources : [];
  return uniqueStrings(sources
    .flatMap((item: any) => [item?.title, item?.name, item?.sourceTitle])
    .map((item: any) => String(item || '').trim())
    .filter((item: string) => item.length >= 2 && item.length <= 32));
}

function collectDenseNamedEntityHits(text: string): string[] {
  const normalized = String(text || '');
  const titleMarks = normalized.match(/《[^》]{2,24}》/g) || [];
  const properNouns = normalized.match(/[\u4e00-\u9fa5]{2,12}(?:帝国|共和国|王国|文明|军团|元老院|公司|大学|委员会|调查团|宣言|报告|法典|革命|战争|改革|殖民地|行省|港|河|城|府|州|省|铁路|海关|大楼|政府|政权|王朝)/g) || [];
  const latinNames = normalized.match(/[A-Z][A-Za-z][A-Za-z\s.-]{1,30}/g) || [];
  return uniqueStrings([...titleMarks, ...properNouns, ...latinNames].map((item) => item.trim()));
}

function runArticleProseCompletenessGate(text: string) {
  const body = String(text || '').trim();
  const paragraphs = body
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const lines = body
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const compactLength = body.replace(/\s+/g, '').length;
  const sentenceCount = (body.match(/[。！？]/g) || []).length;
  const avgLineLength = lines.length > 0
    ? Math.round(lines.reduce((sum, line) => sum + line.replace(/\s+/g, '').length, 0) / lines.length)
    : 0;
  const shortLineRatio = lines.length > 0
    ? lines.filter((line) => line.replace(/\s+/g, '').length < 32).length / lines.length
    : 0;
  const last = paragraphs[paragraphs.length - 1] || '';
  const violations: Array<{
    ruleId: string;
    severity: 'block';
    category: string;
    message: string;
    fixAction: string;
    fixInstruction: string;
    sourceEvidence: Record<string, any>;
    excerpt?: string;
  }> = [];

  const evidence = {
    compactLength,
    paragraphCount: paragraphs.length,
    lineCount: lines.length,
    sentenceCount,
    avgLineLength,
    shortLineRatio: Math.round(shortLineRatio * 100),
    lastParagraph: last.slice(-160),
  };

  if (compactLength < 1600) {
    violations.push({
      ruleId: 'ARTICLE-PROSE-COMPLETENESS-001',
      severity: 'block',
      category: 'prose_completeness',
      message: `正文长度不足：${compactLength} 字，不能构成完整文章。`,
      fixAction: 'rewrite_as_complete_article',
      fixInstruction: '重写为五到八个自然段的完整文章，每段连续成段，有明确论证推进和结尾收束。',
      sourceEvidence: evidence,
      excerpt: body.slice(0, 160),
    });
  }

  if (paragraphs.length < 5 || paragraphs.length > 9) {
    violations.push({
      ruleId: 'ARTICLE-PROSE-COMPLETENESS-002',
      severity: 'block',
      category: 'prose_completeness',
      message: `自然段数量不合格：${paragraphs.length} 段，需要五到八个完整自然段。`,
      fixAction: 'rewrite_as_complete_article',
      fixInstruction: '重写为五到八个自然段，不使用标题、小标题、列表或一句一行。',
      sourceEvidence: evidence,
    });
  }

  if (lines.length >= 12 && shortLineRatio > 0.45 && avgLineLength < 48) {
    violations.push({
      ruleId: 'ARTICLE-PROSE-COMPLETENESS-003',
      severity: 'block',
      category: 'prose_completeness',
      message: '正文呈现短句碎片或诗行式换行，不是完整文章段落。',
      fixAction: 'rewrite_as_complete_article',
      fixInstruction: '把碎句合并为连续自然段，让句间关系和论证转折在段落内部完成。',
      sourceEvidence: evidence,
    });
  }

  if (
    sentenceCount < 18
    || /(?:什么|为何|如何|是否|重新辨认什么|意味着什么|说明什么|证明什么)[。！？]?$/.test(last)
    || !/[。！？]$/.test(last)
  ) {
    violations.push({
      ruleId: 'ARTICLE-PROSE-COMPLETENESS-004',
      severity: 'block',
      category: 'prose_completeness',
      message: '正文没有完成结尾判断，存在断尾、悬置句或未收束表达。',
      fixAction: 'rewrite_ending_judgment',
      fixInstruction: '重写结尾段，给出完成判断，不把问题悬置在最后一句。',
      sourceEvidence: evidence,
      excerpt: last.slice(-160),
    });
  }

  return violations;
}

function runArticleProseDistributionGate(text: string) {
  const body = String(text || '').trim();
  const sentences = body
    .split(/[。！？]/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const paragraphs = body
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const compactSentences = sentences.map((item) => item.replace(/\s+/g, ''));
  const lengths = compactSentences.map((item) => item.length).filter((item) => item > 0);
  const avg = lengths.length ? lengths.reduce((sum, item) => sum + item, 0) / lengths.length : 0;
  const variance = lengths.length
    ? lengths.reduce((sum, item) => sum + ((item - avg) ** 2), 0) / lengths.length
    : 0;
  const transitionTerms = [
    '值得注意的是',
    '进一步来看',
    '与此同时',
    '此外',
    '总而言之',
    '换言之',
    '某种程度上',
    '从这个意义上说',
    '不难发现',
  ];
  const abstractPhrases = [
    '进行深入',
    '进行系统',
    '进行全面',
    '进行分析',
    '进行探讨',
    '机制',
    '维度',
    '层面',
    '赋能',
    '打造',
    '沉淀',
  ];
  const transitionHits = transitionTerms.flatMap((term) => findAllLiteralHits(body, term));
  const abstractHits = abstractPhrases.flatMap((term) => findAllLiteralHits(body, term));
  const openings = compactSentences.map((item) => item.slice(0, 4)).filter((item) => item.length >= 3);
  const repeatedOpenings = Array.from(new Set(openings.filter((item, index) => openings.indexOf(item) !== index)));
  const warnings: Array<{
    ruleId: string;
    severity: 'warn';
    category: string;
    message: string;
    fixAction: string;
    fixInstruction: string;
    sourceEvidence: Record<string, any>;
    excerpt?: string;
  }> = [];
  const sourceEvidence = {
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    averageSentenceLength: Math.round(avg),
    sentenceLengthVariance: Math.round(variance),
    transitionHitCount: transitionHits.length,
    abstractPhraseHitCount: abstractHits.length,
    repeatedOpenings,
  };

  if (sentences.length >= 12 && variance < 80) {
    warnings.push({
      ruleId: 'ARTICLE-PROSE-DISTRIBUTION-001',
      severity: 'warn',
      category: 'prose_distribution',
      message: '句长分布过于均匀，存在 cadence collapse 风险。',
      fixAction: 'critique_sentence_variance',
      fixInstruction: '作为 critique evidence 交给模型判断是否需要重写节奏，不由 runtime 直接否决正文。',
      sourceEvidence,
    });
  }

  if (transitionHits.length >= 4) {
    warnings.push({
      ruleId: 'ARTICLE-PROSE-DISTRIBUTION-002',
      severity: 'warn',
      category: 'prose_distribution',
      message: `转场套语密度偏高：${transitionHits.length} 处。`,
      fixAction: 'critique_transition_density',
      fixInstruction: '作为 critique evidence 交给模型降低套语密度，不按单词硬阻断。',
      sourceEvidence,
      excerpt: transitionHits.slice(0, 6).join('、'),
    });
  }

  if (abstractHits.length >= 8) {
    warnings.push({
      ruleId: 'ARTICLE-PROSE-DISTRIBUTION-003',
      severity: 'warn',
      category: 'prose_distribution',
      message: `抽象套话密度偏高：${abstractHits.length} 处。`,
      fixAction: 'critique_abstract_density',
      fixInstruction: '作为 critique evidence 交给模型压低抽象空话密度，不按单词硬阻断。',
      sourceEvidence,
      excerpt: abstractHits.slice(0, 8).join('、'),
    });
  }

  if (repeatedOpenings.length >= 3) {
    warnings.push({
      ruleId: 'ARTICLE-PROSE-DISTRIBUTION-004',
      severity: 'warn',
      category: 'prose_distribution',
      message: '句子开头重复模式偏高。',
      fixAction: 'critique_opening_repetition',
      fixInstruction: '作为 critique evidence 交给模型判断是否需要重写句式分布。',
      sourceEvidence,
      excerpt: repeatedOpenings.slice(0, 8).join('、'),
    });
  }

  return warnings;
}

function normalizeNarrativePressureViolations<T extends { severity?: string }>(
  violations: T[],
  required: boolean,
): T[] {
  if (required) return violations;
  return violations.map((item) => (
    item.severity === 'block'
      ? { ...item, severity: 'warn' }
      : item
  ));
}

function findAllLiteralHits(text: string, term: string): string[] {
  const hits: string[] = [];
  if (!term) return hits;
  let index = text.indexOf(term);
  while (index >= 0) {
    hits.push(term);
    index = text.indexOf(term, index + term.length);
  }
  return hits;
}

function findLexicalMisuse(text: string, pattern: string): string | null {
  if (!pattern) return null;
  try {
    const match = text.match(new RegExp(pattern, 'u'));
    return match ? match[0] : null;
  } catch {
    return text.includes(pattern) ? pattern : null;
  }
}

function escapeRegExp(value: string) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((item) => String(item || '').trim()).filter(Boolean)));
}

function buildRuntimeFixPlan(violations: Array<{
  ruleId: string;
  fixAction: string;
  fixInstruction: string;
  excerpt?: string;
}>) {
  const grouped = new Map<string, typeof violations>();
  for (const violation of violations) {
    const current = grouped.get(violation.fixAction) || [];
    current.push(violation);
    grouped.set(violation.fixAction, current);
  }
  return Array.from(grouped.entries()).map(([action, items]) => ({
    action,
    ruleIds: Array.from(new Set(items.map((item) => item.ruleId))),
    instructions: Array.from(new Set(items.map((item) => item.fixInstruction))).slice(0, 6),
    excerpts: items.map((item) => item.excerpt).filter(Boolean).slice(0, 8),
  }));
}
