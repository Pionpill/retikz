import { convertDimension2Px } from './css.utils';

type DistanceType =
  | 'distance'
  | 'distanceX'
  | 'distanceY'
  | 'distanceLeft'
  | 'distanceRight'
  | 'distanceTop'
  | 'distanceBottom';

export enum LayoutDistance {
  TOP = 0,
  RIGHT = 1,
  BOTTOM = 2,
  LEFT = 3,
}

export const getLayoutDistance = (
  distanceConfig: Record<DistanceType, string | number | undefined>,
  element?: HTMLElement,
): [number, number, number, number] => {
  const result: [number, number, number, number] = [0, 0, 0, 0];
  if (Object.keys(distanceConfig).length === 0) return result;

  const { distance, distanceX, distanceY, distanceLeft, distanceRight, distanceTop, distanceBottom } = distanceConfig;

  const left = distanceLeft || distanceX || distance;
  const right = distanceRight || distanceX || distance;
  const top = distanceTop || distanceY || distance;
  const bottom = distanceBottom || distanceY || distance;

  const remSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const sizeConfig = {
    remSize,
    emSize: element ? parseFloat(getComputedStyle(element).fontSize) : remSize,
  };

  if (left) {
    result[LayoutDistance.LEFT] = convertDimension2Px(left, { ...sizeConfig, elementSize: element?.offsetHeight });
  }
  if (right) {
    result[LayoutDistance.RIGHT] = convertDimension2Px(right, { ...sizeConfig, elementSize: element?.offsetHeight });
  }
  if (top) {
    result[LayoutDistance.TOP] = convertDimension2Px(top, { ...sizeConfig, elementSize: element?.offsetWidth });
  }
  if (bottom) {
    result[LayoutDistance.BOTTOM] = convertDimension2Px(bottom, { ...sizeConfig, elementSize: element?.offsetWidth });
  }

  return result;
};
