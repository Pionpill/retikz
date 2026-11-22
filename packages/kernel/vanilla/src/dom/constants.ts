import type { ValueOf } from '@retikz/foundation';

/** Vanilla view 执行模式 */
export const VanillaViewMode = {
  Retained: 'retained',
  Static: 'static',
} as const;

/** Vanilla view 执行模式取值 */
export type VanillaViewMode = ValueOf<typeof VanillaViewMode>;
