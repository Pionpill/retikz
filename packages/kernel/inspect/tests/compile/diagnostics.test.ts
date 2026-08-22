import type { IRScene } from '@retikz/core';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { compileInspectionToScene, createInspectorRegistry, defineInspector } from '../../src';

describe('Inspection diagnostics', () => {
  it('keeps fragment warnings in a deeply frozen stable diagnostic list', () => {
    const owner = { kind: 'composite' as const, namespace: 'demo', type: 'warning-owner' };
    const key = { namespace: 'test', type: 'warning' };
    const composite = defineComposite({
      namespace: owner.namespace,
      type: owner.type,
      schema: CompositeBaseSchema.extend({ namespace: z.literal(owner.namespace), type: z.literal(owner.type) }),
      artifactSchema: z.strictObject({ ok: z.boolean() }),
      compile: () => ({ artifact: { ok: true }, children: [] }),
    });
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: z.strictObject({ ok: z.boolean() }),
        optionsInputSchema: z.strictObject({}),
        optionsSchema: z.strictObject({}),
        inspect: () => ({
          type: 'path',
          children: [
            { type: 'step', kind: 'line', to: [0, 0] },
            { type: 'step', kind: 'line', to: [1, 1] },
          ],
        }),
      }),
    ]);
    const ir: IRScene = { version: 1, type: 'scene', children: [{ namespace: owner.namespace, type: owner.type }] };
    const result = compileInspectionToScene(ir, {
      registry,
      selection: { rules: [{ kind: 'request', inspector: key, target: { kind: 'scene' }, options: true }] },
      compileOptions: { composites: [composite] },
    });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      origin: { stage: 'fragment', inspector: key, outputIndex: 0 },
      cause: { code: expect.any(String), message: expect.any(String), path: expect.any(String) },
    });
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
    expect(Object.isFrozen(result.diagnostics[0]?.cause)).toBe(true);
  });
});
