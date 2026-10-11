import type { ValueOf } from '@retikz/foundation';

/** Runtime 更新策略 */
export const RuntimeUpdateStrategy = {
  Auto: 'auto',
  Full: 'full',
} as const;

/** Runtime 更新策略取值 */
export type RuntimeUpdateStrategy = ValueOf<typeof RuntimeUpdateStrategy>;
