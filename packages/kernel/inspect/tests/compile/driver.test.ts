import type { IRScene } from '@retikz/core';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { compileInspectionToScene, createInspectorRegistry, defineInspector, InspectionCompileError } from '../../src';

const key = { namespace: 'test', name: 'artifact' };
const owner = { kind: 'composite' as const, namespace: 'demo', type: 'artifact' };
const composite = defineComposite({
  namespace: owner.namespace,
  type: owner.type,
  schema: CompositeBaseSchema.extend({ namespace: z.literal(owner.namespace), type: z.literal(owner.type) }),
  artifactSchema: z.strictObject({ label: z.string() }),
  compile: () => ({ artifact: { label: 'settled' }, children: [{ type: 'node', position: [0, 0], text: 'primary' }] }),
});
const ir: IRScene = { version: 1, type: 'scene', children: [{ namespace: owner.namespace, type: owner.type }] };
const selection = {
  rules: [
    {
      kind: 'request' as const,
      inspector: key,
      target: { kind: 'self' as const, locator: { kind: 'authored' as const, sourcePath: 'children[0]' } },
      value: true as const,
    },
  ],
};

describe('Inspection compile driver', () => {
  it('validates the subject and compiles each dense output into a sealed entry', () => {
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: z.strictObject({ label: z.literal('settled') }),
        optionsInputSchema: z.strictObject({}),
        optionsSchema: z.strictObject({}),
        inspect: (_subject, context) => [
          {
            type: 'node',
            id: 'private-a',
            meta: { source: 'inspect' },
            position: [0, 0],
            text: `${context.appearance.colorScope}`,
          },
          { type: 'node', id: 'private-b', position: [10, 0], text: 'b' },
        ],
      }),
    ]);

    const result = compileInspectionToScene(ir, {
      registry,
      selection,
      compileOptions: { composites: [composite], padding: 0 },
    });
    expect(result.primary.scene.primitives).toHaveLength(1);
    expect(result.inspection?.entries).toHaveLength(2);
    expect(result.inspection?.entries[0]?.scene.primitives[0]).not.toHaveProperty('id');
    expect(result.inspection?.entries[0]?.scene.primitives[0]).not.toHaveProperty('meta');
    expect(result.diagnostics).toEqual([]);
    expect(Object.isFrozen(result.inspection?.entries)).toBe(true);
  });

  it('keeps a selected empty callback color scope without creating a plane', () => {
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: z.strictObject({ label: z.string() }),
        optionsInputSchema: z.strictObject({}),
        optionsSchema: z.strictObject({}),
        inspect: (_subject, context) => {
          expect(context.appearance.colorScope).toBe(0);
          return [];
        },
      }),
    ]);
    const result = compileInspectionToScene(ir, { registry, selection, compileOptions: { composites: [composite] } });
    expect(result.inspection).toBeNull();
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
  });

  it('captures selection before traversal so provider code cannot change final resolution', () => {
    const mutableSelection = {
      rules: [
        {
          kind: 'request' as const,
          inspector: key,
          target: { kind: 'self' as const, locator: { kind: 'authored' as const, sourcePath: 'children[0]' } },
          value: true as const,
        },
      ],
    };
    const mutatingComposite = defineComposite({
      namespace: owner.namespace,
      type: owner.type,
      schema: CompositeBaseSchema.extend({ namespace: z.literal(owner.namespace), type: z.literal(owner.type) }),
      artifactSchema: z.strictObject({ label: z.string() }),
      compile: () => {
        mutableSelection.rules.length = 0;
        return { artifact: { label: 'settled' }, children: [] };
      },
    });
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: z.strictObject({ label: z.string() }),
        optionsInputSchema: z.strictObject({}),
        optionsSchema: z.strictObject({}),
        inspect: () => ({ type: 'node', position: [0, 0], text: 'captured' }),
      }),
    ]);

    const result = compileInspectionToScene(ir, {
      registry,
      selection: mutableSelection,
      compileOptions: { composites: [mutatingComposite] },
    });

    expect(mutableSelection.rules).toEqual([]);
    expect(result.inspection?.entries).toHaveLength(1);
  });

  it('rejects sparse output and preserves a structured output origin', () => {
    const sparse = new Array(1) as Array<never>;
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: z.strictObject({ label: z.string() }),
        optionsInputSchema: z.strictObject({}),
        optionsSchema: z.strictObject({}),
        inspect: () => sparse,
      }),
    ]);
    try {
      compileInspectionToScene(ir, { registry, selection, compileOptions: { composites: [composite] } });
      throw new Error('expected compile to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(InspectionCompileError);
      expect((error as InspectionCompileError).origin).toMatchObject({
        stage: 'output',
        outputIndex: 0,
        inspector: key,
      });
    }
  });

  it('validates all subjects before invoking any Inspector callback', () => {
    let callbacks = 0;
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: z.strictObject({ label: z.literal('different') }),
        optionsInputSchema: z.strictObject({}),
        optionsSchema: z.strictObject({}),
        inspect: () => {
          callbacks += 1;
          return [];
        },
      }),
    ]);
    expect(() =>
      compileInspectionToScene(ir, { registry, selection, compileOptions: { composites: [composite] } }),
    ).toThrow(InspectionCompileError);
    expect(callbacks).toBe(0);
    try {
      compileInspectionToScene(ir, { registry, selection, compileOptions: { composites: [composite] } });
    } catch (error) {
      expect((error as InspectionCompileError).origin).toMatchObject({ stage: 'subject', inspector: key });
    }
  });

  it('rejects a cross-primary fragment reference with a fragment origin', () => {
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: z.strictObject({ label: z.string() }),
        optionsInputSchema: z.strictObject({}),
        optionsSchema: z.strictObject({}),
        inspect: () => ({
          type: 'node',
          position: { kind: 'anchor', target: { id: 'primary-node' } },
          text: 'invalid reference',
        }),
      }),
    ]);
    const primaryWithId = defineComposite({
      ...composite,
      compile: () => ({
        artifact: { label: 'settled' },
        children: [{ type: 'node', id: 'primary-node', position: [0, 0], text: 'primary' }],
      }),
    });
    try {
      compileInspectionToScene(ir, { registry, selection, compileOptions: { composites: [primaryWithId] } });
      throw new Error('expected compile to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(InspectionCompileError);
      expect((error as InspectionCompileError).origin).toMatchObject({ stage: 'fragment', outputIndex: 0 });
    }
  });

  it('rejects non-JSON callback data before fragment compilation', () => {
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: z.strictObject({ label: z.string() }),
        optionsInputSchema: z.strictObject({}),
        optionsSchema: z.strictObject({}),
        inspect: () =>
          ({
            type: 'node',
            position: [0, 0],
            text: 'invalid',
            extension: () => 'not JSON',
          }) as unknown as { type: 'node'; position: [number, number]; text: string },
      }),
    ]);
    expect(() =>
      compileInspectionToScene(ir, { registry, selection, compileOptions: { composites: [composite] } }),
    ).toThrow(/JSON-safe/);
  });
});
