import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createChartSourceSchema, createChartThemeSchema, defineChartTheme } from '../../src';
import { defineChartMark, defineChartRecipe } from '../../src/_chart/contract';

const recipeThemeSchema = z.strictObject({});
const recipeSourceSchema = createChartSourceSchema(
  'fixture',
  z.strictObject({
    chartType: z.literal('fixture'),
    encodings: z.strictObject({}),
  }),
  createChartThemeSchema(recipeThemeSchema).optional(),
);

const recipe = defineChartRecipe({
  chartType: 'fixture',
  schema: recipeSourceSchema,
  theme: {
    overridesSchema: recipeThemeSchema,
    resolutionSchema: recipeThemeSchema,
    fallback: {},
  },
  consumes: { encodings: [], properties: [] },
  marks: [],
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
  schema: z.strictObject({ kind: z.literal('fixture') }),
  resolve: () => ({ marks: [{ type: 'point', encoding: {} }] }),
});

const theme = defineChartTheme({ name: 'fixture', tokens: { chart: {} } });
describe('Chart Definition contracts', () => {
  it('preserves recipe, mark, and theme definition identity', () => {
    expect(defineChartRecipe(recipe)).toBe(recipe);
    expect(defineChartMark(mark)).toBe(mark);
    expect(defineChartTheme(theme)).toBe(theme);
  });
});
