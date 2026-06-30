/**
 * ADR-01 / ADR-02 — ir/effects.ts schema 直测 + SHADOW_PRESETS 表完整性。
 * 全部 PASS（纯 schema / 常量层，无 compile 依赖）。
 */
import { describe, expect, it } from 'vitest';

import { BlendMode, DropShadowSchema, SHADOW_PRESETS, ShadowPreset } from '../../src/schemas/effects';

describe('[effects] DropShadowSchema accept/reject', () => {
  it('preset-only：{preset:"md"} → 过', () => {
    expect(DropShadowSchema.safeParse({ preset: 'md' }).success).toBe(true);
  });

  it('explicit offsets：{offsetX, offsetY} → 过', () => {
    expect(DropShadowSchema.safeParse({ offsetX: 1, offsetY: 2 }).success).toBe(true);
  });

  it('preset + override：{preset:"md", color, opacity} → 过', () => {
    expect(DropShadowSchema.safeParse({ preset: 'md', color: '#3b82f6', opacity: 0.5 }).success).toBe(true);
  });

  it('refine reject：{color:"red"}（无 preset 又无 offsets）→ 拒', () => {
    const res = DropShadowSchema.safeParse({ color: 'red' });
    expect(res.success).toBe(false);
  });

  it('refine reject：{offsetX:1}（缺 offsetY）→ 拒', () => {
    expect(DropShadowSchema.safeParse({ offsetX: 1 }).success).toBe(false);
  });

  it('reject nonfinite offset：offsetY=NaN → 拒', () => {
    expect(DropShadowSchema.safeParse({ offsetX: 1, offsetY: NaN }).success).toBe(false);
  });

  it('reject negative blur：blur=-1 → 拒', () => {
    expect(DropShadowSchema.safeParse({ offsetX: 1, offsetY: 1, blur: -1 }).success).toBe(false);
  });

  it('reject opacity out of range：opacity=2 → 拒', () => {
    expect(DropShadowSchema.safeParse({ offsetX: 1, offsetY: 1, opacity: 2 }).success).toBe(false);
  });

  it('reject unknown preset：{preset:"huge"} → 拒', () => {
    expect(DropShadowSchema.safeParse({ preset: 'huge' }).success).toBe(false);
  });
});

describe('[effects] SHADOW_PRESETS 表完整性', () => {
  it('每个 ShadowPreset 值都有表项', () => {
    for (const v of Object.values(ShadowPreset)) {
      expect(v in SHADOW_PRESETS).toBe(true);
    }
  });

  it('none → null（不产阴影）', () => {
    expect(SHADOW_PRESETS.none).toBeNull();
  });

  it('sm/md/lg/xl/2xl → offsetX=0 的 canonical IRDropShadow', () => {
    for (const key of ['sm', 'md', 'lg', 'xl', '2xl'] as const) {
      const s = SHADOW_PRESETS[key];
      expect(s).not.toBeNull();
      expect(s!.offsetX).toBe(0);
      expect(typeof s!.offsetY).toBe('number');
      expect(typeof s!.blur).toBe('number');
      expect(typeof s!.color).toBe('string');
    }
  });

  it('每个非 null 表项本身能过 DropShadowSchema', () => {
    for (const key of ['sm', 'md', 'lg', 'xl', '2xl'] as const) {
      expect(DropShadowSchema.safeParse(SHADOW_PRESETS[key]).success).toBe(true);
    }
  });
});

describe('[effects] BlendMode 枚举', () => {
  it('恰好 16 个分离模式', () => {
    expect(Object.values(BlendMode)).toHaveLength(16);
  });

  it('含 normal + 15 个非 normal 模式', () => {
    const values = Object.values(BlendMode);
    expect(values).toContain('normal');
    expect(values).toContain('multiply');
    expect(values).toContain('luminosity');
  });
});
