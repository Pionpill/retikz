import type { JsonValue } from '@retikz/foundation';
import { RetikzError } from '@retikz/foundation';
import { describe, expect, it, vi } from 'vitest';
import { boolean, custom, literal, number, strictObject, enum as zodEnum } from 'zod';

import type {
  CompileWarning,
  CompositeCompileContext,
  CompositeReplay,
  IRChild,
  IRScene,
  LayoutChildFailure,
  LayoutChildResult,
  LayoutProposal,
  SceneClipPath,
  ScenePrimitive,
  TexLowerer,
  TextMeasurer,
} from '../../src';
import {
  BUILTIN_SHAPES,
  BuiltinCompileWarningCode,
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  defineArrow,
  defineBoundary,
  defineClip,
  defineComposite,
  definePath,
  definePattern,
  defineShape,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  naturalLayoutProposal,
  PathSchema,
} from '../../src';
import { createFullCompileContext } from '../../src/compile/context';
import { NamespaceStack } from '../../src/compile/namespace';
import * as compileProvenance from '../../src/compile/orchestration/provenance';
import { compileChildrenToPrimitives } from '../../src/compile/orchestration/traversal';
import { createCompileInvariantError, wrapLayoutProbeError } from '../../src/compile/probe-failure';
import { snapshotProviderPosition } from '../../src/compile/scene-primitive';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../src/error';
import { isLayoutProbeRecoverableError } from '../../src/resolve/diagnostics';
import { cloneAndFreezeJson } from '../../src/shared/json';
import { pathArrows } from '../helpers/path-arrows';

const fixedMeasurer: TextMeasurer = text => ({
  width: text.length * 10,
  height: 10,
  ascent: 8,
  descent: 2,
});

const BoundsSchema = strictObject({
  x: number(),
  y: number(),
  width: number(),
  height: number(),
});

const sceneOf = (...children: Array<IRChild>): IRScene => ({
  version: 1,
  type: 'scene',
  children,
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

const createBoundsProbe = () =>
  defineComposite({
    namespace: 'test',
    type: 'boundsProbe',
    schema: CompositeBaseSchema.extend({
      namespace: literal('test'),
      type: literal('boundsProbe'),
      child: ChildSchema,
      maxWidth: number().optional(),
    }),
    artifactSchema: strictObject({
      allocation: BoundsSchema,
      visual: BoundsSchema,
    }),
    compile: (node, context) => {
      const laid = resolvedResultOf(
        context,
        node.child,
        node.maxWidth === undefined
          ? naturalLayoutProposal
          : {
              x: { kind: LayoutAxisProposalKind.Range, min: 0, max: node.maxWidth },
              y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
            },
      );
      return {
        children: [context.replay(laid)],
        artifact: {
          allocation: laid.allocationBounds,
          visual: laid.visualBounds,
        },
      };
    },
  });

describe('布局感知的复契约束和边界', () => {
  it('在分配中保持边距，同时视觉边界遵循绘制和阴影', () => {
    const definition = createBoundsProbe();
    const result = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'boundsProbe',
        child: {
          type: 'node',
          position: [0, 0],
          style: {
            fill: '#f00',
            stroke: '#000',
            shadow: {
              offsetX: 10,
              offsetY: -8,
              blur: 2,
              color: '#000',
            },
            opacity: { stroke: 0 },
          },
          layout: { minimumSize: { width: 20, height: 10 }, padding: 0, margin: 5 },
        },
      }),
      { composites: [definition], padding: 0 },
    );

    expect(result.artifacts[0]?.value).toEqual({
      allocation: { x: -15, y: -10, width: 30, height: 20 },
      visual: { x: -12, y: -15, width: 34, height: 22 },
    });
  });

  it('将 maxWidth 视为回流上限，而不缩放固定几何形状', () => {
    const definition = createBoundsProbe();
    const pathResult = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'boundsProbe',
        maxWidth: 20,
        child: {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      }),
      { composites: [definition] },
    );
    const emptyTextResult = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'boundsProbe',
        maxWidth: 0,
        child: {
          type: 'node',
          position: [0, 0],
          text: '',
          style: { opacity: { fill: 0, stroke: 0 } },
          layout: { padding: 0, margin: 0 },
        },
      }),
      { composites: [definition], measureText: fixedMeasurer, padding: 0 },
    );

    expect(pathResult.artifacts[0]?.value).toMatchObject({
      allocation: { x: 0, y: 0, width: 100, height: 0 },
    });
    expect(emptyTextResult.artifacts[0]?.value).toMatchObject({
      allocation: { width: 0 },
      visual: { width: 0 },
    });
  });

  it('布局 Coordinate、Scope 和具有有限边界的空输出', () => {
    const definition = createBoundsProbe();
    const result = compileToScene(
      sceneOf(
        {
          namespace: 'test',
          type: 'boundsProbe',
          child: { type: 'coordinate', id: 'point', position: [3, 4] },
        },
        {
          namespace: 'test',
          type: 'boundsProbe',
          child: {
            type: 'scope',
            children: [
              {
                type: 'node',
                position: [10, 20],
                style: { fill: '#f00', opacity: { stroke: 0 } },
                layout: { minimumSize: 10, padding: 0, margin: 0 },
              },
            ],
          },
        },
        {
          namespace: 'test',
          type: 'boundsProbe',
          child: { type: 'scope', children: [] },
        },
      ),
      { composites: [definition], padding: 0 },
    );

    expect(result.artifacts.map(artifact => artifact.value)).toMatchObject([
      {
        allocation: { x: 3, y: 4, width: 0, height: 0 },
        visual: { x: 0, y: 0, width: 0, height: 0 },
      },
      {
        allocation: { x: 5, y: 15, width: 10, height: 10 },
        visual: { x: 5, y: 15, width: 10, height: 10 },
      },
      {
        allocation: { x: 0, y: 0, width: 0, height: 0 },
        visual: { x: 0, y: 0, width: 0, height: 0 },
      },
    ]);
  });

  it('通过嵌套布局感知复合组件原样传递完整双轴布局提议', () => {
    const nested = defineComposite({
      namespace: 'test',
      type: 'nestedConstraint',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('nestedConstraint'),
      }),
      artifactSchema: strictObject({
        xValue: number(),
        yMin: number(),
        yHasMax: boolean(),
        frozen: boolean(),
      }),
      compile: (_, { proposal }) => {
        if (proposal.x.kind !== LayoutAxisProposalKind.Exact || proposal.y.kind !== LayoutAxisProposalKind.Range) {
          throw new Error('Expected exact/range proposal');
        }

        return {
          children: [],
          artifact: {
            xValue: proposal.x.value,
            yMin: proposal.y.min,
            yHasMax: proposal.y.max !== undefined,
            frozen: Object.isFrozen(proposal) && Object.isFrozen(proposal.x) && Object.isFrozen(proposal.y),
          },
        };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'constraintParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('constraintParent'),
      }),
      compile: (_, context) => {
        const child = resolvedResultOf(
          context,
          { namespace: 'test', type: 'nestedConstraint' },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: 25 },
            y: { kind: LayoutAxisProposalKind.Range, min: 3 },
          },
        );
        return { children: [context.replay(child)] };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'constraintParent' }), {
      composites: [nested, parent],
    });

    expect(result.artifacts).toMatchObject([
      {
        namespace: 'test',
        type: 'nestedConstraint',
        value: { xValue: 25, yMin: 3, yHasMax: false, frozen: true },
      },
    ]);
  });

  it('将箭头标记绘制保留在路径分配之外但在视觉边界内', () => {
    const definition = createBoundsProbe();
    const result = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'boundsProbe',
        child: {
          type: 'path',
          arrow: pathArrows('->'),
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
          style: { lineJoin: 'bevel' },
        },
      }),
      { composites: [definition], measureText: fixedMeasurer },
    );
    const artifact = result.artifacts[0];

    expect(artifact.value).toMatchObject({
      allocation: { x: 0, y: 0, width: 100, height: 0 },
    });

    const { allocation, visual } = artifact.value;

    expect(visual.x).toBeLessThan(allocation.x);
    expect(visual.x + visual.width).toBeGreaterThanOrEqual(allocation.x + allocation.width);
    expect(visual.height).toBeGreaterThan(1);
  });

  it.each([
    {
      label: 'negative exact',
      proposal: {
        x: { kind: LayoutAxisProposalKind.Exact, value: -1 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      },
    },
    {
      label: 'NaN range min',
      proposal: {
        x: { kind: LayoutAxisProposalKind.Range, min: Number.NaN, max: 10 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      },
    },
    {
      label: 'infinite range max',
      proposal: {
        x: { kind: LayoutAxisProposalKind.Range, min: 0, max: Number.POSITIVE_INFINITY },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      },
    },
    {
      label: 'descending range',
      proposal: {
        x: { kind: LayoutAxisProposalKind.Range, min: 11, max: 10 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      },
    },
  ])('在调度子项前拒绝 $label 并报告复合组件键及实例', ({ proposal }) => {
    let dispatched = false;
    const dispatchSentinel = defineComposite({
      namespace: 'test',
      type: 'dispatchSentinel',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('dispatchSentinel'),
      }),
      compile: () => {
        dispatched = true;
        return { children: [] };
      },
    });
    const definition = defineComposite({
      namespace: 'test',
      type: 'invalidConstraint',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('invalidConstraint'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            namespace: 'test',
            type: 'dispatchSentinel',
          },
          proposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'invalidConstraint' }), {
        composites: [definition, dispatchSentinel],
      }),
    ).toThrow(/test\.invalidConstraint.*children\[0\]/i);
    expect(dispatched).toBe(false);
  });

  it('父级丢弃探测结果时嵌套复合组件的无效布局提议仍为致命错误', () => {
    const nested = defineComposite({
      namespace: 'test',
      type: 'invalidNestedProposal',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('invalidNestedProposal'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          { type: 'coordinate', id: 'point', position: [0, 0] },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: -1 },
            y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
          },
        );
        return { children: [] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'discardInvalidNestedProposal',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('discardInvalidNestedProposal'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'invalidNestedProposal' }, naturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'discardInvalidNestedProposal' }), {
        composites: [parent, nested],
      }),
    ).toThrow(/test\.invalidNestedProposal.*proposal.*finite and non-negative/i);
  });

  it('父级丢弃嵌套探测结果时恶意布局提议访问仍为致命错误', () => {
    const nested = defineComposite({
      namespace: 'test',
      type: 'hostileNestedProposal',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('hostileNestedProposal'),
      }),
      compile: (_, context) => {
        const hostileProposal = new Proxy(naturalLayoutProposal, {
          get: () => {
            throw new Error('hostile proposal access');
          },
        });
        context.layoutChild({ type: 'coordinate', id: 'point', position: [0, 0] }, hostileProposal);

        return { children: [] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'discardHostileNestedProposal',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('discardHostileNestedProposal'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'hostileNestedProposal' }, naturalLayoutProposal);
        return { children: [] };
      },
    });

    let thrown: unknown;

    try {
      compileToScene(sceneOf({ namespace: 'test', type: 'discardHostileNestedProposal' }), {
        composites: [parent, nested],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RetikzCoreError);
    expect(thrown).toMatchObject({
      message: expect.stringMatching(/test\.hostileNestedProposal.*invalid proposal.*validation failed/i),
    });
  });

  it.each([
    {
      name: 'intrinsic',
      axis: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
    },
    {
      name: 'range',
      axis: { kind: LayoutAxisProposalKind.Range, min: 0, max: 10 },
    },
    {
      name: 'exact',
      axis: { kind: LayoutAxisProposalKind.Exact, value: 10 },
    },
  ])('在验证之前读取每个 $name 提案字段一次并将其分离', ({ axis }) => {
    const reads = new Map<PropertyKey, number>();
    const guardedAxis = new Proxy(axis, {
      get: (target, property, receiver) => {
        const count = (reads.get(property) ?? 0) + 1;
        reads.set(property, count);
        if (count > 1) throw new Error(`proposal field '${String(property)}' was read more than once`);

        return Reflect.get(target, property, receiver);
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: `singleRead${axis.kind}ProposalParent`,
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal(`singleRead${axis.kind}ProposalParent`),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          { type: 'coordinate', id: 'point', position: [0, 0] },
          { x: guardedAxis, y: naturalLayoutProposal.y },
        );

        expect(probe.kind).toBe(LayoutChildProbeKind.Resolved);

        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: `singleRead${axis.kind}ProposalParent` }), {
        composites: [parent],
      }),
    ).not.toThrow();
    expect([...reads.values()]).toEqual([...reads.values()].map(() => 1));
  });

  it('在子调度和槽解析之前保留显式零并规范化负零', () => {
    let received: LayoutProposal | undefined;
    const nested = defineComposite({
      namespace: 'test',
      type: 'zeroChild',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('zeroChild'),
      }),
      compile: (_, context) => {
        received = context.proposal;
        return { children: [] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'zeroParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('zeroParent'),
      }),
      artifactSchema: strictObject({ width: number(), height: number() }),
      compile: (_, context) => {
        const child = resolvedResultOf(
          context,
          { namespace: 'test', type: 'zeroChild' },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: -0 },
            y: { kind: LayoutAxisProposalKind.Range, min: -0, max: 0 },
          },
        );
        return { children: [], artifact: child.slotSize };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'zeroParent' }), {
      composites: [nested, parent],
    });

    expect(received).toEqual({
      x: { kind: 'exact', value: 0 },
      y: { kind: 'range', min: 0, max: 0 },
    });
    expect(Object.is(received?.x.kind === 'exact' ? received.x.value : undefined, -0)).toBe(false);
    expect(result.artifacts[0]?.value).toEqual({ width: 0, height: 0 });

    const size = result.artifacts[0]?.value;

    expect(Object.is(size.width, -0)).toBe(false);
    expect(Object.is(size.height, -0)).toBe(false);
  });

  it('当 layoutChild 依赖于稍后的外部参考时，会明确报错', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'forwardReference',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('forwardReference'),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: { id: 'later' } },
            ],
          },
          naturalLayoutProposal,
        );
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);

        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(
        sceneOf(
          { namespace: 'test', type: 'forwardReference' },
          {
            type: 'node',
            id: 'later',
            position: [20, 20],
            layout: { minimumSize: 10 },
          },
        ),
        { composites: [definition] },
      ),
    ).toThrow(/later|reference|not found|unresolved/i);
  });

  it('将普通错误和非错误抛出转换为不透明的可丢弃失败探测', () => {
    const ordinaryCause = new Error('ordinary child failure');
    const thrownValue = Object.freeze({ reason: 'non-error child failure' });
    const ordinary = defineComposite({
      namespace: 'test',
      type: 'ordinaryFailure',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('ordinaryFailure'),
      }),
      compile: () => {
        throw ordinaryCause;
      },
    });
    const nonError = defineComposite({
      namespace: 'test',
      type: 'nonErrorFailure',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('nonErrorFailure'),
      }),
      compile: () => {
        throw thrownValue;
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'discardFailures',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('discardFailures'),
      }),
      compile: (_, context) => {
        const probes = [
          context.layoutChild({ namespace: 'test', type: 'ordinaryFailure' }, naturalLayoutProposal),
          context.layoutChild({ namespace: 'test', type: 'nonErrorFailure' }, naturalLayoutProposal),
        ];

        for (const probe of probes) {
          expect(probe.kind).toBe(LayoutChildProbeKind.Failed);

          if (probe.kind === LayoutChildProbeKind.Failed) {
            expect(Object.keys(probe.failure)).toEqual([]);
            expect(Object.isFrozen(probe.failure)).toBe(true);
            expect(Object.isFrozen(probe)).toBe(true);
          }
        }

        return { children: [] };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'discardFailures' }), {
      composites: [ordinary, nonError, parent],
    });

    expect(result.scene.primitives).toEqual([]);
    expect(result.scene.resources ?? []).toEqual([]);
    expect(result.artifacts).toEqual([]);
  });

  it('保留 null 和 undefined 原因并在首次抛出时消费失败结果', () => {
    let invocation = 0;
    const leaf = defineComposite({
      namespace: 'test',
      type: 'rawCauseLeaf',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('rawCauseLeaf') }),
      compile: () => {
        invocation += 1;
        if (invocation === 1) throw null;
        throw undefined;
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'rawCauseParent',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('rawCauseParent') }),
      compile: (_, context) => {
        const causes: Array<unknown> = [];

        for (let index = 0; index < 2; index += 1) {
          const probe = context.layoutChild({ namespace: 'test', type: 'rawCauseLeaf' }, naturalLayoutProposal);
          if (probe.kind === LayoutChildProbeKind.Resolved) throw new Error('expected failed probe');

          try {
            context.raise(probe.failure);
          } catch (error) {
            causes.push((error as Error & { cause?: unknown }).cause);
          }

          expect(() => context.raise(probe.failure)).toThrow(/already.*raised|consum/i);
        }

        expect(causes).toEqual([null, undefined]);

        return { children: [] };
      },
    });

    compileToScene(sceneOf({ namespace: 'test', type: 'rawCauseParent' }), { composites: [leaf, parent] });
  });

  it('在探测器中未注册的复合组件返回失败，而不发布其警告', () => {
    const warnings: Array<CompileWarning> = [];
    const parent = defineComposite({
      namespace: 'test',
      type: 'unregisteredProbeParent',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('unregisteredProbeParent') }),
      compile: (_, context) => {
        const probe = context.layoutChild({ namespace: 'missing', type: 'leaf' }, naturalLayoutProposal);

        expect(probe.kind).toBe(LayoutChildProbeKind.Failed);
        return { children: [] };
      },
    });

    compileToScene(sceneOf({ namespace: 'test', type: 'unregisteredProbeParent' }), {
      composites: [parent],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toEqual([]);
  });

  it('schema 失败时对实际提供者及最深层嵌套 Scope 实例进行快照', () => {
    const leaf = defineComposite({
      namespace: 'test',
      type: 'deepSchemaLeaf',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('deepSchemaLeaf'),
        required: number(),
      }),
      compile: () => ({ children: [] }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'deepSchemaParent',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('deepSchemaParent') }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          {
            type: 'scope',
            children: [
              {
                type: 'scope',
                children: [{ namespace: 'test', type: 'deepSchemaLeaf' }],
              },
            ],
          },
          naturalLayoutProposal,
        );
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);

        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'deepSchemaParent' }), { composites: [leaf, parent] }),
    ).toThrow(/test\.deepSchemaLeaf.*scopeChild\[0\]::scopeChild\[0\]/i);
  });

  it('仅提升所选失败并保留提供者、来源、实例及原始原因', () => {
    const cause = new Error('selected candidate failed');
    const leaf = defineComposite({
      namespace: 'test',
      type: 'selectedFailureLeaf',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('selectedFailureLeaf'),
      }),
      compile: () => {
        throw cause;
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'selectedFailureParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('selectedFailureParent'),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          {
            type: 'scope',
            children: [{ namespace: 'test', type: 'selectedFailureLeaf' }],
          },
          naturalLayoutProposal,
        );
        if (probe.kind === LayoutChildProbeKind.Failed) context.raise(probe.failure);

        return { children: [] };
      },
    });

    let thrown: unknown;

    try {
      compileToScene(sceneOf({ namespace: 'test', type: 'selectedFailureParent' }), {
        composites: [leaf, parent],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toMatch(/test\.selectedFailureLeaf.*children\[0\].*scopeChild\[0\]/i);
    expect((thrown as Error & { cause?: unknown }).cause).toBe(cause);
  });

  it('拒绝伪造、复制、交叉回调、交叉编译失败', () => {
    let retained: LayoutChildFailure | undefined;
    let run = 0;
    const leaf = defineComposite({
      namespace: 'test',
      type: 'failureOwnerLeaf',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('failureOwnerLeaf') }),
      compile: () => {
        throw new Error('candidate failed');
      },
    });
    const producer = defineComposite({
      namespace: 'test',
      type: 'failureOwnerProducer',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('failureOwnerProducer') }),
      compile: (_, context) => {
        run += 1;
        if (run === 1) {
          const probe = context.layoutChild({ namespace: 'test', type: 'failureOwnerLeaf' }, naturalLayoutProposal);
          if (probe.kind === LayoutChildProbeKind.Failed) retained = probe.failure;
          return { children: [] };
        }

        return context.raise(retained!);
      },
    });
    const copied = defineComposite({
      namespace: 'test',
      type: 'copiedFailure',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('copiedFailure') }),
      compile: (_, context) => {
        const probe = context.layoutChild({ namespace: 'test', type: 'failureOwnerLeaf' }, naturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Resolved) return { children: [] };
        return context.raise({ ...probe.failure });
      },
    });
    const forged = defineComposite({
      namespace: 'test',
      type: 'forgedFailure',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('forgedFailure') }),
      compile: (_, context) => context.raise(Object.freeze({}) as LayoutChildFailure),
    });
    const foreign = defineComposite({
      namespace: 'test',
      type: 'foreignFailure',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('foreignFailure') }),
      compile: (_, context) => context.raise(retained!),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'copiedFailure' }), { composites: [leaf, copied] }),
    ).toThrow(/failure.*forged|does not belong|callback/i);
    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'forgedFailure' }), { composites: [forged] }),
    ).toThrow(/failure.*forged|does not belong/i);
    expect(() =>
      compileToScene(
        sceneOf({ namespace: 'test', type: 'failureOwnerProducer' }, { namespace: 'test', type: 'foreignFailure' }),
        { composites: [leaf, producer, foreign] },
      ),
    ).toThrow(/failure.*callback|does not belong/i);
    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'failureOwnerProducer' }), { composites: [leaf, producer] }),
    ).toThrow(/failure.*compile|forged|does not belong/i);
  });

  it('让带有标识的 Core 不变量穿透探测捕获边界', () => {
    const invariant = createCompileInvariantError('forced namespace invariant');

    expect(invariant).toBeInstanceOf(RetikzError);
    expect(invariant).toMatchObject({
      name: 'RetikzCoreError',
      code: RetikzCoreErrorCode.CompileInvariantViolation,
    });

    const diff = vi.spyOn(NamespaceStack.prototype, 'diffTopFrame').mockImplementation(() => {
      throw invariant;
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'fatalInvariantParent',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('fatalInvariantParent') }),
      compile: (_, context) => {
        context.layoutChild({ type: 'coordinate', id: 'invariant', position: [0, 0] }, naturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'fatalInvariantParent' }), { composites: [parent] }),
    ).toThrow(invariant);

    diff.mockRestore();
  });

  it('通过真实的 layoutChild 捕获边界达到带有标识的 Runtime 拓扑不变量', () => {
    const parent = defineComposite({
      namespace: 'test',
      type: 'compileProvenanceInvariantParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('compileProvenanceInvariantParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ type: 'scope', localNamespace: true, children: [] }, naturalLayoutProposal);
        return { children: [] };
      },
    });
    const ir = sceneOf({ namespace: 'test', type: 'compileProvenanceInvariantParent' });
    const outer = compileProvenance.createCompileProvenanceTracker();
    const actual = compileProvenance.createCompileProvenanceTracker();
    const broken = Object.freeze({
      ...actual,
      popNamespaceFrame: () => {
        actual.popNamespaceFrame();
        actual.popNamespaceFrame();
      },
    });
    const createProbeTracker = vi.spyOn(compileProvenance, 'createCompileProvenanceTracker').mockReturnValue(broken);
    const context = createFullCompileContext(ir, { composites: [parent] });

    expect(() => compileChildrenToPrimitives(ir.children, context, { provenanceTracker: outer })).toThrow(
      RetikzCoreError,
    );

    createProbeTracker.mockRestore();
  });

  it('不会将无效的 layoutChild 判别字段降级为失败的探测', () => {
    const parent = defineComposite({
      namespace: 'test',
      type: 'invalidLayoutChildDiscriminatorParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('invalidLayoutChildDiscriminatorParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ type: 'invalidLayoutChild' } as IRChild, naturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'invalidLayoutChildDiscriminatorParent' }), {
        composites: [parent],
      }),
    ).toThrow(RetikzCoreError);
  });

  it('在可恢复调度边界之前拒绝访问器支持的 layoutChild 输入', () => {
    const hostileChild: Record<string, unknown> = { id: 'point', position: [0, 0] };
    Object.defineProperty(hostileChild, 'type', {
      enumerable: true,
      get: () => 'coordinate',
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileLayoutChildParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('hostileLayoutChildParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(hostileChild as IRChild, naturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileLayoutChildParent' }), {
        composites: [parent],
      }),
    ).toThrow(RetikzCoreError);
  });

  it('拒绝变换后的边变成非有限的自动分配边界', () => {
    const parent = defineComposite({
      namespace: 'test',
      type: 'nonFiniteAutomaticAllocationParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('nonFiniteAutomaticAllocationParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'scope',
            transforms: [{ kind: 'scale', x: 2 }],
            children: [{ type: 'coordinate', id: 'far', position: [Number.MAX_VALUE, 0] }],
          },
          naturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'nonFiniteAutomaticAllocationParent' }), {
        composites: [parent],
      }),
    ).toThrow(RetikzCoreError);
  });

  it('不会将格式错误的嵌套复合输出降级为失败的探测', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'malformedProbeChild',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('malformedProbeChild') }),
      compile: () => ({ children: undefined as unknown as Array<IRChild> }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'malformedProbeParent',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('malformedProbeParent') }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'malformedProbeChild' }, naturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'malformedProbeParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(/malformedProbeChild.*children|invalid.*children/i);
  });

  it('在验证和提交之前对动态复合结果字段进行快照', () => {
    let childrenReads = 0;
    const result = new Proxy(
      { children: [{ type: 'node', position: [0, 0] }] as Array<IRChild> },
      {
        get: (target, property, receiver) => {
          if (property === 'children') {
            childrenReads += 1;
            return childrenReads === 1 ? target.children : {};
          }

          return Reflect.get(target, property, receiver);
        },
      },
    );
    const definition = defineComposite({
      namespace: 'test',
      type: 'dynamicCompileResult',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('dynamicCompileResult'),
      }),
      compile: () => result,
    });

    const compiled = compileToScene(sceneOf({ namespace: 'test', type: 'dynamicCompileResult' }), {
      composites: [definition],
    });

    expect(compiled.scene.primitives.some(primitive => primitive.type === 'rect')).toBe(true);
    expect(childrenReads).toBe(1);
  });

  it('不会将稀疏嵌套复合子数组降级为失败的探测', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'sparseProbeChildren',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('sparseProbeChildren') }),
      compile: () => ({ children: Array<IRChild>(1) }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'sparseProbeChildrenParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('sparseProbeChildrenParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'sparseProbeChildren' }, naturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'sparseProbeChildrenParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(RetikzCoreError);
  });

  it('不会将无效的嵌套复合输出子级降级为失败的探测器', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'invalidOutputChild',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('invalidOutputChild') }),
      compile: () => ({ children: [{ type: 'bogus' } as IRChild] }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'invalidOutputChildParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('invalidOutputChildParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'invalidOutputChild' }, naturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'invalidOutputChildParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(/invalidOutputChild.*output child.*index 0/i);
  });

  it('不会将恶意嵌套复合结果反射降级为失败的探测', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'hostileCallbackResult',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('hostileCallbackResult') }),
      compile: () =>
        new Proxy(
          { children: [] },
          {
            has: () => {
              throw new Error('hostile callback result reflection');
            },
          },
        ),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileCallbackResultParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('hostileCallbackResultParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'hostileCallbackResult' }, naturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileCallbackResultParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(RetikzCoreError);
  });

  it('不会将回放包装器访问错误降级为失败的探测', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'hostileReplayWrapper',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('hostileReplayWrapper') }),
      compile: (_, context) => {
        const probe = context.layoutChild({ type: 'coordinate', id: 'point', position: [0, 0] }, naturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);

        const wrapper = new Proxy(
          {},
          {
            get: () => {
              throw new Error('hostile replay wrapper read');
            },
          },
        );

        return { children: [context.replay(probe.result, wrapper)] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileReplayWrapperParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('hostileReplayWrapperParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'hostileReplayWrapper' }, naturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileReplayWrapperParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(RetikzCoreError);
  });

  it('在验证之前读取一次回放包装裁剪并将其分离', () => {
    let clipReads = 0;
    const wrapper: Record<string, unknown> = {};
    Object.defineProperty(wrapper, 'clip', {
      enumerable: true,
      get: () => {
        clipReads += 1;
        return { kind: 'rect', params: { x: 0, y: 0, width: 10, height: 10 } };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'dynamicReplayWrapperClipParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('dynamicReplayWrapperClipParent'),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild({ type: 'coordinate', id: 'point', position: [0, 0] }, naturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: [context.replay(probe.result, wrapper)] };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'dynamicReplayWrapperClipParent' }), {
      composites: [parent],
    });

    expect(result.scene.resources?.filter(resource => resource.kind === 'clip')).toHaveLength(1);
    expect(clipReads).toBe(1);
  });

  it('不会降级敌对嵌套运行时 Scope props 反射到失败的探测器', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'hostileRuntimeScopeProps',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('hostileRuntimeScopeProps'),
      }),
      compile: (_, context) => {
        const props = new Proxy(
          {},
          {
            ownKeys: () => {
              throw new Error('hostile runtime Scope props reflection');
            },
          },
        );
        return { children: [context.createScope(props, [])] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileRuntimeScopePropsParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('hostileRuntimeScopePropsParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'hostileRuntimeScopeProps' }, naturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileRuntimeScopePropsParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(RetikzCoreError);
  });

  it('不会将稀疏嵌套运行时 Scope 子级降级为失败的探测', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'sparseRuntimeScopeChildren',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('sparseRuntimeScopeChildren'),
      }),
      compile: (_, context) => ({ children: [context.createScope({}, Array<IRChild>(1))] }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'sparseRuntimeScopeChildrenParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('sparseRuntimeScopeChildrenParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'sparseRuntimeScopeChildren' }, naturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'sparseRuntimeScopeChildrenParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(RetikzCoreError);
  });

  it('在现有调度路径上保留详细的扩展子编译', () => {
    const expanded = defineComposite({
      namespace: 'test',
      type: 'singleRectangleExpand',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('singleRectangleExpand'),
      }),
      compile: () => ({
        children: [
          {
            type: 'path',
            children: [{ type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 6] }],
          },
        ],
      }),
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'singleRectangleExpand' }), {
      composites: [expanded],
    });

    expect(result.scene.primitives).toEqual([
      expect.objectContaining({
        type: 'path',
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [10, 0] },
          { kind: 'line', to: [10, 6] },
          { kind: 'line', to: [0, 6] },
          { kind: 'close' },
        ],
      }),
    ]);
  });

  it.each([{ variant: 'invalidChild' as const }, { variant: 'hostileArray' as const }])(
    '不会将 $variant 复合输出降级为故障探测',
    ({ variant }) => {
      const expanded = defineComposite({
        namespace: 'test',
        type: `malformedExpand${variant}`,
        schema: CompositeBaseSchema.extend({
          namespace: literal('test'),
          type: literal(`malformedExpand${variant}`),
        }),
        compile: () =>
          variant === 'invalidChild'
            ? ({ children: [{ type: 'bogus' } as IRChild] } as never)
            : ({
                children: new Proxy(
                  [{ type: 'coordinate' as const, id: 'point', position: [0, 0] as [number, number] }],
                  {
                    get: (target, property, receiver) => {
                      if (property === '0') throw new Error('hostile composite output access');
                      return Reflect.get(target, property, receiver);
                    },
                  },
                ),
              } as never),
      });
      const parent = defineComposite({
        namespace: 'test',
        type: `malformedExpand${variant}Parent`,
        schema: CompositeBaseSchema.extend({
          namespace: literal('test'),
          type: literal(`malformedExpand${variant}Parent`),
        }),
        compile: (_, context) => {
          context.layoutChild({ namespace: 'test', type: `malformedExpand${variant}` }, naturalLayoutProposal);
          return { children: [] };
        },
      });

      expect(() =>
        compileToScene(sceneOf({ namespace: 'test', type: `malformedExpand${variant}Parent` }), {
          composites: [expanded, parent],
        }),
      ).toThrow(RetikzCoreError);
    },
  );

  it('让格式错误的提供者几何图形和文本度量刺穿探测捕获边界', () => {
    const malformedShape = defineShape({
      name: 'malformedProbeShape',
      paramsSchema: strictObject({}),
      computeCircumscribedGeometry: () => ({ halfWidth: Number.NaN, halfHeight: 1 }),
      computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
      emit: BUILTIN_SHAPES.get('rectangle')!.emit,
    });
    const shapeParent = defineComposite({
      namespace: 'test',
      type: 'malformedShapeParent',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('malformedShapeParent') }),
      compile: (_, context) => {
        context.layoutChild(
          { type: 'node', position: [0, 0], shape: { type: 'malformedProbeShape', params: {} } },
          naturalLayoutProposal,
        );
        return { children: [] };
      },
    });
    const metricsParent = defineComposite({
      namespace: 'test',
      type: 'malformedMetricsParent',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('malformedMetricsParent') }),
      compile: (_, context) => {
        context.layoutChild({ type: 'node', position: [0, 0], text: 'bad metrics' }, naturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'malformedShapeParent' }), {
        composites: [shapeParent],
        shapes: [malformedShape],
      }),
    ).toThrow(/malformedProbeShape.*circumscribe/i);
    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'malformedMetricsParent' }), {
        composites: [metricsParent],
        measureText: () => ({ width: Number.NaN, height: 10 }),
      }),
    ).toThrow(/resolveTextMetrics.*width/i);
  });

  it.each([
    {
      variant: 'plainBody' as const,
      child: { type: 'node' as const, position: [0, 0] as [number, number], text: 'plain body' },
    },
    {
      variant: 'mixedBody' as const,
      child: {
        type: 'node' as const,
        position: [0, 0] as [number, number],
        text: [{ segments: [{ text: 'mixed body' }] }],
      },
    },
    {
      variant: 'mixedLabel' as const,
      child: {
        type: 'node' as const,
        position: [0, 0] as [number, number],
        label: { text: [{ segments: [{ text: 'mixed label' }] }], position: 'center' as const },
      },
    },
    {
      variant: 'plainPathLabel' as const,
      child: {
        type: 'path' as const,
        children: [
          { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
          {
            type: 'step' as const,
            kind: 'line' as const,
            to: [20, 0] as [number, number],
            label: { text: 'plain path label' },
          },
        ],
      },
    },
  ])('丢弃探测结果时 $variant 中恶意 measureText 输出仍为致命错误', ({ variant, child }) => {
    const parent = defineComposite({
      namespace: 'test',
      type: `hostileMetrics${variant}Parent`,
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal(`hostileMetrics${variant}Parent`),
      }),
      compile: (_, context) => {
        context.layoutChild(child, naturalLayoutProposal);
        return { children: [] };
      },
    });
    const measureText: TextMeasurer = () =>
      new Proxy(
        { width: 10, height: 10, ascent: 8, descent: 2 },
        {
          ownKeys: () => {
            throw new Error(`hostile ${variant} metrics reflection`);
          },
        },
      );

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: `hostileMetrics${variant}Parent` }), {
        composites: [parent],
        measureText,
      }),
    ).toThrow(RetikzCoreError);
  });

  it.each([
    { variant: 'hostileBodyRoot' as const },
    { variant: 'invalidBodyCommand' as const },
    { variant: 'invalidBodyPaint' as const },
    { variant: 'invalidLabelMetrics' as const },
  ])('将畸形的 lowerTex 输出保留在废弃探测内，对于 $variant 来说是致命的', ({ variant }) => {
    const parent = defineComposite({
      namespace: 'test',
      type: `malformedTex${variant}Parent`,
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal(`malformedTex${variant}Parent`),
      }),
      compile: (_, context) => {
        const child: IRChild =
          variant === 'invalidLabelMetrics'
            ? {
                type: 'node',
                position: [0, 0],
                label: { text: [{ segments: [{ tex: 'x' }] }], position: 'center' },
              }
            : {
                type: 'node',
                position: [0, 0],
                text: [{ segments: [{ tex: 'x' }] }],
              };
        context.layoutChild(child, naturalLayoutProposal);

        return { children: [] };
      },
    });

    const lowerTex: TexLowerer = () => {
      if (variant === 'hostileBodyRoot') {
        return new Proxy(
          { paths: [], width: 10, height: 10, depth: 2 },
          {
            ownKeys: () => {
              throw new Error('hostile lowerTex root reflection');
            },
          },
        );
      }

      if (variant === 'invalidLabelMetrics') return { paths: [], width: -1, height: 10, depth: 2 };

      return {
        paths: [
          {
            commands:
              variant === 'invalidBodyCommand'
                ? ([{ kind: 'line', to: [Number.NaN, 0] }] as never)
                : [{ kind: 'move', to: [0, 0] }],
            fill:
              variant === 'invalidBodyPaint' ? ({ kind: 'unsupported' } as never) : ({ kind: 'currentColor' } as const),
            stroke: { kind: 'none' },
          },
        ],
        width: 10,
        height: 10,
        depth: 2,
      };
    };

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: `malformedTex${variant}Parent` }), {
        composites: [parent],
        lowerTex,
      }),
    ).toThrow(RetikzCoreError);
  });

  it.each(['measureText', 'lowerTex'] as const)('保持普通 %s 执行抛出可恢复', provider => {
    const parent = defineComposite({
      namespace: 'test',
      type: `throwing${provider}Parent`,
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal(`throwing${provider}Parent`),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          {
            type: 'node',
            position: [0, 0],
            text: provider === 'measureText' ? 'plain' : [{ segments: [{ tex: 'x' }] }],
          },
          naturalLayoutProposal,
        );

        expect(probe.kind).toBe(LayoutChildProbeKind.Failed);

        return { children: [] };
      },
    });
    const options =
      provider === 'measureText'
        ? {
            composites: [parent],
            measureText: (): never => {
              throw new Error('ordinary measureText execution failure');
            },
          }
        : {
            composites: [parent],
            lowerTex: (): never => {
              throw new Error('ordinary lowerTex execution failure');
            },
          };

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: `throwing${provider}Parent` }), options),
    ).not.toThrow();
  });

  it('在废弃探测内保持敌对形状限制输出反射致命', () => {
    const reflectionFailure = new Error('hostile circumscribe reflection');
    const hostileShape = defineShape({
      name: 'hostileCircumscribeShape',
      paramsSchema: strictObject({}),
      computeCircumscribedGeometry: () =>
        new Proxy(
          { halfWidth: 10, halfHeight: 10 },
          {
            get: () => {
              throw reflectionFailure;
            },
          },
        ),
      computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
      emit: BUILTIN_SHAPES.get('rectangle')!.emit,
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileCircumscribeParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('hostileCircumscribeParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          { type: 'node', position: [0, 0], shape: { type: 'hostileCircumscribeShape', params: {} } },
          naturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileCircumscribeParent' }), {
        composites: [parent],
        shapes: [hostileShape],
      }),
    ).toThrow(expect.objectContaining({ cause: reflectionFailure }));
  });

  it.each([
    { variant: 'boundaryPoint' as const, anchor: undefined },
    { variant: 'shapeAnchor' as const, anchor: 'right' as const },
    { variant: 'shapeEdgePoint' as const, anchor: { side: 'top' as const, fraction: 0.5 } },
    { variant: 'boundaryAnchor' as const, anchor: 'right' as const },
  ])('将敌对的 $variant 输出反射致命保留在废弃的探测内', ({ variant, anchor }) => {
    const hostilePoint = () =>
      new Proxy([10, 0] as [number, number], {
        get: () => {
          throw new Error(`hostile ${variant} reflection`);
        },
      });
    const hostileShape = defineShape({
      name: 'hostilePointShape',
      paramsSchema: strictObject({}),
      computeCircumscribedGeometry: BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry,
      computeBoundaryPoint:
        variant === 'boundaryPoint' ? hostilePoint : BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: variant === 'shapeAnchor' ? hostilePoint : BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
      computeEdgePoint: variant === 'shapeEdgePoint' ? hostilePoint : BUILTIN_SHAPES.get('rectangle')!.computeEdgePoint,
      emit: BUILTIN_SHAPES.get('rectangle')!.emit,
    });
    const hostileBoundary = defineBoundary({
      name: 'hostilePointBoundary',
      paramsSchema: strictObject({}),
      computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: variant === 'boundaryAnchor' ? hostilePoint : BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
    });
    const parent = defineComposite({
      namespace: 'test',
      type: `hostile${variant}Parent`,
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal(`hostile${variant}Parent`),
      }),
      compile: (_, context) => {
        const target = {
          id: 'target',
          ...(anchor === undefined ? {} : { anchor }),
          ...(variant === 'boundaryAnchor' ? { boundary: 'hostilePointBoundary' } : {}),
        };
        context.layoutChild(
          {
            type: 'scope',
            children: [
              {
                type: 'node',
                id: 'target',
                position: [0, 0],
                shape: { type: 'hostilePointShape', params: {} },
              },
              {
                type: 'path',
                children: [
                  { type: 'step', kind: 'move', to: [100, 0] },
                  { type: 'step', kind: 'line', to: target },
                ],
              },
            ],
          },
          naturalLayoutProposal,
        );

        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: `hostile${variant}Parent` }), {
        composites: [parent],
        shapes: [hostileShape],
        boundaries: [hostileBoundary],
      }),
    ).toThrow(RetikzCoreError);
  });

  it('在废弃探测内保持敌对形状 scaleParams 输出反射致命', () => {
    const hostileShape = defineShape({
      name: 'hostileScaleParamsShape',
      paramsSchema: strictObject({ radius: number() }),
      scaleParams: () =>
        new Proxy(
          { radius: 10 },
          {
            ownKeys: () => {
              throw new Error('hostile scaleParams reflection');
            },
          },
        ),
      computeCircumscribedGeometry: BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry,
      computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
      emit: BUILTIN_SHAPES.get('rectangle')!.emit,
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileScaleParamsParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('hostileScaleParamsParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'node',
            position: [0, 0],
            scale: 2,
            shape: { type: 'hostileScaleParamsShape', params: { radius: 5 } },
          },
          naturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileScaleParamsParent' }), {
        composites: [parent],
        shapes: [hostileShape],
      }),
    ).toThrow(RetikzCoreError);
  });

  it.each([
    { variant: 'connectionEnvelope' as const, boundary: 'circle' },
    { variant: 'resolveRect' as const, boundary: 'hostileRectBoundary' },
  ])('将敌对的 $variant 输出反射致命保留在废弃的探测内', ({ variant, boundary }) => {
    const hostileEnvelopeShape = defineShape({
      name: 'hostileEnvelopeShape',
      paramsSchema: strictObject({}),
      computeCircumscribedGeometry: BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry,
      computeConnectionEnvelope: () =>
        new Proxy(
          { halfWidth: 10, halfHeight: 10 },
          {
            get: () => {
              throw new Error('hostile connection envelope reflection');
            },
          },
        ),
      computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
      emit: BUILTIN_SHAPES.get('rectangle')!.emit,
    });
    const hostileBoundary = defineBoundary({
      name: 'hostileRectBoundary',
      paramsSchema: strictObject({}),
      resolveRect: context =>
        new Proxy(context.visualRect, {
          get: () => {
            throw new Error('hostile boundary rect reflection');
          },
        }),
      computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
    });
    const parent = defineComposite({
      namespace: 'test',
      type: `hostile${variant}Parent`,
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal(`hostile${variant}Parent`),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'scope',
            children: [
              {
                type: 'node',
                id: 'target',
                position: [0, 0],
                shape: { type: 'hostileEnvelopeShape', params: {} },
                boundary,
              },
              {
                type: 'path',
                children: [
                  { type: 'step', kind: 'move', to: [100, 0] },
                  { type: 'step', kind: 'line', to: { id: 'target' } },
                ],
              },
            ],
          },
          naturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: `hostile${variant}Parent` }), {
        composites: [parent],
        shapes: [hostileEnvelopeShape],
        boundaries: [hostileBoundary],
      }),
    ).toThrow(RetikzCoreError);
  });

  it('将恶意的 BuiltinPath 编译输出反射致命保留在废弃的探测内', () => {
    const hostilePath = definePath({
      name: 'hostilePath',
      schema: PathSchema.extend({ kind: literal('hostilePath') }),
      compile: () =>
        new Proxy(
          { primitives: [], boundsPoints: [] },
          {
            get: () => {
              throw new Error('hostile path result reflection');
            },
          },
        ),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostilePathParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('hostilePathParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'path',
            kind: 'hostilePath',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
          naturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostilePathParent' }), {
        composites: [parent],
        paths: [hostilePath],
      }),
    ).toThrow(RetikzCoreError);
  });

  it('在验证和布局发布之前快照动态 BuiltinPath 边界点', () => {
    let boundsPointsReads = 0;
    let xReads = 0;
    const point = new Proxy([10, 0] as [number, number], {
      get: (target, property, receiver) => {
        if (property === '0') {
          xReads += 1;
          return xReads <= 2 ? 10 : Number.NaN;
        }

        return Reflect.get(target, property, receiver);
      },
    });
    const result = new Proxy(
      { primitives: [], boundsPoints: [point] },
      {
        get: (target, property, receiver) => {
          if (property === 'boundsPoints') {
            boundsPointsReads += 1;
            return boundsPointsReads === 1 ? target.boundsPoints : [];
          }

          return Reflect.get(target, property, receiver);
        },
      },
    );
    const dynamicPath = definePath({
      name: 'dynamicPath',
      schema: PathSchema.extend({ kind: literal('dynamicPath') }),
      compile: () => result,
    });

    const compiled = compileToScene(
      sceneOf({
        type: 'path',
        kind: 'dynamicPath',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      }),
      { paths: [dynamicPath] },
    );

    expect(compiled.scene.layout).toMatchObject({ width: 20, height: 20 });
    expect({ boundsPointsReads, xReads }).toEqual({ boundsPointsReads: 1, xReads: 1 });
  });

  it('让无效的提供者几何体和裁剪语法刺穿废弃的探测', () => {
    const badShape = defineShape({
      name: 'badEmitShape',
      paramsSchema: strictObject({}),
      computeCircumscribedGeometry: BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry,
      computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
      emit: (() => [{ type: 'rect', x: 0, y: 0, width: -1, height: 2 }]) as unknown as () => Iterable<ScenePrimitive>,
    });
    const badArrow = defineArrow({
      name: 'badEmitArrow',
      backX: 0,
      lineContactX: 0,
      emit: (() => [{ type: 'rect', x: 0, y: 0, width: -1, height: 2 }]) as unknown as () => Iterable<ScenePrimitive>,
    });
    const badPattern = definePattern({
      name: 'badEmitPattern',
      emit: (() => [
        { type: 'group', children: [{ type: 'rect', x: 0, y: 0, width: NaN, height: 2 }] },
      ]) as unknown as () => Iterable<ScenePrimitive>,
    });
    const badClip = defineClip({
      kind: 'badResolvedClip',
      schema: strictObject({ kind: literal('badResolvedClip'), params: strictObject({}) }),

      lower: () => {
        return {
          commands: [{ kind: 'line', to: [1, 1] }],
          fillRule: 'nonzero',
        };
      },
    });

    const parent = defineComposite({
      namespace: 'test',
      type: 'malformedProviderParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('malformedProviderParent'),
        variant: zodEnum(['shape', 'arrow', 'pattern', 'clip']),
      }),
      compile: (value, context) => {
        const child: IRChild =
          value.variant === 'shape'
            ? { type: 'node', position: [0, 0], shape: { type: 'badEmitShape', params: {} } }
            : value.variant === 'arrow'
              ? {
                  type: 'path',
                  arrow: pathArrows('->', { shape: 'badEmitArrow' }),
                  children: [
                    { type: 'step', kind: 'move', to: [0, 0] },
                    { type: 'step', kind: 'line', to: [10, 0] },
                  ],
                }
              : value.variant === 'pattern'
                ? {
                    type: 'node',
                    position: [0, 0],
                    style: { fill: { kind: 'pattern', shape: 'badEmitPattern' } },
                  }
                : {
                    type: 'scope',
                    clip: { kind: 'badResolvedClip', params: {} } as never,
                    children: [{ type: 'node', position: [0, 0] }],
                  };
        context.layoutChild(child, naturalLayoutProposal);

        return { children: [] };
      },
    });
    const options = {
      composites: [parent],
      shapes: [badShape],
      arrows: [badArrow],
      patterns: [badPattern],
      clips: [badClip],
    };

    for (const variant of ['shape', 'arrow', 'pattern', 'clip'] as const) {
      expect(
        () => compileToScene(sceneOf({ namespace: 'test', type: 'malformedProviderParent', variant }), options),
        variant,
      ).toThrow(/emit|primitive|invalid|root shape|path command|output validation|subpath/i);
    }
  });

  it('让格式错误的字体、阴影和循环提供者树刺穿废弃的探测', () => {
    const invalidText = (overrides: Record<string, unknown>): ScenePrimitive =>
      ({
        type: 'text',
        x: 0,
        y: 0,
        lines: [{ text: 'bad' }],
        fontSize: 12,
        align: 'start',
        baseline: 'alphabetic',
        lineHeight: 14,
        measuredWidth: 20,
        measuredHeight: 14,
        ...overrides,
      }) as unknown as ScenePrimitive;
    const invalidShadowRect = (shadow: unknown): ScenePrimitive =>
      ({ type: 'rect', x: 0, y: 0, width: 1, height: 1, shadow }) as unknown as ScenePrimitive;
    const cyclicSceneGroup: { type: 'group'; children: Array<ScenePrimitive> } = {
      type: 'group',
      children: [],
    };
    cyclicSceneGroup.children.push(cyclicSceneGroup);
    const shapeOutputs = new Map<string, ScenePrimitive>([
      ['fontFamilyFunctionShape', invalidText({ fontFamily: () => 'sans-serif' })],
      ['fontWeightObjectShape', invalidText({ fontWeight: {} })],
      ['fontWeightInfinityShape', invalidText({ fontWeight: Number.POSITIVE_INFINITY })],
      ['shadowMissingOffsetXShape', invalidShadowRect({ offsetY: 0, color: '#000' })],
      ['shadowMissingOffsetYShape', invalidShadowRect({ offsetX: 0, color: '#000' })],
      ['shadowMissingColorShape', invalidShadowRect({ offsetX: 0, offsetY: 0 })],
      ['shadowNegativeBlurShape', invalidShadowRect({ offsetX: 0, offsetY: 0, color: '#000', blur: -1 })],
      ['shadowOpacityHighShape', invalidShadowRect({ offsetX: 0, offsetY: 0, color: '#000', opacity: 2 })],
      ['cyclicSceneGroupShape', cyclicSceneGroup],
    ]);
    const badShapes = [...shapeOutputs].map(([name, primitive]) =>
      defineShape({
        name,
        paramsSchema: strictObject({}),
        computeCircumscribedGeometry: BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry,
        computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
        resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
        emit: () => [primitive],
      }),
    );
    const cyclicMarkerGroup: { type: 'group'; children: Array<ScenePrimitive> } = {
      type: 'group',
      children: [],
    };
    cyclicMarkerGroup.children.push(cyclicMarkerGroup);
    const cyclicArrow = defineArrow({
      name: 'cyclicMarkerArrow',
      backX: 0,
      lineContactX: 0,
      emit: () => [cyclicMarkerGroup],
    });
    const cyclicCommands: Array<unknown> = [];
    cyclicCommands.push(cyclicCommands);
    const cyclicClip = defineClip({
      kind: 'cyclicCompoundClip',
      schema: strictObject({ kind: literal('cyclicCompoundClip'), params: strictObject({}) }),

      lower: () => ({ commands: cyclicCommands, fillRule: 'nonzero' }) as unknown as SceneClipPath,
    });
    const variants = [
      'fontFamilyFunctionShape',
      'fontWeightObjectShape',
      'fontWeightInfinityShape',
      'shadowMissingOffsetXShape',
      'shadowMissingOffsetYShape',
      'shadowMissingColorShape',
      'shadowNegativeBlurShape',
      'shadowOpacityHighShape',
      'cyclicSceneGroupShape',
      'cyclicMarkerArrow',
      'cyclicCompoundClip',
    ] as const;
    const parent = defineComposite({
      namespace: 'test',
      type: 'malformedRecursiveProviderParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('malformedRecursiveProviderParent'),
        variant: zodEnum(variants),
      }),
      compile: (value, context) => {
        const child: IRChild =
          value.variant === 'cyclicMarkerArrow'
            ? {
                type: 'path',
                arrow: pathArrows('->', { shape: 'cyclicMarkerArrow' }),
                children: [
                  { type: 'step', kind: 'move', to: [0, 0] },
                  { type: 'step', kind: 'line', to: [10, 0] },
                ],
              }
            : value.variant === 'cyclicCompoundClip'
              ? {
                  type: 'scope',
                  clip: { kind: 'cyclicCompoundClip', params: {} } as never,
                  children: [{ type: 'node', position: [0, 0] }],
                }
              : {
                  type: 'node',
                  position: [0, 0],
                  shape: { type: value.variant, params: {} },
                };
        context.layoutChild(child, naturalLayoutProposal);

        return { children: [] };
      },
    });
    const options = {
      composites: [parent],
      shapes: badShapes,
      arrows: [cyclicArrow],
      clips: [cyclicClip],
    };

    for (const variant of variants) {
      expect(() =>
        compileToScene(sceneOf({ namespace: 'test', type: 'malformedRecursiveProviderParent', variant }), options),
      ).toThrow(/emit|invalid|cyclic|root shape/i);
    }
  });

  it('拒绝丢弃的探测中的有损动画轨道和符号键控提供者输出', () => {
    const validTrack = (): Record<PropertyKey, unknown> => ({
      property: 'opacity',
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 1 },
      ],
      duration: 100,
    });
    const functionTrack = validTrack();
    functionTrack.extra = () => 'not JSON';
    const cyclicTrack = validTrack();
    cyclicTrack.self = cyclicTrack;
    const animatedRect = (track: Record<PropertyKey, unknown>): ScenePrimitive =>
      ({
        type: 'rect',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        animations: [track],
      }) as unknown as ScenePrimitive;
    const symbolShapeRect: Record<PropertyKey, unknown> = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    };
    symbolShapeRect[Symbol('shape-hidden-function')] = () => 'hidden';
    const shapeOutputs = new Map<string, ScenePrimitive>([
      ['animationFunctionShape', animatedRect(functionTrack)],
      ['animationCycleShape', animatedRect(cyclicTrack)],
      ['symbolKeyShape', symbolShapeRect as unknown as ScenePrimitive],
    ]);
    const badShapes = [...shapeOutputs].map(([name, primitive]) =>
      defineShape({
        name,
        paramsSchema: strictObject({}),
        computeCircumscribedGeometry: BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry,
        computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
        resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
        emit: () => [primitive],
      }),
    );
    const symbolMarker: Record<PropertyKey, unknown> = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    };
    symbolMarker[Symbol('marker-hidden-function')] = () => 'hidden';
    const badArrow = defineArrow({
      name: 'symbolKeyMarkerArrow',
      backX: 0,
      lineContactX: 0,
      emit: () => [symbolMarker as unknown as ScenePrimitive],
    });
    const symbolClipPath = {
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [1, 1] },
      ],
      fillRule: 'nonzero',
      [Symbol('clip-hidden-function')]: () => 'hidden',
    };
    const badClip = defineClip({
      kind: 'symbolKeyClip',
      schema: strictObject({ kind: literal('symbolKeyClip'), params: strictObject({}) }),

      lower: () => symbolClipPath as unknown as SceneClipPath,
    });
    const variants = [
      'animationFunctionShape',
      'animationCycleShape',
      'symbolKeyShape',
      'symbolKeyMarkerArrow',
      'symbolKeyClip',
    ] as const;
    const parent = defineComposite({
      namespace: 'test',
      type: 'strictProviderOutputParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('strictProviderOutputParent'),
        variant: zodEnum(variants),
      }),
      compile: (value, context) => {
        const child: IRChild =
          value.variant === 'symbolKeyMarkerArrow'
            ? {
                type: 'path',
                arrow: pathArrows('->', { shape: 'symbolKeyMarkerArrow' }),
                children: [
                  { type: 'step', kind: 'move', to: [0, 0] },
                  { type: 'step', kind: 'line', to: [10, 0] },
                ],
              }
            : value.variant === 'symbolKeyClip'
              ? {
                  type: 'scope',
                  clip: { kind: 'symbolKeyClip', params: {} } as never,
                  children: [{ type: 'node', position: [0, 0] }],
                }
              : {
                  type: 'node',
                  position: [0, 0],
                  shape: { type: value.variant, params: {} },
                };
        context.layoutChild(child, naturalLayoutProposal);

        return { children: [] };
      },
    });
    const options = {
      composites: [parent],
      shapes: badShapes,
      arrows: [badArrow],
      clips: [badClip],
    };

    for (const variant of variants) {
      expect(() =>
        compileToScene(sceneOf({ namespace: 'test', type: 'strictProviderOutputParent', variant }), options),
      ).toThrow(/animation|cyclic|invalid|non-JSON|symbol|unsupported/i);
    }
  });

  it('将返回的 Scene 和标记代理陷阱分类为致命输出违规', () => {
    const hostileThrown = Proxy.revocable({}, {});
    hostileThrown.revoke();
    const sceneTrap = hostileThrown.proxy;
    const sceneProxy = new Proxy(
      { type: 'rect', x: 0, y: 0, width: 1, height: 1 },
      {
        ownKeys: () => {
          throw sceneTrap;
        },
      },
    );
    const proxyShape = defineShape({
      name: 'proxyTrapShape',
      paramsSchema: strictObject({}),
      computeCircumscribedGeometry: BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry,
      computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
      emit: () => [sceneProxy as unknown as ScenePrimitive],
    });
    const markerTrap = new Error('marker iterator trap');
    const markerIterable = {
      [Symbol.iterator]: (): Iterator<ScenePrimitive> => ({
        next: () => {
          throw markerTrap;
        },
      }),
    };
    const proxyArrow = defineArrow({
      name: 'proxyTrapArrow',
      backX: 0,
      lineContactX: 0,
      emit: () => markerIterable,
    });
    const variants = ['scene', 'marker'] as const;
    const parent = defineComposite({
      namespace: 'test',
      type: 'proxyTrapParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('proxyTrapParent'),
        variant: zodEnum(variants),
      }),
      compile: (value, context) => {
        const child: IRChild =
          value.variant === 'scene'
            ? { type: 'node', position: [0, 0], shape: { type: 'proxyTrapShape', params: {} } }
            : {
                type: 'path',
                arrow: pathArrows('->', { shape: 'proxyTrapArrow' }),
                children: [
                  { type: 'step', kind: 'move', to: [0, 0] },
                  { type: 'step', kind: 'line', to: [10, 0] },
                ],
              };
        const probe = context.layoutChild(child, naturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: [context.replay(probe.result)] };
      },
    });
    const options = {
      composites: [parent],
      shapes: [proxyShape],
      arrows: [proxyArrow],
    };
    const causes = { scene: sceneTrap, marker: markerTrap };

    for (const variant of variants) {
      let thrown: unknown;

      try {
        compileToScene(sceneOf({ namespace: 'test', type: 'proxyTrapParent', variant }), options);
      } catch (cause) {
        thrown = cause;
      }

      expect(thrown).toBeInstanceOf(RetikzCoreError);
      expect((thrown as Error & { cause?: unknown }).cause).toBe(causes[variant]);
    }
  });

  it('在验证和下游使用之前对动态形状 Scene 基元进行快照', () => {
    let xReads = 0;
    const dynamicRect = new Proxy({ type: 'rect', x: 0, y: 0, width: 10, height: 10 } as const, {
      get: (target, property, receiver) => {
        if (property === 'x') {
          xReads += 1;
          return xReads === 1 ? 0 : Number.NaN;
        }

        return Reflect.get(target, property, receiver);
      },
    });
    const dynamicShape = defineShape({
      name: 'dynamicScenePrimitiveShape',
      paramsSchema: strictObject({}),
      computeCircumscribedGeometry: BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry,
      computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
      emit: () => [dynamicRect],
    });

    const result = compileToScene(
      sceneOf({ type: 'node', position: [0, 0], shape: { type: 'dynamicScenePrimitiveShape', params: {} } }),
      { shapes: [dynamicShape] },
    );
    const rect = result.scene.primitives.find(primitive => primitive.type === 'rect');

    expect(rect).toMatchObject({ type: 'rect', x: 0, y: 0, width: 10, height: 10 });
    expect(xReads).toBe(0);
  });

  it('拒绝视觉边界，其派生边缘在丢弃的探测内变得非有限', () => {
    const farShape = defineShape({
      name: 'nonFiniteVisualBoundsShape',
      paramsSchema: strictObject({}),
      computeCircumscribedGeometry: BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry,
      computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
      emit: () => [{ type: 'rect', x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 10, fill: '#000' }],
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'nonFiniteVisualBoundsParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('nonFiniteVisualBoundsParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'node',
            position: [0, 0],
            shape: { type: 'nonFiniteVisualBoundsShape', params: {} },
            style: { fill: '#000' },
          },
          naturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'nonFiniteVisualBoundsParent' }), {
        composites: [parent],
        shapes: [farShape],
      }),
    ).toThrow(RetikzCoreError);
  });

  it('在验证和下游使用之前对动态箭头标记基元进行快照', () => {
    let xReads = 0;
    const dynamicRect = new Proxy({ type: 'rect', x: 0, y: 0, width: 10, height: 10 } as const, {
      get: (target, property, receiver) => {
        if (property === 'x') {
          xReads += 1;
          return xReads === 1 ? 0 : Number.NaN;
        }

        return Reflect.get(target, property, receiver);
      },
    });
    const dynamicArrow = defineArrow({
      name: 'dynamicMarkerPrimitiveArrow',
      backX: 0,
      lineContactX: 0,
      emit: () => [dynamicRect],
    });

    const result = compileToScene(
      sceneOf({
        type: 'path',
        arrow: pathArrows('->', { shape: 'dynamicMarkerPrimitiveArrow' }),
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      }),
      { arrows: [dynamicArrow] },
    );
    const path = result.scene.primitives.find(primitive => primitive.type === 'path');
    const marker = path?.type === 'path' ? path.arrowEnd?.marker[0] : undefined;

    expect(marker).toMatchObject({ type: 'rect', x: 0, y: 0, width: 10, height: 10 });
    expect(xReads).toBe(0);
  });

  it('在资源注册之前对动态裁剪路径进行快照', () => {
    let commandsReads = 0;
    const path: SceneClipPath = {
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 0] },
        { kind: 'line', to: [10, 10] },
        { kind: 'close' },
      ],
      fillRule: 'nonzero',
    };
    const dynamicPath = new Proxy(path, {
      get: (target, property, receiver) => {
        if (property === 'commands') commandsReads += 1;
        return Reflect.get(target, property, receiver);
      },
    });
    const definition = defineClip({
      kind: 'dynamicClipPath',
      schema: strictObject({ kind: literal('dynamicClipPath'), params: strictObject({}) }),
      lower: () => dynamicPath,
    });
    const { scene } = compileToScene(
      sceneOf({ type: 'scope', clip: { kind: 'dynamicClipPath', params: {} }, children: [] }),
      { clips: [definition] },
    );
    const clip = scene.resources?.find(resource => resource.kind === 'clip');
    expect(clip).toMatchObject({ kind: 'clip', path });
    expect(commandsReads).toBe(0);
    path.commands.length = 0;
    expect(clip?.path.commands).toHaveLength(4);
  });

  it('在布局使用之前快照动态形状大小和偏移字段', () => {
    let halfWidthReads = 0;
    let offsetXReads = 0;
    const circumscribed = new Proxy(
      {
        halfWidth: 10,
        halfHeight: 5,
        get offset() {
          return offset;
        },
      },
      {
        get: (target, property, receiver) => {
          if (property === 'halfWidth') {
            halfWidthReads += 1;
            return halfWidthReads === 1 ? 10 : Number.NaN;
          }

          return Reflect.get(target, property, receiver);
        },
      },
    );
    const offset = new Proxy([4, 0] as [number, number], {
      get: (target, property, receiver) => {
        if (property === '0') {
          offsetXReads += 1;
          return offsetXReads === 1 ? 4 : Number.NaN;
        }

        return Reflect.get(target, property, receiver);
      },
    });
    const dynamicShape = defineShape({
      name: 'dynamicLayoutGeometryShape',
      paramsSchema: strictObject({}),
      computeCircumscribedGeometry: () => circumscribed,
      computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
      emit: BUILTIN_SHAPES.get('rectangle')!.emit,
    });

    const result = compileToScene(
      sceneOf({
        type: 'node',
        position: [0, 0],
        shape: { type: 'dynamicLayoutGeometryShape', params: {} },
        layout: { padding: 0 },
      }),
      { shapes: [dynamicShape] },
    );
    const rect = result.scene.primitives.find(primitive => primitive.type === 'rect');

    expect(rect).toMatchObject({ type: 'rect', x: -6, y: -5, width: 20, height: 10 });
    expect({ halfWidthReads, offsetXReads }).toEqual({ halfWidthReads: 1, offsetXReads: 1 });
  });

  it('在有限验证和发布之前对动态提供者位置进行快照', () => {
    let xReads = 0;
    const position = new Proxy([10, 0] as [number, number], {
      get: (target, property, receiver) => {
        if (property === '0') {
          xReads += 1;
          return xReads === 1 ? 10 : Number.NaN;
        }

        return Reflect.get(target, property, receiver);
      },
    });

    expect(snapshotProviderPosition("Shape 'dynamicPosition' anchor", position)).toEqual([10, 0]);
    expect(xReads).toBe(1);
  });

  it('在分离基元时省略可选的 undefined Scene 字段', () => {
    const shapeOf = (name: string, primitive: ScenePrimitive) =>
      defineShape({
        name,
        paramsSchema: strictObject({}),
        computeCircumscribedGeometry: BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry,
        computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
        resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
        emit: () => [primitive],
      });
    const validShape = shapeOf('optionalUndefinedSceneShape', {
      type: 'rect',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      cornerRadius: undefined,
    });
    const result = compileToScene(
      sceneOf({ type: 'node', position: [0, 0], shape: { type: 'optionalUndefinedSceneShape', params: {} } }),
      { shapes: [validShape] },
    );
    const rect = result.scene.primitives.find(primitive => primitive.type === 'rect');

    expect(rect).toBeDefined();
    expect(Object.hasOwn(rect as object, 'cornerRadius')).toBe(false);
    expect(Object.isFrozen(rect)).toBe(false);
  });

  it('在基元验证之前拒绝显式 undefined 和稀疏的 Scene 或标记数组', () => {
    const lossyArrays: Array<Array<unknown>> = [[undefined], new Array(1)];

    for (const [index, children] of lossyArrays.entries()) {
      const shape = defineShape({
        name: `lossySceneArrayShape${index}`,
        paramsSchema: strictObject({}),
        computeCircumscribedGeometry: BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry,
        computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
        resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
        emit: () => [{ type: 'group', children } as unknown as ScenePrimitive],
      });
      const arrow = defineArrow({
        name: `lossyMarkerArrayArrow${index}`,
        backX: 0,
        lineContactX: 0,
        emit: () => [{ type: 'group', children } as unknown as ScenePrimitive],
      });

      expect(() =>
        compileToScene(sceneOf({ type: 'node', position: [0, 0], shape: { type: shape.name, params: {} } }), {
          shapes: [shape],
        }),
      ).toThrow(RetikzCoreError);
      expect(() =>
        compileToScene(
          sceneOf({
            type: 'path',
            arrow: pathArrows('->', { shape: arrow.name }),
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          }),
          { arrows: [arrow] },
        ),
      ).toThrow(RetikzCoreError);
    }
  });

  it('保持直接抛出的撤销代理可恢复并具有精确选择的原因标识', () => {
    const hostileThrown = Proxy.revocable({}, {});
    hostileThrown.revoke();
    const throwingShape = defineShape({
      name: 'throwingHostileProxyShape',
      paramsSchema: strictObject({}),
      computeCircumscribedGeometry: BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry,
      computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
      emit: () => {
        throw hostileThrown.proxy;
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileProxyFailureParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('hostileProxyFailureParent'),
        select: boolean(),
      }),
      compile: (value, context) => {
        const probe = context.layoutChild(
          { type: 'node', position: [0, 0], shape: { type: 'throwingHostileProxyShape', params: {} } },
          naturalLayoutProposal,
        );

        expect(probe.kind).toBe(LayoutChildProbeKind.Failed);

        if (value.select && probe.kind === LayoutChildProbeKind.Failed) context.raise(probe.failure);

        return { children: [] };
      },
    });
    const options = { composites: [parent], shapes: [throwingShape] };

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileProxyFailureParent', select: false }), options),
    ).not.toThrow();

    let selected: unknown;

    try {
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileProxyFailureParent', select: true }), options);
    } catch (cause) {
      selected = cause;
    }

    expect(isLayoutProbeRecoverableError(selected)).toBe(true);
    expect(selected).toBeInstanceOf(RetikzError);
    expect((selected as Error & { cause?: unknown }).cause).toBe(hostileThrown.proxy);
  });

  it('在第一个身份周期终止自返回原型陷阱', () => {
    let prototypeTrapCalls = 0;
    const selfReturningProxy: object = new Proxy(
      {},
      {
        getPrototypeOf: () => {
          prototypeTrapCalls += 1;
          if (prototypeTrapCalls > 4) throw new Error('prototype walk exceeded cycle guard threshold');
          return selfReturningProxy;
        },
      },
    );

    const normalized = wrapLayoutProbeError(selfReturningProxy);

    expect(prototypeTrapCalls).toBe(1);
    expect(normalized.cause).toBe(selfReturningProxy);

    const throwingShape = defineShape({
      name: 'throwingSelfPrototypeProxyShape',
      paramsSchema: strictObject({}),
      computeCircumscribedGeometry: BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry,
      computeBoundaryPoint: BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint,
      resolveAnchor: BUILTIN_SHAPES.get('rectangle')!.resolveAnchor,
      emit: () => {
        throw selfReturningProxy;
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'selfPrototypeProxyParent',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('selfPrototypeProxyParent'),
        select: boolean(),
      }),
      compile: (value, context) => {
        const probe = context.layoutChild(
          { type: 'node', position: [0, 0], shape: { type: 'throwingSelfPrototypeProxyShape', params: {} } },
          naturalLayoutProposal,
        );

        expect(probe.kind).toBe(LayoutChildProbeKind.Failed);

        if (value.select && probe.kind === LayoutChildProbeKind.Failed) context.raise(probe.failure);

        return { children: [] };
      },
    });
    const options = { composites: [parent], shapes: [throwingShape] };

    prototypeTrapCalls = 0;

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'selfPrototypeProxyParent', select: false }), options),
    ).not.toThrow();
    expect(prototypeTrapCalls).toBe(1);

    prototypeTrapCalls = 0;
    let selected: unknown;

    try {
      compileToScene(sceneOf({ namespace: 'test', type: 'selfPrototypeProxyParent', select: true }), options);
    } catch (cause) {
      selected = cause;
    }

    expect(prototypeTrapCalls).toBe(1);
    expect(isLayoutProbeRecoverableError(selected)).toBe(true);
    expect((selected as Error & { cause?: unknown }).cause).toBe(selfReturningProxy);
  });

  it('保持普通裁剪提供者抛出可恢复和可丢弃', () => {
    const throwingClip = defineClip({
      kind: 'ordinaryThrowingClip',
      schema: strictObject({ kind: literal('ordinaryThrowingClip'), params: strictObject({}) }),

      lower: () => {
        throw new Error('ordinary clip lower failure');
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'discardThrowingClip',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('discardThrowingClip'),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          {
            type: 'scope',
            clip: { kind: 'ordinaryThrowingClip', params: {} } as never,
            children: [{ type: 'node', position: [0, 0] }],
          },
          naturalLayoutProposal,
        );

        expect(probe.kind).toBe(LayoutChildProbeKind.Failed);

        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'discardThrowingClip' }), {
        composites: [parent],
        clips: [throwingClip],
      }),
    ).not.toThrow();
  });
});

describe('布局感知的复合回放所有权', () => {
  it('只发布一次重复 id 警告并按后写优先语义提交回放', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'duplicateReplayId',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('duplicateReplayId'),
      }),
      compile: (_, context) => {
        const laid = resolvedResultOf(context, { type: 'coordinate', id: 'same', position: [20, 0] });
        return { children: [context.replay(laid)] };
      },
    });
    const warnings: Array<CompileWarning> = [];

    const result = compileToScene(
      sceneOf(
        { type: 'coordinate', id: 'same', position: [0, 0] },
        { namespace: 'test', type: 'duplicateReplayId' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, -10] },
            { type: 'step', kind: 'line', to: { id: 'same' } },
          ],
        },
      ),
      {
        composites: [definition],
        onWarn: warning => warnings.push(warning),
      },
    );

    expect(warnings.filter(warning => warning.code === BuiltinCompileWarningCode.DuplicateNodeId)).toHaveLength(1);

    const path = result.scene.primitives.find(primitive => primitive.type === 'path');

    expect(path?.type === 'path' ? path.commands.find(command => command.kind === 'line') : undefined).toMatchObject({
      to: [20, 0],
    });
  });

  it('仍然报告回放提交之前原始输出引入的 ID', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'rawBeforeReplayId',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('rawBeforeReplayId'),
      }),
      compile: (_, context) => {
        const laid = resolvedResultOf(context, { type: 'coordinate', id: 'same', position: [20, 0] });
        return {
          children: [{ type: 'coordinate', id: 'same', position: [10, 0] }, context.replay(laid)],
        };
      },
    });
    const warnings: Array<CompileWarning> = [];

    const result = compileToScene(
      sceneOf(
        { namespace: 'test', type: 'rawBeforeReplayId' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, -10] },
            { type: 'step', kind: 'line', to: { id: 'same' } },
          ],
        },
      ),
      {
        composites: [definition],
        onWarn: warning => warnings.push(warning),
      },
    );

    expect(warnings.filter(warning => warning.code === BuiltinCompileWarningCode.DuplicateNodeId)).toHaveLength(1);

    const path = result.scene.primitives.find(primitive => primitive.type === 'path');

    expect(path?.type === 'path' ? path.commands.find(command => command.kind === 'line') : undefined).toMatchObject({
      to: [20, 0],
    });
  });

  it('与原始输出混合时保留回放根 zIndex', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'mixedZIndex',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('mixedZIndex'),
      }),
      compile: (_, context) => {
        const laid = resolvedResultOf(context, { type: 'node', position: [0, 0], zIndex: 10 });
        return {
          children: [
            context.replay(laid),
            {
              type: 'path',
              zIndex: 5,
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ],
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'mixedZIndex' }), {
      composites: [definition],
    });

    expect(result.scene.primitives.map(primitive => primitive.type)).toEqual(['path', 'rect']);
  });

  it('通过布局变换保留回放根 zIndex', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'transformedZIndex',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('transformedZIndex'),
      }),
      compile: (_, context) => {
        const laid = resolvedResultOf(context, { type: 'node', position: [0, 0], zIndex: 10 });
        return {
          children: [
            context.replay(laid, { transforms: [{ kind: 'translate', x: 10, y: 0 }] }),
            {
              type: 'path',
              zIndex: 5,
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ],
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'transformedZIndex' }), {
      composites: [definition],
    });

    expect(result.scene.primitives.map(primitive => primitive.type)).toEqual(['path', 'group']);
  });

  it('将多个回放根独立地包裹在同级周围，并对包裹裁剪进行去重', () => {
    const roots = defineComposite({
      namespace: 'test',
      type: 'multipleRoots',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('multipleRoots'),
      }),
      compile: () => ({
        children: [
          {
            type: 'path' as const,
            zIndex: 1,
            children: [
              { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
              { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
            ],
          },
          { type: 'node' as const, position: [0, 0] as [number, number], zIndex: 10 },
        ],
      }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'wrappedMultipleRoots',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('wrappedMultipleRoots'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'multipleRoots' });
        return {
          children: [
            context.replay(laid, { clip: { kind: 'rect', params: { x: -20, y: -20, width: 40, height: 40 } } }),
            { type: 'node', position: [20, 0], zIndex: 5 },
          ],
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'wrappedMultipleRoots' }), {
      composites: [roots, parent],
    });
    const groups = result.scene.primitives.filter(primitive => primitive.type === 'group');

    expect(result.scene.primitives.map(primitive => primitive.type)).toEqual(['group', 'rect', 'group']);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.clipRef).toBe(groups[1]?.clipRef);
    expect(result.scene.resources?.filter(resource => resource.kind === 'clip')).toHaveLength(1);
  });

  it('拒绝从先前编译中保留的回放令牌', () => {
    let retained: LayoutChildResult | undefined;
    let reuse = false;
    const definition = defineComposite({
      namespace: 'test',
      type: 'retainedReplay',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('retainedReplay'),
      }),
      compile: (_, context) => {
        if (reuse) {
          return { children: [context.replay(retained!)] };
        }

        retained = resolvedResultOf(context, { type: 'node', position: [0, 0], text: 'first' });

        return { children: [] };
      },
    });

    compileToScene(sceneOf({ namespace: 'test', type: 'retainedReplay' }), {
      composites: [definition],
    });
    reuse = true;

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'retainedReplay' }), {
        composites: [definition],
      }),
    ).toThrow(/does not belong to this compile|forged/i);
  });

  it('拒绝结构伪造的回放令牌', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'forgedReplay',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('forgedReplay'),
      }),
      compile: (_node, context) => ({
        children: [
          context.replay({
            allocationBounds: { x: 0, y: 0, width: 0, height: 0 },
            slotSize: { width: 0, height: 0 },
            visualBounds: { x: 0, y: 0, width: 0, height: 0 },
            replay: Object.freeze({}) as CompositeReplay,
          }),
        ],
      }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'forgedReplay' }), {
        composites: [definition],
      }),
    ).toThrow(/does not belong to this compile|forged/i);
  });

  it('拒绝复制的布局结果，即使它保留了真实的回放令牌', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'copiedLayoutResult',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('copiedLayoutResult'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { type: 'node', position: [0, 0], text: 'real' });
        return {
          children: [
            context.replay({
              ...laid,
              allocationBounds: { x: 0, y: 0, width: 999, height: 999 },
            }),
          ],
        };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'copiedLayoutResult' }), {
        composites: [definition],
      }),
    ).toThrow(/test\.copiedLayoutResult.*children\[0\].*(invalid|forged).*layout result/i);
  });

  it('将回放转换应用于分配、Scene、命名空间', () => {
    const moved = defineComposite({
      namespace: 'test',
      type: 'moved',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('moved'),
      }),
      compile: (_, context) => {
        const child = resolvedResultOf(context, {
          type: 'node',
          id: 'moved-node',
          position: [0, 0],
          layout: { minimumSize: 10, padding: 0, margin: 0 },
        });
        return {
          children: [context.replay(child, { transforms: [{ kind: 'translate', x: 20, y: 30 }] })],
        };
      },
    });
    const outer = defineComposite({
      namespace: 'test',
      type: 'outer',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('outer'),
      }),
      artifactSchema: BoundsSchema,
      compile: (_, context) => {
        const child = resolvedResultOf(context, { namespace: 'test', type: 'moved' });
        return {
          children: [context.replay(child)],
          artifact: child.allocationBounds,
        };
      },
    });
    const result = compileToScene(
      sceneOf(
        { namespace: 'test', type: 'outer' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'moved-node' } },
          ],
        },
      ),
      {
        composites: [moved, outer],

        padding: 0,
      },
    );

    expect(result.artifacts[0]?.value).toEqual({
      x: 15,
      y: 25,
      width: 10,
      height: 10,
    });

    expect(result.scene.primitives.some(primitive => primitive.type === 'path')).toBe(true);
  });
});

describe('布局感知复合组件的产物与下沉错误', () => {
  it('将 maxCompositeDepth 应用于布局感知编译分支', () => {
    const recursive = defineComposite({
      namespace: 'test',
      type: 'recursive',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('recursive'),
      }),
      compile: (_node, context) => {
        const child = resolvedResultOf(context, { namespace: 'test', type: 'recursive' });
        return { children: [context.replay(child)] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'recursive' }), {
        composites: [recursive],
        maxCompositeDepth: 2,
      }),
    ).toThrow(/COMPOSITE_NEST_TOO_DEEP.*children\[0\]/);
  });

  it('拒绝非 JSON 安全纯数据的 schema 接受值', () => {
    const unsafeSchema = custom<JsonValue>(() => true);
    const definition = defineComposite({
      namespace: 'test',
      type: 'unsafeArtifact',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('unsafeArtifact'),
      }),
      artifactSchema: unsafeSchema,
      compile: () => ({
        children: [],
        artifact: new Map([['hidden', true]]) as unknown as JsonValue,
      }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'unsafeArtifact' }), {
        composites: [definition],
      }),
    ).toThrow(/plain objects and arrays/i);
  });

  it('在分离的产物中保留 JSON 特殊键', () => {
    const payload = JSON.parse('{"__proto__":{"safe":true}}') as JsonValue;
    const definition = defineComposite({
      namespace: 'test',
      type: 'specialArtifactKeys',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('specialArtifactKeys'),
      }),
      artifactSchema: custom<JsonValue>(),
      compile: () => ({ children: [], artifact: payload }),
    });

    const artifact = compileToScene(sceneOf({ namespace: 'test', type: 'specialArtifactKeys' }), {
      composites: [definition],
    }).artifacts[0];
    expect(Object.hasOwn(artifact.value as object, '__proto__')).toBe(true);
    expect(JSON.stringify(artifact.value)).toBe('{"__proto__":{"safe":true}}');
  });

  it('拒绝符号键控的产物属性，而不是默默地删除它们', () => {
    const payload = { visible: true, [Symbol('hidden')]: 'not-json' } as unknown as JsonValue;
    const definition = defineComposite({
      namespace: 'test',
      type: 'symbolArtifactKey',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('symbolArtifactKey'),
      }),
      artifactSchema: custom<JsonValue>(),
      compile: () => ({ children: [], artifact: payload }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'symbolArtifactKey' }), {
        composites: [definition],
      }),
    ).toThrow(/symbol key/i);
  });

  it('拒绝函数、集合、类实例、符号和循环产物数据', () => {
    class ArtifactClass {
      value = true;
    }

    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const values: Array<unknown> = [
      { callback: () => undefined },
      new Set(['hidden']),
      new ArtifactClass(),
      { value: Symbol('hidden') },
      cyclic,
    ];

    for (const value of values) {
      expect(() => cloneAndFreezeJson(value)).toThrow();
    }
  });
});
