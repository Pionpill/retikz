import { FC, PropsWithChildren, SVGProps, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Rect from '../../elements/Rect';
import Text from '../../elements/Text';
import useTikZ from '../../hooks/useTikz';
import Group from '../../container/Group';
import { LayoutProps } from '../../types/layout';
import { getLayoutDistance, LayoutDistance } from '../../utils/layout.utils';
import { convertDimension2Px } from '../../utils/css.utils';
import TikZSvgElement from '../../model/TikZSvgElement';
import { Point } from '../../types/TikZ';

export type RectNodeProps = {
  name?: string;
  position: Point;
  width?: SVGProps<SVGRectElement>['width'];
  height?: SVGProps<SVGRectElement>['height'];
  fill?: SVGProps<SVGRectElement>['fill'];
  color?: SVGProps<SVGTextElement>['color'];
  stroke?: SVGProps<SVGRectElement>['stroke'];
  strokeWidth?: SVGProps<SVGRectElement>['strokeWidth'];
  r?: SVGProps<SVGRectElement>['r'];
  rx?: SVGProps<SVGRectElement>['rx'];
  ry?: SVGProps<SVGRectElement>['ry'];
} & LayoutProps;

const RectNode: FC<PropsWithChildren<RectNodeProps>> = props => {
  const { name, position, width, height, color, children } = props;
  const { fill, stroke, strokeWidth, r, rx, ry } = props;
  const { paddingLeft, paddingRight, paddingTop, paddingBottom, paddingX, paddingY, padding } = props;
  const { marginLeft, marginRight, marginTop, marginBottom, marginX, marginY, margin } = props;

  const [rectSize, setRectSize] = useState<Point>([0, 0]);
  const [rectPosition, setRectPosition] = useState<Point>([0, 0]);

  const paddings = useMemo(() => {
    return getLayoutDistance({
      distance: padding,
      distanceX: paddingX,
      distanceY: paddingY,
      distanceLeft: paddingLeft,
      distanceRight: paddingRight,
      distanceTop: paddingTop,
      distanceBottom: paddingBottom,
    });
  }, [paddingLeft, paddingRight, paddingTop, paddingBottom, paddingX, paddingY, padding]);

  const margins = useMemo(() => {
    return getLayoutDistance({
      distance: margin,
      distanceX: marginX,
      distanceY: marginY,
      distanceLeft: marginLeft,
      distanceRight: marginRight,
      distanceTop: marginTop,
      distanceBottom: marginBottom,
    });
  }, [marginLeft, marginRight, marginTop, marginBottom, marginX, marginY, margin]);

  const rectRef = useRef<SVGRectElement>(null!);
  const textRef = useRef<SVGTextElement>(null!);
  const nodeRef = useRef<SVGGElement>(null!);

  const tikz = useTikZ();

  const textRect = useMemo(() => {
    const textClientRect = textRef.current?.getBoundingClientRect();
    const textClientWidth = textClientRect?.width || 0;
    const textClientHeight = textClientRect?.height || 0;
    return [
      Math.max(textClientWidth, convertDimension2Px(width)),
      Math.max(textClientHeight, convertDimension2Px(height)),
    ];
  }, [textRef.current, children]);

  useLayoutEffect(() => {
    const textWidth = textRect[0] || 0;
    const textHeight = textRect[1] || 0;
    setRectSize([
      paddings[LayoutDistance.LEFT] +
        paddings[LayoutDistance.RIGHT] +
        margins[LayoutDistance.LEFT] +
        margins[LayoutDistance.RIGHT] +
        textWidth,
      paddings[LayoutDistance.TOP] +
        paddings[LayoutDistance.BOTTOM] +
        margins[LayoutDistance.TOP] +
        margins[LayoutDistance.BOTTOM] +
        textHeight,
    ]);
    const leftOffset =
      paddings[LayoutDistance.LEFT] + margins[LayoutDistance.LEFT] + (textRect[0] ? textRect[0] / 2 : 0);
    const topOffset = paddings[LayoutDistance.TOP] + margins[LayoutDistance.TOP] + (textRect[1] ? textRect[1] / 2 : 0);
    setRectPosition([-leftOffset, -topOffset]);
  }, [paddings, margins, children, ...textRect]);

  useEffect(() => {
    name && nodeRef.current !== null && tikz.elements.set(name, new TikZSvgElement(nodeRef.current));
    return () => {
      name && tikz.elements.delete(name);
    };
  }, [nodeRef, name]);

  return (
    <Group ref={nodeRef} transform={`translate(${position[0]}, ${position[1]})`}>
      <Rect
        x={rectPosition[0]}
        y={rectPosition[1]}
        width={rectSize[0]}
        height={rectSize[1]}
        ref={rectRef}
        fill={fill || 'none'}
        stroke={stroke}
        strokeWidth={strokeWidth}
        rx={rx || r}
        ry={ry || r}
      />
      <Text height={height} color={color} ref={textRef}>
        {children}
      </Text>
    </Group>
  );
};

export default RectNode;
