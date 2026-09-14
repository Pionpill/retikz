import type { IRScene } from '@retikz/core';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { boolean, literal, strictObject } from 'zod';

import { compileInspectionToScene, createInspectorRegistry, defineInspector } from '../../src';

describe('Inspection diagnostics', () => {
  it('keeps callback warnings before fragment warnings in a deeply frozen diagnostic list', () => {
    const owner = { kind: 'composite' as const, namespace: 'demo', type: 'warning-owner' };
    const key = { namespace: 'test', type: 'warning' };
    const composite = defineComposite({
      namespace: owner.namespace,
      type: owner.type,
      schema: CompositeBaseSchema.extend({ namespace: literal(owner.namespace), type: literal(owner.type) }),
      artifactSchema: strictObject({ ok: boolean() }),
      compile: () => ({ artifact: { ok: true }, children: [] }),
    });
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: strictObject({ ok: boolean() }),
        optionsSchema: strictObject({}),
        resolveOptions: options => options,
        inspect: (_subject, context) => {
          context.warn('OptionalFacet', 'This facet is unavailable');
          return {
            type: 'path',
            children: [
              { type: 'step', kind: 'line', to: [0, 0] },
              { type: 'step', kind: 'line', to: [1, 1] },
            ],
          };
        },
      }),
    ]);
    const ir: IRScene = { version: 1, type: 'scene', children: [{ namespace: owner.namespace, type: owner.type }] };
    const result = compileInspectionToScene(ir, {
      registry,
      selection: { rules: [{ kind: 'request', inspector: key, target: { kind: 'scene' }, options: true }] },
      compileOptions: { composites: [composite] },
    });
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics[0]).toMatchObject({
      origin: { stage: 'inspect', inspector: key, owner },
      cause: { code: 'OptionalFacet', message: 'This facet is unavailable', path: expect.any(String) },
    });
    expect(result.diagnostics[1]).toMatchObject({
      origin: { stage: 'fragment', inspector: key, outputIndex: 0 },
      cause: { code: expect.any(String), message: expect.any(String), path: expect.any(String) },
    });
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
    expect(Object.isFrozen(result.diagnostics[0]?.cause)).toBe(true);
  });
});
