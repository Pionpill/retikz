import { prefersReducedMotion, resolveAnimationEnabled, subscribeReducedMotion } from '@retikz/render/animation';
import type { Context, FC, ReactNode } from 'react';
import { createContext, useContext, useSyncExternalStore } from 'react';

/** React 子树的动画播放策略 */
export type AnimationMode = 'system' | 'enabled' | 'disabled';

/** `<Layout>` 的树级动画策略；无 Provider 时为 `undefined` */
export const AnimationModeContext: Context<AnimationMode | undefined> = createContext<AnimationMode | undefined>(
  undefined,
);

/** 读取最近祖先注入的动画策略 */
export const useAnimationMode = (): AnimationMode | undefined => useContext(AnimationModeContext);

/** SSR 没有用户媒体偏好，固定返回 false，保证服务端输出与 hydration 首帧一致 */
const getServerSnapshot = (): boolean => false;

/** 解析容器的默认动画开关；未注入模式时跟随系统偏好 */
export const useDefaultAnimationEnabled = (): boolean => {
  const mode = useAnimationMode() ?? 'system';
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, getServerSnapshot);
  return resolveAnimationEnabled(mode === 'system' ? undefined : mode === 'enabled', reducedMotion);
};

/** 动画模式 Provider 属性 */
export type AnimationModeProviderProps = {
  /** 注入给子树中所有 `<Layout>` 的动画模式 */
  mode: AnimationMode;
  /** 子树 */
  children: ReactNode;
};

/**
 * 动画模式提供器
 * @description 设置子树的默认动画模式；Layout 的 animate 优先
 */
export const AnimationModeProvider: FC<AnimationModeProviderProps> = props => {
  const { mode, children } = props;
  return <AnimationModeContext.Provider value={mode}>{children}</AnimationModeContext.Provider>;
};
