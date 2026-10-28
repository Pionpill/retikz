import type { CanonicalTheme } from '@retikz/core';
import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { definePlotTheme, resolvePlotTheme } from '../../src';

describe('Plot 主题定义关闭', () => {
  it('自定义接收有效的 Core 主题并贡献 Source 默认/规则', () => {
    let received: CanonicalTheme | undefined;
    const style = definePlotTheme({
      name: 'definition-defaults',
      resolve: theme => {
        received = theme;
        return {
          defaults: { typography: { textColor: theme.colors.semantic.guide } },
          rules: [{ select: { dimension: 'x' }, axis: { grid: false } }],
        };
      },
    });
    const theme: CanonicalTheme = {
      name: style.name,
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

  it('未知样式失败，并且不接受隐式基继承', () => {
    const theme = {
      mode: ThemeMode.Light,
      colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
    };

    expect(() => resolvePlotTheme({ ...theme, name: 'missing' })).toThrow(/not registered/);
  });
});
