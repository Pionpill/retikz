/** 递归冻结 JSON 数据并保留原始静态类型 */
export const deepFreeze = <T>(value: T): T => {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;

  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
};
