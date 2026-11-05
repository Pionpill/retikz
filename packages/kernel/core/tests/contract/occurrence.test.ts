import { describe, expect, it } from 'vitest';

import * as core from '../../src';

describe('Core 公共 API', () => {
  it('公开 occurrence 的稳定比较工具', () => {
    const first = { sourcePath: ['children', 0], expansionPath: [{ kind: 'output', index: 0 }] } as const;
    const second = { sourcePath: ['children', 1], expansionPath: [{ kind: 'output', index: 0 }] } as const;

    expect(core.isCompileOccurrenceEqual(first, first)).toBe(true);
    expect(core.isCompileOccurrenceEqual(first, second)).toBe(false);
    expect(core.compareCompileOccurrences(first, second)).toBeLessThan(0);
  });
});
