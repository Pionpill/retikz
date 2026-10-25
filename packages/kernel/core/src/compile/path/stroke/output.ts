import type { GroupPrimitive, ScenePrimitive } from '../../../contract';
import type { CanonicalPath } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import type { PaintResolver } from '../../resource';
import type { PathBaseProps } from './split';
import { bboxCenter, buildPathTransforms, projectPathTransformPoints } from './transform';

/** 已物化默认值后的 PathPrimitive 公共样式属性 */
export type PathBasePropsWithStrokeWidth = PathBaseProps & {
  /** 最终描边宽度 */
  strokeWidth: number;
};

/** path 输出样式物化上下文 */
export type EmitPathBasePropsContext = {
  /** IRPaint 物化器 */
  resolvePaint: PaintResolver;
};

/** 将已解析 path 样式物化为 PathPrimitive 公共属性 */
export const emitPathBaseProps = (
  path: CanonicalPath,
  context: EmitPathBasePropsContext,
): PathBasePropsWithStrokeWidth => {
  const { resolvePaint } = context;
  return {
    stroke: resolvePaint(path.stroke) ?? 'currentColor',
    strokeWidth: path.strokeWidth,
    fill: resolvePaint(path.fill) ?? 'none',
    fillRule: path.fillRule,
    dashPattern: path.dashPattern,
    dashOffset: path.dashOffset,
    lineCap: path.lineCap,
    lineJoin: path.lineJoin,
    opacity: path.opacity,
    fillOpacity: path.fillOpacity,
    strokeOpacity: path.strokeOpacity,
    shadow: path.shadow,
    blendMode: path.blendMode,
  };
};

/** path emit 最终输出包装输入 */
export type WrapPathPrimitiveOutputInput = {
  /** 原始 IR path，用于读取 transform 与水合元数据 */
  path: CanonicalPath;
  /** 主体 primitive；无整体 transform 时 id/meta/animations 会落在这里 */
  primitive: ScenePrimitive;
  /** 主体、label、mark primitives */
  bodyPrims: Array<ScenePrimitive>;
  /** 当前 path 的 bbox 采样点 */
  boundsPoints: Array<IRPosition>;
  /** 坐标取整函数 */
  round: (n: number) => number;
};

/** 路径绘制进度保留在主体上，其余动画随整个宿主输出播放 */
const assignPathAnimations = (owner: ScenePrimitive, primitive: ScenePrimitive, path: CanonicalPath): void => {
  if (path.animations === undefined) return;
  if (owner === primitive) {
    owner.animations = path.animations;
    return;
  }
  const drawing = path.animations.filter(track => track.property === 'pathDraw');
  const remaining = path.animations.filter(track => track.property !== 'pathDraw');
  if (drawing.length > 0) primitive.animations = drawing;
  if (remaining.length > 0) owner.animations = remaining;
};

/**
 * 包装 path 最终输出
 * @description rotate / scale 与标记共用宿主分组；id/meta 和整体动画归属宿主，pathDraw 归属主线
 */
export const wrapPathPrimitiveOutput = ({
  path,
  primitive,
  bodyPrims,
  boundsPoints,
  round,
}: WrapPathPrimitiveOutputInput) => {
  if ((path.rotate !== undefined || path.scale !== undefined) && boundsPoints.length > 0) {
    const center = bboxCenter(boundsPoints);
    const transforms = buildPathTransforms({ rotate: path.rotate, scale: path.scale, center, round });
    if (transforms.length > 0) {
      const group: GroupPrimitive = { type: 'group', transforms, children: bodyPrims };
      if (path.id !== undefined) group.id = path.id;
      if (path.meta !== undefined) group.meta = path.meta;
      assignPathAnimations(group, primitive, path);

      return { primitives: [group], boundsPoints: projectPathTransformPoints(boundsPoints, transforms) };
    }
  }

  const owner: ScenePrimitive = path.marks?.length ? { type: 'group', children: bodyPrims } : primitive;
  if (path.id !== undefined) owner.id = path.id;
  if (path.meta !== undefined) owner.meta = path.meta;
  assignPathAnimations(owner, primitive, path);

  return { primitives: owner === primitive ? bodyPrims : [owner], boundsPoints };
};
