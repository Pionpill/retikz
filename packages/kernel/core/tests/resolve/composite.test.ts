import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

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
    namespace: literal('test'),
    type: literal('box'),
    value: number(),
  }),
  compile: node => ({ children: [{ type: 'node', position: [node.value, 0] }] }),
});

const layoutDefinition = defineComposite({
  namespace: 'test',
  type: 'layout',
  schema: CompositeBaseSchema.extend({
    namespace: literal('test'),
    type: literal('layout'),
    value: number(),
  }),
  artifactSchema: strictObject({ value: number() }),
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

  it('binds and parses a composite once', () => {
    const binding = bindComposite(source(), registryOf(expandDefinition));
    if (binding.kind === 'unregistered') throw new Error('expected registered binding');

    const resolution = resolveComposite(binding, 'children[0]');

    expect(resolution).toMatchObject({ kind: 'compile', key: 'test.box', node: source() });

    expect(resolution.compile).toBe(expandDefinition.compile);
  });

  it('binds a layout-aware composite with its artifact schema', () => {
    const binding = bindComposite(source({ type: 'layout' }), registryOf(layoutDefinition));
    if (binding.kind === 'unregistered') throw new Error('expected registered binding');

    const resolution = resolveComposite(binding, 'children[0]');

    expect(resolution).toMatchObject({ kind: 'compile', key: 'test.layout', node: source({ type: 'layout' }) });

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
