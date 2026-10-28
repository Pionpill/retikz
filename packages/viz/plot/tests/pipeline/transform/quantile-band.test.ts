import { applyTransforms, collectTransformFields, resolveTransformRegistry, TransformSchema } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { collectSourceFields } from '../../../src/pipeline/source-fields';
import { createFieldCollector } from '../../../src/providers/channel/shared';
import { PlotSchema } from '../../../src/schemas/plot';

describe('分位数带统计 schema（契约）', () => {
  it('接受分位数带归约器并保留 JSON 往返行程', () => {
    const operation = {
      kind: 'summarize',
      params: {
        groupBy: ['group'],
        metrics: [
          {
            kind: 'quantile-band',
            field: 'value',
            lowerP: 0.25,
            upperP: 0.75,
            outputs: {
              lower: 'boxLow',
              upper: 'boxHigh',
              points: [{ p: 0.5, as: 'median' }],
              spread: 'boxSpread',
              lowerFence: 'lowerFence',
              upperFence: 'upperFence',
              whiskerMin: 'whiskerMin',
              whiskerMax: 'whiskerMax',
              count: 'count',
            },
            whisker: { kind: 'spread', factor: 1.5 },
          },
        ],
      },
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('接受分位数带外选择器并保留 JSON 往返', () => {
    const operation = {
      kind: 'select',
      params: {
        groupBy: ['group'],
        selector: {
          kind: 'outside-quantile-band',
          field: 'value',
          lowerP: 0.1,
          upperP: 0.9,
          boundary: { kind: 'band' },
        },
        rankAs: 'rank',
      },
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('拒绝无效的概率顺序', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        params: {
          metrics: [
            {
              kind: 'quantile-band',
              field: 'value',
              lowerP: 0.8,
              upperP: 0.2,
              outputs: { lower: 'low', upper: 'high' },
            },
          ],
        },
      }),
    ).toThrow();

    expect(() =>
      TransformSchema.parse({
        kind: 'select',
        params: {
          selector: {
            kind: 'outside-quantile-band',
            field: 'value',
            lowerP: 0.9,
            upperP: 0.9,
          },
        },
      }),
    ).toThrow();
  });

  it('拒绝指标内部和跨指标的重复输出字段', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        params: {
          metrics: [
            {
              kind: 'quantile-band',
              field: 'value',
              lowerP: 0.25,
              upperP: 0.75,
              outputs: {
                lower: 'boundary',
                upper: 'boundary',
              },
            },
          ],
        },
      }),
    ).toThrow();

    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        params: {
          metrics: [
            { kind: 'mean', field: 'value', as: 'boxLow' },
            {
              kind: 'quantile-band',
              field: 'value',
              lowerP: 0.25,
              upperP: 0.75,
              outputs: { lower: 'boxLow', upper: 'boxHigh' },
            },
          ],
        },
      }),
    ).toThrow();
  });

  it('拒绝负价差因子', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        params: {
          metrics: [
            {
              kind: 'quantile-band',
              field: 'value',
              lowerP: 0.25,
              upperP: 0.75,
              outputs: { lower: 'boxLow', upper: 'boxHigh' },
              whisker: { kind: 'spread', factor: -1 },
            },
          ],
        },
      }),
    ).toThrow();

    expect(() =>
      TransformSchema.parse({
        kind: 'select',
        params: {
          selector: {
            kind: 'outside-quantile-band',
            field: 'value',
            lowerP: 0.25,
            upperP: 0.75,
            boundary: { kind: 'spread', factor: -1 },
          },
        },
      }),
    ).toThrow();
  });
});

describe('分位数带统计行为（契约）', () => {
  const rows = [
    { group: 'A', value: 0 },
    { group: 'A', value: 2 },
    { group: 'A', value: 4 },
    { group: 'A', value: 6 },
    { group: 'A', value: 8 },
    { group: 'B', value: 10 },
    { group: 'B', value: 20 },
    { group: 'B', value: 30 },
  ];

  it('计算箱线图形状的分位数带字段', () => {
    const out = applyTransforms(rows, [
      {
        kind: 'summarize',
        params: {
          groupBy: ['group'],
          metrics: [
            {
              kind: 'quantile-band',
              field: 'value',
              lowerP: 0.25,
              upperP: 0.75,
              outputs: {
                lower: 'boxLow',
                upper: 'boxHigh',
                points: [{ p: 0.5, as: 'median' }],
                spread: 'spread',
                lowerFence: 'lowerFence',
                upperFence: 'upperFence',
                whiskerMin: 'whiskerMin',
                whiskerMax: 'whiskerMax',
                min: 'min',
                max: 'max',
                count: 'count',
              },
              whisker: { kind: 'spread', factor: 1.5 },
            },
          ],
        },
      },
    ]).rows;

    expect(out).toEqual([
      expect.objectContaining({
        group: 'A',
        boxLow: 2,
        median: 4,
        boxHigh: 6,
        spread: 4,
        lowerFence: -4,
        upperFence: 12,
        whiskerMin: 0,
        whiskerMax: 8,
        min: 0,
        max: 8,
        count: 5,
      }),
      expect.objectContaining({
        group: 'B',
        boxLow: 15,
        median: 20,
        boxHigh: 25,
        spread: 10,
        whiskerMin: 10,
        whiskerMax: 30,
        count: 3,
      }),
    ]);
  });

  it('计算没有 q1 或 q3 字段的中心 80% 频带', () => {
    const out = applyTransforms(rows, [
      {
        kind: 'summarize',
        params: {
          groupBy: ['group'],
          metrics: [
            {
              kind: 'quantile-band',
              field: 'value',
              lowerP: 0.1,
              upperP: 0.9,
              outputs: {
                lower: 'p10',
                upper: 'p90',
                points: [{ p: 0.5, as: 'p50' }],
                spread: 'p80Spread',
              },
            },
          ],
        },
      },
    ]).rows;

    expect(out[0]).toMatchObject({ group: 'A', p10: 0.8, p50: 4, p90: 7.2, p80Spread: 6.4 });
  });

  it('根据要求使用 minMax 晶须策略', () => {
    const out = applyTransforms(rows, [
      {
        kind: 'summarize',
        params: {
          groupBy: ['group'],
          metrics: [
            {
              kind: 'quantile-band',
              field: 'value',
              lowerP: 0.25,
              upperP: 0.75,
              outputs: { lower: 'low', upper: 'high', whiskerMin: 'whiskerMin', whiskerMax: 'whiskerMax' },
              whisker: { kind: 'minMax' },
            },
          ],
        },
      },
    ]).rows;

    expect(out[0]).toMatchObject({ group: 'A', low: 2, high: 6, whiskerMin: 0, whiskerMax: 8 });
  });

  it('处理单值组并将空的有限组标记为无效', () => {
    const out = applyTransforms(
      [
        { group: 'A', value: 5 },
        { group: 'B', value: Number.NaN },
      ],
      [
        {
          kind: 'summarize',
          params: {
            groupBy: ['group'],
            metrics: [
              {
                kind: 'quantile-band',
                field: 'value',
                lowerP: 0.25,
                upperP: 0.75,
                outputs: {
                  lower: 'low',
                  upper: 'high',
                  points: [{ p: 0.5, as: 'mid' }],
                  whiskerMin: 'min',
                  whiskerMax: 'max',
                  count: 'count',
                },
                whisker: { kind: 'spread' },
              },
            ],
          },
        },
      ],
    ).rows;

    expect(out[0]).toMatchObject({ group: 'A', low: 5, high: 5, mid: 5, min: 5, max: 5, count: 1 });
    expect(out[1]).toMatchObject({ group: 'B', count: 0 });

    for (const field of ['low', 'high', 'mid', 'min', 'max']) expect(Number.isNaN(out[1][field])).toBe(true);
  });

  it('按源顺序选择分位数带边界之外的行', () => {
    const out = applyTransforms(rows, [
      {
        kind: 'select',
        params: {
          groupBy: ['group'],
          selector: {
            kind: 'outside-quantile-band',
            field: 'value',
            lowerP: 0.2,
            upperP: 0.8,
            boundary: { kind: 'band' },
          },
          rankAs: 'rank',
        },
      },
    ]).rows;

    expect(out.map(row => [row.group, row.value, row.rank])).toEqual([
      ['A', 0, 1],
      ['A', 8, 2],
      ['B', 10, 1],
      ['B', 30, 2],
    ]);
  });

  it('选择展开栅栏之外的行', () => {
    const out = applyTransforms(
      [
        { group: 'A', value: 0 },
        { group: 'A', value: 10 },
        { group: 'A', value: 20 },
        { group: 'A', value: 30 },
        { group: 'A', value: 100 },
      ],
      [
        {
          kind: 'select',
          params: {
            groupBy: ['group'],
            selector: {
              kind: 'outside-quantile-band',
              field: 'value',
              lowerP: 0.25,
              upperP: 0.75,
              boundary: { kind: 'spread', factor: 1.5 },
            },
          },
        },
      ],
    ).rows;

    expect(out).toEqual([expect.objectContaining({ group: 'A', value: 100 })]);
  });

  it('报告输入和输出字段以进行严格的模型收集', () => {
    const fields = new Set<string>();
    const derivedOutputs = new Set<string>();

    collectTransformFields(
      {
        kind: 'summarize',
        params: {
          groupBy: ['group'],
          metrics: [
            {
              kind: 'quantile-band',
              field: 'value',
              lowerP: 0.25,
              upperP: 0.75,
              outputs: { lower: 'boxLow', upper: 'boxHigh', points: [{ p: 0.5, as: 'median' }] },
            },
          ],
        },
      },
      createFieldCollector(fields),
      derivedOutputs,
      resolveTransformRegistry(),
    );

    expect([...fields].sort()).toEqual(['group', 'value']);
    expect([...derivedOutputs].sort()).toEqual(['boxHigh', 'boxLow', 'median']);
  });

  it('严格模型接受分位数带输出字段作为派生字段', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'group', type: 'categorical' },
          { name: 'value', type: 'continuous' },
        ],
      },
      transform: [
        {
          operation: {
            kind: 'summarize',
            params: {
              groupBy: ['group'],
              metrics: [
                {
                  kind: 'quantile-band',
                  field: 'value',
                  lowerP: 0.25,
                  upperP: 0.75,
                  outputs: { lower: 'boxLow', upper: 'boxHigh', points: [{ p: 0.5, as: 'median' }] },
                },
              ],
            },
          },
        },
      ],
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          encodings: {
            bounds: { y: { from: { field: 'boxLow' }, to: { field: 'boxHigh' } } },
            position: { x: { field: 'group' }, y: { field: 'boxHigh' } },
          },
          properties: { bounds: { y: { kind: 'extent' } } },
        },
      ],
    });

    expect([...collectSourceFields(spec, resolveTransformRegistry())].sort()).toEqual(['group', 'value']);
  });
});
