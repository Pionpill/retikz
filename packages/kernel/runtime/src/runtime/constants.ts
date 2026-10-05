import type { ValueOf } from '@retikz/foundation';

/** Runtime Runtime 更新策略 */
export const RuntimeUpdateStrategy = {
  Auto: 'auto',
  Full: 'full',
} as const;

/** Runtime Runtime 更新策略取值 */
export type RuntimeUpdateStrategy = ValueOf<typeof RuntimeUpdateStrategy>;
