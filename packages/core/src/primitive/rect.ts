/** 矩形原语 */
export type RectPrim = {
  /** 类型判别符 */
  type: 'rect';
  /** 左上角横坐标 */
  x: number;
  /** 左上角纵坐标 */
  y: number;
  /** 矩形宽度 */
  width: number;
  /** 矩形高度 */
  height: number;
  /** 填充色，CSS 颜色字符串 */
  fill?: string;
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  /** 描边色 */
  stroke?: string;
  /** 描边宽度 */
  strokeWidth?: number;
  /** SVG stroke-dasharray 模式 */
  strokeDasharray?: string;
  /** 圆角半径（同时作用于 rx/ry） */
  cornerRadius?: number;
  /** 整体透明度 0~1 */
  opacity?: number;
};
