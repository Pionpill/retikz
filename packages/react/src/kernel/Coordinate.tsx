import type { FC } from 'react';
import type { IRAtPosition, IROffsetPosition, IRPosition, PolarPosition } from '@retikz/core';
import { TIKZ_COORDINATE } from './_displayNames';

/** <Coordinate> 组件的 props */
export type CoordinateProps = {
  /** 占位节点的 id；其它 path / node `at.of` 通过这个 id 引用 */
  id: string;
  /**
   * 占位点位置；与 `<Node position>` 形态完全一致
   * @description 笛卡尔 `[x, y]` / 极坐标 `{ angle, radius, origin? }` / 相对定位 `{ direction, of, distance? }` / 偏移定位 `{ of, offset }`（`of` 可为节点 id / 笛卡尔 / 极坐标）
   */
  position: IRPosition | PolarPosition | IRAtPosition | IROffsetPosition;
};

/**
 * 占位节点——TikZ `\coordinate (id) at (x, y);` 同义
 * @description 命名一个点供后续 path 与其他 node 的 `at.of` 引用，自身不渲染、不参与 viewBox 扩展；由 <TikZ> builder 在 children 扫描阶段读出 props 构造 IR
 */
export const Coordinate: FC<CoordinateProps> = () => null;
Coordinate.displayName = TIKZ_COORDINATE;
