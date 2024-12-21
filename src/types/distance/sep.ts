import { Distance } from ".";

/** 快捷属性 */
export type SepShortcutType<T = string | number | undefined> = {
  defaultVal: T;
  x: T;
  y: T;
} & Distance<T>;

/** 距离的全部属性 */
export type SepType<T = string | number | undefined> = T | SepShortcutType<T>;

/** 组件内外距离 */
export type SepProps<T = string | number | undefined> = {
  innerSep: SepType<T>
  outerSep: SepType<T>
}
