import { defineFieldOrder, defineRegression, defineRegressionImplementation } from '@retikz/data';
import { lowerPlotWithLineage, PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import { resolvePlotAuthoring } from '../src/plot-runtime';

describe('Plot regression runtime injection', () => {
  it.each([false, true])('forwards custom fitting definitions with embedded=%s', embedded => {
    const definition = defineRegression({
      schema: strictObject({ kind: literal('identity-fit') }),
    });
    const implementation = defineRegressionImplementation({ definition, fit: () => ({ predict: x => x }) });
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'rows' },
      scales: [
        { name: 'x', type: 'linear' },
        { name: 'y', type: 'linear' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          encoding: { x: { field: 'tx' }, y: { field: 'ty' } },
          transform: [
            {
              operation: {
                kind: 'smooth',
                params: { x: 'x', y: 'y', xAs: 'tx', yAs: 'ty', method: { kind: 'identity-fit' } },
              },
            },
          ],
        },
      ],
    });
    const result = resolvePlotAuthoring(
      {
        spec,
        data: {
          rows: [
            { x: 1, y: 2 },
            { x: 2, y: 3 },
          ],
        },
        regressionDefinitions: [definition],
        regressionImplementations: [implementation],
      },
      { embedded },
    );

    expect(result.lowerOptions.regressionDefinitions?.[0]).toBe(definition);
    expect(() => lowerPlotWithLineage(result.spec, result.datasets ?? {}, result.lowerOptions)).not.toThrow();
    expect(JSON.stringify(result.spec)).not.toMatch(/regressionDefinitions|predict|schema/);
  });
});

it.each([false, true])('injects field orders into React runtime with embedded=%s', embedded => {
  const definition = defineFieldOrder({ name: 'length', compare: (a, b) => String(a).length - String(b).length });
  const spec = PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: {
      reference: 'rows',
      model: [
        { name: 'x', type: 'categorical', order: 'length' },
        { name: 'y', type: 'continuous' },
      ],
    },
    coordinate: { type: 'cartesian2D' },
    scales: [],
    marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  });
  const data = {
    rows: [
      { x: 'bbb', y: 1 },
      { x: 'a', y: 2 },
    ],
  };
  const result = resolvePlotAuthoring({ spec, data, fieldOrderDefinitions: [definition] }, { embedded });
  expect(lowerPlotWithLineage(result.spec, result.datasets ?? {}, result.lowerOptions).children).toEqual(
    lowerPlotWithLineage(spec, data, { ...result.lowerOptions, fieldOrderDefinitions: [definition] }).children,
  );
  expect(() => lowerPlotWithLineage(spec, data)).toThrow(/unknown order/);
});
