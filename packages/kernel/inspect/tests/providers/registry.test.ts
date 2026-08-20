import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  createDefaultInspectorRegistry,
  createInspectorRegistry,
  defineInspector,
  STROKE_PATH_INSPECTOR_KEY,
} from '../../src';

const definition = (namespace: string, type: string) =>
  defineInspector({
    namespace,
    type,
    owner: { kind: 'pathKind' as const, name: 'stroke' },
    subjectSchema: z.strictObject({ value: z.string() }),
    optionsInputSchema: z.strictObject({}),
    optionsSchema: z.strictObject({}),
    inspect: () => [],
  });

describe('Inspector registry', () => {
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
    expect(registry.get(STROKE_PATH_INSPECTOR_KEY)).toBeDefined();
    expect(registry.get({ namespace: 'third-party', type: 'points' })).toBeDefined();
  });
});
