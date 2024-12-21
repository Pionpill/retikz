import { CssDistanceType, DirectionDistance } from '.';

/** 快捷属性 */
export type SepShortcutProps<T = CssDistanceType> = {
  defaultVal: T;
  x: T;
  y: T;
} & DirectionDistance<T>;

/** 距离的全部属性 */
export type SepProps<T = CssDistanceType> = T | SepShortcutProps<T>;
