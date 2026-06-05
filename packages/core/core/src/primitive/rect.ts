import type { PaintValue } from './paint';

/** 矩形原语 */
export type RectPrim = {
  /** 类型判别符 */
  type: 'rect';
  /** 稳定挂点 id：compile 从 IR 元素 user id stamp，供 renderer emit data-retikz-id / canvas hit-test */
  id?: string;
  /** 左上角横坐标 */
  x: number;
  /** 左上角纵坐标 */
  y: number;
  /** 矩形宽度 */
  width: number;
  /** 矩形高度 */
  height: number;
  /** 填充：纯色 CSS 串、或指向资源表的 paint server（gradient）、或 contextStroke */
  fill?: PaintValue;
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  /** 描边色 */
  stroke?: string;
  /** 描边透明度 0~1 */
  strokeOpacity?: number;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 描边 dash pattern（如 [4, 2]） */
  dashPattern?: Array<number>;
  /** 圆角半径（同时作用于 rx/ry） */
  cornerRadius?: number;
  /** 整体透明度 0~1 */
  opacity?: number;
};
