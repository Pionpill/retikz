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

/** Entity 的封闭视觉变体词汇 */
export const EntityVariant = {
  Default: 'default',
  Primary: 'primary',
  Secondary: 'secondary',
  Outline: 'outline',
  Vibrant: 'vibrant',
} as const;

/** Entity 视觉变体的取值类型 */
export type EntityVariantValue = ValueOf<typeof EntityVariant>;
