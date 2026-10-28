import { describe, expect, it } from 'vitest';

import { TexContentSchema } from '../../src/schemas';

describe('[tex-schema] TexContentSchema（lowerTex 有效负载）', () => {
  it('接受 tex 源', () => {
    expect(TexContentSchema.safeParse({ tex: '\\frac{a}{b}' }).success).toBe(true);
  });

  it('接受 displayMode', () => {
    const result = TexContentSchema.safeParse({ tex: 'E=mc^2', displayMode: true });

    expect(result.success).toBe(true);

    if (result.success) expect(result.data).toEqual({ tex: 'E=mc^2', displayMode: true });
  });

  it('允许空源以降低编译时性能', () => {
    expect(TexContentSchema.safeParse({ tex: '' }).success).toBe(true);
  });

  it('拒绝缺少 tex 的输入', () => {
    expect(TexContentSchema.safeParse({ displayMode: false }).success).toBe(false);
  });

  it('拒绝非字符串文本', () => {
    expect(TexContentSchema.safeParse({ tex: 123 }).success).toBe(false);
  });

  it('拒绝非布尔值 displayMode', () => {
    expect(TexContentSchema.safeParse({ tex: 'x', displayMode: 'yes' }).success).toBe(false);
  });
});
