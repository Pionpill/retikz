import { applyTransforms, collectTransformFields, resolveTransformRegistry } from '@retikz/data';
import { TransformSchema } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { collectSourceFields } from '../../../src/pipeline/source-fields';
import { createFieldCollector } from '../../../src/providers/channel/shared';
import { PlotSpecSchema } from '../../../src/schemas/plot';

describe('quantile-band statistics schema (alpha.13 ADR-02)', () => {
  it('accepts quantile-band reducer and preserves JSON round trip', () => {
    const operation = {
      kind: 'summarize',
      groupBy: ['group'],
      metrics: [
        {
          op: 'quantile-band',
          field: 'value',
          lowerP: 0.25,
          upperP: 0.75,
          outputs: {
            lower: 'boxLow',
            upper: 'boxHigh',
            points: [{ p: 0.5, as: 'median' }],
            spread: 'boxSpread',
            lowerFence: 'lowerFence',
            upperFence: 'upperFence',
            whiskerMin: 'whiskerMin',
            whiskerMax: 'whiskerMax',
            count: 'count',
          },
          whisker: { kind: 'spread', factor: 1.5 },
        },
      ],
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('accepts outside-quantile-band selector and preserves JSON round trip', () => {
    const operation = {
      kind: 'select',
      groupBy: ['group'],
      selector: {
        op: 'outside-quantile-band',
        field: 'value',
        lowerP: 0.1,
        upperP: 0.9,
        boundary: { kind: 'band' },
      },
      rankAs: 'rank',
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('rejects invalid probability order', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        metrics: [
          {
            op: 'quantile-band',
            field: 'value',
            lowerP: 0.8,
            upperP: 0.2,
            outputs: { lower: 'low', upper: 'high' },
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      TransformSchema.parse({
        kind: 'select',
        selector: {
          op: 'outside-quantile-band',
          field: 'value',
          lowerP: 0.9,
          upperP: 0.9,
        },
      }),
    ).toThrow();
  });

  it('rejects duplicate output fields inside and across metrics', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        metrics: [
          {
            op: 'quantile-band',
            field: 'value',
            lowerP: 0.25,
            upperP: 0.75,
            outputs: {
              lower: 'boundary',
              upper: 'boundary',
            },
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        metrics: [
          { op: 'mean', field: 'value', as: 'boxLow' },
          {
            op: 'quantile-band',
            field: 'value',
            lowerP: 0.25,
            upperP: 0.75,
            outputs: { lower: 'boxLow', upper: 'boxHigh' },
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects negative spread factors', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        metrics: [
          {
            op: 'quantile-band',
            field: 'value',
            lowerP: 0.25,
            upperP: 0.75,
            outputs: { lower: 'boxLow', upper: 'boxHigh' },
            whisker: { kind: 'spread', factor: -1 },
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      TransformSchema.parse({
        kind: 'select',
        selector: {
          op: 'outside-quantile-band',
          field: 'value',
          lowerP: 0.25,
          upperP: 0.75,
          boundary: { kind: 'spread', factor: -1 },
        },
      }),
    ).toThrow();
  });
});

describe('quantile-band statistics behavior (alpha.13 ADR-02)', () => {
  const rows = [
    { group: 'A', value: 0 },
    { group: 'A', value: 2 },
    { group: 'A', value: 4 },
    { group: 'A', value: 6 },
    { group: 'A', value: 8 },
    { group: 'B', value: 10 },
    { group: 'B', value: 20 },
    { group: 'B', value: 30 },
  ];

  it('computes boxplot-shaped quantile band fields', () => {
    const out = applyTransforms(rows, [
      {
        kind: 'summarize',
        groupBy: ['group'],
        metrics: [
          {
            op: 'quantile-band',
            field: 'value',
            lowerP: 0.25,
            upperP: 0.75,
            outputs: {
              lower: 'boxLow',
              upper: 'boxHigh',
              points: [{ p: 0.5, as: 'median' }],
              spread: 'spread',
              lowerFence: 'lowerFence',
              upperFence: 'upperFence',
              whiskerMin: 'whiskerMin',
              whiskerMax: 'whiskerMax',
              min: 'min',
              max: 'max',
              count: 'count',
            },
            whisker: { kind: 'spread', factor: 1.5 },
          },
        ],
      },
    ]);

    expect(out).toEqual([
      expect.objectContaining({
        group: 'A',
        boxLow: 2,
        median: 4,
        boxHigh: 6,
        spread: 4,
        lowerFence: -4,
        upperFence: 12,
        whiskerMin: 0,
        whiskerMax: 8,
        min: 0,
        max: 8,
        count: 5,
      }),
      expect.objectContaining({
        group: 'B',
        boxLow: 15,
        median: 20,
        boxHigh: 25,
        spread: 10,
        whiskerMin: 10,
        whiskerMax: 30,
        count: 3,
      }),
    ]);
  });

  it('computes central 80 percent band without q1 or q3 fields', () => {
    const out = applyTransforms(rows, [
      {
        kind: 'summarize',
        groupBy: ['group'],
        metrics: [
          {
            op: 'quantile-band',
            field: 'value',
            lowerP: 0.1,
            upperP: 0.9,
            outputs: {
              lower: 'p10',
              upper: 'p90',
              points: [{ p: 0.5, as: 'p50' }],
              spread: 'p80Spread',
            },
          },
        ],
      },
    ]);

    expect(out[0]).toMatchObject({ group: 'A', p10: 0.8, p50: 4, p90: 7.2, p80Spread: 6.4 });
  });

  it('uses minMax whisker strategy when requested', () => {
    const out = applyTransforms(rows, [
      {
        kind: 'summarize',
        groupBy: ['group'],
        metrics: [
          {
            op: 'quantile-band',
            field: 'value',
            lowerP: 0.25,
            upperP: 0.75,
            outputs: { lower: 'low', upper: 'high', whiskerMin: 'whiskerMin', whiskerMax: 'whiskerMax' },
            whisker: { kind: 'minMax' },
          },
        ],
      },
    ]);

    expect(out[0]).toMatchObject({ group: 'A', low: 2, high: 6, whiskerMin: 0, whiskerMax: 8 });
  });

  it('handles single-value and empty finite groups', () => {
    const out = applyTransforms(
      [
        { group: 'A', value: 5 },
        { group: 'B', value: Number.NaN },
      ],
      [
        {
          kind: 'summarize',
          groupBy: ['group'],
          metrics: [
            {
              op: 'quantile-band',
              field: 'value',
              lowerP: 0.25,
              upperP: 0.75,
              outputs: {
                lower: 'low',
                upper: 'high',
                points: [{ p: 0.5, as: 'mid' }],
                whiskerMin: 'min',
                whiskerMax: 'max',
                count: 'count',
              },
              whisker: { kind: 'spread' },
            },
          ],
        },
      ],
    );

    expect(out).toEqual([
      expect.objectContaining({ group: 'A', low: 5, high: 5, mid: 5, min: 5, max: 5, count: 1 }),
      expect.objectContaining({ group: 'B', low: 0, high: 0, mid: 0, min: 0, max: 0, count: 0 }),
    ]);
  });

  it('selects rows outside quantile band boundaries in source order', () => {
    const out = applyTransforms(rows, [
      {
        kind: 'select',
        groupBy: ['group'],
        selector: { op: 'outside-quantile-band', field: 'value', lowerP: 0.2, upperP: 0.8, boundary: { kind: 'band' } },
        rankAs: 'rank',
      },
    ]);

    expect(out.map(row => [row.group, row.value, row.rank])).toEqual([
      ['A', 0, 1],
      ['A', 8, 2],
      ['B', 10, 1],
      ['B', 30, 2],
    ]);
  });

  it('selects rows outside spread fence', () => {
    const out = applyTransforms(
      [
        { group: 'A', value: 0 },
        { group: 'A', value: 10 },
        { group: 'A', value: 20 },
        { group: 'A', value: 30 },
        { group: 'A', value: 100 },
      ],
      [
        {
          kind: 'select',
          groupBy: ['group'],
          selector: {
            op: 'outside-quantile-band',
            field: 'value',
            lowerP: 0.25,
            upperP: 0.75,
            boundary: { kind: 'spread', factor: 1.5 },
          },
        },
      ],
    );

    expect(out).toEqual([expect.objectContaining({ group: 'A', value: 100 })]);
  });

  it('reports input and output fields for strict model collection', () => {
    const fields = new Set<string>();
    const derivedOutputs = new Set<string>();

    collectTransformFields(
      {
        kind: 'summarize',
        groupBy: ['group'],
        metrics: [
          {
            op: 'quantile-band',
            field: 'value',
            lowerP: 0.25,
            upperP: 0.75,
            outputs: { lower: 'boxLow', upper: 'boxHigh', points: [{ p: 0.5, as: 'median' }] },
          },
        ],
      },
      createFieldCollector(fields),
      derivedOutputs,
      resolveTransformRegistry(),
    );

    expect([...fields].sort()).toEqual(['group', 'value']);
    expect([...derivedOutputs].sort()).toEqual(['boxHigh', 'boxLow', 'median']);
  });

  it('strict model accepts quantile-band output fields as derived fields', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'group', type: 'categorical' },
          { name: 'value', type: 'continuous' },
        ],
      },
      transform: [
        {
          kind: 'summarize',
          groupBy: ['group'],
          metrics: [
            {
              op: 'quantile-band',
              field: 'value',
              lowerP: 0.25,
              upperP: 0.75,
              outputs: { lower: 'boxLow', upper: 'boxHigh', points: [{ p: 0.5, as: 'median' }] },
            },
          ],
        },
      ],
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          bounds: { y: { kind: 'extent', from: 'boxLow', to: 'boxHigh' } },
          encoding: { x: { field: 'group' }, y: { field: 'boxHigh' } },
        },
      ],
    });

    expect([...collectSourceFields(spec, resolveTransformRegistry())].sort()).toEqual(['group', 'value']);
  });
});
