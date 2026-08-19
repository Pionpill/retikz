import { describe, expect, it } from 'vitest';

import type { ChartRecipe } from '../../src/_shared';
import type { IRScatterChart } from '../../src/point/scatter';

import { chartRecipeOf } from '../../src/_shared';
import { ScatterChartRecipe, ScatterChartSchema } from '../../src/point/scatter';

const scatter = {
  namespace: 'chart',
  type: 'scatter',
  plot: { data: { reference: 'rows' } },
  config: { encoding: { x: { field: 'amount' }, y: { field: 'margin' } } },
} as const;

describe('Chart recipe binding', () => {
  it('parses unknown input once and does not expose the parsed Source IR', () => {
    let parseCount = 0;
    const schema = ScatterChartSchema.transform(value => {
      parseCount += 1;
      return value;
    });
    const recipe: ChartRecipe<IRScatterChart> = {
      ...ScatterChartRecipe,
      schema,
    };
    const bound = chartRecipeOf(recipe).parseAndBind(scatter);

    expect(parseCount).toBe(1);
    expect(bound).not.toHaveProperty('spec');
    expect(bound.type).toBe('scatter');
    expect(bound.base.type).toBe('base');
  });

  it('binds an already parsed exact IR without entering the schema again', () => {
    const parsed = ScatterChartSchema.parse(scatter);
    const bound = ScatterChartRecipe.bind(parsed);

    expect(bound.type).toBe('scatter');
    expect(bound.plot).toEqual(scatter.plot);
  });
});
