import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type { CompositeEvaluationResult, LayoutContribution } from '../../src';
import {
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  createCompositeInputBindings,
  defineComposite,
  naturalLayoutProposal,
} from '../../src';

const schema = <const TType extends string>(type: TType) =>
  CompositeBaseSchema.extend({ namespace: literal('measurement-test'), type: literal(type) });

describe('孤立的大小贡献', () => {
  it('将分配项目投影到提案上，并仍然执行最终的完整布局', () => {
    const results: Array<LayoutContribution> = [];
    let full = 0;
    const leaf = defineComposite({
      namespace: 'measurement-test',
      type: 'leaf',
      schema: schema('leaf'),
      compile: (_node, context): CompositeEvaluationResult => {
        if (context.evaluation.kind === 'contribution') {
          const axis = context.evaluation.axis;
          return {
            kind: 'contribution',
            contribution:
              axis === 'x'
                ? { axis, width: 100 }
                : axis === 'y'
                  ? { axis, height: 20 }
                  : { axis, width: 100, height: 20 },
          };
        }
        full++;
        return {
          children: [
            {
              type: 'node',
              position: [0, 0],
              shape: 'rectangle',
              layout: { minimumSize: { width: 100, height: 20 }, padding: 0 },
            },
          ],
        };
      },
    });
    const parent = defineComposite({
      namespace: 'measurement-test',
      type: 'parent',
      schema: schema('parent'),
      compile: (_node, context) => {
        const child = { namespace: 'measurement-test', type: 'leaf' };
        for (const axis of ['x', 'y', 'both'] as const) {
          const probe = context.measureChild(
            child,
            { x: { kind: 'exact', value: 60 }, y: naturalLayoutProposal.y },
            axis,
          );
          if (probe.kind === 'failed') context.raise(probe.failure);
          else results.push(probe.result);
        }
        const probe = context.layoutChild(child, naturalLayoutProposal);
        if (probe.kind === 'failed') return context.raise(probe.failure);
        return { children: [context.replay(probe.result)] };
      },
    });
    const result = compileToScene(
      { version: 1, type: 'scene', children: [{ namespace: 'measurement-test', type: 'parent' }] },
      { composites: [parent, leaf], padding: 0 },
    );
    const expected = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            position: [0, 0],
            shape: 'rectangle',
            layout: { minimumSize: { width: 100, height: 20 }, padding: 0 },
          },
        ],
      },
      { padding: 0 },
    );
    expect(results).toEqual([
      { axis: 'x', width: 60 },
      { axis: 'y', height: 20 },
      { axis: 'both', width: 60, height: 20 },
    ]);
    expect(result).toEqual(expected);
    expect(full).toBe(1);
  });

  it('拒绝完整布局请求中的贡献', () => {
    const leaf = defineComposite({
      namespace: 'measurement-test',
      type: 'invalid',
      schema: schema('invalid'),
      compile: (): CompositeEvaluationResult => ({ kind: 'contribution', contribution: { axis: 'x', width: 10 } }),
    });
    expect(() =>
      compileToScene(
        { version: 1, type: 'scene', children: [{ namespace: 'measurement-test', type: 'invalid' }] },
        { composites: [leaf] },
      ),
    ).toThrow();
  });
});

it.each(['source', 'generated', 'bound'])('仅重用跨祖先探测的稳定编写贡献：%s', mode => {
  let queries = 0;
  let full = 0;
  const seen: Array<number> = [];
  const leaf = defineComposite({
    namespace: 'measurement-test',
    type: 'cached-leaf',
    schema: schema('cached-leaf'),
    compile: (_node, context): CompositeEvaluationResult => {
      if (context.evaluation.kind === 'contribution') {
        queries++;
        return { kind: 'contribution', contribution: { axis: 'x', width: 37 } };
      }
      full++;
      return { children: [], allocationBounds: { x: 0, y: 0, width: 37, height: 9 } };
    },
  });
  const inner = defineComposite({
    namespace: 'measurement-test',
    type: 'inner',
    schema: schema('inner').extend({ child: ChildSchema }),
    compile: (_node, context) => {
      const generated = { namespace: 'measurement-test', type: 'cached-leaf' };
      const candidate =
        mode === 'source'
          ? context.selectSourceChild(['child'])
          : mode === 'bound'
            ? context.bindChild(generated, [{ path: [], input: 'ready' }])
            : generated;
      const probe = context.measureChild(candidate, naturalLayoutProposal, 'x');
      if (probe.kind === 'failed') return context.raise(probe.failure);
      if (probe.result.axis === 'x') seen.push(probe.result.width);
      return { children: [context.selectSourceChild(['child'])] };
    },
  });
  const outer = defineComposite({
    namespace: 'measurement-test',
    type: 'outer',
    schema: schema('outer').extend({ child: ChildSchema }),
    compile: (_node, context) => {
      const child = context.selectSourceChild(['child']);
      const first = context.layoutChild(child, naturalLayoutProposal);
      if (first.kind === 'failed') return context.raise(first.failure);
      const second = context.layoutChild(child, { x: { kind: 'exact', value: 50 }, y: naturalLayoutProposal.y });
      if (second.kind === 'failed') return context.raise(second.failure);
      expect(second.result.slotSize.width).toBe(50);
      return { children: [context.replay(second.result)] };
    },
  });
  const ir = {
    version: 1 as const,
    type: 'scene' as const,
    children: [
      {
        namespace: 'measurement-test',
        type: 'outer',
        child: {
          namespace: 'measurement-test',
          type: 'inner',
          child: { namespace: 'measurement-test', type: 'cached-leaf' },
        },
      },
    ],
  };
  compileToScene(ir, { composites: [leaf, inner, outer] });
  expect(seen).toEqual([37, 37]);
  expect(queries).toBe(mode === 'source' ? 1 : 2);
  expect(full).toBe(2);
  compileToScene(ir, { composites: [leaf, inner, outer] });
  expect(queries).toBe(mode === 'source' ? 2 : 4);
});

it('不缓存可恢复的故障或发布来自仅大小候选者的警告', () => {
  let attempts = 0;
  const warnings: Array<string> = [];
  const leaf = defineComposite({
    namespace: 'measurement-test',
    type: 'retry',
    schema: schema('retry'),
    compile: (_node, context): CompositeEvaluationResult => {
      attempts++;
      if (attempts === 1) throw new Error('external measurement failure');
      context.warn('candidate-only', 'Discarded candidate');
      return { kind: 'contribution', contribution: { axis: 'x', width: 12 } };
    },
  });
  const parent = defineComposite({
    namespace: 'measurement-test',
    type: 'retry-parent',
    schema: schema('retry-parent'),
    compile: (_node, context) => {
      const child = { namespace: 'measurement-test', type: 'retry' };
      expect(context.measureChild(child, naturalLayoutProposal, 'x').kind).toBe('failed');
      const result = context.measureChild(child, naturalLayoutProposal, 'x');
      expect(result).toEqual({ kind: 'resolved', result: { axis: 'x', width: 12 } });
      expect(context.measureChild(child, naturalLayoutProposal, 'x')).toEqual(result);
      return { children: [] };
    },
  });
  compileToScene(
    { version: 1, type: 'scene', children: [{ namespace: 'measurement-test', type: 'retry-parent' }] },
    { composites: [leaf, parent], onWarn: warning => warnings.push(warning.code) },
  );
  expect(attempts).toBe(2);
  expect(warnings).toEqual([]);
});

it('分隔主题环境并接受非 JSON 运行时绑定', () => {
  const widths: Array<number> = [];
  const leaf = defineComposite({
    namespace: 'measurement-test',
    type: 'environment-leaf',
    schema: schema('environment-leaf'),
    compile: (_node, context): CompositeEvaluationResult => {
      const width = Number(context.runtimeInput) + (context.theme.mode === 'dark' ? 10 : 0);
      return { kind: 'contribution', contribution: { axis: 'x', width } };
    },
  });
  const parent = defineComposite({
    namespace: 'measurement-test',
    type: 'environment-parent',
    schema: schema('environment-parent').extend({ child: ChildSchema }),
    compile: (_node, context) => {
      const bound = context.selectSourceChild(['child']);
      for (const themed of [context, context.withTheme({ mode: 'dark' }), context]) {
        const result = themed.measureChild(bound, naturalLayoutProposal, 'x');
        if (result.kind === 'failed') return themed.raise(result.failure);
        if (result.result.axis === 'x') widths.push(result.result.width);
      }
      return { children: [] };
    },
  });
  const ir = {
    version: 1 as const,
    type: 'scene' as const,
    children: [
      {
        namespace: 'measurement-test',
        type: 'environment-parent',
        child: { namespace: 'measurement-test', type: 'environment-leaf' },
      },
    ],
  };
  compileToScene(ir, {
    composites: [leaf, parent],
    compositeInputs: createCompositeInputBindings(ir, [{ path: ['children', 0, 'child'], input: 7n }]),
  });
  expect(widths).toEqual([7, 17, 7]);
});

it.each([
  { axis: 'y' as const, height: 10 },
  { axis: 'x' as const, width: Infinity },
  { axis: 'x' as const, width: -1 },
])('抛出无效的贡献而不是返回可恢复的失败：%j', contribution => {
  const leaf = defineComposite({
    namespace: 'measurement-test',
    type: 'fatal',
    schema: schema('fatal'),
    compile: (): CompositeEvaluationResult => ({ kind: 'contribution', contribution }),
  });
  const host = defineComposite({
    namespace: 'measurement-test',
    type: 'fatal-host',
    schema: schema('fatal-host'),
    compile: (_node, context) => {
      context.measureChild({ namespace: 'measurement-test', type: 'fatal' }, naturalLayoutProposal, 'x');
      return { children: [] };
    },
  });
  expect(() =>
    compileToScene(
      { version: 1, type: 'scene', children: [{ namespace: 'measurement-test', type: 'fatal-host' }] },
      { composites: [host, leaf] },
    ),
  ).toThrow();
});

it.each([false, true])('保持不同源位置的相同编写对象独立：nested=%s', nested => {
  let calls = 0;
  const leaf = defineComposite({
    namespace: 'measurement-test',
    type: 'position-leaf',
    schema: schema('position-leaf'),
    compile: (): CompositeEvaluationResult => {
      calls++;
      return { kind: 'contribution', contribution: { axis: 'x', width: 12 } };
    },
  });
  const wrapper = defineComposite({
    namespace: 'measurement-test',
    type: 'position-wrapper',
    schema: schema('position-wrapper').extend({ child: ChildSchema }),
    compile: (_node, context): CompositeEvaluationResult => {
      const measured = context.measureChild(context.selectSourceChild(['child']), naturalLayoutProposal, 'x');
      if (measured.kind === 'failed') return context.raise(measured.failure);
      return { kind: 'contribution', contribution: measured.result };
    },
  });
  const host = defineComposite({
    namespace: 'measurement-test',
    type: 'position-host',
    schema: schema('position-host').extend({ first: ChildSchema, second: ChildSchema }),
    compile: (_node, context) => {
      for (const key of ['first', 'second']) {
        const child = context.selectSourceChild([key]);
        for (let i = 0; i < 2; i++) {
          expect(context.measureChild(child, naturalLayoutProposal, 'x')).toEqual({
            kind: 'resolved',
            result: { axis: 'x', width: 12 },
          });
        }
      }
      return { children: [] };
    },
  });
  const leafSource = { namespace: 'measurement-test', type: 'position-leaf' };
  const child = nested ? { namespace: 'measurement-test', type: 'position-wrapper', child: leafSource } : leafSource;
  compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'measurement-test', type: 'position-host', first: child, second: child }],
    },
    { composites: [host, leaf, wrapper] },
  );
  expect(calls).toBe(2);
});

it('隔离完整的回退候选者并仅发布独立的最终回放', () => {
  let calls = 0;
  const leaf = defineComposite({
    namespace: 'measurement-test',
    type: 'fallback',
    schema: schema('fallback'),
    compile: () => {
      calls++;
      return {
        children: [
          {
            type: 'node' as const,
            id: 'selected',
            position: [0, 0] as [number, number],
            text: 'visible',
            style: {
              fill: {
                kind: 'linearGradient' as const,
                stops: [
                  { offset: 0, color: '#f00' },
                  { offset: 1, color: '#00f' },
                ],
              },
            },
          },
        ],
      };
    },
  });
  const host = defineComposite({
    namespace: 'measurement-test',
    type: 'fallback-host',
    schema: schema('fallback-host').extend({ child: ChildSchema }),
    compile: (_node, context) => {
      const child = context.selectSourceChild(['child']);
      const first = context.measureChild(child, naturalLayoutProposal, 'x');
      expect(context.measureChild(child, naturalLayoutProposal, 'x')).toEqual(first);
      expect(calls).toBe(1);
      const final = context.layoutChild(child, naturalLayoutProposal);
      if (final.kind === 'failed') return context.raise(final.failure);
      return { children: [context.replay(final.result)] };
    },
  });
  const output = compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [
        {
          namespace: 'measurement-test',
          type: 'fallback-host',
          child: { namespace: 'measurement-test', type: 'fallback' },
        },
      ],
    },
    { composites: [host, leaf] },
  );
  const expected = compileToScene(
    { version: 1, type: 'scene', children: [{ namespace: 'measurement-test', type: 'fallback' }] },
    { composites: [leaf] },
  );
  expect(output.scene).toEqual(expected.scene);
  expect(output.artifacts).toHaveLength(expected.artifacts.length);
  expect(calls).toBe(3);
});

it('在祖先命名空间更改后重新计算依赖于引用的大小', () => {
  const widths: Array<number> = [];
  const query = defineComposite({
    namespace: 'measurement-test',
    type: 'reference-query',
    schema: schema('reference-query').extend({ child: ChildSchema }),
    compile: (_node, context) => {
      const result = context.measureChild(context.selectSourceChild(['child']), naturalLayoutProposal, 'x');
      if (result.kind === 'failed') return context.raise(result.failure);
      if (result.result.axis === 'x') widths.push(result.result.width);
      return { children: [] };
    },
  });
  const inner = defineComposite({
    namespace: 'measurement-test',
    type: 'reference-inner',
    schema: schema('reference-inner').extend({ child: ChildSchema }),
    compile: (_node, context) => ({
      children: [
        {
          type: 'node',
          id: 'target',
          position: [context.proposal.x.kind === 'exact' ? context.proposal.x.value : 0, 0],
        },
        context.selectSourceChild(['child']),
      ],
    }),
  });
  const outer = defineComposite({
    namespace: 'measurement-test',
    type: 'reference-outer',
    schema: schema('reference-outer').extend({ child: ChildSchema }),
    compile: (_node, context) => {
      for (const width of [20, 40]) {
        const probe = context.layoutChild(context.selectSourceChild(['child']), {
          x: { kind: 'exact', value: width },
          y: naturalLayoutProposal.y,
        });
        if (probe.kind === 'failed') return context.raise(probe.failure);
      }
      return { children: [] };
    },
  });
  compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [
        {
          namespace: 'measurement-test',
          type: 'reference-outer',
          child: {
            namespace: 'measurement-test',
            type: 'reference-inner',
            child: {
              namespace: 'measurement-test',
              type: 'reference-query',
              child: {
                type: 'path',
                children: [
                  { type: 'step', kind: 'move', to: [0, 0] },
                  { type: 'step', kind: 'line', to: { id: 'target', anchor: 'center' } },
                ],
              },
            },
          },
        },
      ],
    },
    { composites: [outer, inner, query] },
  );
  expect(widths).toEqual([20, 40]);
});
