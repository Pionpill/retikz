import { FC, useMemo } from 'react';
import useNodeState from '../../../hooks/useNodeState';
import NodeModel from '../../../model/component/node';
import { PointPosition } from '../../../types/coordinate';
import { Position } from '../../../types/coordinate/descartes';
import { Area } from '../../../types/shape';
import { StrokeProps } from '../../../types/svg/stroke';
import { TikZKey } from '../../../types/tikz';
import { convertStrokeType } from '../../../utils/stroke';
import InnerSinglePath from './SinglePath';
import { formatPointPosition, getVerticalPoint } from './utils';

/** 垂直路径点，临近的节点不能都是特殊路径点 */
export type VerticalPathPosition = '-|' | '|-';

export type SinglePathProps = {
  /** 路径，首位可以是 Node，其他必须是坐标 */
  way: [TikZKey | PointPosition, ...Array<PointPosition | VerticalPathPosition>, TikZKey | PointPosition];
  /** 线段颜色 */
  color?: TikZKey;
  /** 线段样式 */
  strokeType?: 'solid' | 'dashed' | 'dotted';
} & StrokeProps;

/** 单条连续的路径 */
const SinglePath: FC<SinglePathProps> = props => {
  const { way, color, strokeType = 'solid', strokeWidth = 1, ...pathProps } = props;

  const wayLength = way.length;
  const fromNode = (useNodeState(typeof way[0] === 'string' ? way[0] : '') ?? way[0]) as NodeModel | PointPosition;
  const lastNode = way[wayLength - 1];
  const toNode = (useNodeState(typeof lastNode === 'string' ? lastNode : '') ?? lastNode) as NodeModel | PointPosition;

  const convertedWay = useMemo(
    () =>
      way.map((item, index, array) => {
        // 垂直路径点转换为坐标
        if (['-|', '|-'].includes(item as VerticalPathPosition)) {
          let beforePoint: string | PointPosition | NodeModel = array[index - 1];
          if (['-|', '|-'].includes(beforePoint as VerticalPathPosition)) throw new Error('不允许连续的垂直路径点');
          let afterPoint: string | PointPosition | NodeModel = array[index + 1];
          if (['-|', '|-'].includes(afterPoint as VerticalPathPosition)) throw new Error('不允许连续的垂直路径点');
          if (typeof beforePoint === 'string') beforePoint = (fromNode as NodeModel).center;
          if (typeof afterPoint === 'string') afterPoint = (toNode as NodeModel).center;
          return getVerticalPoint(beforePoint, afterPoint, item as VerticalPathPosition);
        }
        return item;
      }),
    [way],
  );

  // render 阶段节点还没有初始化好，跳过
  if (!NodeModel.isInitializedNode(fromNode) || !NodeModel.isInitializedNode(toNode)) {
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

  const fromPosition = getNodeOrPointPosition(fromNode, wayLength === 2 ? toNode : (convertedWay[1] as PointPosition));
  const toPosition = getNodeOrPointPosition(toNode, wayLength === 2 ? fromNode : (convertedWay[wayLength - 2] as PointPosition));
  const pointWay = convertedWay.reduce((acc, cur, index) => {
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
