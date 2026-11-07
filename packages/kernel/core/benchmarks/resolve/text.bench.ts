// 计时边界为单行文本块的完整解析，包含块字体、缩放与行槽配置，不与旧行解析基准直接比较
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { resolveTextBlock } from '../../src/resolve/text';
import type { ColorResolvedTextLine } from '../../src/resolve/text';
import type { TextBlockResolveContext } from '../../src/resolve/text/types';

for (const count of [32, 1_024, 16_384]) {
  for (const gatingOn of [false, true]) {
    defineBenchmark(
      {
        id: `resolve/text-block/plain/${gatingOn}/${count}`,
        dimensions: ['Text 块解析', gatingOn ? '纯文本，公式开启' : '纯文本，公式关闭', `${count} 字符`],
      },
      () => {
        const source = '文'.repeat(count);
        const context: TextBlockResolveContext = {
          rootFontSize: 16,
          inheritedFont: { size: 20, family: 'serif' },
          gatingOn,
        };
        return {
          run: () => resolveTextBlock({ text: [source] }, context),
          verify: block => {
            const result = block.lines[0];
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
        id: `resolve/text-block/mixed/${explicit}/${count}`,
        dimensions: ['Text 块解析', explicit ? '显式片段与相对字号' : '美元公式混排', `${count * 2} 片段`],
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
        const context: TextBlockResolveContext = {
          rootFontSize: 16,
          inheritedFont: { size: 20, family: 'serif' },
          gatingOn: true,
        };
        const original = JSON.stringify(source);
        return {
          run: () => resolveTextBlock({ text: [source] }, context),
          verify: block => {
            const result = block.lines[0];
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
