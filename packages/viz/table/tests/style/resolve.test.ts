import { defineThemeStyle, resolveCoreThemeColors, ThemeMode, ThemeStyle } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { BUILTIN_TABLE_THEME_TOKENS, compileTable, defineTableThemeStyle, resolveTableThemeTokens } from '../../src';

describe('Table theme token resolution', () => {
  it('defaults to neutral light and records local/inherited winners', () => {
    const resolved = resolveTableThemeTokens();

    expect(resolved.tokens).toMatchObject(BUILTIN_TABLE_THEME_TOKENS.neutral.light);
    expect(resolved.tokens['data.categorical']).toEqual(resolveCoreThemeColors('neutral', 'light').categorical);
    expect(Object.values(resolved.sources).map(source => source.kind)).toEqual([
      ...Array.from({ length: 17 }, () => 'local'),
      'inherit',
      'local',
    ]);
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.tokens)).toBe(true);
  });

  it('overlays independent leaves and atomically replaces structured tokens', () => {
    const categorical = ['pink', 'pink'];
    const border = { kind: 'line' as const, stroke: 'purple', width: 3 };
    const resolved = resolveTableThemeTokens(
      {
        style: 'neutral',
        mode: 'light',
        colors: resolveCoreThemeColors('neutral', 'light'),
      },
      {
        'columnHeader.content.color': '#123456',
        'table.border.horizontal': border,
        'data.categorical': categorical,
        'data.sequential': ['orange', 'purple'],
      },
    );

    expect(resolved.tokens['cell.content.color']).toBe('#18181b');
    expect(resolved.tokens['columnHeader.content.color']).toBe('#123456');
    expect(resolved.tokens['table.border.horizontal']).toEqual(border);
    expect(resolved.tokens['data.categorical']).toEqual(['pink', 'pink']);
    expect(resolved.tokens['data.sequential']).toEqual(['orange', 'purple']);
    expect(resolved.sources['columnHeader.content.color']).toMatchObject({ kind: 'local' });
    expect(resolved.sources['cell.content.color']).toMatchObject({ kind: 'local' });

    categorical[0] = 'mutated';
    border.width = 9;
    expect(resolved.tokens['data.categorical']).toEqual(['pink', 'pink']);
    expect(resolved.tokens['table.border.horizontal']).toEqual({ kind: 'line', stroke: 'purple', width: 3 });
  });

  it('通过同名自定义 style definition 解析 Table 基线并拒绝缺失或重名定义', () => {
    const brand = defineTableThemeStyle({
      name: 'brand',
      resolve: theme => ({
        ...structuredClone(BUILTIN_TABLE_THEME_TOKENS.neutral[theme.mode]),
        'cell.content.color': theme.mode === ThemeMode.Light ? '#123456' : '#abcdef',
      }),
    });
    const theme = {
      style: 'brand',
      mode: ThemeMode.Light,
      colors: resolveCoreThemeColors(ThemeStyle.Neutral, ThemeMode.Light),
    } as const;

    const resolved = resolveTableThemeTokens(theme, {}, [brand]);

    expect(resolved.tokens['cell.content.color']).toBe('#123456');
    expect(resolved.sources['cell.content.color']).toEqual({
      kind: 'local',
      path: '$style/brand/light/cell.content.color',
    });
    expect(() => resolveTableThemeTokens(theme)).toThrow(/Table theme style 'brand'.*not registered/i);
    expect(() =>
      resolveTableThemeTokens(
        {
          style: ThemeStyle.Neutral,
          mode: ThemeMode.Light,
          colors: resolveCoreThemeColors(ThemeStyle.Neutral, ThemeMode.Light),
        },
        {},
        [defineTableThemeStyle({ name: ThemeStyle.Neutral, resolve: brand.resolve })],
      ),
    ).toThrow(/already registered/i);

    const coreBrand = defineThemeStyle({
      name: 'brand',
      resolve: ({ mode }) => resolveCoreThemeColors(ThemeStyle.Neutral, mode),
    });
    const result = compileTable(
      { namespace: 'table', type: 'table', structure: { kind: 'manual', rows: [['x']] } },
      {},
      {
        theme: { style: 'brand', mode: ThemeMode.Light },
        lower: { tableThemeStyles: [brand] },
        compile: { themeStyles: [coreBrand], padding: 0 },
      },
    );
    expect(result.manifest.style).toMatchObject({
      style: 'brand',
      themeMode: ThemeMode.Light,
      tokens: { 'cell.content.color': '#123456' },
    });
  });
});
