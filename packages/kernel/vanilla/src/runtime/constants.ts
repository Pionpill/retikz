import type { ValueOf } from '@retikz/foundation';

/** 默认资源 id 前缀（确定性）；多实例同页须经 `options.output.idPrefix` 显式区分。SSR 与 mount 共用同一默认，避免两处漂移导致资源 id 失配 */
export const DEFAULT_ID_PREFIX = 'r';

/** Vanilla view 执行模式 */
export const VanillaViewMode = {
  Retained: 'retained',
  Static: 'static',
} as const;

/** Vanilla view 执行模式取值 */
export type VanillaViewModeValue = ValueOf<typeof VanillaViewMode>;
