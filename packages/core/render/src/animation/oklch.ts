/**
 * oklch 颜色插值（renderer 无关、纯数学）
 * @description fill / stroke 动画在 oklch 空间插值（感知均匀，避免 sRGB 直插的灰带）。SVG 端编译期预采样成
 *   keyframe 颜色串（CSS 不赌 color-mix(in oklch) 兼容性），Canvas 端逐帧真 lerp——两端共用本模块。
 *   解析支持 hex（#rgb / #rrggbb）/ rgb(a) / oklch(...)；无法解析的颜色串（命名色 / hsl）回退为两端点直插。
 */

/** 线性 sRGB 三元组（各 0..1） */
type LinearRgb = { r: number; g: number; b: number };
/** oklch 三元组：L 0..1、C ≥0、H 角度（度） */
type Oklch = { L: number; C: number; H: number };

/** sRGB gamma 分量 → 线性分量 */
const gammaToLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** 线性分量 → sRGB gamma 分量 */
const linearToGamma = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** 解析 hex / rgb(a) 颜色串 → 线性 sRGB；无法解析返回 null */
const parseToLinear = (color: string): LinearRgb | null => {
  const value = color.trim();
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return {
      r: gammaToLinear(parseInt(h.slice(0, 2), 16) / 255),
      g: gammaToLinear(parseInt(h.slice(2, 4), 16) / 255),
      b: gammaToLinear(parseInt(h.slice(4, 6), 16) / 255),
    };
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(value);
  if (rgb) {
    const parts = rgb[1].split(/[,\s/]+/).filter(Boolean);
    if (parts.length >= 3) {
      const channel = (raw: string): number => (raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw) / 255);
      return { r: gammaToLinear(channel(parts[0])), g: gammaToLinear(channel(parts[1])), b: gammaToLinear(channel(parts[2])) };
    }
  }
  return null;
};

/** 解析 `oklch(L C H)`（L 接受 0..1 或百分比；H 缺省 0）→ Oklch；非该形态返回 null */
const parseOklchLiteral = (color: string): Oklch | null => {
  const match = /^oklch\(([^)]+)\)$/i.exec(color.trim());
  if (!match) return null;
  const parts = match[1].split(/[\s/]+/).filter(Boolean);
  if (parts.length < 2) return null;
  const L = parts[0].endsWith('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
  const C = parseFloat(parts[1]);
  const H = parts.length >= 3 ? parseFloat(parts[2]) : 0;
  if (!Number.isFinite(L) || !Number.isFinite(C) || !Number.isFinite(H)) return null;
  return { L, C, H };
};

/** 线性 sRGB → oklch */
const linearToOklch = ({ r, g, b }: LinearRgb): Oklch => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(okA, okB);
  const H = (Math.atan2(okB, okA) * 180) / Math.PI;
  return { L: okL, C, H: (H + 360) % 360 };
};

/** oklch → sRGB gamma hex（钳到 gamut） */
const oklchToHex = ({ L, C, H }: Oklch): string => {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lr = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  const lg = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  const lb = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;
  const toByte = (linear: number): string =>
    Math.round(clamp01(linearToGamma(clamp01(linear))) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toByte(lr)}${toByte(lg)}${toByte(lb)}`;
};

/** 解析任意支持的颜色串 → oklch；无法解析返回 null */
const colorToOklch = (color: string): Oklch | null => {
  const literal = parseOklchLiteral(color);
  if (literal) return literal;
  const linear = parseToLinear(color);
  return linear ? linearToOklch(linear) : null;
};

/** 取 from→to 的最短色相差（处理 360° 环绕） */
const hueDelta = (from: number, to: number): number => {
  const diff = ((to - from) % 360 + 540) % 360 - 180;
  return diff;
};

/**
 * 在 oklch 空间插值两个颜色，返回 sRGB hex
 * @description 任一端点无法解析 oklch（命名色 / hsl 等）→ 回退：t<0.5 返回 from、否则 to（无平滑过渡，best-effort）。
 */
export const lerpColorOklch = (from: string, to: string, t: number): string => {
  const a = colorToOklch(from);
  const b = colorToOklch(to);
  if (!a || !b) return t < 0.5 ? from : to;
  return oklchToHex({ L: a.L + (b.L - a.L) * t, C: a.C + (b.C - a.C) * t, H: a.H + hueDelta(a.H, b.H) * t });
};

/**
 * 在 from→to 之间按 oklch 预采样 N 个等分颜色（含两端点，共 N+1 个），返回 sRGB hex 数组
 * @description SVG CSS 预采样用：把感知均匀的 oklch 路径退化成 sRGB 分段折线，写进 @keyframes，兼容性满分。
 *   端点无法解析 oklch 时回退为 [from, to]（不采样）。
 */
export const sampleColorOklch = (from: string, to: string, segments: number): Array<string> => {
  const a = colorToOklch(from);
  const b = colorToOklch(to);
  if (!a || !b || segments < 1) return [from, to];
  const out: Array<string> = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    out.push(oklchToHex({ L: a.L + (b.L - a.L) * t, C: a.C + (b.C - a.C) * t, H: a.H + hueDelta(a.H, b.H) * t }));
  }
  return out;
};
