import type { IRAnimationTrack } from '../../schemas';
import type { CompileWarning } from '../constants';

import { CompileWarningCode } from '../constants';

/** animation 过滤上下文。 */
export type FilterAnimationsContext = {
  /** 校验目标层级。 */
  target: 'element' | 'root';
  /** warning 收集器。 */
  onWarn: (warning: CompileWarning) => void;
  /** 当前 IR locator。 */
  irPath: string;
};

/**
 * 校验 animation tracks 的 scene 根约束。
 * @description 非法 track 会触发 warning 并被丢弃；全空返回 undefined。
 */
export const filterAnimations = (
  tracks: ReadonlyArray<IRAnimationTrack> | undefined,
  context: FilterAnimationsContext,
): Array<IRAnimationTrack> | undefined => {
  const { target, onWarn, irPath } = context;
  if (tracks === undefined) return undefined;
  const kept = tracks.filter((track, index) => {
    const isViewBox = track.property === 'viewBox';
    const valid = target === 'root' ? isViewBox : !isViewBox;
    if (!valid) {
      onWarn({
        code: CompileWarningCode.AnimationInvalidProperty,
        message:
          target === 'root'
            ? `Scene-root animation must use the "viewBox" property (camera); got "${track.property}". Track dropped.`
            : `Animation property "viewBox" is camera-only (scene root), not valid on an element. Track dropped.`,
        path: `${irPath}.animations[${index}]`,
      });
      return false;
    }
    return true;
  });
  return kept.length > 0 ? kept : undefined;
};
