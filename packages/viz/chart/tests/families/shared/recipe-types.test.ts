import type { IRPlotSpec } from '@retikz/plot';
import type { z } from 'zod';

import { describe, expect, it } from 'vitest';
import { z as zod } from 'zod';

import type { ChartRecipe, ChartRecipeSeed, ChartRecipeStyleContext } from '../../../src/families/shared';

import { ConnectedScatterChartRecipe } from '../../../src/families/scatter-points/connected-scatter';
import { ScatterChartRecipe } from '../../../src/families/scatter-points/scatter';
import { chartRecipeOf } from '../../../src/resolution/catalog';
import { assertChartSpatialRoot, ChartSharedBaseSchema } from '../../../src/schemas/common';

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

const styleContext: ChartRecipeStyleContext = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
  seriesColor: '#475569',
};

describe('Chart recipe typing', () => {
  it('让每个 recipe leaf bind 都移除显式 undefined 并保持 JSON round-trip', () => {
    const scatter = chartRecipeOf(ScatterChartRecipe).bind({
      namespace: 'chart',
      type: 'scatter',
      id: undefined,
      data: { reference: 'rows' },
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
      mark: { opacity: { kind: 'constant', value: 0.5 } },
    }).spec;
    const connectedScatter = chartRecipeOf(ConnectedScatterChartRecipe).bind({
      namespace: 'chart',
      type: 'connected-scatter',
      id: undefined,
      data: { reference: 'rows' },
      encoding: {
        x: { field: 'amount', scale: undefined },
        y: { field: 'margin' },
        order: 'month',
        series: undefined,
      },
      components: { connection: undefined },
    }).spec;

    expect(Object.hasOwn(scatter, 'id')).toBe(false);
    expect(JSON.parse(JSON.stringify(scatter))).toEqual(scatter);
    expect(Object.hasOwn(connectedScatter, 'id')).toBe(false);
    expect(JSON.parse(JSON.stringify(connectedScatter))).toEqual(connectedScatter);
  });

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

    expect(boundA.createSeed(styleContext)).toEqual(emptySeed('amount'));
    expect(boundB.createSeed(styleContext)).toEqual(emptySeed('42'));
    boundA.validateCore(boundA.createSeed(styleContext).plot);
    boundB.validateCore(boundB.createSeed(styleContext).plot);
    expect(parseCountA).toBe(1);
    expect(parseCountB).toBe(1);

    // @ts-expect-error 不同 variant 的 callback 不能交叉赋值
    const incompatibleRecipe: ChartRecipe<VariantA> = recipeB;
    expect(incompatibleRecipe.type).toBe('variant-b');
  });
});
