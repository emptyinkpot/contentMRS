import { BANNED_TRANSITIONS, TURN_WORDS, WRITER_NAMES_TO_STRIP } from './config';

export function removeAITransitions(text: string): string {
  let result = text;
  for (const word of BANNED_TRANSITIONS) result = result.replaceAll(word, '');
  return result;
}

export function limitBuShiPattern(text: string, max = 2): string {
  let result = text;
  const pattern = /[。\n]([^。\n]*不是[^。\n]*[，,][^。\n]*是[^。\n]*[。])/g;
  const matches = [...result.matchAll(pattern)];
  if (matches.length > max) {
    for (let i = matches.length - 1; i >= max; i--) {
      const original = matches[i][1];
      const rewritten = original.replace(/不是[^，,]*[，,]\s*/, '').replace(/^是/, '');
      result = result.replace(original, rewritten);
    }
  }
  return result;
}

export function removeTurnWords(text: string): string {
  let result = text;
  for (const word of TURN_WORDS) result = result.replaceAll(word, '');
  return result;
}

export function breakUniformParagraphs(text: string): string {
  const paragraphs = text.split('\n\n');
  const avgLen = paragraphs.reduce((s, p) => s + p.length, 0) / paragraphs.length;
  const rebuilt: string[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (p.length > avgLen * 0.8 && p.length < avgLen * 1.2 && i % 4 === 2) {
      const sentences = p.split(/(?<=[。！？])/);
      if (sentences.length >= 4) {
        const mid = Math.floor(sentences.length / 3);
        rebuilt.push(sentences.slice(0, mid).join(''));
        rebuilt.push(sentences.slice(mid).join(''));
        continue;
      }
    }
    rebuilt.push(p);
  }
  return rebuilt.join('\n\n');
}

export function removeSummaryParagraphs(text: string): string {
  return text.replace(/\n\n[^\n]*(?:综上|总之|总而言之|归根结底)[^\n]*(?:\n|$)/g, '\n\n');
}

export function stripWriterNames(text: string): string {
  let result = text;
  let hits = 0;
  for (const name of WRITER_NAMES_TO_STRIP) {
    const pattern = new RegExp(name, 'g');
    const matches = result.match(pattern);
    if (matches) {
      hits += matches.length;
      result = result.replace(pattern, '');
    }
  }
  if (hits > 0) console.warn(`[deAI] stripped ${hits} explicit writer name occurrences`);
  return result;
}

export function stripOrdinalMarkers(text: string): string {
  let result = text;
  const patterns = [
    /最外一层[，：]?\s*/g, /最外层[，：]?\s*/g,
    /第[一二三四五六七八九十]+层[，：]\s*/g,
    /第[一二三四五六七八九十]个[，：]?\s*/g,
    /^首先[，,]\s*/gm, /^其次[，,]\s*/gm,
    /^最后[，,]\s*/gm, /^再者[，,]\s*/gm,
  ];
  for (const p of patterns) result = result.replace(p, '');
  return result;
}

export function stripBracketAnnotations(text: string): string {
  let result = text;
  result = result.replace(/（[^）]{1,30}）/g, '');
  result = result.replace(/\([^)]{1,30}\)/g, '');
  result = result.replace(/——即[^，。\n]{1,20}[，。]/g, '');
  result = result.replace(/——也就是说[^，。\n]{1,30}[，。]/g, '');
  result = result.replace(/——换句话说[^，。\n]{1,30}[，。]/g, '');
  result = result.replace(/主要体现在以下几个方面[：:]/g, '');
  result = result.replace(/具体表现为[：:]/g, '');
  result = result.replace(/包括以下几点[：:]/g, '');
  result = result.replace(/([：:])\s*(?:一是|二是|三是|四是)/g, '$1');
  result = result.replace(/\.\.\./g, '');
  let ellipsisCount = 0;
  result = result.replace(/……/g, () => { ellipsisCount++; return ellipsisCount <= 2 ? '……' : '。'; });
  result = result.replace(/，，/g, '，').replace(/。。/g, '。').replace(/  +/g, ' ');
  return result;
}

export function cleanupBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export function applyPostProcessing(text: string): { result: string; log: string[] } {
  const log: string[] = [];
  let result = text;
  result = removeAITransitions(result);
  result = limitBuShiPattern(result);
  result = removeTurnWords(result);
  result = breakUniformParagraphs(result);
  result = removeSummaryParagraphs(result);
  result = stripWriterNames(result);
  result = stripOrdinalMarkers(result);
  result = stripBracketAnnotations(result);
  result = cleanupBlankLines(result);
  return { result, log };
}
