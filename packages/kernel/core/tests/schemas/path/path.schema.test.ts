import { describe, expect, it } from 'vitest';

import { PathSchema, StrokePathSchema } from '../../../src';

describe('路径能力输入边界', () => {
  it('开放宿主保留自定义参数，内置描边单独要求步骤且拒绝能力选项', () => {
    const custom = { type: 'path', kind: 'custom', kindOptions: { width: 12 } };
    expect(PathSchema.parse(custom)).toEqual(custom);

    const stroke = { type: 'path', children: [{ type: 'step', kind: 'move', to: [0, 0] }] };
    expect(StrokePathSchema.parse(stroke)).toEqual(stroke);
    expect(StrokePathSchema.safeParse({ type: 'path' }).success).toBe(false);
    expect(StrokePathSchema.safeParse({ ...stroke, kindOptions: {} }).success).toBe(false);
  });
});
