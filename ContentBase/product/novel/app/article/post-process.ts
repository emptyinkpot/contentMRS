import { WRITER_NAMES_TO_STRIP } from './config';

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

export function cleanupBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export function applyPostProcessing(text: string): { result: string; log: string[] } {
  const log: string[] = [];
  let result = text;
  result = stripWriterNames(result);
  result = breakUniformParagraphs(result);
  result = cleanupBlankLines(result);
  return { result, log };
}
