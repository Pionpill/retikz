import type { PropertyPath } from '@retikz/foundation';

import type { IRPathBase } from '../../schemas';
import { resolveAnimations } from '../animation';
import type { AnimationResolveContext } from '../animation';

/** 解析路径与引用无关的动画配置，供排队和直接计算共同使用 */
export const resolvePathAnimations = (
  path: IRPathBase,
  irPath: PropertyPath,
  onWarn: AnimationResolveContext['onWarn'],
): IRPathBase => {
  const animations = resolveAnimations(path.animations, { target: 'element', irPath, onWarn });
  // 过滤器只删除轨道，不改写成员；全部有效时保留作者数组和 Path，避免排队破坏输入身份
  if (animations === path.animations || (animations !== undefined && animations.length === path.animations?.length))
    return path;
  return { ...path, animations };
};
