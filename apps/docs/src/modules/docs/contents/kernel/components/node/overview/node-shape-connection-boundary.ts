import type {
  ConnectionEnvelopeKind,
  IRJsonObject,
  IRNode,
  PathPrim,
  Rect,
  ScenePrimitive,
  ShapeDefinition,
} from '@retikz/core';

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
  fit: boundaryFitSchema,
  gap: z.number(),
});

type BoundaryGuideParams = z.infer<typeof boundaryGuideParamsSchema>;

type GuideShapePrimitive = Extract<ScenePrimitive, { type: 'ellipse' | 'rect' }>;

/** 取 ellipse / rect primitive 与 Path 共享的视觉字段 */
const guidePathStyle = (primitive: GuideShapePrimitive): Omit<PathPrim, 'type' | 'commands'> => ({
  id: primitive.id,
  meta: primitive.meta,
  animations: primitive.animations,
  fill: primitive.fill,
  fillOpacity: primitive.fillOpacity,
  stroke: primitive.stroke,
  strokeOpacity: primitive.strokeOpacity,
  strokeWidth: primitive.strokeWidth,
  dashPattern: primitive.dashPattern,
  dashOffset: primitive.dashOffset,
  opacity: primitive.opacity,
  shadow: primitive.shadow,
  blendMode: primitive.blendMode,
});

/** 把 shape primitive 统一转为具有圆形 dash 端点的教学辅助轮廓 */
const dottedGuidePrimitive = (primitive: ScenePrimitive): ScenePrimitive => {
  if (primitive.type === 'path') return { ...primitive, strokeLinecap: 'round' };
  if (primitive.type === 'group') {
    return { ...primitive, children: primitive.children.map(dottedGuidePrimitive) };
  }
  if (primitive.type === 'ellipse') {
    const { cx, cy, rx, ry, rotate } = primitive;
    return {
      ...guidePathStyle(primitive),
      type: 'path',
      commands: [
        { kind: 'move', to: [cx + rx, cy] },
        {
          kind: 'ellipseArc',
          center: [cx, cy],
          radiusX: rx,
          radiusY: ry,
          ...(rotate === undefined ? {} : { rotation: rotate }),
          startAngle: 0,
          endAngle: 360,
        },
      ],
      strokeLinecap: 'round',
    } satisfies PathPrim;
  }
  if (primitive.type === 'rect') {
    const { x, y, width, height } = primitive;
    return {
      ...guidePathStyle(primitive),
      type: 'path',
      commands: [
        { kind: 'move', to: [x, y] },
        { kind: 'line', to: [x + width, y] },
        { kind: 'line', to: [x + width, y + height] },
        { kind: 'line', to: [x, y + height] },
        { kind: 'close' },
      ],
      strokeLinecap: 'round',
    } satisfies PathPrim;
  }
  return primitive;
};

/** 逐个输出带 round line cap 的辅助轮廓 primitive */
function* emitDottedGuide(primitives: Iterable<ScenePrimitive>): Iterable<ScenePrimitive> {
  for (const primitive of primitives) yield dottedGuidePrimitive(primitive);
}

/** 复用正式 provider 的 fit / gap 语义计算辅助轮廓矩形 */
const guideRect = (
  rect: Rect,
  visual: ResolvedVisualShape,
  boundary: Exclude<NodeBoundaryChoice, 'shape'>,
  fit: z.infer<typeof boundaryFitSchema>,
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
 * Node 形状 playground 的连接面辅助轮廓
 * @description 布局复用当前视觉 shape，绘制则复用所选 boundary 的 fit / gap 计算，因此辅助轮廓与真实端点解析一致
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
        yield* emitDottedGuide(visual.definition.emit(rect, style, round, visual.params));
        return;
      case 'circle':
        yield* emitDottedGuide(
          ellipseShape.emit(guideRect(rect, visual, params.boundary, params.fit, params.gap), style, round, {}),
        );
        return;
      case 'rectangle':
        yield* emitDottedGuide(
          rectangle.emit(guideRect(rect, visual, params.boundary, params.fit, params.gap), style, round, {}),
        );
        return;
      case 'ellipse':
        yield* emitDottedGuide(
          ellipseShape.emit(guideRect(rect, visual, params.boundary, params.fit, params.gap), style, round, {}),
        );
    }
  },
});
