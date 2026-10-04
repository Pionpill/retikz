import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';

import * as layout from '../../src';
import { LayoutRowColumnGapSchema } from '../../src';

describe('LayoutGapSchema', () => {
  it('从 Layout 根入口公开非负布局间距原子', () => {
    const schema = (layout as Record<string, unknown>).LayoutGapSchema as ZodType<number> | undefined;

    expect(schema).toBeDefined();
    expect(schema?.parse(0)).toBe(0);
    expect(schema?.parse(6)).toBe(6);
    expect(schema?.safeParse(-1).success).toBe(false);
  });
});

describe('LayoutRowColumnGapSchema', () => {
  it('保留统一间距、独立行列间距与显式零，不物化默认值', () => {
    expect(LayoutRowColumnGapSchema.parse(0)).toBe(0);
    expect(LayoutRowColumnGapSchema.parse(6)).toBe(6);
    expect(LayoutRowColumnGapSchema.parse({ row: 0, column: 4 })).toEqual({ row: 0, column: 4 });
    expect(LayoutRowColumnGapSchema.safeParse(undefined).success).toBe(false);
  });

  it.each([
    -1,
    Infinity,
    NaN,
    null,
    { row: 1 },
    { row: -1, column: 2 },
    { row: 1, column: Infinity },
    { row: 1, column: 2, extra: 3 },
  ])('拒绝不完整或非法间距 %j', value => {
    expect(LayoutRowColumnGapSchema.safeParse(value).success).toBe(false);
  });
});
