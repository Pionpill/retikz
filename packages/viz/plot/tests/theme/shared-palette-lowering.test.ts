import type { IRScene } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { DEFAULT_PLOT_COLORS, lowerPlots, PlotSpecSchema, PlotThemeTokenDefinition } from '../../src';

const rows = [
  { x: 0, y: 1, category: 'A' },
  { x: 1, y: 2, category: 'B' },
];

const sharedPalette = ['#102030', '#f0c0a0'];

const plotSpec = PlotSpecSchema.parse({
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'rows' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
    { type: 'ordinal', name: 'color' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [
    {
      type: 'point',
      encoding: {
        x: { field: 'x' },
        y: { field: 'y' },
        color: { field: 'category', scale: 'color' },
      },
    },
  ],
});

const fillsOf = (value: unknown): Array<unknown> => {
  if (value === null || typeof value !== 'object') return [];
  const item = value as { fill?: unknown; children?: ReadonlyArray<unknown> };
  return [
    ...(Object.hasOwn(item, 'fill') ? [item.fill] : []),
    ...(item.children?.flatMap(child => fillsOf(child)) ?? []),
  ];
};

describe('Plot shared categorical palette lowering', () => {
  it('formal ordinal mark lowering uses Core shared palette instead of DEFAULT_PLOT_COLORS', () => {
    expect(sharedPalette.every(color => !DEFAULT_PLOT_COLORS.includes(color))).toBe(true);

    const scene: IRScene = {
      version: 1,
      type: 'scene',
      theme: { tokens: { core: { 'palette.categorical': sharedPalette } } },
      children: [plotSpec],
    };
    const compiled = compileToScene(scene, {
      composites: lowerPlots({ rows }),
      themeTokenDefinitions: [PlotThemeTokenDefinition],
    }).scene;
    const fills = compiled.primitives.flatMap(primitive => fillsOf(primitive));
    const ordinalFills = fills.filter(
      (fill): fill is string => typeof fill === 'string' && sharedPalette.includes(fill),
    );

    expect(ordinalFills).toEqual(sharedPalette);
    expect(ordinalFills).not.toContain(DEFAULT_PLOT_COLORS[0]);
  });
});
