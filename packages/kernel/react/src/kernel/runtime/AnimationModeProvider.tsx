import type { FC, ReactNode } from 'react';

import type { AnimationMode } from './animation-context';

import { AnimationModeContext } from './animation-context';

/** 动画模式 Provider 属性。 */
export type AnimationModeProviderProps = {
  /** 注入给子树中所有 `<Layout>` 的动画模式。 */
  mode: AnimationMode;
  /** 子树。 */
  children: ReactNode;
};

/**
 * 动画模式 Provider。
 * @description 让宿主统一覆盖子树中所有 `<Layout>` 的 `animate` 配置。`system` 跟随系统减少动态效果偏好，
 *   `enabled` / `disabled` 分别强制开启或关闭；嵌套时最近的 Provider 生效。
 */
export const AnimationModeProvider: FC<AnimationModeProviderProps> = props => {
  const { mode, children } = props;
  return <AnimationModeContext.Provider value={mode}>{children}</AnimationModeContext.Provider>;
};
