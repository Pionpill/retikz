import * as corePackage from '@retikz/core';
import { compositeOpaqueColor, ThemeMode } from '@retikz/core';
import { PlotThemeToken } from '@retikz/plot';
import { globSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  isPreviewThemeStyleDocument,
  PreviewChartThemeDefinitions,
  PreviewCoreThemeStyles,
  PreviewGraphThemeStyles,
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

  it('三个参考风格为五个 owner 提供同名 definition', () => {
    const expected = [PreviewThemeStyle.Academic, PreviewThemeStyle.Vibrant, PreviewThemeStyle.Clean];
    for (const definitions of [
      PreviewCoreThemeStyles,
      PreviewPlotThemeStyles,
      PreviewChartThemeDefinitions,
      PreviewTableThemeStyles,
      PreviewGraphThemeStyles,
    ]) {
      expect(definitions.map(definition => definition.name)).toEqual(expected);
    }
    expect(PreviewThemeDefinitionBundle.graph).toBe(PreviewGraphThemeStyles);
  });

  it.each([ThemeMode.Light, ThemeMode.Dark])('Graph reference definitions 保持三种可辨识视觉语言：%s', mode => {
    const coreByName = new Map(PreviewCoreThemeStyles.map(definition => [definition.name, definition]));
    const graphByName = new Map(PreviewGraphThemeStyles.map(definition => [definition.name, definition]));
    const foreground = mode === ThemeMode.Light ? '#000000' : '#ffffff';
    const backdrop = mode === ThemeMode.Light ? '#ffffff' : '#000000';
    const themeOf = (style: Exclude<(typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle], 'default'>) => {
      const core = coreByName.get(style);
      if (core === undefined) throw new Error(`missing Core definition for ${style}`);
      return { style, mode, colors: core.resolve({ mode }) };
    };

    const academicTheme = themeOf(PreviewThemeStyle.Academic);
    const academicColor = academicTheme.colors.categorical[0];
    expect(graphByName.get(PreviewThemeStyle.Academic)?.resolve(academicTheme)).toEqual({
      entity: {
        tokens: {
          color: academicColor,
          textColor: 'contrast',
          fill: compositeOpaqueColor(academicColor, backdrop, 0.15),
          stroke: 'currentColor',
          strokeWidth: 1,
        },
      },
      relation: { tokens: { color: foreground, strokeWidth: 1.25 } },
    });

    const vibrantTheme = themeOf(PreviewThemeStyle.Vibrant);
    expect(graphByName.get(PreviewThemeStyle.Vibrant)?.resolve(vibrantTheme)).toEqual({
      entity: {
        tokens: {
          color: vibrantTheme.colors.categorical[0],
          textColor: 'contrast',
          fill: vibrantTheme.colors.categorical[0],
          stroke: 'none',
        },
      },
      relation: { tokens: { color: vibrantTheme.colors.categorical[1], strokeWidth: 1.5 } },
    });

    const cleanTheme = themeOf(PreviewThemeStyle.Clean);
    const cleanColor = cleanTheme.colors.categorical[0];
    expect(graphByName.get(PreviewThemeStyle.Clean)?.resolve(cleanTheme)).toEqual({
      entity: {
        tokens: {
          color: cleanColor,
          textColor: 'contrast',
          fill: compositeOpaqueColor(cleanColor, backdrop, 0.15),
          stroke: 'none',
        },
      },
      relation: { tokens: { color: foreground, strokeWidth: 1, opacity: 0.72 } },
    });
  });

  it('只在 Viz 与 schematic/graph 文档启用现有 Theme style selector', () => {
    expect(isPreviewThemeStyleDocument('viz', 'plot')).toBe(true);
    expect(isPreviewThemeStyleDocument('viz', undefined)).toBe(true);
    expect(isPreviewThemeStyleDocument('schematic', 'graph')).toBe(true);
    expect(isPreviewThemeStyleDocument('schematic', 'introduction')).toBe(false);
    expect(isPreviewThemeStyleDocument('schematic', 'diagram')).toBe(false);
    expect(isPreviewThemeStyleDocument('kernel', 'graph')).toBe(false);
  });

  it.each([ThemeMode.Light, ThemeMode.Dark])('Plot reference definitions保留完整 shape palette：%s', mode => {
    const coreByName = new Map(PreviewCoreThemeStyles.map(definition => [definition.name, definition]));
    for (const definition of PreviewPlotThemeStyles) {
      const core = coreByName.get(definition.name);
      if (core === undefined) throw new Error(`missing Core definition for ${definition.name}`);
      const colors = core.resolve({ mode });
      const resolved = definition.resolve({ style: definition.name, mode, colors });
      expect(resolved.tokens[PlotThemeToken.PlotPaletteShape]).toHaveLength(8);
      expect(resolved.tokens[PlotThemeToken.PlotPaletteShape][4]).toEqual({
        type: 'polygon',
        params: { sides: 3, rotate: -90 },
      });
    }
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
