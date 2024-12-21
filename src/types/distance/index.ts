export type CssDistanceType = number | string | undefined;

/** 四个方向的距离 */
export type DirectionDistance<T = number> = {
  left: T;
  right: T;
  top: T;
  bottom: T;
};
