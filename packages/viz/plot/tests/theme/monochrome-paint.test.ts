import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { getNeutralPlotDefaults } from '../../src/providers/theme';

describe('default Plot defaults monochrome paint', () => {
  it.each(Object.values(ThemeMode))('%s 的文本与结构继承 currentColor', mode => {
    const defaults = getNeutralPlotDefaults(mode, resolveDefaultCoreThemeColors(mode).categorical);

    expect(defaults).toMatchObject({
      plotArea: { fill: 'none' },
      typography: {
        font: { family: 'sans-serif', size: 12 },
        textColor: 'currentColor',
      },
      axis: {
        line: { stroke: 'currentColor' },
        tickLabels: { textColor: 'currentColor' },
        title: { textColor: 'currentColor' },
        grid: false,
      },
      legend: {
        title: { textColor: 'currentColor' },
        label: { textColor: 'currentColor' },
      },
    });
    expect(defaults.axis?.grid).toBe(false);
  });
});
