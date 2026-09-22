import type { IRPath } from '@retikz/core';

import { ShapePathSchema } from './schema';
import type { ShapeAngles, ShapeBox, ShapePathProperties } from './types';

/** 将已带方向的顶点串联成闭合路径，避免宿主重复旋转 */
export const shapeVertexPath = (source: ShapePathProperties, vertices: Array<[number, number]>): IRPath => {
  const { rotate, ...properties } = shapePathProperties(source);
  void rotate;
  return {
    ...properties,
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: vertices[0] },
      ...vertices.slice(1).map(to => ({ type: 'step' as const, kind: 'line' as const, to })),
      { type: 'step', kind: 'cycle' },
    ],
  };
};

/** 从 Core schema 的字段集合选取 Path 属性，不维护平行白名单 */
export const shapePathProperties = (source: ShapePathProperties): ShapePathProperties =>
  Object.fromEntries(
    Object.keys(ShapePathSchema.shape)
      .filter(key => key in source)
      .map(key => [key, source[key as keyof ShapePathProperties]]),
  );

/** 展开恰好两个角度字段，保留有向 sweep */
export const shapeAngles = (source: ShapeAngles): { startAngle: number; endAngle: number } | undefined => {
  if (source.startAngle !== undefined && source.endAngle !== undefined)
    return { startAngle: source.startAngle, endAngle: source.endAngle };
  if (source.startAngle !== undefined && source.sweepAngle !== undefined)
    return { startAngle: source.startAngle, endAngle: source.startAngle + source.sweepAngle };
  if (source.endAngle !== undefined && source.sweepAngle !== undefined)
    return { startAngle: source.endAngle - source.sweepAngle, endAngle: source.endAngle };
  return undefined;
};

/** 计算经过盒调整的中心与尺寸 */
export const shapeBoxGeometry = (input: {
  box?: ShapeBox;
  corner1?: [number, number];
  corner2?: [number, number];
  inset?: number;
  outset?: number;
}): { center: [number, number]; width: number; height: number } => {
  const { box, corner1 = [0, 0], corner2 = [0, 0] } = input;
  const origin = box
    ? 'origin' in box
      ? box.origin
      : [box.x, box.y]
    : [Math.min(corner1[0], corner2[0]), Math.min(corner1[1], corner2[1])];
  const width = box?.width ?? Math.abs(corner2[0] - corner1[0]);
  const height = box?.height ?? Math.abs(corner2[1] - corner1[1]);
  const delta = input.outset ?? -(input.inset ?? 0);
  return {
    center: [origin[0] + width / 2, origin[1] + height / 2],
    width: width + delta * 2,
    height: height + delta * 2,
  };
};
