import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ComparisonPlot } from '../src/playground/report';

describe('Performance Lab comparison Plot', () => {
  it('通过 retikz Plot 输出策略柱形与坐标文字', () => {
    const svg = renderToStaticMarkup(
      createElement(ComparisonPlot, {
        rows: [
          { policy: 's·full', median: 10, p95: 12 },
          { policy: 'r·auto', median: 2, p95: 3 },
        ],
        width: 360,
        height: 220,
      }),
    );

    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    expect(svg).toContain('s·full');
    expect(svg).toContain('r·auto');
  });

  it('单策略报告保持可比较的窄柱形', () => {
    const svg = renderToStaticMarkup(
      createElement(ComparisonPlot, {
        rows: [{ policy: 'r·auto', median: 194.2, p95: 200 }],
        width: 381,
        height: 199,
      }),
    );
    const bar = svg.match(/<rect[^>]*fill="#64748b"[^>]*>/)?.[0];
    const width = bar?.match(/width="([^"]+)"/)?.[1];

    expect(Number(width)).toBeLessThan(100);
  });
});
