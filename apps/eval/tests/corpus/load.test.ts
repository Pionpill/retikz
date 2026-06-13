import { describe, expect, it } from 'vitest';
import { CorpusPromptSchema } from '../../src/corpus/types';
import { loadCorpus } from '../../src/corpus/load';

describe('CorpusPromptSchema', () => {
  it('接受合法种子条目', () => {
    const ok = CorpusPromptSchema.safeParse({
      id: 'core-single-01',
      category: 'core',
      difficulty: 'single',
      prompt: '画一个写着 Hello 的矩形节点。',
    });
    expect(ok.success).toBe(true);
  });

  it('拒绝非法 difficulty', () => {
    const bad = CorpusPromptSchema.safeParse({
      id: 'x',
      category: 'core',
      difficulty: 'medium',
      prompt: 'p',
    });
    expect(bad.success).toBe(false);
  });
});

describe('loadCorpus', () => {
  it('加载内置 core 语料且每条过 schema', () => {
    const url = new URL('../../corpus/core.json', import.meta.url);
    const corpus = loadCorpus(url);
    expect(corpus.length).toBeGreaterThanOrEqual(24);
    for (const item of corpus) {
      expect(CorpusPromptSchema.safeParse(item).success).toBe(true);
    }
  });

  it('语料覆盖全部四个难度档', () => {
    const corpus = loadCorpus(new URL('../../corpus/core.json', import.meta.url));
    const tiers = new Set(corpus.map((c) => c.difficulty));
    expect(tiers).toEqual(new Set(['single', 'composite', 'complex', 'advanced']));
  });

  it('语料 id 无重复', () => {
    const corpus = loadCorpus(new URL('../../corpus/core.json', import.meta.url));
    const ids = corpus.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
