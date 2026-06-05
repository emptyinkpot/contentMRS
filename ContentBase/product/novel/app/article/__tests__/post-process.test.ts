import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { stripWriterNames, breakUniformParagraphs, cleanupBlankLines, applyPostProcessing } from '../post-process';

describe('stripWriterNames', () => {
  it('removes known writer names from text', () => {
    const input = '鲁迅曾经说过，三岛由纪夫也这样认为。';
    const result = stripWriterNames(input);
    assert.ok(!result.includes('鲁迅'));
    assert.ok(!result.includes('三岛由纪夫'));
  });

  it('returns text unchanged when no names present', () => {
    const input = '这是一段普通的文字。';
    assert.equal(stripWriterNames(input), input);
  });

  it('handles empty string', () => {
    assert.equal(stripWriterNames(''), '');
  });
});

describe('breakUniformParagraphs', () => {
  it('splits uniform paragraphs at sentence boundary', () => {
    const para = '第一句话。第二句话。第三句话。第四句话。第五句话。';
    const uniform = [para, para, para, para, para, para, para, para].join('\n\n');
    const result = breakUniformParagraphs(uniform);
    const resultParas = result.split('\n\n');
    assert.ok(resultParas.length > 8);
  });

  it('leaves varied paragraphs unchanged', () => {
    const short = '短。';
    const long = '这是一段非常长的文字。' + '补充内容。'.repeat(20);
    const input = [short, long, short, long].join('\n\n');
    const result = breakUniformParagraphs(input);
    assert.equal(result.split('\n\n').length, 4);
  });
});

describe('cleanupBlankLines', () => {
  it('collapses triple+ newlines to double', () => {
    assert.equal(cleanupBlankLines('a\n\n\n\nb'), 'a\n\nb');
  });

  it('trims leading/trailing whitespace', () => {
    assert.equal(cleanupBlankLines('  hello  '), 'hello');
  });
});

describe('applyPostProcessing', () => {
  it('returns result and log', () => {
    const { result, log } = applyPostProcessing('测试文字。');
    assert.equal(typeof result, 'string');
    assert.ok(Array.isArray(log));
  });
});
