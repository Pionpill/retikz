import type { IRJsonObject, IRNode, Rect, ShapeDefinition } from '@retikz/core';

import { arc, defineShape, ellipseShape, polygon, rectangle, sector, star } from '@retikz/core';
import { z } from 'zod';

const shapeChoiceSchema = z.enum(['rectangle', 'circle', 'ellipse', 'diamond', 'polygon', 'star', 'sector', 'arc']);

const boundaryChoiceSchema = z.enum(['shape', 'circle', 'rectangle', 'ellipse']);

/** Node 形状 playground 的可选视觉形状 */
export type NodeShapeChoice = z.infer<typeof shapeChoiceSchema>;

/** Node 形状 playground 的可选连接面 */
export type NodeBoundaryChoice = z.infer<typeof boundaryChoiceSchema>;

type ResolvedVisualShape = {
  definition: ShapeDefinition;
  params: IRJsonObject;
};

/** 返回 playground 中与 Node shape 完全相同的 definition 与参数 */
const visualShapeOf = (shape: NodeShapeChoice): ResolvedVisualShape => {
  switch (shape) {
    case 'rectangle':
      return { definition: rectangle, params: {} };
    case 'circle':
      return { definition: ellipseShape, params: { circumscribe: 'equal' } };
    case 'ellipse':
      return { definition: ellipseShape, params: {} };
    case 'diamond':
      return { definition: polygon, params: { sides: 4, rotate: 0 } };
    case 'polygon':
      return { definition: polygon, params: { sides: 6, rotate: 30 } };
    case 'star':
      return { definition: star, params: { points: 5, innerRadius: 18, outerRadius: 44 } };
    case 'sector':
      return {
        definition: sector,
        params: { innerRadius: 12, outerRadius: 44, startAngle: 25, endAngle: 300 },
      };
    case 'arc':
      return { definition: arc, params: { radius: 44, startAngle: 25, endAngle: 300 } };
  }
};

/** 把 playground 选项转换为公开 Node shape 写法 */
export const nodeShapeOf = (shape: NodeShapeChoice): IRNode['shape'] => {
  switch (shape) {
    case 'rectangle':
    case 'circle':
    case 'ellipse':
    case 'diamond':
      return shape;
    case 'polygon':
      return { type: 'polygon', params: { sides: 6, rotate: 30 } };
    case 'star':
      return { type: 'star', params: { points: 5, innerRadius: 18, outerRadius: 44 } };
    case 'sector':
      return { type: 'sector', params: { innerRadius: 12, outerRadius: 44, startAngle: 25, endAngle: 300 } };
    case 'arc':
      return { type: 'arc', params: { radius: 44, startAngle: 25, endAngle: 300 } };
  }
};

const boundaryGuideParamsSchema = z.strictObject({
  shape: shapeChoiceSchema,
  boundary: boundaryChoiceSchema,
});

type BoundaryGuideParams = z.infer<typeof boundaryGuideParamsSchema>;

/** 把视觉外接框转换为 circle boundary 使用的外接圆正方形 */
const circumscribedCircleRect = (rect: Rect): Rect => {
  const side = Math.hypot(rect.width, rect.height);
  return { ...rect, width: side, height: side };
};

/** 把视觉外接框转换为四角落在边界上的外接椭圆矩形 */
const circumscribedEllipseRect = (rect: Rect): Rect => ({
  ...rect,
  width: rect.width * Math.SQRT2,
  height: rect.height * Math.SQRT2,
});

/**
 * Node 形状 playground 的连接面辅助轮廓
 * @description 布局复用当前视觉 shape，绘制则复用所选 boundary 的内置几何，因此虚线与真实端点解析使用同一外接框
 */
export const boundaryGuideShape = defineShape<BoundaryGuideParams>({
  name: 'node-boundary-guide',
  paramsSchema: boundaryGuideParamsSchema,
  circumscribe: (innerHalfWidth, innerHalfHeight, params) => {
    const visual = visualShapeOf(params.shape);
    return visual.definition.circumscribe(innerHalfWidth, innerHalfHeight, visual.params);
  },
  circumscribeOffset: params => {
    const visual = visualShapeOf(params.shape);
    return visual.definition.circumscribeOffset?.(visual.params) ?? [0, 0];
  },
  boundaryPoint: rect => [rect.x, rect.y],
  anchor: () => undefined,
  *emit(rect, style, round, params) {
    const visual = visualShapeOf(params.shape);
    switch (params.boundary) {
      case 'shape':
        yield* visual.definition.emit(rect, style, round, visual.params);
        return;
      case 'circle':
        yield* ellipseShape.emit(circumscribedCircleRect(rect), style, round, {});
        return;
      case 'rectangle':
        yield* rectangle.emit(rect, style, round, {});
        return;
      case 'ellipse':
        yield* ellipseShape.emit(circumscribedEllipseRect(rect), style, round, {});
    }
  },
});
