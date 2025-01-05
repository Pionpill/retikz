import { useLayoutEffect, useMemo, useRef } from 'react';
import useNodes from '../../../hooks/tikz/useNodes';
import useForceUpdate from '../../../hooks/useForceUpdate';
import NodeModel from '../../../model/component/node';
import DescartesPoint from '../../../model/geometry/point/DescartesPoint';
import PolarPoint from '../../../model/geometry/point/PolarPoint';
import { PointPosition } from '../../../types/coordinate';
import { DescartesPosition, Position } from '../../../types/coordinate/descartes';
import { PolarPosition } from '../../../types/coordinate/polar';
import { TikZKey } from '../../../types/tikz';
import { getDrawPointType } from '../common';
import { DrawWaySegmentType, VerticalDrawPosition } from '../types';


/** 将坐标格式转换为笛卡尔坐标数组形式 */
export const formatPointPosition = (point: PointPosition): Position => {
  if (Array.isArray(point)) return point;
  if (point.hasOwnProperty('x') && point.hasOwnProperty('y')) {
    const p = point as DescartesPosition;
    return [p.x, p.y];
  }
  return PolarPoint.convertPolarToDescartesPosition(point as PolarPosition);
};

/** 获取两点间的垂直点 */
export const getVerticalPoint = (point1: PointPosition, point2: PointPosition, type: '-|' | '|-'): Position => {
  const p1 = formatPointPosition(point1);
  const p2 = formatPointPosition(point2);
  return type === '-|' ? [p2[0], p1[1]] : [p1[0], p2[1]];
};

/** 将偏移点与移动点转换为坐标点 */
const convertOffsetAndMovePoint = (point: string) => {
  const filterPoint = point.replace(/[+()\[\]\s]/g, '');
  return filterPoint.split(',').map(item => parseFloat(item)) as Position;
};

/**
 * 将特殊路径点转换为坐标，Node 节点转换为对应的 Model
 * 目前支持的节点类型：node，各种坐标，垂点，位移点
 */
const useConvertWay = (way: DrawWaySegmentType) => {
  const { getModel, subscribeModel } = useNodes();
  const forceUpdate = useForceUpdate();
  const nodeUpdateCount = useRef(0);

  let cursor: Position = [0, 0]; // 游标点，用于记录当前路径的位置

  const tryGetModel = (name: TikZKey) => {
    const model = getModel(name);
    if (!model) {
      throw new Error(`Node ${name} is not defined`);
    }
    cursor = model.center;
    return model;
  };

  //
  const subscribeCbs: Array<() => boolean | false> = [];
  let allNodeInit = true;

  const result = useMemo(
    () =>
      way.map((item, index) => {
        const type = getDrawPointType(item);
        switch (type) {
          case 'coordinate':
            const corPosition = formatPointPosition(item as PointPosition);
            cursor = corPosition;
            return corPosition;
          case 'node':
            if (![0, way.length - 1].includes(index)) {
              throw new Error(
                'Node can only be the first or last point on DrawSegment component, this may be a retikz bug, please report it.',
              );
            }
            const nodeModel = tryGetModel(item as TikZKey);
            if (!nodeModel.init) allNodeInit = false;
            const cb = subscribeModel(item as string, () => {
              nodeUpdateCount.current = nodeUpdateCount.current + 1;
              forceUpdate();
            });
            if (cb) subscribeCbs.push(cb);
            cursor = nodeModel.center;
            return nodeModel;
          case 'vertical':
            if ([0, way.length - 1].includes(index)) {
              throw new Error('Vertical point can not be the first point on path.');
            }
            const beforePosition = cursor;
            const afterPoint = way[index + 1];
            const afterPointType = getDrawPointType(afterPoint);
            if (['vertical', 'offset', 'move'].includes(afterPointType)) {
              throw new Error('Vertical point can not be followed by these point type: vertical offset move.');
            }
            const afterPosition =
              afterPointType === 'node'
                ? tryGetModel(afterPoint as TikZKey).center
                : formatPointPosition(afterPoint as PointPosition);
            const verPosition = getVerticalPoint(beforePosition, afterPosition, item as VerticalDrawPosition);
            cursor = verPosition;
            return cursor;
          default:
            if (index === 0) throw new Error('offset/move point can not be the first point on path.');
            const convertedPos = convertOffsetAndMovePoint(item as string);
            const curPos = DescartesPoint.plus(convertedPos, cursor);
            if (type === 'move') cursor = curPos;
            return curPos;
        }
      }),
    [way, nodeUpdateCount.current],
  );

  useLayoutEffect(() => () => {
    subscribeCbs.forEach(cb => cb && cb());
  });
  return [result, allNodeInit] as [Array<Position | NodeModel>, boolean];
};

export default useConvertWay;
