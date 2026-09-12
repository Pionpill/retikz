import { describe, expect, it } from 'vitest';

import { loadCorpus } from '../../src/corpus/load';
import { CorpusPromptSchema } from '../../src/corpus/types';

describe('corpus assertions', () => {
  const corpus = loadCorpus(new URL('../../corpus/core.json', import.meta.url));

  it('每条都带 >=1 条 assertions 且全部过 schema', () => {
    for (const item of corpus) {
      expect(CorpusPromptSchema.safeParse(item).success).toBe(true);
      expect(item.assertions?.length ?? 0).toBeGreaterThanOrEqual(1);
    }
  });
});
