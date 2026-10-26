import { describe, expect, it } from 'vitest';

import { normalizePlot, normalizePlotPathMark } from '../../../src';
import type { InputPlotPathMark } from '../../../src';

describe('普通路径构造', () => {
  it('拒绝色带的箭头简写，而不是在下沉过程中丢失它', () => {
    expect(() =>
      normalizePlotPathMark({
        way: [
          [0, 0],
          [100, 0],
        ],
        properties: { kind: 'ribbon', ribbon: { width: { kind: 'fixed', value: 8 } } },
        arrow: '->',
      }),
    ).toThrow(/Ribbon/);
  });
  it('标准化普通 Plot 标记上的方式，而不保留编写字段', () => {
    const plot = normalizePlot({
      data: { reference: 'data' },
      scales: [],
      coordinate: { type: 'cartesian2D' },
      marks: [
        {
          type: 'path',
          way: [
            [0, 0],
            [10, 20],
          ],
          arrow: { start: { length: 7, endpointOverlap: 0.5 }, end: { length: 7, endpointOverlap: 0.5 } },
        },
      ],
    });
    expect(plot.marks[0]).toMatchObject({
      type: 'path',
      encodings: {
        steps: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [10, 20] },
        ],
      },
      properties: {
        arrow: { start: { length: 7, endpointOverlap: 0.5 }, end: { length: 7, endpointOverlap: 0.5 } },
      },
    });
    expect(plot.marks[0]).not.toHaveProperty('way');
    expect(plot.marks[0]).not.toHaveProperty('arrow');
  });

  it('拒绝构造路径上的顶点属性', () => {
    expect(() =>
      normalizePlotPathMark({
        way: [
          [0, 0],
          [1, 1],
        ],
        properties: { curve: 'linear' },
      }),
    ).toThrow(/curve/);
  });

  it('保留相对简写和完整源步骤', () => {
    expect(normalizePlotPathMark({ way: ['A', '++2,3'] }).encodings.steps).toEqual([
      { kind: 'move', to: { id: 'A' } },
      { kind: 'line', to: { relativeAccumulate: [2, 3] } },
    ]);
    const source: InputPlotPathMark = {
      encodings: {
        steps: [
          { kind: 'move' as const, to: [0, 0] as [number, number] },
          { kind: 'smooth' as const, points: [[10, 20] as [number, number]] },
        ],
      },
    };
    expect(normalizePlotPathMark(source)).toEqual(source);
  });
});
