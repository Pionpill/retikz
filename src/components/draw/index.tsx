import { FC, Ref, useMemo } from 'react';
import { PointPosition } from '../../types/coordinate';
import { TikZKey } from '../../types/tikz';
import { DrawWaySegmentType } from './segment/useConvertWay';
import { getDrawPointType, OffSetOrMovePosition, DrawPointType, VerticalDrawPosition } from './common';
import Group from '../../container/Group';
import DrawSegment from './segment';

export type ArrowStyleShortcut = '';

export type DrawWayType = TikZKey | PointPosition | VerticalDrawPosition | OffSetOrMovePosition;

export type DrawProps = {
  ref?: Ref<SVGPathElement>;
  /** 路径点 */
  way: DrawWayType[];
};

const Draw: FC<DrawProps> = props => {
  const { way, ref } = props;

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
      {waySegments.map(segment => (
        <DrawSegment key={JSON.stringify(segment)} way={segment} />
      ))}
    </Group>
  );
};

export default Draw;
