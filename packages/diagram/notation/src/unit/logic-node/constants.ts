import type { ValueOf } from '@retikz/foundation';

/** 逻辑节点的封闭视觉变体词汇 */
export const LogicNodeVariant = {
  Default: 'default',
  Primary: 'primary',
  Secondary: 'secondary',
  Outline: 'outline',
  Vibrant: 'vibrant',
} as const;

/** 逻辑节点视觉变体的取值类型 */
export type LogicNodeVariantValue = ValueOf<typeof LogicNodeVariant>;
