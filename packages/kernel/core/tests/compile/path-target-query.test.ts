import { expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import type { IRTarget, PathTargetQueryResult } from '../../src';
import { compileToScene, CompositeBaseSchema, defineComposite, defineShape } from '../../src';

it('queries real child targets with smooth cursor semantics without publishing probe geometry', () => {
  let observed: PathTargetQueryResult | undefined;
  const definition = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_node, context) => {
      observed = context.resolvePathTargets({
        child: {
          type: 'scope',
          children: [
            {
              type: 'node',
              id: 'n',
              position: [100, 50],
              shape: 'rectangle',
              layout: { width: 40, minimumSize: { height: 20 }, padding: 0 },
              style: { stroke: 'none' },
            },
          ],
        },
        source: [10, 10],
        points: [
          { relative: [5, 0] },
          { relative: [0, 5] },
          { relativeAccumulate: [20, 0] },
          { relative: [0, 5] },
          { id: 'n', anchor: 'right' },
        ],
      });
      return { children: [] };
    },
  });
  const result = compileToScene(
    { version: 1, type: 'scene', children: [{ namespace: 'test', type: 'query' }] },
    { composites: [definition] },
  );
  expect(observed).toEqual({
    source: [10, 10],
    points: [
      [15, 10],
      [10, 15],
      [30, 10],
      [30, 15],
      [120, 50],
    ],
  });
  expect(result.scene.primitives).toEqual([]);
});

it('fails a target query at the missing point instead of silently dropping it', () => {
  const definition = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_node, context) => {
      const points: Array<IRTarget> = [[10, 0], { id: 'missing' }];
      context.resolvePathTargets({ child: { type: 'scope', children: [] }, source: [0, 0], points });
      return { children: [] };
    },
  });
  expect(() =>
    compileToScene(
      { version: 1, type: 'scene', children: [{ namespace: 'test', type: 'query' }] },
      { composites: [definition] },
    ),
  ).toThrow(/points\[1\]/);
});

it('uses caller transforms and world node offsets with nested absolute expressions', () => {
  let observed: PathTargetQueryResult | undefined;
  const definition = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_node, context) => {
      observed = context.resolvePathTargets({
        child: {
          type: 'scope',
          children: [
            {
              type: 'node',
              id: 'n',
              position: [100, 50],
              shape: 'rectangle',
              layout: { width: 40, minimumSize: { height: 20 }, padding: 0 },
            },
          ],
        },
        source: { relative: [10, 5] },
        points: [
          { id: 'n', offset: [20, 0] },
          { origin: 'n', angle: 0, radius: 20 },
          { of: 'n', offset: [20, 0] },
          { between: [[0, 0], { id: 'n' }], fraction: 0.5 },
        ],
      });
      return { children: [] };
    },
  });
  compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'scale', x: 2, y: 2 }],
          children: [{ namespace: 'test', type: 'query' }],
        },
      ],
    },
    { composites: [definition] },
  );
  expect(observed?.source).toEqual([10, 5]);
  // NodeTarget.offset 是世界向量；polar / offset-position 沿用局部坐标位移
  expect(observed?.points).toEqual([
    [110, 50],
    [120, 50],
    [120, 50],
    [50, 25],
  ]);
});

it('queries registered shape anchors rather than rectangle approximations', () => {
  let observed: PathTargetQueryResult | undefined;
  const shape = defineShape({
    name: 'query-shape',
    paramsSchema: strictObject({}),
    circumscribe: (halfWidth, halfHeight) => ({ halfWidth, halfHeight }),
    boundaryPoint: rect => [rect.x + 3, rect.y + 7],
    anchor: (rect, name) => (name === 'tip' ? [rect.x + 3, rect.y + 7] : undefined),
    *emit() {},
  });
  const definition = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_node, context) => {
      observed = context.resolvePathTargets({
        child: { type: 'node', id: 'n', position: [100, 50], shape: 'query-shape' },
        source: [0, 0],
        points: [{ id: 'n', anchor: 'tip' }],
      });
      return { children: [] };
    },
  });
  compileToScene(
    { type: 'scene', version: 1, children: [{ namespace: 'test', type: 'query' }] },
    { composites: [definition], shapes: [shape] },
  );
  expect(observed?.points).toEqual([[103, 57]]);
});

it('resolves inside a queried root Scope namespace and returns its local coordinates', () => {
  let observed: PathTargetQueryResult | undefined;
  const definition = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_node, context) => {
      observed = context.resolvePathTargets({
        child: {
          type: 'scope',
          localNamespace: true,
          transforms: [{ kind: 'scale', x: 2, y: 2 }],
          children: [{ type: 'node', id: 'n', position: [100, 50] }],
        },
        source: { id: 'n' },
        points: [{ id: 'n', offset: [20, 0] }],
      });
      return { children: [] };
    },
  });
  compileToScene(
    { type: 'scene', version: 1, children: [{ namespace: 'test', type: 'query' }] },
    { composites: [definition] },
  );
  expect(observed).toEqual({ source: [100, 50], points: [[110, 50]] });
});
