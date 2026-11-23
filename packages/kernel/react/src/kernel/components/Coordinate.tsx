import type { IRCoordinate } from '@retikz/core';
import type { FC } from 'react';

import { TIKZ_COORDINATE } from '../protocol';

/** 命名坐标点的 React 输入，不绘制可见内容 */
export type CoordinateProps = {
  /** 归一化时保留的作者元数据，不进入 Core IR */
  authoring?: unknown;
  /** 坐标点 id；路径端点和节点定位通过它引用此位置 */
  id: string;
  /**
   * 坐标点位置；不支持 Node 专属的自身锚点对齐
   * @description 笛卡尔 `[x, y]` / 极坐标 `{ angle, radius, origin? }` / 相对定位 `{ direction, of, distance? }` / 偏移定位 `{ of, offset }` / 比例位置 `{ between: [A, B], fraction }`
   */
  position: IRCoordinate['position'];
};

/**
 * 命名坐标点——TikZ `\coordinate (id) at (x, y);` 同义
 * @description 命名一个可引用的点，供后续 path 与其它 node 的 `at.of` 使用；自身不渲染、不参与 viewBox 扩展
 */
export const Coordinate: FC<CoordinateProps> = () => null;
Coordinate.displayName = TIKZ_COORDINATE;
