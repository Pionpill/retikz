import type { IRAtPosition, IRBetweenPosition, IROffsetPosition, IRPosition, PolarPosition } from '@retikz/core';
import type { InputAtPosition } from '@retikz/vanilla';
import type { FC } from 'react';

import { TIKZ_COORDINATE } from '../protocol';

/** 命名坐标点的 React 输入，不绘制可见内容 */
export type CoordinateProps = {
  /** 可选编译驱动解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
  /** 坐标点 id；路径端点和节点定位通过它引用此位置 */
  id: string;
  /**
   * 坐标点位置；不支持 Node 专属的自身锚点对齐
   * @description 笛卡尔 `[x, y]` / 极坐标 `{ angle, radius, origin? }` / 相对定位 `{ direction, of, distance? }` / 偏移定位 `{ of, offset }` / 比例位置 `{ between: [A, B], fraction }`
   */
  position: IRPosition | PolarPosition | IRAtPosition | InputAtPosition | IROffsetPosition | IRBetweenPosition;
};

/**
 * 命名坐标点——TikZ `\coordinate (id) at (x, y);` 同义
 * @description 命名一个可引用的点，供后续 path 与其它 node 的 `at.of` 使用；自身不渲染、不参与 viewBox 扩展
 */
export const Coordinate: FC<CoordinateProps> = () => null;
Coordinate.displayName = TIKZ_COORDINATE;
