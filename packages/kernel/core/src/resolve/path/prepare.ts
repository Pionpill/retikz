import type { PropertyPath } from '@retikz/foundation';

import type { IRPathBase } from '../../schemas';
import { resolveAnimations } from '../animation';
import type { AnimationResolveContext } from '../animation';

/** 解析路径与引用无关的动画配置，供排队和直接计算共同使用 */
export const resolvePathAnimations = (
  path: IRPathBase,
  irPath: PropertyPath,
  onWarn: AnimationResolveContext['onWarn'],
): IRPathBase => ({ ...path, animations: resolveAnimations(path.animations, { target: 'element', irPath, onWarn }) });
