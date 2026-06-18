import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/**
 * 坐标系类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'cartesian2D'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotCoordinate.x)（不用 z.enum）；命名按空间几何 + 维度。
 */
export const PlotCoordinate = {
  /** 2D 笛卡尔空间（x 水平 / y 垂直） */
  Cartesian2D: 'cartesian2D',
  /** 2D 极坐标空间（angle 角向 / radius 径向；默认 x→angle、y→radius） */
  Polar2D: 'polar2D',
  /** 1D 笛卡尔直线（单维落一条轴线，另一屏幕维塌缩到固定基线；rug / timeline） */
  Cartesian1D: 'cartesian1D',
  /** 1D 极坐标圆周（单角向维落固定半径圆周；周期 / 循环数据） */
  Polar1D: 'polar1D',
  /** 2D 三元坐标（三个位置通道 x/y/z 归一化的重心坐标，投影到等边三角内；成分 / 配比 / 得票） */
  Ternary2D: 'ternary2D',
} as const;

/** 坐标系类型 */
export type PlotCoordinateValue = ValueOf<typeof PlotCoordinate>;

/**
 * cartesian1D 轴向关键字（暴露给用户；裸字面量 `'horizontal'` 同样可用）
 * @description 决定一维直线沿哪个屏幕轴铺：horizontal 沿 x（基线在底）、vertical 沿 y（基线在左）；省略默认 horizontal（lowering 给）
 */
export const Cartesian1DOrientation = {
  /** 水平：数据沿 x 轴线，塌缩维基线在底边 */
  Horizontal: 'horizontal',
  /** 垂直：数据沿 y 轴线，塌缩维基线在左边 */
  Vertical: 'vertical',
} as const;

/** cartesian1D 轴向 */
export type Cartesian1DOrientationType = ValueOf<typeof Cartesian1DOrientation>;

export const Cartesian2DSchema = z
  .object({
    type: z.literal(PlotCoordinate.Cartesian2D).describe('Discriminator: 2D cartesian space, x horizontal / y vertical'),
    x: z.string().min(1).optional().describe('Scale name for the x (horizontal) channel; omit to derive a default scale from the bound field type'),
    y: z.string().min(1).optional().describe('Scale name for the y (vertical) channel; omit to derive a default scale from the bound field type'),
  })
  .describe('2D cartesian coordinate system; owns the positional scale bindings for x and y');

export const Polar2DSchema = z
  .object({
    type: z.literal(PlotCoordinate.Polar2D).describe('Discriminator: 2D polar space, angle around the center / radius outward'),
    angle: z.string().min(1).optional().describe('Scale name for the angle role; omit to derive from the bound field type. Its range is set to [startAngle, endAngle] degrees at lowering'),
    radius: z.string().min(1).optional().describe('Scale name for the radius role; omit to derive from the bound field type. Its range is set to [innerRadius, outerRadius] units at lowering'),
    startAngle: z
      .number()
      .finite()
      .default(0)
      .describe('Angular range start in degrees; 0 = +x (3 o\'clock), sweeping toward +y under screen y-down, matching core polar'),
    endAngle: z.number().finite().default(360).describe('Angular range end in degrees; defaults to a full 360-degree circle'),
    innerRadius: z
      .number()
      .finite()
      .min(0)
      .lt(1)
      .default(0)
      .describe('Donut hole radius as a fraction of the outer radius, 0..1 exclusive; 0 = solid disk (no hole)'),
  })
  .describe('2D polar coordinate system; owns the angle / radius scale bindings and the angular sweep / inner-radius geometry');

export const Cartesian1DSchema = z
  .object({
    type: z.literal(PlotCoordinate.Cartesian1D).describe('Discriminator: 1D cartesian line; one position dimension, the other screen axis collapses to a fixed baseline'),
    x: z.string().min(1).optional().describe('Scale name for the single position dimension; omit to derive a default scale from the bound field type. Scale-agnostic — supports linear / log / sqrt / time / band'),
    orientation: z
      .enum(Cartesian1DOrientation)
      .optional()
      .describe('Axis orientation — horizontal lays the line along x (baseline at the bottom edge), vertical along y (baseline at the left edge); omit = horizontal (default applied during lowering)'),
  })
  .describe('1D cartesian coordinate system: a single position dimension on a straight line (rug / timeline / 1D strip); the collapsed screen axis is pinned to a fixed baseline');

export const Polar1DSchema = z
  .object({
    type: z.literal(PlotCoordinate.Polar1D).describe('Discriminator: 1D polar circle; one angular position dimension on a fixed-radius circle (cyclic / periodic data)'),
    angle: z.string().min(1).optional().describe('Scale name for the single angular dimension; omit to derive from the bound field type. Its range is set to [startAngle, endAngle] degrees at lowering. Reuses the polar x→angle alias'),
    radius: z
      .number()
      .finite()
      .gt(0)
      .max(1)
      .optional()
      .describe('Circle radius as a fraction of the available radius, 0 < r ≤ 1; omit = 1 (outer circle, default applied during lowering)'),
    startAngle: z
      .number()
      .finite()
      .optional()
      .describe("Angular range start in degrees; omit = 0 (default applied during lowering). 0 = +x (3 o'clock), sweeping toward +y under screen y-down, matching core polar"),
    endAngle: z.number().finite().optional().describe('Angular range end in degrees; omit = 360 (full circle, default applied during lowering)'),
  })
  .describe('1D polar coordinate system: a single angular dimension mapped onto a fixed-radius circle (clock face / weekday wheel / periodic rug); reuses the polar angular projection');

export const Ternary2DSchema = z
  .object({
    type: z.literal(PlotCoordinate.Ternary2D).describe('Discriminator: 2D ternary space; three components x + y + z normalized to barycentric coordinates inside an equilateral triangle'),
  })
  .describe('2D ternary coordinate system: three continuous components (bound via the mark x / y / z channels) projected by barycentric coordinates into an equilateral triangle (composition / mixture / vote share); each row is auto-normalized by x+y+z at lowering. No geometry options this round (per-component scales not yet supported)');

/** 内置坐标系 type 集：供自定义 coordinate op 排除内置判别串。 */
export const BUILTIN_COORDINATE_TYPES = new Set<string>(Object.values(PlotCoordinate));

const RESERVED_CUSTOM_COORDINATE_TYPES = new Set<string>([...BUILTIN_COORDINATE_TYPES, 'custom']);

export const CustomCoordinateSchema = z
  .object({
    type: z
      .string()
      .min(1)
      .refine(type => !RESERVED_CUSTOM_COORDINATE_TYPES.has(type), {
        message: 'custom coordinate type must not collide with a built-in or reserved coordinate type',
      })
      .describe('Discriminator: custom coordinate op type; must be a non-empty, non-built-in identifier registered through options.coordinates'),
  })
  .passthrough()
  .describe('Custom coordinate op: type is any non-built-in identifier; its config is validated at lowering time against the matching CoordinateDefinition supplied via options.coordinates. Position roles come from the definition, not the op.');

export const CoordinateSchema = z
  .discriminatedUnion('type', [Cartesian2DSchema, Polar2DSchema, Cartesian1DSchema, Polar1DSchema, Ternary2DSchema])
  .describe('Built-in coordinate-system union: cartesian2D | polar2D | cartesian1D | polar1D | ternary2D');

export const CoordinateOpSchema = z
  .union([CoordinateSchema, CustomCoordinateSchema])
  .describe('Coordinate op union: built-in coordinate configs plus custom type passthrough ops validated by a runtime CoordinateDefinition');

/** 内置坐标系（cartesian2D | polar2D | cartesian1D | polar1D | ternary2D） */
export type Coordinate = z.infer<typeof CoordinateSchema>;
/** 坐标系 op（内置 ∪ 自定义 type passthrough） */
export type CoordinateOp = z.infer<typeof CoordinateOpSchema>;
/** 一维直线坐标系（cartesian1D） */
export type Cartesian1DCoordinate = z.infer<typeof Cartesian1DSchema>;
/** 一维圆周坐标系（polar1D） */
export type Polar1DCoordinate = z.infer<typeof Polar1DSchema>;
/** 三元坐标系（ternary2D） */
export type Ternary2DCoordinate = z.infer<typeof Ternary2DSchema>;
/** 自定义坐标系 op（投影由运行时 CoordinateDefinition 提供） */
export type CustomCoordinate = z.infer<typeof CustomCoordinateSchema>;
