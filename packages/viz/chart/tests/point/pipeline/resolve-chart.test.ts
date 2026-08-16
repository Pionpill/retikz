import { describe, expect, it } from 'vitest';

import { resolvePointChart } from '../../../src/point';

const base = {
  namespace: 'chart',
  type: 'scatter',
  id: 'sales',
  data: { reference: 'rows' },
  encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
} as const;

describe('resolvePointChart merge', () => {
  it('按固定顺序合并 transform、scale、patch 与 Plot mark extension', () => {
    const result = resolvePointChart({
      ...base,
      transform: [{ kind: 'sort', field: 'margin', order: 'descending' }],
      scales: [
        { type: 'log', name: '__chart.scatter.scale.x', base: 2 },
        { type: 'linear', name: 'z' },
      ],
      mark: { opacity: { kind: 'constant', value: 0.5 } },
      marks: [
        {
          type: 'point',
          id: 'user.mark',
          encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
        },
      ],
    });

    expect(result.plotSpec.transform).toEqual([{ kind: 'sort', field: 'margin', order: 'descending' }]);
    expect(result.plotSpec.scales).toEqual([
      { type: 'log', name: '__chart.scatter.scale.x', base: 2 },
      { type: 'linear', name: '__chart.scatter.scale.y' },
      { type: 'linear', name: 'z' },
    ]);
    expect(result.plotSpec.marks).toEqual([
      {
        type: 'point',
        id: '__chart.scatter.mark.main',
        encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
        opacity: { kind: 'constant', value: 0.5 },
      },
      {
        type: 'point',
        id: 'user.mark',
        encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
      },
    ]);
    expect(result.plotSpec.guides?.[0]).toEqual({
      type: 'axis',
      id: '__chart.scatter.guide.x',
      dimension: 'x',
    });
  });

  it('区分省略 guides、空 replacement 与显式 replacement', () => {
    expect(resolvePointChart(base).plotSpec.guides).toHaveLength(2);
    expect(resolvePointChart({ ...base, guides: [] }).plotSpec.guides).toEqual([]);
    expect(
      resolvePointChart({
        ...base,
        guides: [{ type: 'axis', id: 'user.axis', dimension: 'x', grid: true }],
      }).plotSpec.guides,
    ).toEqual([{ type: 'axis', id: 'user.axis', dimension: 'x', grid: true }]);
  });

  it('接受保持 recipe core 的同 kind coordinate replacement', () => {
    expect(
      resolvePointChart({
        ...base,
        coordinate: { type: 'cartesian2D', x: '__chart.scatter.scale.x', y: '__chart.scatter.scale.y' },
      }).plotSpec.coordinate,
    ).toEqual({ type: 'cartesian2D', x: '__chart.scatter.scale.x', y: '__chart.scatter.scale.y' });
  });
});
