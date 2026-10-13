import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  defineTableThemeStyle,
  getDefaultTableDefaults,
  mergeTableDefaults,
  resolveTableThemeDefaults,
  RetikzTableErrorCode,
  TableDefaultsSchema,
} from '../../src';

const lightTheme = {
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
} as const;

describe('Table Source defaults resolution', () => {
  it('defaults to the light baseline and records the neutral source layer', () => {
    const resolved = resolveTableThemeDefaults();

    expect(resolved.defaults).toMatchObject(getDefaultTableDefaults(ThemeMode.Light));
    expect(resolved.defaults.defaultVisual?.categorical).toEqual(lightTheme.colors.categorical);
    expect(resolved.layers).toMatchObject([
      {
        kind: 'neutral',
        path: '$default/light',
        defaults: { defaultVisual: { categorical: lightTheme.colors.categorical } },
      },
    ]);
    expect(resolved.layers).toHaveLength(1);
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.defaults)).toBe(true);
    expect(Object.isFrozen(resolved.layers)).toBe(true);
  });

  it('merges sparse Source defaults by formal groups while detaching inputs', () => {
    const categorical = ['pink', 'purple'];
    const patch = TableDefaultsSchema.parse({
      defaultAppearance: {
        body: {
          background: { fill: '#f8fafc' },
          content: { defaults: { style: { color: '#123456' } } },
        },
      },
      defaultVisual: { categorical },
    });
    const resolved = mergeTableDefaults(getDefaultTableDefaults(ThemeMode.Light), patch);

    expect(resolved.defaultAppearance?.body).toMatchObject({
      background: { fill: '#f8fafc' },
      content: { defaults: { style: { color: '#123456' } } },
    });
    expect(resolved.defaultAppearance?.columnHeader?.content?.defaults?.style?.color).toBe('#71717a');
    expect(resolved.defaultVisual?.categorical).toEqual(['pink', 'purple']);

    categorical[0] = 'mutated';

    expect(resolved.defaultVisual?.categorical).toEqual(['pink', 'purple']);
  });

  it('atomically replaces same-kind borders and removes null-cleared defaults', () => {
    const base = TableDefaultsSchema.parse({
      defaultAppearance: {
        body: {
          background: { fill: '#ffffff', fillOpacity: 0.5 },
          content: {
            defaults: {
              style: { color: '#111111' },
              node: { layout: { padding: 2 }, style: { font: { family: 'serif', weight: 500 } } },
            },
          },
        },
      },
      layout: { borders: { horizontal: { kind: 'line', stroke: '#111111', width: 5 } } },
      defaultVisual: { categorical: ['red'], sequential: ['white', 'black'] },
    });
    const patch = TableDefaultsSchema.parse({
      defaultAppearance: {
        body: {
          background: { fill: null, fillOpacity: 0 },
          content: {
            defaults: { style: { color: null }, node: { layout: { padding: 4 }, style: { font: { weight: null } } } },
          },
        },
      },
      layout: { borders: { horizontal: { kind: 'line', stroke: 'red' } } },
      defaultVisual: { categorical: null },
    });

    expect(mergeTableDefaults(base, patch)).toEqual({
      defaultAppearance: {
        body: {
          background: { fillOpacity: 0 },
          content: { defaults: { node: { layout: { padding: 4 }, style: { font: { family: 'serif' } } } } },
        },
      },
      layout: { borders: { horizontal: { kind: 'line', stroke: 'red' } } },
      defaultVisual: { sequential: ['white', 'black'] },
    });
  });

  it('accepts an empty defaultTable no-op but rejects empty nested defaults groups', () => {
    expect(TableDefaultsSchema.parse({})).toEqual({});

    for (const invalid of [
      { defaultAppearance: {} },
      { defaultAppearance: { body: {} } },
      { defaultAppearance: { body: { background: {} } } },
      { layout: {} },
      { layout: { borders: {} } },
      { defaultVisual: {} },
    ]) {
      expect(() => TableDefaultsSchema.parse(invalid)).toThrow(/at least one field/i);
    }
  });

  it('resolves a same-name style definition into a Source defaults layer', () => {
    const brand = defineTableThemeStyle({
      name: 'brand',
      resolve: theme => ({
        defaults: {
          defaultAppearance: {
            body: {
              content: { defaults: { style: { color: theme.mode === ThemeMode.Light ? '#123456' : '#abcdef' } } },
            },
          },
          defaultVisual: { sequential: ['orange', 'purple'] },
        },
      }),
    });
    const theme = {
      ...lightTheme,
      style: 'brand',
      colors: { ...lightTheme.colors, categorical: ['red'] },
    } as const;

    const resolved = resolveTableThemeDefaults(theme, [brand]);

    expect(resolved.defaults.defaultAppearance?.body?.content?.defaults?.style?.color).toBe('#123456');
    expect(resolved.defaults.defaultAppearance?.body?.background?.fill).toBe('#ffffff');
    expect(resolved.defaults.defaultVisual?.categorical).toEqual(['red']);
    expect(resolved.defaults.defaultVisual?.sequential).toEqual(['orange', 'purple']);
    expect(resolved.layers.map(layer => ({ kind: layer.kind, path: layer.path }))).toEqual([
      { kind: 'neutral', path: '$default/light' },
      { kind: 'style', path: '$style/brand/light' },
    ]);
    expect(() => resolveTableThemeDefaults(theme)).toThrow(/Table theme style 'brand'.*not registered/i);
    expect(() => resolveTableThemeDefaults(theme, [brand, brand])).toThrow(/already registered/i);
  });

  it('rejects malformed Source defaults and preserves style callback causes', () => {
    expect(() => TableDefaultsSchema.parse({ unknown: true })).toThrow(/unknown/i);

    const cause = new Error('custom Table style failed');
    const definition = defineTableThemeStyle({
      name: 'throwing-style',
      resolve: () => {
        throw cause;
      },
    });

    expect(() => resolveTableThemeDefaults({ ...lightTheme, style: definition.name }, [definition])).toThrowError(
      expect.objectContaining({ code: RetikzTableErrorCode.Default, cause }),
    );
  });
});
