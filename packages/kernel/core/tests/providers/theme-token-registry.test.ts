import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { AnyThemeTokenDefinition, IRCoreThemeTokenOverrides } from '../../src';

import {
  categoricalColorAt,
  CoreThemeTokenDefinition,
  defineCoreThemeTokens,
  defineThemeTokenNamespace,
  resolveCoreThemeColors,
  resolveThemeTokenRegistry,
  ThemeMode,
  ThemeStyle,
} from '../../src';

const plotSchema = z.strictObject({
  'surface.background': z.string().optional(),
});

describe('Theme token definition registry', () => {
  it('拒绝未冻结 definition，并让已注册 identity 的 namespace/schema 不可被后续输入修改', () => {
    const mutable: AnyThemeTokenDefinition = { namespace: 'mutable-owner', schema: plotSchema };

    expect(() => resolveThemeTokenRegistry([mutable])).toThrow(/mutable-owner.*frozen|frozen.*mutable-owner/i);

    const frozen = Object.freeze(mutable);
    const registry = resolveThemeTokenRegistry([frozen, frozen]);

    expect(Reflect.set(mutable, 'namespace', 'mutated-owner')).toBe(false);
    expect(Reflect.set(mutable, 'schema', z.strictObject({ changed: z.string() }))).toBe(false);
    expect(registry.get('mutable-owner')).toBe(frozen);
    expect(registry.get('mutable-owner')?.namespace).toBe('mutable-owner');
    expect(registry.get('mutable-owner')?.schema).toBe(plotSchema);
    expect(registry.has('mutated-owner')).toBe(false);
  });

  it('registers Core built-in first, deduplicates the same definition identity, and preserves order', () => {
    const plot = defineThemeTokenNamespace({ namespace: 'plot', schema: plotSchema });

    const registry = resolveThemeTokenRegistry([CoreThemeTokenDefinition, plot, plot, CoreThemeTokenDefinition]);

    expect([...registry.keys()]).toEqual(['core', 'plot']);
    expect(registry.get('core')).toBe(CoreThemeTokenDefinition);
    expect(registry.get('plot')).toBe(plot);
  });

  it('fails loudly when the same namespace is supplied by a different definition identity', () => {
    const first = defineThemeTokenNamespace({ namespace: 'plot', schema: plotSchema });
    const conflict = defineThemeTokenNamespace({ namespace: 'plot', schema: plotSchema });

    expect(() => resolveThemeTokenRegistry([first, conflict])).toThrow(/plot.*first.*conflict|plot.*conflict.*first/i);
  });

  it('rejects a second non-Core definition under the built-in core namespace', () => {
    const conflict = defineThemeTokenNamespace({ namespace: 'core', schema: plotSchema });

    expect(() => resolveThemeTokenRegistry([conflict])).toThrow(/core.*conflict/i);
  });

  it('exposes a strict Core schema for sparse semantic and categorical overrides', () => {
    expect(CoreThemeTokenDefinition.schema.safeParse({ 'semantic.error': '#dc2626' }).success).toBe(true);
    expect(CoreThemeTokenDefinition.schema.safeParse({ unknown: '#ffffff' }).success).toBe(false);
    expect(CoreThemeTokenDefinition.schema.safeParse({ 'palette.categorical': [] }).success).toBe(false);
    expect(CoreThemeTokenDefinition.schema.safeParse({ 'semantic.error': undefined }).success).toBe(false);
  });
});

describe('Core shared theme colors', () => {
  it.each([
    [ThemeStyle.Neutral, ThemeMode.Light],
    [ThemeStyle.Neutral, ThemeMode.Dark],
    [ThemeStyle.Academic, ThemeMode.Light],
    [ThemeStyle.Academic, ThemeMode.Dark],
    [ThemeStyle.Vibrant, ThemeMode.Light],
    [ThemeStyle.Vibrant, ThemeMode.Dark],
    [ThemeStyle.Clean, ThemeMode.Light],
    [ThemeStyle.Clean, ThemeMode.Dark],
  ])('resolves a complete frozen semantic/categorical view for %s + %s', (style, mode) => {
    const colors = resolveCoreThemeColors(style, mode);

    expect(colors.semantic.error).toEqual(expect.any(String));
    expect(colors.semantic.success).toEqual(expect.any(String));
    expect(colors.semantic.warning).toEqual(expect.any(String));
    expect(colors.categorical.length).toBeGreaterThan(0);
    expect(Object.isFrozen(colors)).toBe(true);
    expect(Object.isFrozen(colors.semantic)).toBe(true);
    expect(Object.isFrozen(colors.categorical)).toBe(true);
  });

  it('applies Core overrides without mutating the preset or caller input', () => {
    const overrides: IRCoreThemeTokenOverrides = {
      'semantic.warning': '#f59e0b',
      'palette.categorical': ['#111111', '#222222'],
    };
    const before = structuredClone(overrides);
    const baseline = resolveCoreThemeColors(ThemeStyle.Neutral, ThemeMode.Light);
    const resolved = resolveCoreThemeColors(ThemeStyle.Neutral, ThemeMode.Light, overrides);

    expect(resolved.semantic.warning).toBe('#f59e0b');
    expect(resolved.categorical).toEqual(['#111111', '#222222']);
    expect(overrides).toEqual(before);
    expect(baseline.categorical).not.toEqual(resolved.categorical);
    expect(Object.isFrozen(resolved.categorical)).toBe(true);
  });

  it('creates a frozen Core contribution without carrying provider schema or runtime objects', () => {
    const contribution = defineCoreThemeTokens({ 'semantic.success': '#22c55e' });

    expect(contribution).toEqual({ namespace: 'core', tokens: { 'semantic.success': '#22c55e' } });
    expect(Object.isFrozen(contribution)).toBe(true);
    expect(Object.isFrozen(contribution.tokens)).toBe(true);
    expect(JSON.stringify(contribution)).toBe('{"namespace":"core","tokens":{"semantic.success":"#22c55e"}}');
  });
});

describe('categoricalColorAt', () => {
  it('uses stable non-negative modulo selection', () => {
    const palette = ['#111111', '#222222', '#333333'] as const;

    expect(categoricalColorAt(palette, 0)).toBe('#111111');
    expect(categoricalColorAt(palette, 2)).toBe('#333333');
    expect(categoricalColorAt(palette, 3)).toBe('#111111');
    expect(categoricalColorAt(palette, 8)).toBe('#333333');
  });

  it.each([
    ['empty palette', [], 0],
    ['negative index', ['#111111'], -1],
    ['fractional index', ['#111111'], 0.5],
    ['infinite index', ['#111111'], Number.POSITIVE_INFINITY],
  ])('rejects %s', (_label, palette, index) => {
    expect(() => categoricalColorAt(palette, index)).toThrow();
  });
});
