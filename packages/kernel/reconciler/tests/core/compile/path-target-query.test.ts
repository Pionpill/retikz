import { expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import type {
  CompositeCompileContext,
  IRChild,
  IRNode,
  LayoutChildResult,
  IRTarget,
  PathTargetQueryResult,
} from '../../../../core/src';
import { CompositeBaseSchema, defineComposite, defineShape, naturalLayoutProposal } from '../../../../core/src';
import { compileTestResult } from '../../helpers/compilation';

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
  const result = compileTestResult(
    { version: 1, type: 'scene', children: [{ namespace: 'test', type: 'query' }] },
    { composites: [definition] },
  );
  expect(result.scene.primitives).toEqual([]);
  expect(result.scene.resources).toBeUndefined();
};

it('同一布局结果隔离查询游标并保持快照，重新布局后观察输入变化', () => {
  runQueries(context => {
    const child: IRNode = { type: 'node', id: 'n', position: [30, 20] };
    const compiled = resolvedResultOf(context, child);
    const first = context.resolvePathTargets(compiled, { source: { id: 'n' }, points: [{ relative: [5, 0] }] });
    const second = context.resolvePathTargets(compiled, {
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
    const movedChild: IRNode = { ...child, position: [90, 80] };
    expect(context.resolvePathTargets(compiled, { source: { id: 'n' }, points: [] }).source).toEqual([30, 20]);
    expect(
      context.resolvePathTargets(resolvedResultOf(context, movedChild), { source: { id: 'n' }, points: [] }).source,
    ).toEqual([90, 80]);
    expect(first).toEqual({ source: [30, 20], points: [[35, 20]] });
  });
});

it('在目标失败后保持成功的几何图形可用并报告当前字段', () => {
  runQueries(context => {
    const child: IRNode = { type: 'node', id: 'n', position: [30, 20] };
    const compiled = resolvedResultOf(context, child);
    expect(() => context.resolvePathTargets(compiled, { source: { id: 'missing' }, points: [] })).toThrow(/source/);
    expect(() =>
      context.resolvePathTargets(compiled, { source: { id: 'n' }, points: [[0, 0], { id: 'missing' }] }),
    ).toThrow(/points\[1\]/);
    expect(context.resolvePathTargets(compiled, { source: { id: 'n' }, points: [] })).toEqual({
      source: [30, 20],
      points: [],
    });
    expect(() =>
      context.resolvePathTargets(
        resolvedResultOf(context, { type: 'node', position: { kind: 'anchor', target: { id: 'missing' } } }),
        { source: [0, 0], points: [] },
      ),
    ).toThrow();
    expect(context.resolvePathTargets(compiled, { source: { id: 'n' }, points: [] }).source).toEqual([30, 20]);
  });
});

it('使特定于主题的几何图形在派生上下文和回调所属模块之间保持分离', () => {
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
          next.resolvePathTargets(resolvedResultOf(next, { namespace: 'test', type: 'geometry' }), {
            source: { id: 'n' },
            points: [],
          }).source,
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
  for (let index = 0; index < 2; index++) compileTestResult(source, { composites: [geometry, query] });
  expect(positions).toEqual(
    Array.from({ length: 4 }, () => [
      [20, 10],
      [80, 10],
      [20, 10],
    ]).flat(),
  );
});

it('在许多不同的查询之后保留根局部变换和早期坐标', () => {
  runQueries(context => {
    for (let index = 0; index < 80; index++) {
      const result = context.resolvePathTargets(
        resolvedResultOf(context, {
          type: 'scope',
          localNamespace: true,
          transforms: [{ kind: 'scale', x: 2, y: 2 }],
          children: [{ type: 'node', id: 'n', position: [index, 10] }],
        }),
        { source: { id: 'n' }, points: [{ id: 'n', offset: [20, 0] }] },
      );
      expect(result).toEqual({ source: [index, 10], points: [[index + 10, 10]] });
    }
    expect(
      context.resolvePathTargets(resolvedResultOf(context, { type: 'node', id: 'n', position: [0, 10] }), {
        source: { id: 'n' },
        points: [],
      }).source,
    ).toEqual([0, 10]);
  });
});

it('使用平滑的光标语义查询真实的子目标，而无需发布探测几何形状', () => {
  let observed: PathTargetQueryResult | undefined;
  const definition = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_node, context) => {
      observed = context.resolvePathTargets(
        resolvedResultOf(context, {
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
        }),
        {
          source: [10, 10],
          points: [
            { relative: [5, 0] },
            { relative: [0, 5] },
            { relativeAccumulate: [20, 0] },
            { relative: [0, 5] },
            { id: 'n', anchor: 'right' },
          ],
        },
      );
      return { children: [] };
    },
  });
  const result = compileTestResult(
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

it('重复的本地阴影查询永远不会替换可见的祖先引用', () => {
  const query = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_node, context) => {
      for (let index = 0; index < 4; index++) {
        expect(
          context.resolvePathTargets(
            resolvedResultOf(context, {
              type: 'scope',
              localNamespace: true,
              children: [{ type: 'coordinate', id: 'origin', position: [70, 80] }],
            }),
            { source: { id: 'origin' }, points: [] },
          ).source,
        ).toEqual([70, 80]);
        expect(
          context.resolvePathTargets(resolvedResultOf(context, { type: 'scope', children: [] }), {
            source: { id: 'origin' },
            points: [],
          }).source,
        ).toEqual([20, 30]);
      }
      return { children: [] };
    },
  });
  const result = compileTestResult(
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

it('在缺失点使目标查询失败，而不是默默地删除它', () => {
  const definition = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_node, context) => {
      const points: Array<IRTarget> = [[10, 0], { id: 'missing' }];
      context.resolvePathTargets(resolvedResultOf(context, { type: 'scope', children: [] }), {
        source: [0, 0],
        points,
      });
      return { children: [] };
    },
  });

  expect(() =>
    compileTestResult(
      { version: 1, type: 'scene', children: [{ namespace: 'test', type: 'query' }] },
      { composites: [definition] },
    ),
  ).toThrow(/points\[1\]/);
});

it('使用调用者变换和带有嵌套绝对表达式的世界节点偏移', () => {
  let observed: PathTargetQueryResult | undefined;
  const definition = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_node, context) => {
      observed = context.resolvePathTargets(
        resolvedResultOf(context, {
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
        }),
        {
          source: { relative: [10, 5] },
          points: [
            { id: 'n', offset: [20, 0] },
            { origin: 'n', angle: 0, radius: 20 },
            { of: 'n', offset: [20, 0] },
            { between: [[0, 0], { id: 'n' }], fraction: 0.5 },
          ],
        },
      );
      return { children: [] };
    },
  });
  compileTestResult(
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

it('查询注册的形状锚点而不是矩形近似值', () => {
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
      observed = context.resolvePathTargets(
        resolvedResultOf(context, { type: 'node', id: 'n', position: [100, 50], shape: 'query-shape' }),
        { source: [0, 0], points: [{ id: 'n', anchor: 'tip' }] },
      );
      return { children: [] };
    },
  });
  compileTestResult(
    { type: 'scene', version: 1, children: [{ namespace: 'test', type: 'query' }] },
    { composites: [definition], shapes: [shape] },
  );

  expect(observed?.points).toEqual([[103, 57]]);
});

it('在查询的根 Scope 命名空间内解析并返回其本地坐标', () => {
  let observed: PathTargetQueryResult | undefined;
  const definition = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_node, context) => {
      observed = context.resolvePathTargets(
        resolvedResultOf(context, {
          type: 'scope',
          localNamespace: true,
          transforms: [{ kind: 'scale', x: 2, y: 2 }],
          children: [{ type: 'node', id: 'n', position: [100, 50] }],
        }),
        { source: { id: 'n' }, points: [{ id: 'n', offset: [20, 0] }] },
      );
      return { children: [] };
    },
  });
  compileTestResult(
    { type: 'scene', version: 1, children: [{ namespace: 'test', type: 'query' }] },
    { composites: [definition] },
  );

  expect(observed).toEqual({ source: [100, 50], points: [[110, 50]] });
});

/** 通过正式布局入口取得查询所需结果 */
const resolvedResultOf = (context: CompositeCompileContext, child: IRChild): LayoutChildResult => {
  const probe = context.layoutChild(child, naturalLayoutProposal);
  if (probe.kind === 'failed') return context.raise(probe.failure);
  return probe.result;
};

it('查询根局部名称但不穿透后代私有命名空间', () => {
  runQueries(context => {
    const compiled = resolvedResultOf(context, {
      type: 'scope',
      localNamespace: true,
      children: [
        { type: 'coordinate', id: 'visible', position: [10, 20] },
        {
          type: 'scope',
          localNamespace: true,
          children: [{ type: 'coordinate', id: 'private', position: [30, 40] }],
        },
      ],
    });
    expect(() => context.resolvePathTargets(compiled, { source: { id: 'private' }, points: [] })).toThrow(/source/);
    expect(context.resolvePathTargets(compiled, { source: { id: 'visible' }, points: [] }).source).toEqual([10, 20]);
  });
});

it('派生主题查询保留原布局快照，查询后的结果仍可重放', () => {
  const geometry = defineComposite({
    namespace: 'test',
    type: 'geometry',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('geometry') }),
    compile: (_ir, context) => ({
      children: [{ type: 'node', id: 'n', position: [context.theme.mode === 'dark' ? 80 : 20, 10] }],
    }),
  });
  const query = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_ir, context) => {
      const compiled = resolvedResultOf(context, { namespace: 'test', type: 'geometry' });
      const dark = context.withTheme({ mode: 'dark' });
      expect(dark.resolvePathTargets(compiled, { source: { id: 'n' }, points: [] }).source).toEqual([20, 10]);
      const updated = resolvedResultOf(dark, { namespace: 'test', type: 'geometry' });
      expect(context.resolvePathTargets(updated, { source: { id: 'n' }, points: [] }).source).toEqual([80, 10]);
      return { children: [context.replay(compiled)] };
    },
  });
  const result = compileTestResult(
    { type: 'scene', version: 1, children: [{ namespace: 'test', type: 'query' }] },
    { composites: [geometry, query] },
  );
  expect(result.scene.primitives.length).toBeGreaterThan(0);
});

it('拒绝查询另一个回调拥有的真实布局结果', () => {
  let previous: LayoutChildResult | undefined;
  const query = defineComposite({
    namespace: 'test',
    type: 'query',
    schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('query') }),
    compile: (_ir, context) => {
      if (previous !== undefined) context.resolvePathTargets(previous, { source: [0, 0], points: [] });
      previous = resolvedResultOf(context, { type: 'coordinate', id: 'n', position: [10, 20] });
      return { children: [] };
    },
  });
  expect(() =>
    compileTestResult(
      {
        type: 'scene',
        version: 1,
        children: [
          { namespace: 'test', type: 'query' },
          { namespace: 'test', type: 'query' },
        ],
      },
      { composites: [query] },
    ),
  ).toThrow(/callback/);
});
