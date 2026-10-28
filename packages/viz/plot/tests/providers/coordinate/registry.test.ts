import { describe, expect, it } from 'vitest';
import { literal, number, object, string } from 'zod';

import * as plot from '../../../src';
import type { AnyCoordinateDefinition } from '../../../src/contract';
import {
  bindCoordinateScaleNames,
  createCoordinateFrame,
  defineCoordinate,
  extractCoordinateType,
  readCoordinateScaleNames,
} from '../../../src/contract';
import { BUILTIN_COORDINATES, resolveCoordinateRegistry } from '../../../src/providers';
import { BuiltinPlotCoordinate } from '../../../src/schemas';

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

describe('坐标注册（契约规范）', () => {
  it('defineCoordinate 保留 schema 推导出的注册 type 与 roles', () => {
    expect(extractCoordinateType(archDefinition.schema)).toBe('arch');
    expect(archDefinition.roles).toEqual(['x']);
  });

  it('公共聚合入口导出坐标定义帮助程序', () => {
    expect(plot.defineCoordinate).toBe(defineCoordinate);
    expect(plot.createCoordinateFrame).toBe(createCoordinateFrame);
    expect('createCustomCoordinate' in plot).toBe(false);
    expect(plot.extractCoordinateType).toBe(extractCoordinateType);
    expect(plot.resolveCoordinateRegistry).toBe(resolveCoordinateRegistry);
    expect(plot.readCoordinateScaleNames).toBe(readCoordinateScaleNames);
    expect(plot.bindCoordinateScaleNames).toBe(bindCoordinateScaleNames);
  });

  it('坐标比例尺绑定默认使用与角色同名的操作字段', () => {
    const definition = resolveCoordinateRegistry().get(BuiltinPlotCoordinate.Cartesian2D);

    expect(definition).toBeDefined();

    if (definition === undefined) return;

    const operation = { type: BuiltinPlotCoordinate.Cartesian2D, x: 'horizontal' } as const;

    expect(readCoordinateScaleNames(definition, operation)).toEqual({ x: 'horizontal' });
    expect(bindCoordinateScaleNames(definition, operation, { y: 'vertical' })).toEqual({
      type: BuiltinPlotCoordinate.Cartesian2D,
      x: 'horizontal',
      y: 'vertical',
    });
  });

  it('在读取和重新绑定比例时保留精确的操作转换', () => {
    const definition = defineCoordinate({
      ...archDefinition,
      schema: object({ type: literal('arch'), archHeight: number(), x: string().optional() }).transform(operation => ({
        ...operation,
        archHeight: operation.archHeight + 10,
      })),
    });
    const operation = definition.schema.parse({ type: 'arch', archHeight: 20, x: 'original' });
    expect(readCoordinateScaleNames(definition, operation)).toEqual({ x: 'original' });
    const bound = bindCoordinateScaleNames(definition, operation, { x: 'replacement' });
    expect(bound).toEqual({ type: 'arch', archHeight: 30, x: 'replacement' });
    expect(operation).toEqual({ type: 'arch', archHeight: 30, x: 'original' });
  });

  it('极坐标比例尺绑定将 x、y 角色映射到 angle、radius 字段', () => {
    const definition = resolveCoordinateRegistry().get(BuiltinPlotCoordinate.Polar2D);

    expect(definition).toBeDefined();

    if (definition === undefined) return;

    const operation = {
      type: BuiltinPlotCoordinate.Polar2D,
      startAngle: 0,
      endAngle: 360,
      innerRadius: 0,
    } as const;
    const bound = bindCoordinateScaleNames(definition, operation, { x: 'angle-scale', y: 'radius-scale' });

    expect(bound).toMatchObject({ angle: 'angle-scale', radius: 'radius-scale' });
    expect(readCoordinateScaleNames(definition, bound)).toEqual({ x: 'angle-scale', y: 'radius-scale' });
  });

  it('自定义比例尺绑定拥有角色映射并保留无关操作字段', () => {
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

  it('内置坐标定义覆盖公共内置类型', () => {
    expect(BUILTIN_COORDINATES.map(def => extractCoordinateType(def.schema)).sort()).toEqual(
      Object.values(BuiltinPlotCoordinate).sort(),
    );
  });

  it('重复坐标类型抛出', () => {
    expect(() => resolveCoordinateRegistry([archDefinition, archDefinition])).toThrow(
      /duplicate coordinate registration: "arch"/,
    );
  });

  it('重复内置坐标类型抛出', () => {
    const malformed: AnyCoordinateDefinition = {
      schema: object({
        type: literal(BuiltinPlotCoordinate.Cartesian2D).describe('Collides with a built-in coordinate'),
      }),
      roles: ['x'],
      resolve: archDefinition.resolve,
    };

    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/duplicate coordinate registration: "cartesian2D"/);
  });

  it('格式错误的坐标 schema 非对象抛出', () => {
    const malformed: AnyCoordinateDefinition = {
      schema: string(),
      roles: ['x'],
      resolve: archDefinition.resolve,
    };

    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/ZodObject/);
  });

  it('格式错误的坐标 schema，没有字面量类型抛出', () => {
    const malformed: AnyCoordinateDefinition = {
      schema: object({ type: string().describe('Not a literal type') }).describe('Malformed coordinate operation'),
      roles: ['x'],
      resolve: archDefinition.resolve,
    };

    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/z\.literal/);
  });

  it('坐标 schema 的字面量 type 为空时抛出错误', () => {
    const malformed: AnyCoordinateDefinition = {
      schema: object({ type: literal('').describe('Empty custom coordinate type') }),
      roles: ['x'],
      resolve: archDefinition.resolve,
    };

    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/non-empty z\.literal string/);
  });

  it('重复坐标角色抛出', () => {
    const malformed: AnyCoordinateDefinition = { ...archDefinition, roles: ['x', 'x'] };

    expect(() => resolveCoordinateRegistry([malformed])).toThrow(/duplicate coordinate role: "x"/);
  });

  it('自定义 schema 拒绝无效配置', () => {
    expect(() => archDefinition.schema.parse({ type: 'arch', archHeight: -1 })).toThrow();
    expect(archDefinition.schema.parse({ type: 'arch', archHeight: 30 })).toEqual({ type: 'arch', archHeight: 30 });
  });

  it('定义操作保持 JSON 往返等价', () => {
    const operation = { type: 'arch', archHeight: 30 };

    expect(archDefinition.schema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });
});
