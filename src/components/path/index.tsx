import { FC, Ref, useMemo } from 'react';
import { PointPosition } from '../../types/coordinate';
import { TikZKey } from '../../types/tikz';
import { PathWaySegmentType } from './PathSegment/useConvertWay';
import { getPathPointType, OffSetOrMovePosition, PathPointType, VerticalPathPosition } from './common';
import Group from '../../container/Group';
import PathSegment from './PathSegment';

export type ArrowStyleShortcut = '';

export type PathWayType = TikZKey | PointPosition | VerticalPathPosition | OffSetOrMovePosition;

export type PathProps = {
  ref?: Ref<SVGPathElement>;
  /** 路径点 */
  way: PathWayType[];
};

const Path: FC<PathProps> = props => {
  const { way, ref } = props;

  const waySegments = useMemo(() => {
    let preNodeType: PathPointType = 'coordinate';
    const waySegments: PathWayType[][] = [];
    let waySegment: PathWayType[] = [];

    for (let i = 0; i < way.length; i++) {
      const point = way[i];
      const currentNodeType = getPathPointType(point);

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
    return waySegments as PathWaySegmentType[];
  }, [way]);

  return (
    <Group ref={ref}>
      {waySegments.map(segment => (
        <PathSegment key={JSON.stringify(segment)} way={segment} />
      ))}
    </Group>
  );
};

export default Path;
