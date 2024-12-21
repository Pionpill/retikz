/** 几何体范围：内部，外部，边界线上 */
export enum Area {
  INNER = 'inner',
  OUTER = 'outer',
  EDGE = 'edge',
}

/** 宽高 */
export type Size = [number, number];