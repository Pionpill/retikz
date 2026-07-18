import type { Context } from 'react';

import { createContext, useContext } from 'react';

/** React 子树的动画播放策略 */
export type AnimationMode = 'system' | 'enabled' | 'disabled';

/** `<Layout>` 的树级动画策略；无 Provider 时为 `undefined` */
export const AnimationModeContext: Context<AnimationMode | undefined> = createContext<AnimationMode | undefined>(
  undefined,
);

/** 读取最近祖先注入的动画策略 */
export const useAnimationMode = (): AnimationMode | undefined => useContext(AnimationModeContext);
