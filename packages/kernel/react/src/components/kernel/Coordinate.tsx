import type { CoordinateOptions, InputCoordinate } from '@retikz/vanilla';
import type { FC } from 'react';

import { TIKZ_COORDINATE } from '../../protocol';

/** 命名坐标点的 React 输入，不绘制可见内容 */
export type CoordinateProps = CoordinateOptions;

/**
 * 命名坐标点——TikZ `\coordinate (id) at (x, y);` 同义
 * @description 命名一个可引用的点，供后续 path 与其它 node 的 `at.of` 使用；自身不渲染、不参与 viewBox 扩展
 */
export const Coordinate: FC<CoordinateProps> = () => null;
Coordinate.displayName = TIKZ_COORDINATE;

/** 把 <Coordinate> props 组装为 Vanilla 命名坐标输入 */
export const inputCoordinateFromProps = (props: CoordinateProps): InputCoordinate => ({
  type: 'coordinate',
  id: props.id,
  position: props.position,
  ...(props.authoring === undefined ? {} : { authoring: props.authoring }),
});
