import { FC, PropsWithChildren, SVGProps, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Rect from '../../elements/Rect';
import Text from '../../elements/Text';
import useTikZ from '../../hooks/useTikZ';
import Group from '../../container/Group';
import { LayoutDistanceProps } from '../../types/layout.type';
import { convertDimension2Px } from '../../utils/css.utils';
import RectNodeElement from '../../model/RectNodeElement';
import { AllLayoutDistance, Point, Size } from '../../types/tikz.type';
import { useLayoutDistance } from '../../hooks/layout';
import { sumLayoutDistance } from '../../utils/layout.utils';
import { Direction } from '../../types/coordinate.type';

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
} & LayoutDistanceProps;

const RectNode: FC<PropsWithChildren<RectNodeProps>> = props => {
  const { name, position, width, height, color, children } = props;
  const { fill, stroke, strokeWidth, r, rx, ry } = props;

  const [rectSize, setRectSize] = useState<Size>([0, 0]);
  const [rectPosition, setRectPosition] = useState<Point>([0, 0]);

  const allLayoutDistance = useLayoutDistance(props);
  const { paddings, margins, borders } = allLayoutDistance;

  const rectRef = useRef<SVGRectElement>(null!);
  const textRef = useRef<SVGTextElement>(null!);
  const nodeRef = useRef<SVGGElement>(null!);

  const tikz = useTikZ();

  const textSize = useMemo(() => {
    const textClientRect = textRef.current?.getBoundingClientRect();
    const textClientWidth = textClientRect?.width || 0;
    const textClientHeight = textClientRect?.height || 0;
    return [
      Math.max(textClientWidth, convertDimension2Px(width)),
      Math.max(textClientHeight, convertDimension2Px(height)),
    ];
  }, [textRef.current, children]);

  useLayoutEffect(() => {
    const textWidth = textSize[0] || 0;
    const textHeight = textSize[1] || 0;
    setRectSize([
      sumLayoutDistance(allLayoutDistance, [Direction.LEFT, Direction.RIGHT]) + textWidth,
      sumLayoutDistance(allLayoutDistance, [Direction.TOP, Direction.BOTTOM]) + textHeight,
    ]);
    const leftOffset = sumLayoutDistance(allLayoutDistance, Direction.LEFT) + (textSize[0] ? textSize[0] / 2 : 0);
    const topOffset = sumLayoutDistance(allLayoutDistance, Direction.TOP) + (textSize[1] ? textSize[1] / 2 : 0);
    setRectPosition([-leftOffset, -topOffset]);
  }, [paddings, margins, borders, children, textSize]);

  useEffect(() => {
    if (name) {
      const { e, f } = textRef.current.getCTM()!;
      const { width, height } = textRef.current.getBoundingClientRect();
      const center: Point = [e, f];
      const size: Size = [width, height];
      const allTypeDistance: AllLayoutDistance = { paddings: paddings, margins: margins, borders: borders };
      const element = tikz.elements.get(name);
      element
        ? element.update(center, size, allTypeDistance)
        : tikz.elements.set(name, new RectNodeElement(center, size, allTypeDistance));
    }
    return () => {
      name && tikz.elements.delete(name);
    };
  }, [...textSize, ...rectSize, ...rectPosition, name]);

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
