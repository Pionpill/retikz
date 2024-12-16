export type Point = [number, number];
export type Size = [number, number];
export type LayoutDistance<T = number> = { left: T; right: T; top: T; bottom: T };
export type LayoutExpandDistance<T = number> = { defaultVal: T; x: T; y: T } & LayoutDistance<T>;
export type AllLayoutDistance<T = number> = {
  paddings: LayoutDistance<T>;
  margins: LayoutDistance<T>;
  borders: LayoutDistance<T>;
};
