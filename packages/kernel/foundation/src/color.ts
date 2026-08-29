import { RetikzFoundationError, RetikzFoundationErrorCode } from './error';

/** 归一化 sRGB 颜色与 alpha */
export type ParsedCssColor = {
  /** 红色通道，范围 0~1 */
  r: number;
  /** 绿色通道，范围 0~1 */
  g: number;
  /** 蓝色通道，范围 0~1 */
  b: number;
  /** 不透明度，范围 0~1 */
  a: number;
};

/** CSS Color 关键字对应的 24-bit sRGB 值 */
const CSS_NAMED_COLOR_HEX: Readonly<Record<string, number>> = {
  aliceblue: 0xf0f8ff,
  antiquewhite: 0xfaebd7,
  aqua: 0x00ffff,
  aquamarine: 0x7fffd4,
  azure: 0xf0ffff,
  beige: 0xf5f5dc,
  bisque: 0xffe4c4,
  black: 0x000000,
  blanchedalmond: 0xffebcd,
  blue: 0x0000ff,
  blueviolet: 0x8a2be2,
  brown: 0xa52a2a,
  burlywood: 0xdeb887,
  cadetblue: 0x5f9ea0,
  chartreuse: 0x7fff00,
  chocolate: 0xd2691e,
  coral: 0xff7f50,
  cornflowerblue: 0x6495ed,
  cornsilk: 0xfff8dc,
  crimson: 0xdc143c,
  cyan: 0x00ffff,
  darkblue: 0x00008b,
  darkcyan: 0x008b8b,
  darkgoldenrod: 0xb8860b,
  darkgray: 0xa9a9a9,
  darkgreen: 0x006400,
  darkgrey: 0xa9a9a9,
  darkkhaki: 0xbdb76b,
  darkmagenta: 0x8b008b,
  darkolivegreen: 0x556b2f,
  darkorange: 0xff8c00,
  darkorchid: 0x9932cc,
  darkred: 0x8b0000,
  darksalmon: 0xe9967a,
  darkseagreen: 0x8fbc8f,
  darkslateblue: 0x483d8b,
  darkslategray: 0x2f4f4f,
  darkslategrey: 0x2f4f4f,
  darkturquoise: 0x00ced1,
  darkviolet: 0x9400d3,
  deeppink: 0xff1493,
  deepskyblue: 0x00bfff,
  dimgray: 0x696969,
  dimgrey: 0x696969,
  dodgerblue: 0x1e90ff,
  firebrick: 0xb22222,
  floralwhite: 0xfffaf0,
  forestgreen: 0x228b22,
  fuchsia: 0xff00ff,
  gainsboro: 0xdcdcdc,
  ghostwhite: 0xf8f8ff,
  gold: 0xffd700,
  goldenrod: 0xdaa520,
  gray: 0x808080,
  green: 0x008000,
  greenyellow: 0xadff2f,
  grey: 0x808080,
  honeydew: 0xf0fff0,
  hotpink: 0xff69b4,
  indianred: 0xcd5c5c,
  indigo: 0x4b0082,
  ivory: 0xfffff0,
  khaki: 0xf0e68c,
  lavender: 0xe6e6fa,
  lavenderblush: 0xfff0f5,
  lawngreen: 0x7cfc00,
  lemonchiffon: 0xfffacd,
  lightblue: 0xadd8e6,
  lightcoral: 0xf08080,
  lightcyan: 0xe0ffff,
  lightgoldenrodyellow: 0xfafad2,
  lightgray: 0xd3d3d3,
  lightgreen: 0x90ee90,
  lightgrey: 0xd3d3d3,
  lightpink: 0xffb6c1,
  lightsalmon: 0xffa07a,
  lightseagreen: 0x20b2aa,
  lightskyblue: 0x87cefa,
  lightslategray: 0x778899,
  lightslategrey: 0x778899,
  lightsteelblue: 0xb0c4de,
  lightyellow: 0xffffe0,
  lime: 0x00ff00,
  limegreen: 0x32cd32,
  linen: 0xfaf0e6,
  magenta: 0xff00ff,
  maroon: 0x800000,
  mediumaquamarine: 0x66cdaa,
  mediumblue: 0x0000cd,
  mediumorchid: 0xba55d3,
  mediumpurple: 0x9370db,
  mediumseagreen: 0x3cb371,
  mediumslateblue: 0x7b68ee,
  mediumspringgreen: 0x00fa9a,
  mediumturquoise: 0x48d1cc,
  mediumvioletred: 0xc71585,
  midnightblue: 0x191970,
  mintcream: 0xf5fffa,
  mistyrose: 0xffe4e1,
  moccasin: 0xffe4b5,
  navajowhite: 0xffdead,
  navy: 0x000080,
  oldlace: 0xfdf5e6,
  olive: 0x808000,
  olivedrab: 0x6b8e23,
  orange: 0xffa500,
  orangered: 0xff4500,
  orchid: 0xda70d6,
  palegoldenrod: 0xeee8aa,
  palegreen: 0x98fb98,
  paleturquoise: 0xafeeee,
  palevioletred: 0xdb7093,
  papayawhip: 0xffefd5,
  peachpuff: 0xffdab9,
  peru: 0xcd853f,
  pink: 0xffc0cb,
  plum: 0xdda0dd,
  powderblue: 0xb0e0e6,
  purple: 0x800080,
  rebeccapurple: 0x663399,
  red: 0xff0000,
  rosybrown: 0xbc8f8f,
  royalblue: 0x4169e1,
  saddlebrown: 0x8b4513,
  salmon: 0xfa8072,
  sandybrown: 0xf4a460,
  seagreen: 0x2e8b57,
  seashell: 0xfff5ee,
  sienna: 0xa0522d,
  silver: 0xc0c0c0,
  skyblue: 0x87ceeb,
  slateblue: 0x6a5acd,
  slategray: 0x708090,
  slategrey: 0x708090,
  snow: 0xfffafa,
  springgreen: 0x00ff7f,
  steelblue: 0x4682b4,
  tan: 0xd2b48c,
  teal: 0x008080,
  thistle: 0xd8bfd8,
  tomato: 0xff6347,
  turquoise: 0x40e0d0,
  violet: 0xee82ee,
  wheat: 0xf5deb3,
  white: 0xffffff,
  whitesmoke: 0xf5f5f5,
  yellow: 0xffff00,
  yellowgreen: 0x9acd32,
};

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

/** 解析无需宿主环境即可确定的静态 CSS color 子集 */
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

/** 把归一化 sRGB 通道格式化为两位小写十六进制 */
const formatChannel = (channel: number): string =>
  Math.round(channel * 255)
    .toString(16)
    .padStart(2, '0');

/** 创建颜色原子输入错误 */
const createColorError = (
  input: 'foreground' | 'backdrop' | 'weight',
  value: string | number,
  message: string,
): RetikzFoundationError =>
  new RetikzFoundationError({
    code: RetikzFoundationErrorCode.Color,
    message,
    details: { input, value },
  });

/**
 * 把静态 CSS 前景色按权重预合成到不透明静态底色
 * @description 前景自身 alpha 与 weight 相乘，再按 source-over sRGB 得到不含透明度的确定性颜色
 */
export const compositeOpaqueColor = (foreground: string, backdrop: string, weight: number): `#${string}` => {
  if (!Number.isFinite(weight) || weight < 0 || weight > 1) {
    throw createColorError('weight', weight, 'compositeOpaqueColor: weight must be a finite number in [0, 1].');
  }
  const parsedForeground = parseStaticCssColor(foreground);
  if (parsedForeground === null) {
    throw createColorError(
      'foreground',
      foreground,
      `compositeOpaqueColor: unsupported static foreground '${foreground}'.`,
    );
  }
  const parsedBackdrop = parseStaticCssColor(backdrop);
  if (parsedBackdrop === null) {
    throw createColorError('backdrop', backdrop, `compositeOpaqueColor: unsupported static backdrop '${backdrop}'.`);
  }
  if (parsedBackdrop.a !== 1) {
    throw createColorError('backdrop', backdrop, `compositeOpaqueColor: backdrop '${backdrop}' must be opaque.`);
  }
  const effectiveAlpha = parsedForeground.a * weight;
  const red = parsedForeground.r * effectiveAlpha + parsedBackdrop.r * (1 - effectiveAlpha);
  const green = parsedForeground.g * effectiveAlpha + parsedBackdrop.g * (1 - effectiveAlpha);
  const blue = parsedForeground.b * effectiveAlpha + parsedBackdrop.b * (1 - effectiveAlpha);
  return `#${formatChannel(red)}${formatChannel(green)}${formatChannel(blue)}`;
};
