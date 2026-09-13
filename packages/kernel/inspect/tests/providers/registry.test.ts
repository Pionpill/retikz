import { describe, expect, it } from 'vitest';
import { strictObject, string } from 'zod';

import {
  createDefaultInspectorRegistry,
  createInspectorRegistry,
  defineInspector,
  PATH_INSPECTOR_KEY,
} from '../../src';

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
    const authored = defineInspector(rawDefinition);
    const registered = createInspectorRegistry([rawDefinition]).require(rawDefinition);
    expect(authored.resolveOptions(authored.optionsSchema.parse({}))).toEqual({});
    for (const candidate of [authored, registered]) {
      expect(candidate.optionsSchema.parse({})).toEqual({});
      expect(() => candidate.optionsSchema.parse({ unexpected: true })).toThrow();
      expect(Object.isFrozen(candidate)).toBe(true);
      expect(createInspectorRegistry([candidate]).require(candidate)).toBe(candidate);
    }
  });

  it('preserves a custom resolver when the options schema is omitted', () => {
    const inspector = defineInspector({
      namespace: 'test',
      type: 'resolved-empty',
      owner: { kind: 'path', name: 'stroke' },
      subjectSchema: strictObject({ value: string() }),
      resolveOptions: () => ({ label: 'marker' }),
      inspect: (_subject, context) => ({ type: 'node', position: [0, 0], content: context.options.label }),
    });
    expect(inspector.resolveOptions(inspector.optionsSchema.parse({}))).toEqual({ label: 'marker' });
  });

  it('reuses a validated definition across registries', () => {
    const inspector = definition('test', 'reused');
    expect(createInspectorRegistry([inspector]).require(inspector)).toBe(inspector);
    expect(createInspectorRegistry([inspector]).require(inspector)).toBe(inspector);
    expect(defineInspector(inspector)).toBe(inspector);
  });

  it('validates and snapshots a directly supplied definition', () => {
    const rawDefinition = { ...definition('test', 'raw'), owner: { kind: 'path' as const, name: 'stroke' } };
    const registered = createInspectorRegistry([rawDefinition]).require(rawDefinition);
    rawDefinition.owner.name = 'changed';
    expect(registered.owner).toEqual({ kind: 'path', name: 'stroke' });
    expect(Object.isFrozen(registered)).toBe(true);
    expect(Object.isFrozen(registered.owner)).toBe(true);
    expect(createInspectorRegistry([registered]).require(registered)).toBe(registered);
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
    expect(registry.definitions).toHaveLength(2);
    expect(registry.get({ namespace: 'third-party', type: 'points' })?.type).toBe('points');
    expect(Object.isFrozen(registry.definitions)).toBe(true);
  });

  it('fails loudly on a complete namespace and type duplicate', () => {
    expect(() => createInspectorRegistry([definition('same', 'key'), definition('same', 'key')])).toThrow(/duplicate/i);
  });

  it('keeps distinct keys separate when namespace or type contains a NUL character', () => {
    const first = definition('a\u0000b', 'c');
    const second = definition('a', 'b\u0000c');

    const registry = createInspectorRegistry([first, second]);

    expect(registry.get({ namespace: first.namespace, type: first.type })).toMatchObject({
      namespace: first.namespace,
      type: first.type,
    });
    expect(registry.get({ namespace: second.namespace, type: second.type })).toMatchObject({
      namespace: second.namespace,
      type: second.type,
    });
  });

  it('registers the stroke builtin through the same default path', () => {
    const registry = createDefaultInspectorRegistry([definition('third-party', 'points')]);
    expect(registry.get(PATH_INSPECTOR_KEY)).toBeDefined();
    expect(registry.get({ namespace: 'third-party', type: 'points' })).toBeDefined();
  });
});
