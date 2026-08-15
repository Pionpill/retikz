import type { ValueOf } from '@retikz/foundation';

/** GraphNode 的关系语义角色词汇 */
export const GraphNodeRole = {
  /** 流程起点或终点 */
  Terminal: 'terminal',
  /** 流程处理或动作 */
  Stage: 'stage',
  /** 条件或分支 */
  Decision: 'decision',
  /** 分叉、汇合或延续点 */
  Junction: 'junction',
} as const;

/** GraphNode 角色的取值类型 */
export type GraphNodeRoleValue = ValueOf<typeof GraphNodeRole>;

/** GraphNode 的封闭视觉变体词汇 */
export const GraphNodeVariant = {
  Default: 'default',
  Primary: 'primary',
  Secondary: 'secondary',
  Outline: 'outline',
  Vibrant: 'vibrant',
} as const;

/** GraphNode 视觉变体的取值类型 */
export type GraphNodeVariantValue = ValueOf<typeof GraphNodeVariant>;
