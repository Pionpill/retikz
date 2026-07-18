/** Vanilla 分层缓存提示词表 */
export const VanillaLayerCache = {
  Static: 'static',
  Dynamic: 'dynamic',
  Auto: 'auto',
} as const;

/** 隐式默认分层 id，用于 `figure({ children })` 简写 */
export const DEFAULT_LAYER_ID = 'default';
