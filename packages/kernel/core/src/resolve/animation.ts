import type { PropertyPath } from '@retikz/foundation';

import type { IRAnimationTrack } from '../schemas';

/** 动画轨道的目标层级与诊断上下文 */
export type AnimationResolveContext = {
  /** 校验目标层级 */
  target: 'element' | 'root';
  /** 接收不适用于当前目标的轨道诊断 */
  onWarn: (warning: {
    /** 动画目标约束的诊断码 */
    code: 'ANIMATION_INVALID_PROPERTY';
    /** 被丢弃轨道的原因 */
    message: string;
    /** 轨道在 Source IR 中的位置 */
    path: PropertyPath;
  }) => void;
  /** 当前 IR locator */
  irPath: PropertyPath;
};

/**
 * 按根级或元素级上下文确定可用动画轨道
 * @description 非法 track 会触发 warning 并被丢弃；全空返回 undefined
 */
export const resolveAnimations = (
  tracks: ReadonlyArray<IRAnimationTrack> | undefined,
  context: AnimationResolveContext,
): Array<IRAnimationTrack> | undefined => {
  const { target, onWarn, irPath } = context;
  if (tracks === undefined) return undefined;

  const kept = tracks.filter((track, index) => {
    const isViewBox = track.property === 'viewBox';
    const valid = target === 'root' ? isViewBox : !isViewBox;
    if (!valid) {
      onWarn({
        code: 'ANIMATION_INVALID_PROPERTY',
        message:
          target === 'root'
            ? `Scene-root animation must use the "viewBox" property (camera); got "${track.property}". Track dropped.`
            : `Animation property "viewBox" is camera-only (scene root), not valid on an element. Track dropped.`,
        path: [...irPath, 'animations', index],
      });
      return false;
    }

    return true;
  });

  return kept.length > 0 ? kept : undefined;
};
