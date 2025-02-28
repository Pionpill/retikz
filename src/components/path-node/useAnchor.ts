import { useLayoutEffect, useMemo, useRef } from 'react';
import useCalculate from '../../hooks/context/useCalculate';
import usePath from '../../hooks/context/usePath';
import useForceUpdate from '../../hooks/useForceUpdate';
import Line from '../../model/equation/line';
import { Position } from '../../types/coordinate/descartes';
import { between, convertPrecision } from '../../utils/math';

const useAnchor = (pos: number, segmentIndex: number) => {
  const pathUpdateCount = useRef(0);
  const forceUpdate = useForceUpdate();

  const { model, subscribeModel } = usePath();
  const { precision } = useCalculate();

  const subscribeCb = subscribeModel(model => {
    if (!model?.init) return;
    pathUpdateCount.current += 1;
    // 无法在同步任务中订阅Path状态变化时触发更新
    // https://github.com/facebook/react/issues/18178#issuecomment-595846312
    queueMicrotask(forceUpdate);
  });

  useLayoutEffect(() => () => {
    subscribeCb?.();
  });

  const adjustIndex = segmentIndex >= 0 ? segmentIndex : model.ways.length + segmentIndex;
  if (!between(adjustIndex, [0, model.ways.length - 1], true)) throw new Error('segmentIndex is out of range');

  return useMemo<{ position: Position; angle: number }>(() => {
    if (!model.init)
      return {
        position: [Number.MAX_SAFE_INTEGER / 2, Number.MAX_SAFE_INTEGER / 2],
        angle: 0,
      };
    const way = model.ways[adjustIndex];
    const waySegments = way.length - 1;
    const segmentPercent = 1 / waySegments;

    let segmentSum = 0;
    let index = 0; // 处于第几段中
    while (pos >= segmentSum) {
      segmentSum += segmentPercent;
      index++;
    }
    const startPoint = way[index - 1];
    const endPoint = way[index];
    const percent = (pos % segmentPercent) / segmentPercent;
    const position = index === way.length ? startPoint : Line.getPositionByPercent(startPoint, endPoint, percent);
    return {
      position: convertPrecision(position, precision),
      angle:
        index === way.length
          ? Line.getDegree(way[way.length - 2], way[way.length - 1])
          : Line.getDegree(startPoint, endPoint),
    };
  }, [pos, segmentIndex, pathUpdateCount.current]);
};

export default useAnchor;
