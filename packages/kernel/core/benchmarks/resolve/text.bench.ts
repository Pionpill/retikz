import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { resolveTextLine } from '../../src/resolve/text';
import type { ColorResolvedTextLine, TextLineResolveContext } from '../../src/resolve/text';

for (const count of [32, 1_024, 16_384]) {
  for (const gatingOn of [false, true]) {
    defineBenchmark(
      {
        id: `resolve/text/plain/${gatingOn}/${count}`,
        dimensions: ['Text 解析', gatingOn ? '纯文本，公式开启' : '纯文本，公式关闭', `${count} 字符`],
      },
      () => {
        const source = '文'.repeat(count);
        const context: TextLineResolveContext = {
          rootFontSize: 16,
          inheritedFont: { size: 20, family: 'serif' },
          gatingOn,
        };
        return {
          run: () => resolveTextLine(source, context),
          verify: result => {
            expect(result.plainText).toBe(source);
            expect(result.hasMath).toBe(false);
            expect(result.segments).toEqual([{ text: source, font: { size: 20, family: 'serif' } }]);
          },
        };
      },
    );
  }
}

for (const count of [8, 128, 1_024]) {
  for (const explicit of [false, true]) {
    defineBenchmark(
      {
        id: `resolve/text/mixed/${explicit}/${count}`,
        dimensions: ['Text 解析', explicit ? '显式片段与相对字号' : '美元公式混排', `${count * 2} 片段`],
      },
      () => {
        const source: ColorResolvedTextLine = explicit
          ? {
              segments: Array.from({ length: count }, () => [
                { text: 'a', font: { size: '2em' as const } },
                { tex: 'x' },
              ]).flat(),
              font: { size: '0.5em' },
              fill: 'red',
            }
          : 'a$x$'.repeat(count);
        const context: TextLineResolveContext = {
          rootFontSize: 16,
          inheritedFont: { size: 20, family: 'serif' },
          gatingOn: true,
        };
        const original = JSON.stringify(source);
        return {
          run: () => resolveTextLine(source, context),
          verify: result => {
            expect(result.plainText).toBe('a'.repeat(count));
            expect(result.hasMath).toBe(true);
            expect(result.mixed).toBe(true);
            expect(result.segments).toHaveLength(count * 2);
            expect(result.segments[0]).toMatchObject({ text: 'a', font: { size: 20, family: 'serif' } });
            expect(result.segments.at(-1)).toMatchObject({ tex: 'x', fontSize: explicit ? 10 : 20 });
            if (explicit) expect(result.segments[0].fill).toBe('red');
            expect(JSON.stringify(source)).toBe(original);
          },
        };
      },
    );
  }
}
