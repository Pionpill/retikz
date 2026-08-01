import type { IRPlotSpec } from '@retikz/plot';
import type { z } from 'zod';

import { describe, expect, it } from 'vitest';
import { z as zod } from 'zod';

import type { ChartRecipe, ChartRecipeSeed } from '../../src/providers';

import { chartRecipeOf } from '../../src/providers';
import { assertChartSpatialRoot, ChartSharedBaseSchema } from '../../src/schemas';

const minimalPlot = (field: string): IRPlotSpec => ({
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'rows' },
  scales: [{ type: 'linear', name: 'x' }],
  coordinate: { type: 'cartesian2D', x: 'x' },
  marks: [{ type: 'point', encoding: { x: { field, scale: 'x' } } }],
});

const emptySeed = (field: string): ChartRecipeSeed => ({
  plot: minimalPlot(field),
  members: [],
  patches: [],
});

describe('Chart recipe typing', () => {
  it('异构 recipe 绑定后只解析一次并恢复各自的精确 spec', () => {
    let parseCountA = 0;
    let parseCountB = 0;
    const VariantASchema = ChartSharedBaseSchema.extend({
      namespace: zod.literal('chart'),
      type: zod.literal('variant-a'),
      fieldA: zod.string().min(1),
    })
      .superRefine(assertChartSpatialRoot)
      .transform(spec => {
        parseCountA += 1;
        return spec;
      });
    const VariantBSchema = ChartSharedBaseSchema.extend({
      namespace: zod.literal('chart'),
      type: zod.literal('variant-b'),
      fieldB: zod.number(),
    })
      .superRefine(assertChartSpatialRoot)
      .transform(spec => {
        parseCountB += 1;
        return spec;
      });
    type VariantA = z.infer<typeof VariantASchema>;
    type VariantB = z.infer<typeof VariantBSchema>;

    const recipeA: ChartRecipe<VariantA> = {
      type: 'variant-a',
      schema: VariantASchema,
      createSeed: spec => emptySeed(spec.fieldA),
      validateCore: (spec, plotSpec) => {
        expect(spec.fieldA).toBe('amount');
        expect(plotSpec.marks[0]).toMatchObject({
          encoding: { x: { field: 'amount', scale: 'x' } },
        });
      },
    };
    const recipeB: ChartRecipe<VariantB> = {
      type: 'variant-b',
      schema: VariantBSchema,
      createSeed: spec => emptySeed(String(spec.fieldB)),
      validateCore: spec => {
        expect(spec.fieldB).toBe(42);
      },
    };

    const tuple = [chartRecipeOf(recipeA), chartRecipeOf(recipeB)] as const;
    const boundA = tuple[0].bind({
      namespace: 'chart',
      type: 'variant-a',
      data: { reference: 'rows' },
      fieldA: 'amount',
    });
    const boundB = tuple[1].bind({
      namespace: 'chart',
      type: 'variant-b',
      data: { reference: 'rows' },
      fieldB: 42,
    });

    expect(boundA.createSeed()).toEqual(emptySeed('amount'));
    expect(boundB.createSeed()).toEqual(emptySeed('42'));
    boundA.validateCore(boundA.createSeed().plot);
    boundB.validateCore(boundB.createSeed().plot);
    expect(parseCountA).toBe(1);
    expect(parseCountB).toBe(1);

    // @ts-expect-error 不同 variant 的 callback 不能交叉赋值
    const incompatibleRecipe: ChartRecipe<VariantA> = recipeB;
    expect(incompatibleRecipe.type).toBe('variant-b');
  });
});
