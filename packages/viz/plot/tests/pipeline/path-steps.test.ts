import type { IRChild, IRPath, IRScope } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { lowerPlotWithDataArtifact } from '../../src/pipeline/expand/lower';
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
  lowerPlotWithDataArtifact(
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
  ).child;

describe('投影路径构建', () => {
  it('保留构造路径的端点箭头并生成 Scene 箭头', () => {
    const output = lowerPlotWithDataArtifact(
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'data' },
        coordinate: { type: 'cartesian2D' },
        scales: [],
        marks: [
          {
            type: 'path',
            encodings: {
              steps: [
                { kind: 'move', to: [0, 0] },
                { kind: 'line', to: [100, 0] },
              ],
            },
            properties: { arrow: { end: { length: 7 } } },
          },
        ],
      }),
      { data: [] },
      { textMeasurer: measureLabel },
    ).child;
    const path = paths(output)[0];
    expect(path.arrow).toEqual({ end: { length: 7 } });
    const scene = compileToScene({ type: 'scene', version: 1, children: [path] }).scene;
    expect(scene.primitives[0]).toMatchObject({ type: 'path', arrowEnd: { markerWidth: 7 } });
  });

  it('包括推断域中的数据控制点，同时绘图坐标保持固定', () => {
    const compile = (maximum: number, domain?: [number, number]) =>
      lowerPlotWithDataArtifact(
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
      ).child;
    expect(paths(compile(10))[0].children).toEqual(paths(compile(10, [0, 10]))[0].children);
    expect(paths(compile(20))[0].children).toEqual(paths(compile(20, [0, 20]))[0].children);
  });

  it('在其数据控制点的极坐标投影后构造一个立方体', () => {
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
    const output = paths(lowerPlotWithDataArtifact(source, { data: [] }, { textMeasurer: measureLabel }).child)[0]
      .children;
    expect(output).toHaveLength(2);
    const start = output[0],
      curve = output[1];
    if (start.kind !== 'move' || curve.kind !== 'cubic') throw new Error('Expected move/cubic');
    expect(curve.control1).toEqual(start.to);
    expect(curve.control2).toEqual([10, 20]);
  });
  it('投影每一行并保留本地偏移量', () => {
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

  it('为空字段数据创建 1 个常量实例和 0 个实例', () => {
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

  it('整个实例在无效的投影位置上失败', () => {
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
