import { describe, expect, it } from 'vitest';

import { defineThemeStyle } from '../../src/contract';
import { DEFAULT_RESOLVED_THEME, resolveTheme } from '../../src/resolve/theme';
import { ThemeMode } from '../../src/shared';

describe('resolve theme', () => {
  it('inherits the parent style and mode when the sparse selector omits them', () => {
    const brand = defineThemeStyle({
      name: 'brand-inheritance',
      resolve: ({ mode }) => ({
        semantic: {
          error: mode === ThemeMode.Dark ? '#ffaaaa' : '#aa0000',
          success: '#00aa00',
          warning: '#aaaa00',
          guide: '#666666',
        },
        categorical: ['#112233'],
      }),
    });
    const styles = new Map([[brand.name, brand]]);
    const parent = resolveTheme(
      DEFAULT_RESOLVED_THEME,
      { style: brand.name, mode: ThemeMode.Light },
      'scene.theme',
      styles,
    );
    const child = resolveTheme(parent, { mode: ThemeMode.Dark }, 'scene.children[0].theme', styles);

    expect(parent.style).toBe(brand.name);
    expect(child.style).toBe(brand.name);
    expect(child.mode).toBe(ThemeMode.Dark);
    expect(child.colors.semantic.error).toBe('#ffaaaa');
    expect(child).not.toBe(parent);
  });

  it('resolves default colors for an explicit mode without a style', () => {
    const resolved = resolveTheme(DEFAULT_RESOLVED_THEME, { mode: ThemeMode.Dark }, 'scene.theme');

    expect(resolved).toMatchObject({
      mode: ThemeMode.Dark,
      colors: { categorical: expect.any(Array) },
    });
    expect(resolved).not.toHaveProperty('style');
    expect(Object.isFrozen(resolved)).toBe(true);
  });

  it('resolves a registered style with the selected mode', () => {
    const brand = defineThemeStyle({
      name: 'brand',
      resolve: ({ mode }) => ({
        semantic: {
          error: mode === ThemeMode.Dark ? '#ffaaaa' : '#aa0000',
          success: '#00aa00',
          warning: '#aaaa00',
          guide: '#666666',
        },
        categorical: ['#112233'],
      }),
    });

    const resolved = resolveTheme(
      DEFAULT_RESOLVED_THEME,
      { style: 'brand', mode: ThemeMode.Dark },
      'scene.theme',
      new Map([[brand.name, brand]]),
    );

    expect(resolved).toMatchObject({ style: 'brand', mode: ThemeMode.Dark });
    expect(resolved.colors.semantic.error).toBe('#ffaaaa');
  });

  it('fails with the selector path when the style is not registered', () => {
    expect(() => resolveTheme(DEFAULT_RESOLVED_THEME, { style: 'missing' }, 'scope.theme')).toThrow(
      "Theme style 'missing' is not registered at scope.theme.",
    );
  });
});
