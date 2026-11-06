import { describe, expect, it } from 'vitest';

import type { CompileOccurrenceLocator } from '../../src';
import { compareCompileOccurrences } from '../../src';
import { isCompileOccurrenceEqual } from '../../src/contract';

describe('编译 occurrence 比较', () => {
  it('逐项比较源位置与展开路径，不依赖对象身份', () => {
    const first = { sourcePath: ['children', 0], expansionPath: [{ kind: 'output', index: 0 }] } as const;
    const variants: Array<CompileOccurrenceLocator> = [
      { ...first, sourcePath: ['children', 1] },
      { ...first, expansionPath: [{ kind: 'replay', index: 0 }] },
      { ...first, expansionPath: [{ kind: 'output', index: 1 }] },
      { ...first, expansionPath: [...first.expansionPath, { kind: 'scopeChild', index: 0 }] },
    ];

    expect(isCompileOccurrenceEqual(first, structuredClone(first))).toBe(true);
    for (const different of variants) expect(isCompileOccurrenceEqual(first, different)).toBe(false);
  });

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
