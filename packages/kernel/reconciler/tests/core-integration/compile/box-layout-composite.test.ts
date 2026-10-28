import type {
  CompileWarning,
  IRChild,
  IRScene,
  LayoutChildResult,
  CompositeCompileContext,
  LayoutProposal,
  TextMeasurer,
} from '@retikz/core';
import {
  ChildSchema,
  compileToScene,
  BuiltinCompileWarningCode,
  CompositeBaseSchema,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  naturalLayoutProposal,
} from '@retikz/core';
import { ReconcilerSession } from '@retikz/reconciler';
import { describe, expect, it } from 'vitest';
import { literal, number, strictObject, string } from 'zod';

const fixedMeasurer: TextMeasurer = text => ({
  width: text.length * 10,
  height: 10,
  ascent: 8,
  descent: 2,
});

const sceneOf = (child: IRChild): IRScene => ({
  version: 1,
  type: 'scene',
  children: [child],
});

const resolvedResultOf = (
  context: CompositeCompileContext,
  child: IRChild,
  proposal: LayoutProposal = naturalLayoutProposal,
): LayoutChildResult => {
  const probe = context.layoutChild(child, proposal);
  if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
  return probe.result;
};

const boxNode = (text = ''): IRChild => ({
  type: 'node',
  position: [0, 0],
  text,
  style: { fill: 'transparent', stroke: 'transparent', strokeWidth: 0 },
  layout: { padding: 0, margin: 0, minimumSize: 10 },
});

describe('盒子 Layout 综合契约', () => {
  it('分离约束分配、有界/精确槽大小和视觉边界', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'slotProbe',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('slotProbe'),
        child: ChildSchema,
      }),
      artifactSchema: strictObject({
        allocationWidth: number(),
        allocationHeight: number(),
        slotWidth: number(),
        slotHeight: number(),
        visualWidth: number(),
      }),
      compile: (node, context) => {
        const laid = resolvedResultOf(context, node.child, {
          x: { kind: LayoutAxisProposalKind.Range, min: 30, max: 50 },
          y: { kind: LayoutAxisProposalKind.Exact, value: 40 },
        });
        return {
          children: [context.replay(laid)],
          artifact: {
            allocationWidth: laid.allocationBounds.width,
            allocationHeight: laid.allocationBounds.height,
            slotWidth: laid.slotSize.width,
            slotHeight: laid.slotSize.height,
            visualWidth: laid.visualBounds.width,
          },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'slotProbe', child: boxNode() }), {
      composites: [definition],
      measureText: fixedMeasurer,
      padding: 0,
    });
    const artifact = result.artifacts.find(value => value.kind === 'composite');

    expect(artifact?.value).toEqual({
      allocationWidth: 10,
      allocationHeight: 19.2,
      slotWidth: 30,
      slotHeight: 40,
      visualWidth: 10,
    });
  });

  it('使用内在分配维度作为内在槽大小', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'intrinsicSlot',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('intrinsicSlot'),
      }),
      artifactSchema: strictObject({
        allocationWidth: number(),
        allocationHeight: number(),
        slotWidth: number(),
        slotHeight: number(),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, boxNode());
        return {
          children: [context.replay(laid)],
          artifact: {
            allocationWidth: laid.allocationBounds.width,
            allocationHeight: laid.allocationBounds.height,
            slotWidth: laid.slotSize.width,
            slotHeight: laid.slotSize.height,
          },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'intrinsicSlot' }), {
      composites: [definition],
    });

    expect(result.artifacts.find(value => value.kind === 'composite')?.value).toEqual({
      allocationWidth: 10,
      allocationHeight: 19.2,
      slotWidth: 10,
      slotHeight: 19.2,
    });
  });

  it('保持零与不定轴不同', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'zeroProbe',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('zeroProbe'),
      }),
      artifactSchema: strictObject({
        exactWidth: number(),
        boundedHeight: number(),
        indefiniteHeight: number(),
      }),
      compile: (_node, context) => {
        const exact = resolvedResultOf(context, boxNode(), {
          x: { kind: LayoutAxisProposalKind.Exact, value: 0 },
          y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        });
        const bounded = resolvedResultOf(context, boxNode(), {
          x: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
          y: { kind: LayoutAxisProposalKind.Range, min: 0, max: 0 },
        });

        return {
          children: [context.replay(exact)],
          artifact: {
            exactWidth: exact.slotSize.width,
            boundedHeight: bounded.slotSize.height,
            indefiniteHeight: exact.slotSize.height,
          },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'zeroProbe' }), {
      composites: [definition],
      measureText: fixedMeasurer,
    });
    const artifact = result.artifacts.find(value => value.kind === 'composite');

    expect(artifact?.value).toEqual({ exactWidth: 0, boundedHeight: 0, indefiniteHeight: 19.2 });
  });

  it('将溢出的嵌套子级保留在显式分配内，并传递精确的高度而不进行缩放', () => {
    const nested = defineComposite({
      namespace: 'test',
      type: 'nestedBox',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('nestedBox'),
      }),
      artifactSchema: strictObject({
        widthKind: string(),
        heightKind: string(),
        heightSize: number(),
      }),
      compile: (_node, context) => ({
        allocationBounds: { x: 5, y: 6, width: 20, height: 10 },
        children: [{ type: 'coordinate', id: 'nested-point', position: [100, 100] }],
        artifact: {
          widthKind: context.proposal.x.kind,
          heightKind: context.proposal.y.kind,
          heightSize: context.proposal.y.kind === LayoutAxisProposalKind.Exact ? context.proposal.y.value : -1,
        },
      }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'nestedParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('nestedParent'),
      }),
      artifactSchema: strictObject({
        allocationX: number(),
        allocationY: number(),
        allocationWidth: number(),
        allocationHeight: number(),
        slotWidth: number(),
        slotHeight: number(),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(
          context,
          { namespace: 'test', type: 'nestedBox' },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: 80 },
            y: { kind: LayoutAxisProposalKind.Exact, value: 40 },
          },
        );
        return {
          children: [context.replay(laid)],
          artifact: {
            allocationX: laid.allocationBounds.x,
            allocationY: laid.allocationBounds.y,
            allocationWidth: laid.allocationBounds.width,
            allocationHeight: laid.allocationBounds.height,
            slotWidth: laid.slotSize.width,
            slotHeight: laid.slotSize.height,
          },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'nestedParent' }), {
      composites: [nested, parent],
      padding: 0,
    });
    const artifacts = result.artifacts.filter(value => value.kind === 'composite');

    expect(artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: { widthKind: 'exact', heightKind: 'exact', heightSize: 40 } }),
        expect.objectContaining({
          value: {
            allocationX: 5,
            allocationY: 6,
            allocationWidth: 20,
            allocationHeight: 10,
            slotWidth: 80,
            slotHeight: 40,
          },
        }),
      ]),
    );
  });

  it('从其显式容器分配中测量空组合', () => {
    const empty = defineComposite({
      namespace: 'test',
      type: 'emptyBox',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('emptyBox'),
      }),
      compile: () => ({
        allocationBounds: { x: 2, y: 3, width: 40, height: 20 },
        children: [],
      }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'emptyBoxParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('emptyBoxParent'),
      }),
      artifactSchema: strictObject({
        x: number(),
        y: number(),
        width: number(),
        height: number(),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'emptyBox' });
        return {
          children: [context.replay(laid)],
          artifact: { ...laid.allocationBounds },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'emptyBoxParent' }), {
      composites: [empty, parent],
    });

    expect(result.artifacts.find(value => value.kind === 'composite')?.value).toEqual({
      x: 2,
      y: 3,
      width: 40,
      height: 20,
    });
    expect(result.scene.primitives).toEqual([]);
  });

  it('将可见子溢出保留在显式分配框之外', () => {
    const leaf = defineComposite({
      namespace: 'test',
      type: 'visibleOverflowLeaf',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('visibleOverflowLeaf'),
      }),
      compile: () => ({
        allocationBounds: { x: 0, y: 0, width: 10, height: 10 },
        children: [{ type: 'node', position: [100, 100], minimumSize: 10, padding: 0, margin: 0 }],
      }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'visibleOverflowParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('visibleOverflowParent'),
      }),
      artifactSchema: strictObject({ x: number(), y: number(), width: number(), height: number() }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'visibleOverflowLeaf' });
        return { children: [context.replay(laid)], artifact: { ...laid.allocationBounds } };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'visibleOverflowParent' }), {
      composites: [leaf, parent],
      padding: 0,
    });

    expect(result.artifacts.find(value => value.kind === 'composite')?.value).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    });
    expect(result.scene.layout).toEqual({ x: 95, y: 95, width: 10, height: 10 });
  });

  it('与精确宽度槽分开报告回流高度', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'exactWidthReflow',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('exactWidthReflow'),
      }),
      artifactSchema: strictObject({
        intrinsicHeight: number(),
        constrainedHeight: number(),
        slotWidth: number(),
      }),
      compile: (_node, context) => {
        const child = boxNode('aa aa');
        const intrinsic = resolvedResultOf(context, child);
        const constrained = resolvedResultOf(context, child, {
          x: { kind: LayoutAxisProposalKind.Exact, value: 25 },
          y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        });

        return {
          children: [context.replay(constrained)],
          artifact: {
            intrinsicHeight: intrinsic.allocationBounds.height,
            constrainedHeight: constrained.allocationBounds.height,
            slotWidth: constrained.slotSize.width,
          },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'exactWidthReflow' }), {
      composites: [definition],
      measureText: fixedMeasurer,
      padding: 0,
    });
    const artifact = result.artifacts.find(value => value.kind === 'composite');
    if (artifact?.kind !== 'composite') throw new Error('Expected exact width artifact');

    const value = artifact.value;

    expect(value.slotWidth).toBe(25);
    expect(value.constrainedHeight).toBeGreaterThan(value.intrinsicHeight);
  });

  it('在提供者破坏父槽之前分离并冻结嵌套约束', () => {
    let mutationSucceeded = true;
    let receivedFrozenConstraint = false;
    const nested = defineComposite({
      namespace: 'test',
      type: 'constraintMutator',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('constraintMutator'),
      }),
      compile: (_node, context) => {
        const xProposal = context.proposal.x;
        receivedFrozenConstraint = Object.isFrozen(context.proposal) && Object.isFrozen(xProposal);
        mutationSucceeded = Reflect.set(xProposal, 'value', -5);

        return { children: [] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'constraintOwner',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('constraintOwner'),
      }),
      artifactSchema: strictObject({ slotWidth: number() }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(
          context,
          { namespace: 'test', type: 'constraintMutator' },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: 20 },
            y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
          },
        );
        return { children: [context.replay(laid)], artifact: { slotWidth: laid.slotSize.width } };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'constraintOwner' }), {
      composites: [nested, parent],
    });

    expect(receivedFrozenConstraint).toBe(true);
    expect(mutationSucceeded).toBe(false);
    expect(result.artifacts.find(value => value.kind === 'composite')?.value).toEqual({ slotWidth: 20 });
  });

  it('标准化槽大小中的负零', () => {
    let slotWidth = Number.NaN;
    const definition = defineComposite({
      namespace: 'test',
      type: 'negativeZeroSlot',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('negativeZeroSlot'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, boxNode(), {
          x: { kind: LayoutAxisProposalKind.Exact, value: -0 },
          y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        });
        slotWidth = laid.slotSize.width;

        return { children: [context.replay(laid)] };
      },
    });

    compileToScene(sceneOf({ namespace: 'test', type: 'negativeZeroSlot' }), { composites: [definition] });

    expect(slotWidth).toBe(0);
    expect(Object.is(slotWidth, -0)).toBe(false);
  });

  it('用规范变换和裁剪语义包装回放根', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'clippedReplay',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('clippedReplay'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, boxNode());
        return {
          children: [
            context.replay(laid, {
              transforms: [{ kind: 'translate', x: 10, y: 20 }],
              clip: { kind: 'rect', params: { x: 8, y: 18, width: 4, height: 4 } },
            }),
          ],
        };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'clippedReplayParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('clippedReplayParent'),
      }),
      artifactSchema: strictObject({ width: number(), height: number() }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'clippedReplay' });
        return {
          children: [context.replay(laid)],
          artifact: { width: laid.allocationBounds.width, height: laid.allocationBounds.height },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'clippedReplayParent' }), {
      composites: [definition, parent],
      padding: 0,
    });
    const primitive = result.scene.primitives[0];

    expect(result.scene.resources).toEqual([
      expect.objectContaining({
        kind: 'clip',
        id: 'clip-1',
        path: {
          commands: [
            { kind: 'move', to: [8, 18] },
            { kind: 'line', to: [12, 18] },
            { kind: 'line', to: [12, 22] },
            { kind: 'line', to: [8, 22] },
            { kind: 'close' },
          ],
          fillRule: 'nonzero',
        },
      }),
    ]);
    expect(primitive).toMatchObject({
      type: 'group',
      clipRef: 'clip-1',
    });
    expect(primitive).not.toHaveProperty('transforms');

    if (primitive.type !== 'group') throw new Error('expected replay clip group');

    expect(primitive.children[0]).toMatchObject({
      type: 'group',
      transforms: [{ kind: 'translate', x: 10, y: 20 }],
    });

    const allocation = result.artifacts.find(value => value.kind === 'composite')?.value;

    expect(allocation?.width).toBe(10);
    expect(allocation?.height).toBeCloseTo(19.2);
    expect(result.scene.layout).toEqual({ x: 8, y: 18, width: 4, height: 4 });
  });

  it('不为空或完全裁剪的回放包装器注入原点边界', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'invisibleReplayWrappers',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('invisibleReplayWrappers'),
      }),
      compile: (_node, context) => {
        const empty = resolvedResultOf(context, { type: 'coordinate', id: 'empty-coordinate', position: [20, 20] });
        const clipped = resolvedResultOf(context, boxNode());

        return {
          children: [
            context.replay(empty, { clip: { kind: 'rect', params: { x: -10, y: -10, width: 5, height: 5 } } }),
            context.replay(clipped, { clip: { kind: 'rect', params: { x: 20, y: 20, width: 5, height: 5 } } }),
            { ...boxNode(), position: [100, 100] },
          ],
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'invisibleReplayWrappers' }), {
      composites: [definition],
      padding: 0,
    });

    expect(result.scene.layout).toEqual({ x: 95, y: 90.4, width: 10, height: 19.2 });
  });

  it('在回调返回之前分离回放包装器变换和裁剪', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'detachedReplayWrapper',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('detachedReplayWrapper'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, boxNode());
        const transforms = [{ kind: 'translate' as const, x: 5, y: 6 }];
        const clip = { kind: 'rect' as const, params: { x: -2, y: -2, width: 4, height: 4 } };
        const replay = context.replay(laid, { transforms, clip });
        transforms[0].x = 99;
        clip.params.width = 99;

        return { children: [replay] };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'detachedReplayWrapper' }), {
      composites: [definition],
      padding: 0,
    });

    const primitive = result.scene.primitives[0];

    expect(primitive).toMatchObject({ type: 'group', clipRef: 'clip-1' });

    if (primitive.type !== 'group') throw new Error('expected replay clip group');

    expect(primitive.children[0]).toMatchObject({
      type: 'group',
      transforms: [{ kind: 'translate', x: 5, y: 6 }],
    });
    expect(result.scene.resources?.[0]).toMatchObject({
      kind: 'clip',
      path: {
        commands: [
          { kind: 'move', to: [-2, -2] },
          { kind: 'line', to: [2, -2] },
          { kind: 'line', to: [2, 2] },
          { kind: 'line', to: [-2, 2] },
          { kind: 'close' },
        ],
        fillRule: 'nonzero',
      },
    });
  });

  it.each([
    ['non-finite transform', { transforms: [{ kind: 'translate', x: Number.NaN, y: 0 }] }],
    ['invalid clip', { clip: { kind: 'rect', params: { x: 0, y: 0, width: -1, height: 10 } } }],
  ])('拒绝无效的回放几何体：%s', (_name, wrapper) => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'invalidReplayWrapper',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('invalidReplayWrapper'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, boxNode());
        return { children: [context.replay(laid, wrapper as never)] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'invalidReplayWrapper' }), {
        composites: [definition],
      }),
    ).toThrow(/(non-finite bounds|clip.*failed schema validation)/i);
  });

  it.each([
    null,
    { x: { kind: 'intrinsic', mode: 'natural' } },
    { x: { kind: 'range', min: 20, max: 10 }, y: { kind: 'intrinsic', mode: 'natural' } },
    { x: { kind: 'exact', value: Number.NaN }, y: { kind: 'intrinsic', mode: 'natural' } },
    { x: { kind: 'intrinsic', mode: 'natural' }, y: { kind: 'range', min: 0, max: Number.POSITIVE_INFINITY } },
  ])('拒绝复合出现的无效双轴建议 %o', proposal => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'invalidBoxConstraint',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('invalidBoxConstraint'),
      }),
      compile: (_node, context) => {
        context.layoutChild(boxNode(), proposal as never);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'invalidBoxConstraint' }), { composites: [definition] }),
    ).toThrow(/test\.invalidBoxConstraint.*children\[0\].*(proposal|axis|finite|min|max)/i);
  });

  it.each([
    { x: 0, y: 0, width: -1, height: 10 },
    { x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 10 },
  ])('在发布输出之前拒绝无效的显式分配：%o', allocationBounds => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'invalidAllocation',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('invalidAllocation'),
      }),
      compile: () => ({ allocationBounds, children: [boxNode()] }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'invalidAllocation' }), { composites: [definition] }),
    ).toThrow(/test\.invalidAllocation.*children\[0\].*allocation/i);
  });

  it('在验证和发布之前对动态显式分配字段进行快照', () => {
    let widthReads = 0;
    const allocationBounds = new Proxy(
      { x: 0, y: 0, width: 20, height: 10 },
      {
        get: (target, property, receiver) => {
          if (property === 'width') {
            widthReads += 1;
            return widthReads <= 3 ? 20 : Number.NaN;
          }

          return Reflect.get(target, property, receiver);
        },
      },
    );
    const child = defineComposite({
      namespace: 'test',
      type: 'dynamicAllocationChild',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('dynamicAllocationChild'),
      }),
      compile: () => ({ allocationBounds, children: [boxNode()] }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'dynamicAllocationParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('dynamicAllocationParent'),
      }),
      artifactSchema: strictObject({ width: number() }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'dynamicAllocationChild' });
        return { children: [], artifact: { width: laid.allocationBounds.width } };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'dynamicAllocationParent' }), {
      composites: [child, parent],
    });

    expect(result.artifacts.find(value => value.kind === 'composite')?.value).toEqual({ width: 20 });
    expect(widthReads).toBe(1);
  });

  it('对更改后的布局感知组合使用完整回退，并匹配新的编译', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'runtimeBox',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('runtimeBox'),
        x: number(),
      }),
      compile: (node, context) => {
        const laid = resolvedResultOf(
          context,
          {
            type: 'scope',
            children: [
              { ...boxNode(), id: 'duplicate' },
              { ...boxNode(), id: 'duplicate' },
            ],
          },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: 20 },
            y: { kind: LayoutAxisProposalKind.Exact, value: 20 },
          },
        );
        return {
          allocationBounds: { x: node.x, y: 0, width: 20, height: 20 },
          children: [context.replay(laid, { transforms: [{ kind: 'translate', x: node.x, y: 0 }] })],
        };
      },
    });
    const initial = sceneOf({ namespace: 'test', type: 'runtimeBox', x: 0 });
    const next = sceneOf({ namespace: 'test', type: 'runtimeBox', x: 30 });
    const options = { composites: [definition], onWarn: () => {} };
    const session = new ReconcilerSession(options);
    session.mount(initial);

    const result = session.replace(next);
    const artifact = session.read();
    const freshDiagnostics: Array<CompileWarning> = [];
    const freshResult = compileToScene(next, {
      composites: [definition],
      onWarn: warning => freshDiagnostics.push(warning),
    });

    expect(result.revision).toBe(1);
    expect(artifact.compilation).toMatchObject({
      result: freshResult,
      diagnostics: freshDiagnostics,
      observerOutputs: [],
    });
    expect(artifact.compilation.diagnostics.map(warning => warning.code)).toContain(
      BuiltinCompileWarningCode.DuplicateNodeId,
    );
  });
});
