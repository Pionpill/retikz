import { describe, expect, it } from 'vitest';

import { SceneSchema, ScopeSchema, ThemeMode, ThemeSchema } from '../../src';

describe('主题 schema', () => {
  it('接受 JSON-safe selector 并保持 round-trip', () => {
    const parsed = ThemeSchema.parse({
      name: 'academic',
      mode: ThemeMode.Dark,
    });

    expect(parsed).toEqual({ name: 'academic', mode: 'dark' });
    expect(ThemeSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    expect(ThemeSchema.parse({})).toEqual({});
  });

  it('拒绝遗留 token bag、未知字段与非法 selector', () => {
    expect(ThemeSchema.safeParse({ tokens: { core: { 'palette.categorical': ['#2563eb'] } } }).success).toBe(false);
    expect(ThemeSchema.safeParse({ palette: 'paper' }).success).toBe(false);
    expect(ThemeSchema.safeParse({ style: 'paper' }).success).toBe(false);
    expect(ThemeSchema.safeParse({ name: 'paper' }).success).toBe(true);
    expect(ThemeSchema.safeParse({ name: '' }).success).toBe(false);
    expect(ThemeSchema.safeParse({ mode: 'system' }).success).toBe(false);
    expect(ThemeSchema.safeParse({ palettePreset: 'vibrant' }).success).toBe(false);
  });

  it('由 strict owner schema 投影具有相同字段的 class instance', () => {
    class ThemeInput {
      name = 'clean';
      mode = ThemeMode.Dark;
    }

    const parsed = ThemeSchema.parse(new ThemeInput());

    expect(parsed).toEqual({ name: 'clean', mode: ThemeMode.Dark });
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
  });

  it('Scene 与 Scope 复用闭合 Theme schema', () => {
    const scene = SceneSchema.parse({
      type: 'scene',
      version: 1,
      theme: { name: 'clean', mode: ThemeMode.Dark },
      children: [{ type: 'scope', theme: { mode: ThemeMode.Light }, children: [] }],
    });

    expect(scene.theme).toEqual({ name: 'clean', mode: 'dark' });
    expect(ScopeSchema.parse(scene.children[0]).theme).toEqual({ mode: 'light' });
  });
});
