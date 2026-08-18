import { z } from 'zod';

import type { CellProjectableCoordinate, CoordinateFrame } from './types';

import { RetikzPlotError } from '../../error';

/**
 * 判断坐标帧是否支持 cell 类几何投影。
 * @description interval、reference band 等 mark 先构造逻辑 Cell，再要求 frame.projectCell 把 Cell 投成 rect / sector / contour。
 *   这个 guard 只表示“能投 cell”，不表示 mark 侧一定能构造 cell；自定义 interval 仍需要 roleScales
 */
export const hasProjectCell = (coordinate: CoordinateFrame): coordinate is CellProjectableCoordinate => {
  const candidate = coordinate as { projectCell?: unknown };
  return typeof candidate.projectCell === 'function';
};

/**
 * 从 coordinate definition schema 中提取 registry key。
 * @description definition schema 必须是包含 `type: z.literal('<coordinate-type>')` 的 ZodObject；
 *   该 literal 值就是 IR 中 `coordinate.type` 的真实判别串，也是 registry 的唯一键
 */
export const extractCoordinateType = (schema: z.ZodType): string => {
  if (!(schema instanceof z.ZodObject)) {
    throw new RetikzPlotError(
      'lowerPlots: coordinate registration schema must be a ZodObject with a literal type field',
    );
  }
  const typeSchema = schema.shape.type;
  if (!(typeSchema instanceof z.ZodLiteral) || typeof typeSchema.value !== 'string' || typeSchema.value.length === 0) {
    throw new RetikzPlotError(
      'lowerPlots: coordinate registration schema must declare type as a non-empty z.literal string',
    );
  }
  return typeSchema.value;
};
