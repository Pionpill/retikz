/** 判断值是否在范围内 */
export const between = (value: number, range: [number, number], equal?: boolean) => {
  return equal ? value >= range[0] && value <= range[1] : value > range[0] && value < range[1];
};
