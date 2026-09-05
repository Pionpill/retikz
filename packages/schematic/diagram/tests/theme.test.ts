import type { ResolvedTheme } from '@retikz/core';

import { DEFAULT_RESOLVED_THEME, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { DiagramThemeStyleDefinition, IRDiagramDefaults } from '../src/_diagram';

import {
  defineDiagramThemeStyle,
  DiagramDefaultsSchema,
  getDefaultDiagramTheme,
  resolveDiagramDefinitionOptions,
  resolveDiagramTheme,
  resolveDiagramThemeStyleRegistry,
} from '../src/_diagram';
import { RetikzDiagramError, RetikzDiagramErrorCode } from '../src/errors';

const themeWith = (overrides: Partial<ResolvedTheme>): ResolvedTheme => ({
  ...DEFAULT_RESOLVED_THEME,
  ...overrides,
});

const registryOf = (
  ...definitions: ReadonlyArray<DiagramThemeStyleDefinition>
): ReadonlyMap<string, DiagramThemeStyleDefinition> => resolveDiagramThemeStyleRegistry(definitions);

describe('Diagram Theme Definition and registry', () => {
  it('keeps the exact Definition object as a typed identity', () => {
    const definition: DiagramThemeStyleDefinition = {
      name: 'brand',
      resolve: () => ({ presentation: { title: { style: { textColor: '#123456' } } } }),
    };

    expect(defineDiagramThemeStyle(definition)).toBe(definition);
  });

  it('resolves Definition options once into the shared read-only style registry', () => {
    const definition = defineDiagramThemeStyle({
      name: 'brand',
      resolve: () => ({ presentation: { title: { style: { textColor: '#123456' } } } }),
    });

    const resolved = resolveDiagramDefinitionOptions({ diagramThemeStyles: [definition] });

    expect(resolved.diagramThemeStyles).toBeInstanceOf(Map);
    expect(resolved.diagramThemeStyles.get('brand')).toBe(definition);
    expect(resolveDiagramDefinitionOptions().diagramThemeStyles.size).toBe(0);
  });

  it('rejects duplicate and blank Definition names with Diagram-owned diagnostics', () => {
    const first = defineDiagramThemeStyle({
      name: 'brand',
      resolve: () => ({ presentation: { title: { style: { opacity: 1 } } } }),
    });
    const second = defineDiagramThemeStyle({
      name: 'brand',
      resolve: () => ({ presentation: { description: { style: { opacity: 1 } } } }),
    });

    for (const run of [
      () => resolveDiagramThemeStyleRegistry([first, second]),
      () =>
        resolveDiagramThemeStyleRegistry([
          { name: ' ', resolve: () => ({ presentation: { title: { style: { opacity: 1 } } } }) },
        ]),
    ]) {
      try {
        run();
        expect.unreachable('Expected a Diagram registry error');
      } catch (error) {
        if (!(error instanceof RetikzDiagramError)) throw error;
        expect(error.details).toMatchObject({ capability: 'diagram-theme-style' });
        if (error.code === RetikzDiagramErrorCode.DefinitionDuplicate) {
          expect(error.details).toMatchObject({ key: 'brand', availableKeys: ['brand'] });
        }
      }
    }
  });
});

describe('Diagram Neutral Theme', () => {
  it('resolves the exact Light baseline and keeps unspecified fields absent', () => {
    const neutral = getDefaultDiagramTheme(themeWith({ mode: ThemeMode.Light }));

    expect(neutral).toEqual({
      frame: {
        padding: 16,
        titleDescriptionGap: 6,
        headingMainGap: 16,
        drawingLegendGap: 16,
        cornerRadius: 0,
      },
      presentation: {
        title: {
          style: { textColor: '#000000', opacity: 1, font: { size: 18, weight: 600 } },
          layout: { align: 'start', lineHeight: 22 },
        },
        description: {
          style: { textColor: 'hsl(215, 12%, 48%)', opacity: 1, font: { size: 14, weight: 400 } },
          layout: { align: 'start', lineHeight: 20 },
        },
      },
    });
    expect(neutral.frame).not.toHaveProperty('background');
    expect(neutral.frame).not.toHaveProperty('border');
    expect(neutral.presentation?.title?.style?.font).not.toHaveProperty('family');
    expect(neutral.presentation?.title?.style?.font).not.toHaveProperty('style');
    expect(neutral.presentation?.title?.layout).not.toHaveProperty('maxTextWidth');
  });

  it('resolves the exact Dark title and current Core semantic guide color', () => {
    const theme = themeWith({
      mode: ThemeMode.Dark,
      colors: {
        ...DEFAULT_RESOLVED_THEME.colors,
        semantic: { ...DEFAULT_RESOLVED_THEME.colors.semantic, guide: '#94a3b8' },
      },
    });

    const neutral = getDefaultDiagramTheme(theme);

    expect(neutral.presentation?.title?.style?.textColor).toBe('#ffffff');
    expect(neutral.presentation?.description?.style?.textColor).toBe('#94a3b8');
    expect(neutral.presentation?.description?.style?.font).not.toHaveProperty('family');
    expect(neutral.presentation?.description?.style?.font).not.toHaveProperty('style');
    expect(neutral.presentation?.description?.layout).not.toHaveProperty('maxTextWidth');
  });
});

describe('Diagram Theme cascade', () => {
  it('applies named defaults then author defaults with whole-font replacement', () => {
    const definition = defineDiagramThemeStyle({
      name: 'brand',
      resolve: theme => ({
        frame: {
          padding: { left: 20 },
          background: { fill: theme.colors.semantic.guide },
          border: { stroke: '#64748b', strokeWidth: 1 },
        },
        presentation: {
          title: { style: { textColor: '#1d4ed8', font: { family: 'Inter', weight: 700, style: 'italic' } } },
        },
      }),
    });
    const inline = DiagramDefaultsSchema.parse({
      frame: {
        background: { fill: '#f8fafc', fillOpacity: 0.8 },
        border: { strokeWidth: 3 },
      },
      presentation: { title: { style: { opacity: 0.75, font: { size: 24, style: 'normal' } } } },
    });

    const resolved = resolveDiagramTheme(themeWith({ style: 'brand' }), registryOf(definition), inline);

    expect(resolved.frame.padding).toEqual({ top: 0, right: 0, bottom: 0, left: 20 });
    expect(resolved.frame.background).toEqual({ fill: '#f8fafc', fillOpacity: 0.8 });
    expect(resolved.frame.border).toEqual({ strokeWidth: 3 });
    expect(resolved.presentation.title).toMatchObject({
      textColor: '#1d4ed8',
      opacity: 0.75,
      font: { size: 24, style: 'normal' },
    });
  });

  it('ignores empty and undefined author groups without discarding the named defaults', () => {
    const definition = defineDiagramThemeStyle({
      name: 'paper',
      resolve: () => ({
        frame: { padding: 12 },
        presentation: { title: { style: { font: { family: 'serif', size: 24 } } } },
      }),
    });
    const theme = themeWith({ style: 'paper' });
    const baseline = resolveDiagramTheme(theme, registryOf(definition));
    const empty = resolveDiagramTheme(theme, registryOf(definition), {
      frame: { padding: undefined },
      presentation: { title: { style: { font: {}, opacity: undefined }, layout: {} } },
    });
    expect(empty).toEqual(baseline);
  });

  it('fails when the effective Core style lacks a same-named Diagram Definition', () => {
    try {
      resolveDiagramTheme(themeWith({ style: 'missing' }), registryOf());
      expect.unreachable('Expected missing Diagram style failure');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;
      expect(error.code).toBe(RetikzDiagramErrorCode.DefinitionNotRegistered);
      expect(error.details).toMatchObject({
        capability: 'diagram-theme-style',
        key: 'missing',
        availableKeys: [],
      });
    }
  });

  it('preserves callback exceptions as the cause of a Diagram error', () => {
    const cause = new Error('external callback failed');
    const definition = defineDiagramThemeStyle({
      name: 'broken',
      resolve: () => {
        throw cause;
      },
    });

    try {
      resolveDiagramTheme(themeWith({ style: 'broken' }), registryOf(definition));
      expect.unreachable('Expected callback failure');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;
      expect(error.code).toBe(RetikzDiagramErrorCode.DefinitionCallbackFailed);
      expect(error.cause).toBe(cause);
    }
  });

  it('accepts empty Definition defaults as a no-op', () => {
    const definition = defineDiagramThemeStyle({ name: 'empty', resolve: () => ({}) });
    expect(resolveDiagramTheme(themeWith({ style: 'empty' }), registryOf(definition))).toEqual(
      resolveDiagramTheme(themeWith({}), registryOf()),
    );
  });

  it.each([
    [
      'unknown output field',
      () => {
        const output: IRDiagramDefaults = { presentation: { title: { style: { opacity: 1 } } } };
        Object.defineProperty(output, 'unknown', { value: true, enumerable: true });
        return output;
      },
    ],
  ])('rejects %s from a runtime Definition callback', (_name, resolve) => {
    const definition = defineDiagramThemeStyle({ name: 'invalid', resolve });

    try {
      resolveDiagramTheme(themeWith({ style: 'invalid' }), registryOf(definition));
      expect.unreachable('Expected invalid Definition output');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;
      expect(error.code).toBe(RetikzDiagramErrorCode.DefinitionCallbackFailed);
      expect(error.cause).toBeDefined();
    }
  });
});
