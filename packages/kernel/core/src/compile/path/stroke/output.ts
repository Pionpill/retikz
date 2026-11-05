import type { GroupPrimitive, ScenePrimitive } from '../../../contract';
import type { CanonicalPathProperties } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import type { RegisterPaint } from '../../resource';
import type { PathBaseProps } from './split';
import { calculatePathBoundsCenter, lowerPathTransforms, applyPathTransforms } from './transform';

/** 已物化默认值后的 PathPrimitive 公共样式属性 */
export type PathBasePropsWithStrokeWidth = PathBaseProps & {
  /** 最终描边宽度 */
  strokeWidth: number;
};

/** path 输出样式物化上下文 */
type EmitPathBasePropsContext = {
  /** IRPaint 物化器 */
  registerPaint: RegisterPaint;
};

/** 将已解析 path 样式物化为 PathPrimitive 公共属性 */
export const emitPathBaseProps = (
  canon: CanonicalPathProperties,
  context: EmitPathBasePropsContext,
): PathBasePropsWithStrokeWidth => {
  const { registerPaint } = context;
  return {
    stroke: registerPaint(canon.stroke) ?? 'currentColor',
    strokeWidth: canon.strokeWidth,
    fill: registerPaint(canon.fill) ?? 'none',
    fillRule: canon.fillRule === 'nonzero' ? undefined : canon.fillRule,
    dashPattern: canon.dashPattern.length === 0 ? undefined : canon.dashPattern,
    dashOffset: canon.dashOffset === 0 ? undefined : canon.dashOffset,
    lineCap: canon.lineCap === 'butt' ? undefined : canon.lineCap,
    lineJoin: canon.lineJoin === 'miter' ? undefined : canon.lineJoin,
    opacity: canon.opacity === 1 ? undefined : canon.opacity,
    fillOpacity: canon.fillOpacity === 1 ? undefined : canon.fillOpacity,
    strokeOpacity: canon.strokeOpacity === 1 ? undefined : canon.strokeOpacity,
    shadow: canon.shadow,
    blendMode: canon.blendMode === 'normal' ? undefined : canon.blendMode,
  };
};

/** path emit 最终输出包装输入 */
type InputPathPrimitiveWrapping = {
  /** 原始 IR path，用于读取 transform 与水合元数据 */
  path: CanonicalPathProperties;
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
const assignPathAnimations = (
  owner: ScenePrimitive,
  primitive: ScenePrimitive,
  canon: CanonicalPathProperties,
): void => {
  if (canon.animations === undefined) return;
  if (owner === primitive) {
    owner.animations = canon.animations;
    return;
  }
  const drawing = canon.animations.filter(track => track.property === 'pathDraw');
  const remaining = canon.animations.filter(track => track.property !== 'pathDraw');
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
}: InputPathPrimitiveWrapping) => {
  if ((path.rotate !== undefined || path.scale !== undefined) && boundsPoints.length > 0) {
    const center = calculatePathBoundsCenter(boundsPoints);
    const transforms = lowerPathTransforms({ rotate: path.rotate, scale: path.scale, center, round });
    if (transforms.length > 0) {
      const group: GroupPrimitive = { type: 'group', transforms, children: bodyPrims };
      if (path.id !== undefined) group.id = path.id;
      if (path.meta !== undefined) group.meta = path.meta;
      assignPathAnimations(group, primitive, path);

      return { primitives: [group], boundsPoints: applyPathTransforms(boundsPoints, transforms) };
    }
  }

  const owner: ScenePrimitive = path.marks?.length ? { type: 'group', children: bodyPrims } : primitive;
  if (path.id !== undefined) owner.id = path.id;
  if (path.meta !== undefined) owner.meta = path.meta;
  assignPathAnimations(owner, primitive, path);

  return { primitives: owner === primitive ? bodyPrims : [owner], boundsPoints };
};
