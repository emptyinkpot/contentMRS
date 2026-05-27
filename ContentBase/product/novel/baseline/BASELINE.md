# Generation Zero Baseline

Frozen: 2026-05-27  
Model: gpt-5.5 via sub2api  
Endpoint: http://127.0.0.1:5101/api/content/runtime/generate/article

## Results

| ID | Topic | Score | Tokens | Time | Chars | Status |
|----|-------|-------|--------|------|-------|--------|
| T01 | 权力如何为空间命名 | 89 | 93,093 | 206s | 2,994 | PASS |
| T02 | 夏目漱石《心》 | 90 | 90,012 | 220s | 2,688 | PASS |
| T03 | 茶与禅 | 90 | 71,167 | 225s | 2,240 | PASS |
| T04 | 鲁迅铁屋子 | 92 | 73,775 | 153s | 2,597 | PASS |
| T05 | 博尔赫斯无限图书馆 | 85 | 52,601 | 291s | 2,981 | PASS |
| T06 | 源氏物语时间感 | - | - | 236s | - | FAIL 524 |
| T07 | 卡夫卡官僚机器 | 89 | 86,304 | 218s | 3,556 | PASS |
| T08 | 杜甫饥饿书写 | 92 | 81,019 | 212s | 2,748 | PASS |
| T09 | 本雅明灵韵 | 91 | 81,474 | 219s | 3,045 | PASS |
| T10 | 沈从文湘西 | - | - | - | - | FAIL 524 |

## Aggregates (8 successful)

- Average score: 90/100
- Average prompt tokens: 78,681
- Average generation time: 218s
- Average body chars: 2,856
- Success rate: 8/10 (80%)
- Quality pass rate: 8/8 (100% of successful)

## Failure Analysis

T06 and T10 hit Cloudflare HTTP 524 (upstream timeout >100s at CDN layer). Both likely have large corpus packs pushing generation time past the CDN threshold. M3 reranking (cutting prompt tokens ≥20%) should bring these within budget.

## Scorecard Metrics

Six deterministic dimensions, no LLM-as-judge:
1. charCount — total CJK character count
2. paragraphCount — structural segmentation
3. avgParagraphLength — prose density
4. uniqueCharRatio — vocabulary richness
5. sentenceVariance — rhythm diversity (CV of sentence lengths)
6. concreteNounDensity — imagery concreteness

## Usage

```bash
# Re-run baseline
node product/novel/baseline/baseline-run.mjs

# Score a single article
node -e "import {scoreArticle} from './product/novel/baseline/quality-scorecard.mjs'; ..."

# Compare two scorecards
node product/novel/baseline/quality-diff.mjs before.jsonl after.jsonl
```
