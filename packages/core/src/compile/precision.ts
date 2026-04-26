/** 默认输出精度：保留 2 位小数 */
export const DEFAULT_PRECISION = 2;

/** 按指定小数位精度四舍五入；precision = 0 表示取整 */
export const makeRound = (precision: number) => {
  const factor = 10 ** precision;
  return (n: number) => Math.round(n * factor) / factor;
};
