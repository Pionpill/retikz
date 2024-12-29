import { CSSProperties, FC, Ref } from 'react';
import { PointPosition } from '../../types/coordinate';
import { StrokeProps } from '../../types/svg/stroke';
import { TikZKey } from '../../types/tikz';
import { OffSetOrMovePosition, VerticalDrawPosition } from './common';
import InnerDraw from './Draw';

export type ArrowStyleShortcut = '';

export type DrawWayType = TikZKey | PointPosition | VerticalDrawPosition | OffSetOrMovePosition;

export type DrawProps = {
  ref?: Ref<SVGPathElement>;
  way: DrawWayType[];
  /** 同 stroke */
  color?: CSSProperties['stroke'];
  
} & StrokeProps;

const Draw: FC<DrawProps> = props => {
  const { color, stroke, ...drawProps } = props;
  const realStroke = stroke || color;

  return <InnerDraw stroke={realStroke} {...drawProps} />;
};

export default Draw;
