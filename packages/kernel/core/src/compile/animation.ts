import type { IRAnimationTrack } from '../schemas';
import type { CompileWarning } from './constant';

import { CompileWarningCode } from './constant';

/**
 * 校验 animation tracks 的 viewBox⇔根 约束（schema 上下文无关、分不清元素 vs 根，故在此 compile 层做）
 * @description `viewBox`（镜头）只在 scene 根合法、元素级非法；scene 根只接受 `viewBox`。违例 track → `warn(ANIMATION_INVALID_PROPERTY)` + drop（不丢图、不影响其余 track）。全空返回 undefined（不 stamp 空数组）。
 */
export const filterAnimations = (
  tracks: ReadonlyArray<IRAnimationTrack> | undefined,
  context: 'element' | 'root',
  onWarn: (warning: CompileWarning) => void,
  irPath: string,
): Array<IRAnimationTrack> | undefined => {
  if (tracks === undefined) return undefined;
  const kept = tracks.filter((track, index) => {
    const isViewBox = track.property === 'viewBox';
    const valid = context === 'root' ? isViewBox : !isViewBox;
    if (!valid) {
      onWarn({
        code: CompileWarningCode.AnimationInvalidProperty,
        message:
          context === 'root'
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
