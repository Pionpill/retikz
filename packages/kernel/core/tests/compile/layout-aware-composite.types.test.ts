import { describe, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type {
  AnyCompositeDefinition,
  CompositeCompileArtifact,
  IRScene,
  JsonValue,
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

describe('layout-aware composite type contracts', () => {
  it('preserves exact definition literals and callable branch types', () => {
    expectTypeOf(alpha.namespace).toEqualTypeOf<'test'>();
    expectTypeOf(alpha.type).toEqualTypeOf<'alpha'>();
    expectTypeOf(alpha.compile).toBeFunction();
  });

  it('infers a precise composite artifact union from a const tuple', () => {
    const result = compileToScene(scene, { composites: [alpha, beta] as const });
    type Artifact = (typeof result.artifacts)[number];
    type DomainArtifact = Extract<Artifact, { kind: 'composite' }>;

    expectTypeOf<DomainArtifact>().toEqualTypeOf<
      | CompositeCompileArtifact<'test', 'alpha', { value: 'alpha' }>
      | CompositeCompileArtifact<'test', 'beta', { value: number }>
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
