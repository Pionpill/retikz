import type { CurveSegmentSample } from '@retikz/math';
import { RAD_TO_DEG } from '@retikz/math';

import type { CompiledArrowEnd, GroupPrimitive, PaintValue, ScenePrimitive, Transform } from '../../contract';
import { combineOpacity } from '../../resolve';

/** marker 放置所需上下文 */
export type MarkerPlacementContext = {
  /** 标记的固定角度或切线定向 */
  rotate?: 'auto' | number;
  /** 标记放置缩放 */
  scale?: number;
  /** 用于将标记宽高倍率换算为场景尺寸的路径线宽 */
  strokeWidth: number;
  /** 舍入标记放置变换中的数值 */
  round: (n: number) => number;
  /** 替换标记内部继承描边色占位的 CSS 颜色 */
  contextStroke: PaintValue;
  /** 与标记自身及其绘制图元透明度相乘的宿主因子 */
  hostOpacity?: number;
};

/** 保留标记结构，递归解析宿主描边色并将透明度因子应用到绘制图元 */
export const materializeMarkerPrimitive = (
  prim: ScenePrimitive,
  contextStroke: PaintValue,
  hostOpacity?: number,
): ScenePrimitive => {
  const resolveMarkerContextFill = (value: PaintValue): PaintValue =>
    typeof value === 'object' && value.kind === 'contextStroke' ? contextStroke : value;

  const content = { ...prim };
  delete content.id;
  delete content.meta;
  if (content.type === 'group') {
    return {
      ...content,
      children: content.children.map(c => materializeMarkerPrimitive(c, contextStroke, hostOpacity)),
    };
  }

  const opacity = combineOpacity(content.opacity, hostOpacity);
  const appearance = opacity === undefined ? {} : { opacity };
  if (content.type === 'text') return { ...content, ...appearance };

  return {
    ...content,
    ...appearance,
    ...(content.fill !== undefined && { fill: resolveMarkerContextFill(content.fill) }),
    ...(content.stroke !== undefined && { stroke: resolveMarkerContextFill(content.stroke) }),
  };
};

/**
 * 把已物化的 arrow marker（局部 baseSize 坐标系，尖端 +x）按路径切线定向放到采样点
 * @description marker 局部系：viewBox `0 0 baseSize baseSize`，参考点 (refX, baseSize/2)，尖端朝 +x
 */
export const buildMarkMarkerGroup = (
  spec: CompiledArrowEnd,
  sample: CurveSegmentSample,
  context: MarkerPlacementContext,
): GroupPrimitive => {
  const { strokeWidth, round, contextStroke } = context;
  const angleDeg =
    typeof context.rotate === 'number' ? context.rotate : Math.atan2(sample.tangent[1], sample.tangent[0]) * RAD_TO_DEG;
  const sx = (spec.markerWidth * strokeWidth * (context.scale ?? 1)) / spec.baseSize;
  const sy = (spec.markerHeight * strokeWidth * (context.scale ?? 1)) / spec.baseSize;
  const refY = spec.baseSize / 2;
  const transforms: Array<Transform> = [
    { kind: 'translate', x: round(sample.point[0]), y: round(sample.point[1]) },
    { kind: 'rotate', degrees: round(angleDeg) },
    { kind: 'scale', x: round(sx), y: round(sy) },
    { kind: 'translate', x: round(-spec.refX), y: round(-refY) },
  ];

  return {
    type: 'group',
    transforms,
    children: spec.marker.map(p =>
      materializeMarkerPrimitive(p, contextStroke, combineOpacity(spec.opacity, context.hostOpacity)),
    ),
  };
};
