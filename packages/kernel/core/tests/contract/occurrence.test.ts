import { describe, expect, it } from 'vitest';

import type { CompileOccurrenceLocator } from '../../src';
import { compareCompileOccurrences } from '../../src';

describe('编译 occurrence 比较', () => {
  it('按源位置和数字展开索引排序，前缀短链优先且不按阶段名排序', () => {
    const first: CompileOccurrenceLocator = {
      sourcePath: ['children', 0],
      expansionPath: [{ kind: 'output', index: 2 }],
    };

    expect(compareCompileOccurrences(first, { ...first, sourcePath: ['children', 1] })).toBeLessThan(0);
    expect(compareCompileOccurrences(first, { ...first, expansionPath: [{ kind: 'output', index: 10 }] })).toBeLessThan(
      0,
    );
    expect(
      compareCompileOccurrences(first, {
        ...first,
        expansionPath: [...first.expansionPath, { kind: 'scopeChild', index: 0 }],
      }),
    ).toBeLessThan(0);
    expect(compareCompileOccurrences({ ...first, expansionPath: [] }, first)).toBeLessThan(0);
    expect(compareCompileOccurrences(first, { ...first, expansionPath: [{ kind: 'replay', index: 2 }] })).toBe(0);
  });
});
