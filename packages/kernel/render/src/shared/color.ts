import { parseStaticCssColor } from '@retikz/foundation';

/** sRGB 字节通道（各 0..255） */
export type RgbBytes = { r: number; g: number; b: number };

/**
 * 解析 `#rgb` / `#rrggbb` hex 颜色串 → sRGB 字节通道（0..255）；非 hex（rgb()/命名色/oklch 等）返回 null
 * @description hex3 先展开成 hex6 再逐通道 parseInt。仅覆盖 hex，调用方各自处理非 hex 分支
 */
export const parseHexColor = (color: string): RgbBytes | null => {
  const value = color.trim();
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) return null;
  const parsed = parseStaticCssColor(value);
  if (parsed === null || parsed.a !== 1) return null;
  return {
    r: Math.round(parsed.r * 255),
    g: Math.round(parsed.g * 255),
    b: Math.round(parsed.b * 255),
  };
};
