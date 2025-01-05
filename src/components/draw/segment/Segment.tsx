import { line } from 'd3-shape';
import { FC, useMemo } from 'react';
import Path from '../../../elements/Path';
import { Position } from '../../../types/coordinate/descartes';
import { StrokeProps } from '../../../types/svg/stroke';
import { ArrowConfig } from '../types';
import Line from '../../../model/equation/line';
import Group from '../../../container/Group';
import useArrow from './useArrow';

export type InnerDrawSegmentProps = {
  /** 路径，始末节点为 undefined 表示临近点在 node 外边界内 */
  way: Position[];
  endArrow?: ArrowConfig;
} & StrokeProps;

const InnerDrawSegment: FC<InnerDrawSegmentProps> = props => {
  const { way, endArrow, ...strokeProps } = props;

  const endSlope = Line.getSlope(way[way.length - 2], way[way.length - 1]);
  const endDegree = Math.atan(endSlope);
  const endArrowPath = useArrow(
    { position: way[way.length - 1], degree: endDegree },
    endArrow ? { ...strokeProps, ...endArrow } : undefined,
  );

  const d = useMemo(() => {
    const realWay = [...way];
    if (endArrowPath) {
      realWay[realWay.length - 1] = endArrowPath.linkPoint;
    }
    const straightLine = line()
      .x(d => d[0])
      .y(d => d[1]);
    return straightLine(realWay);
  }, [way]);

  return endArrowPath ? (
    <Group>
      <Path d={d ?? ''} {...strokeProps} />
      {endArrowPath.arrowPath}
    </Group>
  ) : (
    <Path d={d ?? ''} {...strokeProps} />
  );
};

export default InnerDrawSegment;
