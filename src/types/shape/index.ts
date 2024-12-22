/** 几何体范围：内部，外部，边界线上 */
export enum Area {
  INSIDE = 'inside',
  OUTSIDE = 'outside',
  EDGE = 'edge',
}

/** 宽高 */
export type Size = [number, number];