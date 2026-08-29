import type { AnyTransformDefinition, ExternalRow, TransformContext } from '@retikz/data';

import { applyTransforms as applyDataTransforms, collectTransformFields, defineTransform } from '@retikz/data';
import { readSourceIndices, tagSourceIndex } from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { literal, object } from 'zod';

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

const smoothOperation = (operation: unknown) => TransformSchema.parse(operation);

describe('smooth transform schema (contract)', () => {
  it('accepts smooth transform and preserves JSON round trip', () => {
    const operation = {
      kind: 'smooth',
      x: 'time',
      y: 'value',
      groupBy: ['series'],
      method: { kind: 'linear' },
      sampleCount: 96,
      extent: [0, 10],
      xAs: 'trendX',
      yAs: 'trendY',
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it.each([
    { kind: 'linear' },
    { kind: 'quadratic' },
    { kind: 'polynomial' },
    { kind: 'polynomial', order: 2 },
    { kind: 'polynomial', order: 6 },
    { kind: 'logarithmic' },
    { kind: 'exponential' },
    { kind: 'power' },
  ])('accepts complete regression method object: $kind $order', method => {
    const operation = {
      kind: 'smooth',
      x: 'time',
      y: 'value',
      method,
      xAs: 'trendX',
      yAs: 'trendY',
    };

    expect(TransformSchema.parse(operation)).toEqual(operation);
  });

  it('rejects malformed smooth JSON with useful zod errors', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'smooth', x: 'time', y: 'value', sampleCount: 1, xAs: 'x', yAs: 'y' }),
    ).toThrow();
    expect(() =>
      TransformSchema.parse({ kind: 'smooth', x: 'time', y: 'value', extent: [4, 4], xAs: 'x', yAs: 'y' }),
    ).toThrow();
    expect(() =>
      TransformSchema.parse({
        kind: 'smooth',
        x: 'time',
        y: 'value',
        method: { kind: 'movingAverage' },
        xAs: 'x',
        yAs: 'y',
      }),
    ).toThrow();
  });
});

describe('smooth transform behavior (contract)', () => {
  const rows: Array<ExternalRow> = [
    { series: 'A', time: 0, value: 1 },
    { series: 'A', time: 1, value: 3 },
    { series: 'A', time: 2, value: 5 },
    { series: 'B', time: 0, value: 10 },
    { series: 'B', time: 2, value: 10 },
    { series: 'B', time: 4, value: 10 },
  ];

  it('computes a known linear regression line over explicit extent', () => {
    const out = applyTransforms(rows.slice(0, 3), [
      smoothOperation({
        kind: 'smooth',
        x: 'time',
        y: 'value',
        sampleCount: 5,
        extent: [0, 4],
        xAs: 'trendX',
        yAs: 'trendY',
      }),
    ]);

    expect(out.map(row => row.trendX)).toEqual([0, 1, 2, 3, 4]);
    expect(out.map(row => row.trendY)).toEqual([1, 3, 5, 7, 9]);
  });

  it('recovers known quadratic and polynomial models', () => {
    const quadraticRows: Array<ExternalRow> = [-2, -1, 0, 1, 2].map(x => ({ x, y: x ** 2 + 2 * x + 1 }));
    const cubicRows: Array<ExternalRow> = [-2, -1, 0, 1, 2].map(x => ({ x, y: x ** 3 - 2 * x + 1 }));

    const quadratic = applyTransforms(quadraticRows, [
      smoothOperation({
        kind: 'smooth',
        x: 'x',
        y: 'y',
        method: { kind: 'quadratic' },
        sampleCount: 5,
        extent: [-2, 2],
        xAs: 'trendX',
        yAs: 'trendY',
      }),
    ]);
    const polynomialDegreeTwo = applyTransforms(quadraticRows, [
      smoothOperation({
        kind: 'smooth',
        x: 'x',
        y: 'y',
        method: { kind: 'polynomial', order: 2 },
        sampleCount: 5,
        extent: [-2, 2],
        xAs: 'trendX',
        yAs: 'trendY',
      }),
    ]);
    const polynomialDefault = applyTransforms(cubicRows, [
      smoothOperation({
        kind: 'smooth',
        x: 'x',
        y: 'y',
        method: { kind: 'polynomial' },
        sampleCount: 5,
        extent: [-2, 2],
        xAs: 'trendX',
        yAs: 'trendY',
      }),
    ]);

    expect(quadratic.map(row => row.trendX)).toEqual([-2, -1, 0, 1, 2]);
    expect(polynomialDegreeTwo.map(row => row.trendX)).toEqual([-2, -1, 0, 1, 2]);
    expect(polynomialDefault.map(row => row.trendX)).toEqual([-2, -1, 0, 1, 2]);
    quadratic.forEach((row, index) => expect(row.trendY).toBeCloseTo([1, 0, 1, 4, 9][index], 10));
    polynomialDegreeTwo.forEach((row, index) => expect(row.trendY).toBeCloseTo(quadratic[index].trendY as number, 10));
    polynomialDefault.forEach((row, index) => expect(row.trendY).toBeCloseTo([-3, 2, 1, 0, 5][index], 10));
  });

  it('recovers known logarithmic, exponential and power models', () => {
    const logarithmic = applyTransforms(
      [0, 1, 2, 3].map(exponent => {
        const x = Math.exp(exponent);
        return { x, y: 2 + 3 * Math.log(x) };
      }),
      [
        smoothOperation({
          kind: 'smooth',
          x: 'x',
          y: 'y',
          method: { kind: 'logarithmic' },
          sampleCount: 2,
          extent: [1, Math.exp(3)],
          xAs: 'trendX',
          yAs: 'trendY',
        }),
      ],
    );
    const exponential = applyTransforms(
      [0, 2, 4].map(x => ({ x, y: 2 * Math.exp(0.5 * x) })),
      [
        smoothOperation({
          kind: 'smooth',
          x: 'x',
          y: 'y',
          method: { kind: 'exponential' },
          sampleCount: 3,
          extent: [0, 4],
          xAs: 'trendX',
          yAs: 'trendY',
        }),
      ],
    );
    const power = applyTransforms(
      [1, 2, 4].map(x => ({ x, y: 3 * x ** 2 })),
      [
        smoothOperation({
          kind: 'smooth',
          x: 'x',
          y: 'y',
          method: { kind: 'power' },
          sampleCount: 4,
          extent: [1, 4],
          xAs: 'trendX',
          yAs: 'trendY',
        }),
      ],
    );

    expect(logarithmic.map(row => row.trendX)).toEqual([1, Math.exp(3)]);
    expect(exponential.map(row => row.trendX)).toEqual([0, 2, 4]);
    expect(power.map(row => row.trendX)).toEqual([1, 2, 3, 4]);
    logarithmic.forEach((row, index) => expect(row.trendY).toBeCloseTo([2, 11][index], 10));
    exponential.forEach((row, index) => expect(row.trendY).toBeCloseTo([2, 2 * Math.E, 2 * Math.E ** 2][index], 10));
    power.forEach((row, index) => expect(row.trendY).toBeCloseTo([3, 12, 27, 48][index], 10));
  });

  it('uses observed x extent and default sample count', () => {
    const out = applyTransforms(rows.slice(0, 3), [
      smoothOperation({
        kind: 'smooth',
        x: 'time',
        y: 'value',
        xAs: 'trendX',
        yAs: 'trendY',
      }),
    ]);

    expect(out).toHaveLength(64);
    expect(out[0].trendX).toBe(0);
    expect(out.at(-1)?.trendX).toBe(2);
    for (let index = 1; index < out.length; index++) {
      expect(out[index].trendX as number).toBeGreaterThan(out[index - 1].trendX as number);
    }
    expect(out.every(row => Number.isFinite(row.trendY))).toBe(true);
  });

  it('computes smooth lines independently per group and preserves group keys', () => {
    const out = applyTransforms(rows, [
      smoothOperation({
        kind: 'smooth',
        x: 'time',
        y: 'value',
        groupBy: ['series'],
        sampleCount: 3,
        xAs: 'trendX',
        yAs: 'trendY',
      }),
    ]);

    expect(out).toHaveLength(6);
    expect(out.filter(row => row.series === 'A').map(row => row.trendY)).toEqual([1, 3, 5]);
    expect(out.filter(row => row.series === 'B').map(row => row.trendY)).toEqual([10, 10, 10]);
    expect(out.map(row => Object.keys(row).sort())).toEqual([
      ['series', 'trendX', 'trendY'],
      ['series', 'trendX', 'trendY'],
      ['series', 'trendX', 'trendY'],
      ['series', 'trendX', 'trendY'],
      ['series', 'trendX', 'trendY'],
      ['series', 'trendX', 'trendY'],
    ]);
  });

  it('filters non-finite pairs but keeps valid pairs', () => {
    const out = applyTransforms(
      [
        { time: 0, value: 1 },
        { time: 1, value: 'NA' },
        { time: Number.NaN, value: 99 },
        { time: 2, value: 5 },
      ],
      [smoothOperation({ kind: 'smooth', x: 'time', y: 'value', sampleCount: 2, xAs: 'x', yAs: 'y' })],
    );

    expect(out).toEqual([
      { x: 0, y: 1 },
      { x: 2, y: 5 },
    ]);
  });

  it('fails loud for too few finite pairs and vertical x variance', () => {
    expect(() =>
      applyTransforms(
        [{ time: 1, value: 2 }],
        [smoothOperation({ kind: 'smooth', x: 'time', y: 'value', xAs: 'x', yAs: 'y' })],
      ),
    ).toThrow(/finite|two/i);
    expect(() =>
      applyTransforms(
        [
          { time: 1, value: 2 },
          { time: 1, value: 4 },
        ],
        [smoothOperation({ kind: 'smooth', x: 'time', y: 'value', xAs: 'x', yAs: 'y' })],
      ),
    ).toThrow(/variance|vertical|x/i);
  });

  it.each([
    ['quadratic', { kind: 'quadratic' }, 2],
    ['polynomial', { kind: 'polynomial', order: 4 }, 4],
  ])('fails loud when %s has fewer than degree plus one pairs', (_name, method, sampleSize) => {
    const insufficientRows = Array.from({ length: sampleSize }, (_, x) => ({ x, y: x ** 2 }));

    expect(() =>
      applyTransforms(insufficientRows, [
        smoothOperation({ kind: 'smooth', x: 'x', y: 'y', method, xAs: 'trendX', yAs: 'trendY' }),
      ]),
    ).toThrow(/pairs|samples|degree|order/i);
  });

  it('fails loud for rank-deficient polynomial input', () => {
    expect(() =>
      applyTransforms(
        [
          { x: 0, y: 1 },
          { x: 1, y: 2 },
          { x: 1, y: 3 },
          { x: 2, y: 5 },
        ],
        [
          smoothOperation({
            kind: 'smooth',
            x: 'x',
            y: 'y',
            method: { kind: 'polynomial', order: 3 },
            xAs: 'trendX',
            yAs: 'trendY',
          }),
        ],
      ),
    ).toThrow(/rank|distinct|polynomial/i);
  });

  it('fails loud for a near-rank-deficient sixth-degree polynomial', () => {
    const clusteredX = [0, 1e-12, 2e-12, 3e-12, 4e-12, 5e-12, 1];

    expect(() =>
      applyTransforms(
        clusteredX.map(x => ({ x, y: 1 + x })),
        [
          smoothOperation({
            kind: 'smooth',
            x: 'x',
            y: 'y',
            method: { kind: 'polynomial', order: 6 },
            xAs: 'trendX',
            yAs: 'trendY',
          }),
        ],
      ),
    ).toThrow(/rank|polynomial/i);
  });

  it.each([
    [
      'logarithmic non-positive x',
      { kind: 'logarithmic' },
      [
        { x: 0, y: 1 },
        { x: 1, y: 2 },
      ],
    ],
    [
      'exponential non-positive y',
      { kind: 'exponential' },
      [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
      ],
    ],
    [
      'power non-positive x',
      { kind: 'power' },
      [
        { x: -1, y: 1 },
        { x: 1, y: 2 },
      ],
    ],
    [
      'power non-positive y',
      { kind: 'power' },
      [
        { x: 1, y: -1 },
        { x: 2, y: 2 },
      ],
    ],
  ])('fails loud for %s', (_name, method, invalidRows) => {
    expect(() =>
      applyTransforms(invalidRows, [
        smoothOperation({ kind: 'smooth', x: 'x', y: 'y', method, xAs: 'trendX', yAs: 'trendY' }),
      ]),
    ).toThrow(/positive|domain|logarithmic|exponential|power/i);
  });

  it.each([
    [
      'logarithmic',
      { kind: 'logarithmic' },
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    ],
    [
      'power',
      { kind: 'power' },
      [
        { x: 1, y: 1 },
        { x: 2, y: 4 },
      ],
    ],
  ])('fails loud when %s sampling extent includes non-positive x', (_name, method, validRows) => {
    expect(() =>
      applyTransforms(validRows, [
        smoothOperation({
          kind: 'smooth',
          x: 'x',
          y: 'y',
          method,
          extent: [0, 2],
          xAs: 'trendX',
          yAs: 'trendY',
        }),
      ]),
    ).toThrow(/extent|positive|domain/i);
  });

  it('fails loud for non-finite coefficients and predictions', () => {
    expect(() =>
      applyTransforms(
        [
          { x: -1e308, y: -1e308 },
          { x: 1e308, y: 1e308 },
        ],
        [smoothOperation({ kind: 'smooth', x: 'x', y: 'y', xAs: 'trendX', yAs: 'trendY' })],
      ),
    ).toThrow(/finite|coefficient|variance/i);

    expect(() =>
      applyTransforms(
        [
          { x: 0, y: 1 },
          { x: 1, y: Math.E },
        ],
        [
          smoothOperation({
            kind: 'smooth',
            x: 'x',
            y: 'y',
            method: { kind: 'exponential' },
            extent: [0, 1000],
            sampleCount: 2,
            xAs: 'trendX',
            yAs: 'trendY',
          }),
        ],
      ),
    ).toThrow(/finite|prediction|exponential/i);
  });

  it('aborts the whole grouped transform and identifies the invalid group', () => {
    expect(() =>
      applyTransforms(
        [
          { series: 'A', x: 1, y: 2 },
          { series: 'A', x: 2, y: 3 },
          { series: 'B', x: 0, y: 1 },
          { series: 'B', x: 2, y: 3 },
        ],
        [
          smoothOperation({
            kind: 'smooth',
            x: 'x',
            y: 'y',
            groupBy: ['series'],
            method: { kind: 'logarithmic' },
            xAs: 'trendX',
            yAs: 'trendY',
          }),
        ],
      ),
    ).toThrow(/logarithmic.*series.*B/i);
  });

  it('records group-level provenance source indices', () => {
    const tagged = tagSourceIndex(rows);
    const out = applyTransforms(tagged, [
      smoothOperation({
        kind: 'smooth',
        x: 'time',
        y: 'value',
        groupBy: ['series'],
        sampleCount: 2,
        xAs: 'trendX',
        yAs: 'trendY',
      }),
    ]);

    expect(readSourceIndices(out[0])).toEqual([0, 1, 2]);
    expect(readSourceIndices(out[2])).toEqual([3, 4, 5]);
  });

  it('reports input and output fields for strict model collection', () => {
    const fields = new Set<string>();
    const derivedOutputs = new Set<string>();

    collectTransformFields(
      smoothOperation({
        kind: 'smooth',
        x: 'time',
        y: 'value',
        groupBy: ['series'],
        xAs: 'trendX',
        yAs: 'trendY',
      }),
      createFieldCollector(fields),
      derivedOutputs,
      resolvePlotTransformRegistry(),
    );

    expect([...fields].sort()).toEqual(['series', 'time', 'value']);
    expect([...derivedOutputs].sort()).toEqual(['trendX', 'trendY']);
  });

  it('strict model accepts smooth output fields as derived fields', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'samples',
        model: [
          { name: 'series', type: 'categorical' },
          { name: 'time', type: 'continuous' },
          { name: 'value', type: 'continuous' },
        ],
      },
      transform: [{ kind: 'smooth', x: 'time', y: 'value', groupBy: ['series'], xAs: 'trendX', yAs: 'trendY' }],
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          series: 'series',
          order: 'trendX',
          encoding: { x: { field: 'trendX' }, y: { field: 'trendY' } },
        },
      ],
    });

    expect([...collectSourceFields(spec, resolvePlotTransformRegistry())].sort()).toEqual(['series', 'time', 'value']);
  });

  it('rejects custom transform registration collisions with smooth', () => {
    const collision = defineTransform({
      schema: object({ kind: literal('smooth') }),
      apply: inputRows => inputRows,
    });

    expect(() => resolvePlotTransformRegistry([collision])).toThrow(/duplicate transform registration/i);
  });
});
