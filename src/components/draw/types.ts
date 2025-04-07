import { PointPosition } from '../../types/coordinate';
import { StrokeProps } from '../../types/svg/stroke';
import { TikZKey } from '../../types/tikz';
import { ArrowPositionAttributes, ArrowType } from './arrow';

export type ArrowConfig = { type: ArrowType; fill?: string } & ArrowPositionAttributes & StrokeProps;

/** 垂直路径点，临近的节点不能都是特殊路径点 */
export type VerticalDrawPosition = '-|' | '|-' | '-|-' | '|-|';

/** 偏移与移动点 */
export type OffSetOrMovePosition = string;

/** 路径点类型：节点，坐标，垂点，偏移点，移动点 */
export type DrawPointType = 'node' | 'coordinate' | 'vertical' | 'offset' | 'move';

/** 路径节点类型 */
export type DrawWayType = TikZKey | PointPosition | VerticalDrawPosition | OffSetOrMovePosition;

/** 路径片段节点类型 */
export type DrawWaySegmentType = [
  TikZKey | PointPosition,
  ...Array<PointPosition | VerticalDrawPosition | OffSetOrMovePosition>,
  TikZKey | PointPosition,
];

/** 箭头属性 */
export type ArrowProps<T = ArrowType | ArrowConfig> = {
  startArrow?: T;
  startArrows?: T;
  endArrow?: T;
  endArrows?: T;
};
