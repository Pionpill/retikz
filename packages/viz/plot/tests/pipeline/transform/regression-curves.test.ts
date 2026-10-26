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
import { measureLabel } from '../../helpers/text-measurement';

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
        properties: { curve },
        transforms: [
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
        encodings: { order: 'tx', position: { x: { field: 'tx' }, y: { field: 'ty' } } },
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
      {
        layout: { width: 480, height: 300 },
        definitions: { regressions: [definition] },
        implementations: { regressions: [implementation] },
        textMeasurer: measureLabel,
      },
    ),
  )[0];
};
describe('回归曲线几何', () => {
  it('通过插值和显式线性曲线保留所有线性预测', () => {
    expect(draw(1).children[1]).toMatchObject({ kind: 'smooth' });
    expect(draw(1).children[1]).toHaveProperty('points.length', 7);
    expect(draw(1, 'linear', false, 'linear').children).toHaveLength(8);
  });

  it('为非线性方法和投影保留采样的插值几何形状', () => {
    for (const path of [draw(2), draw(1, 'log'), draw(1, 'linear', true)]) {
      expect(path.children[1]).toMatchObject({ kind: 'smooth' });
      expect(path.children[1]).toHaveProperty('points.length', 7);
    }
  });

  it('在后续转换后保留所有样本', () => {
    expect(draw(1, 'linear', false, 'linear', true).children).toHaveLength(8);
  });

  it('支持显式步进插值', () => {
    expect(draw(1, 'linear', false, 'step').children.length).toBeGreaterThan(2);
  });
});

it('拒绝无效的中间预测', () => {
  const brokenDefinition = defineRegression({
    schema: strictObject({ kind: literal('broken-line') }),
  });
  const brokenImplementation = defineRegressionImplementation({
    definition: brokenDefinition,
    fit: () => ({ predict: x => (x === 2 ? Infinity : x) }),
  });
  const registry = resolveRegressionRegistry([brokenDefinition]);

  expect(
    () =>
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
      ).rows,
  ).toThrow(/non-finite/);
});

it('即使自定义拟合程序接受观察结果，也会拒绝退化的推断范围', () => {
  expect(
    () =>
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
      ).rows,
  ).toThrow(/extent/);
});
