import { defineThemeStyle, resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import {
  compileTable,
  defineTableThemeStyle,
  getDefaultTableThemePreset,
  resolveTableThemeTokens,
  RetikzTableErrorCode,
} from '../../src';

describe('Table theme token resolution', () => {
  it('defaults to the light baseline and records local/inherited winners', () => {
    const resolved = resolveTableThemeTokens();

    expect(resolved.tokens).toMatchObject(getDefaultTableThemePreset(ThemeMode.Light));
    expect(resolved.tokens['data.categorical']).toEqual(resolveDefaultCoreThemeColors(ThemeMode.Light).categorical);
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
        mode: 'light',
        colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
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
      resolve: theme => ({ 'cell.content.color': theme.mode === ThemeMode.Light ? '#123456' : '#abcdef' }),
    });
    const theme = {
      style: 'brand',
      mode: ThemeMode.Light,
      colors: {
        ...resolveDefaultCoreThemeColors(ThemeMode.Light),
        categorical: ['#core-brand'] as const,
      },
    } as const;

    const resolved = resolveTableThemeTokens(theme, {}, [brand]);

    expect(resolved.tokens['cell.content.color']).toBe('#123456');
    expect(resolved.sources['cell.content.color']).toEqual({
      kind: 'local',
      path: '$style/brand/light/cell.content.color',
    });
    expect(resolved.tokens['cell.background.fill']).toBe('#ffffff');
    expect(resolved.sources['cell.background.fill']).toEqual({
      kind: 'local',
      path: '$default/light/cell.background.fill',
    });
    expect(resolved.tokens['data.categorical']).toEqual(['#core-brand']);
    expect(resolved.sources['data.categorical']).toEqual({
      kind: 'inherit',
      path: '$theme/colors/categorical',
    });
    expect(() => resolveTableThemeTokens(theme)).toThrow(/Table theme style 'brand'.*not registered/i);
    expect(() =>
      resolveTableThemeTokens(
        {
          mode: ThemeMode.Light,
          colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
        },
        {},
        [brand, defineTableThemeStyle({ name: 'brand', resolve: brand.resolve })],
      ),
    ).toThrow(/already registered/i);

    const coreBrand = defineThemeStyle({ name: 'brand', resolve: () => ({ categorical: ['#core-brand'] }) });
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

  it('把外部 style definition 的显式 undefined token 当作省略', () => {
    const sparseTokens = { 'cell.content.color': '#123456' };
    Object.defineProperty(sparseTokens, 'cell.content.color', {
      enumerable: true,
      value: undefined,
    });
    const sparse = defineTableThemeStyle({ name: 'sparse', resolve: () => sparseTokens });
    const resolved = resolveTableThemeTokens(
      {
        style: 'sparse',
        mode: ThemeMode.Light,
        colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
      },
      {},
      [sparse],
    );

    expect(resolved.tokens['cell.content.color']).toBe('#18181b');
    expect(resolved.sources['cell.content.color']).toEqual({
      kind: 'local',
      path: '$default/light/cell.content.color',
    });

    const unknownTokens = { 'cell.content.color': '#123456' };
    Object.defineProperty(unknownTokens, 'unknown.token', { enumerable: true, value: undefined });
    const unknown = defineTableThemeStyle({ name: 'unknown', resolve: () => unknownTokens });
    expect(() =>
      resolveTableThemeTokens(
        {
          style: 'unknown',
          mode: ThemeMode.Light,
          colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
        },
        {},
        [unknown],
      ),
    ).toThrow(/unknown/i);
  });

  it('拒绝已注册外部 style definition 的非法顶层输出', () => {
    class EmptyStyleOutput {}
    class BorderOutput {
      readonly kind = 'line';
      readonly stroke = '#123456';
      readonly width = 1;
    }

    const getterOutput = Object.defineProperty({}, 'cell.content.color', {
      enumerable: true,
      get: () => '#123456',
    });
    const symbolOutput = { 'cell.content.color': '#123456', [Symbol('metadata')]: true };

    const theme = {
      style: 'invalid',
      mode: ThemeMode.Light,
      colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
    };
    const invalidDefinitions = [
      { name: 'null-output', resolve: () => null },
      { name: 'undefined-output', resolve: () => undefined },
      { name: 'primitive-output', resolve: () => 42 },
      { name: 'date-output', resolve: () => new Date(0) },
      { name: 'class-output', resolve: () => new EmptyStyleOutput() },
      { name: 'promise-output', resolve: () => Promise.resolve({}) },
      { name: 'class-token-value', resolve: () => ({ 'table.border.top': new BorderOutput() }) },
      { name: 'getter-output', resolve: () => getterOutput },
      { name: 'symbol-output', resolve: () => symbolOutput },
    ];

    for (const definition of invalidDefinitions) {
      expect(
        () =>
          Reflect.apply(resolveTableThemeTokens, undefined, [{ ...theme, style: definition.name }, {}, [definition]]),
        definition.name,
      ).toThrowError(
        expect.objectContaining({
          code: RetikzTableErrorCode.Default,
          cause: expect.any(ZodError),
        }),
      );
    }
  });

  it('保留外部 style definition callback 抛出的原始 cause', () => {
    const cause = new Error('custom Table style failed');
    const definition = defineTableThemeStyle({
      name: 'throwing-style',
      resolve: () => {
        throw cause;
      },
    });

    expect(() =>
      resolveTableThemeTokens(
        {
          style: definition.name,
          mode: ThemeMode.Light,
          colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
        },
        {},
        [definition],
      ),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzTableErrorCode.Default,
        cause,
      }),
    );
  });
});
