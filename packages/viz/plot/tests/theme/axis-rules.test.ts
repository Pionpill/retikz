import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { resolvePlotAxisDefaults, resolvePlotTheme } from '../../src/resolve/theme';
import { PlotAxisRuleSchema } from '../../src/schemas';

const theme = {
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
};

describe('Plot Axis Source rules', () => {
  it('schema rejects empty or duplicate dimensions and empty visual rules', () => {
    for (const rule of [
      { select: { dimension: '' }, axis: { line: false } },
      { select: { dimension: [] }, axis: { line: false } },
      { select: { dimension: ['x', 'x'] }, axis: { line: false } },
      { select: { dimension: 'x' }, axis: {} },
    ]) {
      expect(PlotAxisRuleSchema.safeParse(rule).success).toBe(false);
    }
  });

  it('仅匹配已有 dimension 的 defaults，并按声明顺序覆盖', () => {
    const resolution = resolvePlotTheme(theme, {
      plotRules: [
        { select: { dimension: ['x', 'y'] }, axis: { line: { stroke: '#first' } } },
        { select: { dimension: 'x' }, axis: { line: { stroke: '#second' }, grid: false } },
      ],
    });

    const x = resolvePlotAxisDefaults(resolution, 'x');
    const y = resolvePlotAxisDefaults(resolution, 'y');
    const radius = resolvePlotAxisDefaults(resolution, 'radius');

    expect(x.axis?.line).toMatchObject({ stroke: '#second' });
    expect(x.axis?.grid).toBe(false);
    expect(y.axis?.line).toMatchObject({ stroke: '#first' });
    expect(y.axis?.grid).toMatchObject({ includeDomain: true });
    expect(radius.axis?.line).toMatchObject({ stroke: 'currentColor' });
    expect(radius.axis?.grid).toBe(false);
  });
});
