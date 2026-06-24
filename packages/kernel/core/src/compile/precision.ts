/** 默认输出精度：保留 2 位小数 */
export const DEFAULT_PRECISION = 2;

/**
 * 按指定小数位精度四舍五入；precision = 0 表示取整
 * @description 末端把 `-0` 归一为 `+0`——`Math.round` 对负的亚精度值（如 `-0.001`）产 `-0`，
 *   而 `JSON.stringify(-0) === '0'` 会让 Scene round-trip 在 `Object.is` 层失真（`-0 !== 0` 于 Object.is）。
 *   归一让序列化往返稳定；数值上 `-0 === 0`，渲染 / 计算无影响。
 */
export const createRound = (precision: number) => {
  const factor = 10 ** precision;
  return (n: number) => {
    const r = Math.round(n * factor) / factor;
    return r === 0 ? 0 : r;
  };
};
