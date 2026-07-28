import { describe, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type {
  AnyCompositeDefinition,
  ChildLayoutAxisConstraint,
  ChildLayoutSize,
  CompositeCompileArtifact,
  CompositeCompileChild,
  CompositeCompileScopeProps,
  CompositeReplayWrapper,
  IRChild,
  IRScene,
  JsonValue,
  LayoutCompositeCompileResult,
  NodeLayoutCompileArtifact,
} from '../../src';

import { compileToScene, CompositeBaseSchema, defineComposite } from '../../src';

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
    const axis = { kind: 'bounded', min: 4, max: 20 } satisfies ChildLayoutAxisConstraint;
    const laid = context.layoutChild(node.child, { kind: 'constrained', width: axis });
    const replayWrapper = {
      transforms: [{ kind: 'translate', x: 4, y: 6 }],
      clip: { kind: 'rect', x: 0, y: 0, width: 20, height: 10 },
    } satisfies CompositeReplayWrapper;
    const placed = context.replay(laid, replayWrapper);
    const scopeProps = {
      id: 'cell',
      clip: { kind: 'rect', x: 0, y: 0, width: 20, height: 10 },
      meta: { role: 'cell' },
    } satisfies CompositeCompileScopeProps;
    const wrapper = context.scope(scopeProps, [placed]);

    expectTypeOf(wrapper).toEqualTypeOf<CompositeCompileChild>();
    expectTypeOf(laid.slotSize).toEqualTypeOf<ChildLayoutSize>();

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

    // @ts-expect-error replay 后的 runtime Scope 不开放 placement
    context.scope({ placement: { target: [0, 0] } }, []);
    // @ts-expect-error replay 后的 runtime Scope 不开放样式默认
    context.scope({ fill: 'red' }, []);
    // @ts-expect-error replay token 不能作为 output child
    context.scope({}, [laid.replay]);
    // @ts-expect-error 任意对象不能作为 output child
    context.scope({}, [{}]);

    return { children: [wrapper], artifact: { value: 'wrapped' } };
  },
});

describe('layout-aware composite type contracts', () => {
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
