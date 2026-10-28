import { describe, expect, it } from 'vitest';
import { object } from 'zod';

import type { ExternalRow } from '../../src';
import {
  applyTransforms as applyDataTransforms,
  defineTransform,
  readSourceIndices,
  tagSourceIndex,
  resolveTransformRegistry,
  TransformSchema,
} from '../../src';

const applyTransforms = (
  rows: Array<ExternalRow>,
  operations?: Parameters<typeof applyDataTransforms>[1],
  options?: Parameters<typeof applyDataTransforms>[2],
): Array<ExternalRow> => applyDataTransforms(rows, operations, options).rows;

const densityOperation = (operation: unknown) => TransformSchema.parse(operation);

describe('密度变换 schema（契约）', () => {
  it('接受密度变换并保留 JSON 往返', () => {
    const operation = {
      kind: 'density',
      params: {
        field: 'value',
        groupBy: ['species'],
        bandwidth: { kind: 'silverman' },
        sampleCount: 96,
        extent: [0, 10],
        xAs: 'densityX',
        densityAs: 'density',
      },
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('拒绝具有有用的 zod 错误的畸形密度 JSON', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'density',
        params: { field: 'value', sampleCount: 1, xAs: 'x', densityAs: 'density' },
      }),
    ).toThrow();
    expect(() =>
      TransformSchema.parse({
        kind: 'density',
        params: { field: 'value', extent: [4, 4], xAs: 'x', densityAs: 'density' },
      }),
    ).toThrow();
    expect(() =>
      TransformSchema.parse({
        kind: 'density',
        params: {
          field: 'value',
          bandwidth: { kind: 'value', value: -1 },
          xAs: 'x',
          densityAs: 'density',
        },
      }),
    ).toThrow();
  });
});

describe('密度变换行为（契约）', () => {
  const rows: Array<ExternalRow> = [
    { species: 'setosa', value: 0 },
    { species: 'setosa', value: 4 },
    { species: 'virginica', value: 10 },
    { species: 'virginica', value: 14 },
  ];

  it('计算显式范围内的显式带宽密度样本', () => {
    const out = applyTransforms(rows.slice(0, 2), [
      densityOperation({
        kind: 'density',
        params: {
          field: 'value',
          bandwidth: { kind: 'value', value: 2 },
          sampleCount: 5,
          extent: [0, 8],
          xAs: 'densityX',
          densityAs: 'density',
        },
      }),
    ]);

    expect(out.map(row => row.densityX)).toEqual([0, 2, 4, 6, 8]);
    expect(out).toHaveLength(5);
    expect(out.every(row => typeof row.density === 'number' && Number.isFinite(row.density) && row.density >= 0)).toBe(
      true,
    );
    expect(out[0].density).toBeCloseTo(out[2].density as number, 6);
    expect(out[1].density).toBeGreaterThan(out[4].density as number);
  });

  it('默认使用 Silverman 带宽并发出排序样本', () => {
    const out = applyTransforms(
      [{ value: 0 }, { value: 1 }, { value: 2 }, { value: 4 }, { value: 8 }],
      [densityOperation({ kind: 'density', params: { field: 'value', xAs: 'densityX', densityAs: 'density' } })],
    );

    expect(out).toHaveLength(64);
    expect(out[0].densityX).toBeLessThan(0);

    for (let index = 1; index < out.length; index++) {
      expect(out[index].densityX as number).toBeGreaterThan(out[index - 1].densityX as number);
    }

    expect(out.every(row => Number.isFinite(row.density))).toBe(true);
  });

  it('独立计算每个组的密度并保留组键', () => {
    const out = applyTransforms(rows, [
      densityOperation({
        kind: 'density',
        params: {
          field: 'value',
          groupBy: ['species'],
          bandwidth: { kind: 'value', value: 2 },
          sampleCount: 3,
          xAs: 'densityX',
          densityAs: 'density',
        },
      }),
    ]);

    expect(out).toHaveLength(6);
    expect(out.filter(row => row.species === 'setosa')).toHaveLength(3);
    expect(out.filter(row => row.species === 'virginica')).toHaveLength(3);
    expect(out.map(row => Object.keys(row).sort())).toEqual([
      ['density', 'densityX', 'species'],
      ['density', 'densityX', 'species'],
      ['density', 'densityX', 'species'],
      ['density', 'densityX', 'species'],
      ['density', 'densityX', 'species'],
      ['density', 'densityX', 'species'],
    ]);
  });

  it('允许单值和同值组的显式带宽', () => {
    const single = applyTransforms(
      [{ value: 5 }],
      [
        densityOperation({
          kind: 'density',
          params: {
            field: 'value',
            bandwidth: { kind: 'value', value: 1 },
            sampleCount: 3,
            xAs: 'x',
            densityAs: 'd',
          },
        }),
      ],
    );

    expect(single.map(row => row.x)).toEqual([2, 5, 8]);
    expect(single[1].d).toBeGreaterThan(single[0].d as number);

    const identical = applyTransforms(
      [{ value: 4 }, { value: 4 }],
      [
        densityOperation({
          kind: 'density',
          params: {
            field: 'value',
            bandwidth: { kind: 'value', value: 2 },
            sampleCount: 2,
            xAs: 'x',
            densityAs: 'd',
          },
        }),
      ],
    );

    expect(identical.map(row => row.x)).toEqual([-2, 10]);
  });

  it('当无法计算默认 Silverman 带宽时，会失败', () => {
    expect(() =>
      applyTransforms(
        [{ value: 5 }],
        [densityOperation({ kind: 'density', params: { field: 'value', xAs: 'x', densityAs: 'd' } })],
      ),
    ).toThrow(/bandwidth|sample/i);
    expect(() =>
      applyTransforms(
        [{ value: 5 }, { value: 5 }],
        [densityOperation({ kind: 'density', params: { field: 'value', xAs: 'x', densityAs: 'd' } })],
      ),
    ).toThrow(/bandwidth|identical/i);
    expect(() =>
      applyTransforms(
        [{ value: 'NA' }],
        [densityOperation({ kind: 'density', params: { field: 'value', xAs: 'x', densityAs: 'd' } })],
      ),
    ).toThrow(/finite/i);
  });

  it('记录组级种源索引', () => {
    const tagged = tagSourceIndex(rows);
    const out = applyTransforms(tagged, [
      densityOperation({
        kind: 'density',
        params: {
          field: 'value',
          groupBy: ['species'],
          bandwidth: { kind: 'value', value: 2 },
          sampleCount: 2,
          xAs: 'densityX',
          densityAs: 'density',
        },
      }),
    ]);

    expect(readSourceIndices(out[0])).toEqual([0, 1]);
    expect(readSourceIndices(out[2])).toEqual([2, 3]);
  });

  it('拒绝自定义变换注册与密度的冲突', () => {
    const collision = defineTransform({
      kind: 'density',
      paramsSchema: object({}),
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });

    expect(() => resolveTransformRegistry([collision])).toThrow(/duplicate transform registration/i);
  });
});
