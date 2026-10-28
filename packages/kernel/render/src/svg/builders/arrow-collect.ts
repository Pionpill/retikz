/**
 * key → 短 hash（SVG id 中可安全嵌入的 ascii；non-cryptographic）
 * @description djb2 变体；只用十六进制末 8 位避免 id 过长。同 spec → 同 hash、不同 spec → 不同 hash
 *   （碰撞概率极低，且 id 前缀已带实例隔离，不会跨 svg 串话）
 */
export const hashKey = (key: string): string => {
  let h = 5381;

  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  }

  return (h >>> 0).toString(16).padStart(8, '0');
};
