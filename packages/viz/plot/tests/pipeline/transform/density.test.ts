import type { AnyTransformDefinition, ExternalRow, TransformContext } from '@retikz/data';

import { applyTransforms as applyDataTransforms, collectTransformFields, defineTransform } from '@retikz/data';
import { readSourceIndices, tagSourceIndex } from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRPlotTransform } from '../../../src/schemas';

import { collectSourceFields } from '../../../src/pipeline/source-fields';
import { resolvePlotTransformRegistry } from '../../../src/providers';
import { createFieldCollector } from '../../../src/providers/channel/shared';
import { TransformSchema } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas/plot';

const PLOT_TRANSFORM_REGISTRY = resolvePlotTransformRegistry();

const applyTransforms = (
  rows: Array<ExternalRow>,
  operations?: Array<IRPlotTransform>,
  registry: ReadonlyMap<string, AnyTransformDefinition> = PLOT_TRANSFORM_REGISTRY,
  context?: TransformContext,
): Array<ExternalRow> => applyDataTransforms(rows, operations, registry, context);

const densityOperation = (operation: unknown) => TransformSchema.parse(operation);

describe('density transform schema (contract)', () => {
  it('accepts density transform and preserves JSON round trip', () => {
    const operation = {
      kind: 'density',
      field: 'value',
      groupBy: ['species'],
      bandwidth: { kind: 'silverman' },
      sampleCount: 96,
      extent: [0, 10],
      xAs: 'densityX',
      densityAs: 'density',
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('rejects malformed density JSON with useful zod errors', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'density', field: 'value', sampleCount: 1, xAs: 'x', densityAs: 'density' }),
    ).toThrow();
    expect(() =>
      TransformSchema.parse({ kind: 'density', field: 'value', extent: [4, 4], xAs: 'x', densityAs: 'density' }),
    ).toThrow();
    expect(() =>
      TransformSchema.parse({
        kind: 'density',
        field: 'value',
        bandwidth: { kind: 'value', value: -1 },
        xAs: 'x',
        densityAs: 'density',
      }),
    ).toThrow();
  });
});

describe('density transform behavior (contract)', () => {
  const rows: Array<ExternalRow> = [
    { species: 'setosa', value: 0 },
    { species: 'setosa', value: 4 },
    { species: 'virginica', value: 10 },
    { species: 'virginica', value: 14 },
  ];

  it('computes explicit-bandwidth density samples over explicit extent', () => {
    const out = applyTransforms(rows.slice(0, 2), [
      densityOperation({
        kind: 'density',
        field: 'value',
        bandwidth: { kind: 'value', value: 2 },
        sampleCount: 5,
        extent: [0, 8],
        xAs: 'densityX',
        densityAs: 'density',
      }),
    ]);

    expect(out.map(row => row.densityX)).toEqual([0, 2, 4, 6, 8]);
    expect(out).toHaveLength(5);
    expect(out.every(row => typeof row.density === 'number' && Number.isFinite(row.density) && row.density >= 0)).toBe(
      true,
    );
    expect(out[0].density).toBeCloseTo(out[2].density as number, 6);
    expect(out[1].density).toBeGreaterThan(out[4].density as number);
  });

  it('uses Silverman bandwidth by default and emits sorted samples', () => {
    const out = applyTransforms(
      [{ value: 0 }, { value: 1 }, { value: 2 }, { value: 4 }, { value: 8 }],
      [densityOperation({ kind: 'density', field: 'value', xAs: 'densityX', densityAs: 'density' })],
    );

    expect(out).toHaveLength(64);
    expect(out[0].densityX).toBeLessThan(0);
    for (let index = 1; index < out.length; index++) {
      expect(out[index].densityX as number).toBeGreaterThan(out[index - 1].densityX as number);
    }
    expect(out.every(row => Number.isFinite(row.density))).toBe(true);
  });

  it('computes density independently per group and preserves group keys', () => {
    const out = applyTransforms(rows, [
      densityOperation({
        kind: 'density',
        field: 'value',
        groupBy: ['species'],
        bandwidth: { kind: 'value', value: 2 },
        sampleCount: 3,
        xAs: 'densityX',
        densityAs: 'density',
      }),
    ]);

    expect(out).toHaveLength(6);
    expect(out.filter(row => row.species === 'setosa')).toHaveLength(3);
    expect(out.filter(row => row.species === 'virginica')).toHaveLength(3);
    expect(out.map(row => Object.keys(row).sort())).toEqual([
      ['density', 'densityX', 'species'],
      ['density', 'densityX', 'species'],
      ['density', 'densityX', 'species'],
      ['density', 'densityX', 'species'],
      ['density', 'densityX', 'species'],
      ['density', 'densityX', 'species'],
    ]);
  });

  it('allows explicit bandwidth for single-value and identical-value groups', () => {
    const single = applyTransforms(
      [{ value: 5 }],
      [
        densityOperation({
          kind: 'density',
          field: 'value',
          bandwidth: { kind: 'value', value: 1 },
          sampleCount: 3,
          xAs: 'x',
          densityAs: 'd',
        }),
      ],
    );
    expect(single.map(row => row.x)).toEqual([2, 5, 8]);
    expect(single[1].d).toBeGreaterThan(single[0].d as number);

    const identical = applyTransforms(
      [{ value: 4 }, { value: 4 }],
      [
        densityOperation({
          kind: 'density',
          field: 'value',
          bandwidth: { kind: 'value', value: 2 },
          sampleCount: 2,
          xAs: 'x',
          densityAs: 'd',
        }),
      ],
    );
    expect(identical.map(row => row.x)).toEqual([-2, 10]);
  });

  it('fails loud when default Silverman bandwidth cannot be computed', () => {
    expect(() =>
      applyTransforms(
        [{ value: 5 }],
        [densityOperation({ kind: 'density', field: 'value', xAs: 'x', densityAs: 'd' })],
      ),
    ).toThrow(/bandwidth|sample/i);
    expect(() =>
      applyTransforms(
        [{ value: 5 }, { value: 5 }],
        [densityOperation({ kind: 'density', field: 'value', xAs: 'x', densityAs: 'd' })],
      ),
    ).toThrow(/bandwidth|identical/i);
    expect(() =>
      applyTransforms(
        [{ value: 'NA' }],
        [densityOperation({ kind: 'density', field: 'value', xAs: 'x', densityAs: 'd' })],
      ),
    ).toThrow(/finite/i);
  });

  it('records group-level provenance source indices', () => {
    const tagged = tagSourceIndex(rows);
    const out = applyTransforms(tagged, [
      densityOperation({
        kind: 'density',
        field: 'value',
        groupBy: ['species'],
        bandwidth: { kind: 'value', value: 2 },
        sampleCount: 2,
        xAs: 'densityX',
        densityAs: 'density',
      }),
    ]);

    expect(readSourceIndices(out[0])).toEqual([0, 1]);
    expect(readSourceIndices(out[2])).toEqual([2, 3]);
  });

  it('reports input and output fields for strict model collection', () => {
    const fields = new Set<string>();
    const derivedOutputs = new Set<string>();

    collectTransformFields(
      densityOperation({
        kind: 'density',
        field: 'value',
        groupBy: ['species'],
        xAs: 'densityX',
        densityAs: 'density',
      }),
      createFieldCollector(fields),
      derivedOutputs,
      resolvePlotTransformRegistry(),
    );

    expect([...fields].sort()).toEqual(['species', 'value']);
    expect([...derivedOutputs].sort()).toEqual(['density', 'densityX']);
  });

  it('strict model accepts density output fields as derived fields', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'samples',
        model: [
          { name: 'species', type: 'categorical' },
          { name: 'value', type: 'continuous' },
        ],
      },
      transform: [{ kind: 'density', field: 'value', groupBy: ['species'], xAs: 'densityX', densityAs: 'density' }],
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          series: 'species',
          order: 'densityX',
          encoding: { x: { field: 'densityX' }, y: { field: 'density' } },
        },
      ],
    });

    expect([...collectSourceFields(spec, resolvePlotTransformRegistry())].sort()).toEqual(['species', 'value']);
  });

  it('rejects custom transform registration collisions with density', () => {
    const collision = defineTransform({
      schema: z.object({ kind: z.literal('density') }),
      apply: inputRows => inputRows,
    });

    expect(() => resolvePlotTransformRegistry([collision])).toThrow(/duplicate transform registration/i);
  });
});
