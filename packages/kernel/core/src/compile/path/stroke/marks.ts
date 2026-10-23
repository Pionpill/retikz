import { RAD_TO_DEG } from '@retikz/math';
import type { CurveSegmentSample } from '@retikz/math';

import type { GroupPrim, PaintValue, ScenePrimitive, ResolvedArrowEnd, Transform } from '../../../contract';

const resolveMarkerContextFill = (value: PaintValue, contextStroke: PaintValue): PaintValue =>
  typeof value === 'object' && value.kind === 'contextStroke' ? contextStroke : value;

/** marker 放置所需上下文 */
export type BuildMarkMarkerGroupContext = {
  /** 用于将标记宽高倍率换算为场景尺寸的路径线宽 */
  strokeWidth: number;
  /** 舍入标记放置变换中的数值 */
  round: (n: number) => number;
  /** 替换标记内部继承描边色占位的 CSS 颜色 */
  contextStroke: PaintValue;
};

/** marker 图元 → Scene 图元：结构同构，仅把 fill/stroke 的 contextStroke 解析成具体描边色（递归 group） */
const markerPrimToScene = (prim: ScenePrimitive, contextStroke: PaintValue): ScenePrimitive => {
  if (prim.type === 'text') return prim;
  if (prim.type === 'group') {
    return { ...prim, children: prim.children.map(c => markerPrimToScene(c, contextStroke)) };
  }

  return {
    ...prim,
    ...(prim.fill !== undefined && { fill: resolveMarkerContextFill(prim.fill, contextStroke) }),
    ...(prim.stroke !== undefined && { stroke: resolveMarkerContextFill(prim.stroke, contextStroke) }),
  };
};

/**
 * 把已物化的 arrow marker（局部 baseSize 坐标系，尖端 +x）按路径切线定向放到采样点
 * @description marker 局部系：viewBox `0 0 baseSize baseSize`，参考点 (refX, baseSize/2)，尖端朝 +x
 */
export const buildMarkMarkerGroup = (
  spec: ResolvedArrowEnd,
  sample: CurveSegmentSample,
  context: BuildMarkMarkerGroupContext,
): GroupPrim => {
  const { strokeWidth, round, contextStroke } = context;
  const angleDeg = Math.atan2(sample.tangent[1], sample.tangent[0]) * RAD_TO_DEG;
  const sx = (spec.markerWidth * strokeWidth) / spec.baseSize;
  const sy = (spec.markerHeight * strokeWidth) / spec.baseSize;
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
    ...(spec.opacity === undefined ? {} : { opacity: spec.opacity }),
    children: spec.marker.map(p => markerPrimToScene(p, contextStroke)),
  };
};
