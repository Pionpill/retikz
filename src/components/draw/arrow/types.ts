import { Position } from "../../../types/coordinate/descartes";

/** 这些属性会影响箭头位置的计算 */
export type ArrowPositionAttributes = {
  width?: number;
  length?: number;
  insert?: number;
  left?: boolean;
  right?: boolean;
  round?: boolean;
  lineWidth?: number;
  scale?: number;
  strokeLinejoin?: "round" | "inherit" | "bevel" | "miter"
};

export type ArrowPathConfig = {
  /** path d 属性路径 */
  d: string;
  /** 与路径连接的点 */
  pathLinkPoint: Position;
  /** 箭头顶点与 path 顶点的距离 */
  offsetDistance: number;
  /** insert 点与 path 顶点的距离 */
  insertDistance: number;
}