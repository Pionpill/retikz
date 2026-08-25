import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { defineThemeStyle } from '../../src/contract';
import { RetikzCoreErrorCode } from '../../src/error';
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
      resolve: ({ mode }) => ({ semantic: { error: mode === ThemeMode.Dark ? '#ffaaaa' : '#aa0000' } }),
    });

    const resolved = resolveTheme(
      DEFAULT_RESOLVED_THEME,
      { style: 'brand', mode: ThemeMode.Dark },
      'scene.theme',
      new Map([[brand.name, brand]]),
    );

    expect(resolved).toMatchObject({ style: 'brand', mode: ThemeMode.Dark });
    expect(resolved.colors.semantic.error).toBe('#ffaaaa');
    expect(resolved.colors.semantic.success).toBe(
      resolveTheme(DEFAULT_RESOLVED_THEME, { mode: ThemeMode.Dark }, 'default.theme').colors.semantic.success,
    );
    expect(resolved.colors.categorical).toEqual(
      resolveTheme(DEFAULT_RESOLVED_THEME, { mode: ThemeMode.Dark }, 'default.theme').colors.categorical,
    );
    expect(Object.isFrozen(resolved.colors.semantic)).toBe(true);
  });

  it('replaces only an explicitly provided categorical palette', () => {
    const categorical: [string] = ['#112233'];
    const brand = defineThemeStyle({ name: 'brand-palette', resolve: () => ({ categorical }) });
    const resolved = resolveTheme(
      DEFAULT_RESOLVED_THEME,
      { style: brand.name },
      'scene.theme',
      new Map([[brand.name, brand]]),
    );

    categorical[0] = '#mutated';
    expect(resolved.colors.categorical).toEqual(['#112233']);
    expect(resolved.colors.semantic).toEqual(DEFAULT_RESOLVED_THEME.colors.semantic);
    expect(Object.isFrozen(resolved.colors.categorical)).toBe(true);
  });

  it('uses the mode default when a sparse semantic role is explicitly undefined', () => {
    const brand = defineThemeStyle({ name: 'brand-undefined', resolve: () => ({ semantic: { guide: undefined } }) });
    const resolved = resolveTheme(
      DEFAULT_RESOLVED_THEME,
      { style: brand.name, mode: ThemeMode.Dark },
      'scene.theme',
      new Map([[brand.name, brand]]),
    );

    expect(resolved.colors.semantic.guide).toBe(
      resolveTheme(DEFAULT_RESOLVED_THEME, { mode: ThemeMode.Dark }, 'default.theme').colors.semantic.guide,
    );
  });

  it('wraps a Theme style callback exception without replacing its cause', () => {
    const cause = new Error('custom Theme style failed');
    const definition = defineThemeStyle({
      name: 'throwing-style',
      resolve: () => {
        throw cause;
      },
    });

    expect(() =>
      resolveTheme(
        DEFAULT_RESOLVED_THEME,
        { style: definition.name },
        'scene.theme',
        new Map([[definition.name, definition]]),
      ),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzCoreErrorCode.Resolve,
        cause,
      }),
    );
  });

  it('strictly validates external style color outputs after undefined fallback', () => {
    const colorsWithUnknown = { semantic: { error: '#aa0000' } };
    Object.defineProperty(colorsWithUnknown, 'unknown', { enumerable: true, value: undefined });
    const unknownColorField = defineThemeStyle({
      name: 'brand-unknown-color-field',
      resolve: () => colorsWithUnknown,
    });
    const semanticWithUnknown = { error: '#aa0000' };
    Object.defineProperty(semanticWithUnknown, 'unknown', { enumerable: true, value: undefined });
    const unknownSemanticRole = defineThemeStyle({
      name: 'brand-unknown',
      resolve: () => ({ semantic: semanticWithUnknown }),
    });
    const blank = defineThemeStyle({
      name: 'brand-blank',
      resolve: () => ({ semantic: { error: '   ' } }),
    });
    const emptyCategorical: [string] = ['#112233'];
    emptyCategorical.pop();
    const empty = defineThemeStyle({
      name: 'brand-empty',
      resolve: () => ({ categorical: emptyCategorical }),
    });
    const blankCategorical = defineThemeStyle({
      name: 'brand-blank-categorical',
      resolve: () => ({ categorical: [''] }),
    });

    for (const definition of [unknownColorField, unknownSemanticRole, blank, empty, blankCategorical]) {
      expect(() =>
        resolveTheme(
          DEFAULT_RESOLVED_THEME,
          { style: definition.name },
          'scene.theme',
          new Map([[definition.name, definition]]),
        ),
      ).toThrowError(
        expect.objectContaining({
          code: RetikzCoreErrorCode.Resolve,
          cause: expect.any(ZodError),
        }),
      );
    }
  });

  it('rejects non-plain external style color outputs without enumerable fields', () => {
    class EmptyStyleOutput {}

    const getterOutput = Object.defineProperty({}, 'semantic', {
      enumerable: true,
      get: () => ({ error: '#aa0000' }),
    });
    const symbolOutput = { semantic: { error: '#aa0000' }, [Symbol('metadata')]: true };
    const hiddenOutput = Object.defineProperty({}, 'hidden', { value: true });

    const invalidDefinitions = [
      { name: 'date-output', resolve: () => new Date(0) },
      { name: 'class-output', resolve: () => new EmptyStyleOutput() },
      { name: 'promise-output', resolve: () => Promise.resolve({}) },
      { name: 'semantic-date-output', resolve: () => ({ semantic: new Date(0) }) },
      { name: 'semantic-class-output', resolve: () => ({ semantic: new EmptyStyleOutput() }) },
      { name: 'semantic-promise-output', resolve: () => ({ semantic: Promise.resolve({}) }) },
      { name: 'getter-output', resolve: () => getterOutput },
      { name: 'symbol-output', resolve: () => symbolOutput },
      { name: 'hidden-output', resolve: () => hiddenOutput },
    ];

    for (const definition of invalidDefinitions) {
      expect(() =>
        Reflect.apply(resolveTheme, undefined, [
          DEFAULT_RESOLVED_THEME,
          { style: definition.name },
          'scene.theme',
          new Map([[definition.name, definition]]),
        ]),
      ).toThrowError(
        expect.objectContaining({
          code: RetikzCoreErrorCode.Resolve,
          cause: expect.any(ZodError),
        }),
      );
    }
  });

  it('fails with the selector path when the style is not registered', () => {
    expect(() => resolveTheme(DEFAULT_RESOLVED_THEME, { style: 'missing' }, 'scope.theme')).toThrow(
      "Theme style 'missing' is not registered at scope.theme.",
    );
  });
});
