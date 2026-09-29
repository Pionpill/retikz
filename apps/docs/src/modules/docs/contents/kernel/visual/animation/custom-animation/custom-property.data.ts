import type { IRAnimationTrack } from '@retikz/core';

/** 创建从指定模糊值过渡到清晰状态的轨道 */
export const createBlurIn = (from: number, duration: number): IRAnimationTrack => ({
  property: 'blur',
  keyframes: [
    { at: 0, value: from },
    { at: 1, value: 0 },
  ],
  duration,
});
