import type { ResolvedTheme } from '@retikz/core';

import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { definePlotThemeStyle, resolvePlotTheme } from '../../src';

describe('Plot theme definition closure', () => {
  it('custom definition receives the effective Core theme and contributes Source defaults/rules', () => {
    let received: ResolvedTheme | undefined;
    const style = definePlotThemeStyle({
      name: 'definition-defaults',
      resolve: theme => {
        received = theme;
        return {
          defaults: { typography: { textColor: theme.colors.semantic.guide } },
          rules: [{ select: { dimension: 'x' }, axis: { grid: false } }],
        };
      },
    });
    const theme: ResolvedTheme = {
      style: style.name,
      mode: ThemeMode.Dark,
      colors: {
        semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706', guide: '#6b7280' },
        categorical: ['#112233'],
      },
    };
    const result = resolvePlotTheme(theme, {}, [style]);

    expect(received).toEqual(theme);
    expect(result.defaults.typography?.textColor).toBe('#6b7280');
    expect(result.rules.at(-1)).toMatchObject({
      kind: 'style',
      sourcePath: '$style/definition-defaults/dark',
      path: '$style/definition-defaults/dark/plotRules/0',
    });
  });

  it('unknown style fails loud and no implicit base inheritance is accepted', () => {
    const theme = {
      mode: ThemeMode.Light,
      colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
    };
    expect(() => resolvePlotTheme({ ...theme, style: 'missing' })).toThrow(/not registered/);
  });
});
