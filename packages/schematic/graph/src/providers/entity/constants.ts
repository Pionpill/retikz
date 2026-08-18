import type { ValueOf } from '@retikz/foundation';

/** Entity 的关系语义角色词汇 */
export const EntityRole = {
  /** 流程起点或终点 */
  Terminal: 'terminal',
  /** 流程处理或动作 */
  Stage: 'stage',
  /** 条件或分支 */
  Decision: 'decision',
  /** 分叉、汇合或延续点 */
  Junction: 'junction',
} as const;

/** Entity 角色的取值类型 */
export type EntityRoleValue = ValueOf<typeof EntityRole>;

/** Entity 的内置视觉变体词汇 */
export const EntityVariant = {
  /** 默认视觉变体，使用主色描边且不填充 */
  Default: 'default',
  /** 主色填充的视觉变体 */
  Fill: 'fill',
  /** 同时使用主色描边与浅色填充的混合视觉变体 */
  Mixed: 'mixed',
} as const;

/** Entity 视觉变体的取值类型 */
export type EntityVariantValue = ValueOf<typeof EntityVariant>;
