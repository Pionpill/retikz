import type { ValueOf } from '../shared';

/** Runtime Session 更新策略 */
export const RuntimeUpdateStrategy = {
  Auto: 'auto',
  Full: 'full',
} as const;

/** Runtime Session 更新策略取值 */
export type RuntimeUpdateStrategyValue = ValueOf<typeof RuntimeUpdateStrategy>;
