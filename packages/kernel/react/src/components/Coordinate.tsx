import { pickDefined } from '@retikz/foundation';
import type { CoordinateOptions, InputCoordinate } from '@retikz/vanilla';
import type { FC } from 'react';

import { KernelDisplayName } from '../shared';

/** 命名坐标点的 React 输入，不绘制可见内容 */
export type CoordinateProps = CoordinateOptions;

/**
 * 命名坐标点
 * @description 命名一个可引用的点，供后续 path 与其它 node 的 `at.of` 使用；自身不渲染、不参与 viewBox 扩展
 */
export const Coordinate: FC<CoordinateProps> = () => null;
Coordinate.displayName = KernelDisplayName.Coordinate;

/** 把 <Coordinate> props 组装为 Vanilla 命名坐标输入 */
export const convertCoordinateProps = (props: CoordinateProps): InputCoordinate => ({
  type: 'coordinate',
  id: props.id,
  position: props.position,
  ...pickDefined(props, ['authoring']),
});
