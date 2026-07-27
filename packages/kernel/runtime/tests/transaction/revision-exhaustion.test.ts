import { describe, expect, it } from 'vitest';

import { createNextRuntimeRevision, createRuntimeRevision } from '../../src/transaction';

describe('runtime revision exhaustion', () => {
  it('revision helper 推进 safe integer，并拒绝超过 MAX', () => {
    expect(createNextRuntimeRevision(createRuntimeRevision(0))).toBe(1);
    expect(() => createNextRuntimeRevision(createRuntimeRevision(Number.MAX_SAFE_INTEGER))).toThrowError(
      expect.objectContaining({
        code: 'RUNTIME_REVISION_EXHAUSTED',
        phase: 'revision',
        cause: Number.MAX_SAFE_INTEGER,
      }),
    );
  });
});
