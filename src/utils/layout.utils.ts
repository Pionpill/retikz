import { Direction } from '../types/coordinate.type';
import { LayoutExpandDistance, LayoutDistance, AllLayoutDistance } from '../types/tikz.type';
import { convertDimension2Px } from './css.utils';

/** 获取布局距离，传入 element 支持解析css常规字符串 */
export const transferLayoutDistance = (
  distanceConfig: LayoutExpandDistance<number | string | undefined>,
  element?: HTMLElement,
): LayoutDistance<number> => {
  const result: LayoutDistance = { left: 0, right: 0, top: 0, bottom: 0 };
  if (Object.keys(distanceConfig).length === 0) return result;

  const { defaultVal, x, y, left, right, top, bottom } = distanceConfig;

  const realLeft = left || x || defaultVal;
  const realRight = right || x || defaultVal;
  const realTop = top || y || defaultVal;
  const realBottom = bottom || y || defaultVal;

  const remSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const sizeConfig = {
    remSize,
    emSize: element ? parseFloat(getComputedStyle(element).fontSize) : remSize,
  };

  if (realLeft) {
    result.left = convertDimension2Px(realLeft, { ...sizeConfig, elementSize: element?.offsetHeight });
  }
  if (realRight) {
    result.right = convertDimension2Px(realRight, { ...sizeConfig, elementSize: element?.offsetHeight });
  }
  if (realTop) {
    result.top = convertDimension2Px(realTop, { ...sizeConfig, elementSize: element?.offsetWidth });
  }
  if (realBottom) {
    result.bottom = convertDimension2Px(realBottom, { ...sizeConfig, elementSize: element?.offsetWidth });
  }

  return result;
};

/** 计算某个方向的距离总和 */
export const sumLayoutDistance = (allLayoutDistance: AllLayoutDistance, direction: Direction | Direction[]) => {
  if (!Array.isArray(direction)) direction = [direction];
  return Object.values(allLayoutDistance).reduce(
    (acc, cur) => acc + direction.reduce((acc2, cur2) => acc2 + cur[cur2], 0),
    0,
  );
};
