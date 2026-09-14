import { globSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';

import * as corePackage from '@retikz/core';
import { resolveCoreThemeStyleColors, ThemeMode } from '@retikz/core';
import { resolvePlotTheme } from '@retikz/plot';
import { resolveTableThemeDefaults } from '@retikz/table';
import { describe, expect, it } from 'vitest';

import {
  PreviewChartThemeDefinitions,
  PreviewCoreThemeStyles,
  PreviewPlotThemeStyles,
  PreviewTableThemeStyles,
  PreviewThemeDefinitionBundle,
  PreviewThemeStyle,
  PreviewThemeStyleOptions,
} from '@/modules/docs/components/component-preview/theme';

describe('docs-owned theme presets', () => {
  it('发布包不公开命名 ThemeStyle，docs 维持四个闭合选择项', () => {
    expect('ThemeStyle' in corePackage).toBe(false);
    expect(PreviewThemeStyleOptions).toEqual(['default', 'academic', 'vibrant', 'clean']);
  });

  it('三个参考风格只为 Core 与 Viz owner 提供同名 definition', () => {
    const expected = [PreviewThemeStyle.Academic, PreviewThemeStyle.Vibrant, PreviewThemeStyle.Clean];
    for (const definitions of [
      PreviewCoreThemeStyles,
      PreviewPlotThemeStyles,
      PreviewChartThemeDefinitions,
      PreviewTableThemeStyles,
    ]) {
      expect(definitions.map(definition => definition.name)).toEqual(expected);
    }
    expect(PreviewThemeDefinitionBundle.graph).toEqual([]);
    expect(PreviewThemeDefinitionBundle.diagram).toEqual([]);
    expect(PreviewThemeDefinitionBundle.flow).toEqual([]);
  });

  it.each([ThemeMode.Light, ThemeMode.Dark])('Plot reference definitions 保留关键 Axis 与 shape 视觉值：%s', mode => {
    const coreByName = new Map(PreviewCoreThemeStyles.map(definition => [definition.name, definition]));
    for (const definition of PreviewPlotThemeStyles) {
      const core = coreByName.get(definition.name);
      if (core === undefined) throw new Error(`missing Core definition for ${definition.name}`);
      const colors = resolveCoreThemeStyleColors(mode, core.resolve({ mode }));
      const resolved = resolvePlotTheme({ style: definition.name, mode, colors }, {}, [definition]);
      expect(resolved.defaults.axis?.line !== false).toBe(definition.name === PreviewThemeStyle.Academic);
      const expectedStyleRules =
        definition.name === PreviewThemeStyle.Academic
          ? [
              {
                select: { dimension: ['x', 'y'] },
                axis: { grid: false },
              },
            ]
          : definition.name === PreviewThemeStyle.Vibrant
            ? [
                {
                  select: { dimension: ['x', 'y'] },
                  axis: {
                    grid: {
                      stroke: mode === ThemeMode.Light ? '#FFFFFF' : '#000000',
                      strokeWidth: 1,
                      drawOpacity: 1,
                      includeDomain: false,
                    },
                  },
                },
              ]
            : [
                {
                  select: { dimension: ['x', 'y'] },
                  axis: { grid: false },
                },
                {
                  select: { dimension: 'y' },
                  axis: {
                    grid: { stroke: 'currentColor', strokeWidth: 1, drawOpacity: 0.15, includeDomain: true },
                  },
                },
              ];
      expect(resolved.rules.slice(1).map(source => source.rule)).toEqual(expectedStyleRules);
      expect(resolved.palette.shape).toHaveLength(8);
      expect(resolved.palette.shape[4]).toEqual({
        type: 'polygon',
        params: { sides: 3, rotate: -90 },
      });
    }
  });

  it.each([ThemeMode.Light, ThemeMode.Dark])('Table reference definitions 保留关键视觉值：%s', mode => {
    const coreByName = new Map(PreviewCoreThemeStyles.map(definition => [definition.name, definition]));
    const tableByName = new Map(PreviewTableThemeStyles.map(definition => [definition.name, definition]));
    const themeOf = (style: Exclude<(typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle], 'default'>) => {
      const core = coreByName.get(style);
      if (core === undefined) throw new Error(`missing Core definition for ${style}`);
      return { style, mode, colors: resolveCoreThemeStyleColors(mode, core.resolve({ mode })) };
    };

    const academic = tableByName.get(PreviewThemeStyle.Academic);
    const vibrant = tableByName.get(PreviewThemeStyle.Vibrant);
    const clean = tableByName.get(PreviewThemeStyle.Clean);
    if (academic === undefined || vibrant === undefined || clean === undefined)
      throw new Error('missing Table definition');

    const academicDefaults = resolveTableThemeDefaults(themeOf(PreviewThemeStyle.Academic), [academic]).defaults;
    expect(academicDefaults.appearanceDefaults?.body?.content?.defaults?.node?.style?.font?.family).toBe('serif');
    expect(academicDefaults.layout?.borders?.outer?.top).toEqual({
      kind: 'line',
      stroke: mode === ThemeMode.Light ? '#111111' : '#f5f5f5',
      width: 1.2,
    });

    const vibrantDefaults = resolveTableThemeDefaults(themeOf(PreviewThemeStyle.Vibrant), [vibrant]).defaults;
    expect(vibrantDefaults.appearanceDefaults?.body?.background?.fill).toBe(
      mode === ThemeMode.Light ? '#e5ecf6' : '#111827',
    );
    expect(vibrantDefaults.layout?.borders?.horizontal).toMatchObject({ kind: 'line', width: 1 });

    const cleanDefaults = resolveTableThemeDefaults(themeOf(PreviewThemeStyle.Clean), [clean]).defaults;
    expect(cleanDefaults.appearanceDefaults?.body?.background?.fill).toBe('none');
    expect(cleanDefaults.layout?.borders?.horizontal).toEqual({ kind: 'none' });
    expect(cleanDefaults.visualDefaults?.sequential).toEqual(
      mode === ThemeMode.Light ? ['#eff6ff', '#1d4ed8'] : ['#172554', '#60a5fa'],
    );
  });

  it('Layout 内嵌的 Plot 与 Table demo 统一经过 docs preview 边界', () => {
    const demoFiles = globSync('src/modules/docs/contents/viz/{plot,table}/**/*.demo.tsx');
    const violations = demoFiles.flatMap(file => {
      const source = readFileSync(file, 'utf8');
      if (!/<Layout\b/.test(source)) return [];
      const missing = [
        /<Plot\b/.test(source) && !source.includes('PreviewPlot as Plot') ? 'Plot' : undefined,
        /<DetailTable\b/.test(source) && !source.includes('PreviewDetailTable as DetailTable')
          ? 'DetailTable'
          : undefined,
        /<ManualTable\b/.test(source) && !source.includes('PreviewManualTable as ManualTable')
          ? 'ManualTable'
          : undefined,
      ].filter((name): name is string => name !== undefined);
      return missing.length === 0 ? [] : [`${relative(process.cwd(), file)}: ${missing.join(', ')}`];
    });

    expect(violations).toEqual([]);
  });
});
