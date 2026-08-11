import { ThemeMode, ThemeStyle } from '@retikz/core';
import { PlotThemeToken } from '@retikz/plot';
import { globSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  PreviewChartThemeStyles,
  PreviewCoreThemeStyles,
  PreviewPlotThemeStyles,
  PreviewTableThemeStyles,
  PreviewThemeStyle,
  PreviewThemeStyleOptions,
} from '@/modules/docs/components/component-preview/theme';

describe('docs-owned theme presets', () => {
  it('发布包只公开 Neutral，docs 维持四个闭合选择项', () => {
    expect(Object.values(ThemeStyle)).toEqual(['neutral']);
    expect(PreviewThemeStyleOptions).toEqual(['neutral', 'academic', 'vibrant', 'clean']);
  });

  it('三个参考风格为四个 owner 提供同名 definition', () => {
    const expected = [PreviewThemeStyle.Academic, PreviewThemeStyle.Vibrant, PreviewThemeStyle.Clean];
    for (const definitions of [
      PreviewCoreThemeStyles,
      PreviewPlotThemeStyles,
      PreviewChartThemeStyles,
      PreviewTableThemeStyles,
    ]) {
      expect(definitions.map(definition => definition.name)).toEqual(expected);
    }
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
