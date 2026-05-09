/**
 * 椭圆原语：SVG `<ellipse>` 直对应。
 * 圆形（半长轴 = 半短轴）用同一个 EllipsePrim 表示，让 renderer 单一 case 处理。
 * 旋转走 `rotate` 字段（度数，绕中心）；非零时 renderer 用 SVG transform 包裹。
 */
export type EllipsePrim = {
  /** 类型判别符 */
  type: 'ellipse';
  /** 中心横坐标 */
  cx: number;
  /** 中心纵坐标 */
  cy: number;
  /** 水平半轴 */
  rx: number;
  /** 垂直半轴 */
  ry: number;
  /** 绕中心的旋转角（度数，与 RectPrim 风格一致）；省略或 0 不旋转 */
  rotate?: number;
  /** 填充色 */
  fill?: string;
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  /** 描边色 */
  stroke?: string;
  /** 描边透明度 0~1（SVG stroke-opacity） */
  strokeOpacity?: number;
  /** 描边宽度 */
  strokeWidth?: number;
  /** SVG stroke-dasharray 模式 */
  strokeDasharray?: string;
  /** 整体透明度 0~1 */
  opacity?: number;
};
