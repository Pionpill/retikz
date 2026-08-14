import type { IRAxisScale, IRBoxSize, IRPaintSpec } from '@retikz/core';
import type {
  IRPlotChannel,
  IRPlotEncoding,
  IRPlotNodeAxisScaleStyle,
  IRPlotNodeBoxSizeStyle,
  IRPlotNodeBoxSpacingStyle,
  IRPlotPointColorStyle,
  IRPlotPointFillStyle,
  IRPlotPointNonnegativeNumberStyle,
  IRPlotPointShapeStyle,
  IRPlotPointStrokeStyle,
  IRPlotPointStrokeWidthStyle,
  MarkValueType,
} from '@retikz/plot';

import type { PlotAuthoringContext } from './contracts';
import type {
  CoreNodeChannelProps,
  CorePathChannelProps,
  DatumLabelProps,
  ExtensionChannelProp,
  IntervalMarkProps,
  PointMarkProps,
} from './input-marks';

const AUTO_COLOR = '__color';

/** 把颜色或系列字段转换为绑定自动颜色比例尺的通道 */
export const colorChannel = (
  color: string | undefined,
  series: string | undefined,
): { color: { field: string; scale: string } } | undefined => {
  const field = color ?? series;
  return field ? { color: { field, scale: AUTO_COLOR } } : undefined;
};

const CSS_COLOR_KEYWORDS = new Set([
  'black',
  'silver',
  'gray',
  'grey',
  'white',
  'maroon',
  'red',
  'purple',
  'fuchsia',
  'green',
  'lime',
  'olive',
  'yellow',
  'navy',
  'blue',
  'teal',
  'aqua',
  'orange',
  'none',
  'transparent',
  'currentcolor',
  'rebeccapurple',
  'crimson',
  'steelblue',
  'darkorange',
  'lightblue',
]);

const canUseCssColor = (value: string): boolean => {
  const css = globalThis.CSS as { supports?: (property: string, value: string) => boolean } | undefined;
  if (css?.supports?.('color', value)) return true;
  const normalized = value.trim().toLowerCase();
  return (
    /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ||
    /^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\(/i.test(normalized) ||
    /^var\(--[\w-]+\)$/i.test(normalized) ||
    CSS_COLOR_KEYWORDS.has(normalized)
  );
};

const warnSkippedStyle = (prop: string, value: string): void => {
  console.warn(
    `buildPlotSpec: <PointMark ${prop}="${value}"> is neither a known data field nor a valid constant for ${prop}; skipped`,
  );
};

/** 样式糖解析可见的数据字段集合 */
export type StyleSugarContext = {
  /** 可被字符串样式引用的数据字段 */
  fieldNames: ReadonlySet<string>;
};

/** 合并 runtime rows 与显式 model 提供的可见字段 */
export const styleSugarContext = (context: PlotAuthoringContext): StyleSugarContext => {
  const fieldNames = new Set<string>(context.dataFieldNames);
  for (const field of context.model ?? []) fieldNames.add(field.name);
  return { fieldNames };
};

const isMarkValue = (value: unknown): value is MarkValueType<unknown> =>
  value !== null &&
  typeof value === 'object' &&
  'kind' in value &&
  ((value as { kind?: unknown }).kind === 'field' || (value as { kind?: unknown }).kind === 'constant');

const isChannelBinding = (value: unknown): value is IRPlotChannel =>
  value !== null &&
  !Array.isArray(value) &&
  typeof value === 'object' &&
  ('field' in value || 'value' in value || 'scale' in value);

const channelBindingOf = (value: ExtensionChannelProp): IRPlotChannel => {
  if (isMarkValue(value)) {
    return value.kind === 'field' ? { field: String(value.value) } : { value: value.value };
  }
  if (isChannelBinding(value)) return value;
  return typeof value === 'string' ? { field: value } : { value };
};

/** 把扩展通道 props 规范化为 Plot channels encoding */
export const extensionChannelEncoding = (channels: DatumLabelProps['channels']): Pick<IRPlotEncoding, 'channels'> => {
  if (channels === undefined) return {};
  const out: Record<string, IRPlotChannel> = {};
  for (const [name, value] of Object.entries(channels)) out[name] = channelBindingOf(value);
  return Object.keys(out).length > 0 ? { channels: out } : {};
};

type PaintStyleInput = string | IRPaintSpec | MarkValueType<string | IRPaintSpec> | undefined;

/** 把 paint 样式解析为字段绑定或常量值 */
export const paintStyleOf = <T extends IRPlotPointFillStyle | IRPlotPointStrokeStyle>(
  value: PaintStyleInput,
  prop: 'fill' | 'stroke',
  context: StyleSugarContext,
): T | undefined => {
  if (value === undefined) return undefined;
  if (isMarkValue(value)) return value as T;
  if (typeof value !== 'string') return { kind: 'constant', value } as T;
  if (context.fieldNames.has(value)) return { kind: 'field', value } as T;
  if (canUseCssColor(value)) return { kind: 'constant', value } as T;
  warnSkippedStyle(prop, value);
  return undefined;
};

/** 把 point color 样式解析为字段绑定或常量值，并为字段补自动颜色比例尺 */
export const pointColorStyleOf = (
  value: PointMarkProps['color'],
  context: StyleSugarContext,
): IRPlotPointColorStyle | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return value.kind === 'field' ? { ...value, scale: value.scale ?? AUTO_COLOR } : value;
  if (context.fieldNames.has(value)) return { kind: 'field', value, scale: AUTO_COLOR };
  if (canUseCssColor(value)) return { kind: 'constant', value };
  warnSkippedStyle('color', value);
  return undefined;
};

/** 把 stroke 样式解析为字段绑定或常量值 */
export const strokeStyleOf = (
  stroke: PointMarkProps['stroke'],
  context: StyleSugarContext,
): IRPlotPointStrokeStyle | undefined => {
  return paintStyleOf<IRPlotPointStrokeStyle>(stroke, 'stroke', context);
};

/** 把 strokeWidth 样式解析为字段绑定或数值常量 */
export const strokeWidthStyleOf = (
  strokeWidth: PointMarkProps['strokeWidth'],
  context: StyleSugarContext,
): IRPlotPointStrokeWidthStyle | undefined => {
  if (strokeWidth === undefined) return undefined;
  if (isMarkValue(strokeWidth)) return strokeWidth;
  if (typeof strokeWidth === 'number') return { kind: 'constant', value: strokeWidth };
  if (context.fieldNames.has(strokeWidth)) return { kind: 'field', value: strokeWidth };
  warnSkippedStyle('strokeWidth', strokeWidth);
  return undefined;
};

/** 把数值样式解析为字段绑定或常量值 */
export const numberStyleOf = <T extends MarkValueType<number>>(
  value: string | number | MarkValueType<number> | undefined,
  prop: string,
  context: StyleSugarContext,
): T | undefined => {
  if (value === undefined) return undefined;
  if (isMarkValue(value)) return value as T;
  if (typeof value === 'number') return { kind: 'constant', value } as T;
  if (context.fieldNames.has(value)) return { kind: 'field', value } as T;
  warnSkippedStyle(prop, value);
  return undefined;
};

/** 把 interval pull 简写解析为字段绑定或非负数常量 */
export const intervalPullStyleOf = (
  value: IntervalMarkProps['pull'],
): IRPlotPointNonnegativeNumberStyle | undefined => {
  if (value === undefined) return undefined;
  if (isMarkValue(value)) return value;
  return typeof value === 'number' ? { kind: 'constant', value } : { kind: 'field', value };
};

/** 把枚举样式解析为字段绑定或允许的常量值 */
export const enumStyleOf = <T extends string>(
  value: string | MarkValueType<T> | undefined,
  prop: string,
  allowed: ReadonlySet<string>,
  context: StyleSugarContext,
): MarkValueType<T> | undefined => {
  if (value === undefined) return undefined;
  if (isMarkValue(value)) return value;
  if (context.fieldNames.has(value)) return { kind: 'field', value };
  if (allowed.has(value)) return { kind: 'constant', value: value as T };
  warnSkippedStyle(prop, value);
  return undefined;
};

/** 把布尔样式解析为字段绑定或常量值 */
export const booleanStyleOf = (
  value: string | boolean | MarkValueType<boolean> | undefined,
  prop: string,
  context: StyleSugarContext,
): MarkValueType<boolean> | undefined => {
  if (value === undefined) return undefined;
  if (isMarkValue(value)) return value;
  if (typeof value === 'boolean') return { kind: 'constant', value };
  if (context.fieldNames.has(value)) return { kind: 'field', value };
  warnSkippedStyle(prop, value);
  return undefined;
};

const jsonStyleOf = <T>(
  value: string | T | MarkValueType<T> | undefined,
  prop: string,
  context: StyleSugarContext,
): MarkValueType<T> | undefined => {
  if (value === undefined) return undefined;
  if (isMarkValue(value)) return value;
  if (typeof value === 'string') {
    if (context.fieldNames.has(value)) return { kind: 'field', value };
    warnSkippedStyle(prop, value);
    return undefined;
  }
  return { kind: 'constant', value };
};

/** 把 box spacing 样式解析为字段绑定或常量值 */
export const boxSpacingStyleOf = (
  value: CoreNodeChannelProps['padding'],
  prop: string,
  context: StyleSugarContext,
): IRPlotNodeBoxSpacingStyle | undefined => {
  if (value === undefined) return undefined;
  if (isMarkValue(value)) return value;
  if (typeof value === 'string') {
    if (context.fieldNames.has(value)) return { kind: 'field', value };
    warnSkippedStyle(prop, value);
    return undefined;
  }
  return { kind: 'constant', value };
};

const nodeScaleStyleOf = (
  value: CoreNodeChannelProps['scale'],
  prop: string,
  context: StyleSugarContext,
): IRPlotNodeAxisScaleStyle | undefined => jsonStyleOf<number | IRAxisScale>(value, prop, context);

/** 把节点最小尺寸解析为字段绑定或 box size 常量 */
export const nodeBoxSizeStyleOf = (
  value: PointMarkProps['minimumSize'],
  prop: string,
  context: StyleSugarContext,
): IRPlotNodeBoxSizeStyle | undefined => jsonStyleOf<number | IRBoxSize>(value, prop, context);

/** 把节点共享样式 props 规范化为 Plot mark 样式字段 */
export const nodeStylePropsOf = (props: CoreNodeChannelProps, context: StyleSugarContext): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const put = (name: string, value: unknown): void => {
    if (value !== undefined) out[name] = value;
  };
  put('align', enumStyleOf(props.align, 'align', new Set(['start', 'middle', 'end']), context));
  put('lineHeight', numberStyleOf(props.lineHeight, 'lineHeight', context));
  put('maxTextWidth', numberStyleOf(props.maxTextWidth, 'maxTextWidth', context));
  put('cornerRadius', numberStyleOf(props.cornerRadius, 'cornerRadius', context));
  put('scale', nodeScaleStyleOf(props.scale, 'scale', context));
  put('padding', boxSpacingStyleOf(props.padding, 'padding', context));
  put('margin', boxSpacingStyleOf(props.margin, 'margin', context));
  put('dashed', booleanStyleOf(props.dashed, 'dashed', context));
  put('dotted', booleanStyleOf(props.dotted, 'dotted', context));
  put('dashPattern', jsonStyleOf(props.dashPattern, 'dashPattern', context));
  put('font', jsonStyleOf(props.font, 'font', context));
  put('boundary', jsonStyleOf(props.boundary, 'boundary', context));
  put(
    'shadow',
    typeof props.shadow === 'string'
      ? enumStyleOf(props.shadow, 'shadow', new Set(['none', 'sm', 'md', 'lg', 'xl', '2xl']), context)
      : jsonStyleOf(props.shadow, 'shadow', context),
  );
  put(
    'blendMode',
    enumStyleOf(
      props.blendMode,
      'blendMode',
      new Set([
        'normal',
        'multiply',
        'screen',
        'overlay',
        'darken',
        'lighten',
        'color-dodge',
        'color-burn',
        'hard-light',
        'soft-light',
        'difference',
        'exclusion',
        'hue',
        'saturation',
        'color',
        'luminosity',
      ]),
      context,
    ),
  );
  return out;
};

/** 把路径共享样式 props 规范化为 Plot mark 样式字段 */
export const pathStylePropsOf = (props: CorePathChannelProps, context: StyleSugarContext): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const put = (name: string, value: unknown): void => {
    if (value !== undefined) out[name] = value;
  };
  put('fill', paintStyleOf<IRPlotPointFillStyle>(props.fill, 'fill', context));
  put('stroke', paintStyleOf<IRPlotPointStrokeStyle>(props.stroke, 'stroke', context));
  put('strokeOpacity', numberStyleOf(props.strokeOpacity, 'strokeOpacity', context));
  put('zIndex', numberStyleOf(props.zIndex, 'zIndex', context));
  put('rotate', numberStyleOf(props.rotate, 'rotate', context));
  put('scale', jsonStyleOf(props.scale, 'scale', context));
  put('fillRule', enumStyleOf(props.fillRule, 'fillRule', new Set(['nonzero', 'evenodd']), context));
  put(
    'thickness',
    enumStyleOf(
      props.thickness,
      'thickness',
      new Set(['ultraThin', 'veryThin', 'thin', 'semithick', 'thick', 'veryThick', 'ultraThick']),
      context,
    ),
  );
  put('marks', props.marks);
  put('dashPattern', jsonStyleOf(props.dashPattern, 'dashPattern', context));
  put(
    'shadow',
    typeof props.shadow === 'string'
      ? enumStyleOf(props.shadow, 'shadow', new Set(['none', 'sm', 'md', 'lg', 'xl', '2xl']), context)
      : jsonStyleOf(props.shadow, 'shadow', context),
  );
  put(
    'blendMode',
    enumStyleOf(
      props.blendMode,
      'blendMode',
      new Set([
        'normal',
        'multiply',
        'screen',
        'overlay',
        'darken',
        'lighten',
        'color-dodge',
        'color-burn',
        'hard-light',
        'soft-light',
        'difference',
        'exclusion',
        'hue',
        'saturation',
        'color',
        'luminosity',
      ]),
      context,
    ),
  );
  return out;
};

/** 把 shape prop 规范化为字段或常量样式 */
export const shapeStyleOf = (
  value: PointMarkProps['shape'],
  context: StyleSugarContext,
): IRPlotPointShapeStyle | undefined => {
  if (value === undefined) return undefined;
  if (isMarkValue(value)) return value;
  if (typeof value !== 'string') return { kind: 'constant', value };
  if (context.fieldNames.has(value)) return { kind: 'field', value };
  return { kind: 'constant', value };
};
