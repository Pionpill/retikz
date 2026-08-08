import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRTheme, ResolvedTheme, ThemeModeValue, ThemeStyleValue } from '../../src';

import { SceneSchema, ScopeSchema, ThemeMode, ThemeSchema, ThemeStyle } from '../../src';

describe('Theme schema', () => {
  it('只公开 selector 词汇和派生类型', () => {
    expectTypeOf<ThemeStyleValue>().toEqualTypeOf<'neutral' | 'academic' | 'vibrant' | 'clean'>();
    expectTypeOf<ThemeModeValue>().toEqualTypeOf<'light' | 'dark'>();
    expectTypeOf<IRTheme>().toEqualTypeOf<{
      style?: ThemeStyleValue;
      mode?: ThemeModeValue;
      palettePreset?: ThemeStyleValue;
    }>();
    expectTypeOf<ResolvedTheme>().toMatchTypeOf<
      Readonly<{
        style: ThemeStyleValue;
        mode: ThemeModeValue;
        palettePreset: ThemeStyleValue;
      }>
    >();
  });

  it('接受 JSON-safe selector 并保持 round-trip', () => {
    const parsed = ThemeSchema.parse({
      style: ThemeStyle.Academic,
      mode: ThemeMode.Dark,
      palettePreset: ThemeStyle.Vibrant,
    });

    expect(parsed).toEqual({ style: 'academic', mode: 'dark', palettePreset: 'vibrant' });
    expect(ThemeSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    expect(ThemeSchema.parse({})).toEqual({});
  });

  it('拒绝遗留 token bag、未知字段与非法 selector', () => {
    expect(ThemeSchema.safeParse({ tokens: { core: { 'palette.categorical': ['#2563eb'] } } }).success).toBe(false);
    expect(ThemeSchema.safeParse({ palette: 'paper' }).success).toBe(false);
    expect(ThemeSchema.safeParse({ style: 'paper' }).success).toBe(false);
    expect(ThemeSchema.safeParse({ mode: 'system' }).success).toBe(false);
    expect(ThemeSchema.safeParse({ palettePreset: 'paper' }).success).toBe(false);
  });

  it('Scene 与 Scope 复用闭合 Theme schema', () => {
    const scene = SceneSchema.parse({
      type: 'scene',
      version: 1,
      theme: { style: ThemeStyle.Clean, mode: ThemeMode.Dark },
      children: [{ type: 'scope', theme: { palettePreset: ThemeStyle.Vibrant }, children: [] }],
    });

    expect(scene.theme).toEqual({ style: 'clean', mode: 'dark' });
    expect(ScopeSchema.parse(scene.children[0]).theme).toEqual({ palettePreset: 'vibrant' });
  });
});
