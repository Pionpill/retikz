import type { IRChild, IRPath } from '@retikz/core';
import {
  defineRegression,
  defineRegressionImplementation,
  DEFAULT_TRANSFORM_CONTEXT,
  resolveRegressionRegistry,
  resolveRegressionImplementationRegistry,
  applyTransforms,
} from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

import { PlotSchema } from '../../../src';
import { lowerPlot } from '../../../src/pipeline/expand/lower';

const definition = defineRegression({
  schema: strictObject({ kind: literal('degree-fit'), degree: number().default(1) }),
});

const implementation = defineRegressionImplementation({
  definition,
  fit: (_pairs, operation) => ({ predict: x => x ** operation.degree }),
});

const pathsOf = (node: IRChild): Array<IRPath> =>
  node.type === 'path'
    ? [node as IRPath]
    : 'children' in node
      ? (node.children as Array<IRChild>).flatMap(pathsOf)
      : [];

const draw = (degree: number, scale = 'linear', clamp = false, curve = 'catmullRom', later = false) => {
  const plot = PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'rows' },
    scales: [
      { type: scale, name: 'x', clamp },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'path',
        curve,
        order: 'tx',
        encoding: { x: { field: 'tx' }, y: { field: 'ty' } },
        transform: [
          {
            operation: {
              kind: 'smooth',
              params: {
                x: 'x',
                y: 'y',
                xAs: 'tx',
                yAs: 'ty',
                sampleCount: 8,
                method: { kind: 'degree-fit', degree },
              },
            },
          },
          ...(later ? [{ operation: { kind: 'sort', params: { field: 'tx' } } }] : []),
        ],
      },
    ],
  });
  return pathsOf(
    lowerPlot(
      plot,
      {
        rows: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
          { x: 3, y: 3 },
        ],
      },
      { width: 480, height: 300, regressionDefinitions: [definition], regressionImplementations: [implementation] },
    ),
  )[0];
};
describe('regression curve geometry', () => {
  it('keeps all linear predictions with interpolating and explicit linear curves', () => {
    expect(draw(1).children[1]).toMatchObject({ kind: 'smooth' });
    expect(draw(1).children[1]).toHaveProperty('points.length', 7);
    expect(draw(1, 'linear', false, 'linear').children).toHaveLength(8);
  });

  it('keeps sampled interpolating geometry for nonlinear methods and projections', () => {
    for (const path of [draw(2), draw(1, 'log'), draw(1, 'linear', true)]) {
      expect(path.children[1]).toMatchObject({ kind: 'smooth' });
      expect(path.children[1]).toHaveProperty('points.length', 7);
    }
  });

  it('keeps all samples after a subsequent transform', () => {
    expect(draw(1, 'linear', false, 'linear', true).children).toHaveLength(8);
  });

  it('honors explicit step interpolation', () => {
    expect(draw(1, 'linear', false, 'step').children.length).toBeGreaterThan(2);
  });
});

it('rejects invalid intermediate predictions', () => {
  const brokenDefinition = defineRegression({
    schema: strictObject({ kind: literal('broken-line') }),
  });
  const brokenImplementation = defineRegressionImplementation({
    definition: brokenDefinition,
    fit: () => ({ predict: x => (x === 2 ? Infinity : x) }),
  });
  const registry = resolveRegressionRegistry([brokenDefinition]);

  expect(() =>
    applyTransforms(
      [
        { x: 1, y: 1 },
        { x: 3, y: 3 },
      ],
      [
        {
          kind: 'smooth',
          params: { x: 'x', y: 'y', xAs: 'tx', yAs: 'ty', sampleCount: 3, method: { kind: 'broken-line' } },
        },
      ],
      {
        context: {
          ...DEFAULT_TRANSFORM_CONTEXT,
          regressionRegistry: registry,
          regressionImplementationRegistry: resolveRegressionImplementationRegistry(registry, [brokenImplementation]),
        },
      },
    ),
  ).toThrow(/non-finite/);
});

it('rejects a degenerate inferred extent even when a custom fitter accepts the observations', () => {
  expect(() =>
    applyTransforms(
      [
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ],
      [{ kind: 'smooth', params: { x: 'x', y: 'y', xAs: 'tx', yAs: 'ty', method: { kind: 'degree-fit' } } }],
      {
        context: {
          ...DEFAULT_TRANSFORM_CONTEXT,
          regressionRegistry: resolveRegressionRegistry([definition]),
          regressionImplementationRegistry: resolveRegressionImplementationRegistry(
            resolveRegressionRegistry([definition]),
            [implementation],
          ),
        },
      },
    ),
  ).toThrow(/extent/);
});
