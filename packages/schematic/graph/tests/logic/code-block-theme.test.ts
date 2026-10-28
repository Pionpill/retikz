import { DEFAULT_RESOLVED_THEME, resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

describe('代码块主题令牌', () => {
  it.each([ThemeMode.Light, ThemeMode.Dark])('从有效的 %s 环境中派生 Neutral 代币', mode => {
    const theme = { ...DEFAULT_RESOLVED_THEME, mode, colors: resolveDefaultCoreThemeColors(mode) };

    expect(Graph.resolveCodeBlockTokens(theme, new Map())).toEqual({
      textColor: 'currentColor',
      mutedTextColor: theme.colors.semantic.guide,
      accentColor: theme.colors.categorical[0],
      codeFontFamily: 'monospace',
    });
  });

  it('合并稀疏令牌而不更改现有的默认值和规则路径', () => {
    const definition = Graph.defineGraphTheme({
      name: 'custom',
      resolve: () => ({
        defaults: { block: { cornerRadius: 12 } },
        codeBlockTokens: { accentColor: '#123456', codeFontFamily: undefined, sectionBackground: { fill: '#abcdef' } },
      }),
    });
    const theme = { ...DEFAULT_RESOLVED_THEME, name: 'custom' };
    const styles = new Map([[definition.name, definition]]);
    const result = Graph.resolveGraphTheme(theme, styles);

    expect(result.defaults.block?.cornerRadius).toBe(12);
    expect(result.codeBlockTokens).toEqual({
      ...Graph.resolveCodeBlockTokens(DEFAULT_RESOLVED_THEME, new Map()),
      accentColor: '#123456',
      sectionBackground: { fill: '#abcdef' },
    });
  });

  it('保留主题回调的原因并拒绝缺失的样式注册', () => {
    const cause = new Error('theme failed');
    const definition = Graph.defineGraphTheme({
      name: 'custom',
      resolve: () => {
        throw cause;
      },
    });
    const theme = { ...DEFAULT_RESOLVED_THEME, name: 'custom' };

    expect(() => Graph.resolveCodeBlockTokens(theme, new Map())).toThrow(Graph.RetikzGraphError);
    expect(() => Graph.resolveCodeBlockTokens(theme, new Map([[definition.name, definition]]))).toThrow(
      expect.objectContaining({ cause }),
    );
  });
});
