import { describe, expect, it } from 'vitest';
import { strictObject, string } from 'zod';

import {
  createDefaultInspectorRegistry,
  createInspectorRegistry,
  defineInspector,
  mergeInspectorRegistries,
  PATH_INSPECTOR_KEY,
} from '../../src';
import { getResolvedInspectorRegistry } from '../../src/providers';

const resolveRegistry = (registry: ReturnType<typeof createInspectorRegistry>) =>
  getResolvedInspectorRegistry(registry);

const definition = (namespace: string, type: string) =>
  defineInspector({
    namespace,
    type,
    owner: { kind: 'path' as const, name: 'stroke' },
    subjectSchema: strictObject({ value: string() }),
    inspect: () => [],
  });

describe('Inspector registry', () => {
  it('completes omitted options fields at both authoring entry points', () => {
    const rawDefinition = {
      namespace: 'test',
      type: 'empty-options',
      owner: { kind: 'path' as const, name: 'stroke' },
      subjectSchema: strictObject({ value: string() }),
      inspect: () => [],
    };
    defineInspector(rawDefinition);
    const registered = resolveRegistry(createInspectorRegistry([rawDefinition])).require(rawDefinition);
    for (const candidate of [registered]) {
      expect(candidate.optionsSchema.parse({})).toEqual({});
      expect(() => candidate.optionsSchema.parse({ unexpected: true })).toThrow();
      expect(Object.isFrozen(candidate)).toBe(true);
      expect(resolveRegistry(createInspectorRegistry([candidate])).require(candidate)).toBe(candidate);
    }
  });

  it('preserves a custom resolver when the options schema is omitted', () => {
    const resolveOptions = () => ({ label: 'marker' });
    const input = defineInspector({
      namespace: 'test',
      type: 'resolved-empty',
      owner: { kind: 'path', name: 'stroke' },
      subjectSchema: strictObject({ value: string() }),
      resolveOptions,
      inspect: (_subject, context) => ({ type: 'node', position: [0, 0], content: context.options.label }),
    });
    const inspector = resolveRegistry(createInspectorRegistry([input])).require(input);
    expect(inspector.optionsSchema.parse({})).toEqual({});
    expect(inspector.resolveOptions).toBe(resolveOptions);
  });

  it('reuses a validated definition across registries', () => {
    const input = definition('test', 'reused');
    const inspector = resolveRegistry(createInspectorRegistry([input])).require(input);
    expect(resolveRegistry(createInspectorRegistry([input])).require(input)).toBe(inspector);
    expect(resolveRegistry(createInspectorRegistry([input])).require(input)).toBe(inspector);
  });

  it('validates and snapshots a directly supplied definition', () => {
    const rawDefinition = { ...definition('test', 'raw'), owner: { kind: 'path' as const, name: 'stroke' } };
    const registered = resolveRegistry(createInspectorRegistry([rawDefinition])).require(rawDefinition);
    rawDefinition.owner.name = 'changed';
    expect(registered.owner).toEqual({ kind: 'path', name: 'stroke' });
    expect(Object.isFrozen(registered)).toBe(true);
    expect(Object.isFrozen(registered.owner)).toBe(true);
    expect(resolveRegistry(createInspectorRegistry([registered])).require(registered)).toBe(registered);
  });

  it('does not trust a caller-frozen definition with an invalid owner', () => {
    const invalidDefinition = Object.freeze({
      ...definition('test', 'invalid'),
      owner: Object.freeze({ kind: 'path' as const, name: ' ' }),
    });
    expect(() => createInspectorRegistry([invalidDefinition])).toThrow(
      'Inspector owner name must be a non-empty string.',
    );
  });

  it('allows multiple keys for one owner and resolves each key', () => {
    const registry = createInspectorRegistry([definition('third-party', 'points'), definition('third-party', 'curve')]);
    const resolvedRegistry = resolveRegistry(registry);
    expect(resolvedRegistry.definitions).toHaveLength(2);
    expect(resolvedRegistry.get({ namespace: 'third-party', type: 'points' })?.type).toBe('points');
    expect(Object.isFrozen(resolvedRegistry.definitions)).toBe(true);
  });

  it('fails loudly on a complete namespace and type duplicate', () => {
    expect(() => createInspectorRegistry([definition('same', 'key'), definition('same', 'key')])).toThrow(/duplicate/i);
  });

  it('merges opaque registries in input order and preserves duplicate-key checks', () => {
    const first = createInspectorRegistry([definition('first', 'points')]);
    const second = createInspectorRegistry([definition('second', 'curve')]);
    const merged = getResolvedInspectorRegistry(mergeInspectorRegistries(first, second));

    expect(merged.definitions.map(registeredDefinition => registeredDefinition.namespace)).toEqual(['first', 'second']);
    expect(() => mergeInspectorRegistries(first, createInspectorRegistry([definition('first', 'points')]))).toThrow(
      /duplicate/i,
    );
  });

  it('keeps distinct keys separate when namespace or type contains a NUL character', () => {
    const first = definition('a\u0000b', 'c');
    const second = definition('a', 'b\u0000c');

    const registry = createInspectorRegistry([first, second]);

    expect(resolveRegistry(registry).get({ namespace: first.namespace, type: first.type })).toMatchObject({
      namespace: first.namespace,
      type: first.type,
    });
    expect(resolveRegistry(registry).get({ namespace: second.namespace, type: second.type })).toMatchObject({
      namespace: second.namespace,
      type: second.type,
    });
  });

  it('registers the stroke builtin through the same default path', () => {
    const registry = createDefaultInspectorRegistry([definition('third-party', 'points')]);
    expect(resolveRegistry(registry).get(PATH_INSPECTOR_KEY)).toBeDefined();
    expect(resolveRegistry(registry).get({ namespace: 'third-party', type: 'points' })).toBeDefined();
  });
});
