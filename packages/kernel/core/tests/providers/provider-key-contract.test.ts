import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IR } from '../../src';

import {
  BUILTIN_PATH_KINDS,
  BUILTIN_SHAPES,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  definePathGenerator,
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
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', shape: 'ring', position: [0, 0], text: '' }],
    };

    expect(() => compileToScene(ir, { shapes: [ring] })).not.toThrow();
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
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', shape: 'rectangle', position: [0, 0], text: '' }],
    };

    expect(() => compileToScene(ir, { shapes: [rectangle] })).toThrow(/duplicate shape registration: "rectangle"/);
  });

  it('path_generator_definition_declares_name_and_compiles_from_array_options', () => {
    const segment = definePathGenerator({
      name: 'segment',
      paramsSchema: z.object({}),
      generate: ({ from }) => [{ kind: 'line', to: [from[0] + 10, from[1]] }],
    });
    const ir: IR = {
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

    expect(() => compileToScene(ir, { pathGenerators: [segment] })).not.toThrow();
  });

  it('path_kind_definitions_are_keyed_by_schema_literal_kind', () => {
    const pathKindNames = BUILTIN_PATH_KINDS.map(def => def.schema.shape.kind.value).sort();

    expect(pathKindNames).toEqual(['ribbon', 'stroke']);
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
      expand: () => ({ type: 'node', id: 'badge', position: [0, 0], text: 'B' }),
    });
    const ir: IR = { version: 1, type: 'scene', children: [{ namespace: 'demo', type: 'badge' }] };

    expect(() => compileToScene(ir, { composites: [badge] })).not.toThrow();
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
        expand: () => [],
      }),
    ).toThrow(/namespace.*declared.*actual/s);
  });
});
