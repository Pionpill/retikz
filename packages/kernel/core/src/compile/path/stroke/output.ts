import type { GroupPrim, ScenePrimitive } from '../../../contract';
import type { CanonicalPath } from '../../../normalize/path';
import type { IRPosition } from '../../../schemas';
import type { PathPrimitiveEmitResult } from '../types';

import { bboxCenter, buildPathTransforms, projectPathTransformPoints } from './transform';

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

/**
 * 包装 path 最终输出
 * @description rotate / scale 需要最后包 GroupPrim；水合 id/meta/animations 只落在最外层主体 primitive
 */
export const wrapPathPrimitiveOutput = ({
  path,
  primitive,
  bodyPrims,
  boundsPoints,
  round,
}: WrapPathPrimitiveOutputInput): PathPrimitiveEmitResult => {
  if ((path.rotate !== undefined || path.scale !== undefined) && boundsPoints.length > 0) {
    const center = bboxCenter(boundsPoints);
    const transforms = buildPathTransforms({ rotate: path.rotate, scale: path.scale, center, round });
    if (transforms.length > 0) {
      const group: GroupPrim = { type: 'group', transforms, children: bodyPrims };
      if (path.id !== undefined) group.id = path.id;
      if (path.meta !== undefined) group.meta = path.meta;
      if (path.animations !== undefined) group.animations = path.animations;
      return { primitives: [group], boundsPoints: projectPathTransformPoints(boundsPoints, transforms) };
    }
  }

  if (path.id !== undefined) primitive.id = path.id;
  if (path.meta !== undefined) primitive.meta = path.meta;
  if (path.animations !== undefined) primitive.animations = path.animations;
  return { primitives: bodyPrims, boundsPoints };
};
