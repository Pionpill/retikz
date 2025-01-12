import { CSSProperties, FC, ReactElement, Ref } from 'react';
import { StrokeProps } from '../../types/svg/stroke';
import { convertStrokeShortcut, convertStrokeType, StrokeShortcutProps, StrokeType } from '../../utils/style/stroke';
import InnerDraw from './Draw';
import { ArrowProps, DrawWayType } from './types';
import { PointPosition } from '../../types/coordinate';
import DescartesPoint from '../../model/geometry/point/DescartesPoint';
import { Position } from '../../types/coordinate/descartes';
import useScope from '../../hooks/context/useScope';

export type DrawProps = {
  ref?: Ref<SVGPathElement>;
  way: DrawWayType[];
  /** 位置偏移 */
  offset?: PointPosition;
  /** 同 stroke */
  color?: CSSProperties['stroke'];
  /** 线段样式快捷属性 */
  strokeType?: StrokeType;
  children?: ReactElement;
} & StrokeProps &
  StrokeShortcutProps &
  ArrowProps;

const Draw: FC<DrawProps> = props => {
  const { draw: scopeProps } = useScope();
  const realProps = { ...scopeProps, ...props };

  const { offset, color, stroke, strokeWidth, startArrow, startArrows, endArrow, endArrows, ...drawProps } = realProps;
  const realStroke = stroke || color;
  const realStartArrow = typeof startArrow === 'string' ? { type: startArrow } : startArrow;
  const realStartArrows = typeof startArrows === 'string' ? { type: startArrows } : startArrows;
  const realEndArrow = typeof endArrow === 'string' ? { type: endArrow } : endArrow;
  const realEndArrows = typeof endArrows === 'string' ? { type: endArrows } : endArrows;
  const convertOffset: Position = offset ? DescartesPoint.formatPosition(offset) : [0, 0];

  const getStrokeTypes = () =>
    drawProps.strokeType
      ? convertStrokeType(drawProps.strokeType, strokeWidth || 1)
      : convertStrokeShortcut(drawProps, strokeWidth || 1);

  return (
    <InnerDraw
      {...getStrokeTypes()}
      offset={convertOffset}
      stroke={realStroke}
      strokeWidth={strokeWidth || 1}
      startArrow={realStartArrow}
      startArrows={realStartArrows}
      endArrow={realEndArrow}
      endArrows={realEndArrows}
      {...drawProps}
    />
  );
};

export default Draw;
