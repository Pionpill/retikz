import type {
  AxisGuide,
  Channel,
  CoordinateOperation,
  DataModel,
  Encoding,
  ExternalRow,
  Guide,
  IntervalBounds,
  IRPaintSpec,
  Mark,
  MarkGeometryLabelList,
  MarkNodeLabel,
  MarkNodeLabelList,
  MarkValueType,
  PlotSpec,
  PointColorStyle,
  PointFillStyle,
  PointNonnegativeNumberStyle,
  PointNumberStyle,
  PointOpacityStyle,
  PointShapeStyle,
  PointSizeStyle,
  PointStrokeStyle,
  PointStrokeWidthStyle,
  PointZIndexStyle,
  RelationPathGeometry,
  Scale as PlotScaleSpec,
  TextChannel,
  TransformOperation,
} from '@retikz/plot';
import type { ReactNode } from 'react';

import {
  CoordinateOperationSchema,
  IntervalBoundKind,
  MarkGeometryLabelListSchema,
  MarkNodeLabelListSchema,
  MarkNodeLabelSchema,
  PLOT_NAMESPACE,
  PlotComposite,
  PlotCoordinate,
  PlotFieldType,
  PlotGuide,
  PlotMark,
  PlotScale,
  PlotSpecSchema,
  PlotTransform,
  RelationPathGeometrySchema,
} from '@retikz/plot';
import { Children, Fragment, isValidElement } from 'react';

import type { AxisProps, LegendProps } from './guides';
import type {
  CoreNodeChannelProps,
  CorePathChannelProps,
  DatumLabelProps,
  ExtensionChannelProp,
  IntervalMarkProps,
  PathMarkProps,
  PointMarkProps,
  ReferenceMarkProps,
  RelationMarkProps,
} from './marks';
import type { PositionScaleType, ScaleDimension, ScaleProps } from './scales';
import type { TransformProps } from './transform';

import { Facet, Scaffold, Track } from './composition';
import { Axis, Legend } from './guides';
import { IntervalMark, PathMark, PointMark, ReferenceMark, RelationMark } from './marks';
import { Scale } from './scales';
import { Transform as TransformComponent } from './transform';

/** 自动建的 scale 名（用户不可见；需要显式 scale 配置时后续再加 <Scale>） */
const AUTO_X = '__x';
const AUTO_Y = '__y';
const AUTO_ANGLE = '__angle';
const AUTO_RADIUS = '__radius';
const AUTO_COLOR = '__color';
const DEFAULT_AXIS_SCOPE = 'default';

/**
 * <Plot coordinate> 入口形态：字符串简写或对象配置；缺省 cartesian2D
 * @description 简写 / 判别串与 IR 一致（含维度命名）：polar2D / cartesian1D / polar1D / ternary2D；cartesian2D 为缺省态不必写。
 *   对象形态承载各坐标系几何：polar2D 角向区间 + 环图内半径、cartesian1D 轴向、polar1D 半径占比 + 角向区间、ternary2D 无额外配置。
 */
export type CoordinateInput =
  | 'polar2D'
  | 'cartesian1D'
  | 'polar1D'
  | 'ternary2D'
  | {
      /** 2D 极坐标 */
      type: 'polar2D';
      /** 环图内半径（外半径占比 0..1）；0 = 实心饼 */
      innerRadius?: number;
      /** 角向起始角（度） */
      startAngle?: number;
      /** 角向终止角（度） */
      endAngle?: number;
    }
  | {
      /** 1D 笛卡尔直线 */
      type: 'cartesian1D';
      /** 轴向（horizontal 沿 x、vertical 沿 y）；缺省 horizontal */
      orientation?: 'horizontal' | 'vertical';
    }
  | {
      /** 1D 极坐标圆周 */
      type: 'polar1D';
      /** 圆周半径占可用半径比（0<r≤1）；缺省 1（外圆） */
      radius?: number;
      /** 角向起始角（度）；缺省 0 */
      startAngle?: number;
      /** 角向终止角（度）；缺省 360 */
      endAngle?: number;
    }
  | {
      /** 2D 三元（重心坐标） */
      type: 'ternary2D';
    }
  | ({ type: string } & Record<string, unknown>);

type Polar2DCoordinateInput = Extract<CoordinateInput, { type: 'polar2D' }>;

/** buildPlotSpec 选项：坐标系选择 + 数据模型 */
export type BuildPlotSpecOptions = {
  /** PlotSpec id：作为整张图的外部 anchor 句柄 */
  id?: string;
  /** PlotSpec intrinsic width：组合场景下每张 plot 自描述面板宽度 */
  width?: number;
  /** PlotSpec intrinsic height：组合场景下每张 plot 自描述面板高度 */
  height?: number;
  /** 坐标系选择（缺省 cartesian2D）；"polar2D" 或 polar2D 对象配置 */
  coordinate?: CoordinateInput;
  composition?: PlotSpec['composition'];
  /** 数据模型（字段类型）：声明则进 data.model，并对未显式 <Scale> 的位置维度走 type-driven 派生 */
  model?: DataModel;
  /**
   * 直传数据 transform IR（拼到 <Transform> 收集结果之前、自动装配 stack 之前）；与 <Transform> 声明组件共用同一管线。
   * @description 程序化构造 spec 时完全掌控 transform 顺序的入口；含 stack 时同样抑制 mark shortcut stack（B4 去重）。
   */
  transforms?: Array<TransformOperation>;
  /**
   * Mark-level transform shortcuts.
   * @description Shortcuts convert a mark shape into ordinary plot-level transform operations. They do not consume
   * mark.transform; mark-local transforms still run later as that layer's private row view.
   */
  markTransformShortcuts?: Array<MarkTransformShortcutDefinition>;
  /** 默认颜色数组：分类 color scale 的 range；无 color 编码的 mark 按图层序取色，`currentColor` 表示继承当前文字颜色 */
  colors?: Array<string>;
  /** Plot theme：背景、typography、axis、legend、palette 的 JSON-safe 默认值 */
  theme?: PlotSpec['theme'];
  /** 当前数据集可见字段名集合；用于把样式字符串糖优先解析成字段通道 */
  dataFieldNames?: ReadonlySet<string>;
  /**
   * 延迟位置 scale 推断：省略未显式声明的位置 scale 绑定，让 lowering 按实际数据字段类型派生。
   * @description 供 `<Plot data>` 入口使用；直接调用 buildPlotSpec 时缺省保持旧的 AUTO linear/band 行为。
   */
  deferPositionScaleInference?: boolean;
};

export type MarkTransformShortcutContext = {
  mark: Mark;
  markIndex: number;
  marks: ReadonlyArray<Mark>;
};

export type MarkTransformShortcutDefinition = {
  markType: string;
  build: (context: MarkTransformShortcutContext) => Array<TransformOperation> | undefined;
};

type AxisBoundMark = Mark & {
  xAxisId?: string;
  yAxisId?: string;
  facetId?: string;
  trackId?: string;
};

type AxisBoundGuide = Guide & {
  facetId?: string;
  scaffoldId?: string;
  trackId?: string;
};

type CompositionSpec = NonNullable<PlotSpec['composition']>;
type ArrangementSpec = NonNullable<CompositionSpec['arrangements']>[number];
type FacetGridSpec = Extract<ArrangementSpec, { kind: 'facet' }>;
type SharedScaffoldSpec = Extract<ArrangementSpec, { kind: 'tracks' }>;
type ScaffoldTrackSpec = SharedScaffoldSpec['tracks'][number];
type CollectedFacet = FacetGridSpec & {
  spacing?: CompositionSpec['spacing'];
  resolve?: CompositionSpec['resolve'];
};
type CollectedScaffold = Omit<SharedScaffoldSpec, 'coordinate'> & {
  coordinate?: SharedScaffoldSpec['coordinate'];
  spacing?: CompositionSpec['spacing'];
  resolve?: CompositionSpec['resolve'];
};

/** 默认 guide（供 decorateDefaultGuides 复用，薄 <Plot> 本身不补）：x 轴 + y 轴（y 带网格，横线读数值、不过密） */
const DEFAULT_GUIDES: ReadonlyArray<Guide> = [
  { type: PlotGuide.Axis, dimension: 'x' },
  { type: PlotGuide.Axis, dimension: 'y', grid: true },
];

/** 运行时 datum label 解析器（ADR-04）：按 mark id 映射「行 → 自定义标签串」（不进 IR，经 lowerPlots options 注入） */
export type ResolveLabelMap = Record<string, (row: ExternalRow) => string>;

/** buildPlotSpec 收集的 resolveLabel 旁路：以返回的 PlotSpec 为键，供 resolvePlotRuntime 取出注入 options（不进 IR） */
const resolveLabelBySpec = new WeakMap<PlotSpec, ResolveLabelMap>();

/** 取某 PlotSpec 经 buildPlotSpec 收集的 resolveLabel 运行时表（无则 undefined） */
export const resolveLabelOf = (spec: PlotSpec): ResolveLabelMap | undefined => resolveLabelBySpec.get(spec);

/** 收集过程的可变累加器 */
type Collected = {
  marks: Array<AxisBoundMark>;
  guides: Array<AxisBoundGuide>;
  facets: Array<CollectedFacet>;
  scaffolds: Array<CollectedScaffold>;
  /** 显式 transform（<Transform> 声明组件收集，按声明序） */
  transforms: Array<TransformOperation>;
  /** mark shortcut 自动装配的 transform；显式 stack 存在时同签名抑制（B4 去重） */
  shortcutTransforms: Array<TransformOperation>;
  /** 显式声明的位置 scale */
  scales: Array<ScaleProps>;
  /** 按 mark id 收集的运行时 resolveLabel（不进 IR；ADR-04） */
  resolveLabels: ResolveLabelMap;
  /** 是否有 mark 用了颜色（→ 需自动色 scale） */
  colored: boolean;
  /** 用到的 color 字段名集合（→ 配 model 时按字段类型派生 sequential / ordinal） */
  colorFields: Array<string>;
  /** 是否有 <IntervalMark>（→ 角向轴强制 band scale） */
  hasBar: boolean;
  /** 是否有 <IntervalMark>（heatmap → x / y 双轴强制 band scale） */
  hasRect: boolean;
  /** 是否有横向 <IntervalMark> 快捷入口（仅 cartesian2D） */
  hasHorizontalBar: boolean;
  /** 是否有 <IntervalMark angle> 饼/环图入口（→ 角向 linear scale） */
  hasSector: boolean;
  /** 是否有闭合 <PathMark>（雷达 → 角向 point scale） */
  hasClosedLine: boolean;
};

type CollectionContext = {
  facetId?: string;
  scaffoldId?: string;
  trackId?: string;
};

/** 颜色字段缺省取 series（分系列即按系列上色）；都无则不着色 */
const colorChannel = (
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

type StyleSugarContext = {
  fieldNames: ReadonlySet<string>;
};

const styleSugarContext = (options: BuildPlotSpecOptions): StyleSugarContext => {
  const fieldNames = new Set<string>(options.dataFieldNames);
  for (const field of options.model ?? []) fieldNames.add(field.name);
  return { fieldNames };
};

const isMarkValue = (value: unknown): value is MarkValueType<unknown> =>
  value !== null &&
  typeof value === 'object' &&
  'kind' in value &&
  ((value as { kind?: unknown }).kind === 'field' || (value as { kind?: unknown }).kind === 'constant');

const isChannelBinding = (value: unknown): value is Channel =>
  value !== null &&
  !Array.isArray(value) &&
  typeof value === 'object' &&
  ('field' in value || 'value' in value || 'scale' in value);

const channelBindingOf = (value: ExtensionChannelProp): Channel => {
  if (isMarkValue(value)) {
    return value.kind === 'field' ? { field: String(value.value) } : { value: value.value };
  }
  if (isChannelBinding(value)) return value;
  return typeof value === 'string' ? { field: value } : { value };
};

const extensionChannelEncoding = (channels: DatumLabelProps['channels']): Pick<Encoding, 'channels'> => {
  if (channels === undefined) return {};
  const out: Record<string, Channel> = {};
  for (const [name, value] of Object.entries(channels)) out[name] = channelBindingOf(value);
  return Object.keys(out).length > 0 ? { channels: out } : {};
};

type PaintStyleInput = string | IRPaintSpec | MarkValueType<string | IRPaintSpec> | undefined;

const paintStyleOf = <T extends PointFillStyle | PointStrokeStyle>(
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

const pointColorStyleOf = (value: PointMarkProps['color'], context: StyleSugarContext): PointColorStyle | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return value.kind === 'field' ? { ...value, scale: value.scale ?? AUTO_COLOR } : value;
  if (context.fieldNames.has(value)) return { kind: 'field', value, scale: AUTO_COLOR };
  if (canUseCssColor(value)) return { kind: 'constant', value };
  warnSkippedStyle('color', value);
  return undefined;
};

const strokeStyleOf = (stroke: PointMarkProps['stroke'], context: StyleSugarContext): PointStrokeStyle | undefined => {
  return paintStyleOf<PointStrokeStyle>(stroke, 'stroke', context);
};

const strokeWidthStyleOf = (
  strokeWidth: PointMarkProps['strokeWidth'],
  context: StyleSugarContext,
): PointStrokeWidthStyle | undefined => {
  if (strokeWidth === undefined) return undefined;
  if (isMarkValue(strokeWidth)) return strokeWidth;
  if (typeof strokeWidth === 'number') return { kind: 'constant', value: strokeWidth };
  if (context.fieldNames.has(strokeWidth)) return { kind: 'field', value: strokeWidth };
  warnSkippedStyle('strokeWidth', strokeWidth);
  return undefined;
};

const numberStyleOf = <T extends MarkValueType<number>>(
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

const intervalPullStyleOf = (value: IntervalMarkProps['pull']): PointNonnegativeNumberStyle | undefined => {
  if (value === undefined) return undefined;
  if (isMarkValue(value)) return value;
  return typeof value === 'number' ? { kind: 'constant', value } : { kind: 'field', value };
};

const enumStyleOf = <T extends string>(
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

const booleanStyleOf = (
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

const nodeStylePropsOf = (props: CoreNodeChannelProps, context: StyleSugarContext): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const put = (name: string, value: unknown): void => {
    if (value !== undefined) out[name] = value;
  };
  put('align', enumStyleOf(props.align, 'align', new Set(['left', 'center', 'right']), context));
  put('lineHeight', numberStyleOf(props.lineHeight, 'lineHeight', context));
  put('maxTextWidth', numberStyleOf(props.maxTextWidth, 'maxTextWidth', context));
  put('cornerRadius', numberStyleOf(props.cornerRadius, 'cornerRadius', context));
  put('scale', numberStyleOf(props.scale, 'scale', context));
  put('xScale', numberStyleOf(props.xScale, 'xScale', context));
  put('yScale', numberStyleOf(props.yScale, 'yScale', context));
  put('innerXSep', numberStyleOf(props.innerXSep, 'innerXSep', context));
  put('innerYSep', numberStyleOf(props.innerYSep, 'innerYSep', context));
  put('outerSep', numberStyleOf(props.outerSep, 'outerSep', context));
  put('margin', numberStyleOf(props.margin, 'margin', context));
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

const pathStylePropsOf = (props: CorePathChannelProps, context: StyleSugarContext): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const put = (name: string, value: unknown): void => {
    if (value !== undefined) out[name] = value;
  };
  put('fill', paintStyleOf<PointFillStyle>(props.fill, 'fill', context));
  put('stroke', paintStyleOf<PointStrokeStyle>(props.stroke, 'stroke', context));
  put('drawOpacity', numberStyleOf(props.drawOpacity, 'drawOpacity', context));
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

/** 记录某 mark 的 color 编码：置 colored 并收集 color 字段名（供 model 派生 sequential / ordinal） */
const shapeStyleOf = (value: PointMarkProps['shape'], context: StyleSugarContext): PointShapeStyle | undefined => {
  if (value === undefined) return undefined;
  if (isMarkValue(value)) return value;
  if (typeof value !== 'string') return { kind: 'constant', value };
  if (context.fieldNames.has(value)) return { kind: 'field', value };
  return { kind: 'constant', value };
};

const recordColor = (into: Collected, colorEnc: { color: { field: string; scale: string } } | undefined): void => {
  if (!colorEnc) return;
  into.colored = true;
  into.colorFields.push(colorEnc.color.field);
};

const recordMarkColor = (into: Collected, color: PointColorStyle | undefined): void => {
  if (color?.kind !== 'field') return;
  into.colored = true;
  into.colorFields.push(color.value);
};

/**
 * 把位置 mark 的扁平 label* props 装成 IR MarkLabel（priority-1 宿主 datum label，ADR-04）
 * @description label 顶层 string 默认按字段（content.field）；labelDisplayFormat 进 IR；labelPosition / labelDistance / labelPin
 *   摊进对齐 core NodeLabelSchema 的字段。无 label 字段 → undefined（不挂标签）。
 */
const buildMarkLabel = (props: DatumLabelProps): MarkNodeLabel | undefined => {
  const {
    label,
    labelDisplayFormat,
    labelPosition,
    labelDistance,
    labelPin,
    labelTextColor,
    labelOpacity,
    labelFont,
    labelRotate,
    labelKeepUpright,
  } = props;
  if (label === undefined) return undefined;
  const content: TextChannel = {
    field: label,
    ...(labelDisplayFormat !== undefined ? { displayFormat: labelDisplayFormat } : {}),
  };
  return MarkNodeLabelSchema.parse({
    content,
    ...(labelPosition !== undefined ? { position: labelPosition } : {}),
    ...(labelDistance !== undefined ? { distance: labelDistance } : {}),
    ...(labelTextColor !== undefined ? { textColor: labelTextColor } : {}),
    ...(labelOpacity !== undefined ? { opacity: labelOpacity } : {}),
    ...(labelFont !== undefined ? { font: labelFont } : {}),
    ...(labelRotate !== undefined ? { rotate: labelRotate } : {}),
    ...(labelKeepUpright !== undefined ? { keepUpright: labelKeepUpright } : {}),
    ...(labelPin !== undefined && labelPin !== false ? { pin: labelPin } : {}),
  });
};

/** 收集某 mark 的运行时 resolveLabel（不进 IR）：仅在配了 mark id 时按 id 注册，否则无从命中（与 ADR-04 注入点一致） */
const recordResolveLabel = (
  into: Collected,
  id: string | undefined,
  resolveLabel: ((row: ExternalRow) => string) | undefined,
): void => {
  if (resolveLabel === undefined) return;
  if (id === undefined) {
    throw new Error('buildPlotSpec: resolveLabel needs a mark id to be injected at runtime; set the mark id prop');
  }
  into.resolveLabels[id] = resolveLabel;
};

/** 把 x/y 字段装成位置 encoding（x/y 是唯一位置通道；polar 下坐标系把 x→angle、y→radius 重解释） */
const canonicalGeometryLabel = (
  label: PathMarkProps['label'] | RelationMarkProps['label'],
): MarkGeometryLabelList =>
  MarkGeometryLabelListSchema.parse(label);

const canonicalReferenceLabel = (props: ReferenceMarkProps): MarkNodeLabelList | MarkGeometryLabelList => {
  const usesNodeHost =
    props.kind === 'region' || props.xTo !== undefined || props.yTo !== undefined || props.zTo !== undefined;
  return usesNodeHost ? MarkNodeLabelListSchema.parse(props.label) : MarkGeometryLabelListSchema.parse(props.label);
};

const canonicalRelationPath = (path: RelationMarkProps['path']): RelationPathGeometry =>
  RelationPathGeometrySchema.parse(path);

const positionEncoding = (x: string, y: string): Pick<Encoding, 'x' | 'y'> => ({
  x: { field: x },
  y: { field: y },
});

/** rule 扁平 prop → IR 位置通道：数字 → 常量 value、字符串 → 字段 field */
const ruleChannel = (value: number | string): { value: number } | { field: string } =>
  typeof value === 'number' ? { value } : { field: value };

/**
 * 把 <ReferenceMark> 扁平 props 装配进 reference IR（line / band / region / extent / color 校验 fail-loud）
 * @description 取向由给 x（竖直）还是 y（水平）决定，二选一（皆给 / 皆缺 → fail-loud）；
 *   band 上界 xTo 须配 x、yTo 须配 y（不匹配 / 单飞 → fail-loud）。kind="region" 时 x/y/xTo/yTo 必填；
 *   extent 须成对（单设 → fail-loud），且 region 不接收 extent。
 *   常量 rule（x/y 为数字）→ color 作 value 常量；per-datum rule（x/y 为字段串）→ color 作 field（AUTO_COLOR）。
 */
const collectReference = (props: ReferenceMarkProps, into: Collected, styleContext: StyleSugarContext): void => {
  const {
    kind,
    x,
    y,
    z,
    xTo,
    yTo,
    zTo,
    extentField,
    extentToField,
    color,
    label,
    id,
    coordinateView,
    transform,
    channels,
    strokeWidth,
    fillOpacity,
    opacity,
  } = props;
  const region = kind === 'region';
  const hasX = x !== undefined;
  const hasY = y !== undefined;
  const hasZ = z !== undefined;
  if (region) {
    if (!hasX || !hasY || xTo === undefined || yTo === undefined) {
      throw new Error(
        'buildPlotSpec: <ReferenceMark kind="region"> requires x, xTo, y, and yTo to define a bounded reference area',
      );
    }
    if (hasZ !== (zTo !== undefined)) {
      throw new Error(
        'buildPlotSpec: <ReferenceMark kind="region"> z and zTo must be set together for z-role reference areas',
      );
    }
    if (extentField !== undefined || extentToField !== undefined) {
      throw new Error(
        'buildPlotSpec: <ReferenceMark kind="region"> does not support extentField / extentToField; set x/xTo/y/yTo bounds directly',
      );
    }
  } else if (hasX === hasY) {
    throw new Error(
      'buildPlotSpec: <ReferenceMark> must bind exactly one of x (vertical) or y (horizontal); set one, not both / neither',
    );
  }
  if (!region && hasX && yTo !== undefined) {
    throw new Error(
      'buildPlotSpec: <ReferenceMark> binds x (vertical) but sets yTo; the band upper bound must match the bound dimension (use xTo)',
    );
  }
  if (!region && hasY && xTo !== undefined) {
    throw new Error(
      'buildPlotSpec: <ReferenceMark> binds y (horizontal) but sets xTo; the band upper bound must match the bound dimension (use yTo)',
    );
  }
  if (!region && (hasZ || zTo !== undefined)) {
    throw new Error('buildPlotSpec: <ReferenceMark> z / zTo are only valid with kind="region"');
  }
  if ((extentField === undefined) !== (extentToField === undefined)) {
    throw new Error(
      'buildPlotSpec: <ReferenceMark> extentField / extentToField must be set together (a partial-length span needs both start and end)',
    );
  }
  // 常量 rule（数字常量轴）→ color 作 value；per-datum（字段串）→ color 作 field（AUTO_COLOR）
  const constantRule = region
    ? typeof x === 'number' &&
      typeof y === 'number' &&
      typeof xTo === 'number' &&
      typeof yTo === 'number' &&
      (!hasZ || (typeof z === 'number' && typeof zTo === 'number'))
    : typeof (hasX ? x : y) === 'number';
  let colorEnc: { color: { value: string } | { field: string; scale: string } } | undefined;
  if (color !== undefined) {
    colorEnc = constantRule ? { color: { value: color } } : { color: { field: color, scale: AUTO_COLOR } };
  }
  const positional: Encoding = {};
  if (hasX) {
    positional.x = ruleChannel(x);
  }
  if (hasY) {
    positional.y = ruleChannel(y);
  }
  if (hasZ) {
    positional.z = ruleChannel(z);
  }
  const upper = {
    ...(xTo !== undefined ? { xTo } : {}),
    ...(yTo !== undefined ? { yTo } : {}),
    ...(zTo !== undefined ? { zTo } : {}),
  };
  const strokeWidthStyle = strokeWidthStyleOf(strokeWidth, styleContext);
  const fillOpacityStyle = numberStyleOf<PointOpacityStyle>(fillOpacity, 'fillOpacity', styleContext);
  const opacityStyle = numberStyleOf<PointOpacityStyle>(opacity, 'opacity', styleContext);
  const referenceNodeStyleProps = {
    align: props.align,
    lineHeight: props.lineHeight,
    maxTextWidth: props.maxTextWidth,
    cornerRadius: props.cornerRadius,
    xScale: props.xScale,
    yScale: props.yScale,
    innerXSep: props.innerXSep,
    innerYSep: props.innerYSep,
    outerSep: props.outerSep,
    margin: props.margin,
    dashed: props.dashed,
    dotted: props.dotted,
    font: props.font,
    boundary: props.boundary,
  };
  into.marks.push({
    type: PlotMark.Reference,
    ...(kind !== undefined ? { kind } : {}),
    ...(id !== undefined ? { id } : {}),
    ...(coordinateView !== undefined ? { coordinateView } : {}),
    ...(transform !== undefined ? { transform } : {}),
    ...upper,
    ...(extentField !== undefined ? { extentField } : {}),
    ...(extentToField !== undefined ? { extentToField } : {}),
    ...(strokeWidthStyle !== undefined ? { strokeWidth: strokeWidthStyle } : {}),
    ...(fillOpacityStyle !== undefined ? { fillOpacity: fillOpacityStyle } : {}),
    ...(opacityStyle !== undefined ? { opacity: opacityStyle } : {}),
    ...(label !== undefined ? { label: canonicalReferenceLabel(props) } : {}),
    ...nodeStylePropsOf(referenceNodeStyleProps, styleContext),
    ...pathStylePropsOf(props, styleContext),
    encoding: { ...positional, ...colorEnc, ...extensionChannelEncoding(channels) },
  });
  // 仅 per-datum color（field）需自动色 scale；常量 color value 直落 IR，不进色 scale
  if (colorEnc && 'field' in colorEnc.color) {
    into.colored = true;
    into.colorFields.push(colorEnc.color.field);
  }
};

/** 递归收集 mark / guide / transform：认 mark/guide 组件，穿透 Fragment，忽略其它节点 */
const facetDimensionOf = (
  dimension: string | NonNullable<FacetGridSpec['row']> | undefined,
): NonNullable<FacetGridSpec['row']> | undefined => {
  if (dimension === undefined) return undefined;
  return typeof dimension === 'string' ? { field: dimension } : dimension;
};

const scaffoldTracksOf = (
  scaffoldId: string,
  propTracks: Array<ScaffoldTrackSpec> | undefined,
  children: ReactNode,
): Array<ScaffoldTrackSpec> => {
  const tracks: Array<ScaffoldTrackSpec> = [...(propTracks ?? [])];
  const appendChildTracks = (node: ReactNode): void => Children.forEach(node, child => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      appendChildTracks((child.props as { children?: ReactNode }).children);
      return;
    }
    if (child.type === Track) {
      const props = child.props as ScaffoldTrackSpec & { children?: ReactNode };
      tracks.push({
        id: props.id,
        band: props.band,
        ...(props.view !== undefined ? { view: props.view } : {}),
        ...(props.coordinate !== undefined ? { coordinate: props.coordinate } : {}),
        ...(props.order !== undefined ? { order: props.order } : {}),
      });
    }
  });
  appendChildTracks(children);
  if (tracks.length === 0) {
    throw new Error(`buildPlotSpec: <Scaffold id="${scaffoldId}"> requires at least one track`);
  }
  return tracks;
};

const collectScaffoldChildren = (
  scaffoldId: string,
  children: ReactNode,
  into: Collected,
  styleContext: StyleSugarContext,
): void => {
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectScaffoldChildren(scaffoldId, (child.props as { children?: ReactNode }).children, into, styleContext);
      return;
    }
    if (child.type === Track) {
      const { id, children: trackChildren } = child.props as ScaffoldTrackSpec & { children?: ReactNode };
      collectInto(trackChildren, into, styleContext, { trackId: id });
      return;
    }
    collectInto(child, into, styleContext, { scaffoldId });
  });
};

const collectInto = (
  children: ReactNode,
  into: Collected,
  styleContext: StyleSugarContext,
  context: CollectionContext = {},
): void => {
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectInto((child.props as { children?: ReactNode }).children, into, styleContext, context);
      return;
    }
    if (child.type === Facet) {
      const {
        id,
        row,
        column,
        empty,
        coordinate,
        view,
        viewIdTemplate,
        header,
        spacing,
        resolve,
        children: facetChildren,
      } =
        child.props as {
          id: string;
          row?: string | NonNullable<FacetGridSpec['row']>;
          column?: string | NonNullable<FacetGridSpec['column']>;
          empty?: FacetGridSpec['empty'];
          coordinate?: FacetGridSpec['coordinate'];
          view?: string;
          viewIdTemplate?: string;
          header?: FacetGridSpec['header'];
          spacing?: CompositionSpec['spacing'];
          resolve?: CompositionSpec['resolve'];
          children?: ReactNode;
        };
      into.facets.push({
        kind: 'facet',
        id,
        view: view ?? `${id}Panel`,
        ...(facetDimensionOf(row) !== undefined ? { row: facetDimensionOf(row) } : {}),
        ...(facetDimensionOf(column) !== undefined ? { column: facetDimensionOf(column) } : {}),
        ...(empty !== undefined ? { empty } : {}),
        ...(coordinate !== undefined ? { coordinate } : {}),
        ...(viewIdTemplate !== undefined ? { viewIdTemplate } : {}),
        ...(header !== undefined ? { header } : {}),
        ...(spacing !== undefined ? { spacing } : {}),
        ...(resolve !== undefined ? { resolve } : {}),
      });
      collectInto(facetChildren, into, styleContext, { facetId: id });
      return;
    }
    if (child.type === Scaffold) {
      const { id, coordinate, sharedRoles, frame, tracks, spacing, resolve, children: scaffoldChildren } =
        child.props as {
          id: string;
          coordinate?: SharedScaffoldSpec['coordinate'];
          sharedRoles: SharedScaffoldSpec['sharedRoles'];
          frame?: SharedScaffoldSpec['frame'];
          tracks?: Array<ScaffoldTrackSpec>;
          spacing?: CompositionSpec['spacing'];
          resolve?: CompositionSpec['resolve'];
          children?: ReactNode;
        };
      into.scaffolds.push({
        kind: 'tracks',
        id,
        sharedRoles,
        tracks: scaffoldTracksOf(id, tracks, scaffoldChildren),
        ...(coordinate !== undefined ? { coordinate } : {}),
        ...(frame !== undefined ? { frame } : {}),
        ...(spacing !== undefined ? { spacing } : {}),
        ...(resolve !== undefined ? { resolve } : {}),
      });
      collectScaffoldChildren(id, scaffoldChildren, into, styleContext);
      return;
    }
    if (child.type === Track) {
      throw new Error('buildPlotSpec: <Track> must be declared inside <Scaffold>');
    }
    if (child.type === PathMark) {
      const props = child.props as PathMarkProps;
      const {
        x,
        y,
        order,
        series,
        color,
        label,
        closed,
        connectNulls,
        closure,
        curve,
        id,
        coordinateView,
        xAxisId,
        yAxisId,
        facetId,
        trackId,
        transform,
        anchorId,
        channels,
        strokeWidth,
        opacity,
        lineCap,
        lineJoin,
        roundedCorners,
      } = props;
      const colorEnc = colorChannel(color, series);
      const strokeWidthStyle = strokeWidthStyleOf(strokeWidth, styleContext);
      const opacityStyle = numberStyleOf<PointOpacityStyle>(opacity, 'opacity', styleContext);
      const lineCapStyle = enumStyleOf(lineCap, 'lineCap', new Set(['butt', 'round', 'square']), styleContext);
      const lineJoinStyle = enumStyleOf(lineJoin, 'lineJoin', new Set(['miter', 'round', 'bevel']), styleContext);
      const roundedCornersStyle = numberStyleOf<PointNonnegativeNumberStyle>(
        roundedCorners,
        'roundedCorners',
        styleContext,
      );
      const effectiveFacetId = facetId ?? context.facetId;
      const effectiveTrackId = trackId ?? context.trackId;
      into.marks.push({
        type: PlotMark.Path,
        ...(id !== undefined ? { id } : {}),
        ...(coordinateView !== undefined ? { coordinateView } : {}),
        ...(xAxisId !== undefined ? { xAxisId } : {}),
        ...(yAxisId !== undefined ? { yAxisId } : {}),
        ...(effectiveFacetId !== undefined ? { facetId: effectiveFacetId } : {}),
        ...(effectiveTrackId !== undefined ? { trackId: effectiveTrackId } : {}),
        ...(transform !== undefined ? { transform } : {}),
        ...(anchorId !== undefined ? { anchorId } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(series !== undefined ? { series } : {}),
        ...(closed !== undefined ? { closed } : {}),
        ...(connectNulls !== undefined ? { connectNulls } : {}),
        ...(closure !== undefined ? { closure } : {}),
        ...(curve !== undefined ? { curve } : {}),
        ...(strokeWidthStyle !== undefined ? { strokeWidth: strokeWidthStyle } : {}),
        ...(opacityStyle !== undefined ? { opacity: opacityStyle } : {}),
        ...(lineCapStyle !== undefined ? { lineCap: lineCapStyle } : {}),
        ...(lineJoinStyle !== undefined ? { lineJoin: lineJoinStyle } : {}),
        ...(roundedCornersStyle !== undefined ? { roundedCorners: roundedCornersStyle } : {}),
        ...pathStylePropsOf(props, styleContext),
        ...(label !== undefined ? { label: canonicalGeometryLabel(label) } : {}),
        encoding: { ...positionEncoding(x, y), ...colorEnc, ...extensionChannelEncoding(channels) },
      });
      recordColor(into, colorEnc);
      recordResolveLabel(into, id, props.resolveLabel);
      if (closed || closure !== undefined) into.hasClosedLine = true;
    } else if (child.type === PointMark) {
      const props = child.props as PointMarkProps;
      const {
        x,
        y,
        z,
        color,
        textColor,
        fill,
        stroke,
        strokeWidth,
        fillOpacity,
        drawOpacity,
        rotate,
        padding,
        minimumSize,
        minimumWidth,
        minimumHeight,
        zIndex,
        size,
        opacity,
        shape,
        text,
        displayFormat,
        dx,
        dy,
        id,
        coordinateView,
        xAxisId,
        yAxisId,
        facetId,
        trackId,
        transform,
        anchorId,
        channels,
      } = props;
      const markLabel = buildMarkLabel(props);
      const colorStyle = pointColorStyleOf(color, styleContext);
      const textColorStyle = pointColorStyleOf(textColor, styleContext);
      const sizeStyle = numberStyleOf<PointSizeStyle>(size, 'size', styleContext);
      const shapeStyle = shapeStyleOf(shape, styleContext);
      const fillStyle = paintStyleOf<PointFillStyle>(fill, 'fill', styleContext);
      const strokeStyle = strokeStyleOf(stroke, styleContext);
      const strokeWidthStyle = strokeWidthStyleOf(strokeWidth, styleContext);
      const fillOpacityStyle = numberStyleOf<PointOpacityStyle>(fillOpacity, 'fillOpacity', styleContext);
      const drawOpacityStyle = numberStyleOf<PointOpacityStyle>(drawOpacity, 'drawOpacity', styleContext);
      const opacityStyle = numberStyleOf<PointOpacityStyle>(opacity, 'opacity', styleContext);
      const rotateStyle = numberStyleOf<PointNumberStyle>(rotate, 'rotate', styleContext);
      const paddingStyle = numberStyleOf<PointNonnegativeNumberStyle>(padding, 'padding', styleContext);
      const minimumSizeStyle = numberStyleOf<PointNonnegativeNumberStyle>(minimumSize, 'minimumSize', styleContext);
      const minimumWidthStyle = numberStyleOf<PointNonnegativeNumberStyle>(minimumWidth, 'minimumWidth', styleContext);
      const minimumHeightStyle = numberStyleOf<PointNonnegativeNumberStyle>(
        minimumHeight,
        'minimumHeight',
        styleContext,
      );
      const zIndexStyle = numberStyleOf<PointZIndexStyle>(zIndex, 'zIndex', styleContext);
      // text 设 → point 下沉为无边框文本 Node（内容走 encoding.text）；否则散点 glyph。位置通道按坐标系角色（x / x/y / x/y/z）
      const textEnc: { text: TextChannel } | undefined =
        text !== undefined
          ? { text: { field: text, ...(displayFormat !== undefined ? { displayFormat } : {}) } }
          : undefined;
      const effectiveFacetId = facetId ?? context.facetId;
      const effectiveTrackId = trackId ?? context.trackId;
      into.marks.push({
        type: PlotMark.Point,
        ...(id !== undefined ? { id } : {}),
        ...(coordinateView !== undefined ? { coordinateView } : {}),
        ...(xAxisId !== undefined ? { xAxisId } : {}),
        ...(yAxisId !== undefined ? { yAxisId } : {}),
        ...(effectiveFacetId !== undefined ? { facetId: effectiveFacetId } : {}),
        ...(effectiveTrackId !== undefined ? { trackId: effectiveTrackId } : {}),
        ...(transform !== undefined ? { transform } : {}),
        ...(anchorId !== undefined ? { anchorId } : {}),
        ...(colorStyle !== undefined ? { color: colorStyle } : {}),
        ...(textColorStyle !== undefined ? { textColor: textColorStyle } : {}),
        ...(sizeStyle !== undefined ? { size: sizeStyle } : {}),
        ...(shapeStyle !== undefined ? { shape: shapeStyle } : {}),
        ...(fillStyle !== undefined ? { fill: fillStyle } : {}),
        ...(strokeStyle !== undefined ? { stroke: strokeStyle } : {}),
        ...(strokeWidthStyle !== undefined ? { strokeWidth: strokeWidthStyle } : {}),
        ...(fillOpacityStyle !== undefined ? { fillOpacity: fillOpacityStyle } : {}),
        ...(drawOpacityStyle !== undefined ? { drawOpacity: drawOpacityStyle } : {}),
        ...(opacityStyle !== undefined ? { opacity: opacityStyle } : {}),
        ...(rotateStyle !== undefined ? { rotate: rotateStyle } : {}),
        ...(paddingStyle !== undefined ? { padding: paddingStyle } : {}),
        ...(minimumSizeStyle !== undefined ? { minimumSize: minimumSizeStyle } : {}),
        ...(minimumWidthStyle !== undefined ? { minimumWidth: minimumWidthStyle } : {}),
        ...(minimumHeightStyle !== undefined ? { minimumHeight: minimumHeightStyle } : {}),
        ...(zIndexStyle !== undefined ? { zIndex: zIndexStyle } : {}),
        ...nodeStylePropsOf(props, styleContext),
        ...(dx !== undefined ? { dx } : {}),
        ...(dy !== undefined ? { dy } : {}),
        ...(markLabel !== undefined ? { label: markLabel } : {}),
        encoding: {
          ...(x !== undefined ? { x: { field: x } } : {}),
          ...(y !== undefined ? { y: { field: y } } : {}),
          ...(z !== undefined ? { z: { field: z } } : {}),
          ...textEnc,
          ...extensionChannelEncoding(channels),
        },
      });
      recordMarkColor(into, colorStyle);
      recordResolveLabel(into, id, props.resolveLabel);
    } else if (child.type === IntervalMark) {
      const props = child.props as IntervalMarkProps;
      const {
        x,
        y,
        angle,
        x0,
        x1,
        width,
        direction: rawDirection,
        color,
        series,
        group,
        arrangement: explicitArrangement,
        stackOffset,
        percent,
        stack,
        bounds: explicitBounds,
        id,
        coordinateView,
        xAxisId,
        yAxisId,
        facetId,
        trackId,
        transform,
        anchorId,
        channels,
        fill,
        stroke,
        strokeWidth,
        fillOpacity,
        opacity,
        padAngle,
        pull,
      } = props;
      const direction = rawDirection ?? 'vertical';
      const arrangementGroup = group ?? series;
      if (percent === true && explicitArrangement !== undefined && explicitArrangement !== 'normalize-stack') {
        throw new Error(
          'buildPlotSpec: <IntervalMark percent> cannot be mixed with an arrangement other than "normalize-stack"',
        );
      }
      if (stackOffset !== undefined && explicitArrangement === 'normalize-stack') {
        throw new Error(
          'buildPlotSpec: <IntervalMark stackOffset> cannot be mixed with arrangement="normalize-stack"; use percent for percentage stacks',
        );
      }
      const arrangement =
        explicitArrangement ??
        (percent === true ? 'normalize-stack' : stack ? 'stack' : arrangementGroup !== undefined ? 'dodge' : undefined);
      const markLabel = buildMarkLabel(props);
      const fillStyle = paintStyleOf<PointFillStyle>(fill, 'fill', styleContext);
      const strokeStyle = strokeStyleOf(stroke, styleContext);
      const strokeWidthStyle = strokeWidthStyleOf(strokeWidth, styleContext);
      const fillOpacityStyle = numberStyleOf<PointOpacityStyle>(fillOpacity, 'fillOpacity', styleContext);
      const opacityStyle = numberStyleOf<PointOpacityStyle>(opacity, 'opacity', styleContext);
      const pullStyle = intervalPullStyleOf(pull);
      const effectiveFacetId = facetId ?? context.facetId;
      const effectiveTrackId = trackId ?? context.trackId;
      const intervalStyle = {
        ...(fillStyle !== undefined ? { fill: fillStyle } : {}),
        ...(strokeStyle !== undefined ? { stroke: strokeStyle } : {}),
        ...(strokeWidthStyle !== undefined ? { strokeWidth: strokeWidthStyle } : {}),
        ...(fillOpacityStyle !== undefined ? { fillOpacity: fillOpacityStyle } : {}),
        ...(opacityStyle !== undefined ? { opacity: opacityStyle } : {}),
        ...(padAngle !== undefined ? { padAngle } : {}),
        ...(pullStyle !== undefined ? { pull: pullStyle } : {}),
        ...nodeStylePropsOf(props, styleContext),
      };
      // pie / donut：angle → 自动累积 stack transform（产 y0/y1）+ extent×full bounds
      if (angle !== undefined) {
        if (
          y !== undefined ||
          x !== undefined ||
          x0 !== undefined ||
          x1 !== undefined ||
          width !== undefined ||
          rawDirection !== undefined ||
          stack !== undefined ||
          explicitBounds !== undefined
        ) {
          throw new Error(
            'buildPlotSpec: <IntervalMark angle> is the polar pie/donut form; do not mix it with x/y/x0/x1/width/direction/stack/bounds',
          );
        }
        into.shortcutTransforms.push({
          kind: PlotTransform.Stack,
          y: angle,
          ...(series !== undefined ? { groupBy: series } : {}),
        });
        const colorEnc = colorChannel(color, series ?? group) ?? colorChannel(angle, undefined);
        into.marks.push({
          type: PlotMark.Interval,
          ...(id !== undefined ? { id } : {}),
          ...(coordinateView !== undefined ? { coordinateView } : {}),
          ...(xAxisId !== undefined ? { xAxisId } : {}),
          ...(yAxisId !== undefined ? { yAxisId } : {}),
          ...(effectiveFacetId !== undefined ? { facetId: effectiveFacetId } : {}),
          ...(effectiveTrackId !== undefined ? { trackId: effectiveTrackId } : {}),
          ...(transform !== undefined ? { transform } : {}),
          ...(anchorId !== undefined ? { anchorId } : {}),
          ...intervalStyle,
          bounds: { x: { kind: IntervalBoundKind.Extent, from: 'y0', to: 'y1' }, y: { kind: IntervalBoundKind.Full } },
          encoding: { ...colorEnc, ...extensionChannelEncoding(channels) },
        });
        into.hasSector = true;
        recordColor(into, colorEnc);
        return;
      }
      // 显式 bounds（heatmap 双 band / 高级）：直接落 IR；band bound → 强制对应轴 band scale
      if (explicitBounds !== undefined) {
        if (rawDirection !== undefined) {
          throw new Error(
            'buildPlotSpec: <IntervalMark direction> cannot be mixed with explicit bounds; encode the orientation through bounds directly',
          );
        }
        if (width !== undefined) {
          throw new Error(
            'buildPlotSpec: <IntervalMark width> cannot be mixed with explicit bounds; use bounds.<role>={kind:"proportional"} directly',
          );
        }
        const colorEnc = colorChannel(color, series ?? group);
        into.marks.push({
          type: PlotMark.Interval,
          ...(id !== undefined ? { id } : {}),
          ...(coordinateView !== undefined ? { coordinateView } : {}),
          ...(xAxisId !== undefined ? { xAxisId } : {}),
          ...(yAxisId !== undefined ? { yAxisId } : {}),
          ...(effectiveFacetId !== undefined ? { facetId: effectiveFacetId } : {}),
          ...(effectiveTrackId !== undefined ? { trackId: effectiveTrackId } : {}),
          ...(transform !== undefined ? { transform } : {}),
          ...(anchorId !== undefined ? { anchorId } : {}),
          ...(series !== undefined ? { series } : {}),
          ...intervalStyle,
          bounds: explicitBounds,
          ...(markLabel !== undefined ? { label: markLabel } : {}),
          encoding: {
            ...(x !== undefined ? { x: { field: x } } : {}),
            ...(y !== undefined ? { y: { field: y } } : {}),
            ...colorEnc,
            ...extensionChannelEncoding(channels),
          },
        });
        if (explicitBounds.x?.kind === IntervalBoundKind.Band) into.hasBar = true;
        if (explicitBounds.y?.kind === IntervalBoundKind.Band) into.hasRect = true;
        recordColor(into, colorEnc);
        recordResolveLabel(into, id, props.resolveLabel);
        return;
      }
      // histogram：x0/x1 → bounds.x = extent（连续 x，不强制 band）；普通 / 分组 / 堆叠柱：band x
      const histogram = x0 !== undefined && x1 !== undefined;
      const proportional = width !== undefined;
      if (proportional && histogram) {
        throw new Error('buildPlotSpec: <IntervalMark width> cannot be mixed with x0/x1 histogram bounds');
      }
      if (proportional && arrangement !== undefined) {
        throw new Error(
          'buildPlotSpec: <IntervalMark width> cannot be mixed with arrangement/stack/percent/group/series; use precomputed extent bounds for custom layouts',
        );
      }
      if (proportional && stackOffset !== undefined) {
        throw new Error(
          'buildPlotSpec: <IntervalMark width> cannot be mixed with stackOffset; use precomputed extent bounds for custom layouts',
        );
      }
      if (proportional && (group !== undefined || series !== undefined)) {
        throw new Error(
          'buildPlotSpec: <IntervalMark width> cannot be mixed with group or series; use color for visual grouping',
        );
      }
      if (histogram && direction === 'horizontal') {
        throw new Error(
          'buildPlotSpec: <IntervalMark direction="horizontal"> cannot be mixed with x0/x1 histogram bounds',
        );
      }
      if (histogram && arrangement !== undefined) {
        throw new Error('buildPlotSpec: <IntervalMark arrangement> cannot be mixed with x0/x1 histogram bounds');
      }
      if ((x0 === undefined) !== (x1 === undefined)) {
        throw new Error('buildPlotSpec: <IntervalMark> x0 / x1 must be set together for continuous-interval bars');
      }
      if (!histogram && !proportional && x === undefined) {
        throw new Error(
          'buildPlotSpec: <IntervalMark> requires x for categorical bars, x0/x1 for histogram, width for proportional bars, or angle for the polar pie/donut form',
        );
      }
      const valueField = direction === 'horizontal' ? x : y;
      if (valueField === undefined) {
        throw new Error(
          'buildPlotSpec: <IntervalMark> requires the value field on y (vertical) or x (horizontal), or use angle for the polar pie/donut form',
        );
      }
      const colorEnc = colorChannel(color, series ?? group);
      const categoryField = direction === 'horizontal' ? y : x;
      if (!histogram && !proportional && categoryField === undefined) {
        throw new Error(
          'buildPlotSpec: <IntervalMark> requires the category field on x (vertical) or y (horizontal), x0/x1 for histogram, width for proportional bars, or angle for the polar pie/donut form',
        );
      }
      const bandRole = direction === 'horizontal' ? 'y' : 'x';
      const valueRole = direction === 'horizontal' ? 'x' : 'y';
      const bandBound = {
        kind: IntervalBoundKind.Band,
        ...(arrangement === 'dodge' && arrangementGroup !== undefined ? { group: arrangementGroup } : {}),
      };
      if ((arrangement === 'stack' || arrangement === 'normalize-stack') && arrangementGroup === undefined) {
        throw new Error(
          'buildPlotSpec: <IntervalMark arrangement="stack"> requires group or series to identify stacked segments',
        );
      }
      if (arrangement === 'normalize-stack') {
        into.shortcutTransforms.push({
          kind: PlotTransform.Normalize,
          field: valueField,
          groupBy: [categoryField],
          basis: 'percent',
        });
      }
      if ((arrangement === 'stack' || arrangement === 'normalize-stack') && arrangementGroup !== undefined) {
        into.shortcutTransforms.push({
          kind: PlotTransform.Stack,
          x: categoryField,
          y: valueField,
          groupBy: arrangementGroup,
          ...(arrangement === 'stack' && stackOffset !== undefined ? { offset: stackOffset } : {}),
        });
      }
      // arrangement → bounds：dodge 切 band 子带；stack / normalize-stack 读 y0/y1 extent。
      let bounds: IntervalBounds | undefined;
      if (proportional) {
        bounds = { [bandRole]: { kind: IntervalBoundKind.Proportional, field: width } };
      } else if (!histogram && (direction === 'horizontal' || arrangement === 'dodge')) {
        bounds = { [bandRole]: bandBound };
      }
      if (arrangement === 'stack' || arrangement === 'normalize-stack') {
        bounds = { ...(bounds ?? {}), [valueRole]: { kind: IntervalBoundKind.Extent, from: 'y0', to: 'y1' } };
      } else if (direction === 'horizontal') {
        bounds = { ...(bounds ?? {}), x: { kind: IntervalBoundKind.Span } };
      }
      if (histogram) bounds = { ...(bounds ?? {}), x: { kind: IntervalBoundKind.Extent, from: x0, to: x1 } };
      into.marks.push({
        type: PlotMark.Interval,
        ...(id !== undefined ? { id } : {}),
        ...(coordinateView !== undefined ? { coordinateView } : {}),
        ...(xAxisId !== undefined ? { xAxisId } : {}),
        ...(yAxisId !== undefined ? { yAxisId } : {}),
        ...(effectiveFacetId !== undefined ? { facetId: effectiveFacetId } : {}),
        ...(effectiveTrackId !== undefined ? { trackId: effectiveTrackId } : {}),
        ...(transform !== undefined ? { transform } : {}),
        ...(anchorId !== undefined ? { anchorId } : {}),
        ...(series !== undefined ? { series } : {}),
        ...intervalStyle,
        ...(bounds !== undefined ? { bounds } : {}),
        ...(markLabel !== undefined ? { label: markLabel } : {}),
        // histogram：仅 y（高度），x 来自 x0/x1 区间；普通柱：x（分类 band）+ y（值）
        encoding: histogram
          ? { y: { field: y }, ...colorEnc, ...extensionChannelEncoding(channels) }
          : proportional
            ? {
                ...(x !== undefined ? { x: { field: x } } : {}),
                ...(y !== undefined ? { y: { field: y } } : {}),
                ...colorEnc,
                ...extensionChannelEncoding(channels),
              }
            : { x: { field: x }, y: { field: y }, ...colorEnc, ...extensionChannelEncoding(channels) },
      });
      if (!histogram && !proportional) {
        if (bandRole === 'x') into.hasBar = true;
        else into.hasRect = true;
      }
      if (direction === 'horizontal') into.hasHorizontalBar = true;
      recordColor(into, colorEnc);
      recordResolveLabel(into, id, props.resolveLabel);
    } else if (child.type === ReferenceMark) {
      collectReference(child.props as ReferenceMarkProps, into, styleContext);
    } else if (child.type === RelationMark) {
      const { id, kind, coordinateView, transform, source, target, label, style, path, ribbon, color, channels } =
        child.props as RelationMarkProps;
      const colorEnc = colorChannel(color, undefined);
      const encoding = { ...colorEnc, ...extensionChannelEncoding(channels) };
      into.marks.push({
        type: PlotMark.Relation,
        ...(id !== undefined ? { id } : {}),
        ...(kind !== undefined ? { kind } : {}),
        ...(coordinateView !== undefined ? { coordinateView } : {}),
        ...(transform !== undefined ? { transform } : {}),
        source,
        target,
        ...(label !== undefined ? { label: canonicalGeometryLabel(label) } : {}),
        ...(style !== undefined ? { style } : {}),
        ...(path !== undefined ? { path: canonicalRelationPath(path) } : {}),
        ...(ribbon !== undefined ? { ribbon } : {}),
        ...(Object.keys(encoding).length > 0 ? { encoding } : {}),
      });
      recordColor(into, colorEnc);
    } else if (child.type === Axis) {
      const { dimension, scale, line, ticks, tickLabels, grid, coordinateView, facetId, scaffoldId, trackId, placement, title, id } =
        child.props as AxisProps;
      if (scale !== undefined) {
        into.scales.push({ dimension, type: scale });
      }
      const effectiveFacetId = facetId ?? context.facetId;
      const effectiveScaffoldId = scaffoldId ?? context.scaffoldId;
      const effectiveTrackId = trackId ?? context.trackId;
      into.guides.push({
        type: PlotGuide.Axis,
        dimension,
        ...(id !== undefined ? { id } : {}),
        ...(coordinateView !== undefined ? { coordinateView } : {}),
        ...(effectiveFacetId !== undefined ? { facetId: effectiveFacetId } : {}),
        ...(effectiveScaffoldId !== undefined ? { scaffoldId: effectiveScaffoldId } : {}),
        ...(effectiveTrackId !== undefined ? { trackId: effectiveTrackId } : {}),
        ...(placement !== undefined ? { placement } : {}),
        ...(line !== undefined ? { line } : {}),
        ...(ticks !== undefined ? { ticks } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(tickLabels !== undefined ? { tickLabels } : {}),
        ...(grid !== undefined ? { grid } : {}),
      });
    } else if (child.type === Legend) {
      const { channel, scale, title, position, orient, ticks, tickLabels, style } = child.props as LegendProps;
      into.guides.push({
        type: PlotGuide.Legend,
        channel,
        ...(scale !== undefined ? { scale } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(position !== undefined ? { position } : {}),
        ...(orient !== undefined ? { orient } : {}),
        ...(ticks !== undefined ? { ticks } : {}),
        ...(tickLabels !== undefined ? { tickLabels } : {}),
        ...(style !== undefined ? { style } : {}),
      });
    } else if (child.type === Scale) {
      into.scales.push(child.props as ScaleProps);
    } else if (child.type === TransformComponent) {
      // 通用 <Transform kind="..."> 声明：props 即 IR transform operation（按声明序进 spec.transform）
      into.transforms.push(child.props as TransformProps);
    }
  });
};

/**
 * 自动 color scale：按 color 字段类型派生（仅 model 已知时）——continuous / temporal → sequential、
 * categorical / 未知 → ordinal（向后兼容存量分类用例）。
 * @description 无 model 时一律 ordinal（运行时按推断当分类调色；连续字段会在 lowering fail-loud，提示声明 model 或显式色阶）。
 *   显式 scheme / diverging / midpoint 经 vanilla IR 全量可用，React 自动表面仅派生默认 sequential。
 */
const buildColorScale = (
  colorFields: Array<string>,
  model: DataModel | undefined,
  colors: Array<string> | undefined,
): PlotScaleSpec => {
  if (model !== undefined) {
    const typeByField = new Map(model.map(field => [field.name, field.type] as const));
    const anyContinuous = colorFields.some(field => {
      const type = typeByField.get(field);
      return type === PlotFieldType.Continuous || type === PlotFieldType.Temporal;
    });
    if (anyContinuous) return { type: PlotScale.Sequential, name: AUTO_COLOR };
  }
  return { type: PlotScale.Ordinal, name: AUTO_COLOR, ...(colors !== undefined ? { range: colors } : {}) };
};

type ContinuousScaleProps = Extract<ScaleProps, { type: Exclude<PositionScaleType, 'point'> }>;
type PositionScaleOptions = Pick<ContinuousScaleProps, 'domain' | 'domainPadding' | 'singleValueSpan'>;

const isContinuousScaleProps = (options: ScaleProps | undefined): options is ContinuousScaleProps =>
  options !== undefined && options.type !== 'point';

const continuousPositionScaleOptions = (options: PositionScaleOptions | undefined): PositionScaleOptions => ({
  ...(options?.domain !== undefined ? { domain: options.domain } : {}),
  ...(options?.domainPadding !== undefined ? { domainPadding: options.domainPadding } : {}),
  ...(options?.singleValueSpan !== undefined ? { singleValueSpan: options.singleValueSpan } : {}),
});

const buildPositionScale = (
  name: string,
  type: PositionScaleType,
  options?: ScaleProps,
): PlotScaleSpec => {
  const scaleOptions = continuousPositionScaleOptions(isContinuousScaleProps(options) ? options : undefined);
  switch (type) {
    case 'linear':
      return { type: PlotScale.Linear, name, ...scaleOptions };
    case 'time':
      return { type: PlotScale.Time, name, ...scaleOptions };
    case 'point':
      return { type: PlotScale.Point, name };
    case 'log':
      return { type: PlotScale.Log, name, ...scaleOptions };
    case 'sqrt':
      return { type: PlotScale.Sqrt, name, ...scaleOptions };
    case 'symlog':
      return { type: PlotScale.Symlog, name, ...scaleOptions };
    case 'radial':
      return { type: PlotScale.Radial, name, ...scaleOptions };
    default: {
      // 穷尽守卫：新增 PositionScaleType 未在此映射时 never 编译报错，杜绝静默回退 linear
      const exhaustive: never = type;
      throw new Error(`buildPlotSpec: unsupported position scale type "${String(exhaustive)}"`);
    }
  }
};

/** cartesian x scale 类型：含 <IntervalMark> 或 <IntervalMark> → band；否则按 <Scale dimension="x"> 或缺省 linear */
const buildCartesianXScale = (forceBand: boolean, explicit: ScaleProps | undefined): PlotScaleSpec => {
  if (forceBand && explicit !== undefined) {
    throw new Error(
      'buildPlotSpec: <IntervalMark> (bar / heatmap) requires a band x scale; omit <Scale dimension="x" /> for automatic band inference',
    );
  }
  if (forceBand) return { type: PlotScale.Band, name: AUTO_X };
  return buildPositionScale(AUTO_X, explicit?.type ?? 'linear', explicit);
};

/** cartesian y（值轴）scale 类型：含 <IntervalMark>（heatmap 双 band）→ band；否则按 <Scale dimension="y"> 或缺省 linear；log / sqrt 由 lowering L1 守住仅 point/line */
const buildCartesianYScale = (hasRect: boolean, explicit: ScaleProps | undefined): PlotScaleSpec => {
  if (hasRect && explicit !== undefined) {
    throw new Error(
      'buildPlotSpec: <IntervalMark> (heatmap) requires a band y scale; omit <Scale dimension="y" /> for automatic band inference',
    );
  }
  if (hasRect) return { type: PlotScale.Band, name: AUTO_Y };
  return buildPositionScale(AUTO_Y, explicit?.type ?? 'linear', explicit);
};

/**
 * polar 角向 scale 类型推断：IntervalMark angle → linear（连续累积角界）；IntervalMark x/y → band（径向柱分类）；
 *   闭合 line（雷达）→ point（类别落等距点）；否则 linear（极坐标折线）
 */
const buildAngleScale = (collected: Collected, explicit: ScaleProps | undefined): PlotScaleSpec => {
  if (collected.hasBar && explicit !== undefined) {
    throw new Error(
      'buildPlotSpec: <IntervalMark> in polar coordinates requires a band angle scale; omit <Scale dimension="angle" /> for automatic band inference',
    );
  }
  if (collected.hasSector && explicit !== undefined && explicit.type !== 'linear') {
    throw new Error(
      'buildPlotSpec: <IntervalMark angle> requires a linear angle scale; omit <Scale dimension="angle" /> or use type="linear"',
    );
  }
  if (explicit !== undefined) return buildPositionScale(AUTO_ANGLE, explicit.type, explicit);
  if (collected.hasSector) return { type: PlotScale.Linear, name: AUTO_ANGLE };
  if (collected.hasBar) return { type: PlotScale.Band, name: AUTO_ANGLE };
  if (collected.hasClosedLine) return { type: PlotScale.Point, name: AUTO_ANGLE };
  return { type: PlotScale.Linear, name: AUTO_ANGLE };
};

type ScaleRole = 'x' | 'y' | 'angle' | 'radius';

type ExplicitScaleMap = Partial<Record<ScaleRole, ScaleProps>>;

const validScaleDimensionsOf = (coordKind: ReturnType<typeof coordinateTypeOf>): ReadonlyArray<ScaleDimension> => {
  if (coordKind === 'cartesian2D') return ['x', 'y'];
  if (coordKind === 'polar2D') return ['x', 'y'];
  if (coordKind === 'cartesian1D') return ['x'];
  if (coordKind === 'polar1D') return ['x'];
  return [];
};

const scaleRoleOf = (
  dimension: ScaleDimension,
  coordKind: ReturnType<typeof coordinateTypeOf>,
): ScaleRole | undefined => {
  if (coordKind === 'cartesian2D') return dimension === 'x' || dimension === 'y' ? dimension : undefined;
  if (coordKind === 'polar2D') {
    if (dimension === 'x') return 'angle';
    if (dimension === 'y') return 'radius';
    return undefined;
  }
  if (coordKind === 'cartesian1D') return dimension === 'x' ? 'x' : undefined;
  if (coordKind === 'polar1D') return dimension === 'x' ? 'angle' : undefined;
  return undefined;
};

const collectExplicitScales = (
  declared: Array<ScaleProps>,
  coordKind: ReturnType<typeof coordinateTypeOf>,
): ExplicitScaleMap => {
  const out: ExplicitScaleMap = {};
  const valid = validScaleDimensionsOf(coordKind);
  for (const scale of declared) {
    const role = scaleRoleOf(scale.dimension, coordKind);
    if (role === undefined) {
      throw new Error(
        `buildPlotSpec: ${coordKind} coordinate system does not support scale dimension "${scale.dimension}" (valid dimensions: ${valid.join(', ') || 'none'})`,
      );
    }
    if (out[role] !== undefined) {
      throw new Error(`buildPlotSpec: duplicate scale for "${role}" role (dimension "${scale.dimension}")`);
    }
    out[role] = scale;
  }
  return out;
};

const buildShortcutTransforms = (
  marks: ReadonlyArray<Mark>,
  definitions: ReadonlyArray<MarkTransformShortcutDefinition> | undefined,
): Array<TransformOperation> => {
  if (definitions === undefined || definitions.length === 0) return [];
  return marks.flatMap((mark, markIndex) =>
    definitions
      .filter(definition => definition.markType === mark.type)
      .flatMap(definition => definition.build({ mark, markIndex, marks }) ?? []),
  );
};

/** polar coordinate IR 的角向区间 / 内半径默认值（与 Polar2DSchema 的 .default() 一致，buildPlotSpec 即填满，等价手写无需再补） */
const POLAR_DEFAULT_START_ANGLE = 0;
const POLAR_DEFAULT_END_ANGLE = 360;
const POLAR_DEFAULT_INNER_RADIUS = 0;

/** coordinate 入口判别串（缺省 cartesian2D）；字符串简写与对象 .type 统一取值 */
const BUILTIN_COORDINATE_INPUT_TYPES = new Set(['cartesian2D', 'polar2D', 'cartesian1D', 'polar1D', 'ternary2D']);

const coordinateTypeOf = (
  input: CoordinateInput | undefined,
): 'cartesian2D' | 'polar2D' | 'cartesian1D' | 'polar1D' | 'ternary2D' | 'custom' => {
  if (input === undefined) return 'cartesian2D';
  const type = typeof input === 'string' ? input : input.type;
  return BUILTIN_COORDINATE_INPUT_TYPES.has(type)
    ? (type as 'cartesian2D' | 'polar2D' | 'cartesian1D' | 'polar1D' | 'ternary2D')
    : 'custom';
};

/** 归一化 polar2D coordinate 选项为配置（非 polar2D 返回 undefined），缺省字段填 schema 默认值 */
type PolarConfig = { innerRadius: number; startAngle: number; endAngle: number };
const toPolarConfig = (coordinate: CoordinateInput | undefined): PolarConfig | undefined => {
  if (coordinate === 'polar2D') {
    return {
      innerRadius: POLAR_DEFAULT_INNER_RADIUS,
      startAngle: POLAR_DEFAULT_START_ANGLE,
      endAngle: POLAR_DEFAULT_END_ANGLE,
    };
  }
  if (typeof coordinate === 'object' && coordinate.type === 'polar2D') {
    const polar = coordinate as Polar2DCoordinateInput;
    return {
      innerRadius: polar.innerRadius ?? POLAR_DEFAULT_INNER_RADIUS,
      startAngle: polar.startAngle ?? POLAR_DEFAULT_START_ANGLE,
      endAngle: polar.endAngle ?? POLAR_DEFAULT_END_ANGLE,
    };
  }
  return undefined;
};

const fillCoordinateScaleBindings = (
  input: CoordinateOperation,
  defaults: CoordinateOperation,
): CoordinateOperation => {
  if (input.type !== defaults.type) return input;
  if (input.type === PlotCoordinate.Cartesian2D && defaults.type === PlotCoordinate.Cartesian2D) {
    return {
      ...input,
      ...(input.x === undefined && defaults.x !== undefined ? { x: defaults.x } : {}),
      ...(input.y === undefined && defaults.y !== undefined ? { y: defaults.y } : {}),
    };
  }
  if (input.type === PlotCoordinate.Cartesian1D && defaults.type === PlotCoordinate.Cartesian1D) {
    return {
      ...input,
      ...(input.x === undefined && defaults.x !== undefined ? { x: defaults.x } : {}),
    };
  }
  if (input.type === PlotCoordinate.Polar2D && defaults.type === PlotCoordinate.Polar2D) {
    return {
      ...input,
      ...(input.angle === undefined && defaults.angle !== undefined ? { angle: defaults.angle } : {}),
      ...(input.radius === undefined && defaults.radius !== undefined ? { radius: defaults.radius } : {}),
    };
  }
  if (input.type === PlotCoordinate.Polar1D && defaults.type === PlotCoordinate.Polar1D) {
    return {
      ...input,
      ...(input.angle === undefined && defaults.angle !== undefined ? { angle: defaults.angle } : {}),
    };
  }
  return input;
};

const fillCompositionScaleBindings = (
  composition: PlotSpec['composition'],
  defaults: CoordinateOperation,
): PlotSpec['composition'] => {
  if (composition === undefined) return undefined;
  return {
    ...composition,
    ...(composition.views !== undefined
      ? {
          views: composition.views.map(view => ({
            ...view,
            coordinate: fillCoordinateScaleBindings(view.coordinate, defaults),
          })),
        }
      : {}),
    ...(composition.arrangements !== undefined
      ? {
          arrangements: composition.arrangements.map(arrangement =>
            arrangement.kind === 'tracks'
              ? {
                  ...arrangement,
                  coordinate: fillCoordinateScaleBindings(arrangement.coordinate, defaults),
                  tracks: arrangement.tracks.map(track => ({
                    ...track,
                    ...(track.coordinate !== undefined
                      ? { coordinate: fillCoordinateScaleBindings(track.coordinate, defaults) }
                      : {}),
                  })),
                }
              : arrangement,
          ),
        }
      : {}),
  };
};

/**
 * 把 mark / guide 子组件装配成规范化 PlotSpec
 * @description 纯函数：从 children 收集 mark + guide + transform；按 coordinate（cartesian / polar）推断 scale 类型、
 *   装配 stack transform、自动建坐标系绑定（用户不写）。cartesian：x band/linear/time/point、y linear；
 *   polar：角向 sector→linear / bar→band / 闭合 line→point / 否则 linear，径向 linear。
 *   guide 规则：薄 Plot 只保留显式 <Axis>/<Legend>（不补默认轴）。默认轴交 <Chart>/decorateDefaultGuides。
 *   产出须等价于手写 PlotSpec（仿 core Sugar = Kernel 等价性）。data 不进 IR，仅存 reference
 */
type AxisBindingNormalization = {
  marks: Array<Mark>;
  guides: Array<Guide>;
  scales: Array<PlotScaleSpec>;
  coordinate?: CoordinateOperation;
  composition?: PlotSpec['composition'];
};

type CoordinateViewSpec = NonNullable<CompositionSpec['views']>[number];

const yAxisScaleNameOf = (axisId: string): string => `__y.${axisId}`;
const xAxisScaleNameOf = (axisId: string): string => `__x.${axisId}`;

const isAxisGuide = (guide: Guide): guide is AxisGuide => guide.type === PlotGuide.Axis;

const isPositionMark = (mark: AxisBoundMark): boolean =>
  mark.type === PlotMark.Path || mark.type === PlotMark.Point || mark.type === PlotMark.Interval;

const stripMarkBindings = (mark: AxisBoundMark): Mark => {
  const rest = { ...mark };
  delete rest.xAxisId;
  delete rest.yAxisId;
  delete rest.facetId;
  delete rest.trackId;
  return rest;
};

const stripGuideBindings = (guide: AxisBoundGuide): Guide => {
  const rest = { ...guide };
  delete rest.facetId;
  delete rest.scaffoldId;
  delete rest.trackId;
  return rest;
};

const withMarkScope = (mark: AxisBoundMark, coordinateView: string | undefined): Mark => {
  const stripped = stripMarkBindings(mark);
  return coordinateView === undefined ? stripped : { ...stripped, coordinateView };
};

const withGuideScope = (guide: AxisBoundGuide, coordinateView: string | undefined): Guide => {
  const stripped = stripGuideBindings(guide);
  if (!isAxisGuide(stripped)) return stripped;
  return coordinateView === undefined ? stripped : { ...stripped, coordinateView };
};

const assertMarkBindingCompatibility = (mark: AxisBoundMark): void => {
  const bindings = [
    mark.xAxisId !== undefined ? 'xAxisId' : undefined,
    mark.yAxisId !== undefined ? 'yAxisId' : undefined,
    mark.facetId !== undefined ? 'facetId' : undefined,
    mark.trackId !== undefined ? 'trackId' : undefined,
  ].filter((binding): binding is string => binding !== undefined);
  if (bindings.length > 1) {
    throw new Error(`buildPlotSpec: mark has multiple binding props: ${bindings.join(', ')}`);
  }
  const binding = bindings.at(0);
  if (mark.coordinateView !== undefined && binding !== undefined) {
    throw new Error(`buildPlotSpec: mark cannot set both coordinateView and ${binding}`);
  }
};

const assertGuideBindingCompatibility = (guide: AxisBoundGuide): void => {
  const bindings = [
    guide.facetId !== undefined ? 'facetId' : undefined,
    guide.scaffoldId !== undefined ? 'scaffoldId' : undefined,
    guide.trackId !== undefined ? 'trackId' : undefined,
  ].filter((binding): binding is string => binding !== undefined);
  if (bindings.length > 1) {
    throw new Error(`buildPlotSpec: guide has multiple binding props: ${bindings.join(', ')}`);
  }
  const binding = bindings.at(0);
  if (binding !== undefined && !isAxisGuide(guide)) {
    throw new Error(`buildPlotSpec: ${binding} binding is only supported on <Axis> guides`);
  }
  if (isAxisGuide(guide) && guide.coordinateView !== undefined && binding !== undefined) {
    throw new Error(`buildPlotSpec: guide cannot set both coordinateView and ${binding}`);
  }
};

const insertAxisBindingScales = (
  scales: ReadonlyArray<PlotScaleSpec>,
  xAxisIds: ReadonlyArray<string>,
  yAxisIds: ReadonlyArray<string>,
): Array<PlotScaleSpec> => {
  const hasXBinding = xAxisIds.length > 0;
  const hasYBinding = yAxisIds.length > 0;
  const baseXScale = scales.find(scale => scale.name === AUTO_X) ?? { type: PlotScale.Linear, name: AUTO_X };
  const baseYScale = scales.find(scale => scale.name === AUTO_Y) ?? { type: PlotScale.Linear, name: AUTO_Y };
  const xScales: Array<PlotScaleSpec> = xAxisIds.map(axisId => ({
    ...baseXScale,
    name: xAxisScaleNameOf(axisId),
  }));
  const yScales: Array<PlotScaleSpec> = yAxisIds.map(axisId => ({
    ...baseYScale,
    name: yAxisScaleNameOf(axisId),
  }));
  const out: Array<PlotScaleSpec> = [];
  let insertedX = false;
  let insertedY = false;
  for (const scale of scales) {
    if (scale.name === AUTO_X && hasXBinding) {
      out.push(...xScales);
      insertedX = true;
    } else if (scale.name === AUTO_Y && hasYBinding) {
      out.push(...yScales);
      insertedY = true;
    } else {
      out.push(scale);
    }
  }
  if (!scales.some(scale => scale.name === AUTO_X)) {
    out.unshift(...(hasXBinding ? xScales : [{ type: PlotScale.Linear, name: AUTO_X }]));
  } else if (hasXBinding && !insertedX) {
    out.unshift(...xScales);
  }
  if (!scales.some(scale => scale.name === AUTO_Y)) {
    out.push(...(hasYBinding ? yScales : [{ type: PlotScale.Linear, name: AUTO_Y }]));
  } else if (hasYBinding && !insertedY) {
    out.push(...yScales);
  }
  return out;
};

const buildTopologyComposition = (
  facets: ReadonlyArray<CollectedFacet>,
  scaffolds: ReadonlyArray<CollectedScaffold>,
  coordinate: CoordinateOperation,
): {
  composition: CompositionSpec;
  facetViewById: Map<string, string>;
  trackViewById: Map<string, string>;
  scaffoldDefaultViewById: Map<string, string>;
} => {
  const views: Array<CoordinateViewSpec> = [];
  const facetSpecs: Array<FacetGridSpec> = [];
  const scaffoldSpecs: Array<SharedScaffoldSpec> = [];
  const facetViewById = new Map<string, string>();
  const trackViewById = new Map<string, string>();
  const scaffoldDefaultViewById = new Map<string, string>();

  for (const scaffold of scaffolds) {
    if (scaffoldSpecs.some(candidate => candidate.id === scaffold.id)) {
      throw new Error(`buildPlotSpec: duplicate scaffold id "${scaffold.id}"`);
    }
    scaffoldSpecs.push({
      ...scaffold,
      kind: 'tracks',
      coordinate: fillCoordinateScaleBindings(scaffold.coordinate ?? coordinate, coordinate),
      tracks: scaffold.tracks.map(track => ({ ...track, view: track.view ?? track.id })),
    });
    for (const track of scaffold.tracks) {
      if (trackViewById.has(track.id)) {
        throw new Error(`buildPlotSpec: duplicate track id "${track.id}" across scaffold bindings`);
      }
      const view = track.view ?? track.id;
      trackViewById.set(track.id, view);
      scaffoldDefaultViewById.set(scaffold.id, scaffoldDefaultViewById.get(scaffold.id) ?? view);
    }
  }

  for (const facet of facets) {
    if (facetViewById.has(facet.id)) throw new Error(`buildPlotSpec: duplicate facet id "${facet.id}"`);
    facetViewById.set(facet.id, facet.view);
    facetSpecs.push(facet);
    views.push({
      id: facet.view,
      coordinate: fillCoordinateScaleBindings(coordinate, coordinate),
    });
  }

  const defaultView = views.at(0)?.id ?? scaffoldSpecs[0]?.tracks[0]?.view;
  if (defaultView === undefined) {
    throw new Error('buildPlotSpec: topology binding requires at least one <Facet> or <Scaffold> declaration');
  }

  return {
    composition: {
      defaultView,
      ...(views.length > 0 ? { views } : {}),
      ...([...scaffoldSpecs, ...facetSpecs].length > 0 ? { arrangements: [...scaffoldSpecs, ...facetSpecs] } : {}),
    },
    facetViewById,
    trackViewById,
    scaffoldDefaultViewById,
  };
};

const normalizeTopologyBindings = (
  marks: ReadonlyArray<AxisBoundMark>,
  guides: ReadonlyArray<AxisBoundGuide>,
  scales: ReadonlyArray<PlotScaleSpec>,
  coordinate: CoordinateOperation,
  facets: ReadonlyArray<CollectedFacet>,
  scaffolds: ReadonlyArray<CollectedScaffold>,
): AxisBindingNormalization => {
  const { composition, facetViewById, trackViewById, scaffoldDefaultViewById } = buildTopologyComposition(
    facets,
    scaffolds,
    coordinate,
  );

  const normalizedMarks = marks.map(mark => {
    if (mark.facetId !== undefined) {
      const view = facetViewById.get(mark.facetId);
      if (view === undefined) throw new Error(`buildPlotSpec: missing facet for facetId "${mark.facetId}"`);
      return withMarkScope(mark, view);
    }
    if (mark.trackId !== undefined) {
      const view = trackViewById.get(mark.trackId);
      if (view === undefined) throw new Error(`buildPlotSpec: missing track for trackId "${mark.trackId}"`);
      return withMarkScope(mark, view);
    }
    return stripMarkBindings(mark);
  });

  const normalizedGuides = guides.map(guide => {
    if (guide.facetId !== undefined) {
      const view = facetViewById.get(guide.facetId);
      if (view === undefined) throw new Error(`buildPlotSpec: missing facet for facetId "${guide.facetId}"`);
      return withGuideScope(guide, view);
    }
    if (guide.trackId !== undefined) {
      const view = trackViewById.get(guide.trackId);
      if (view === undefined) throw new Error(`buildPlotSpec: missing track for trackId "${guide.trackId}"`);
      return withGuideScope(guide, view);
    }
    if (guide.scaffoldId !== undefined) {
      const view = scaffoldDefaultViewById.get(guide.scaffoldId);
      if (view === undefined) throw new Error(`buildPlotSpec: missing scaffold for scaffoldId "${guide.scaffoldId}"`);
      return withGuideScope(guide, view);
    }
    return stripGuideBindings(guide);
  });

  return {
    marks: normalizedMarks,
    guides: normalizedGuides,
    scales: [...scales],
    composition,
  };
};

const normalizeAxisBindings = (
  marks: ReadonlyArray<AxisBoundMark>,
  guides: ReadonlyArray<AxisBoundGuide>,
  scales: ReadonlyArray<PlotScaleSpec>,
  coordinate: CoordinateOperation,
  composition: PlotSpec['composition'],
  coordKind: ReturnType<typeof coordinateTypeOf>,
  facets: ReadonlyArray<CollectedFacet>,
  scaffolds: ReadonlyArray<CollectedScaffold>,
): AxisBindingNormalization => {
  marks.forEach(assertMarkBindingCompatibility);
  guides.forEach(assertGuideBindingCompatibility);

  const hasXAxisBinding = marks.some(mark => mark.xAxisId !== undefined);
  const hasYAxisBinding = marks.some(mark => mark.yAxisId !== undefined);
  const hasAxisBinding = hasXAxisBinding || hasYAxisBinding;
  const hasTopologyBinding = marks.some(mark => mark.facetId !== undefined || mark.trackId !== undefined) ||
    guides.some(guide => guide.facetId !== undefined || guide.scaffoldId !== undefined || guide.trackId !== undefined);
  const hasTopologyDeclarations = facets.length > 0 || scaffolds.length > 0;

  if (hasAxisBinding && (hasTopologyBinding || hasTopologyDeclarations)) {
    throw new Error('buildPlotSpec: multiple binding modes are not supported in one Plot');
  }

  if (hasTopologyBinding || hasTopologyDeclarations) {
    if (composition !== undefined) {
      throw new Error('buildPlotSpec: composition cannot be mixed with <Facet>/<Scaffold> binding sugar');
    }
    return normalizeTopologyBindings(marks, guides, scales, coordinate, facets, scaffolds);
  }

  if (!hasAxisBinding) {
    return {
      marks: marks.map(stripMarkBindings),
      guides: guides.map(stripGuideBindings),
      scales: [...scales],
      ...(composition !== undefined
        ? { composition: fillCompositionScaleBindings(composition, coordinate) }
        : { coordinate }),
    };
  }

  if (coordKind !== 'cartesian2D') {
    throw new Error('buildPlotSpec: axis id binding only supports cartesian2D coordinates');
  }

  const axes = guides.filter(isAxisGuide);
  const xAxesById = new Map<string, AxisGuide>();
  const yAxesById = new Map<string, AxisGuide>();
  const axesById = new Map<string, AxisGuide>();
  const seenAxisKeys = new Set<string>();
  const seenBindingScopeIds = new Map<string, string>();
  for (const axis of axes) {
    if (axis.id === undefined) continue;
    if (axis.id.length === 0) throw new Error('buildPlotSpec: axis id must be non-empty when using axis id binding');
    const duplicateKey = `${axis.dimension}:${axis.id}`;
    if (seenAxisKeys.has(duplicateKey)) {
      throw new Error(`buildPlotSpec: duplicate axis id "${axis.id}" for dimension "${axis.dimension}"`);
    }
    seenAxisKeys.add(duplicateKey);
    axesById.set(axis.id, axis);
    if (axis.dimension === 'x') xAxesById.set(axis.id, axis);
    if (axis.dimension === 'y') yAxesById.set(axis.id, axis);
    if ((axis.dimension === 'x' && hasXAxisBinding) || (axis.dimension === 'y' && hasYAxisBinding)) {
      const previousDimension = seenBindingScopeIds.get(axis.id);
      if (previousDimension !== undefined && previousDimension !== axis.dimension) {
        throw new Error(
          `buildPlotSpec: axis id "${axis.id}" cannot be reused across dimensions when using axis id binding`,
        );
      }
      seenBindingScopeIds.set(axis.id, axis.dimension);
    }
  }

  const referencedXAxisIds: Array<string> = [];
  const referencedYAxisIds: Array<string> = [];
  for (const mark of marks) {
    if (mark.xAxisId !== undefined) {
      if (mark.xAxisId.length === 0) throw new Error('buildPlotSpec: xAxisId must be a non-empty string');
      if (mark.xAxisId !== DEFAULT_AXIS_SCOPE) {
        if (xAxesById.has(mark.xAxisId)) {
          if (!referencedXAxisIds.includes(mark.xAxisId)) referencedXAxisIds.push(mark.xAxisId);
        } else if (axesById.has(mark.xAxisId)) {
          throw new Error(`buildPlotSpec: xAxisId "${mark.xAxisId}" must reference an axis with dimension "x"`);
        } else {
          throw new Error(`buildPlotSpec: missing x axis for xAxisId "${mark.xAxisId}"`);
        }
      }
    }
    if (mark.yAxisId !== undefined) {
      if (mark.yAxisId.length === 0) throw new Error('buildPlotSpec: yAxisId must be a non-empty string');
      if (mark.yAxisId !== DEFAULT_AXIS_SCOPE) {
        if (yAxesById.has(mark.yAxisId)) {
          if (!referencedYAxisIds.includes(mark.yAxisId)) referencedYAxisIds.push(mark.yAxisId);
        } else if (axesById.has(mark.yAxisId)) {
          throw new Error(`buildPlotSpec: yAxisId "${mark.yAxisId}" must reference an axis with dimension "y"`);
        } else {
          throw new Error(`buildPlotSpec: missing y axis for yAxisId "${mark.yAxisId}"`);
        }
      }
    }
  }

  const xAxisIds: Array<string> = hasXAxisBinding ? [DEFAULT_AXIS_SCOPE] : [];
  const yAxisIds: Array<string> = hasYAxisBinding ? [DEFAULT_AXIS_SCOPE] : [];
  for (const axis of axes) {
    if (axis.dimension === 'x' && hasXAxisBinding && axis.id !== undefined && axis.id !== DEFAULT_AXIS_SCOPE) {
      xAxisIds.push(axis.id);
    }
    if (axis.dimension === 'y' && hasYAxisBinding && axis.id !== undefined && axis.id !== DEFAULT_AXIS_SCOPE) {
      yAxisIds.push(axis.id);
    }
  }
  for (const axisId of referencedXAxisIds) {
    if (!xAxisIds.includes(axisId)) xAxisIds.push(axisId);
  }
  for (const axisId of referencedYAxisIds) {
    if (!yAxisIds.includes(axisId)) yAxisIds.push(axisId);
  }

  const explicitComposition = composition !== undefined ? fillCompositionScaleBindings(composition, coordinate) : undefined;
  if (explicitComposition !== undefined) {
    const viewIds = new Set([
      ...(explicitComposition.views ?? []).map(view => view.id),
      ...(explicitComposition.arrangements ?? []).flatMap(arrangement =>
        arrangement.kind === 'tracks'
          ? arrangement.tracks.map(track =>
              (track.view ?? arrangement.viewIdTemplate ?? '{arrangement}.track.{track}')
                .replaceAll('{arrangement}', arrangement.id)
                .replaceAll('{track}', track.id),
            )
          : [],
      ),
    ]);
    for (const axisId of [...xAxisIds, ...yAxisIds]) {
      if (!viewIds.has(axisId)) {
        throw new Error(`buildPlotSpec: axis id "${axisId}" requires an explicit composition view with the same id`);
      }
    }
  }

  const normalizedMarks = marks.map(mark => {
    if (!isPositionMark(mark)) return stripMarkBindings(mark);
    if (mark.xAxisId !== undefined) return withMarkScope(mark, mark.xAxisId);
    if (mark.yAxisId !== undefined) return withMarkScope(mark, mark.yAxisId);
    return mark.coordinateView === undefined ? withMarkScope(mark, DEFAULT_AXIS_SCOPE) : stripMarkBindings(mark);
  });
  const normalizedGuides = guides.map(guide => {
    if (!isAxisGuide(guide)) return stripGuideBindings(guide);
    if (guide.dimension !== 'x' && guide.dimension !== 'y') return stripGuideBindings(guide);
    if (guide.dimension === 'x' && !hasXAxisBinding) return stripGuideBindings(guide);
    if (guide.dimension === 'y' && !hasYAxisBinding) return stripGuideBindings(guide);
    const coordinateView = guide.id ?? DEFAULT_AXIS_SCOPE;
    if (guide.coordinateView !== undefined && guide.coordinateView !== coordinateView) {
      throw new Error(
        `buildPlotSpec: ${guide.dimension} axis "${guide.id ?? '<anonymous>'}" cannot set coordinateView different from its bound coordinate view`,
      );
    }
    return withGuideScope(guide, coordinateView);
  });

  if (explicitComposition !== undefined) {
    return {
      marks: normalizedMarks,
      guides: normalizedGuides,
      scales: [...scales],
      composition: explicitComposition,
    };
  }

  const defaultXScaleName = hasXAxisBinding ? xAxisScaleNameOf(DEFAULT_AXIS_SCOPE) : AUTO_X;
  const defaultYScaleName = hasYAxisBinding ? yAxisScaleNameOf(DEFAULT_AXIS_SCOPE) : AUTO_Y;
  const xAxisScopes: Array<CoordinateViewSpec> = xAxisIds
    .filter(axisId => axisId !== DEFAULT_AXIS_SCOPE)
    .map(axisId => ({
      id: axisId,
      coordinate: { type: PlotCoordinate.Cartesian2D, x: xAxisScaleNameOf(axisId), y: defaultYScaleName },
      placement: { kind: 'overlay' as const, target: DEFAULT_AXIS_SCOPE },
    }));
  const yAxisScopes: Array<CoordinateViewSpec> = yAxisIds
    .filter(axisId => axisId !== DEFAULT_AXIS_SCOPE)
    .map(axisId => ({
      id: axisId,
      coordinate: { type: PlotCoordinate.Cartesian2D, x: defaultXScaleName, y: yAxisScaleNameOf(axisId) },
      placement: { kind: 'overlay' as const, target: DEFAULT_AXIS_SCOPE },
    }));

  return {
    marks: normalizedMarks,
    guides: normalizedGuides,
    scales: insertAxisBindingScales(scales, xAxisIds, yAxisIds),
    composition: {
      defaultView: DEFAULT_AXIS_SCOPE,
      views: [
        {
          id: DEFAULT_AXIS_SCOPE,
          coordinate: { type: PlotCoordinate.Cartesian2D, x: defaultXScaleName, y: defaultYScaleName },
        },
        ...xAxisScopes,
        ...yAxisScopes,
      ],
    },
  };
};

export const buildPlotSpec = (children: ReactNode, dataRef: string, options: BuildPlotSpecOptions = {}): PlotSpec => {
  const collected: Collected = {
    marks: [],
    guides: [],
    facets: [],
    scaffolds: [],
    transforms: [],
    shortcutTransforms: [],
    scales: [],
    resolveLabels: {},
    colored: false,
    colorFields: [],
    hasBar: false,
    hasRect: false,
    hasHorizontalBar: false,
    hasSector: false,
    hasClosedLine: false,
  };
  collectInto(children, collected, styleSugarContext(options));

  // transform 装配序：<Plot transforms> 直传 → <Transform> 收集 → mark shortcut transforms（B4 去重）
  // B4 按 stack 签名（x / y / groupBy）去重：仅抑制与某条显式 stack 完全同签名的 shortcut stack（那条会二次堆叠），
  // 不同签名的 shortcut stack 保留——否则该 mark 仍是 arrangement='stack' 却没有对应 y0/y1，lower 阶段读空累积界出错。
  const explicitTransforms: Array<TransformOperation> = [...(options.transforms ?? []), ...collected.transforms];
  const shortcutTransforms = [
    ...collected.shortcutTransforms,
    ...buildShortcutTransforms(collected.marks, options.markTransformShortcuts),
  ];
  const stackSignature = (transform: TransformOperation): string =>
    transform.kind === PlotTransform.Stack
      ? JSON.stringify([
          transform.x ?? null,
          transform.y,
          transform.groupBy ?? null,
          transform.offset ?? 'zero',
          transform.startField ?? null,
          transform.endField ?? null,
        ])
      : '';
  const explicitStackSignatures = new Set(
    explicitTransforms.filter(transform => transform.kind === PlotTransform.Stack).map(stackSignature),
  );
  const dedupedShortcutTransforms = shortcutTransforms.filter(
    transform => transform.kind !== PlotTransform.Stack || !explicitStackSignatures.has(stackSignature(transform)),
  );
  const transforms: Array<TransformOperation> = [...explicitTransforms, ...dedupedShortcutTransforms];

  const coordKind = coordinateTypeOf(options.coordinate);
  if (collected.hasSector && coordKind !== 'polar2D') {
    throw new Error('buildPlotSpec: <IntervalMark angle> is only valid under coordinate="polar2D"');
  }
  if (collected.hasHorizontalBar && coordKind !== 'cartesian2D') {
    throw new Error(
      'buildPlotSpec: <IntervalMark direction="horizontal"> is only valid under coordinate="cartesian2D"',
    );
  }
  if (coordKind === 'polar2D' && collected.marks.some(mark => mark.type === PlotMark.Path && mark.closed !== false)) {
    collected.hasClosedLine = true;
  }
  const explicitScales = collectExplicitScales(collected.scales, coordKind);

  // 有 model 或 Plot 入口要求延迟推断时，未显式声明 <Scale> 的维度省略 AUTO 绑定，交给 expand 按字段类型派生。
  // 直接调用 buildPlotSpec 且无 model 时，沿用 AUTO 绑定 + 默认推断（向后兼容）。
  const shouldDeferPositionScales = options.model !== undefined || options.deferPositionScaleInference === true;
  let coordinate: CoordinateOperation;
  let scales: Array<PlotScaleSpec>;
  if (coordKind === 'polar2D') {
    const polar = toPolarConfig(options.coordinate) as PolarConfig;
    const angleScale = buildAngleScale(collected, explicitScales.angle);
    const radiusScale = buildPositionScale(AUTO_RADIUS, explicitScales.radius?.type ?? 'linear', explicitScales.radius);
    coordinate = shouldDeferPositionScales
      ? {
          type: PlotCoordinate.Polar2D,
          ...(explicitScales.angle !== undefined ? { angle: AUTO_ANGLE } : {}),
          ...(explicitScales.radius !== undefined ? { radius: AUTO_RADIUS } : {}),
          startAngle: polar.startAngle,
          endAngle: polar.endAngle,
          innerRadius: polar.innerRadius,
        }
      : {
          type: PlotCoordinate.Polar2D,
          angle: AUTO_ANGLE,
          radius: AUTO_RADIUS,
          startAngle: polar.startAngle,
          endAngle: polar.endAngle,
          innerRadius: polar.innerRadius,
        };
    scales = [
      ...(!shouldDeferPositionScales || explicitScales.angle !== undefined ? [angleScale] : []),
      ...(!shouldDeferPositionScales || explicitScales.radius !== undefined ? [radiusScale] : []),
    ];
  } else if (coordKind === 'cartesian1D') {
    // 单维直线：orientation 取对象配置；单一位置 scale 可由 <Scale dimension="x"> 覆盖（rug 默认 linear、timeline 可 time）
    const orientation =
      typeof options.coordinate === 'object' && options.coordinate.type === 'cartesian1D'
        ? options.coordinate.orientation
        : undefined;
    const xScale = buildCartesianXScale(false, explicitScales.x);
    coordinate = shouldDeferPositionScales
      ? {
          type: PlotCoordinate.Cartesian1D,
          ...(explicitScales.x !== undefined ? { x: AUTO_X } : {}),
          ...(orientation !== undefined ? { orientation } : {}),
        }
      : { type: PlotCoordinate.Cartesian1D, x: AUTO_X, ...(orientation !== undefined ? { orientation } : {}) };
    scales = !shouldDeferPositionScales || explicitScales.x !== undefined ? [xScale] : [];
  } else if (coordKind === 'polar1D') {
    // 单角向圆周：半径占比 + 角向区间取对象配置；角向 scale 默认 linear（无 model；周期连续量）
    const cfg =
      typeof options.coordinate === 'object' && options.coordinate.type === 'polar1D' ? options.coordinate : undefined;
    const geom = {
      ...(cfg?.radius !== undefined ? { radius: cfg.radius } : {}),
      ...(cfg?.startAngle !== undefined ? { startAngle: cfg.startAngle } : {}),
      ...(cfg?.endAngle !== undefined ? { endAngle: cfg.endAngle } : {}),
    };
    const angleScale = buildPositionScale(AUTO_ANGLE, explicitScales.angle?.type ?? 'linear', explicitScales.angle);
    coordinate = shouldDeferPositionScales
      ? { type: PlotCoordinate.Polar1D, ...(explicitScales.angle !== undefined ? { angle: AUTO_ANGLE } : {}), ...geom }
      : { type: PlotCoordinate.Polar1D, angle: AUTO_ANGLE, ...geom };
    scales = !shouldDeferPositionScales || explicitScales.angle !== undefined ? [angleScale] : [];
  } else if (coordKind === 'ternary2D') {
    // 三元：coordinate 内自动归一化，无独立位置 scale
    coordinate = { type: PlotCoordinate.Ternary2D };
    scales = [];
  } else if (coordKind === 'custom') {
    // 自定义坐标系：IR 直接存 { type:<customType>, ...config }；roles / 投影函数来自运行时 CoordinateDefinition。
    if (
      typeof options.coordinate !== 'object' ||
      BUILTIN_COORDINATE_INPUT_TYPES.has(options.coordinate.type) ||
      options.coordinate.type === 'custom'
    ) {
      throw new Error(
        'buildPlotSpec: custom coordinates must use a non-built-in type string, for example { type: "arch", archHeight: 30 }',
      );
    }
    coordinate = CoordinateOperationSchema.parse({ ...options.coordinate });
    scales = [];
  } else {
    const xScale = buildCartesianXScale(collected.hasBar, explicitScales.x);
    const yScale = buildCartesianYScale(collected.hasRect, explicitScales.y);
    coordinate = shouldDeferPositionScales
      ? {
          type: PlotCoordinate.Cartesian2D,
          ...(explicitScales.x !== undefined ? { x: AUTO_X } : {}),
          ...(explicitScales.y !== undefined ? { y: AUTO_Y } : {}),
        }
      : { type: PlotCoordinate.Cartesian2D, x: AUTO_X, y: AUTO_Y };
    scales = [
      ...(!shouldDeferPositionScales || explicitScales.x !== undefined ? [xScale] : []),
      ...(!shouldDeferPositionScales || explicitScales.y !== undefined ? [yScale] : []),
    ];
  }
  if (collected.colored) scales.push(buildColorScale(collected.colorFields, options.model, options.colors));

  // 薄 Plot：不补默认轴——用户显式 <Axis>/<Legend> 才有 guides。
  //   开箱即用的默认轴 / 网格交给上层 <Chart>（v0.2，复用 decorateDefaultGuides）。
  const explicitAxes = collected.guides.filter(guide => guide.type === PlotGuide.Axis);
  const legends = collected.guides.filter(guide => guide.type === PlotGuide.Legend);
  const guides: Array<AxisBoundGuide> = [...explicitAxes, ...legends];
  const normalizedAxisBinding = normalizeAxisBindings(
    collected.marks,
    guides,
    scales,
    coordinate,
    options.composition,
    coordKind,
    collected.facets,
    collected.scaffolds,
  );

  const spec: PlotSpec = {
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    ...(options.id !== undefined ? { id: options.id } : {}),
    data: options.model ? { reference: dataRef, model: options.model } : { reference: dataRef },
    ...(transforms.length > 0 ? { transform: transforms } : {}),
    scales: normalizedAxisBinding.scales,
    ...(options.colors !== undefined ? { colors: options.colors } : {}),
    ...(options.theme !== undefined ? { theme: options.theme } : {}),
    ...(options.width !== undefined ? { width: options.width } : {}),
    ...(options.height !== undefined ? { height: options.height } : {}),
    ...(normalizedAxisBinding.composition !== undefined
      ? { composition: normalizedAxisBinding.composition }
      : { coordinate: normalizedAxisBinding.coordinate }),
    marks: normalizedAxisBinding.marks,
    guides: normalizedAxisBinding.guides,
  };
  // 旁路记录 resolveLabel（运行时函数、不进 IR）：resolvePlotRuntime 据返回的 spec 取出注入 lowerPlots options
  const parsed = normalizedAxisBinding.marks.length === 0 ? spec : PlotSpecSchema.parse(spec);
  if (Object.keys(collected.resolveLabels).length > 0) resolveLabelBySpec.set(parsed, collected.resolveLabels);
  return parsed;
};

/**
 * 给薄 <Plot> 产物补默认坐标轴：cartesian2D 且无任何显式 axis 时，前置 x 轴 + y 轴（带网格）。
 * @description 框架无关纯函数（PlotSpec 进出），供上层 <Chart>（v0.2）复用——薄 <Plot> 本身不调用。
 *   非 cartesian2D（polar / 1D / ternary）的专门轴仍需显式声明，原样返回；已有显式 <Axis> 时不补。
 */
export const decorateDefaultGuides = (spec: PlotSpec): PlotSpec => {
  if (spec.coordinate === undefined) return spec;
  if (spec.coordinate.type !== PlotCoordinate.Cartesian2D) return spec;
  const guides = spec.guides ?? [];
  if (guides.some(guide => guide.type === PlotGuide.Axis)) return spec;
  return { ...spec, guides: [...DEFAULT_GUIDES, ...guides] };
};
