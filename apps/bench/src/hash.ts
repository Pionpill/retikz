/** 为功能 oracle 生成跨运行稳定的 FNV-1a 32-bit 摘要 */
export const stableHash = (value: unknown): string => {
  const input = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};
