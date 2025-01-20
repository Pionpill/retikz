import { FC, ReactNode, Ref, useMemo } from 'react';
import Group from '../../container/Group';
import { PathContext } from '../../hooks/context/usePath';
import PathModel from '../../model/component/path';
import { Position } from '../../types/coordinate/descartes';
import { StrokeProps } from '../../types/svg/stroke';
import { getDrawPointType } from './common';
import DrawSegment from './segment';
import { ArrowConfig, ArrowProps, DrawPointType, DrawWaySegmentType, DrawWayType } from './types';

export type InnerDrawProps = {
  ref?: Ref<SVGPathElement>;
  /** 位置偏移 */
  offset: Position;
  way: DrawWayType[];
  children?: ReactNode;
} & StrokeProps &
  ArrowProps<ArrowConfig>;

const InnerDraw: FC<InnerDrawProps> = props => {
  const { way, ref, offset, startArrow, startArrows, endArrow, endArrows, children, ...strokeProps } = props;

  const waySegments = useMemo(() => {
    let preNodeType: DrawPointType = 'coordinate';
    const waySegments: DrawWayType[][] = [];
    let waySegment: DrawWayType[] = [];

    for (let i = 0; i < way.length; i++) {
      const point = way[i];
      const currentNodeType = getDrawPointType(point);

      waySegment.push(point);
      // 两个连续的 node 节点断开
      if (currentNodeType === 'node' && preNodeType === 'node' && waySegment.length >= 2) {
        waySegments.push(waySegment);
        waySegment = [waySegment[waySegment.length - 1]];
      }
      // 最后一个节点塞入路径组
      if (i === way.length - 1 && waySegment.length > 1) {
        waySegments.push(waySegment);
      }

      preNodeType = currentNodeType;
    }
    return waySegments as DrawWaySegmentType[];
  }, [way]);

  return (
    <PathContext value={new PathModel(new Array(waySegments.length).fill([]), strokeProps.strokeWidth || 1, false)}>
      <Group ref={ref} transform={`translate(${offset[0]}, ${offset[1]})`}>
        {waySegments.map((segment, index) => (
          <DrawSegment
            key={JSON.stringify(segment)}
            index={index}
            isLastSegment={index === waySegments.length - 1}
            way={segment}
            {...strokeProps}
            endArrow={index === waySegments.length - 1 ? endArrow || endArrows : endArrows}
            startArrow={index === waySegments.length - 1 ? startArrow || startArrows : startArrows}
          />
        ))}
        {children}
      </Group>
    </PathContext>
  );
};

export default InnerDraw;
