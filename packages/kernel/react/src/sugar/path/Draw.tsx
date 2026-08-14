import type { IRPath, PathThicknessValue, WayDSL } from '@retikz/core';
import type { FC } from 'react';

import type { PathProps } from '../../kernel/components';

import { Path } from '../../kernel/components';

/** Draw 的作者侧属性 */
export type DrawProps = Readonly<{
  /** TikZ 风格的路径走向简写 */
  way: WayDSL;
  /** 描边色 */
  stroke?: IRPath['stroke'];
  /** 描边宽度 */
  strokeWidth?: IRPath['strokeWidth'];
  /** 描边 dash pattern */
  dashPattern?: IRPath['dashPattern'];
  /** 描边 dash offset */
  dashOffset?: IRPath['dashOffset'];
  /** 端点形状 */
  lineCap?: IRPath['lineCap'];
  /** 拐点形状 */
  lineJoin?: IRPath['lineJoin'];
  /** 折线拐角几何圆角半径 */
  roundedCorners?: IRPath['roundedCorners'];
  /** 主路径投影 */
  shadow?: IRPath['shadow'];
  /** 主路径混合模式 */
  blendMode?: IRPath['blendMode'];
  /** 语义 stroke 档位糖 */
  thickness?: PathThicknessValue;
  /** 路径级箭头方向 */
  arrow?: PathProps['arrow'];
  /** 箭头详细配置 */
  arrowDetail?: PathProps['arrowDetail'];
  /** 闭合区域填充色 */
  fill?: IRPath['fill'];
  /** 填充规则 */
  fillRule?: IRPath['fillRule'];
  /** 整 path 透明度 */
  opacity?: IRPath['opacity'];
  /** fill 透明度 */
  fillOpacity?: IRPath['fillOpacity'];
  /** stroke 透明度 */
  strokeOpacity?: IRPath['strokeOpacity'];
  /** 同层 stack 顺序 */
  zIndex?: IRPath['zIndex'];
}>;

/**
 * Sugar 组件，将路径 grammar 原样调度给 Vanilla
 * @description React 只负责 JSX sugar；`normalizePath` 是 `way` 的唯一 parser 调度位置
 */
export const Draw: FC<DrawProps> = props => <Path {...props} />;
