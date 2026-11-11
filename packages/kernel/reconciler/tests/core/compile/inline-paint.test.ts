import { describe, expect, it, vi } from 'vitest';

import { emitTextLine, fallbackMeasurer, layoutTextBlock } from '../../../../core/src/compile/text';

/** 经文本块布局消费单个作者行 */
const layoutTestLine = (
  segments: Parameters<typeof layoutTextBlock>[0][number]['segments'],
  context: Parameters<typeof layoutTextBlock>[2],
) => layoutTextBlock([{ segments }], { lineHeight: context.font.size }, context).lines[0].lineLayout;

describe('内联布局和绘制', () => {
  it('同一布局可换色，保持公式显式色且不重新测量或降解', () => {
    const measureText = vi.fn(fallbackMeasurer);
    const lowerTex = vi.fn(() => ({
      width: 10,
      height: 8,
      depth: 2,
      paths: [
        { commands: [], fill: { kind: 'currentColor' as const }, stroke: { kind: 'none' as const } },
        { commands: [], fill: { kind: 'color' as const, value: 'red' }, stroke: { kind: 'none' as const } },
      ],
    }));
    const layout = layoutTestLine(
      [
        { text: 'A', font: { size: 16 } },
        { tex: 'x', fontSize: 16 },
      ],
      {
        measureText,
        lowerTex,
        font: { size: 16 },
        warn: () => undefined,
      },
    );
    const measuredCalls = measureText.mock.calls.length;
    expect(measuredCalls).toBeGreaterThan(0);
    const snapshot = JSON.stringify(layout);
    const first = emitTextLine(layout, { color: 'blue', opacity: 0.5, segments: [{}, {}] }, 0, 8, n => n);
    const next = emitTextLine(
      layout,
      { color: 'green', opacity: 0.8, segments: [{ fill: 'purple' }, {}] },
      0,
      8,
      n => n,
    );
    expect(first[0]).toMatchObject({ fill: 'blue', opacity: 0.5 });
    expect(next[0]).toMatchObject({ fill: 'purple', opacity: 0.8 });
    expect(next[1]).toMatchObject({ children: [{ fill: 'green' }, { fill: 'red' }] });
    expect(measureText).toHaveBeenCalledTimes(measuredCalls);
    expect(lowerTex).toHaveBeenCalledTimes(1);
    expect(lowerTex).toHaveBeenCalledWith({ tex: 'x', displayMode: undefined }, { fontSize: 16 });
    expect(JSON.stringify(layout)).toBe(snapshot);
    expect(JSON.parse(snapshot)).toEqual(layout);
  });

  it('跳过无效公式后仍按原 run 对应外观', () => {
    const layout = layoutTestLine(
      [
        { tex: 'bad', fontSize: 16 },
        { text: 'A', font: { size: 16 } },
      ],
      {
        measureText: fallbackMeasurer,
        lowerTex: () => null,
        font: { size: 16 },
        warn: () => undefined,
      },
    );
    expect(emitTextLine(layout, { segments: [{ fill: 'red' }, { fill: 'blue' }] }, 0, 8, n => n)).toMatchObject([
      { fill: 'blue' },
    ]);
  });
});
