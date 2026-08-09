import { ThemeMode, ThemeStyle } from '@retikz/core';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { ChartResolvedThemeTokensSchema, ChartThemeToken, getChartThemePreset } from '../../src/style';

const styles = Object.values(ThemeStyle);
const modes = Object.values(ThemeMode);
const canonicalKeys = Object.values(ChartThemeToken);

describe('Chart style preset catalog', () => {
  it('精确锁定八份 Chart-owned resolved map', () => {
    const digests = Object.fromEntries(
      styles.flatMap(style =>
        modes.map(mode => [
          `${style}/${mode}`,
          createHash('sha256')
            .update(JSON.stringify(getChartThemePreset(style, mode)))
            .digest('hex'),
        ]),
      ),
    );
    expect(digests).toEqual({
      'neutral/light': 'a59c84ccca39ea8b0407ba523315ced24a8aa2410969cf2ed8f9bc65c02df0bf',
      'neutral/dark': '5a2f75fe92ff743fec711930ed1e6b4a3ed2ee8d127b9f4293b197ce55767458',
      'academic/light': '2fbd2a966941b8e8e356d7ec051db5c8e2fdebf40f1e7f0d2c31dd854322ebca',
      'academic/dark': '71744045c47787e9fd0367311a1efcff1ae4f47b3e788cdd72475d4b64ec1efb',
      'vibrant/light': '696a0075edb5aa568e842c09b4cb2d97d6aedf9b0a6fd4c11e2c701900cd4fcf',
      'vibrant/dark': '5632c48d1f4dc1946b8583786876059a3e1c458825e24f9b433890ee75085ac0',
      'clean/light': 'e2cda0c1a89fc4795a2908b118303499d46a514a61195e0fdffbfb6b3e362e59',
      'clean/dark': '4c0482ca041613be3e7c3b12bca7987cff6cb17a209b92d97f3389860e52c5f5',
    });
  });

  it('为四个 preset × 两个 mode 返回完整合法且 key 同序的 map', () => {
    for (const style of styles) {
      for (const mode of modes) {
        const tokens = getChartThemePreset(style, mode);
        expect(ChartResolvedThemeTokensSchema.parse(tokens)).toEqual(tokens);
        expect(Object.keys(tokens)).toEqual(canonicalKeys);
      }
    }
  });

  it('mode 只改变 Chart paint，保持排版、布局和 recipe defaults', () => {
    const modeSensitive = new Set([
      ChartThemeToken.ChartCanvasFill,
      ...['title', 'subtitle', 'caption', 'note', 'source', 'credit'].map(slot => `chart.${slot}.foreground`),
    ]);
    for (const style of styles) {
      const light = getChartThemePreset(style, ThemeMode.Light);
      const dark = getChartThemePreset(style, ThemeMode.Dark);
      for (const key of canonicalKeys) {
        if (!modeSensitive.has(key)) expect(dark[key]).toEqual(light[key]);
      }
    }
  });

  it('冻结 presentation 与 recipe 结构倾向', () => {
    expect(getChartThemePreset('neutral', 'light')).toMatchObject({
      'chart.canvas.fill': '#FFFFFF',
      'chart.padding': 16,
      'chart.axis.enabled': true,
      'chart.axis.grid.enabled': true,
      'chart.legend.enabled': true,
    });
    expect(getChartThemePreset('vibrant', 'dark')['chart.title.font.size']).toBe(20);
    expect(getChartThemePreset('clean', 'light')['chart.axis.grid.enabled']).toBe(true);
  });

  it('Clean 使用透明画布、编辑式留白与可读排版', () => {
    for (const mode of modes) {
      const preset = getChartThemePreset(ThemeStyle.Clean, mode);

      expect(preset[ChartThemeToken.ChartCanvasFill]).toBe('none');
      expect(preset[ChartThemeToken.ChartPadding]).toBeGreaterThan(16);
      expect(preset[ChartThemeToken.ChartGap]).toBeGreaterThanOrEqual(6);
      expect(preset[ChartThemeToken.ChartFontFamily]).toContain('Inter');
      expect(preset[ChartThemeToken.ChartTitleFontWeight]).toBe(700);
      expect(preset[ChartThemeToken.ChartSubtitleFontWeight]).toBe(400);
      expect(preset[ChartThemeToken.ChartAxisGridEnabled]).toBe(true);
    }
  });

  it('每次返回独立 clone', () => {
    const first = getChartThemePreset('neutral', 'light');
    first['chart.padding'] = 0;
    const second = getChartThemePreset('neutral', 'light');
    expect(second['chart.padding']).toBe(16);
  });
});
