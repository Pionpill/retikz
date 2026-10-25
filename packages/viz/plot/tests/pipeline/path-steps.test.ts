import type { IRChild, IRPath, IRScope } from '@retikz/core';
import { compileToScene, definePathGenerator } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { strictObject, string } from 'zod';

import { lowerPlot } from '../../src/pipeline/expand/lower';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const paths = (child: IRChild): Array<IRPath> =>
  child.type === 'path' ? [child as IRPath] : child.type === 'scope' ? (child as IRScope).children.flatMap(paths) : [];
const lower = (
  steps: Array<unknown>,
  rows = [
    { x: 2, y: 3 },
    { x: 8, y: 7 },
  ],
) =>
  lowerPlot(
    PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'data' },
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      scales: [
        { type: 'linear', name: 'x', domain: [0, 10], domainPadding: 0 },
        { type: 'linear', name: 'y', domain: [0, 10], domainPadding: 0 },
      ],
      marks: [{ type: 'path', encodings: { steps } }],
    }),
    { data: rows },
    { textMeasurer: measureLabel },
  );

describe('Projected path construction', () => {
  it('includes data control points in inferred domains while drawing coordinates stay fixed', () => {
    const compile = (maximum: number, domain?: [number, number]) =>
      lowerPlot(
        PlotSchema.parse({
          namespace: 'plot',
          type: 'plot',
          data: { reference: 'data' },
          coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
          scales: ['x', 'y'].map(name => ({ type: 'linear', name, domain, domainPadding: 0 })),
          marks: [
            {
              type: 'path',
              encodings: {
                steps: [
                  { kind: 'move', to: { x: { value: 0 }, y: { value: 0 } } },
                  {
                    kind: 'cubic',
                    to: { x: { value: 5 }, y: { value: 5 } },
                    control1: { x: { value: maximum }, y: { value: maximum } },
                    control2: [999, 999],
                  },
                ],
              },
            },
          ],
        }),
        { data: [] },
        { textMeasurer: measureLabel },
      );
    expect(paths(compile(10))[0].children).toEqual(paths(compile(10, [0, 10]))[0].children);
    expect(paths(compile(20))[0].children).toEqual(paths(compile(20, [0, 20]))[0].children);
  });

  it('constructs a cubic after polar projection of its data control points', () => {
    const point = { x: { value: 90 }, y: { value: 5 } };
    const source = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'data' },
      coordinate: { type: 'polar2D', x: 'x', y: 'y' },
      scales: [
        { type: 'linear', name: 'x', domain: [0, 360], domainPadding: 0 },
        { type: 'linear', name: 'y', domain: [0, 10], domainPadding: 0 },
      ],
      marks: [
        {
          type: 'path',
          encodings: {
            steps: [
              { kind: 'move', to: point },
              { kind: 'cubic', to: [0, 0], control1: point, control2: [10, 20] },
            ],
          },
        },
      ],
    });
    const output = paths(lowerPlot(source, { data: [] }, { textMeasurer: measureLabel }))[0].children;
    expect(output).toHaveLength(2);
    const start = output[0],
      curve = output[1];
    if (start.kind !== 'move' || curve.kind !== 'cubic') throw new Error('Expected move/cubic');
    expect(curve.control1).toEqual(start.to);
    expect(curve.control2).toEqual([10, 20]);
  });
  it('passes opaque parameters through the existing custom generator registry', () => {
    const result = lower([
      { kind: 'move', to: [0, 0] },
      { kind: 'generator', name: 'custom', params: { field: 'opaque' }, to: [20, 30] },
    ]);
    const generator = definePathGenerator({
      name: 'custom',
      paramsSchema: strictObject({ field: string() }),
      generate: ({ to, params }) => {
        expect(params.field).toBe('opaque');
        return [{ kind: 'line', to: to ?? [0, 0] }];
      },
    });
    expect(paths(result)).toHaveLength(1);
    expect(() =>
      compileToScene({ version: 1, type: 'scene', children: [result] }, { pathGenerators: [generator] }),
    ).not.toThrow();
    expect(() => compileToScene({ version: 1, type: 'scene', children: [result] })).toThrow();
  });
  it('projects each row and preserves local offsets', () => {
    const result = lower([
      { kind: 'move', to: { x: { field: 'x' }, y: { field: 'y' } } },
      { kind: 'cubic', control1: [10, 20], control2: { x: { value: 5 }, y: { value: 5 } }, to: { relative: [30, 40] } },
    ]);
    const output = paths(result);
    expect(output).toHaveLength(2);
    expect(output[0].children[0]).not.toEqual(output[1].children[0]);
    expect(output[0].children[1]).toMatchObject({ kind: 'cubic', control1: [10, 20], to: { relative: [30, 40] } });
    expect(compileToScene({ type: 'scene', version: 1, children: [result] }).scene.primitives.length).toBeGreaterThan(
      0,
    );
  });

  it('creates one constant instance and zero instances for empty field data', () => {
    expect(
      paths(
        lower([
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [20, 30] },
        ]),
      ),
    ).toHaveLength(1);
    expect(
      paths(
        lower(
          [
            { kind: 'move', to: [0, 0] },
            { kind: 'smooth', points: [{ x: { field: 'x' }, y: { field: 'y' } }] },
          ],
          [],
        ),
      ),
    ).toHaveLength(0);
  });

  it('fails the whole instance on an invalid projected position', () => {
    expect(() =>
      lower(
        [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: { x: { field: 'x' }, y: { field: 'y' } } },
        ],
        [{ x: NaN, y: 2 }],
      ),
    ).toThrow(/step/i);
  });
});
