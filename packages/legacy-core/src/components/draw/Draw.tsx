import type { ReactElement } from 'react';
import { forwardRef } from 'react';
import useScope from '../../hooks/context/useScope';
import DescartesPoint from '../../model/geometry/point/DescartesPoint';
import type { PointPosition } from '../../types/coordinate';
import type { Position } from '../../types/coordinate/descartes';
import type { StrokeProps } from '../../types/svg/stroke';
import type { StrokeShortcutProps, StrokeType } from '../../utils/style/stroke';
import { convertStrokeShortcut, convertStrokeType } from '../../utils/style/stroke';
import InnerDraw from './InnerDraw';
import type { ArrowProps, DrawWayType } from './types';

export type DrawProps = {
  way: Array<DrawWayType>;
  /** 位置偏移 */
  offset?: PointPosition;
  /** 同 stroke */
  color?: string;
  /** 线段样式快捷属性 */
  strokeType?: StrokeType;
  children?: ReactElement | Array<ReactElement> | null;
} & StrokeProps &
  StrokeShortcutProps &
  ArrowProps;

const Draw = forwardRef<SVGPathElement, DrawProps>((props, ref) => {
  const { draw: scopeProps } = useScope();
  const realProps = { ...scopeProps, ...props };

  const { offset, color, stroke, strokeWidth, startArrow, startArrows, endArrow, endArrows, ...resProps } = realProps;
  const realStroke = stroke || color;
  const realStartArrow = typeof startArrow === 'string' ? { type: startArrow } : startArrow;
  const realStartArrows = typeof startArrows === 'string' ? { type: startArrows } : startArrows;
  const realEndArrow = typeof endArrow === 'string' ? { type: endArrow } : endArrow;
  const realEndArrows = typeof endArrows === 'string' ? { type: endArrows } : endArrows;
  const convertOffset: Position = offset ? DescartesPoint.formatPosition(offset) : [0, 0];

  const getStrokeTypes = () =>
    resProps.strokeType
      ? convertStrokeType(resProps.strokeType, strokeWidth ?? 1)
      : convertStrokeShortcut(resProps, strokeWidth ?? 1);

  const drawProps: Partial<StrokeProps> & { way: Array<DrawWayType> } = { ...resProps };
  [
    'solid',
    'dashed',
    'denselyDashed',
    'looselyDashed',
    'dotted',
    'denselyDotted',
    'looselyDotted',
    'dashDot',
    'denselyDashDot',
    'looselyDashDot',
    'dashDashDot',
    'denselyDashDashDot',
    'looselyDashDashDot',
  ].forEach(key => {
    if (key in drawProps) {
      delete drawProps[key as keyof typeof drawProps];
    }
  });

  return (
    <InnerDraw
      ref={ref}
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
});

export default Draw;
