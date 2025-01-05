/** 箭头属性 */
export type ArrowAttributes = {
  width?: number;
  length?: number;
  insert?: number;
  left?: boolean;
  right?: boolean;
  round?: boolean;
  strokeWidth?: number;
  scale?: number;
  linkType?: 'center' | 'end',
  strokeLinejoin?: "round" | "inherit" | "bevel" | "miter"
};

export type ArrowPathConfig = {
  /** path d 属性路径 */
  d: string;
  /** 箭头顶点与 path 顶点的距离 */
  offsetDistance: number;
  /** insert 点与 path 顶点的距离 */
  insertDistance: number;
}