import type { IRPath, PathThicknessValue, WayDSL } from '@retikz/core';
import type { InputPath } from '@retikz/vanilla';
import type { FC } from 'react';

import type { PathProps } from '../../kernel/components';

import { Path } from '../../kernel/components';

/** Draw 的作者侧属性 */
export type DrawProps = Readonly<{
  /** 实例视觉覆盖，逐字段覆盖继承默认值 */
  style?: InputPath['style'];
  /** TikZ 风格的路径走向简写 */
  way: WayDSL;
  /** 折线拐角几何圆角半径 */
  roundedCorners?: IRPath['roundedCorners'];
  /** 语义 stroke 档位糖 */
  thickness?: PathThicknessValue;
  /** 路径级箭头方向 */
  arrow?: PathProps['arrow'];
  /** 箭头详细配置 */
  arrowDetail?: PathProps['arrowDetail'];
  /** 箭头端点放置配置 */
  arrowPlacement?: PathProps['arrowPlacement'];
  /** 同层 stack 顺序 */
  zIndex?: IRPath['zIndex'];
}>;

/**
 * Sugar 组件，将路径 grammar 原样调度给 Vanilla
 * @description React 只负责 JSX sugar；`normalizePath` 是 `way` 的唯一 parser 调度位置
 */
export const Draw: FC<DrawProps> = props => <Path {...props} />;
