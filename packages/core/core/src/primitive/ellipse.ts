/**
 * 椭圆原语（cx/cy 圆心，rx/ry 半径）
 * @description 圆形（rx=ry）复用同一 prim 单 case 处理；rotate 度数绕中心，非零时由 renderer 在 emit 阶段应用旋转变换
 */
import type { PaintValue } from './paint';

export type EllipsePrim = {
  type: 'ellipse';
  /** 稳定挂点 id：compile 从 IR 元素 user id stamp，供 renderer emit data-retikz-id / canvas hit-test */
  id?: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** 绕中心旋转度数 */
  rotate?: number;
  /** 填充：纯色 / 资源表 paint server（gradient）/ contextStroke */
  fill?: PaintValue;
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  stroke?: string;
  /** 描边透明度 0~1 */
  strokeOpacity?: number;
  strokeWidth?: number;
  dashPattern?: Array<number>;
  /** 整体透明度 0~1 */
  opacity?: number;
};
