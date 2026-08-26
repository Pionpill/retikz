import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import { createChartSourceSchema, createChartThemeSchema, defineChartTheme } from '../../src';
import { defineChartMark, defineChartRecipe } from '../../src/_chart/contract';
import { resolveChartProviderRegistry } from '../../src/_chart/providers';

const resolveDirectEncodings = (context: { encodings: Readonly<Record<string, unknown>> }) => ({
  encodings: context.encodings as IRJsonObject,
  transform: [],
  scales: [],
  positionScales: {},
  removedRecipeScales: new Set<string>(),
});

const recipeThemeSchema = strictObject({});
const recipeSourceSchema = createChartSourceSchema(
  'fixture',
  strictObject({
    chartType: literal('fixture'),
    encodings: strictObject({}),
  }),
  createChartThemeSchema(recipeThemeSchema).optional(),
);

const recipe = defineChartRecipe({
  chartType: 'fixture',
  encodingSlots: [],
  schema: recipeSourceSchema,
  theme: {
    overridesSchema: recipeThemeSchema,
    resolutionSchema: recipeThemeSchema,
    fallback: {},
  },
  consumes: { encodings: [], properties: [] },
  marks: [],
  resolveEncodings: resolveDirectEncodings,
  resolve: () => ({
    scaffold: {
      scales: [],
      spatial: { coordinate: { type: 'cartesian2D' }, replaceable: false },
    },
    semanticMarks: [{ kind: 'fixture', plotMarks: [{ type: 'point', encoding: {} }] }],
  }),
});

const mark = defineChartMark({
  kind: 'fixture',
  schema: strictObject({ kind: literal('fixture') }),
  resolve: () => ({ marks: [{ type: 'point', encoding: {} }] }),
});

const theme = defineChartTheme({ name: 'fixture', tokens: { chart: {} } });
describe('Chart Definition contracts', () => {
  it('preserves recipe, mark, and theme definition identity', () => {
    expect(defineChartRecipe(recipe)).toBe(recipe);
    expect(defineChartMark(mark)).toBe(mark);
    expect(defineChartTheme(theme)).toBe(theme);
  });

  it('uses ordered encodingSlots as the validated recipe encoding authority', () => {
    const orderedRecipe = defineChartRecipe({
      ...recipe,
      encodingSlots: ['x', 'y'],
    });
    expect(orderedRecipe.encodingSlots).toEqual(['x', 'y']);
    expect(() =>
      resolveChartProviderRegistry([{ family: 'fixture', recipe: orderedRecipe, themeDefinitions: [] }]),
    ).not.toThrow();

    const duplicateRecipe = defineChartRecipe({
      ...recipe,
      encodingSlots: ['x', 'x'],
    });
    expect(() =>
      resolveChartProviderRegistry([{ family: 'fixture', recipe: duplicateRecipe, themeDefinitions: [] }]),
    ).toThrowError(
      expect.objectContaining({
        details: expect.objectContaining({ path: expect.arrayContaining(['encodingSlots']) }),
      }),
    );
  });
});
import type { IRJsonObject } from '@retikz/core';
