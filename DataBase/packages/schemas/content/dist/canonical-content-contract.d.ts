import { z } from "zod";
export declare const ContentWorkKindSchema: z.ZodEnum<{
    novel: "novel";
    fiction_series: "fiction_series";
    blog_post: "blog_post";
    essay: "essay";
    current_affairs_commentary: "current_affairs_commentary";
    historical_short_video: "historical_short_video";
    business_copywriting: "business_copywriting";
    comic_series: "comic_series";
    comic_one_shot: "comic_one_shot";
    image_collection: "image_collection";
    manuscript: "manuscript";
}>;
export type ContentWorkKind = z.infer<typeof ContentWorkKindSchema>;
export declare const ContentPartKindSchema: z.ZodEnum<{
    volume: "volume";
    chapter: "chapter";
    scene: "scene";
    article_section: "article_section";
    script_segment: "script_segment";
    comic_episode: "comic_episode";
    comic_page_ref: "comic_page_ref";
    appendix: "appendix";
}>;
export type ContentPartKind = z.infer<typeof ContentPartKindSchema>;
export declare const ContentBlockKindSchema: z.ZodEnum<{
    paragraph: "paragraph";
    heading: "heading";
    quote: "quote";
    image: "image";
    comic_panel: "comic_panel";
    dialogue: "dialogue";
    caption: "caption";
    page_break: "page_break";
    evidence_citation: "evidence_citation";
    semantic_unit_ref: "semantic_unit_ref";
    prompt_context: "prompt_context";
}>;
export type ContentBlockKind = z.infer<typeof ContentBlockKindSchema>;
export declare const ContentAssetKindSchema: z.ZodEnum<{
    cover_image: "cover_image";
    comic_page: "comic_page";
    panel_crop: "panel_crop";
    reference_image: "reference_image";
    audio: "audio";
    video: "video";
    pdf: "pdf";
    markdown_export: "markdown_export";
    epub_export: "epub_export";
}>;
export type ContentAssetKind = z.infer<typeof ContentAssetKindSchema>;
export declare const ContentStatusSchema: z.ZodEnum<{
    draft: "draft";
    active: "active";
    reviewing: "reviewing";
    ready: "ready";
    published: "published";
    retired: "retired";
}>;
export type ContentStatus = z.infer<typeof ContentStatusSchema>;
export declare const AuthorLexiconDecisionSchema: z.ZodEnum<{
    candidate: "candidate";
    approved_preferred: "approved_preferred";
    approved_banned: "approved_banned";
    rejected: "rejected";
}>;
export type AuthorLexiconDecision = z.infer<typeof AuthorLexiconDecisionSchema>;
export declare const ContentWorkSchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodEnum<{
        novel: "novel";
        fiction_series: "fiction_series";
        blog_post: "blog_post";
        essay: "essay";
        current_affairs_commentary: "current_affairs_commentary";
        historical_short_video: "historical_short_video";
        business_copywriting: "business_copywriting";
        comic_series: "comic_series";
        comic_one_shot: "comic_one_shot";
        image_collection: "image_collection";
        manuscript: "manuscript";
    }>;
    title: z.ZodString;
    subtitle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodEnum<{
        draft: "draft";
        active: "active";
        reviewing: "reviewing";
        ready: "ready";
        published: "published";
        retired: "retired";
    }>;
    authorProfileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type ContentWork = z.infer<typeof ContentWorkSchema>;
export declare const ContentPartSchema: z.ZodObject<{
    id: z.ZodString;
    workId: z.ZodString;
    parentPartId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    kind: z.ZodEnum<{
        volume: "volume";
        chapter: "chapter";
        scene: "scene";
        article_section: "article_section";
        script_segment: "script_segment";
        comic_episode: "comic_episode";
        comic_page_ref: "comic_page_ref";
        appendix: "appendix";
    }>;
    partOrder: z.ZodNumber;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodEnum<{
        draft: "draft";
        active: "active";
        reviewing: "reviewing";
        ready: "ready";
        published: "published";
        retired: "retired";
    }>;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type ContentPart = z.infer<typeof ContentPartSchema>;
export declare const ContentBlockSchema: z.ZodObject<{
    id: z.ZodString;
    workId: z.ZodString;
    partId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    kind: z.ZodEnum<{
        paragraph: "paragraph";
        heading: "heading";
        quote: "quote";
        image: "image";
        comic_panel: "comic_panel";
        dialogue: "dialogue";
        caption: "caption";
        page_break: "page_break";
        evidence_citation: "evidence_citation";
        semantic_unit_ref: "semantic_unit_ref";
        prompt_context: "prompt_context";
    }>;
    blockOrder: z.ZodNumber;
    textContent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type ContentBlock = z.infer<typeof ContentBlockSchema>;
export declare const ContentAssetSchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodEnum<{
        cover_image: "cover_image";
        comic_page: "comic_page";
        panel_crop: "panel_crop";
        reference_image: "reference_image";
        audio: "audio";
        video: "video";
        pdf: "pdf";
        markdown_export: "markdown_export";
        epub_export: "epub_export";
    }>;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    storageProvider: z.ZodString;
    storageUri: z.ZodString;
    mimeType: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    byteSize: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    checksumSha256: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type ContentAsset = z.infer<typeof ContentAssetSchema>;
export declare const AuthorProfileSchema: z.ZodObject<{
    id: z.ZodString;
    displayName: z.ZodString;
    stance: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    voice: z.ZodArray<z.ZodString>;
    status: z.ZodEnum<{
        active: "active";
        retired: "retired";
    }>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type AuthorProfile = z.infer<typeof AuthorProfileSchema>;
export declare const AuthorInterestClusterSchema: z.ZodObject<{
    id: z.ZodString;
    authorProfileId: z.ZodString;
    name: z.ZodString;
    terms: z.ZodArray<z.ZodString>;
    appliesTo: z.ZodArray<z.ZodEnum<{
        novel: "novel";
        fiction_series: "fiction_series";
        blog_post: "blog_post";
        essay: "essay";
        current_affairs_commentary: "current_affairs_commentary";
        historical_short_video: "historical_short_video";
        business_copywriting: "business_copywriting";
        comic_series: "comic_series";
        comic_one_shot: "comic_one_shot";
        image_collection: "image_collection";
        manuscript: "manuscript";
    }>>;
    evidence: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    status: z.ZodEnum<{
        active: "active";
        retired: "retired";
        candidate: "candidate";
    }>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type AuthorInterestCluster = z.infer<typeof AuthorInterestClusterSchema>;
export declare const AuthorLexiconReviewSchema: z.ZodObject<{
    id: z.ZodString;
    authorProfileId: z.ZodString;
    term: z.ZodString;
    decision: z.ZodEnum<{
        candidate: "candidate";
        approved_preferred: "approved_preferred";
        approved_banned: "approved_banned";
        rejected: "rejected";
    }>;
    sourceKind: z.ZodString;
    sourceRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reason: z.ZodString;
    createdAt: z.ZodString;
}, z.core.$strip>;
export type AuthorLexiconReview = z.infer<typeof AuthorLexiconReviewSchema>;
export declare const PublicationTargetSchema: z.ZodObject<{
    id: z.ZodString;
    platform: z.ZodString;
    accountIdentity: z.ZodString;
    localWorkId: z.ZodString;
    remoteWorkId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodEnum<{
        active: "active";
        retired: "retired";
        paused: "paused";
    }>;
    metadata: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type PublicationTarget = z.infer<typeof PublicationTargetSchema>;
export declare const PublicationRecordSchema: z.ZodObject<{
    id: z.ZodString;
    targetId: z.ZodString;
    contentPartId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    action: z.ZodString;
    remotePartId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    observedStatus: z.ZodString;
    idempotencyKey: z.ZodString;
    result: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodString;
}, z.core.$strip>;
export type PublicationRecord = z.infer<typeof PublicationRecordSchema>;
export declare const EvidenceFactAtomTypeSchema: z.ZodEnum<{
    date: "date";
    person: "person";
    organization: "organization";
    location: "location";
    amount: "amount";
    artifact: "artifact";
    event: "event";
    relationship: "relationship";
    legal_status: "legal_status";
    theory_claim: "theory_claim";
    source_anchor: "source_anchor";
}>;
export type EvidenceFactAtomType = z.infer<typeof EvidenceFactAtomTypeSchema>;
export declare const EvidenceFactAtomSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<{
        date: "date";
        person: "person";
        organization: "organization";
        location: "location";
        amount: "amount";
        artifact: "artifact";
        event: "event";
        relationship: "relationship";
        legal_status: "legal_status";
        theory_claim: "theory_claim";
        source_anchor: "source_anchor";
    }>;
    value: z.ZodString;
    sourceId: z.ZodString;
    sourceText: z.ZodOptional<z.ZodString>;
    citationId: z.ZodOptional<z.ZodString>;
    blockId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type EvidenceFactAtom = z.infer<typeof EvidenceFactAtomSchema>;
export declare const EvidenceFactAtomPackSchema: z.ZodObject<{
    workId: z.ZodOptional<z.ZodString>;
    partId: z.ZodString;
    atoms: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            date: "date";
            person: "person";
            organization: "organization";
            location: "location";
            amount: "amount";
            artifact: "artifact";
            event: "event";
            relationship: "relationship";
            legal_status: "legal_status";
            theory_claim: "theory_claim";
            source_anchor: "source_anchor";
        }>;
        value: z.ZodString;
        sourceId: z.ZodString;
        sourceText: z.ZodOptional<z.ZodString>;
        citationId: z.ZodOptional<z.ZodString>;
        blockId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    sourceBlockIds: z.ZodArray<z.ZodString>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type EvidenceFactAtomPack = z.infer<typeof EvidenceFactAtomPackSchema>;
export declare const EvidenceSourceSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    sourceType: z.ZodString;
    sourceTable: z.ZodOptional<z.ZodString>;
    sourceId: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    externalRefs: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;
export declare const ContentSourceSummarySchema: z.ZodObject<{
    id: z.ZodString;
    sourceId: z.ZodString;
    title: z.ZodString;
    kind: z.ZodString;
    author: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sourceTable: z.ZodOptional<z.ZodString>;
    chunkCount: z.ZodNumber;
    semanticUnitCount: z.ZodNumber;
    preview: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    updatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type ContentSourceSummary = z.infer<typeof ContentSourceSummarySchema>;
export declare const ContentSourcesResponseSchema: z.ZodObject<{
    version: z.ZodLiteral<"content-sources.v1">;
    count: z.ZodNumber;
    sources: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceId: z.ZodString;
        title: z.ZodString;
        kind: z.ZodString;
        author: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sourceTable: z.ZodOptional<z.ZodString>;
        chunkCount: z.ZodNumber;
        semanticUnitCount: z.ZodNumber;
        preview: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        createdAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        updatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type ContentSourcesResponse = z.infer<typeof ContentSourcesResponseSchema>;
export declare const EvidenceChunkSchema: z.ZodObject<{
    id: z.ZodString;
    sourceId: z.ZodString;
    chunkIndex: z.ZodNumber;
    text: z.ZodString;
    privacyLevel: z.ZodString;
    relevanceScore: z.ZodOptional<z.ZodNumber>;
    location: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type EvidenceChunk = z.infer<typeof EvidenceChunkSchema>;
export declare const EvidenceCitationSchema: z.ZodObject<{
    id: z.ZodString;
    sourceId: z.ZodString;
    chunkId: z.ZodString;
    title: z.ZodString;
    excerpt: z.ZodString;
    locator: z.ZodOptional<z.ZodString>;
    relevanceScore: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type EvidenceCitation = z.infer<typeof EvidenceCitationSchema>;
export declare const EvidencePackSchema: z.ZodObject<{
    version: z.ZodLiteral<"evidence-pack.v1">;
    query: z.ZodString;
    mode: z.ZodEnum<{
        keyword_projection: "keyword_projection";
        multi_query_projection: "multi_query_projection";
        web_projection: "web_projection";
        mixed_projection: "mixed_projection";
        vector_primary_projection: "vector_primary_projection";
        author_hybrid_projection: "author_hybrid_projection";
        empty_query: "empty_query";
    }>;
    queryRun: z.ZodObject<{
        id: z.ZodString;
        provider: z.ZodString;
        status: z.ZodLiteral<"read_projection">;
        rounds: z.ZodDefault<z.ZodArray<z.ZodObject<{
            query: z.ZodString;
            tokenCount: z.ZodNumber;
            resultCount: z.ZodNumber;
            provider: z.ZodString;
            sourceFilterCount: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
    sources: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        sourceType: z.ZodString;
        sourceTable: z.ZodOptional<z.ZodString>;
        sourceId: z.ZodOptional<z.ZodString>;
        source: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        externalRefs: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>;
    chunks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceId: z.ZodString;
        chunkIndex: z.ZodNumber;
        text: z.ZodString;
        privacyLevel: z.ZodString;
        relevanceScore: z.ZodOptional<z.ZodNumber>;
        location: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>;
    citations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sourceId: z.ZodString;
        chunkId: z.ZodString;
        title: z.ZodString;
        excerpt: z.ZodString;
        locator: z.ZodOptional<z.ZodString>;
        relevanceScore: z.ZodOptional<z.ZodNumber>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>>;
    constraints: z.ZodArray<z.ZodString>;
    counts: z.ZodObject<{
        sources: z.ZodNumber;
        chunks: z.ZodNumber;
        citations: z.ZodNumber;
        webSources: z.ZodOptional<z.ZodNumber>;
        queryRounds: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    screening: z.ZodOptional<z.ZodObject<{
        version: z.ZodLiteral<"evidence-screening.v1">;
        requestedLimit: z.ZodNumber;
        queryCount: z.ZodNumber;
        sourceFilterIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
        selectedChunkCount: z.ZodNumber;
        selectedCitationCount: z.ZodNumber;
        sourceDiversityCount: z.ZodNumber;
        droppedDuplicateChunkCount: z.ZodNumber;
        rankingSignals: z.ZodArray<z.ZodString>;
        rejected: z.ZodOptional<z.ZodArray<z.ZodObject<{
            chunkId: z.ZodString;
            reason: z.ZodEnum<{
                off_topic: "off_topic";
                duplicate: "duplicate";
                low_relevance: "low_relevance";
                exclude_query: "exclude_query";
            }>;
            detail: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        excludeQueriesApplied: z.ZodOptional<z.ZodArray<z.ZodString>>;
        centralClaim: z.ZodOptional<z.ZodString>;
        fusion: z.ZodOptional<z.ZodObject<{
            vectorWeight: z.ZodNumber;
            ragflowRetrievalWeight: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        }, z.core.$strip>>;
        latentRerank: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodBoolean;
            applied: z.ZodBoolean;
            modelVersion: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            warning: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            generationControl: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                styleWeight: z.ZodNumber;
                factWeight: z.ZodNumber;
                modelVersion: z.ZodOptional<z.ZodString>;
                reason: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type EvidencePack = z.infer<typeof EvidencePackSchema>;
export declare const RecordGenerationOutputResultSchema: z.ZodObject<{
    workId: z.ZodNumber;
    chapterId: z.ZodNumber;
    chapterNumber: z.ZodNumber;
    partId: z.ZodString;
    blockId: z.ZodString;
    status: z.ZodString;
    canonicalStatus: z.ZodEnum<{
        draft: "draft";
        active: "active";
        reviewing: "reviewing";
        ready: "ready";
        published: "published";
        retired: "retired";
    }>;
    wordCount: z.ZodNumber;
}, z.core.$strip>;
export type RecordGenerationOutputResult = z.infer<typeof RecordGenerationOutputResultSchema>;
export declare const RecordGenerationOutputMutationResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    action: z.ZodLiteral<"record_generation_output">;
    idempotencyKey: z.ZodString;
    actor: z.ZodString;
    result: z.ZodObject<{
        affectedRows: z.ZodNumber;
        insertId: z.ZodNumber;
        warningStatus: z.ZodNumber;
    }, z.core.$strip>;
    item: z.ZodObject<{
        workId: z.ZodNumber;
        chapterId: z.ZodNumber;
        chapterNumber: z.ZodNumber;
        partId: z.ZodString;
        blockId: z.ZodString;
        status: z.ZodString;
        canonicalStatus: z.ZodEnum<{
            draft: "draft";
            active: "active";
            reviewing: "reviewing";
            ready: "ready";
            published: "published";
            retired: "retired";
        }>;
        wordCount: z.ZodNumber;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type RecordGenerationOutputMutationResponse = z.infer<typeof RecordGenerationOutputMutationResponseSchema>;
export declare const RecordGenerationOutputPayloadSchema: z.ZodObject<{
    workId: z.ZodNumber;
    chapterId: z.ZodOptional<z.ZodNumber>;
    chapterNumber: z.ZodNumber;
    title: z.ZodOptional<z.ZodString>;
    body: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<{
        first_draft: "first_draft";
        polished: "polished";
    }>>;
    operator: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type RecordGenerationOutputPayload = z.infer<typeof RecordGenerationOutputPayloadSchema>;
export declare const ChapterStatusSchema: z.ZodEnum<{
    published: "published";
    first_draft: "first_draft";
    polished: "polished";
    outline: "outline";
    audited: "audited";
    published_unconfirmed: "published_unconfirmed";
}>;
export type ChapterStatus = z.infer<typeof ChapterStatusSchema>;
export declare const ChapterTransitionReasonSchema: z.ZodEnum<{
    published: "published";
    published_unconfirmed: "published_unconfirmed";
    content_generated: "content_generated";
    content_polished: "content_polished";
    audit_passed: "audit_passed";
    audit_failed: "audit_failed";
    publish_submitted: "publish_submitted";
    publish_confirmed: "publish_confirmed";
    content_cleared: "content_cleared";
    manual_adjustment: "manual_adjustment";
    system_migration: "system_migration";
}>;
export type ChapterTransitionReason = z.infer<typeof ChapterTransitionReasonSchema>;
export declare const RecordChapterTransitionResultSchema: z.ZodObject<{
    chapterId: z.ZodNumber;
    workId: z.ZodNumber;
    chapterNumber: z.ZodNumber;
    fromState: z.ZodEnum<{
        published: "published";
        first_draft: "first_draft";
        polished: "polished";
        outline: "outline";
        audited: "audited";
        published_unconfirmed: "published_unconfirmed";
    }>;
    toState: z.ZodEnum<{
        published: "published";
        first_draft: "first_draft";
        polished: "polished";
        outline: "outline";
        audited: "audited";
        published_unconfirmed: "published_unconfirmed";
    }>;
    reason: z.ZodEnum<{
        published: "published";
        published_unconfirmed: "published_unconfirmed";
        content_generated: "content_generated";
        content_polished: "content_polished";
        audit_passed: "audit_passed";
        audit_failed: "audit_failed";
        publish_submitted: "publish_submitted";
        publish_confirmed: "publish_confirmed";
        content_cleared: "content_cleared";
        manual_adjustment: "manual_adjustment";
        system_migration: "system_migration";
    }>;
    logged: z.ZodBoolean;
}, z.core.$strip>;
export type RecordChapterTransitionResult = z.infer<typeof RecordChapterTransitionResultSchema>;
export declare const RecordChapterTransitionMutationResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    action: z.ZodLiteral<"record_chapter_transition">;
    idempotencyKey: z.ZodString;
    actor: z.ZodString;
    result: z.ZodObject<{
        affectedRows: z.ZodNumber;
        insertId: z.ZodNumber;
        warningStatus: z.ZodNumber;
    }, z.core.$strip>;
    item: z.ZodObject<{
        chapterId: z.ZodNumber;
        workId: z.ZodNumber;
        chapterNumber: z.ZodNumber;
        fromState: z.ZodEnum<{
            published: "published";
            first_draft: "first_draft";
            polished: "polished";
            outline: "outline";
            audited: "audited";
            published_unconfirmed: "published_unconfirmed";
        }>;
        toState: z.ZodEnum<{
            published: "published";
            first_draft: "first_draft";
            polished: "polished";
            outline: "outline";
            audited: "audited";
            published_unconfirmed: "published_unconfirmed";
        }>;
        reason: z.ZodEnum<{
            published: "published";
            published_unconfirmed: "published_unconfirmed";
            content_generated: "content_generated";
            content_polished: "content_polished";
            audit_passed: "audit_passed";
            audit_failed: "audit_failed";
            publish_submitted: "publish_submitted";
            publish_confirmed: "publish_confirmed";
            content_cleared: "content_cleared";
            manual_adjustment: "manual_adjustment";
            system_migration: "system_migration";
        }>;
        logged: z.ZodBoolean;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type RecordChapterTransitionMutationResponse = z.infer<typeof RecordChapterTransitionMutationResponseSchema>;
export declare const RecordChapterTransitionPayloadSchema: z.ZodObject<{
    chapterId: z.ZodNumber;
    fromState: z.ZodEnum<{
        published: "published";
        first_draft: "first_draft";
        polished: "polished";
        outline: "outline";
        audited: "audited";
        published_unconfirmed: "published_unconfirmed";
    }>;
    toState: z.ZodEnum<{
        published: "published";
        first_draft: "first_draft";
        polished: "polished";
        outline: "outline";
        audited: "audited";
        published_unconfirmed: "published_unconfirmed";
    }>;
    reason: z.ZodEnum<{
        published: "published";
        published_unconfirmed: "published_unconfirmed";
        content_generated: "content_generated";
        content_polished: "content_polished";
        audit_passed: "audit_passed";
        audit_failed: "audit_failed";
        publish_submitted: "publish_submitted";
        publish_confirmed: "publish_confirmed";
        content_cleared: "content_cleared";
        manual_adjustment: "manual_adjustment";
        system_migration: "system_migration";
    }>;
    operator: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    logTransition: z.ZodDefault<z.ZodBoolean>;
    sealAuditPassed: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type RecordChapterTransitionPayload = z.infer<typeof RecordChapterTransitionPayloadSchema>;
export declare const PublicationResultActionSchema: z.ZodEnum<{
    publish_chapter: "publish_chapter";
    edit_chapter: "edit_chapter";
}>;
export type PublicationResultAction = z.infer<typeof PublicationResultActionSchema>;
export declare const PublicationObservedStatusSchema: z.ZodEnum<{
    published: "published";
    submitted: "submitted";
    edited: "edited";
    failed: "failed";
}>;
export type PublicationObservedStatus = z.infer<typeof PublicationObservedStatusSchema>;
export declare const RecordPublicationResultPayloadSchema: z.ZodObject<{
    targetId: z.ZodOptional<z.ZodString>;
    platform: z.ZodDefault<z.ZodLiteral<"fanqie">>;
    accountId: z.ZodString;
    bookId: z.ZodString;
    localWorkId: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    chapterId: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
    chapterNumber: z.ZodNumber;
    contentPartId: z.ZodOptional<z.ZodString>;
    action: z.ZodEnum<{
        publish_chapter: "publish_chapter";
        edit_chapter: "edit_chapter";
    }>;
    remotePartId: z.ZodOptional<z.ZodString>;
    observedStatus: z.ZodEnum<{
        published: "published";
        submitted: "submitted";
        edited: "edited";
        failed: "failed";
    }>;
    publishedAt: z.ZodOptional<z.ZodString>;
    result: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type RecordPublicationResultPayload = z.infer<typeof RecordPublicationResultPayloadSchema>;
export declare const RecordPublicationResultResultSchema: z.ZodObject<{
    recordId: z.ZodString;
    targetId: z.ZodString;
    contentPartId: z.ZodNullable<z.ZodString>;
    chapterId: z.ZodNullable<z.ZodNumber>;
    chapterNumber: z.ZodNumber;
    action: z.ZodEnum<{
        publish_chapter: "publish_chapter";
        edit_chapter: "edit_chapter";
    }>;
    remotePartId: z.ZodNullable<z.ZodString>;
    observedStatus: z.ZodEnum<{
        published: "published";
        submitted: "submitted";
        edited: "edited";
        failed: "failed";
    }>;
    chapterStatus: z.ZodNullable<z.ZodEnum<{
        published: "published";
        first_draft: "first_draft";
        polished: "polished";
        outline: "outline";
        audited: "audited";
        published_unconfirmed: "published_unconfirmed";
    }>>;
    contentPartStatus: z.ZodNullable<z.ZodEnum<{
        draft: "draft";
        active: "active";
        reviewing: "reviewing";
        ready: "ready";
        published: "published";
        retired: "retired";
    }>>;
}, z.core.$strip>;
export type RecordPublicationResultResult = z.infer<typeof RecordPublicationResultResultSchema>;
export declare const RecordPublicationResultMutationResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    action: z.ZodLiteral<"publication_record_result">;
    idempotencyKey: z.ZodString;
    actor: z.ZodString;
    result: z.ZodObject<{
        affectedRows: z.ZodNumber;
        insertId: z.ZodNumber;
        warningStatus: z.ZodNumber;
    }, z.core.$strip>;
    item: z.ZodObject<{
        recordId: z.ZodString;
        targetId: z.ZodString;
        contentPartId: z.ZodNullable<z.ZodString>;
        chapterId: z.ZodNullable<z.ZodNumber>;
        chapterNumber: z.ZodNumber;
        action: z.ZodEnum<{
            publish_chapter: "publish_chapter";
            edit_chapter: "edit_chapter";
        }>;
        remotePartId: z.ZodNullable<z.ZodString>;
        observedStatus: z.ZodEnum<{
            published: "published";
            submitted: "submitted";
            edited: "edited";
            failed: "failed";
        }>;
        chapterStatus: z.ZodNullable<z.ZodEnum<{
            published: "published";
            first_draft: "first_draft";
            polished: "polished";
            outline: "outline";
            audited: "audited";
            published_unconfirmed: "published_unconfirmed";
        }>>;
        contentPartStatus: z.ZodNullable<z.ZodEnum<{
            draft: "draft";
            active: "active";
            reviewing: "reviewing";
            ready: "ready";
            published: "published";
            retired: "retired";
        }>>;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type RecordPublicationResultMutationResponse = z.infer<typeof RecordPublicationResultMutationResponseSchema>;
export declare const AuditStatusSchema: z.ZodEnum<{
    reviewing: "reviewing";
    failed: "failed";
    pending: "pending";
    passed: "passed";
}>;
export type AuditStatus = z.infer<typeof AuditStatusSchema>;
export declare const SuggestedActionSchema: z.ZodEnum<{
    auto_fix: "auto_fix";
    rewrite: "rewrite";
    manual: "manual";
    none: "none";
}>;
export type SuggestedAction = z.infer<typeof SuggestedActionSchema>;
export declare const AuditIssueSchema: z.ZodObject<{
    type: z.ZodString;
    message: z.ZodString;
    severity: z.ZodEnum<{
        error: "error";
        warning: "warning";
        info: "info";
    }>;
    position: z.ZodOptional<z.ZodObject<{
        line: z.ZodOptional<z.ZodNumber>;
        column: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type AuditIssue = z.infer<typeof AuditIssueSchema>;
export declare const RecordAuditResultResultSchema: z.ZodObject<{
    workId: z.ZodNumber;
    chapterId: z.ZodNumber;
    chapterNumber: z.ZodNumber;
    auditStatus: z.ZodEnum<{
        reviewing: "reviewing";
        failed: "failed";
        pending: "pending";
        passed: "passed";
    }>;
    suggestedAction: z.ZodEnum<{
        auto_fix: "auto_fix";
        rewrite: "rewrite";
        manual: "manual";
        none: "none";
    }>;
    issueCount: z.ZodNumber;
}, z.core.$strip>;
export type RecordAuditResultResult = z.infer<typeof RecordAuditResultResultSchema>;
export declare const RecordAuditResultMutationResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    action: z.ZodLiteral<"record_audit_result">;
    idempotencyKey: z.ZodString;
    actor: z.ZodString;
    result: z.ZodObject<{
        affectedRows: z.ZodNumber;
        insertId: z.ZodNumber;
        warningStatus: z.ZodNumber;
    }, z.core.$strip>;
    item: z.ZodObject<{
        workId: z.ZodNumber;
        chapterId: z.ZodNumber;
        chapterNumber: z.ZodNumber;
        auditStatus: z.ZodEnum<{
            reviewing: "reviewing";
            failed: "failed";
            pending: "pending";
            passed: "passed";
        }>;
        suggestedAction: z.ZodEnum<{
            auto_fix: "auto_fix";
            rewrite: "rewrite";
            manual: "manual";
            none: "none";
        }>;
        issueCount: z.ZodNumber;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type RecordAuditResultMutationResponse = z.infer<typeof RecordAuditResultMutationResponseSchema>;
export declare const RecordAuditResultPayloadSchema: z.ZodObject<{
    workId: z.ZodNumber;
    chapterNumber: z.ZodNumber;
    auditStatus: z.ZodEnum<{
        reviewing: "reviewing";
        failed: "failed";
        pending: "pending";
        passed: "passed";
    }>;
    auditIssues: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        message: z.ZodString;
        severity: z.ZodEnum<{
            error: "error";
            warning: "warning";
            info: "info";
        }>;
        position: z.ZodOptional<z.ZodObject<{
            line: z.ZodOptional<z.ZodNumber>;
            column: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    suggestedAction: z.ZodEnum<{
        auto_fix: "auto_fix";
        rewrite: "rewrite";
        manual: "manual";
        none: "none";
    }>;
    operator: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type RecordAuditResultPayload = z.infer<typeof RecordAuditResultPayloadSchema>;
export declare const ReplaceWorkStructureResultSchema: z.ZodObject<{
    workId: z.ZodNumber;
    volumes: z.ZodNumber;
    chapterOutlines: z.ZodNumber;
    characters: z.ZodNumber;
    worldSettings: z.ZodNumber;
    storyEvents: z.ZodNumber;
    characterGrowth: z.ZodNumber;
    importantItems: z.ZodNumber;
}, z.core.$strip>;
export type ReplaceWorkStructureResult = z.infer<typeof ReplaceWorkStructureResultSchema>;
export declare const ReplaceWorkStructureMutationResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    action: z.ZodLiteral<"replace_work_structure">;
    idempotencyKey: z.ZodString;
    actor: z.ZodString;
    result: z.ZodObject<{
        affectedRows: z.ZodNumber;
        insertId: z.ZodNumber;
        warningStatus: z.ZodNumber;
    }, z.core.$strip>;
    item: z.ZodObject<{
        workId: z.ZodNumber;
        volumes: z.ZodNumber;
        chapterOutlines: z.ZodNumber;
        characters: z.ZodNumber;
        worldSettings: z.ZodNumber;
        storyEvents: z.ZodNumber;
        characterGrowth: z.ZodNumber;
        importantItems: z.ZodNumber;
    }, z.core.$strip>;
    requestId: z.ZodString;
}, z.core.$strip>;
export type ReplaceWorkStructureMutationResponse = z.infer<typeof ReplaceWorkStructureMutationResponseSchema>;
export declare const PublicProjectionPostSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    date: z.ZodString;
    slug: z.ZodString;
    summary: z.ZodString;
    tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
    categories: z.ZodDefault<z.ZodArray<z.ZodString>>;
    series: z.ZodOptional<z.ZodString>;
    featured: z.ZodDefault<z.ZodBoolean>;
    draft: z.ZodDefault<z.ZodBoolean>;
    toc: z.ZodDefault<z.ZodBoolean>;
    body: z.ZodString;
    source: z.ZodObject<{
        system: z.ZodLiteral<"contentbase">;
        capabilityId: z.ZodString;
        runtimeVersion: z.ZodString;
        jobId: z.ZodOptional<z.ZodString>;
        workId: z.ZodOptional<z.ZodNumber>;
        chapterId: z.ZodOptional<z.ZodNumber>;
        chapterNumber: z.ZodOptional<z.ZodNumber>;
        generatedAt: z.ZodString;
    }, z.core.$strip>;
    trace: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type PublicProjectionPost = z.infer<typeof PublicProjectionPostSchema>;
export declare const PublicProjectionManifestSchema: z.ZodObject<{
    version: z.ZodLiteral<"public-projection.v1">;
    target: z.ZodLiteral<"myblog">;
    generatedAt: z.ZodString;
    posts: z.ZodArray<z.ZodObject<{
        slug: z.ZodString;
        title: z.ZodString;
        file: z.ZodString;
        source: z.ZodObject<{
            system: z.ZodLiteral<"contentbase">;
            capabilityId: z.ZodString;
            runtimeVersion: z.ZodString;
            jobId: z.ZodOptional<z.ZodString>;
            workId: z.ZodOptional<z.ZodNumber>;
            chapterId: z.ZodOptional<z.ZodNumber>;
            chapterNumber: z.ZodOptional<z.ZodNumber>;
            generatedAt: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PublicProjectionManifest = z.infer<typeof PublicProjectionManifestSchema>;
export declare function parsePublicProjectionPost(value: unknown): PublicProjectionPost;
export declare function parsePublicProjectionManifest(value: unknown): PublicProjectionManifest;
export declare function parseContentWork(value: unknown): ContentWork;
export declare function parsePublicationRecord(value: unknown): PublicationRecord;
