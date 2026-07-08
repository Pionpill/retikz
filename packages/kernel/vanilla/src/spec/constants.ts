/** Vanilla layer cache hint vocabulary. */
export const VanillaLayerCache = {
  Static: 'static',
  Dynamic: 'dynamic',
  Auto: 'auto',
} as const;

/** 隐式默认 layer id，用于 `figure({ children })` 简写。 */
export const DEFAULT_LAYER_ID = 'default';
