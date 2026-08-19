import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { AnyCompositeDefinition, IRComposite } from '../../src';

import { CompositeBaseSchema, defineComposite } from '../../src';
import { bindComposite, resolveComposite } from '../../src/resolve';

const source = (overrides: Record<string, unknown> = {}): IRComposite => ({
  namespace: 'test',
  type: 'box',
  value: 3,
  ...overrides,
});

const expandDefinition = defineComposite({
  namespace: 'test',
  type: 'box',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('test'),
    type: z.literal('box'),
    value: z.number(),
  }),
  expand: node => ({ children: [{ type: 'node', position: [node.value, 0] }] }),
});

const layoutDefinition = defineComposite({
  namespace: 'test',
  type: 'layout',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('test'),
    type: z.literal('layout'),
    value: z.number(),
  }),
  artifactSchema: z.strictObject({ value: z.number() }),
  compile: node => ({ children: [], artifact: { value: node.value } }),
});

const registryOf = (...definitions: ReadonlyArray<AnyCompositeDefinition>) =>
  new Map(definitions.map(definition => [`${definition.namespace}.${definition.type}`, definition]));

describe('resolveComposite', () => {
  it('returns the canonical provider key when the composite is unregistered', () => {
    expect(bindComposite(source(), new Map())).toEqual({
      kind: 'unregistered',
      key: 'test.box',
    });
  });

  it('binds and parses an expand composite once', () => {
    const binding = bindComposite(source(), registryOf(expandDefinition));
    if (binding.kind === 'unregistered') throw new Error('expected registered binding');
    const resolution = resolveComposite(binding, 'children[0]');

    expect(resolution).toMatchObject({ kind: 'expand', key: 'test.box', node: source() });
    if (resolution.kind !== 'expand') throw new Error('expected expand resolution');
    expect(resolution.expand(resolution.node, { theme: {} as never })).toEqual({
      children: [{ type: 'node', position: [3, 0] }],
    });
  });

  it('binds a layout-aware composite with its artifact schema', () => {
    const binding = bindComposite(source({ type: 'layout' }), registryOf(layoutDefinition));
    if (binding.kind === 'unregistered') throw new Error('expected registered binding');
    const resolution = resolveComposite(binding, 'children[0]');

    expect(resolution).toMatchObject({ kind: 'compile', key: 'test.layout', node: source({ type: 'layout' }) });
    if (resolution.kind !== 'compile') throw new Error('expected compile resolution');
    expect(resolution.artifactSchema).toBe(layoutDefinition.artifactSchema);
  });

  it('reports provider key and IR locator when payload parsing fails', () => {
    const binding = bindComposite(source({ value: 'invalid' }), registryOf(expandDefinition));
    if (binding.kind === 'unregistered') throw new Error('expected registered binding');
    expect(() => resolveComposite(binding, 'children[2]')).toThrow(
      /composite 'test\.box' failed payload validation at children\[2\]/u,
    );
  });
});
