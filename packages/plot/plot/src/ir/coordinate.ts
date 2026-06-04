import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/**
 * 坐标系类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'cartesian2D'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotCoordinate.x)（不用 nativeEnum）；后续加 polar2D / linear1D…
 */
export const PlotCoordinate = {
  /** 2D 笛卡尔空间（x 水平 / y 垂直） */
  Cartesian2D: 'cartesian2D',
} as const;

/** 坐标系类型 */
export type CoordinateType = ValueOf<typeof PlotCoordinate>;

export const Cartesian2DSchema = z
  .object({
    type: z.literal(PlotCoordinate.Cartesian2D).describe('Discriminator: 2D cartesian space, x horizontal / y vertical'),
    x: z.string().min(1).describe('Scale name driving the x (horizontal) position channel'),
    y: z.string().min(1).describe('Scale name driving the y (vertical) position channel'),
  })
  .describe('2D cartesian coordinate system; owns the positional scale bindings for x and y');

export const CoordinateSchema = z
  .discriminatedUnion('type', [Cartesian2DSchema])
  .describe('Coordinate-system union; extensible to polar2D / linear1D in later alphas');

/** 坐标系（alpha.1 仅 cartesian2D） */
export type Coordinate = z.infer<typeof CoordinateSchema>;
