import type { IRAnimationTrack } from '../schemas';
import type { CompileWarning } from './constant';

import { CompileWarningCode } from './constant';

/**
 * 校验 animation tracks 的 scene 根约束。
 * @description 非法 track 会触发 warning 并被丢弃；全空返回 undefined。
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
