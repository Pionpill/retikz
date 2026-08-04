import { describe, expect, it } from 'vitest';

import { resolveChartSpec } from '../../src/resolution';

const base = {
  namespace: 'chart',
  type: '__infrastructure-fixture',
  id: 'sales',
  data: { reference: 'rows' },
  encoding: { x: 'amount', y: 'margin' },
} as const;

describe('resolveChartSpec merge', () => {
  it('按固定顺序合并 transform、scale、patch 与 Plot mark extension', () => {
    const result = resolveChartSpec({
      ...base,
      transform: [{ kind: 'sort', field: 'margin', order: 'descending' }],
      scales: [
        { type: 'log', name: 'x', base: 2 },
        { type: 'linear', name: 'z' },
      ],
      mark: { opacity: { kind: 'constant', value: 0.5 } },
      components: [{ target: 'guide.x', grid: true }],
      marks: [
        {
          type: 'point',
          id: 'user.mark',
          encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
        },
      ],
    });

    expect(result.plotSpec.transform).toEqual([
      { kind: 'sort', field: 'margin', order: 'descending' },
      { kind: 'sort', field: 'amount', order: 'ascending' },
    ]);
    expect(result.plotSpec.scales).toEqual([
      { type: 'log', name: 'x', base: 2 },
      { type: 'linear', name: 'y' },
      { type: 'linear', name: 'z' },
    ]);
    expect(result.plotSpec.marks).toEqual([
      {
        type: 'point',
        id: '__chart.__infrastructure-fixture.mark.main',
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
      id: '__chart.__infrastructure-fixture.guide.x',
      dimension: 'x',
      grid: true,
    });
  });

  it('区分省略 guides、空 replacement 与显式 replacement', () => {
    expect(resolveChartSpec(base).plotSpec.guides).toHaveLength(2);
    expect(resolveChartSpec({ ...base, guides: [] }).plotSpec.guides).toEqual([]);
    expect(
      resolveChartSpec({
        ...base,
        guides: [{ type: 'axis', id: 'user.axis', dimension: 'x', grid: true }],
      }).plotSpec.guides,
    ).toEqual([{ type: 'axis', id: 'user.axis', dimension: 'x', grid: true }]);
  });

  it('接受保持 recipe core 的同 kind coordinate replacement', () => {
    expect(
      resolveChartSpec({
        ...base,
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      }).plotSpec.coordinate,
    ).toEqual({ type: 'cartesian2D', x: 'x', y: 'y' });
  });
});
