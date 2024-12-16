export type Point = [number, number]
export type Size = [number, number]
export type LayoutDistance<T = number> = { left: T, right: T, top: T, bottom: T };
export type LayoutAllDistance<T = number> = { defaultVal: T, x: T, y: T } & LayoutDistance<T>;
export type LayoutAllTypeDistance = {
  paddings?: LayoutDistance<number>;
  margins?: LayoutDistance<number>;
  borders?: LayoutDistance<number>;
};