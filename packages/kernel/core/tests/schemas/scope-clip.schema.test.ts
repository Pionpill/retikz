import { describe, expect, it } from 'vitest';

import { ClipSchema } from '../../src/schemas';

describe('ClipSchema 合法形态', () => {
  it('自定义参数内的 kind 不覆盖外层注册身份', () => {
    const source = { kind: 'custom', params: { kind: 'payload-kind', nested: { values: [1, null, true] } } };
    expect(ClipSchema.parse(source)).toEqual(source);
  });
});

describe('ClipSchema 退化 / 非法形态拒绝', () => {
  it('内置矩形不能通过开放裁剪分支绕过参数校验', () => {
    const parsed = ClipSchema.safeParse({ kind: 'rect', params: { x: 0, y: 0, width: -5, height: 30 } });

    expect(parsed.success).toBe(false);
  });
});
