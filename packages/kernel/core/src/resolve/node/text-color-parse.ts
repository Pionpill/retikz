import type { ParsedCssColor } from './text-color-types';

import { CSS_NAMED_COLOR_HEX } from './text-color-constants';

const NUMBER_SOURCE = String.raw`[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?`;
const NUMBER_PATTERN = new RegExp(`^${NUMBER_SOURCE}$`);
const PERCENTAGE_PATTERN = new RegExp(`^(${NUMBER_SOURCE})%$`);
const ANGLE_PATTERN = new RegExp(`^(${NUMBER_SOURCE})(deg|grad|rad|turn)?$`, 'i');
const ASCII_WHITESPACE_PATTERN = /[\t\n\f\r ]+/;
const ASCII_TRIM_START_PATTERN = /^[\t\n\f\r ]+/;
const ASCII_TRIM_END_PATTERN = /[\t\n\f\r ]+$/;

/** 只移除 CSS 语法允许的 ASCII whitespace */
const trimAsciiWhitespace = (value: string): string =>
  value.replace(ASCII_TRIM_START_PATTERN, '').replace(ASCII_TRIM_END_PATTERN, '');

/** 把数值限制到闭区间 */
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** 解析有限 CSS number */
const parseNumber = (token: string): number | null => {
  if (!NUMBER_PATTERN.test(token)) return null;
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
};

/** 解析 CSS percentage */
const parsePercentage = (token: string): number | null => {
  const match = PERCENTAGE_PATTERN.exec(token);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

/** 解析并归一化 alpha */
const parseAlpha = (token: string): number | null => {
  const percentage = parsePercentage(token);
  if (percentage !== null) return clamp(percentage / 100, 0, 1);
  const number = parseNumber(token);
  return number === null ? null : clamp(number, 0, 1);
};

/** 解析 RGB 通道，三通道必须统一使用 number 或 percentage */
const parseRgbChannels = (tokens: ReadonlyArray<string>): [number, number, number] | null => {
  if (tokens.length !== 3) return null;
  const percentages = tokens.map(parsePercentage);
  if (percentages.every((value): value is number => value !== null)) {
    return percentages.map(value => clamp(value / 100, 0, 1)) as [number, number, number];
  }
  const numbers = tokens.map(parseNumber);
  if (numbers.every((value): value is number => value !== null)) {
    return numbers.map(value => clamp(value / 255, 0, 1)) as [number, number, number];
  }
  return null;
};

/** 解析 hue 并归一化到 0~360 度 */
const parseHue = (token: string): number | null => {
  const match = ANGLE_PATTERN.exec(token);
  if (!match) return null;
  const raw = Number(match[1]);
  if (!Number.isFinite(raw)) return null;
  const unit = match.at(2)?.toLowerCase();
  const degrees =
    unit === 'turn' ? raw * 360 : unit === 'rad' ? (raw * 180) / Math.PI : unit === 'grad' ? raw * 0.9 : raw;
  return ((degrees % 360) + 360) % 360;
};

/** 按 CSS HSL 算法转换为归一化 sRGB */
const hslToRgb = (hue: number, saturation: number, lightness: number): [number, number, number] => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const sector = hue / 60;
  const intermediate = chroma * (1 - Math.abs((sector % 2) - 1));
  let channels: [number, number, number];
  if (sector < 1) channels = [chroma, intermediate, 0];
  else if (sector < 2) channels = [intermediate, chroma, 0];
  else if (sector < 3) channels = [0, chroma, intermediate];
  else if (sector < 4) channels = [0, intermediate, chroma];
  else if (sector < 5) channels = [intermediate, 0, chroma];
  else channels = [chroma, 0, intermediate];
  const offset = lightness - chroma / 2;
  return [channels[0] + offset, channels[1] + offset, channels[2] + offset];
};

/** 解析 HSL 三通道 */
const parseHslChannels = (tokens: ReadonlyArray<string>): [number, number, number] | null => {
  if (tokens.length !== 3) return null;
  const hue = parseHue(tokens[0]);
  const saturation = parsePercentage(tokens[1]);
  const lightness = parsePercentage(tokens[2]);
  if (hue === null || saturation === null || lightness === null) return null;
  return hslToRgb(hue, clamp(saturation / 100, 0, 1), clamp(lightness / 100, 0, 1));
};

/** 解析 legacy 逗号函数 */
const parseLegacyFunction = (name: string, body: string): ParsedCssColor | null => {
  if (body.includes('/')) return null;
  const tokens = body.split(',').map(trimAsciiWhitespace);
  const isRgb = name === 'rgb' || name === 'rgba';
  const requiredLength = name === 'rgba' || name === 'hsla' ? 4 : 3;
  if (tokens.length !== requiredLength || tokens.some(token => token.length === 0)) return null;
  const channels = isRgb ? parseRgbChannels(tokens.slice(0, 3)) : parseHslChannels(tokens.slice(0, 3));
  if (!channels) return null;
  const alpha = requiredLength === 4 ? parseAlpha(tokens[3]) : 1;
  return alpha === null ? null : { r: channels[0], g: channels[1], b: channels[2], a: alpha };
};

/** 解析现代空格分隔函数 */
const parseModernFunction = (name: string, body: string): ParsedCssColor | null => {
  if ((name !== 'rgb' && name !== 'hsl') || body.includes(',')) return null;
  const slashParts = body.split('/');
  if (slashParts.length > 2) return null;
  const channelText = trimAsciiWhitespace(slashParts[0]);
  const tokens = channelText.length === 0 ? [] : channelText.split(ASCII_WHITESPACE_PATTERN);
  const channels = name === 'rgb' ? parseRgbChannels(tokens) : parseHslChannels(tokens);
  if (!channels) return null;
  const alphaToken = slashParts.length === 2 ? trimAsciiWhitespace(slashParts[1]) : undefined;
  if (alphaToken !== undefined && alphaToken.length === 0) return null;
  const alpha = alphaToken === undefined ? 1 : parseAlpha(alphaToken);
  return alpha === null ? null : { r: channels[0], g: channels[1], b: channels[2], a: alpha };
};

/** 解析十六进制 CSS color */
const parseHexColor = (value: string): ParsedCssColor | null => {
  const hex = value.slice(1);
  if (!/^(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(hex)) return null;
  const expanded = hex.length <= 4 ? [...hex].map(char => `${char}${char}`).join('') : hex;
  const hasAlpha = expanded.length === 8;
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16) / 255,
    g: Number.parseInt(expanded.slice(2, 4), 16) / 255,
    b: Number.parseInt(expanded.slice(4, 6), 16) / 255,
    a: hasAlpha ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
  };
};

/** 解析 auto-contrast 支持的静态 CSS color 子集 */
export const parseStaticCssColor = (input: string): ParsedCssColor | null => {
  const value = trimAsciiWhitespace(input).toLowerCase();
  if (value.length === 0) return null;
  if (value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (value.startsWith('#')) return parseHexColor(value);
  if (Object.prototype.hasOwnProperty.call(CSS_NAMED_COLOR_HEX, value)) {
    const named = CSS_NAMED_COLOR_HEX[value];
    return {
      r: ((named >> 16) & 0xff) / 255,
      g: ((named >> 8) & 0xff) / 255,
      b: (named & 0xff) / 255,
      a: 1,
    };
  }
  const functionMatch = /^([a-z]+)\(([\s\S]*)\)$/.exec(value);
  if (!functionMatch) return null;
  const name = functionMatch[1];
  const body = functionMatch[2];
  if (name !== 'rgb' && name !== 'rgba' && name !== 'hsl' && name !== 'hsla') return null;
  return body.includes(',') ? parseLegacyFunction(name, body) : parseModernFunction(name, body);
};
