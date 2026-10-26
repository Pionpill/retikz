import { expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import type { CompositeCompileContext, IRNode, IRTarget, PathTargetQueryResult } from '../../src';
import { compileToScene, CompositeBaseSchema, defineComposite, defineShape } from '../../src';

/** 通过正式 Composite 回调验证查询隔离，并禁止查询产物进入最终 Scene */
const runQueries = (query: (context: CompositeCompileContext) => void) => {
  const definition = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_node, context) => {
      query(context);
      return { children: [] };
    },
  });
  const result = compileToScene(
    { version: 1, type: 'scene', children: [{ namespace: 'test', type: 'query' }] },
    { composites: [definition] },
  );
  expect(result.scene.primitives).toEqual([]);
  expect(result.scene.resources).toBeUndefined();
};

it('isolates repeated target sequences and observes changes to the same child object', () => {
  runQueries(context => {
    const child: IRNode = { type: 'node', id: 'n', position: [30, 20] };
    const first = context.resolvePathTargets({ child, source: { id: 'n' }, points: [{ relative: [5, 0] }] });
    const second = context.resolvePathTargets({
      child: structuredClone(child),
      source: [100, 50],
      points: [{ relativeAccumulate: [10, 0] }, { relative: [0, 5] }, { id: 'n' }],
    });
    expect(first).toEqual({ source: [30, 20], points: [[35, 20]] });
    expect(second).toEqual({
      source: [100, 50],
      points: [
        [110, 50],
        [110, 55],
        [30, 20],
      ],
    });
    child.position = [90, 80];
    expect(context.resolvePathTargets({ child, source: { id: 'n' }, points: [] }).source).toEqual([90, 80]);
    expect(first).toEqual({ source: [30, 20], points: [[35, 20]] });
  });
});

it('keeps successful geometry usable after failed targets and reports the current field', () => {
  runQueries(context => {
    const child: IRNode = { type: 'node', id: 'n', position: [30, 20] };
    expect(() => context.resolvePathTargets({ child, source: { id: 'missing' }, points: [] })).toThrow(/source/);
    expect(() =>
      context.resolvePathTargets({ child, source: { id: 'n' }, points: [[0, 0], { id: 'missing' }] }),
    ).toThrow(/points\[1\]/);
    expect(context.resolvePathTargets({ child, source: { id: 'n' }, points: [] })).toEqual({
      source: [30, 20],
      points: [],
    });
    expect(() =>
      context.resolvePathTargets({
        child: { type: 'node', position: { kind: 'anchor', target: { id: 'missing' } } },
        source: [0, 0],
        points: [],
      }),
    ).toThrow();
    expect(context.resolvePathTargets({ child, source: { id: 'n' }, points: [] }).source).toEqual([30, 20]);
  });
});

it('keeps theme-specific geometry separate across derived contexts and callback owners', () => {
  const positions: Array<ReadonlyArray<number>> = [];
  const geometry = defineComposite({
    namespace: 'test',
    type: 'geometry',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('geometry') }),
    compile: (_node, context) => ({
      children: [{ type: 'node', id: 'n', position: [context.theme.mode === 'dark' ? 80 : 20, 10] }],
    }),
  });
  const query = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_node, context) => {
      for (const next of [context, context.withTheme({ mode: 'dark' }), context]) {
        positions.push(
          next.resolvePathTargets({ child: { namespace: 'test', type: 'geometry' }, source: { id: 'n' }, points: [] })
            .source,
        );
      }
      return { children: [] };
    },
  });
  const source = {
    version: 1 as const,
    type: 'scene' as const,
    children: [
      { namespace: 'test', type: 'query' },
      { namespace: 'test', type: 'query' },
    ],
  };
  for (let index = 0; index < 2; index++) compileToScene(source, { composites: [geometry, query] });
  expect(positions).toEqual(
    Array.from({ length: 4 }, () => [
      [20, 10],
      [80, 10],
      [20, 10],
    ]).flat(),
  );
});

it('preserves root-local transforms and earlier coordinates after many distinct queries', () => {
  runQueries(context => {
    for (let index = 0; index < 80; index++) {
      const result = context.resolvePathTargets({
        child: {
          type: 'scope',
          localNamespace: true,
          transforms: [{ kind: 'scale', x: 2, y: 2 }],
          children: [{ type: 'node', id: 'n', position: [index, 10] }],
        },
        source: { id: 'n' },
        points: [{ id: 'n', offset: [20, 0] }],
      });
      expect(result).toEqual({ source: [index, 10], points: [[index + 10, 10]] });
    }
    expect(
      context.resolvePathTargets({
        child: { type: 'node', id: 'n', position: [0, 10] },
        source: { id: 'n' },
        points: [],
      }).source,
    ).toEqual([0, 10]);
  });
});

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

it('repeated local shadowing queries never replace a visible ancestor reference', () => {
  const query = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_node, context) => {
      for (let index = 0; index < 4; index++) {
        expect(
          context.resolvePathTargets({
            child: {
              type: 'scope',
              localNamespace: true,
              children: [{ type: 'coordinate', id: 'origin', position: [70, 80] }],
            },
            source: { id: 'origin' },
            points: [],
          }).source,
        ).toEqual([70, 80]);
        expect(
          context.resolvePathTargets({
            child: { type: 'scope', children: [] },
            source: { id: 'origin' },
            points: [],
          }).source,
        ).toEqual([20, 30]);
      }
      return { children: [] };
    },
  });
  const result = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [
        { type: 'coordinate', id: 'origin', position: [20, 30] },
        { namespace: 'test', type: 'query' },
      ],
    },
    { composites: [query] },
  );
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
    computeCircumscribedGeometry: (halfWidth, halfHeight) => ({ halfWidth, halfHeight }),
    computeBoundaryPoint: rect => [rect.x + 3, rect.y + 7],
    resolveAnchor: (rect, name) => (name === 'tip' ? [rect.x + 3, rect.y + 7] : undefined),
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
