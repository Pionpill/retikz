import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { AnyCoordinateDefinition } from '../../../src/contract';

import * as plot from '../../../src';
import { createCoordinateFrame, defineCoordinate, extractCoordinateType } from '../../../src/contract';
import { BUILTIN_COORDINATES, resolveCoordinateRegistry } from '../../../src/providers';
import { PlotCoordinate } from '../../../src/schemas';

const archDefinition = defineCoordinate({
  schema: z
    .object({
      type: z.literal('arch').describe('Discriminator: custom arch coordinate operation'),
      archHeight: z.number().positive().describe('Arch height in user units'),
    })
    .describe('Arch coordinate operation'),
  roles: ['x'],
  resolve: (operation, ctx) => {
    const values = ctx.collectRoleValues('x');
    const scaleDef = ctx.resolveScaleForRole('x', undefined, values);
    const scale = ctx.buildPositionScale(scaleDef, values, [0, ctx.width]);
    return {
      frame: createCoordinateFrame('arch', ['x'], ([value]) => {
        const x = scale.coordinate(value);
        return Number.isFinite(x) ? [x, ctx.height - operation.archHeight] : null;
      }),
      plotArea: { x: 0, y: 0, width: ctx.width, height: ctx.height },
      gridLayers: [],
      axisLayers: [],
    };
  },
});

describe('coordinate registry（contract spec）', () => {
  it('defineCoordinate 保留 schema 推导出的注册 type 与 roles', () => {
    expect(extractCoordinateType(archDefinition.schema)).toBe('arch');
    expect(archDefinition.roles).toEqual(['x']);
  });

  it('public_barrel_exports_coordinate_definition_helpers', () => {
    expect(plot.defineCoordinate).toBe(defineCoordinate);
    expect(plot.createCoordinateFrame).toBe(createCoordinateFrame);
    expect('createCustomCoordinate' in plot).toBe(false);
    expect(plot.extractCoordinateType).toBe(extractCoordinateType);
    expect(plot.resolveCoordinateRegistry).toBe(resolveCoordinateRegistry);
  });

  it('resolveCoordinateRegistry 接受自定义 definition 数组并按 type 注册', () => {
    const registry = resolveCoordinateRegistry([archDefinition]);
    expect(registry.get('arch')).toBe(archDefinition);
  });

  it('builtin_coordinate_definitions_cover_public_builtin_types', () => {
    expect(BUILTIN_COORDINATES.map(def => extractCoordinateType(def.schema)).sort()).toEqual(
      Object.values(PlotCoordinate).sort(),
    );
  });

  it('duplicate_coordinate_type_throws', () => {
    expect(() => resolveCoordinateRegistry([archDefinition, archDefinition])).toThrow(
      /duplicate coordinate registration: "arch"/,
    );
  });

  it('duplicate_builtin_coordinate_type_throws', () => {
    const malformed: AnyCoordinateDefinition = {
      schema: z.object({ type: z.literal(PlotCoordinate.Cartesian2D).describe('Collides with a built-in coordinate') }),
      roles: ['x'],
      resolve: archDefinition.resolve,
    };
    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/duplicate coordinate registration: "cartesian2D"/);
  });

  it('malformed_coordinate_schema_non_object_throws', () => {
    const malformed: AnyCoordinateDefinition = {
      schema: z.string(),
      roles: ['x'],
      resolve: archDefinition.resolve,
    };
    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/ZodObject/);
  });

  it('malformed_coordinate_schema_without_literal_type_throws', () => {
    const malformed: AnyCoordinateDefinition = {
      schema: z.object({ type: z.string().describe('Not a literal type') }).describe('Malformed coordinate operation'),
      roles: ['x'],
      resolve: archDefinition.resolve,
    };
    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/z\.literal/);
  });

  it('malformed_coordinate_schema_empty_literal_type_throws', () => {
    const malformed: AnyCoordinateDefinition = {
      schema: z.object({ type: z.literal('').describe('Empty custom coordinate type') }),
      roles: ['x'],
      resolve: archDefinition.resolve,
    };
    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/non-empty z\.literal string/);
  });

  it('empty_coordinate_role_throws', () => {
    const malformed: AnyCoordinateDefinition = { ...archDefinition, roles: [''] };
    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/non-empty coordinate role/);
  });

  it('duplicate_coordinate_role_throws', () => {
    const malformed: AnyCoordinateDefinition = { ...archDefinition, roles: ['x', 'x'] };
    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/duplicate coordinate role: "x"/);
  });

  it('custom_schema_rejects_invalid_config', () => {
    expect(() => archDefinition.schema.parse({ type: 'arch', archHeight: -1 })).toThrow();
    expect(archDefinition.schema.parse({ type: 'arch', archHeight: 30 })).toEqual({ type: 'arch', archHeight: 30 });
  });

  it('definition_operation_json_round_trip', () => {
    const operation = { type: 'arch', archHeight: 30 };
    expect(archDefinition.schema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });
});
