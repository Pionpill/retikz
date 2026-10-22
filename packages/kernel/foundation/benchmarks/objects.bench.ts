import { mergeProperties } from '@retikz/foundation';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';

for (const sourceCount of [1, 2, 4]) {
  for (const count of [8, 32, 128]) {
    for (const filtered of [false, true]) {
      defineBenchmark(
        {
          id: `mergeProperties/${filtered ? 'filtered' : 'default'}/sources=${sourceCount}/properties=${count}`,
          dimensions: [
            '属性浅合并',
            filtered ? '过滤 undefined·重叠键' : '默认写入·重叠键',
            `${sourceCount}源×${count}属性`,
          ],
        },
        () => {
          const sources = Array.from({ length: sourceCount }, (_sourceValue, source) =>
            Object.fromEntries(
              Array.from({ length: count }, (_, index) => [
                `key-${index}`,
                (index + source) % 3 === 0 ? undefined : source * count + index,
              ]),
            ),
          );
          const options = filtered ? { shouldOverride: (value: number | undefined) => value !== undefined } : {};
          const expected: Record<string, number | undefined> = {};
          for (const source of sources)
            for (const [key, value] of Object.entries(source))
              if (!filtered || value !== undefined) expected[key] = value;
          const original = structuredClone(sources);
          return {
            run: () => mergeProperties(sources, options),
            verify: result => {
              expect(result).toEqual(expected);
              expect(sources).toEqual(original);
              expect(sources.includes(result)).toBe(false);
            },
          };
        },
      );
    }
  }
}
defineBenchmark(
  { id: 'mergeProperties/symbols', dimensions: ['属性浅合并', 'symbol 与不可枚举属性', '2源×2属性'] },
  () => {
    const key = Symbol('style');
    const first = { [key]: 1, visible: 2 };
    Object.defineProperty(first, 'hidden', { value: 3, enumerable: false });
    const second = { [key]: 4, visible: 5 };
    return {
      run: () => mergeProperties([first, second]),
      verify: result => {
        expect(result).toEqual(second);
        expect(Object.hasOwn(result, 'hidden')).toBe(false);
      },
    };
  },
);
