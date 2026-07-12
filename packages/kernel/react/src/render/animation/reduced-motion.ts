import { prefersReducedMotion } from '@retikz/render/animation';
import { useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** SSR 没有用户媒体偏好，固定返回 false，保证服务端输出与 hydration 首帧一致。 */
const getServerSnapshot = (): boolean => false;

/** 订阅系统减少动态效果偏好；不支持 matchMedia 的环境保持静态订阅。 */
const subscribe = (onStoreChange: () => void): (() => void) => {
  if (typeof globalThis.matchMedia !== 'function') return () => undefined;
  const mediaQuery = globalThis.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
};

/** 读取并订阅系统减少动态效果偏好，客户端变化时触发 React 重渲染。 */
export const usePrefersReducedMotion = (): boolean =>
  useSyncExternalStore(subscribe, prefersReducedMotion, getServerSnapshot);
