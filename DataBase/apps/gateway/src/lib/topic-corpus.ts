import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface TopicCorpusEntry {
  label?: string;
  defaultSourceIds?: string[];
  forbiddenSourceIds?: string[];
  defaultRounds?: number;
  defaultLimit?: number;
  suggestIncludeWeb?: boolean;
  pressureTransitions?: string[];
  /** JSON tag names on vocabulary.rows; empty = no whitelist */
  allowedLexiconTags?: string[];
  /** vocabulary/banned rows carrying any of these tags are excluded from style-contract projection */
  forbiddenLexiconTags?: string[];
  defaultStyleSourceIds?: string[];
  /** creative protocol id when client omits styleProfileId */
  defaultStyleProfileId?: string;
  narrativePerspectiveMode?: string;
}

export interface TopicCorpusFile {
  version?: string;
  topics?: Record<string, TopicCorpusEntry>;
}

const corpusPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../config/topic-corpus.json"
);

let cached: TopicCorpusFile | null = null;

export function loadTopicCorpus(): TopicCorpusFile {
  if (cached) return cached;
  try {
    cached = JSON.parse(readFileSync(corpusPath, "utf8")) as TopicCorpusFile;
  } catch {
    cached = { version: "topic-corpus.v1", topics: {} };
  }
  return cached;
}

export function getTopicEntry(topicId: string): TopicCorpusEntry | undefined {
  const id = String(topicId || "").trim();
  if (!id) return undefined;
  const corpus = loadTopicCorpus();
  return corpus.topics?.[id];
}

export function listTopicEntries(): Array<{ id: string; entry: TopicCorpusEntry }> {
  const corpus = loadTopicCorpus();
  const topics = corpus.topics || {};
  return Object.entries(topics).map(([id, entry]) => ({ id, entry }));
}
