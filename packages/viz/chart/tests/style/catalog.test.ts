import { ThemeMode, ThemeStyle } from '@retikz/core';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { ChartResolvedThemeTokensSchema, ChartThemeToken, getChartThemePreset } from '../../src/style';

const styles = Object.values(ThemeStyle);
const modes = Object.values(ThemeMode);
const canonicalKeys = Object.values(ChartThemeToken);

describe('Chart style preset catalog', () => {
  it('精确锁定两份 Neutral Chart-owned resolved map', () => {
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
    });
  });

  it('为 Neutral × 两个 mode 返回完整合法且 key 同序的 map', () => {
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
  });

  it('每次返回独立 clone', () => {
    const first = getChartThemePreset('neutral', 'light');
    first['chart.padding'] = 0;
    const second = getChartThemePreset('neutral', 'light');
    expect(second['chart.padding']).toBe(16);
  });
});
