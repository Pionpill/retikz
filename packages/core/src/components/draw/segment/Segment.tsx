import { line } from 'd3-shape';
import type { FC } from 'react';
import { useMemo } from 'react';
import Path from '../../../elements/Path';
import type { Position } from '../../../types/coordinate/descartes';
import type { StrokeProps } from '../../../types/svg/stroke';
import type { ArrowConfig } from '../types';
import Group from '../../../container/Group';
import useArrow from './useArrow';

export type InnerDrawSegmentProps = {
  /** 路径，始末节点为 undefined 表示临近点在 node 外边界内 */
  way: Array<Position>;
  startArrow?: ArrowConfig;
  endArrow?: ArrowConfig;
} & StrokeProps;

const InnerDrawSegment: FC<InnerDrawSegmentProps> = props => {
  const { way, startArrow, endArrow, ...strokeProps } = props;

  /** 箭头仅使用部分 draw 的 stroke 属性 */
  const pickedArrowStrokeProps = {
    stroke: strokeProps.stroke,
    strokeWidth: Number(strokeProps.strokeWidth),
    strokeOpacity: strokeProps.strokeOpacity,
  };

  const startArrowPath = useArrow(
    { position: way[0], nearPosition: way[1], arrowType: 'start' },
    startArrow ? { ...pickedArrowStrokeProps, ...startArrow } : undefined,
  );

  const endArrowPath = useArrow(
    { position: way[way.length - 1], nearPosition: way[way.length - 2], arrowType: 'end' },
    endArrow ? { ...pickedArrowStrokeProps, ...endArrow } : undefined,
  );

  const d = useMemo(() => {
    const realWay = [...way];
    if (startArrowPath) {
      realWay[0] = startArrowPath.linkPoint;
    }
    if (endArrowPath) {
      realWay[realWay.length - 1] = endArrowPath.linkPoint;
    }
    const straightLine = line()
      .x(data => data[0])
      .y(data => data[1]);
    return straightLine(realWay);
  }, [endArrowPath, startArrowPath, way]);

  return endArrowPath || startArrowPath ? (
    <Group>
      <Path d={d ?? ''} {...strokeProps} />
      {startArrowPath ? startArrowPath.arrowPath : null}
      {endArrowPath ? endArrowPath.arrowPath : null}
    </Group>
  ) : (
    <Path d={d ?? ''} {...strokeProps} />
  );
};

export default InnerDrawSegment;
