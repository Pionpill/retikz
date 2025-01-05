import { CSSProperties, FC, Ref } from 'react';
import { StrokeProps } from '../../types/svg/stroke';
import { convertStrokeShortcut, convertStrokeType, StrokeShortcutProps, StrokeType } from '../../utils/stroke';
import InnerDraw from './Draw';
import { ArrowConfig, DrawWayType } from './types';
import { ArrowType } from './arrow';

export type DrawProps = {
  ref?: Ref<SVGPathElement>;
  way: DrawWayType[];
  /** 同 stroke */
  color?: CSSProperties['stroke'];
  /** 线段样式快捷属性 */
  strokeType?: StrokeType;
  endArrow?: ArrowType | ArrowConfig;
} & StrokeProps &
  StrokeShortcutProps;

const Draw: FC<DrawProps> = props => {
  const { color, stroke, strokeWidth = 1, endArrow, ...drawProps } = props;
  const realStroke = stroke || color;
  const realEndArrow = typeof endArrow === 'string' ? { type: endArrow } : endArrow;

  const getStrokeTypes = () =>
    drawProps.strokeType
      ? convertStrokeType(drawProps.strokeType, strokeWidth)
      : convertStrokeShortcut(drawProps, strokeWidth);

  return (
    <InnerDraw
      {...getStrokeTypes()}
      stroke={realStroke}
      strokeWidth={strokeWidth}
      endArrow={realEndArrow}
      {...drawProps}
    />
  );
};

export default Draw;
