import { FC } from 'react';
import NodeModel from '../../../model/component/node';
import { Position } from '../../../types/coordinate/descartes';
import { StrokeProps } from '../../../types/svg/stroke';
import { TikZKey } from '../../../types/tikz';
import { convertStrokeType } from '../../../utils/stroke';
import InnerPathSegment from './PathSegment';
import useConvertWay, { PathWaySegmentType } from './useConvertWay';

export type PathSegmentProps = {
  /** 路径，首位可以是 Node，其他必须是坐标 */
  way: PathWaySegmentType;
  /** 线段颜色 */
  color?: TikZKey;
  /** 线段样式 */
  strokeType?: 'solid' | 'dashed' | 'dotted';
} & StrokeProps;

/** 单条连续的路径 */
const PathSegment: FC<PathSegmentProps> = props => {
  const { way, color, strokeType = 'solid', strokeWidth = 1, ...pathProps } = props;
  
  const [convertedWay, nodesInit] = useConvertWay(way);
  // render 阶段节点还没有初始化好，跳过
  if (!nodesInit) return null;

  const pointWay = convertedWay.map((wayPoint, index) => {
    if (wayPoint instanceof NodeModel) {
      const neighborPoint = index === 0 ? convertedWay[1] : convertedWay[index - 1];
      return wayPoint.getCrossPoint(neighborPoint instanceof NodeModel ? neighborPoint.center : neighborPoint);
    }
    return wayPoint;
  });

  return (
    <InnerPathSegment
      way={pointWay as [Position | undefined, ...Position[], Position | undefined]}
      strokeWidth={strokeWidth}
      {...convertStrokeType(strokeType, strokeWidth)}
      {...pathProps}
    />
  );
};

export default PathSegment;
