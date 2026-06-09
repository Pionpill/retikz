import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/**
 * 坐标系类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'cartesian2D'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotCoordinate.x)（不用 nativeEnum）；后续加 polar2D / linear1D…
 */
export const PlotCoordinate = {
  /** 2D 笛卡尔空间（x 水平 / y 垂直） */
  Cartesian2D: 'cartesian2D',
  /** 2D 极坐标空间（angle 角向 / radius 径向；默认 x→angle、y→radius） */
  Polar2D: 'polar2D',
} as const;

/** 坐标系类型 */
export type PlotCoordinateValue = ValueOf<typeof PlotCoordinate>;

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

export const CoordinateSchema = z
  .discriminatedUnion('type', [Cartesian2DSchema, Polar2DSchema])
  .describe('Coordinate-system union: cartesian2D | polar2D; extensible to linear1D / ternary in later alphas');

/** 坐标系（cartesian2D | polar2D） */
export type Coordinate = z.infer<typeof CoordinateSchema>;
