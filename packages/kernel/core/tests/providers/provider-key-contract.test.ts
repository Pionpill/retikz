import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRScene } from '../../src';

import {
  BUILTIN_PATH_KINDS,
  BUILTIN_SHAPES,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  definePathGenerator,
  definePathKind,
  defineShape,
} from '../../src';

describe('provider key contract', () => {
  it('shape_definitions_declare_their_registry_name', () => {
    const shapeNames = BUILTIN_SHAPES.map(def => def.name).sort();

    expect(shapeNames).toContain('rectangle');
    expect(shapeNames).toContain('ellipse');
    expect(new Set(shapeNames).size).toBe(shapeNames.length);
  });

  it('custom_shape_uses_definition_name_not_record_key', () => {
    const ring = defineShape({
      name: 'ring',
      paramsSchema: z.object({}),
      circumscribe: () => ({ halfWidth: 10, halfHeight: 10 }),
      boundaryPoint: rect => [rect.x + rect.width / 2, rect.y],
      anchor: (rect, name) => (name === 'center' ? [rect.x, rect.y] : undefined),
      emit: () => [{ type: 'ellipse', cx: 0, cy: 0, rx: 10, ry: 10 }],
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', shape: 'ring', position: [0, 0], text: '' }],
    };

    expect(() => compileToScene(ir, { shapes: [ring] }).scene).not.toThrow();
  });

  it('custom_shape_cannot_override_a_builtin_name', () => {
    const rectangle = defineShape({
      name: 'rectangle',
      paramsSchema: z.object({}),
      circumscribe: () => ({ halfWidth: 1, halfHeight: 1 }),
      boundaryPoint: rect => [rect.x + rect.width / 2, rect.y],
      anchor: (rect, name) => (name === 'center' ? [rect.x, rect.y] : undefined),
      emit: () => [],
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', shape: 'rectangle', position: [0, 0], text: '' }],
    };

    expect(() => compileToScene(ir, { shapes: [rectangle] }).scene).toThrow(
      /duplicate shape registration: "rectangle"/,
    );
  });

  it('path_generator_definition_declares_name_and_compiles_from_array_options', () => {
    const segment = definePathGenerator({
      name: 'segment',
      paramsSchema: z.object({}),
      generate: ({ from }) => [{ kind: 'line', to: [from[0] + 10, from[1]] }],
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'segment', params: {} },
          ],
        },
      ],
    };

    expect(() => compileToScene(ir, { pathGenerators: [segment] }).scene).not.toThrow();
  });

  it.each(['', ' ', '\u2003', '\ufeff'])(
    'path generator rejects a blank name with the established error (%j)',
    name => {
      expect(() =>
        definePathGenerator({
          name,
          paramsSchema: z.object({}),
          generate: () => [],
        }),
      ).toThrowError('definePathGenerator: name must be a non-empty string.');
    },
  );

  it('path_kind_definitions_are_keyed_by_schema_literal_kind', () => {
    const pathKindNames = BUILTIN_PATH_KINDS.map(def => def.schema.shape.kind.value).sort();

    expect(pathKindNames).toEqual(['ribbon', 'stroke']);
  });

  it.each(['', ' ', '\u2003', '\ufeff'])('path kind rejects a blank schema literal (%j)', kind => {
    expect(() =>
      definePathKind({
        schema: z.object({ kind: z.literal(kind) }),
        compile: () => null,
      }),
    ).toThrowError('definePathKind: schema.shape.kind must be a non-empty z.literal string.');
  });

  it('composite_definition_declares_namespace_and_type_as_provider_key', () => {
    const schema = CompositeBaseSchema.extend({
      namespace: z.literal('demo'),
      type: z.literal('badge'),
    });
    const badge = defineComposite({
      namespace: 'demo',
      type: 'badge',
      schema,
      expand: () => ({ children: [{ type: 'node', id: 'badge', position: [0, 0], text: 'B' }] }),
    });
    const ir: IRScene = { version: 1, type: 'scene', children: [{ namespace: 'demo', type: 'badge' }] };

    expect(() => compileToScene(ir, { composites: [badge] }).scene).not.toThrow();
  });

  it('composite_schema_literal_must_match_declared_provider_key', () => {
    const schema = CompositeBaseSchema.extend({
      namespace: z.literal('actual'),
      type: z.literal('badge'),
    });

    expect(() =>
      defineComposite({
        namespace: 'declared',
        type: 'badge',
        schema,
        expand: () => ({ children: [] }),
      }),
    ).toThrow(/namespace.*declared.*actual/s);
  });

  it.each(['', ' ', '\u2003', '\ufeff'])('composite rejects a blank namespace literal (%j)', namespace => {
    expect(() =>
      defineComposite({
        namespace: 'demo',
        type: 'badge',
        schema: CompositeBaseSchema.extend({
          namespace: z.literal(namespace),
          type: z.literal('badge'),
        }),
        expand: () => ({ children: [] }),
      }),
    ).toThrowError('defineComposite: schema.namespace must be a non-empty z.literal string.');
  });

  it.each(['', ' ', '\u2003', '\ufeff'])('composite rejects a blank type literal (%j)', type => {
    expect(() =>
      defineComposite({
        namespace: 'demo',
        type: 'badge',
        schema: CompositeBaseSchema.extend({
          namespace: z.literal('demo'),
          type: z.literal(type),
        }),
        expand: () => ({ children: [] }),
      }),
    ).toThrowError('defineComposite: schema.type must be a non-empty z.literal string.');
  });

  it('composite_object_union_declares_one_shared_provider_key', () => {
    const schema = z.union([
      CompositeBaseSchema.extend({
        namespace: z.literal('demo'),
        type: z.literal('badge'),
        variant: z.literal('text'),
        text: z.string(),
      }),
      CompositeBaseSchema.extend({
        namespace: z.literal('demo'),
        type: z.literal('badge'),
        variant: z.literal('count'),
        count: z.number(),
      }),
    ]);
    const badge = defineComposite({
      namespace: 'demo',
      type: 'badge',
      schema,
      expand: node => ({
        children: [
          {
            type: 'node',
            position: [0, 0],
            text: node.variant === 'text' ? node.text : String(node.count),
          },
        ],
      }),
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { namespace: 'demo', type: 'badge', variant: 'text', text: 'A' },
        { namespace: 'demo', type: 'badge', variant: 'count', count: 2 },
      ],
    };

    expect(() => compileToScene(ir, { composites: [badge] }).scene).not.toThrow();
  });

  it('composite_object_union_rejects_unreadable_or_mixed_provider_keys', () => {
    const base = CompositeBaseSchema.extend({
      namespace: z.literal('demo'),
      type: z.literal('badge'),
      variant: z.literal('base'),
    });
    const definitionOf = (schema: z.ZodType) =>
      defineComposite({ namespace: 'demo', type: 'badge', schema, expand: () => ({ children: [] }) });

    expect(() => definitionOf(z.union([base, z.string()]))).toThrow(/union option 1.*ZodObject/i);
    expect(() =>
      definitionOf(
        z.union([
          base,
          CompositeBaseSchema.extend({
            namespace: z.string(),
            type: z.literal('badge'),
            variant: z.literal('dynamicNamespace'),
          }),
        ]),
      ),
    ).toThrow(/union option 1.*namespace.*literal/i);
    expect(() =>
      definitionOf(
        z.union([
          base,
          CompositeBaseSchema.extend({
            namespace: z.literal('other'),
            type: z.literal('badge'),
            variant: z.literal('otherNamespace'),
          }),
        ]),
      ),
    ).toThrow(/union option 1.*namespace.*demo.*other|union option 1.*namespace.*other.*demo/i);
    expect(() =>
      definitionOf(
        z.union([
          base,
          CompositeBaseSchema.extend({
            namespace: z.literal('demo'),
            type: z.literal('panel'),
            variant: z.literal('otherType'),
          }),
        ]),
      ),
    ).toThrow(/union option 1.*type.*badge.*panel|union option 1.*type.*panel.*badge/i);
  });
});
