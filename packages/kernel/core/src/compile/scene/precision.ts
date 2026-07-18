/** 输出精度常量 */
export const DEFAULT_PRECISION = 2;

/** 创建 Scene 输出 rounder，并把 -0 归一为 0 */
export const createRound = (precision: number) => {
  const factor = 10 ** precision;
  return (n: number) => {
    const r = Math.round(n * factor) / factor;
    return r === 0 ? 0 : r;
  };
};
