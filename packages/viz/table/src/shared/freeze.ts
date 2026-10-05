/**
 * 递归冻结 JSON 数据并保留原始静态类型
 * @template T 待原位冻结的数据类型，返回值保持同一静态类型与引用
 */
export const deepFreeze = <T>(value: T): T => {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;

  for (const child of Object.values(value)) deepFreeze(child);

  return Object.freeze(value);
};
