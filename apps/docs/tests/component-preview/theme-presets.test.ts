import { globSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';

import * as corePackage from '@retikz/core';
import { resolveCoreThemeColors, ThemeMode } from '@retikz/core';
import { resolvePlotTheme } from '@retikz/plot';
import { resolveTableThemeDefaults } from '@retikz/table';
import { describe, expect, it } from 'vitest';

import {
  PreviewChartThemeDefinitions,
  PreviewCoreThemeDefinitions,
  PreviewPlotThemeDefinitions,
  PreviewTableThemeDefinitions,
  PreviewThemeDefinitionBundle,
  PreviewTheme,
  PreviewThemeOptions,
} from '@/modules/docs/components/component-preview/theme';

describe('文档拥有的主题预设', () => {
  it('发布包不公开命名 Theme，docs 维持四个闭合选择项', () => {
    expect('Theme' in corePackage).toBe(false);
    expect(PreviewThemeOptions).toEqual(['default', 'academic', 'vibrant', 'clean']);
  });

  it('三个参考风格只为 Core 与 Viz owner 提供同名 definition', () => {
    const expected = [PreviewTheme.Academic, PreviewTheme.Vibrant, PreviewTheme.Clean];

    for (const definitions of [
      PreviewCoreThemeDefinitions,
      PreviewPlotThemeDefinitions,
      PreviewChartThemeDefinitions,
      PreviewTableThemeDefinitions,
    ]) {
      expect(definitions.map(definition => definition.name)).toEqual(expected);
    }

    for (const definitions of [
      PreviewThemeDefinitionBundle.graph,
      PreviewThemeDefinitionBundle.diagram,
      PreviewThemeDefinitionBundle.flow,
    ]) {
      expect(definitions.map(definition => definition.name)).toEqual(['docs.logic']);
    }
  });

  it.each([ThemeMode.Light, ThemeMode.Dark])('Plot reference definitions 保留关键 Axis 与 shape 视觉值：%s', mode => {
    const coreByName = new Map(PreviewCoreThemeDefinitions.map(definition => [definition.name, definition]));

    for (const definition of PreviewPlotThemeDefinitions) {
      const core = coreByName.get(definition.name);
      if (core === undefined) throw new Error(`missing Core definition for ${definition.name}`);

      const colors = resolveCoreThemeColors(mode, core.resolve({ mode }));
      const resolved = resolvePlotTheme({ name: definition.name, mode, colors }, {}, [definition]);

      expect(resolved.defaults.axis?.line !== false).toBe(definition.name === PreviewTheme.Academic);

      if (definition.name === PreviewTheme.Academic) {
        expect(resolved.defaults.axis?.grid).toBe(false);
        expect(resolved.defaults.plotArea?.border).toEqual({ stroke: 'currentColor', strokeWidth: 1, drawOpacity: 1 });

        const sourceOverride = resolvePlotTheme(
          { name: definition.name, mode, colors },
          { defaultPlot: { plotArea: { border: false } } },
          [definition],
        );

        expect(sourceOverride.defaults.plotArea?.border).toBe(false);
      }

      const expectedStyleRules =
        definition.name === PreviewTheme.Academic
          ? [
              {
                select: { dimension: ['x', 'y'] },
                axis: { grid: false },
              },
            ]
          : definition.name === PreviewTheme.Vibrant
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
                  select: { dimension: 'x' },
                  axis: {
                    grid: { stroke: 'currentColor', strokeWidth: 1, drawOpacity: 0.15, includeDomain: false },
                  },
                },
                {
                  select: { dimension: 'y' },
                  axis: {
                    grid: {
                      stroke: 'currentColor',
                      strokeWidth: 1,
                      drawOpacity: 0.15,
                      dashPattern: [4, 4],
                      includeDomain: false,
                    },
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
    const coreByName = new Map(PreviewCoreThemeDefinitions.map(definition => [definition.name, definition]));
    const tableByName = new Map(PreviewTableThemeDefinitions.map(definition => [definition.name, definition]));

    const themeOf = (style: Exclude<(typeof PreviewTheme)[keyof typeof PreviewTheme], 'default'>) => {
      const core = coreByName.get(style);
      if (core === undefined) throw new Error(`missing Core definition for ${style}`);
      return { name: style, mode, colors: resolveCoreThemeColors(mode, core.resolve({ mode })) };
    };

    const academic = tableByName.get(PreviewTheme.Academic);
    const vibrant = tableByName.get(PreviewTheme.Vibrant);
    const clean = tableByName.get(PreviewTheme.Clean);
    if (academic === undefined || vibrant === undefined || clean === undefined)
      throw new Error('missing Table definition');

    const academicDefaults = resolveTableThemeDefaults(themeOf(PreviewTheme.Academic), [academic]).defaults;

    expect(academicDefaults.defaultAppearance?.body?.content?.defaults?.node?.style?.font?.family).toBe('serif');
    expect(academicDefaults.layout?.borders?.outer?.top).toEqual({
      kind: 'line',
      stroke: mode === ThemeMode.Light ? '#111111' : '#f5f5f5',
      width: 1.2,
    });

    const vibrantDefaults = resolveTableThemeDefaults(themeOf(PreviewTheme.Vibrant), [vibrant]).defaults;

    expect(vibrantDefaults.defaultAppearance?.body?.background?.fill).toBe(
      mode === ThemeMode.Light ? '#e5ecf6' : '#111827',
    );
    expect(vibrantDefaults.layout?.borders?.horizontal).toMatchObject({ kind: 'line', width: 1 });

    const cleanDefaults = resolveTableThemeDefaults(themeOf(PreviewTheme.Clean), [clean]).defaults;

    expect(cleanDefaults.defaultAppearance?.body?.background?.fill).toBe('none');
    expect(cleanDefaults.layout?.borders?.horizontal).toEqual({ kind: 'none' });
    expect(cleanDefaults.defaultVisual?.sequential).toEqual(
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
