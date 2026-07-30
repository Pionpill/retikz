import { describe, expect, it } from 'vitest';

import { previewControlContract as pointTransformContract } from '../../src/modules/docs/contents/viz/plot/mark/point/point-transform.controls';
import { previewControlContract as pointTransformEnglishContract } from '../../src/modules/docs/contents/viz/plot/mark/point/point-transform.en.controls';
import {
  CUSTOM_TRANSFORM_CONTROL_IDS,
  waterfallOperationOf,
} from '../../src/modules/docs/contents/viz/plot/transform/custom-transform/waterfall.controls';
import { waterfallRows } from '../../src/modules/docs/contents/viz/plot/transform/custom-transform/waterfall.data';
import { waterfallTransform } from '../../src/modules/docs/contents/viz/plot/transform/custom-transform/waterfall.definition';
import { createPlotTransformTableViews } from '../../src/modules/docs/contents/viz/plot/transform-table-views';

describe('Plot transform table views', () => {
  it('使用完整 Plot registry 执行内置 transform', () => {
    const views = createPlotTransformTableViews(
      { source: 'Source', result: 'Stacked' },
      [
        { quarter: 'Q1', product: 'A', revenue: 30 },
        { quarter: 'Q1', product: 'B', revenue: 45 },
      ],
      () => ({ kind: 'stack', x: 'quarter', y: 'revenue', groupBy: 'product' }),
    );
    const resultRows = views[1].rows;

    expect(typeof resultRows).toBe('function');
    if (typeof resultRows !== 'function') return;
    expect(resultRows({})).toMatchObject([
      { quarter: 'Q1', product: 'A', revenue: 30, y0: 0, y1: 30 },
      { quarter: 'Q1', product: 'B', revenue: 45, y0: 30, y1: 75 },
    ]);
  });

  it('把实时 controls 值与自定义 Definition 传给结果视图', () => {
    const views = createPlotTransformTableViews(
      { source: 'Source', result: 'Waterfall' },
      waterfallRows,
      waterfallOperationOf,
      { transformDefinitions: [waterfallTransform] },
    );
    const resultRows = views[1].rows;

    expect(typeof resultRows).toBe('function');
    if (typeof resultRows !== 'function') return;
    expect(resultRows({ [CUSTOM_TRANSFORM_CONTROL_IDS.initialValue]: 60 }).slice(0, 2)).toMatchObject([
      { period: 'Q1', delta: 35, from: 60, to: 95, direction: 'increase' },
      { period: 'Q2', delta: -20, from: 95, to: 75, direction: 'decrease' },
    ]);
  });

  it.each([
    ['zh', pointTransformContract, ['原始', '抖动后']],
    ['en', pointTransformEnglishContract, ['Source', 'Jittered']],
  ] as const)('PointMark jitter 的 %s 数据表提供原始与变换后视图', (_language, contract, labels) => {
    const table = contract.controls.sections[0].controls[0];
    const views = table.views;

    expect(views.map(view => view.label)).toEqual(labels);
    const resultRows = views[1].rows;
    expect(typeof resultRows).toBe('function');
    if (typeof resultRows !== 'function') return;

    const sourceRowsDefinition = views[0].rows;
    const sourceRows =
      typeof sourceRowsDefinition === 'function'
        ? sourceRowsDefinition(contract.canonicalValues)
        : sourceRowsDefinition;
    const transformedRows = resultRows(contract.canonicalValues);
    expect(transformedRows).not.toEqual(sourceRows);
    expect(transformedRows.map(row => Reflect.get(row, 'orders'))).not.toEqual(
      sourceRows.map(row => Reflect.get(row, 'orders')),
    );
  });
});
