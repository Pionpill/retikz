import { DEFAULT_RESOLVED_THEME, resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

describe('Code block theme tokens', () => {
  it.each([ThemeMode.Light, ThemeMode.Dark])('derives Neutral tokens from the effective %s environment', mode => {
    const theme = { ...DEFAULT_RESOLVED_THEME, mode, colors: resolveDefaultCoreThemeColors(mode) };
    expect(Graph.resolveCodeBlockTokens(theme, new Map())).toEqual({
      textColor: 'currentColor',
      mutedTextColor: theme.colors.semantic.guide,
      accentColor: theme.colors.categorical[0],
      codeFontFamily: 'monospace',
    });
  });
  it('merges sparse tokens without changing the existing defaults and rules path', () => {
    const definition = Graph.defineGraphThemeStyle({
      name: 'custom',
      resolve: () => ({
        defaults: { block: { cornerRadius: 12 } },
        codeBlockTokens: { accentColor: '#123456', codeFontFamily: undefined, sectionBackground: { fill: '#abcdef' } },
      }),
    });
    const theme = { ...DEFAULT_RESOLVED_THEME, style: 'custom' };
    const styles = new Map([[definition.name, definition]]);
    const result = Graph.resolveGraphTheme(theme, styles);
    expect(result.defaults.block?.cornerRadius).toBe(12);
    expect(result.codeBlockTokens).toEqual({
      ...Graph.resolveCodeBlockTokens(DEFAULT_RESOLVED_THEME, new Map()),
      accentColor: '#123456',
      sectionBackground: { fill: '#abcdef' },
    });
  });
  it('preserves the cause of a theme callback and rejects missing style registrations', () => {
    const cause = new Error('theme failed');
    const definition = Graph.defineGraphThemeStyle({
      name: 'custom',
      resolve: () => {
        throw cause;
      },
    });
    const theme = { ...DEFAULT_RESOLVED_THEME, style: 'custom' };
    expect(() => Graph.resolveCodeBlockTokens(theme, new Map())).toThrow(Graph.RetikzGraphError);
    expect(() => Graph.resolveCodeBlockTokens(theme, new Map([[definition.name, definition]]))).toThrow(
      expect.objectContaining({ cause }),
    );
  });
});
