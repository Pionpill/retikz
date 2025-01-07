import { CSSProperties, FC, ReactElement, Ref } from 'react';
import { StrokeProps } from '../../types/svg/stroke';
import { convertStrokeShortcut, convertStrokeType, StrokeShortcutProps, StrokeType } from '../../utils/stroke';
import InnerDraw from './Draw';
import { ArrowProps, DrawWayType } from './types';

export type DrawProps = {
  ref?: Ref<SVGPathElement>;
  way: DrawWayType[];
  /** 同 stroke */
  color?: CSSProperties['stroke'];
  /** 线段样式快捷属性 */
  strokeType?: StrokeType;
  children?: ReactElement;
} & StrokeProps &
  StrokeShortcutProps &
  ArrowProps;

const Draw: FC<DrawProps> = props => {
  const { color, stroke, strokeWidth = 1, startArrow, startArrows, endArrow, endArrows, ...drawProps } = props;
  const realStroke = stroke || color;
  const realStartArrow = typeof startArrow === 'string' ? { type: startArrow } : startArrow;
  const realStartArrows = typeof startArrows === 'string' ? { type: startArrows } : startArrows;
  const realEndArrow = typeof endArrow === 'string' ? { type: endArrow } : endArrow;
  const realEndArrows = typeof endArrows === 'string' ? { type: endArrows } : endArrows;

  const getStrokeTypes = () =>
    drawProps.strokeType
      ? convertStrokeType(drawProps.strokeType, strokeWidth)
      : convertStrokeShortcut(drawProps, strokeWidth);

  return (
    <InnerDraw
      {...getStrokeTypes()}
      stroke={realStroke}
      strokeWidth={strokeWidth}
      startArrow={realStartArrow}
      startArrows={realStartArrows}
      endArrow={realEndArrow}
      endArrows={realEndArrows}
      {...drawProps}
    />
  );
};

export default Draw;
