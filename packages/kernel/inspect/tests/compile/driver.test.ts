import type { IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite, defineThemeStyle, NodeOwnerOutputSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, strictObject, string, ZodError } from 'zod';

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
  schema: CompositeBaseSchema.extend({ namespace: literal(owner.namespace), type: literal(owner.type) }),
  artifactSchema: strictObject({ label: string() }),
  compile: () => ({ artifact: { label: 'settled' }, children: [{ type: 'node', position: [0, 0], text: 'primary' }] }),
});
const ir: IRScene = { version: 1, type: 'scene', children: [{ namespace: owner.namespace, type: owner.type }] };
const selection = {
  rules: [
    {
      kind: 'request' as const,
      inspector: key,
      target: { kind: 'self' as const, locator: { kind: 'authored' as const, sourcePath: 'children[0]' } },
      options: true as const,
    },
  ],
};

describe('Inspection compile driver', () => {
  it('uses the admitted Source value when an option parser changes its representation', () => {
    const inspector = defineInspector({
      ...key,
      owner,
      subjectSchema: strictObject({ label: string() }),
      optionsSchema: strictObject({ label: string().transform(label => `${label}!`) }),
      resolveOptions: options => options,
      inspect: (_subject, context) => [{ type: 'node', position: [0, 0], text: context.options.label }],
    });
    const result = compileInspectionToScene(ir, {
      registry: createInspectorRegistry([inspector]),
      selection: { rules: [{ ...selection.rules[0], options: { label: 'once' } }] },
      compileOptions: { composites: [composite] },
    });
    expect(JSON.stringify(result.inspection)).toContain('once!');
    expect(JSON.stringify(result.inspection)).not.toContain('once!!');
  });

  it('keeps resolver failure atomic and preserves its selection origin and cause', () => {
    const cause = new Error('Cannot resolve options');
    const inspector = defineInspector({
      ...key,
      owner,
      subjectSchema: strictObject({ label: string() }),
      optionsSchema: strictObject({}),
      resolveOptions: () => {
        throw cause;
      },
      inspect: () => [],
    });
    expect(() =>
      compileInspectionToScene(ir, {
        registry: createInspectorRegistry([inspector]),
        selection,
        compileOptions: { composites: [composite] },
      }),
    ).toThrow(
      expect.objectContaining({
        cause,
        details: expect.objectContaining({ origin: expect.objectContaining({ stage: 'selection', ruleIndex: 0 }) }),
      }),
    );
  });
  it('resolves appearance from the captured occurrence Theme', () => {
    let appearance:
      | {
          colorScope: number;
          scopeColor: string;
          semanticColors: {
            error: string;
            success: string;
            warning: string;
            guide: string;
          };
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
        subjectSchema: strictObject({ label: literal('settled') }),
        optionsSchema: strictObject({}),
        resolveOptions: options => options,
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

    expect(appearance).toEqual({
      colorScope: 0,
      scopeColor: '#scope',
      semanticColors: { error: '#error', success: '#success', warning: '#warning', guide: '#guide' },
    });
    expect(Object.isFrozen(appearance?.semanticColors)).toBe(true);
  });

  it('validates the subject and compiles each dense output into a sealed entry', () => {
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: strictObject({ label: literal('settled') }),
        optionsSchema: strictObject({}),
        resolveOptions: options => options,
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
        subjectSchema: strictObject({ label: string() }),
        optionsSchema: strictObject({}),
        resolveOptions: options => options,
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
          options: true as const,
        },
      ],
    };
    const mutatingComposite = defineComposite({
      namespace: owner.namespace,
      type: owner.type,
      schema: CompositeBaseSchema.extend({ namespace: literal(owner.namespace), type: literal(owner.type) }),
      artifactSchema: strictObject({ label: string() }),
      compile: () => {
        mutableSelection.rules.length = 0;
        return { artifact: { label: 'settled' }, children: [] };
      },
    });
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: strictObject({ label: string() }),
        optionsSchema: strictObject({}),
        resolveOptions: options => options,
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

  it('validates all subjects before invoking any Inspector callback', () => {
    let callbacks = 0;
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: strictObject({ label: literal('different') }),
        optionsSchema: strictObject({}),
        resolveOptions: options => options,
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
        subjectSchema: strictObject({ label: string() }),
        optionsSchema: strictObject({}),
        resolveOptions: options => options,
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

  it('reports invalid callback data from the Core Child owner schema', () => {
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        subjectSchema: strictObject({ label: string() }),
        optionsSchema: strictObject({}),
        resolveOptions: options => options,
        inspect: () =>
          ({
            type: 'node',
            position: [0, 0],
            text: 'invalid',
            extension: () => 'not JSON',
          }) as unknown as { type: 'node'; position: [number, number]; text: string },
      }),
    ]);
    try {
      compileInspectionToScene(ir, { registry, selection, compileOptions: { composites: [composite] } });
      throw new Error('expected compile to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(RetikzInspectError);
      expect((error as RetikzInspectError).code).toBe(RetikzInspectErrorCode.CompileFailed);
      expect((error as RetikzInspectError).cause).toBeInstanceOf(ZodError);
      expect((error as RetikzInspectError).details.origin).toMatchObject({ stage: 'output', outputIndex: 0 });
    }
  });

  it('places mixed local and scene fragments independently and preserves context warnings', () => {
    const nodeScene: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 20, y: 10 }],
          children: [{ type: 'node', id: 'node-a', position: [0, 0], text: 'A' }],
        },
      ],
    };
    const nodeKey = { namespace: 'test', type: 'node-scene' };
    const nodeInspector = defineInspector({
      ...nodeKey,
      owner: { kind: 'node' as const },
      subjectSchema: NodeOwnerOutputSchema,
      optionsSchema: strictObject({}),
      resolveOptions: options => options,
      inspect: (_subject, context) => {
        expect(context.transform).toEqual([1, 0, 0, 1, 20, 10]);
        expect(context.ancestors).toHaveLength(1);
        expect(context.ancestors[0]?.owner).toEqual({ kind: 'scope' });
        expect(typeof context.warn).toBe('function');
        context.warn('OptionalGeometry', 'key points are unavailable');
        return [
          {
            type: 'fragment',
            coordinateSpace: 'scene',
            child: { type: 'node', position: [20, 10], text: 'scene output' },
          },
          { type: 'node', position: [0, 0], text: 'local output' },
          {
            type: 'fragment',
            coordinateSpace: 'local',
            child: { type: 'node', position: [0, 0], text: 'explicit local' },
          },
        ];
      },
    });

    const result = compileInspectionToScene(nodeScene, {
      registry: createInspectorRegistry([nodeInspector]),
      selection: {
        rules: [{ kind: 'request', inspector: nodeKey, target: { kind: 'scene' }, options: true }],
      },
      compileOptions: { padding: 0 },
    });

    expect(result.inspection?.entries).toHaveLength(3);
    expect(result.inspection?.entries[0]?.transform).toEqual([1, 0, 0, 1, 0, 0]);
    expect(result.inspection?.entries[1]?.transform).toEqual([1, 0, 0, 1, 20, 10]);
    expect(result.inspection?.entries[2]?.transform).toEqual([1, 0, 0, 1, 20, 10]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        cause: { code: 'OptionalGeometry', message: 'key points are unavailable', path: expect.any(String) },
      }),
    ]);
  });
});
