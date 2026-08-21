import type { IRScene } from '@retikz/core';

import { CompositeBaseSchema, defineComposite, defineThemeStyle } from '@retikz/core';
import { RetikzError } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  compileInspectionToScene,
  createInspectorRegistry,
  defineInspector,
  RetikzInspectError,
  RetikzInspectErrorCode,
} from '../../src';

const key = { namespace: 'test', type: 'artifact' };
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
  it('resolves appearance from the captured occurrence Theme', () => {
    let appearance:
      | {
          colorScope: number;
          scopeColor: string;
          guideColor: string;
          warningColor: string;
        }
      | undefined;
    const themeStyle = defineThemeStyle({
      name: 'inspect-brand',
      resolve: () => ({
        semantic: { error: '#error', success: '#success', warning: '#warning', guide: '#guide' },
        categorical: ['#scope'],
      }),
    });
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: z.strictObject({ label: z.literal('settled') }),
        optionsInputSchema: z.strictObject({}),
        optionsSchema: z.strictObject({}),
        inspect: (_subject, context) => {
          appearance = context.appearance;
          return [];
        },
      }),
    ]);

    compileInspectionToScene(
      { ...ir, theme: { style: themeStyle.name } },
      { registry, selection, compileOptions: { composites: [composite], themeStyles: [themeStyle] } },
    );

    expect(appearance).toEqual({ colorScope: 0, scopeColor: '#scope', guideColor: '#guide', warningColor: '#warning' });
  });

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
      expect(error).toBeInstanceOf(RetikzInspectError);
      expect(error).toBeInstanceOf(RetikzError);
      expect((error as RetikzInspectError).code).toBe(RetikzInspectErrorCode.CompileFailed);
      expect((error as RetikzInspectError).details.origin).toMatchObject({
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
    ).toThrow(RetikzInspectError);
    expect(callbacks).toBe(0);
    try {
      compileInspectionToScene(ir, { registry, selection, compileOptions: { composites: [composite] } });
    } catch (error) {
      expect((error as RetikzInspectError).details.origin).toMatchObject({ stage: 'subject', inspector: key });
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
      expect(error).toBeInstanceOf(RetikzInspectError);
      expect((error as RetikzInspectError).details.origin).toMatchObject({ stage: 'fragment', outputIndex: 0 });
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
