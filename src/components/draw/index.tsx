import { CSSProperties, FC, Ref } from 'react';
import { PointPosition } from '../../types/coordinate';
import { StrokeProps } from '../../types/svg/stroke';
import { TikZKey } from '../../types/tikz';
import { OffSetOrMovePosition, VerticalDrawPosition } from './common';
import InnerDraw from './Draw';
import { convertStrokeShortcut, convertStrokeType, StrokeShortcutProps, StrokeType } from '../../utils/stroke';

export type ArrowStyleShortcut = '';

export type DrawWayType = TikZKey | PointPosition | VerticalDrawPosition | OffSetOrMovePosition;

export type DrawProps = {
  ref?: Ref<SVGPathElement>;
  way: DrawWayType[];
  /** 同 stroke */
  color?: CSSProperties['stroke'];
  /** 线段样式快捷属性 */
  strokeType?: StrokeType;
} & StrokeProps &
  StrokeShortcutProps;

const Draw: FC<DrawProps> = props => {
  const { color, stroke, strokeWidth = 1, ...drawProps } = props;
  const realStroke = stroke || color;

  const getStrokeTypes = () =>
    drawProps.strokeType
      ? convertStrokeType(drawProps.strokeType, strokeWidth)
      : convertStrokeShortcut(drawProps, strokeWidth);

  return <InnerDraw {...getStrokeTypes()} stroke={realStroke} strokeWidth={strokeWidth} {...drawProps} />;
};

export default Draw;
