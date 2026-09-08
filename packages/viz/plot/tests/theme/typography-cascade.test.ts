import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { definePlotThemeStyle } from '../../src/contract';
import {
  resolveAxisGuideTokens,
  resolveLegendGuideTokens,
  resolvePlotAxisGuideTheme,
  resolvePlotGuideTheme,
  resolvePlotTheme,
} from '../../src/resolve/theme';

const theme = {
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
};

describe('Plot typography cascade', () => {
  it('后来源 typography 覆盖早来源 Axis/Legend 专用文本，显式 guide 字段最高', () => {
    const style = definePlotThemeStyle({
      name: 'early-specialized',
      resolve: () => ({
        defaults: {
          axis: { tickLabels: { textColor: '#style-axis', font: { family: 'serif', size: 10 } } },
          legend: { title: { textColor: '#style-title' }, label: { textColor: '#style-label' } },
        },
      }),
    });
    const resolution = resolvePlotTheme(
      theme,
      {
        plotDefaults: {
          typography: { textColor: '#source-global', font: { family: 'monospace', size: 14 } },
        },
      },
      [style],
    );

    const axisTheme = resolvePlotAxisGuideTheme(resolution, 'x');
    const legendTheme = resolvePlotGuideTheme(resolution);
    expect(axisTheme.axis.tickLabels).toMatchObject({
      textColor: '#source-global',
      font: { family: 'monospace', size: 14 },
    });
    expect(legendTheme.legend.title).toMatchObject({ textColor: '#source-global' });
    expect(legendTheme.legend.label).toMatchObject({ textColor: '#source-global' });

    const axis = resolveAxisGuideTokens(axisTheme, {
      type: 'axis',
      dimension: 'x',
      tickLabels: { textColor: '#guide-label' },
    });
    const legend = resolveLegendGuideTokens(legendTheme, {
      label: { textColor: '#guide-legend' },
    });
    expect(axis.tickLabels).toMatchObject({ textColor: '#guide-label' });
    expect(legend.label.textColor).toBe('#guide-legend');
    expect(legend.title.textColor).toBe('#source-global');
  });
});
