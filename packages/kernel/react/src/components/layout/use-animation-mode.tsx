import type { Context, FC, ReactNode } from 'react';
import { createContext, useContext } from 'react';

/** React 子树的动画播放策略 */
export type AnimationMode = 'system' | 'enabled' | 'disabled';

/** `<Layout>` 的树级动画策略；无 Provider 时为 `undefined` */
export const AnimationModeContext: Context<AnimationMode | undefined> = createContext<AnimationMode | undefined>(
  undefined,
);

/** 读取最近祖先注入的动画策略 */
export const useAnimationMode = (): AnimationMode | undefined => useContext(AnimationModeContext);

/** 动画模式 Provider 属性 */
export type AnimationModeProviderProps = {
  /** 注入给子树中所有 `<Layout>` 的动画模式 */
  mode: AnimationMode;
  /** 子树 */
  children: ReactNode;
};

/**
 * 动画模式提供器
 * @description 统一设置子树的动画模式；嵌套时以最近的设置为准
 */
export const AnimationModeProvider: FC<AnimationModeProviderProps> = props => {
  const { mode, children } = props;
  return <AnimationModeContext.Provider value={mode}>{children}</AnimationModeContext.Provider>;
};
