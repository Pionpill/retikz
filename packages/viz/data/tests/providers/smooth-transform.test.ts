import { describe, expect, it } from 'vitest';
import { object } from 'zod';

import type { ExternalRow } from '../../src';
import {
  applyTransforms,
  defineTransform,
  readSourceIndices,
  tagSourceIndex,
  resolveTransformRegistry,
  TransformSchema,
} from '../../src';

const smoothOperation = (operation: unknown) => TransformSchema.parse(operation);

describe('平滑变换 schema（契约）', () => {
  it('接受平滑变换并保留 JSON 往返', () => {
    const operation = {
      kind: 'smooth',
      params: {
        x: 'time',
        y: 'value',
        groupBy: ['series'],
        method: { kind: 'linear' },
        sampleCount: 96,
        extent: [0, 10],
        xAs: 'trendX',
        yAs: 'trendY',
      },
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it.each([
    { kind: 'linear' },
    { kind: 'quadratic' },
    { kind: 'polynomial' },
    { kind: 'polynomial', order: 2 },
    { kind: 'polynomial', order: 6 },
    { kind: 'logarithmic' },
    { kind: 'exponential' },
    { kind: 'power' },
  ])('接受完整回归方法对象：$kind $order', method => {
    const operation = {
      kind: 'smooth',
      params: {
        x: 'time',
        y: 'value',
        method,
        xAs: 'trendX',
        yAs: 'trendY',
      },
    };

    expect(TransformSchema.parse(operation)).toEqual(operation);
  });

  it('拒绝具有有用的 zod 错误的畸形平滑 JSON', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'smooth', params: { x: 'time', y: 'value', sampleCount: 1, xAs: 'x', yAs: 'y' } }),
    ).toThrow();
    expect(() =>
      TransformSchema.parse({ kind: 'smooth', params: { x: 'time', y: 'value', extent: [4, 4], xAs: 'x', yAs: 'y' } }),
    ).toThrow();
    expect(() =>
      TransformSchema.parse({
        kind: 'smooth',
        params: {
          x: 'time',
          y: 'value',
          method: { kind: '' },
          xAs: 'x',
          yAs: 'y',
        },
      }),
    ).toThrow();
  });
});

describe('平滑变换行为（契约）', () => {
  const rows: Array<ExternalRow> = [
    { series: 'A', time: 0, value: 1 },
    { series: 'A', time: 1, value: 3 },
    { series: 'A', time: 2, value: 5 },
    { series: 'B', time: 0, value: 10 },
    { series: 'B', time: 2, value: 10 },
    { series: 'B', time: 4, value: 10 },
  ];

  it('计算显式范围内的已知线性回归线', () => {
    const out = applyTransforms(rows.slice(0, 3), [
      smoothOperation({
        kind: 'smooth',
        params: {
          x: 'time',
          y: 'value',
          sampleCount: 5,
          extent: [0, 4],
          xAs: 'trendX',
          yAs: 'trendY',
        },
      }),
    ]).rows;

    expect(out.map(row => row.trendX)).toEqual([0, 1, 2, 3, 4]);
    expect(out.map(row => row.trendY)).toEqual([1, 3, 5, 7, 9]);
  });

  it('恢复已知的二次和多项式模型', () => {
    const quadraticRows: Array<ExternalRow> = [-2, -1, 0, 1, 2].map(x => ({ x, y: x ** 2 + 2 * x + 1 }));
    const cubicRows: Array<ExternalRow> = [-2, -1, 0, 1, 2].map(x => ({ x, y: x ** 3 - 2 * x + 1 }));

    const quadratic = applyTransforms(quadraticRows, [
      smoothOperation({
        kind: 'smooth',
        params: {
          x: 'x',
          y: 'y',
          method: { kind: 'quadratic' },
          sampleCount: 5,
          extent: [-2, 2],
          xAs: 'trendX',
          yAs: 'trendY',
        },
      }),
    ]).rows;
    const polynomialDegreeTwo = applyTransforms(quadraticRows, [
      smoothOperation({
        kind: 'smooth',
        params: {
          x: 'x',
          y: 'y',
          method: { kind: 'polynomial', order: 2 },
          sampleCount: 5,
          extent: [-2, 2],
          xAs: 'trendX',
          yAs: 'trendY',
        },
      }),
    ]).rows;
    const polynomialDefault = applyTransforms(cubicRows, [
      smoothOperation({
        kind: 'smooth',
        params: {
          x: 'x',
          y: 'y',
          method: { kind: 'polynomial' },
          sampleCount: 5,
          extent: [-2, 2],
          xAs: 'trendX',
          yAs: 'trendY',
        },
      }),
    ]).rows;

    expect(quadratic.map(row => row.trendX)).toEqual([-2, -1, 0, 1, 2]);
    expect(polynomialDegreeTwo.map(row => row.trendX)).toEqual([-2, -1, 0, 1, 2]);
    expect(polynomialDefault.map(row => row.trendX)).toEqual([-2, -1, 0, 1, 2]);

    quadratic.forEach((row, index) => expect(row.trendY).toBeCloseTo([1, 0, 1, 4, 9][index], 10));
    polynomialDegreeTwo.forEach((row, index) => expect(row.trendY).toBeCloseTo(quadratic[index].trendY as number, 10));
    polynomialDefault.forEach((row, index) => expect(row.trendY).toBeCloseTo([-3, 2, 1, 0, 5][index], 10));
  });

  it('恢复已知的对数、指数和幂模型', () => {
    const logarithmic = applyTransforms(
      [0, 1, 2, 3].map(exponent => {
        const x = Math.exp(exponent);
        return { x, y: 2 + 3 * Math.log(x) };
      }),
      [
        smoothOperation({
          kind: 'smooth',
          params: {
            x: 'x',
            y: 'y',
            method: { kind: 'logarithmic' },
            sampleCount: 2,
            extent: [1, Math.exp(3)],
            xAs: 'trendX',
            yAs: 'trendY',
          },
        }),
      ],
    ).rows;
    const exponential = applyTransforms(
      [0, 2, 4].map(x => ({ x, y: 2 * Math.exp(0.5 * x) })),
      [
        smoothOperation({
          kind: 'smooth',
          params: {
            x: 'x',
            y: 'y',
            method: { kind: 'exponential' },
            sampleCount: 3,
            extent: [0, 4],
            xAs: 'trendX',
            yAs: 'trendY',
          },
        }),
      ],
    ).rows;
    const power = applyTransforms(
      [1, 2, 4].map(x => ({ x, y: 3 * x ** 2 })),
      [
        smoothOperation({
          kind: 'smooth',
          params: {
            x: 'x',
            y: 'y',
            method: { kind: 'power' },
            sampleCount: 4,
            extent: [1, 4],
            xAs: 'trendX',
            yAs: 'trendY',
          },
        }),
      ],
    ).rows;

    expect(logarithmic.map(row => row.trendX)).toEqual([1, Math.exp(3)]);
    expect(exponential.map(row => row.trendX)).toEqual([0, 2, 4]);
    expect(power.map(row => row.trendX)).toEqual([1, 2, 3, 4]);

    logarithmic.forEach((row, index) => expect(row.trendY).toBeCloseTo([2, 11][index], 10));
    exponential.forEach((row, index) => expect(row.trendY).toBeCloseTo([2, 2 * Math.E, 2 * Math.E ** 2][index], 10));
    power.forEach((row, index) => expect(row.trendY).toBeCloseTo([3, 12, 27, 48][index], 10));
  });

  it('使用观察到的 x 范围和默认样本计数', () => {
    const out = applyTransforms(rows.slice(0, 3), [
      smoothOperation({
        kind: 'smooth',
        params: {
          x: 'time',
          y: 'value',
          xAs: 'trendX',
          yAs: 'trendY',
        },
      }),
    ]).rows;

    expect(out).toHaveLength(64);
    expect(out[0].trendX).toBe(0);
    expect(out.at(-1)?.trendX).toBe(2);

    for (let index = 1; index < out.length; index++) {
      expect(out[index].trendX as number).toBeGreaterThan(out[index - 1].trendX as number);
    }

    expect(out.every(row => Number.isFinite(row.trendY))).toBe(true);
  });

  it('每组独立计算平滑线并保留组键', () => {
    const out = applyTransforms(rows, [
      smoothOperation({
        kind: 'smooth',
        params: {
          x: 'time',
          y: 'value',
          groupBy: ['series'],
          sampleCount: 3,
          xAs: 'trendX',
          yAs: 'trendY',
        },
      }),
    ]).rows;

    expect(out).toHaveLength(6);
    expect(out.filter(row => row.series === 'A').map(row => row.trendY)).toEqual([1, 3, 5]);
    expect(out.filter(row => row.series === 'B').map(row => row.trendY)).toEqual([10, 10, 10]);
    expect(out.map(row => Object.keys(row).sort())).toEqual([
      ['series', 'trendX', 'trendY'],
      ['series', 'trendX', 'trendY'],
      ['series', 'trendX', 'trendY'],
      ['series', 'trendX', 'trendY'],
      ['series', 'trendX', 'trendY'],
      ['series', 'trendX', 'trendY'],
    ]);
  });

  it('过滤非有限对，但保留有效对', () => {
    const out = applyTransforms(
      [
        { time: 0, value: 1 },
        { time: 1, value: 'NA' },
        { time: Number.NaN, value: 99 },
        { time: 2, value: 5 },
      ],
      [smoothOperation({ kind: 'smooth', params: { x: 'time', y: 'value', sampleCount: 2, xAs: 'x', yAs: 'y' } })],
    ).rows;

    expect(out).toEqual([
      { x: 0, y: 1 },
      { x: 2, y: 5 },
    ]);
  });

  it('对于太少的有限对和垂直 x 方差，失败很大', () => {
    expect(
      () =>
        applyTransforms(
          [{ time: 1, value: 2 }],
          [smoothOperation({ kind: 'smooth', params: { x: 'time', y: 'value', xAs: 'x', yAs: 'y' } })],
        ).rows,
    ).toThrow(/finite|two/i);
    expect(
      () =>
        applyTransforms(
          [
            { time: 1, value: 2 },
            { time: 1, value: 4 },
          ],
          [smoothOperation({ kind: 'smooth', params: { x: 'time', y: 'value', xAs: 'x', yAs: 'y' } })],
        ).rows,
    ).toThrow(/variance|vertical|x/i);
  });

  it.each([
    ['quadratic', { kind: 'quadratic' }, 2],
    ['polynomial', { kind: 'polynomial', order: 4 }, 4],
  ])('当 %s 的度数加一对数少于时，明确报错', (_name, method, sampleSize) => {
    const insufficientRows = Array.from({ length: sampleSize }, (_, x) => ({ x, y: x ** 2 }));

    expect(
      () =>
        applyTransforms(insufficientRows, [
          smoothOperation({ kind: 'smooth', params: { x: 'x', y: 'y', method, xAs: 'trendX', yAs: 'trendY' } }),
        ]).rows,
    ).toThrow(/pairs|samples|degree|order/i);
  });

  it('对于秩不足的多项式输入，明确报错', () => {
    expect(
      () =>
        applyTransforms(
          [
            { x: 0, y: 1 },
            { x: 1, y: 2 },
            { x: 1, y: 3 },
            { x: 2, y: 5 },
          ],
          [
            smoothOperation({
              kind: 'smooth',
              params: {
                x: 'x',
                y: 'y',
                method: { kind: 'polynomial', order: 3 },
                xAs: 'trendX',
                yAs: 'trendY',
              },
            }),
          ],
        ).rows,
    ).toThrow(/rank|distinct|polynomial/i);
  });

  it('对于近似秩亏的六次多项式来说，失败很大', () => {
    const clusteredX = [0, 1e-12, 2e-12, 3e-12, 4e-12, 5e-12, 1];

    expect(
      () =>
        applyTransforms(
          clusteredX.map(x => ({ x, y: 1 + x })),
          [
            smoothOperation({
              kind: 'smooth',
              params: {
                x: 'x',
                y: 'y',
                method: { kind: 'polynomial', order: 6 },
                xAs: 'trendX',
                yAs: 'trendY',
              },
            }),
          ],
        ).rows,
    ).toThrow(/rank|polynomial/i);
  });

  it.each([
    [
      'logarithmic non-positive x',
      { kind: 'logarithmic' },
      [
        { x: 0, y: 1 },
        { x: 1, y: 2 },
      ],
    ],
    [
      'exponential non-positive y',
      { kind: 'exponential' },
      [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
      ],
    ],
    [
      'power non-positive x',
      { kind: 'power' },
      [
        { x: -1, y: 1 },
        { x: 1, y: 2 },
      ],
    ],
    [
      'power non-positive y',
      { kind: 'power' },
      [
        { x: 1, y: -1 },
        { x: 2, y: 2 },
      ],
    ],
  ])('%s 明确报错', (_name, method, invalidRows) => {
    expect(
      () =>
        applyTransforms(invalidRows, [
          smoothOperation({ kind: 'smooth', params: { x: 'x', y: 'y', method, xAs: 'trendX', yAs: 'trendY' } }),
        ]).rows,
    ).toThrow(/positive|domain|logarithmic|exponential|power/i);
  });

  it.each([
    [
      'logarithmic',
      { kind: 'logarithmic' },
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    ],
    [
      'power',
      { kind: 'power' },
      [
        { x: 1, y: 1 },
        { x: 2, y: 4 },
      ],
    ],
  ])('当 %s 采样范围包含非正 x 时，明确报错', (_name, method, validRows) => {
    expect(
      () =>
        applyTransforms(validRows, [
          smoothOperation({
            kind: 'smooth',
            params: {
              x: 'x',
              y: 'y',
              method,
              extent: [0, 2],
              xAs: 'trendX',
              yAs: 'trendY',
            },
          }),
        ]).rows,
    ).toThrow(/extent|positive|domain/i);
  });

  it('对于非有限系数和预测失败很大', () => {
    expect(
      () =>
        applyTransforms(
          [
            { x: -1e308, y: -1e308 },
            { x: 1e308, y: 1e308 },
          ],
          [smoothOperation({ kind: 'smooth', params: { x: 'x', y: 'y', xAs: 'trendX', yAs: 'trendY' } })],
        ).rows,
    ).toThrow(/finite|coefficient|variance/i);

    expect(
      () =>
        applyTransforms(
          [
            { x: 0, y: 1 },
            { x: 1, y: Math.E },
          ],
          [
            smoothOperation({
              kind: 'smooth',
              params: {
                x: 'x',
                y: 'y',
                method: { kind: 'exponential' },
                extent: [0, 1000],
                sampleCount: 2,
                xAs: 'trendX',
                yAs: 'trendY',
              },
            }),
          ],
        ).rows,
    ).toThrow(/finite|prediction|exponential/i);
  });

  it('中止整个分组变换并识别无效组', () => {
    expect(
      () =>
        applyTransforms(
          [
            { series: 'A', x: 1, y: 2 },
            { series: 'A', x: 2, y: 3 },
            { series: 'B', x: 0, y: 1 },
            { series: 'B', x: 2, y: 3 },
          ],
          [
            smoothOperation({
              kind: 'smooth',
              params: {
                x: 'x',
                y: 'y',
                groupBy: ['series'],
                method: { kind: 'logarithmic' },
                xAs: 'trendX',
                yAs: 'trendY',
              },
            }),
          ],
        ).rows,
    ).toThrow(/logarithmic.*series.*B/i);
  });

  it('记录组级种源索引', () => {
    const tagged = tagSourceIndex(rows);
    const out = applyTransforms(tagged, [
      smoothOperation({
        kind: 'smooth',
        params: {
          x: 'time',
          y: 'value',
          groupBy: ['series'],
          sampleCount: 2,
          xAs: 'trendX',
          yAs: 'trendY',
        },
      }),
    ]).rows;

    expect(readSourceIndices(out[0])).toEqual([0, 1, 2]);
    expect(readSourceIndices(out[2])).toEqual([3, 4, 5]);
  });

  it('拒绝自定义变换注册与平滑的冲突', () => {
    const collision = defineTransform({
      kind: 'smooth',
      paramsSchema: object({}),
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });

    expect(() => resolveTransformRegistry([collision])).toThrow(/duplicate transform registration/i);
  });
});
