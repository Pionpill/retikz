import { describe, expect, it } from 'vitest';

import { RetikzRuntimeErrorCode } from '../../src';
import { createNextRuntimeRevision, createRuntimeRevision } from '../../src/transaction';

describe('运行时修订耗尽', () => {
  it('revision helper 推进 safe integer，并拒绝超过 MAX', () => {
    expect(createNextRuntimeRevision(createRuntimeRevision(0))).toBe(1);
    expect(() => createNextRuntimeRevision(createRuntimeRevision(Number.MAX_SAFE_INTEGER))).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.RevisionExhausted,
        phase: 'revision',
        cause: Number.MAX_SAFE_INTEGER,
      }),
    );
  });
});
