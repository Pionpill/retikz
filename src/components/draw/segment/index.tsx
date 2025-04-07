import { FC, useMemo } from 'react';
import NodeModel from '../../../model/component/node';
import { StrokeProps } from '../../../types/svg/stroke';
import { convertStrokeType } from '../../../utils/style/stroke';
import { ArrowConfig, DrawWaySegmentType } from '../types';
import InnerDrawSegment from './Segment';
import useConvertWay from './useConvertWay';
import usePath from '../../../hooks/context/usePath';

export type DrawSegmentProps = {
  /** 路径，首位可以是 Node，其他必须是坐标 */
  way: DrawWaySegmentType;
  index: number;
  /** 线段样式 */
  strokeType?: 'solid' | 'dashed' | 'dotted';
  startArrow?: ArrowConfig;
  endArrow?: ArrowConfig;
} & StrokeProps;

/** 单条连续的路径 */
const DrawSegment: FC<DrawSegmentProps> = props => {
  const { way, index, startArrow, endArrow, ...resProps } = props;
  const { strokeType = 'solid', strokeWidth = 1, ...strokeProps } = resProps;

  const [convertedWay, nodesInit] = useConvertWay(way);
  const { model, updateModel } = usePath();
  
  const pointWay = useMemo(() => {
    const realWay = convertedWay.map((wayPoint, index) => {
      if (wayPoint instanceof NodeModel) {
        const neighborPoint = index === 0 ? convertedWay[1] : convertedWay[index - 1];
        return wayPoint.getCrossPoint(neighborPoint instanceof NodeModel ? neighborPoint.center : neighborPoint);
      }
      return wayPoint;
    });
    const newWay = [...model.ways];
    newWay[index] = realWay;
    updateModel({ ways: newWay, init: nodesInit });
    return realWay;
  }, [convertedWay]);

  // render 阶段节点还没有初始化好，跳过
  if (!nodesInit) return null;

  return (
    <InnerDrawSegment
      way={pointWay}
      startArrow={startArrow}
      endArrow={endArrow}
      strokeWidth={strokeWidth}
      {...convertStrokeType(strokeType, strokeWidth)}
      {...strokeProps}
    />
  );
};

export default DrawSegment;
