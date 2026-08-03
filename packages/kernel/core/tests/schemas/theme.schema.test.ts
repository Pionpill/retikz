import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRTheme, ResolvedTheme, ThemeModeValue, ThemeStyleValue } from '../../src';

import { SceneSchema, ScopeSchema, ThemeMode, ThemeSchema, ThemeStyle } from '../../src';

describe('Theme schema', () => {
  it('公开闭合的 style / mode 词汇与派生类型', () => {
    expect(ThemeStyle).toEqual({
      Neutral: 'neutral',
      Academic: 'academic',
      Vibrant: 'vibrant',
      Clean: 'clean',
    });
    expect(ThemeMode).toEqual({ Light: 'light', Dark: 'dark' });
    expectTypeOf<ThemeStyleValue>().toEqualTypeOf<'neutral' | 'academic' | 'vibrant' | 'clean'>();
    expectTypeOf<ThemeModeValue>().toEqualTypeOf<'light' | 'dark'>();
    expectTypeOf<IRTheme>().toEqualTypeOf<{ style?: ThemeStyleValue; mode?: ThemeModeValue }>();
    expectTypeOf<ResolvedTheme>().toEqualTypeOf<Readonly<{ style: ThemeStyleValue; mode: ThemeModeValue }>>();
  });

  it('接受 sparse Theme 并保持 JSON roundtrip', () => {
    const parsed = ThemeSchema.parse({ style: ThemeStyle.Academic });

    expect(parsed).toEqual({ style: 'academic' });
    expect(ThemeSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    expect(ThemeSchema.parse({})).toEqual({});
  });

  it('拒绝未知字段和非法 style / mode', () => {
    expect(ThemeSchema.safeParse({ palette: 'paper' }).success).toBe(false);
    expect(ThemeSchema.safeParse({ style: 'paper' }).success).toBe(false);
    expect(ThemeSchema.safeParse({ mode: 'system' }).success).toBe(false);

    const protoTheme = {};
    Object.defineProperty(protoTheme, '__proto__', { value: 'paper', enumerable: true });
    const protoResult = ThemeSchema.safeParse(protoTheme);
    expect(protoResult.success).toBe(false);
    if (!protoResult.success) expect(protoResult.error.issues[0]?.path).toEqual(['__proto__']);
  });

  it('拒绝 class与非普通对象，并且不读取继承字段', () => {
    class ThemeInstance {
      style = ThemeStyle.Academic;
    }

    expect(ThemeSchema.safeParse(new Date()).success).toBe(false);
    expect(ThemeSchema.safeParse(new Map()).success).toBe(false);
    expect(ThemeSchema.safeParse(new Set()).success).toBe(false);
    expect(ThemeSchema.safeParse(new ThemeInstance()).success).toBe(false);
    expect(ThemeSchema.safeParse(Object.create({ style: ThemeStyle.Academic })).success).toBe(false);
    expect(ThemeSchema.safeParse(Object.create(null)).success).toBe(true);
  });

  it('拒绝无法无损 JSON 序列化的普通对象字段，并且不执行 accessor', () => {
    const symbolTheme = { style: ThemeStyle.Academic, [Symbol('hidden')]: true };
    const hiddenTheme = { style: ThemeStyle.Academic };
    Object.defineProperty(hiddenTheme, 'hidden', { value: true, enumerable: false });
    let accessorReads = 0;
    const accessorTheme = {};
    Object.defineProperty(accessorTheme, 'style', {
      enumerable: true,
      get: () => {
        accessorReads += 1;
        return ThemeStyle.Academic;
      },
    });

    expect(ThemeSchema.safeParse(symbolTheme).success).toBe(false);
    expect(ThemeSchema.safeParse(hiddenTheme).success).toBe(false);
    expect(ThemeSchema.safeParse(accessorTheme).success).toBe(false);
    expect(accessorReads).toBe(0);
    expect(ThemeSchema.safeParse({ style: undefined }).success).toBe(false);
  });

  it('Scene 与 Scope 复用同一严格 Theme schema并保留错误路径', () => {
    const scene = SceneSchema.parse({
      type: 'scene',
      version: 1,
      theme: { style: ThemeStyle.Clean, mode: ThemeMode.Dark },
      children: [{ type: 'scope', theme: { mode: ThemeMode.Light }, children: [] }],
    });

    expect(scene.theme).toEqual({ style: 'clean', mode: 'dark' });
    expect(ScopeSchema.parse(scene.children[0]).theme).toEqual({ mode: 'light' });

    const invalidScene = SceneSchema.safeParse({
      type: 'scene',
      version: 1,
      theme: { style: 'paper' },
      children: [],
    });
    expect(invalidScene.success).toBe(false);
    if (!invalidScene.success) expect(invalidScene.error.issues[0]?.path).toEqual(['theme', 'style']);

    const invalidScope = ScopeSchema.safeParse({
      type: 'scope',
      theme: { mode: 'system' },
      children: [],
    });
    expect(invalidScope.success).toBe(false);
    if (!invalidScope.success) expect(invalidScope.error.issues[0]?.path).toEqual(['theme', 'mode']);
  });
});
