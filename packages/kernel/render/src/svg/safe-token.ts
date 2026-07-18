const SAFE_SVG_TOKEN_RE = /^[A-Za-z_][A-Za-z0-9_-]*$/;

const hashToken = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

/**
 * 把外部前缀归一化为可直接用于 SVG id、fragment 引用和 CSS class 的 token
 * @description 已经安全的前缀保持逐字不变；包含空格、冒号、点号、括号等字符时，用可读片段 + hash 生成稳定 token，避免收窄公开 API
 */
export const toSafeSvgToken = (value: string): string => {
  if (SAFE_SVG_TOKEN_RE.test(value)) return value;
  const readable = value
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return `p-${readable || 'id'}-${hashToken(value)}`;
};
