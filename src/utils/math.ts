/** 判断值是否在范围内 */
export const between = (value: number, range: [number, number], equal?: boolean) => {
  return equal ? value >= range[0] && value <= range[1] : value > range[0] && value < range[1];
};

/**
 * 将数值进行精度调整（主要是为了内存优化）
 * @value 要调整的值
 * @precision 要调整的精度
 * @deep 是否进行深度调整
 *  */
export const convertPrecision = <T>(value: T, precision: number | false, deep = true): T => {
  if (precision === false) return value;

  const innerConvert = (value: number) => {
    if (precision === 0) return Math.round(value);
    const realPrecision = 10 ** precision;
    return Math.round(value * realPrecision) / realPrecision;
  };

  if (typeof value === 'number') return innerConvert(value) as T;
  if (Array.isArray(value))
    return value.map(item => (deep ? innerConvert(item) : typeof item === 'number' ? innerConvert(item) : item)) as T;
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = deep ? convertPrecision(item, precision) : typeof item === 'number' ? innerConvert(item) : item;
    }
    return result as T;
  }
  return value;
};
