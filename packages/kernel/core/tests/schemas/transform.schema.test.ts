import { describe, expect, it } from 'vitest';

import { OffsetPositionSchema, PolarPositionSchema, TransformSchema } from '../../src/schemas';

describe('引用式平移输入', () => {
  it('保留嵌套极坐标与负半径，并逐层移除未知字段', () => {
    const position = {
      origin: { origin: [10, 20], angle: 90, radius: 5, extra: true },
      angle: 180,
      radius: -10,
      extra: true,
    };
    const expected = { origin: { origin: [10, 20], angle: 90, radius: 5 }, angle: 180, radius: -10 };

    expect(PolarPositionSchema.parse(position)).toEqual(expected);
    expect(TransformSchema.parse({ kind: 'polar-translate', ...position })).toEqual({
      kind: 'polar-translate',
      ...expected,
    });
  });

  it('插值平移保留嵌套插值与极坐标端点', () => {
    const input = {
      kind: 'between-translate',
      between: [
        { between: [{ id: 'A' }, [10, 20]], fraction: 0.25 },
        { origin: { angle: 90, radius: 10 }, angle: 0, radius: 5 },
      ],
      fraction: 0.5,
    };

    expect(TransformSchema.parse(input)).toEqual(input);
    expect(TransformSchema.safeParse({ ...input, fraction: 1.5 }).success).toBe(false);
    expect(TransformSchema.safeParse({ ...input, between: [{ relative: [1, 2] }, [10, 20]] }).success).toBe(false);
  });

  it('偏移平移允许省略 offset，偏移位置仍要求显式 offset', () => {
    expect(TransformSchema.parse({ kind: 'offset-translate', of: 'A' })).toEqual({
      kind: 'offset-translate',
      of: 'A',
    });
    expect(OffsetPositionSchema.safeParse({ of: 'A' }).success).toBe(false);
    expect(TransformSchema.parse({ kind: 'offset-translate', of: 'A', offset: [0, 0] })).toEqual({
      kind: 'offset-translate',
      of: 'A',
      offset: [0, 0],
    });
  });
});
