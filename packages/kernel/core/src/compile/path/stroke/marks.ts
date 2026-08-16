import type {
  GroupPrim,
  MarkerFill,
  MarkerPrimitive,
  PaintValue,
  ResolvedArrowEnd,
  ScenePrimitive,
  Transform,
} from '../../../contract';
import type { SegmentSample } from '../../../shared/geometry';

import { RAD_TO_DEG } from '../../../shared/geometry';

const resolveMarkerContextFill = (value: MarkerFill, contextStroke: string): string =>
  typeof value === 'string' ? value : contextStroke;

const markerFillUsesContextStroke = (value: MarkerFill | undefined): boolean => typeof value === 'object';

const markerPrimUsesContextStroke = (prim: MarkerPrimitive): boolean => {
  if (prim.type === 'group') return prim.children.some(markerPrimUsesContextStroke);
  return markerFillUsesContextStroke(prim.fill) || markerFillUsesContextStroke(prim.stroke);
};

export const assertArrowCanInheritStroke = (
  stroke: PaintValue | undefined,
  arrows: { arrowStart?: ResolvedArrowEnd; arrowEnd?: ResolvedArrowEnd },
): void => {
  if (stroke === undefined || typeof stroke === 'string') return;
  const usesContextStroke =
    (arrows.arrowStart?.marker.some(markerPrimUsesContextStroke) ?? false) ||
    (arrows.arrowEnd?.marker.some(markerPrimUsesContextStroke) ?? false);
  if (!usesContextStroke) return;
  throw new Error(
    'Path arrow cannot inherit a IRPaint stroke; set arrowDetail.color or endpoint color to an explicit CSS color.',
  );
};

export const markerContextStroke = (stroke: PaintValue | undefined): string => {
  if (stroke === undefined) return 'currentColor';
  if (typeof stroke === 'string') return stroke;
  throw new Error('Path mark cannot inherit a IRPaint stroke; set the mark or arrow color to an explicit CSS color.');
};

/** marker 放置所需上下文 */
export type BuildMarkMarkerGroupContext = {
  strokeWidth: number;
  round: (n: number) => number;
  contextStroke: string;
};

/** marker 图元 → Scene 图元：结构同构，仅把 fill/stroke 的 contextStroke 解析成具体描边色（递归 group） */
const markerPrimToScene = (prim: MarkerPrimitive, contextStroke: string): ScenePrimitive => {
  if (prim.type === 'group') {
    return { ...prim, children: prim.children.map(c => markerPrimToScene(c, contextStroke)) };
  }
  // marker 窄子集 ⊂ Scene 图元；解析 contextStroke 后即合法 Scene 图元，cast 作用域仅此一处
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
  sample: SegmentSample,
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
  return { type: 'group', transforms, children: spec.marker.map(p => markerPrimToScene(p, contextStroke)) };
};
