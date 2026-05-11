/**
 * 椭圆原语，对应 SVG `<ellipse>`
 * @description 圆形（rx=ry）复用同一 prim 单 case 处理；rotate 度数绕中心，非零时 renderer 用 SVG transform 包裹
 */
export type EllipsePrim = {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** 绕中心旋转度数 */
  rotate?: number;
  fill?: string;
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  stroke?: string;
  /** 描边透明度 0~1 */
  strokeOpacity?: number;
  strokeWidth?: number;
  strokeDasharray?: string;
  /** 整体透明度 0~1 */
  opacity?: number;
};
