import type { ResolvedTheme } from '@retikz/core';

import { DEFAULT_RESOLVED_THEME, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  createDiagramThemeStyleRegistry,
  defineDiagramThemeStyle,
  resolveDiagramAppearance,
} from '../../src/foundation';

const darkTheme: ResolvedTheme = { ...DEFAULT_RESOLVED_THEME, mode: ThemeMode.Dark };

describe('Diagram private theme resolution', () => {
  it('resolves Neutral defaults from the effective Core mode', () => {
    const light = resolveDiagramAppearance(DEFAULT_RESOLVED_THEME, undefined, undefined, new Map());
    const dark = resolveDiagramAppearance(darkTheme, undefined, undefined, new Map());

    expect(light.title.textColor).toBe('#000000');
    expect(dark.title.textColor).toBe('#ffffff');
    expect(light.description.textColor).toBe(DEFAULT_RESOLVED_THEME.colors.semantic.guide);
    expect(light.frame).toEqual({
      padding: 16,
      titleDescriptionGap: 6,
      headingMainGap: 16,
      drawingLegendGap: 16,
      cornerRadius: 0,
    });
  });

  it('applies registered style, inline theme, and Frame overrides in order', () => {
    const style = defineDiagramThemeStyle({
      name: 'paper',
      resolve: () => ({
        frame: { padding: 20, background: { fill: '#ffffff', fillOpacity: 1 } },
        title: { font: { family: 'serif', size: 24 }, opacity: 0.8 },
      }),
    });
    const resolved = resolveDiagramAppearance(
      { ...DEFAULT_RESOLVED_THEME, style: 'paper' },
      { title: { font: { size: 30 } }, description: { opacity: 0.5 } },
      { padding: 0, titleDescriptionGap: 0 },
      createDiagramThemeStyleRegistry([style]),
    );

    expect(resolved.frame).toEqual({
      padding: 0,
      titleDescriptionGap: 0,
      headingMainGap: 16,
      drawingLegendGap: 16,
      background: { fill: '#ffffff', fillOpacity: 1 },
      cornerRadius: 0,
    });
    expect(resolved.title).toEqual({
      textColor: '#000000',
      opacity: 0.8,
      font: { family: 'serif', size: 30, weight: 600 },
      align: 'start',
      lineHeight: 22,
    });
    expect(resolved.description.opacity).toBe(0.5);
  });

  it('recursively merges only font fields and fails closed for duplicate or missing styles', () => {
    const duplicate = defineDiagramThemeStyle({ name: 'same', resolve: () => ({ title: { font: { size: 20 } } }) });
    expect(() => createDiagramThemeStyleRegistry([duplicate, duplicate])).toThrow(/duplicate/i);
    expect(() =>
      resolveDiagramAppearance({ ...DEFAULT_RESOLVED_THEME, style: 'missing' }, undefined, undefined, new Map()),
    ).toThrow(/not registered/i);

    const resolved = resolveDiagramAppearance(
      DEFAULT_RESOLVED_THEME,
      { title: { font: { size: 26 } } },
      undefined,
      new Map(),
    );
    expect(resolved.title.font).toEqual({ size: 26, weight: 600 });
  });
});
