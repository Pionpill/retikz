import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  createDefaultInspectorRegistry,
  createInspectorRegistry,
  defineInspector,
  STROKE_PATH_INSPECTOR_KEY,
} from '../../src';

const definition = (namespace: string, name: string) =>
  defineInspector({
    namespace,
    name,
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
    expect(registry.get({ namespace: 'third-party', name: 'points' })?.name).toBe('points');
    expect(Object.isFrozen(registry.definitions)).toBe(true);
  });

  it('fails loudly on a complete namespace and name duplicate', () => {
    expect(() => createInspectorRegistry([definition('same', 'key'), definition('same', 'key')])).toThrow(/duplicate/i);
  });

  it('registers the stroke builtin through the same default path', () => {
    const registry = createDefaultInspectorRegistry([definition('third-party', 'points')]);
    expect(registry.get(STROKE_PATH_INSPECTOR_KEY)).toBeDefined();
    expect(registry.get({ namespace: 'third-party', name: 'points' })).toBeDefined();
  });
});
