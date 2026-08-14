import type { ValueOf } from '@retikz/foundation';

/** 逻辑单元的封闭视觉变体词汇 */
export const LogicUnitVariant = {
  Default: 'default',
  Primary: 'primary',
  Secondary: 'secondary',
  Outline: 'outline',
  Vibrant: 'vibrant',
} as const;

/** 逻辑单元视觉变体的取值类型 */
export type LogicUnitVariantValue = ValueOf<typeof LogicUnitVariant>;
