import { FC, Ref, useMemo } from 'react';
import Group from '../../container/Group';
import { StrokeProps } from '../../types/svg/stroke';
import { getDrawPointType } from './common';
import DrawSegment from './segment';
import { ArrowConfig, ArrowProps, DrawPointType, DrawWaySegmentType, DrawWayType } from './types';

export type InnerDrawProps = {
  ref?: Ref<SVGPathElement>;
  way: DrawWayType[];
} & StrokeProps &
  ArrowProps<ArrowConfig>;

const InnerDraw: FC<InnerDrawProps> = props => {
  const { way, ref,startArrow,startArrows, endArrow, endArrows, ...strokeProps } = props;

  const waySegments = useMemo(() => {
    let preNodeType: DrawPointType = 'coordinate';
    const waySegments: DrawWayType[][] = [];
    let waySegment: DrawWayType[] = [];

    for (let i = 0; i < way.length; i++) {
      const point = way[i];
      const currentNodeType = getDrawPointType(point);

      // 两个连续的 node 节点断开
      if (currentNodeType === 'node' && preNodeType === 'node' && waySegment.length >= 2) {
        waySegments.push(waySegment);
        waySegment = [waySegment[waySegment.length - 1]];
      }
      waySegment.push(point);
      // 最后一个节点塞入路径组
      if (i === way.length - 1) {
        waySegments.push(waySegment);
      }

      preNodeType = currentNodeType;
    }
    return waySegments as DrawWaySegmentType[];
  }, [way]);

  return (
    <Group ref={ref}>
      {waySegments.map((segment, index) => (
        <DrawSegment
          key={JSON.stringify(segment)}
          way={segment}
          {...strokeProps}
          endArrow={index === waySegments.length - 1 ? endArrow || endArrows : endArrows}
          startArrow={index === waySegments.length - 1 ? startArrow || startArrows : startArrows}
        />
      ))}
    </Group>
  );
};

export default InnerDraw;
