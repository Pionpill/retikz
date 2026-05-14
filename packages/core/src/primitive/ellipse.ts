/**
 * 椭圆原语（cx/cy 圆心，rx/ry 半径）
 * @description 圆形（rx=ry）复用同一 prim 单 case 处理；rotate 度数绕中心，非零时由 renderer 在 emit 阶段应用旋转变换
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
  dashPattern?: string;
  /** 整体透明度 0~1 */
  opacity?: number;
};
