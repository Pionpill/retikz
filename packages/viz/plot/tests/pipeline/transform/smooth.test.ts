import type { ExternalRow } from '@retikz/data';

import { applyTransforms, collectTransformFields, defineTransform, resolveTransformRegistry } from '@retikz/data';
import { TransformSchema } from '@retikz/data';
import { readSourceIndices, tagSourceIndex } from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { collectSourceFields } from '../../../src/pipeline/source-fields';
import { createFieldCollector } from '../../../src/providers/channel/shared';
import { PlotSpecSchema } from '../../../src/schemas/plot';

const smoothOperation = (operation: unknown) => TransformSchema.parse(operation);

describe('smooth transform schema (alpha.13 ADR-04)', () => {
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

describe('smooth transform behavior (alpha.13 ADR-04)', () => {
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
      resolveTransformRegistry(),
    );

    expect([...fields].sort()).toEqual(['series', 'time', 'value']);
    expect([...derivedOutputs].sort()).toEqual(['trendX', 'trendY']);
  });

  it('strict model accepts smooth output fields as derived fields', () => {
    const spec = PlotSpecSchema.parse({
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

    expect([...collectSourceFields(spec, resolveTransformRegistry())].sort()).toEqual(['series', 'time', 'value']);
  });

  it('rejects custom transform registration collisions with smooth', () => {
    const collision = defineTransform({
      schema: z.object({ kind: z.literal('smooth') }),
      apply: inputRows => inputRows,
    });

    expect(() => resolveTransformRegistry([collision])).toThrow(/duplicate transform registration/i);
  });
});
