import { describe, expect, it, vi } from 'vitest';
import { boolean, literal, number, strictObject } from 'zod';

import type {
  CompileWarning,
  IRChild,
  IRScene,
  LayoutChildResult,
  CompositeCompileContext,
  LayoutProposal,
  ScenePrimitive,
  TextMeasurer,
} from '../../src';
import {
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  defineTheme,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  NaturalLayoutProposal,
} from '../../src';

const fixedMeasurer: TextMeasurer = text => ({
  width: text.length * 10,
  height: 10,
  ascent: 8,
  descent: 2,
});

const resolvedResultOf = (
  context: CompositeCompileContext,
  child: IRChild,
  proposal: LayoutProposal = NaturalLayoutProposal,
): LayoutChildResult => {
  const probe = context.layoutChild(child, proposal);
  if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
  return probe.result;
};

const createLayoutDefinition = () =>
  defineComposite({
    namespace: 'test',
    type: 'layout',
    schema: CompositeBaseSchema.extend({
      namespace: literal('test'),
      type: literal('layout'),
      child: ChildSchema,
      width: number().nonnegative(),
    }),
    artifactSchema: strictObject({
      naturalWidth: number(),
      rangeWidth: number(),
    }),
    compile: (node, context) => {
      expect(context.proposal).toEqual(NaturalLayoutProposal);
      expect(Object.isFrozen(context.proposal)).toBe(true);
      expect(Object.isFrozen(context.proposal.x)).toBe(true);
      expect(Object.isFrozen(context.proposal.y)).toBe(true);

      const naturalProbe = context.layoutChild(node.child, NaturalLayoutProposal);

      expect(naturalProbe.kind).toBe(LayoutChildProbeKind.Resolved);

      if (naturalProbe.kind === LayoutChildProbeKind.Failed) return context.raise(naturalProbe.failure);

      const ranged = resolvedResultOf(context, node.child, {
        x: { kind: LayoutAxisProposalKind.Range, min: 0, max: node.width },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      });

      return {
        children: [context.replay(ranged)],
        artifact: {
          naturalWidth: naturalProbe.result.allocationBounds.width,
          rangeWidth: ranged.allocationBounds.width,
        },
      };
    },
  });

const sceneOf = (child: IRChild): IRScene => ({
  version: 1,
  type: 'scene',
  children: [child],
});

describe('布局感知复合', () => {
  it('允许对已完成的子 Scope 边界进行外部复合查询', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'scope-query',
      schema: strictObject({ namespace: literal('test'), type: literal('scope-query') }),
      compile: (_source, context) => {
        const child: IRChild = {
          type: 'scope',
          id: 'box',
          children: [{ type: 'node', position: [20, 10], layout: { minimumSize: 20, padding: 0, margin: 0 } }],
        };
        for (let index = 0; index < 2; index++) {
          expect(
            context.resolvePathTargets({ child, source: { id: 'box', anchor: 'center' }, points: [] }).source,
          ).toEqual([20, 10]);
        }
        return { children: [child] };
      },
    });
    compileToScene(sceneOf({ namespace: 'test', type: 'scope-query' }), { composites: [definition] });
  });

  it('在隔离复合测量期间拒绝祖先引用', () => {
    const definition = createLayoutDefinition();
    expect(() =>
      compileToScene(
        sceneOf({
          type: 'scope',
          id: 'outer',
          children: [
            {
              namespace: 'test',
              type: 'layout',
              width: 100,
              child: { type: 'node', position: { of: 'outer', offset: [10, 0] } },
            },
          ],
        }),
        { composites: [definition] },
      ),
    ).toThrow(/ancestor Scope.*outer/);
  });

  it('局部主题上下文共享输入所有权，测量和目标查询一致且不修改父主题', () => {
    const child = defineComposite({
      namespace: 'test',
      type: 'themed-child',
      schema: strictObject({ namespace: literal('test'), type: literal('themed-child') }),
      compile: (_source, context) => ({
        children: [
          {
            type: 'node',
            id: 'target',
            position: [0, 0],
            shape: 'rectangle',
            layout: {
              width: context.theme.name === 'compact' ? 40 : 80,
              padding: 0,
              margin: 0,
              minimumSize: { height: 20 },
            },
          },
        ],
      }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'themed-parent',
      schema: strictObject({ namespace: literal('test'), type: literal('themed-parent') }),
      compile: (_source, context) => {
        const source = { namespace: 'test', type: 'themed-child' };
        const bound = context.bindChild(source, []);
        const local = context.withTheme({ name: 'compact' });
        const probe = local.layoutChild(bound, NaturalLayoutProposal);
        if (probe.kind === 'failed') return local.raise(probe.failure);
        expect(probe.result.allocationBounds.width).toBe(40);
        expect(resolvedResultOf(context, source).allocationBounds.width).toBe(80);
        expect(
          local.resolvePathTargets({ child: source, source: { id: 'target', anchor: 'right' }, points: [] }).source,
        ).toEqual([20, 0]);
        return { children: [context.createScope({ theme: { name: 'compact' } }, [context.replay(probe.result)])] };
      },
    });
    const result = compileToScene(sceneOf({ namespace: 'test', type: 'themed-parent' }), {
      composites: [parent, child],
      themeDefinitions: [defineTheme({ name: 'compact', resolve: () => ({}) })],
    });
    const rectangles = (items: ReadonlyArray<ScenePrimitive>): Array<Extract<ScenePrimitive, { type: 'rect' }>> =>
      items.flatMap(item => (item.type === 'group' ? rectangles(item.children) : item.type === 'rect' ? [item] : []));
    expect(rectangles(result.scene.primitives).map(rect => rect.width)).toEqual([40]);
  });
  it('使用当前 Source 定位器通过 onWarn 路由复合警告', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'warning',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('warning'),
      }),
      compile: (_node, context) => {
        context.warn('TEST_COMPOSITE_WARNING', 'Composite warning', 'recipe.marks[0].override');
        return { children: [] };
      },
    });
    const warnings: Array<CompileWarning> = [];

    compileToScene(sceneOf({ namespace: 'test', type: 'warning' }), {
      composites: [definition],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toEqual([
      expect.objectContaining({
        code: 'TEST_COMPOSITE_WARNING',
        message: 'Composite warning',
        path: 'children[0].recipe.marks[0].override',
      }),
    ]);
  });

  it('保持嵌套复合警告事务性，直到回放所选探测', () => {
    const child = defineComposite({
      namespace: 'test',
      type: 'warningChild',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('warningChild'),
      }),
      compile: (_node, context) => {
        context.warn('TEST_PROBE_WARNING', 'Probe warning');
        return { children: [] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'warningParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('warningParent'),
        replay: boolean(),
      }),
      compile: (node, context) => {
        const probe = context.layoutChild({ namespace: 'test', type: 'warningChild' }, NaturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: node.replay ? [context.replay(probe.result)] : [] };
      },
    });
    const discardedWarnings: Array<CompileWarning> = [];
    const replayedWarnings: Array<CompileWarning> = [];

    compileToScene(sceneOf({ namespace: 'test', type: 'warningParent', replay: false }), {
      composites: [child, parent],
      onWarn: warning => discardedWarnings.push(warning),
    });
    compileToScene(sceneOf({ namespace: 'test', type: 'warningParent', replay: true }), {
      composites: [child, parent],
      onWarn: warning => replayedWarnings.push(warning),
    });

    expect(discardedWarnings).toEqual([]);
    expect(replayedWarnings).toEqual([
      expect.objectContaining({ code: 'TEST_PROBE_WARNING', message: 'Probe warning' }),
    ]);
  });

  it('测量固有内容及受约束内容后回放所选结果，不执行第三次布局', () => {
    const measureText = vi.fn<TextMeasurer>(fixedMeasurer);
    const definition = createLayoutDefinition();
    const result = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'layout',
        width: 45,
        child: {
          type: 'node',
          position: [0, 0],
          text: 'aa aa',
          style: { fill: 'transparent', stroke: 'transparent' },
          layout: { padding: 0, margin: 0 },
        },
      }),
      { composites: [definition], measureText, padding: 0 },
    );

    expect(result.scene.primitives).not.toHaveLength(0);
    expect(result.artifacts).toEqual([
      {
        kind: 'composite',
        namespace: 'test',
        type: 'layout',
        occurrence: { sourcePath: 'children[0]', expansionPath: [] },
        value: { naturalWidth: 50, rangeWidth: 20 },
      },
    ]);
    expect(measureText).toHaveBeenCalledTimes(2);
  });

  it('将一系列 Scope 提案转发给嵌套的布局感知复合组件', () => {
    const nested = defineComposite({
      namespace: 'test',
      type: 'nestedConstraint',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('nestedConstraint'),
      }),
      artifactSchema: strictObject({
        xKind: literal(LayoutAxisProposalKind.Range),
        yMode: literal('natural'),
      }),
      compile: (_node, { proposal }) => {
        if (
          proposal.x.kind !== LayoutAxisProposalKind.Range ||
          proposal.x.min !== 0 ||
          proposal.x.max !== 40 ||
          proposal.y.kind !== LayoutAxisProposalKind.Intrinsic ||
          proposal.y.mode !== LayoutIntrinsicMode.Natural
        ) {
          throw new Error('Expected parent proposal inside structural Scope');
        }

        return {
          children: [],
          artifact: { xKind: proposal.x.kind, yMode: proposal.y.mode },
        };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'scopeConstraint',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('scopeConstraint'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(
          context,
          {
            type: 'scope',
            children: [{ namespace: 'test', type: 'nestedConstraint' }],
          },
          {
            x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 40 },
            y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
          },
        );
        return { children: [context.replay(laid)] };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'scopeConstraint' }), {
      composites: [parent, nested],
    });

    expect(result.artifacts).toEqual([
      {
        kind: 'composite',
        namespace: 'test',
        type: 'nestedConstraint',
        occurrence: {
          sourcePath: 'children[0]',
          expansionPath: [
            { kind: 'replay', index: 0 },
            { kind: 'scopeChild', index: 0 },
          ],
        },
        value: { xKind: 'range', yMode: 'natural' },
      },
    ]);
  });

  it('拒绝重复回放放置', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'duplicateReplay',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('duplicateReplay'),
        child: ChildSchema,
      }),
      compile: (node, context) => {
        const laid = resolvedResultOf(context, node.child);
        return {
          children: [context.replay(laid), context.replay(laid)],
        };
      },
    });

    expect(() =>
      compileToScene(
        sceneOf({
          namespace: 'test',
          type: 'duplicateReplay',
          child: { type: 'node', position: [0, 0], text: 'A' },
        }),
        { composites: [definition] },
      ),
    ).toThrow(/Composite 'test\.duplicateReplay' at children\[0\].*already replayed/i);
  });
});
