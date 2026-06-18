import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { type AnyCoordinateDefinition, createCustomCoordinate, defineCoordinate, extractCoordinateType, resolveCoordinateRegistry } from '../../src/coordinate';

const archDefinition = defineCoordinate({
  schema: z
    .object({
      type: z.literal('arch').describe('Discriminator: custom arch coordinate op'),
      archHeight: z.number().finite().positive().describe('Arch height in user units'),
    })
    .describe('Arch coordinate op'),
  roles: ['x'],
  resolve: (op, ctx) => {
    const values = ctx.collectRoleValues('x');
    const scaleDef = ctx.resolveScaleForRole('x', undefined, values);
    const scale = ctx.buildPositionScale(scaleDef, values, [0, ctx.width]);
    return {
      frame: createCustomCoordinate(['x'], ([value]) => {
        const x = scale.coordinate(value);
        return Number.isFinite(x) ? [x, ctx.height - op.archHeight] : null;
      }),
      plotArea: { x: 0, y: 0, width: ctx.width, height: ctx.height },
      gridLayers: [],
      axisLayers: [],
    };
  },
});

describe('coordinate registry（alpha.12 ADR-05 spec）', () => {
  it('defineCoordinate 保留 schema 推导出的注册 type 与 roles', () => {
    expect(extractCoordinateType(archDefinition.schema)).toBe('arch');
    expect(archDefinition.roles).toEqual(['x']);
  });

  it('resolveCoordinateRegistry 接受自定义 definition 数组并按 type 注册', () => {
    const registry = resolveCoordinateRegistry([archDefinition]);
    expect(registry.get('arch')).toBe(archDefinition);
  });

  it('duplicate_coordinate_type_throws', () => {
    expect(() => resolveCoordinateRegistry([archDefinition, archDefinition])).toThrow(/duplicate coordinate registration: "arch"/);
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
      schema: z.object({ type: z.string().describe('Not a literal type') }).describe('Malformed coordinate op'),
      roles: ['x'],
      resolve: archDefinition.resolve,
    };
    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/z\.literal/);
  });

  it('custom_schema_rejects_invalid_config', () => {
    expect(() => archDefinition.schema.parse({ type: 'arch', archHeight: -1 })).toThrow();
    expect(archDefinition.schema.parse({ type: 'arch', archHeight: 30 })).toEqual({ type: 'arch', archHeight: 30 });
  });

  it('definition_op_json_round_trip', () => {
    const op = { type: 'arch', archHeight: 30 };
    expect(archDefinition.schema.parse(JSON.parse(JSON.stringify(op)))).toEqual(op);
  });
});
