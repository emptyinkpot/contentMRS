#!/usr/bin/env python3
"""Build canonical negative rows for generic AI surface syntax.

These rows are not book-derived. They are explicit contrast samples for the
reranker/reviewer to push down platform-style connective tissue, canned
balanced argument templates, and generic policy-report prose.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Dict, Iterable, List


SOURCE_ID = "ai_surface_pathology"


TOPICS = [
    "伊朗封锁海峡 当代危机 史论散文",
    "电影评论 文学感受 现实判断",
    "国际局势 能源贸易 制度压力",
    "城市 记忆 现代生活 批判散文",
    "历史兴亡 文学意象 当代事实",
]


PATHOLOGY_TEXTS = [
    "这件事不是单一国家行为，而是多重因素共同作用的结果。首先，地区安全局势本身具有高度复杂性；其次，能源市场和国际航运也会受到结构性影响；最后，各方需要通过对话与合作寻求解决方案。总的来说，这一事件具有重要意义，值得我们持续关注。",
    "从本质上看，问题并不是海峡是否被封锁，而是国际秩序、能源安全和地区治理之间的复杂互动。它既反映了地缘政治的深层矛盾，也体现出现代全球化体系的脆弱性。因此，我们必须以更加系统、全面和辩证的视角来理解这一现象。",
    "影片的意义不只在于情节本身，更在于它所折射出的社会现实。一方面，人物命运体现了时代变迁；另一方面，导演通过细腻镜头呈现了复杂的人性。可以说，这部作品在艺术表达和现实关怀之间达成了某种平衡。",
    "历史从来不是简单重复，而是在不同阶段呈现出新的结构性特征。面对这种现象，我们既要看到表层事件，也要看到背后的制度逻辑、文化心理和经济基础。唯有如此，才能真正把握其深层意义。",
    "在全球化背景下，任何局部冲突都可能产生连锁反应。它不仅影响相关国家，也会影响国际社会的稳定与发展。对于普通人来说，这提醒我们要增强风险意识，并以理性、客观、全面的态度看待问题。",
    "这不是一次孤立事件，而是长期矛盾积累后的集中爆发。其背后既有历史原因，也有现实因素；既有外部压力，也有内部诉求。综合来看，这一事件说明世界正处于深刻变化之中。",
    "如果说过去的问题主要体现为资源竞争，那么今天的问题则更多体现为制度、认同和话语权的竞争。这种变化不是偶然的，而是时代发展的必然结果。我们应该从更高层面进行思考。",
    "文章需要从多个维度展开分析。第一，事件本身具有复杂性。第二，相关主体的利益诉求并不一致。第三，未来走势仍存在不确定性。基于以上几点，可以得出结论：局势仍需进一步观察。",
    "这种现象具有一定代表性。它说明现代社会已经进入一个更加复杂的阶段，传统解释框架难以完全覆盖现实变化。因此，我们既不能简单乐观，也不能过度悲观，而应保持审慎态度。",
    "这一问题的核心不在于某个具体选择，而在于背后的结构性困境。换言之，它是经济、政治、文化、技术等多种因素共同作用的结果。只有建立长效机制，才能从根本上解决问题。",
    "从个人层面看，这是一种情绪；从社会层面看，这是一种症候；从历史层面看，这是一种趋势。三者相互交织，共同构成了今天我们所看到的复杂图景。",
    "作品通过对人物命运的描写，展现了时代背景下个体的迷茫与挣扎。这种表达不仅增强了文本的感染力，也深化了作品的思想内涵，使读者能够产生更强烈的共鸣。",
    "我们不能仅仅停留在表面现象，而要深入分析其深层原因。只有这样，才能避免片面化和情绪化的判断，并形成更加客观、理性、全面的认识。",
    "这件事给我们的启示是，面对复杂问题，必须坚持系统思维和底线思维，既要看到风险挑战，也要看到发展机遇，在变化中把握主动。",
    "无论从历史维度还是现实维度来看，这一现象都具有重要研究价值。它不仅关乎当下，也关乎未来；不仅关乎局部，也关乎整体。",
    "在我看来，真正值得讨论的不是事件本身，而是事件背后所反映出的深层逻辑。这种逻辑既具有现实意义，也具有理论价值，值得进一步深入研究。",
    "随着时代的发展，人们对于这一问题的理解也在不断变化。过去的经验固然重要，但面对新的环境，我们需要新的思路、新的方法和新的表达。",
    "可以说，这是一场关于秩序、利益和价值的综合博弈。其影响并不会在短期内结束，而会在更长时间内持续发酵，并对相关领域产生深远影响。",
    "本文试图从历史背景、现实原因、主要影响和未来趋势四个方面进行分析。通过梳理可以发现，该问题具有复杂性、长期性和不确定性。",
    "这并非简单的是非问题，而是需要放在更广阔的历史和现实坐标中加以理解。只有如此，我们才能避免陷入情绪化判断，进而获得更深刻的认识。",
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--target-count", type=int, default=240)
    args = parser.parse_args()

    rows = list(build_rows(max(1, args.target_count)))
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

    summary = {
        "version": "ai-syntax-negatives.v1",
        "sourceId": SOURCE_ID,
        "output": str(output.resolve()),
        "rows": len(rows),
        "labelCounts": {"0": len(rows)},
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def build_rows(target_count: int) -> Iterable[Dict]:
    serial = 0
    for text_index, text in enumerate(PATHOLOGY_TEXTS):
        topic = TOPICS[serial % len(TOPICS)]
        serial += 1
        yield build_row(text_index, topic, text)
    while serial < target_count:
        topic = TOPICS[serial % len(TOPICS)]
        subject = SUBJECTS[serial % len(SUBJECTS)]
        frame = FRAMES[(serial // len(SUBJECTS)) % len(FRAMES)]
        text = frame.format(subject=subject)
        yield build_row(serial, topic, text)
        serial += 1


SUBJECTS = [
    "伊朗封锁霍尔木兹海峡",
    "一部当代电影的社会争议",
    "能源价格的突然波动",
    "青年在城市里的焦虑",
    "历史叙述中的帝国兴衰",
    "平台舆论对公共事件的包装",
    "战争阴影下的贸易路线",
    "文学作品中的人物困境",
]


FRAMES = [
    "{subject}不是简单的单一事件，而是多重因素共同作用的复杂结果。首先，它涉及现实利益；其次，它折射深层结构；最后，它也提醒我们要以理性、客观、全面的态度加以看待。因此，这一问题具有重要意义。",
    "从宏观层面看，{subject}体现了时代发展的复杂性和不确定性；从微观层面看，它又影响具体个体的选择与感受。二者相互交织，构成了值得深入研究的现实图景。",
    "面对{subject}，我们既不能简单否定，也不能盲目肯定，而应坚持辩证思维。只有从历史背景、现实条件和未来趋势三个方面综合分析，才能形成比较完整的认识。",
    "{subject}的背后，是制度逻辑、文化心理和利益格局的共同作用。这种作用并非一朝一夕形成，而是在长期发展中逐渐积累，最终表现为今天的复杂局面。",
    "本文认为，{subject}具有三方面启示：一是要重视风险意识，二是要完善治理机制，三是要推动多方合作。只有这样，才能更好应对未来挑战。",
    "如果说{subject}呈现的是表层冲突，那么其深层则是现代社会结构转型中的必然矛盾。它既有历史根源，也有现实原因，更有未来发展的不确定性。",
    "{subject}不仅是一个现实问题，也是一个理论问题。它要求我们在分析时避免片面化、情绪化和简单化，从而获得更加客观、全面、深入的判断。",
    "总体来看，{subject}说明当代世界已经进入更加复杂的阶段。传统经验仍有参考价值，但仅靠过去的经验已经不足以解释新的变化，因此需要更新分析框架。",
]


def build_row(index: int, topic: str, text: str) -> Dict:
    return {
        "sampleId": sha256(f"{SOURCE_ID}:{index}:{topic}:{text}"),
        "sourceFile": "training/latent-mvp/build_ai_syntax_negatives.py",
        "sourceId": SOURCE_ID,
        "topic": topic,
        "profile": "ai_surface_pathology",
        "provider": "local.synthetic_pathology",
        "taskKind": "ai_surface_pathology_negative",
        "text": text,
        "features": {
            "vectorSimilarity": 0.02,
            "fusedRelevance": 2,
            "relevanceScore": 2,
            "qualityBlockCount": 3,
            "referenceCoverageScore": 0,
            "aiFlavorSignal": 1,
            "surfacePathologySignal": 1,
        },
        "label": 0,
    }


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    main()
