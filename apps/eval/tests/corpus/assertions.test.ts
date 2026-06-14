import { describe, expect, it } from 'vitest';
import { CorpusPromptSchema } from '../../src/corpus/types';
import { loadCorpus } from '../../src/corpus/load';

describe('corpus assertions', () => {
  const corpus = loadCorpus(new URL('../../corpus/core.json', import.meta.url));

  it('每条都带 >=1 条 assertions 且全部过 schema', () => {
    for (const item of corpus) {
      expect(CorpusPromptSchema.safeParse(item).success).toBe(true);
      expect(item.assertions?.length ?? 0).toBeGreaterThanOrEqual(1);
    }
  });

  it('断言 kind 都在 v1 词汇内', () => {
    const kinds = new Set(['textPresent', 'primitiveCount', 'arrowCount', 'stylePresent']);
    for (const item of corpus) {
      for (const a of item.assertions ?? []) expect(kinds.has(a.kind)).toBe(true);
    }
  });
});
