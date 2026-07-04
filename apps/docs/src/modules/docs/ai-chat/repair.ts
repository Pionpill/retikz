/** Auto-repair 三档：关 / 有限（默认）/ 始终。 */
export type AutoRepairMode = 'off' | 'limited' | 'always';

/** 不同 auto-repair 档位允许的最大自动修复次数。 */
export const RETIKZ_REPAIR_MAX_BY_MODE: Record<AutoRepairMode, number> = {
  off: 0,
  limited: 3,
  always: 99,
};
