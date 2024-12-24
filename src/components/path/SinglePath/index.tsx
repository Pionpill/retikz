import { FC, useMemo } from 'react';
import { StrokeProps } from '../../../types/svg/stroke';
import { convertStrokeType } from '../../../utils/stroke';
import { TikZKey } from '../../../types/tikz';
import useNodeState from '../../../hooks/useNodeState';
import { PointPosition } from '../../../types/coordinate';
import NodeModel from '../../../model/component/node';
import { formatPointPosition } from './utils';
import { Position } from '../../../types/coordinate/descartes';
import InnerSinglePath from './SinglePath';
import { Area } from '../../../types/shape';

export type SinglePathProps = {
  /** 路径，首位可以是 Node，其他必须是坐标 */
  way: [TikZKey | PointPosition, ...PointPosition[], TikZKey | PointPosition];
  /** 线段颜色 */
  color?: TikZKey;
  /** 线段样式 */
  strokeType?: 'solid' | 'dashed' | 'dotted';
} & StrokeProps;

const SinglePath: FC<SinglePathProps> = props => {
  const { way, color, strokeType = 'solid', strokeWidth = 1, ...pathProps } = props;

  const wayLength = way.length;
  const fromNode = (useNodeState(typeof way[0] === 'string' ? way[0] : '') ?? way[0]) as NodeModel | PointPosition;
  const lastNode = way[wayLength - 1];
  const toNode = (useNodeState(typeof lastNode === 'string' ? lastNode : '') ?? lastNode) as NodeModel | PointPosition;

  // 节点还没有初始化好
  if ((fromNode instanceof NodeModel && !fromNode.init) || (toNode instanceof NodeModel && !toNode.init)) {
    return null;
  }

  /** 获取点的连线位置 */
  const getNodeOrPointPosition = (node: NodeModel | PointPosition, linkNode: NodeModel | PointPosition) => {
    if (node instanceof NodeModel) {
      const linkPosition = linkNode instanceof NodeModel ? linkNode.center : formatPointPosition(linkNode);
      const crossPoint = node.getCrossPoint(linkPosition);
      if (!crossPoint) return;
      if (linkNode instanceof NodeModel) {
        return linkNode.getPointArea(crossPoint) === Area.OUTSIDE ? crossPoint : undefined;
      }
      return crossPoint;
    }
    return formatPointPosition(node);
  };

  const fromPosition = getNodeOrPointPosition(fromNode, wayLength === 2 ? toNode : (way[1] as PointPosition));
  const toPosition = getNodeOrPointPosition(toNode, wayLength === 2 ? fromNode : (way[0] as PointPosition));
  const pointWay = way.reduce((acc, cur, index) => {
    if (index === 0) {
      acc.push(fromPosition);
    } else if (index === wayLength - 1) {
      acc.push(toPosition);
    } else {
      acc.push(formatPointPosition(cur as PointPosition));
    }
    return acc;
  }, [] as unknown as [Position | undefined, ...Position[], Position | undefined]);
  const stokeAttributes = convertStrokeType(strokeType, strokeWidth);

  return <InnerSinglePath way={pointWay} strokeWidth={strokeWidth} {...stokeAttributes} {...pathProps} />;
};

export default SinglePath;
