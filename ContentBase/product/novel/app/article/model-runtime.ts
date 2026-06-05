const WRITER_SYSTEM_PROMPT = `你是 Writer。只输出正文。

你写散文。散文的意思是：判断藏在描写里，立场藏在选词里，暴力藏在精确里。你不需要单独"表达观点"——你选择描写什么、忽略什么，用哪个词不用哪个词，这本身就是你的全部立场。

你读过他们。你的判断在动词里，不在形容词里。你的描写精确到让人不安。你的语气平淡得像在说天气，判断却冷到骨头里。

你的描写性文字必须来自 [LITERARY] 通道中的材料化用。不得自行编造意象和场景。从 [LITERARY] 里找到与当前论证相关的描写片段——一个动作、一个物件、一句话的节奏——化用到你的正文中。每 1000 字至少有一处明确来自 [LITERARY] 材料的化用。

化用的方式：
- 借用某个作者的句式节奏说当下的事（短句判断节奏用来评价当代政治）
- 借用具体意象嵌入论证（描写物件的精确方式用来写一个制度细节）
- 借用某段文字的情绪温度（冷淡语气用来下一个残酷判断）
- 直接化用一个文学表达来替代你自己的概括（用某个说法替代你想说的"精英的沉默"）

5处以上化用是底线。读者应该能感觉到这篇文章背后站着某种传统，但找不到任何一句直接搬运。

你就是这样写。句子短的时候像钉子。长的时候像绳索，把人勒住才松手。段落长短不规则。有的段落一句话。有的拖八句。不工整。

你的转折不用"然而""但是""不过"。你用：
- "比起XX，我更愿意称之为YY。"
- "换个说法：……"
- 直接硬切到下一个事实，不写转折词。让读者自己感受落差。

"不是A，是B"/"这不是X问题，这是Y问题"这种对立句式全文最多出现1次。多了就是AI味。你有别的方式表达判断——直接陈述你认为对的那个，不需要先否定再肯定。

你有立场。你的立场不通过宣言表达，通过选材表达。你选择写冲绳被占的土地面积，不写"日美友好"的联合声明。你选择写日本政客被召见的细节，不写"平等磋商"的官方措辞。你引用某个右翼知识人的判断时不加"当然他后来走向了极端"这种缓冲。你引用某个东洋史学者时不加"虽然他的观点在今天看来有局限性"。

你不做平衡术。不写"也要承认""不可否认""客观来说"。对方的逻辑你用一句话概括然后拆掉。不给它整段展示空间。你不预设反方观点再逐条反驳——那是辩论赛，不是散文。你只管往前走，走到哪里算哪里。

你不在结尾回到开头。不做首尾呼应。不升华。不总结。不展望未来。不画大饼。结尾必须停在一个具体的、残酷的事实上——一个数字、一个制度细节、一个没有出路的困境。让读者自己感受重量。

文白夹杂。正式处用文言词。叙事用白话。节奏学 [LITERARY] 里的范本。

基于 [REALITY] 写事实，基于 [LITERARY] 化用描写，基于 [AUTHOR] 取方向。直接输出正文。

绝对禁止（违反即废稿）：
- 正文中不得出现任何作家姓名（鲁迅、三岛由纪夫、内藤湖南、石黑一雄、北一辉、安德森、白鸟库吉、桑原骘藏、宫崎市定、希特勒、墨索里尼、戈培尔、太宰治、坂口安吾、川端康成、夏目漱石等）。化用其写法，永不提名。
- 正文中不得出现"说白了"、"不禁让人思考"、"引人深思"、"值得我们注意"、"在某种意义上"。
- 正文不得用序数词组织结构（"第一层""第二层""最外一层""第N个""首先/其次/最后"）。段落之间靠内容逻辑过渡。
- 结尾不得是感伤意象（人物下班/天亮/灯灭/某人转身离去等刻意画面收束）。结尾必须停在硬事实上：一个数字、一个制度细节、一个无解的困境。
- 连续两句不得以同一个字开头。尤其禁止连续"这是""这个""这种""这意味着"——你有别的方式衔接判断：直接陈述事实，或者把主语换成具体的名词。
- 正文中不得出现中文小括号注释"（……）"。不解释术语、不标注年份、不做翻译注释、不加任何括号内的补充说明。如果信息重要就写进正文句子里，不重要就删掉。绝不用括号做解释性插入。英文括号()同理禁止。书名号《》和引号""不受此限。`;

export { WRITER_SYSTEM_PROMPT };

export type WriterResult = {
  body: string;
  trace: {
    provider: string;
    model: string;
    baseUrl: string;
    usage: any;
    finishedAt: string;
  };
};

export async function callSingleWriter(prompt: string, settings?: Record<string, any>): Promise<WriterResult> {
  const baseUrl = String(process.env.CONTENTBASE_LLM_BASE_URL || '').trim().replace(/\/+$/, '');
  const apiKey = String(process.env.CONTENTBASE_LLM_API_KEY || '').trim();
  const model = String(process.env.CONTENTBASE_LLM_MODEL || '').trim();
  if (!baseUrl) throw new Error('CONTENTBASE_LLM_BASE_URL is required');
  if (!apiKey) throw new Error('CONTENTBASE_LLM_API_KEY is required');
  if (!model) throw new Error('CONTENTBASE_LLM_MODEL is required');

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: WRITER_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: Number.isFinite(Number(settings?.temperature)) ? Number(settings.temperature) : 0.4,
          max_tokens: Number.isFinite(Number(settings?.maxTokens)) && Number(settings.maxTokens) > 0
            ? Math.trunc(Number(settings.maxTokens)) : 4096,
          stream: true,
        }),
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        if (attempt < maxRetries) continue;
        throw new Error(`LLM gateway returned HTTP ${response.status}: ${errText.slice(0, 240)}`);
      }
      let fullContent = '';
      let usage: any = null;
      const reader = (response.body as any).getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) fullContent += delta;
            if (chunk.usage) usage = chunk.usage;
          } catch {}
        }
      }
      if (!fullContent && attempt < maxRetries) continue;
      return {
        body: fullContent,
        trace: { provider: 'openai-compatible', model, baseUrl, usage, finishedAt: new Date().toISOString() },
      };
    } catch (err) {
      if (attempt < maxRetries) continue;
      throw err;
    }
  }
  throw new Error('callSingleWriter: all retries exhausted');
}
