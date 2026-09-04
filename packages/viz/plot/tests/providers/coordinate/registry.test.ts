import { describe, expect, it } from 'vitest';
import { literal, number, object, string } from 'zod';

import type { AnyCoordinateDefinition } from '../../../src/contract';

import * as plot from '../../../src';
import {
  bindCoordinateScaleNames,
  createCoordinateFrame,
  defineCoordinate,
  extractCoordinateType,
  readCoordinateScaleNames,
} from '../../../src/contract';
import { BUILTIN_COORDINATES, resolveCoordinateRegistry } from '../../../src/providers';
import { PlotCoordinate } from '../../../src/schemas';

const archDefinition = defineCoordinate({
  schema: object({
    type: literal('arch').describe('Discriminator: custom arch coordinate operation'),
    archHeight: number().positive().describe('Arch height in user units'),
  }).describe('Arch coordinate operation'),
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
    expect(plot.readCoordinateScaleNames).toBe(readCoordinateScaleNames);
    expect(plot.bindCoordinateScaleNames).toBe(bindCoordinateScaleNames);
  });

  it('coordinate_scale_binding_defaults_to_role_named_operation_fields', () => {
    const definition = resolveCoordinateRegistry().get(PlotCoordinate.Cartesian2D);
    expect(definition).toBeDefined();
    if (definition === undefined) return;
    const operation = { type: PlotCoordinate.Cartesian2D, x: 'horizontal' } as const;

    expect(readCoordinateScaleNames(definition, operation)).toEqual({ x: 'horizontal' });
    expect(bindCoordinateScaleNames(definition, operation, { y: 'vertical' })).toEqual({
      type: PlotCoordinate.Cartesian2D,
      x: 'horizontal',
      y: 'vertical',
    });
  });

  it('polar_coordinate_scale_binding_aliases_x/y_roles_to_angle/radius_fields', () => {
    const definition = resolveCoordinateRegistry().get(PlotCoordinate.Polar2D);
    expect(definition).toBeDefined();
    if (definition === undefined) return;
    const operation = {
      type: PlotCoordinate.Polar2D,
      startAngle: 0,
      endAngle: 360,
      innerRadius: 0,
    } as const;
    const bound = bindCoordinateScaleNames(definition, operation, { x: 'angle-scale', y: 'radius-scale' });

    expect(bound).toMatchObject({ angle: 'angle-scale', radius: 'radius-scale' });
    expect(readCoordinateScaleNames(definition, bound)).toEqual({ x: 'angle-scale', y: 'radius-scale' });
  });

  it('custom_scale_binding_owns_role_mapping_and_preserves_unrelated_operation_fields', () => {
    const definition = defineCoordinate({
      schema: object({ type: literal('named-scale'), x: number(), horizontalScale: string().optional() }),
      roles: ['x'],
      scaleBinding: {
        read: operation => ({ x: operation.horizontalScale }),
        bind: (operation, scaleNames) => ({
          ...operation,
          ...(scaleNames.x === undefined ? {} : { horizontalScale: scaleNames.x }),
        }),
      },
      resolve: () => {
        throw new Error('Scale binding contract test does not resolve coordinate geometry');
      },
    });
    const operation = { type: 'named-scale' as const, x: 42 };

    expect(readCoordinateScaleNames(definition, operation)).toEqual({});
    expect(bindCoordinateScaleNames(definition, operation, { x: 'horizontal' })).toEqual({
      type: 'named-scale',
      x: 42,
      horizontalScale: 'horizontal',
    });
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
      schema: object({ type: literal(PlotCoordinate.Cartesian2D).describe('Collides with a built-in coordinate') }),
      roles: ['x'],
      resolve: archDefinition.resolve,
    };
    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/duplicate coordinate registration: "cartesian2D"/);
  });

  it('malformed_coordinate_schema_non_object_throws', () => {
    const malformed: AnyCoordinateDefinition = {
      schema: string(),
      roles: ['x'],
      resolve: archDefinition.resolve,
    };
    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/ZodObject/);
  });

  it('malformed_coordinate_schema_without_literal_type_throws', () => {
    const malformed: AnyCoordinateDefinition = {
      schema: object({ type: string().describe('Not a literal type') }).describe('Malformed coordinate operation'),
      roles: ['x'],
      resolve: archDefinition.resolve,
    };
    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/z\.literal/);
  });

  it('malformed_coordinate_schema_empty_literal_type_throws', () => {
    const malformed: AnyCoordinateDefinition = {
      schema: object({ type: literal('').describe('Empty custom coordinate type') }),
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
