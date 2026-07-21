import type { ConnectionEnvelopeKind, IRJsonObject, IRNode, Rect, ShapeDefinition } from '@retikz/core';

import {
  arc,
  boundsConnectionEnvelope,
  defineShape,
  ellipseShape,
  polygon,
  rectangle,
  sector,
  star,
} from '@retikz/core';
import { z } from 'zod';

const shapeChoiceSchema = z.enum(['rectangle', 'circle', 'ellipse', 'diamond', 'polygon', 'star', 'sector', 'arc']);
const boundaryChoiceSchema = z.enum(['shape', 'circle', 'rectangle', 'ellipse']);
const boundaryFitSchema = z.enum(['tight', 'bounds']);

/** 图元模型 playground 的可选视觉形状 */
export type ShapeChoice = z.infer<typeof shapeChoiceSchema>;

/** 图元模型 playground 的可选连接面 */
export type BoundaryChoice = z.infer<typeof boundaryChoiceSchema>;

/** 图元模型 playground 的规则连接面拟合策略 */
export type BoundaryFitChoice = z.infer<typeof boundaryFitSchema>;

type ResolvedVisualShape = {
  definition: ShapeDefinition;
  params: IRJsonObject;
};

/** 返回 playground 中与可见 Node 完全相同的 shape definition 与参数 */
const visualShapeOf = (shape: ShapeChoice): ResolvedVisualShape => {
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
      return { definition: star, params: { points: 5, innerRadius: 22, outerRadius: 50 } };
    case 'sector':
      return {
        definition: sector,
        params: { innerRadius: 14, outerRadius: 48, startAngle: 25, endAngle: 300 },
      };
    case 'arc':
      return { definition: arc, params: { radius: 48, startAngle: 25, endAngle: 300 } };
  }
};

/** 把面板选项转换为具有代表性参数的公开 Node shape 写法 */
export const nodeShapeOf = (shape: ShapeChoice): IRNode['shape'] => {
  switch (shape) {
    case 'rectangle':
    case 'circle':
    case 'ellipse':
    case 'diamond':
      return shape;
    case 'polygon':
      return { type: 'polygon', params: { sides: 6, rotate: 30 } };
    case 'star':
      return { type: 'star', params: { points: 5, innerRadius: 22, outerRadius: 50 } };
    case 'sector':
      return { type: 'sector', params: { innerRadius: 14, outerRadius: 48, startAngle: 25, endAngle: 300 } };
    case 'arc':
      return { type: 'arc', params: { radius: 48, startAngle: 25, endAngle: 300 } };
  }
};

const boundaryGuideParamsSchema = z.strictObject({
  shape: shapeChoiceSchema,
  boundary: boundaryChoiceSchema,
  fit: boundaryFitSchema,
  gap: z.number(),
});

type BoundaryGuideParams = z.infer<typeof boundaryGuideParamsSchema>;

/** 复用正式 provider 的 fit / gap 语义计算辅助轮廓矩形 */
const guideRect = (
  rect: Rect,
  visual: ResolvedVisualShape,
  boundary: Exclude<BoundaryChoice, 'shape'>,
  fit: BoundaryFitChoice,
  gap: number,
): Rect => {
  const kind: ConnectionEnvelopeKind = boundary;
  const envelope =
    boundary === 'rectangle' || fit === 'bounds'
      ? boundsConnectionEnvelope(rect, kind)
      : (visual.definition.connectionEnvelope?.(rect, kind, visual.params) ?? boundsConnectionEnvelope(rect, kind));
  return {
    ...rect,
    width: (envelope.halfWidth + gap) * 2,
    height: (envelope.halfHeight + gap) * 2,
  };
};

/**
 * 图元模型 playground 的规则连接面辅助轮廓
 * @description 布局复用当前视觉 shape，绘制复用所选 boundary 的 fit / gap 几何；shape 模式不额外输出轮廓
 */
export const primitiveModelBoundaryGuideShape = defineShape<BoundaryGuideParams>({
  name: 'primitive-model-boundary-guide',
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
    if (params.boundary === 'shape') return;

    const visual = visualShapeOf(params.shape);
    const resolvedRect = guideRect(rect, visual, params.boundary, params.fit, params.gap);
    if (params.boundary === 'rectangle') {
      yield* rectangle.emit(resolvedRect, style, round, {});
      return;
    }
    yield* ellipseShape.emit(resolvedRect, style, round, {});
  },
});
