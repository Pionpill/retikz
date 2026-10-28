import { describe, expect, it } from 'vitest';

import { CustomPositionAdjustmentSchema, MarkSchema, PointMarkSchema } from '../../src/schemas';

const point = { type: 'point', encodings: { position: { x: { field: 'category' }, y: { field: 'value' } } } };

describe('位置调整方案', () => {
  it('接受 Point 上的 JSON 安全数字和比率抖动', () => {
    const operations = [
      { kind: 'jitter', role: 'x', span: 12, seed: 7 },
      { kind: 'jitter', span: { kind: 'ratio', value: 1 } },
    ];
    const parsed = PointMarkSchema.parse({ ...point, properties: { placement: { adjustments: operations } } });

    expect(JSON.parse(JSON.stringify(parsed.properties?.placement?.adjustments))).toEqual(operations);
  });

  it('接受均匀且正态的抖动分布作为 JSON 安全值', () => {
    const operations = [
      { kind: 'jitter', role: 'x', distribution: { kind: 'uniform' } },
      { kind: 'jitter', role: 'x', distribution: { kind: 'normal' } },
      { kind: 'jitter', role: 'x', distribution: { kind: 'normal', sigma: 0.75 } },
    ];
    const parsed = PointMarkSchema.parse({ ...point, properties: { placement: { adjustments: operations } } });

    expect(JSON.parse(JSON.stringify(parsed.properties?.placement?.adjustments))).toEqual(operations);
  });

  it('拒绝未知的分布字段、种类和无效的正态西格玛', () => {
    const invalidOperations = [
      { kind: 'jitter', distribution: { kind: 'uniform', sigma: 0.5 } },
      { kind: 'jitter', distribution: { kind: 'normal', extra: true } },
      { kind: 'jitter', distribution: { kind: 'exponential' } },
      { kind: 'jitter', distribution: { kind: 'normal', sigma: 0 } },
      { kind: 'jitter', distribution: { kind: 'normal', sigma: -1 } },
      { kind: 'jitter', distribution: { kind: 'normal', sigma: Number.NaN } },
      { kind: 'jitter', distribution: { kind: 'normal', sigma: Number.POSITIVE_INFINITY } },
    ];

    for (const operation of invalidOperations) {
      expect(() =>
        PointMarkSchema.parse({ ...point, properties: { placement: { adjustments: [operation] } } }),
      ).toThrow();
    }
  });

  it('拒绝无效比率和额外的内置字段', () => {
    expect(() =>
      PointMarkSchema.parse({
        ...point,
        properties: { placement: { adjustments: [{ kind: 'jitter', span: { kind: 'ratio', value: 1.01 } }] } },
      }),
    ).toThrow();
    expect(() =>
      PointMarkSchema.parse({
        ...point,
        properties: { placement: { adjustments: [{ kind: 'jitter', span: 1, extra: true }] } },
      }),
    ).toThrow();
  });

  it('保留自定义 JSON 操作并拒绝非 JSON 值', () => {
    const parsed = PointMarkSchema.parse({
      ...point,
      properties: { placement: { adjustments: [{ kind: 'screen-nudge', dx: 4 }] } },
    });

    expect(parsed.properties?.placement?.adjustments).toEqual([{ kind: 'screen-nudge', dx: 4 }]);
    expect(() =>
      PointMarkSchema.parse({
        ...point,
        properties: { placement: { adjustments: [{ kind: 'screen-nudge', callback: () => 1 }] } },
      }),
    ).toThrow();
  });

  it('通过本机 Zod 包罗万象的路径报告自定义非 JSON 叶', () => {
    const result = CustomPositionAdjustmentSchema.safeParse({
      kind: 'screen-nudge',
      payload: { nested: [0, { bad: BigInt(1) }] },
    });

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues.at(0)?.path).toEqual(['payload']);
  });

  it('不向不支持的内置标记添加放置', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: { position: { x: { field: 'category' }, y: { field: 'value' } } },
        properties: {
          bounds: { x: { kind: 'band' }, y: { kind: 'extent', start: 0, end: 'value' } },
          placement: { adjustments: [{ kind: 'jitter', role: 'x' }] },
        },
      }),
    ).toThrow();
  });
});
