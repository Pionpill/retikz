import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { defineTheme } from '../../src/contract';
import { RetikzCoreErrorCode } from '../../src/error';
import { DEFAULT_RESOLVED_THEME, resolveTheme } from '../../src/resolve/theme';
import { ThemeMode } from '../../src/shared';

describe('resolve theme', () => {
  it('inherits the parent name and mode when the sparse selector omits them', () => {
    const brand = defineTheme({
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
      { name: brand.name, mode: ThemeMode.Light },
      'scene.theme',
      styles,
    );
    const child = resolveTheme(parent, { mode: ThemeMode.Dark }, 'scene.children[0].theme', styles);

    expect(parent.name).toBe(brand.name);
    expect(child.name).toBe(brand.name);
    expect(child.mode).toBe(ThemeMode.Dark);
    expect(child.colors.semantic.error).toBe('#ffaaaa');
    expect(child).not.toBe(parent);
  });

  it('resolves default colors for an explicit mode without a name', () => {
    const resolved = resolveTheme(DEFAULT_RESOLVED_THEME, { mode: ThemeMode.Dark }, 'scene.theme');

    expect(resolved).toMatchObject({
      mode: ThemeMode.Dark,
      colors: { categorical: expect.any(Array) },
    });
    expect(resolved).not.toHaveProperty('name');
    expect(Object.isFrozen(resolved)).toBe(true);
  });

  it('resolves a registered name with the selected mode', () => {
    const brand = defineTheme({
      name: 'brand',
      resolve: ({ mode }) => ({ semantic: { error: mode === ThemeMode.Dark ? '#ffaaaa' : '#aa0000' } }),
    });

    const resolved = resolveTheme(
      DEFAULT_RESOLVED_THEME,
      { name: 'brand', mode: ThemeMode.Dark },
      'scene.theme',
      new Map([[brand.name, brand]]),
    );

    expect(resolved).toMatchObject({ name: 'brand', mode: ThemeMode.Dark });
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
    const brand = defineTheme({ name: 'brand-palette', resolve: () => ({ categorical }) });
    const resolved = resolveTheme(
      DEFAULT_RESOLVED_THEME,
      { name: brand.name },
      'scene.theme',
      new Map([[brand.name, brand]]),
    );

    categorical[0] = '#mutated';

    expect(resolved.colors.categorical).toEqual(['#112233']);
    expect(resolved.colors.semantic).toEqual(DEFAULT_RESOLVED_THEME.colors.semantic);
    expect(Object.isFrozen(resolved.colors.categorical)).toBe(true);
  });

  it('uses the mode default when a sparse semantic role is explicitly undefined', () => {
    const brand = defineTheme({ name: 'brand-undefined', resolve: () => ({ semantic: { guide: undefined } }) });
    const resolved = resolveTheme(
      DEFAULT_RESOLVED_THEME,
      { name: brand.name, mode: ThemeMode.Dark },
      'scene.theme',
      new Map([[brand.name, brand]]),
    );

    expect(resolved.colors.semantic.guide).toBe(
      resolveTheme(DEFAULT_RESOLVED_THEME, { mode: ThemeMode.Dark }, 'default.theme').colors.semantic.guide,
    );
  });

  it('wraps a Theme name callback exception without replacing its cause', () => {
    const cause = new Error('custom Theme name failed');
    const definition = defineTheme({
      name: 'throwing-name',
      resolve: () => {
        throw cause;
      },
    });

    expect(() =>
      resolveTheme(
        DEFAULT_RESOLVED_THEME,
        { name: definition.name },
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

  it('strictly validates external name color outputs after undefined fallback', () => {
    const colorsWithUnknown = { semantic: { error: '#aa0000' } };
    Object.defineProperty(colorsWithUnknown, 'unknown', { enumerable: true, value: undefined });
    const unknownColorField = defineTheme({
      name: 'brand-unknown-color-field',
      resolve: () => colorsWithUnknown,
    });
    const semanticWithUnknown = { error: '#aa0000' };
    Object.defineProperty(semanticWithUnknown, 'unknown', { enumerable: true, value: undefined });
    const unknownSemanticRole = defineTheme({
      name: 'brand-unknown',
      resolve: () => ({ semantic: semanticWithUnknown }),
    });
    const blank = defineTheme({
      name: 'brand-blank',
      resolve: () => ({ semantic: { error: '   ' } }),
    });
    const emptyCategorical: [string] = ['#112233'];
    emptyCategorical.pop();
    const empty = defineTheme({
      name: 'brand-empty',
      resolve: () => ({ categorical: emptyCategorical }),
    });
    const blankCategorical = defineTheme({
      name: 'brand-blank-categorical',
      resolve: () => ({ categorical: [''] }),
    });

    for (const definition of [unknownColorField, unknownSemanticRole, blank, empty, blankCategorical]) {
      expect(() =>
        resolveTheme(
          DEFAULT_RESOLVED_THEME,
          { name: definition.name },
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

  it('projects external name color object outputs through the owner schema', () => {
    class EmptyStyleOutput {}

    const getterOutput = Object.defineProperty({}, 'semantic', {
      enumerable: true,
      get: () => ({ error: '#aa0000' }),
    });
    const symbolOutput = { semantic: { error: '#aa0000' }, [Symbol('metadata')]: true };
    const hiddenOutput = Object.defineProperty({}, 'hidden', { value: true });

    const definitions = [
      { name: 'date-output', resolve: () => new Date(0), expectedError: DEFAULT_RESOLVED_THEME.colors.semantic.error },
      {
        name: 'class-output',
        resolve: () => new EmptyStyleOutput(),
        expectedError: DEFAULT_RESOLVED_THEME.colors.semantic.error,
      },
      {
        name: 'promise-output',
        resolve: () => Promise.resolve({}),
        expectedError: DEFAULT_RESOLVED_THEME.colors.semantic.error,
      },
      {
        name: 'semantic-date-output',
        resolve: () => ({ semantic: new Date(0) }),
        expectedError: DEFAULT_RESOLVED_THEME.colors.semantic.error,
      },
      {
        name: 'semantic-class-output',
        resolve: () => ({ semantic: new EmptyStyleOutput() }),
        expectedError: DEFAULT_RESOLVED_THEME.colors.semantic.error,
      },
      {
        name: 'semantic-promise-output',
        resolve: () => ({ semantic: Promise.resolve({}) }),
        expectedError: DEFAULT_RESOLVED_THEME.colors.semantic.error,
      },
      { name: 'getter-output', resolve: () => getterOutput, expectedError: '#aa0000' },
      { name: 'symbol-output', resolve: () => symbolOutput, expectedError: '#aa0000' },
      {
        name: 'hidden-output',
        resolve: () => hiddenOutput,
        expectedError: DEFAULT_RESOLVED_THEME.colors.semantic.error,
      },
    ];

    for (const definition of definitions) {
      expect(
        Reflect.apply(resolveTheme, undefined, [
          DEFAULT_RESOLVED_THEME,
          { name: definition.name },
          'scene.theme',
          new Map([[definition.name, definition]]),
        ]).colors.semantic.error,
        definition.name,
      ).toBe(definition.expectedError);
    }
  });

  it('fails with the selector path when the name is not registered', () => {
    expect(() => resolveTheme(DEFAULT_RESOLVED_THEME, { name: 'missing' }, 'scope.theme')).toThrow(
      "Theme name 'missing' is not registered at scope.theme.",
    );
  });
});
