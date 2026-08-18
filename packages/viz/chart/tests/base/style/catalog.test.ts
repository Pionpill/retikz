import { ThemeMode } from '@retikz/core';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { getDefaultChartThemePreset } from '../../../src/_chart/style';
import { ChartResolvedThemeTokensSchema, ChartThemeToken } from '../../../src/_shared/style';

const modes = Object.values(ThemeMode);
const canonicalKeys = Object.values(ChartThemeToken);

describe('Chart style preset catalog', () => {
  it('精确锁定两份默认 Chart-owned resolved map', () => {
    const digests = Object.fromEntries(
      modes.map(mode => [
        mode,
        createHash('sha256')
          .update(JSON.stringify(getDefaultChartThemePreset(mode)))
          .digest('hex'),
      ]),
    );
    expect(digests).toEqual({
      light: 'b508583c8928cab5e87325c2a7acae45d8b9e5291a825f0da70d1747427f53f5',
      dark: 'f5eb3ec3f6741391f9eb01bc8dbe4a8bd06da0d30316289019b59549098da1a6',
    });
  });

  it('为两个 mode 返回完整合法且 key 同序的默认 map', () => {
    for (const mode of modes) {
      const tokens = getDefaultChartThemePreset(mode);
      expect(ChartResolvedThemeTokensSchema.parse(tokens)).toEqual(tokens);
      expect(Object.keys(tokens)).toEqual(canonicalKeys);
    }
  });

  it('mode 只改变 Chart paint，保持排版、布局和 recipe defaults', () => {
    const modeSensitive = new Set([
      ChartThemeToken.ChartCanvasFill,
      ...['title', 'subtitle', 'note', 'source'].map(slot => `chart.${slot}.foreground`),
    ]);
    const light = getDefaultChartThemePreset(ThemeMode.Light);
    const dark = getDefaultChartThemePreset(ThemeMode.Dark);
    for (const key of canonicalKeys) {
      if (!modeSensitive.has(key)) expect(dark[key]).toEqual(light[key]);
    }
  });

  it('冻结 presentation 与 recipe 结构倾向', () => {
    expect(getDefaultChartThemePreset('light')).toMatchObject({
      'chart.canvas.fill': '#FFFFFF',
      'chart.padding': 16,
      'chart.axis.enabled': true,
      'chart.axis.grid.enabled': true,
      'chart.legend.enabled': true,
    });
  });

  it('每次返回独立 clone', () => {
    const first = getDefaultChartThemePreset('light');
    first['chart.padding'] = 0;
    const second = getDefaultChartThemePreset('light');
    expect(second['chart.padding']).toBe(16);
  });
});
