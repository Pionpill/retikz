import { describe, expect, it } from 'vitest';

import { DropShadowSchema } from '../../src/schemas';

describe('阴影的预设与显式偏移选择', () => {
  it('允许仅由预设提供阴影参数', () => {
    expect(DropShadowSchema.safeParse({ preset: 'md' }).success).toBe(true);
  });

  it('没有预设时允许显式双轴偏移，包括零值', () => {
    expect(DropShadowSchema.safeParse({ offsetX: 0, offsetY: 0 }).success).toBe(true);
  });

  it('仅提供颜色不能代替预设或双轴偏移', () => {
    const res = DropShadowSchema.safeParse({ color: 'red' });

    expect(res.success).toBe(false);
  });

  it('没有预设时不能只提供一个轴向偏移', () => {
    expect(DropShadowSchema.safeParse({ offsetX: 1 }).success).toBe(false);
  });
});
