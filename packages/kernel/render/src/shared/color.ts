/**
 * 颜色解析（renderer 无关纯函数）：hex 部分多处共用。
 * 注意：`rgb()` 解析未并入——两处消费语义不同（一端字符串透传 + 烘焙 alpha，一端数值化 + 线性化），各自保留。
 */

/** sRGB 字节通道（各 0..255） */
export type RgbBytes = { r: number; g: number; b: number };

/**
 * 解析 `#rgb` / `#rrggbb` hex 颜色串 → sRGB 字节通道（0..255）；非 hex（rgb()/命名色/oklch 等）返回 null
 * @description hex3 先展开成 hex6 再逐通道 parseInt。仅覆盖 hex，调用方各自处理非 hex 分支。
 */
export const parseHexColor = (color: string): RgbBytes | null => {
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(color.trim());
  if (!hex) return null;
  let h = hex[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};
