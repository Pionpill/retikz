import { describe, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type {
  AnyCompositeDefinition,
  // @ts-expect-error 旧 ChildLayoutAxisConstraint 已从公开 contract 删除
  ChildLayoutAxisConstraint,
  // @ts-expect-error 旧 ChildLayoutConstraint 已从公开 contract 删除
  ChildLayoutConstraint,
  // @ts-expect-error 旧 ChildLayoutSize 已从公开 contract 删除
  ChildLayoutSize,
  CompositeCompileArtifact,
  CompositeCompileChild,
  CompositeCompileScopeProps,
  CompositeExpandContext,
  CompositeReplayWrapper,
  IRChild,
  IRScene,
  IRScopeProps,
  JsonValue,
  LayoutAlignmentGuide,
  LayoutAxisProposal,
  LayoutChildFailure,
  LayoutChildProbe,
  LayoutChildResult,
  LayoutCompositeCompileResult,
  LayoutProposal,
  NodeLayoutCompileArtifact,
  ResolvedTheme,
} from '../../src';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutAlignmentGuideDimension,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  ScopePropsSchema,
} from '../../src';

const scene: IRScene = { version: 1, type: 'scene', children: [] };

const alpha = defineComposite({
  namespace: 'test',
  type: 'alpha',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('test'),
    type: z.literal('alpha'),
  }),
  artifactSchema: z.strictObject({ value: z.literal('alpha') }),
  compile: () => ({ children: [], artifact: { value: 'alpha' } }),
});

const beta = defineComposite({
  namespace: 'test',
  type: 'beta',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('test'),
    type: z.literal('beta'),
  }),
  artifactSchema: z.strictObject({ value: z.number() }),
  compile: () => ({ children: [], artifact: { value: 1 } }),
});

const wrapped = defineComposite({
  namespace: 'test',
  type: 'wrapped',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('test'),
    type: z.literal('wrapped'),
    child: z.custom<IRChild>(),
  }),
  artifactSchema: z.strictObject({ value: z.literal('wrapped') }),
  compile: (node, context) => {
    const axis = {
      kind: LayoutAxisProposalKind.Range,
      min: 4,
      max: 20,
    } satisfies LayoutAxisProposal;
    const proposal = {
      x: axis,
      y: {
        kind: LayoutAxisProposalKind.Intrinsic,
        mode: LayoutIntrinsicMode.Natural,
      },
    } satisfies LayoutProposal;
    const minimumExactProposal = {
      x: {
        kind: LayoutAxisProposalKind.Intrinsic,
        mode: LayoutIntrinsicMode.Minimum,
      },
      y: { kind: LayoutAxisProposalKind.Exact, value: 12 },
    } satisfies LayoutProposal;
    void minimumExactProposal;
    const probe = context.layoutChild(node.child, proposal);
    expectTypeOf(probe).toEqualTypeOf<LayoutChildProbe>();
    expectTypeOf(context.proposal).toEqualTypeOf<LayoutProposal>();
    if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
    const laid = probe.result;
    const replayWrapper = {
      transforms: [{ kind: 'translate', x: 4, y: 6 }],
      clip: { kind: 'rect', x: 0, y: 0, width: 20, height: 10 },
    } satisfies CompositeReplayWrapper;
    const placed = context.replay(laid, replayWrapper);
    const scopeProps = {
      id: 'cell',
      theme: { mode: 'dark' },
      clip: { kind: 'rect', x: 0, y: 0, width: 20, height: 10 },
      meta: { role: 'cell' },
      fill: 'red',
      placement: { target: [10, 12] as [number, number] },
      nodeDefault: { fill: 'white' },
      resetStyle: ['label'] as const,
    } satisfies CompositeCompileScopeProps;
    const parsedScopeProps = ScopePropsSchema.parse(scopeProps);
    expectTypeOf(parsedScopeProps).toEqualTypeOf<IRScopeProps>();
    const wrapper = context.scope(scopeProps, [placed]);

    expectTypeOf(wrapper).toEqualTypeOf<CompositeCompileChild>();
    expectTypeOf(context.theme).toEqualTypeOf<ResolvedTheme>();
    expectTypeOf(laid).toEqualTypeOf<LayoutChildResult>();
    expectTypeOf(laid.slotSize).toEqualTypeOf<Readonly<{ width: number; height: number }>>();

    const guide: LayoutAlignmentGuide = {
      name: 'custom-baseline',
      dimension: LayoutAlignmentGuideDimension.Y,
      position: 8,
    };
    const resultWithGuide: LayoutCompositeCompileResult = {
      children: [wrapper],
      alignmentGuides: [guide],
    };
    void resultWithGuide;

    // @ts-expect-error proposal 缺少 y 轴
    context.layoutChild(node.child, { x: axis });
    // @ts-expect-error proposal 不允许额外字段
    context.layoutChild(node.child, { ...proposal, width: axis });
    // @ts-expect-error range variant 不允许 exact value
    context.layoutChild(node.child, { ...proposal, x: { ...axis, value: 10 } });
    // @ts-expect-error 旧 constrained contract 不再接受
    context.layoutChild(node.child, { kind: 'constrained', width: { kind: 'bounded', max: 20 } });
    // @ts-expect-error opaque failure 不能伪造
    const forgedFailure: LayoutChildFailure = {};
    void forgedFailure;
    // @ts-expect-error result 是只读值
    laid.slotSize.width = 12;
    // @ts-expect-error guide 是只读值
    guide.position = 12;
    // @ts-expect-error guide array 是只读值
    laid.alignmentGuides?.push(guide);
    // @ts-expect-error probe 是只读判别 union
    probe.kind = LayoutChildProbeKind.Failed;
    // @ts-expect-error replay 只接受 resolved result
    context.replay(probe);
    // @ts-expect-error resolved probe 不能伪造额外 output 字段
    const forgedProbe: LayoutChildProbe = { kind: LayoutChildProbeKind.Resolved, result: laid, output: wrapper };
    void forgedProbe;

    // @ts-expect-error replay 的第二参数已迁移为 wrapper object
    context.replay(laid, [{ kind: 'translate', x: 4, y: 6 }]);
    // @ts-expect-error replay wrapper 只接受 transforms / clip
    context.replay(laid, { transforms: [], meta: { role: 'cell' } });

    const directPlacement: LayoutCompositeCompileResult = {
      children: [
        // @ts-expect-error layout-aware output 不再接受调用方直接构造 replay placement
        { kind: 'replay', replay: laid.replay },
      ],
    };
    void directPlacement;

    context.scope({ placement: { target: [0, 0] } }, []);
    context.scope({ fill: 'red' }, []);
    context.scope({ nodeDefault: { fill: 'white' }, resetStyle: ['node'] }, []);
    // @ts-expect-error replay token 不能作为 output child
    context.scope({}, [laid.replay]);
    // @ts-expect-error 任意对象不能作为 output child
    context.scope({}, [{}]);

    return { children: [wrapper], artifact: { value: 'wrapped' } };
  },
});

describe('layout-aware composite type contracts', () => {
  it('公开 expand 与 layout-aware 的完整只读 Theme context', () => {
    const expandContext = {} as CompositeExpandContext;
    expectTypeOf(expandContext.theme).toEqualTypeOf<ResolvedTheme>();
    const assertReadonly = (context: CompositeExpandContext): void => {
      // @ts-expect-error 解析后的 Theme 是只读值
      context.theme.mode = 'dark';
    };
    void assertReadonly;
  });
  it('removes the legacy child layout public types', () => {
    void expectTypeOf<ChildLayoutAxisConstraint>();
    void expectTypeOf<ChildLayoutConstraint>();
    void expectTypeOf<ChildLayoutSize>();
  });

  it('preserves exact definition literals and callable branch types', () => {
    expectTypeOf(alpha.namespace).toEqualTypeOf<'test'>();
    expectTypeOf(alpha.type).toEqualTypeOf<'alpha'>();
    expectTypeOf(alpha.compile).toBeFunction();
  });

  it('infers a precise composite artifact union from a const tuple', () => {
    const result = compileToScene(scene, { composites: [alpha, beta, wrapped] as const });
    type Artifact = (typeof result.artifacts)[number];
    type DomainArtifact = Extract<Artifact, { kind: 'composite' }>;

    expectTypeOf<DomainArtifact>().toEqualTypeOf<
      | CompositeCompileArtifact<'test', 'alpha', { value: 'alpha' }>
      | CompositeCompileArtifact<'test', 'beta', { value: number }>
      | CompositeCompileArtifact<'test', 'wrapped', { value: 'wrapped' }>
    >();
  });

  it('keeps the no-composite result free of phantom composite payloads', () => {
    const result = compileToScene(scene);
    type Artifact = (typeof result.artifacts)[number];

    expectTypeOf<Artifact>().toEqualTypeOf<NodeLayoutCompileArtifact>();
    expectTypeOf<Extract<Artifact, { kind: 'composite' }>>().toEqualTypeOf<never>();
  });

  it('widens heterogeneous registries to JSON-safe artifacts without any', () => {
    const registry: ReadonlyArray<AnyCompositeDefinition> = [alpha, beta];
    const result = compileToScene(scene, { composites: registry });
    type DomainArtifact = Extract<(typeof result.artifacts)[number], { kind: 'composite' }>;

    expectTypeOf<DomainArtifact>().toEqualTypeOf<CompositeCompileArtifact<string, string, JsonValue>>();
  });
});
