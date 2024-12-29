import { FC, useMemo } from 'react';
import { Position } from '../../../types/coordinate/descartes';
import { StrokeProps } from '../../../types/svg/stroke';
import Path from '../../../elements/Path';
import { line } from 'd3-shape';

export type InnerDrawSegmentProps = {
  /** 路径，始末节点为 undefined 表示临近点在 node 外边界内 */
  way: [Position | undefined, ...Position[], Position | undefined];
} & StrokeProps;

const InnerDrawSegment: FC<InnerDrawSegmentProps> = props => {
  const { way, ...strokeProps } = props;

  const d = useMemo(() => {
    const realWay = way.filter(item => item !== undefined);
    const straightLine = line()
      .x(d => d[0])
      .y(d => d[1]);
    return straightLine(realWay);
  }, [...way]);

  return <Path d={d ?? ''} {...strokeProps} />;
};

export default InnerDrawSegment;
