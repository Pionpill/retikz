import type { IRPath } from '@retikz/core';
import type { WayDSL } from '@retikz/vanilla';
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
  cornerRadius?: IRPath['cornerRadius'];
  /** 路径起点与终点的箭头配置 */
  arrow?: PathProps['arrow'];
  /** 沿路径按弧长比例放置图元标记 */
  marks?: PathProps['marks'];
  /** 同层 stack 顺序 */
  zIndex?: IRPath['zIndex'];
}>;

/**
 * Sugar 组件，将路径 grammar 原样调度给 Vanilla
 * @description React 只负责 JSX sugar；`normalizePath` 是 `way` 的唯一 parser 调度位置
 */
export const Draw: FC<DrawProps> = props => <Path {...props} />;
