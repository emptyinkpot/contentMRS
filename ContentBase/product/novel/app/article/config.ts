export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4.1': 1000000,
  'gpt-4.1-mini': 1000000,
  'gpt-4.1-nano': 1000000,
  'gpt-5.5': 200000,
  'claude-sonnet-4-6': 200000,
  'claude-sonnet-4-5-20250514': 200000,
  'claude-opus-4-7': 200000,
  'deepseek-chat': 64000,
  'deepseek-reasoner': 64000,
};

export const DEFAULT_MODEL_CONTEXT_WINDOW = 128000;
export const CONTEXT_UTILIZATION_RATIO = 0.25;
export const SYSTEM_PROMPT_RESERVE = 3000;
export const OUTPUT_TOKEN_RESERVE = 8000;
export const DEFAULT_CONTEXT_TOKEN_BUDGET = 57000;
export const DEFAULT_CONTEXT_CHAR_BUDGET = 50000;
export const DEFAULT_REALITY_LIMIT = 160;
export const DEFAULT_DURABLE_LIMIT = 50;
export const DEFAULT_EVIDENCE_TIMEOUT_MS = 240000;

export const RAGFLOW_DATASETS = {
  literaryCorpus: 'bdcc99c658f111f18aecb3d695a2553d',
  essay: 'eb927cf6550211f1b2958f4a76330bcc',
  film: 'eb7df254550211f1b2958f4a76330bcc',
  xingwang: 'eb8a1250550211f1b2958f4a76330bcc',
} as const;

export type Genre = 'historical_commentary' | 'reality_commentary' | 'narrative' | 'essay';

export type RetrievalLimits = {
  reality: number;
  semantic: number;
  lexicon: number;
  literary: number;
  structure: number;
};

export const GENRE_RAGFLOW_DATASETS: Record<Genre, string[]> = {
  historical_commentary: [RAGFLOW_DATASETS.literaryCorpus, RAGFLOW_DATASETS.essay],
  reality_commentary:    [RAGFLOW_DATASETS.literaryCorpus, RAGFLOW_DATASETS.essay],
  narrative:             [RAGFLOW_DATASETS.literaryCorpus, RAGFLOW_DATASETS.film],
  essay:                 [RAGFLOW_DATASETS.literaryCorpus, RAGFLOW_DATASETS.essay],
};

export const GENRE_RETRIEVAL_LIMITS: Record<Genre, RetrievalLimits> = {
  historical_commentary: { reality: 80,  semantic: 30, lexicon: 40, literary: 20, structure: 20 },
  reality_commentary:    { reality: 160, semantic: 20, lexicon: 50, literary: 10, structure: 15 },
  narrative:             { reality: 40,  semantic: 30, lexicon: 40, literary: 30, structure: 25 },
  essay:                 { reality: 100, semantic: 30, lexicon: 50, literary: 20, structure: 20 },
};

export const GENRE_BUDGETS: Record<Genre, Record<string, number>> = {
  historical_commentary: { reality: 35, literary: 25, semantic: 10, lexicon: 12, structure: 8, author: 10 },
  reality_commentary:    { reality: 40, literary: 20, semantic: 10, lexicon: 12, structure: 8, author: 10 },
  narrative:             { reality: 20, literary: 30, semantic: 15, lexicon: 12, structure: 13, author: 10 },
  essay:                 { reality: 35, literary: 25, semantic: 10, lexicon: 12, structure: 8, author: 10 },
};

// Layer 2 体裁范本检索: 按写作体裁(非主题)调取风格范本。Literary 教"怎么写"不教"写什么"。
export const GENRE_STYLE_QUERIES: Record<Genre, string[]> = {
  historical_commentary: ['史论 制度 冷峻判断', '历史叙事 细节 克制'],
  reality_commentary:    ['时评 锐利 短句', '现实批评 反讽 节制'],
  narrative:             ['叙事 场景 感官细节', '人物 动作 白描'],
  essay:                 ['散文 节奏 意象', '随笔 沉思 转折'],
};

export const CHANNEL_MIN_ITEMS: Record<string, number> = {
  reality: 3,
  literary: 3,
  semantic: 2,
  lexicon: 5,
  structure: 2,
  author: 2,
};

export const RERANKER = {
  DASHSCOPE_EMBEDDING_MODEL: 'text-embedding-v3',
  BATCH_SIZE: 25,
  MAX_TEXT_CHARS: 2048,
  DEFAULT_KEEP_RATIO: 0.65,
  TIMEOUT_MS: 30_000,
  DEFAULT_TOPIC_WEIGHT: 0.6,
  DEFAULT_AUTHOR_WEIGHT: 0.4,
  REALITY_SIMILARITY_MIN: 0.35,
} as const;

export const BANNED_TRANSITIONS = [
  '此外，', '与此同时，', '不仅如此，', '更为重要的是，', '值得注意的是，',
  '尽管如此，', '不可否认的是，', '总而言之，', '综上所述，', '归根结底，',
  '正因如此，', '尤为重要的是，', '需要指出的是，', '需要强调的是，',
  '在此基础上，', '毋庸置疑，', '不言而喻，', '由此可见，',
  '具体而言，', '换言之，', '事实上，', '客观来说，',
  '不可否认，', '尤其值得关注的是，', '不容忽视的是，',
  '说白了，', '说白了。', '不禁让人思考', '引人深思',
  '值得我们注意', '在某种意义上', '在一定程度上', '从某种角度来看',
] as const;

export const TURN_WORDS = ['然而，', '但是，', '不过，', '尽管如此，', '与此同时，'] as const;

export const WRITER_NAMES_TO_STRIP = [
  '鲁迅', '三岛由纪夫', '三岛', '内藤湖南', '石黑一雄', '北一辉', '安德森',
  '白鸟库吉', '桑原骘藏', '宫崎市定', '希特勒', '墨索里尼', '戈培尔',
  '太宰治', '坂口安吾', '川端康成', '夏目漱石',
  '鲍鹏山', '余英时', '钱穆',
] as const;

export const DEFAULT_STYLE_QUERIES = [
  '鲁迅 杂文 短判断',
  '三岛由纪夫 金阁寺 描写',
  '内藤湖南 东洋史 概论',
  '石黑一雄 日の名残り 叙述',
  '北一辉 日本改造法案 政治判断',
  '安德森 想象的共同体 分析',
  '白鸟库吉 东洋史 解释',
  '桑原骘藏 东洋史 短评',
  '宫崎市定 大唐帝国 历史散文',
  '太宰治 人间失格 独白',
  '坂口安吾 堕落论 随笔',
  '川端康成 雪国 描写',
  '夏目漱石 心 叙述',
  '讲谈社 兴亡的世界史 历史叙述',
  '岩波书店 日本近代史 分析',
  '余英时 中国文化 学术散文',
] as const;

export const RANDOM_DISCOVERY_SEEDS = [
  '散文 节奏', '历史 判断', '制度 描写', '冷淡 精确', '短句 力量',
] as const;
