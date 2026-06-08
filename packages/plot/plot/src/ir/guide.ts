import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/**
 * guide 类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'axis'` 同样可用）
 * @description grammar-of-graphics 的 guide 是 scale 的可视化身（坐标轴 / 图例…）；alpha.2 仅 axis，后续加 legend / reference line
 */
export const PlotGuide = {
  /** 坐标轴：轴线 + 刻度 + 刻度标签，可选对齐网格 */
  Axis: 'axis',
  /** 图例：把非位置 scale（颜色 / 尺寸 / 透明度 / 形状）可视化为 swatch / 色带 ramp / 分箱 / 梯度符号 */
  Legend: 'legend',
} as const;

/** guide 类型 */
export type GuideType = ValueOf<typeof PlotGuide>;

/**
 * 图例可视化的非位置通道关键字（暴露给用户；成员值即判别串，裸字面量 `'color'` 同样可用）
 * @description 与 encoding 的非位置通道一一对应；legend 据绑定该通道的 scale 类型自动选 swatch / ramp / 分箱 / 梯度符号形态
 */
export const LegendChannel = {
  /** 颜色通道（ordinal → swatch；sequential/diverging → 色带 ramp；quantize/threshold/quantile → 分箱） */
  Color: 'color',
  /** 尺寸通道（sqrt 半径 → 梯度符号：几档代表性大小圈 + 值） */
  Size: 'size',
  /** 透明度通道（连续 linear → 梯度透明度条） */
  Opacity: 'opacity',
  /** 形状通道（categorical → 形状 swatch + 标签） */
  Shape: 'shape',
} as const;

/** 图例绑定的非位置通道 */
export type LegendChannelType = ValueOf<typeof LegendChannel>;

/**
 * 图例摆放位置关键字（暴露给用户；裸字面量 `'right'` 同样可用）
 * @description 决定 legend 占据 plotArea 哪一边的预留带；省略默认 right（默认值在 lowering 给）
 */
export const LegendPosition = {
  /** plotArea 右侧 */
  Right: 'right',
  /** plotArea 左侧 */
  Left: 'left',
  /** plotArea 上方 */
  Top: 'top',
  /** plotArea 下方 */
  Bottom: 'bottom',
} as const;

/** 图例位置 */
export type LegendPositionType = ValueOf<typeof LegendPosition>;

/**
 * 图例条目排布方向关键字（暴露给用户；裸字面量 `'vertical'` 同样可用）
 * @description 省略默认按 position（左右→vertical、上下→horizontal），默认值在 lowering 给
 */
export const LegendOrient = {
  /** 纵向堆叠（条目自上而下） */
  Vertical: 'vertical',
  /** 横向排布（条目自左而右） */
  Horizontal: 'horizontal',
} as const;

/** 图例排布方向 */
export type LegendOrientType = ValueOf<typeof LegendOrient>;

/**
 * guide 绑定的坐标系定位维度关键字（暴露给用户；裸字面量 `'x'` / `'y'` 同样可用）
 * @description 指这根轴可视化坐标系的哪个定位维度，不是固定的屏幕「水平/垂直」方向。
 *   cartesian2D 的定位维度是 x / y；其它坐标系按自身定位维度扩展成员（如 polar 的 radius / angle），属非破坏新增。
 */
export const GuideDimension = {
  /** cartesian2D 水平定位维度 */
  X: 'x',
  /** cartesian2D 垂直定位维度 */
  Y: 'y',
  /** polar 角向定位维度（绕圆周；亦可由别名 x 复用） */
  Angle: 'angle',
  /** polar 径向定位维度（沿辐条；亦可由别名 y 复用） */
  Radius: 'radius',
} as const;

/** guide 维度 */
export type GuideDimensionType = ValueOf<typeof GuideDimension>;

export const AxisGuideSchema = z
  .object({
    type: z
      .literal(PlotGuide.Axis)
      .describe('Discriminator: a coordinate axis (axis line + ticks + tick labels, with optional aligned grid lines)'),
    dimension: z
      .nativeEnum(GuideDimension)
      .describe(
        "Which positional dimension of the bound coordinate system this axis visualizes — not a fixed screen orientation. cartesian2D dimensions are 'x' (horizontal) / 'y' (vertical); other coordinate systems extend the set with their own (e.g. polar: radius / angle).",
      ),
    id: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional guide handle; reserved scope/anchor target (e.g. plot.xAxis / plot.yAxis region), resolution deferred to alpha.5',
      ),
    tickCount: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'Target number of ticks (a hint to the scale; omit to use the default tick count). Grid lines, when enabled, sit at these same tick positions',
      ),
    tickLabels: z
      .boolean()
      .optional()
      .describe(
        'Whether to render tick labels (the numeric text beside each tick); omit = true. Named tickLabels (not label) to avoid confusion with a future axis title',
      ),
    grid: z
      .boolean()
      .optional()
      .describe(
        'Whether to draw grid lines spanning the plot area at this axis tick positions; omit = false. Grid is an axis sub-property (Vega-style): its lines always align to this axis ticks, so there is no separate grid tick source',
      ),
  })
  .describe(
    'Axis guide: a coordinate axis (ticks + tick labels, with optional aligned grid lines), derived from the bound dimension scale',
  );

export const LegendGuideSchema = z
  .object({
    type: z
      .literal(PlotGuide.Legend)
      .describe('Discriminator: a legend that visualizes a non-positional scale (color / size / opacity / shape) as swatches, a continuous color ramp, binned classes, or graduated symbols'),
    channel: z
      .nativeEnum(LegendChannel)
      .describe(
        'Which non-positional encoding channel this legend visualizes; the legend form (swatches / continuous ramp / binned classes / graduated symbols) is chosen automatically from the type of the bound scale',
      ),
    scale: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Disambiguating scale name when the channel is driven by more than one scale; omit when the channel has a single scale (more than one and omitted is a fail-loud error during lowering)',
      ),
    title: z
      .string()
      .optional()
      .describe('Legend title rendered above the entries; omit for no title (automatic field-name title is not yet rendered)'),
    position: z
      .nativeEnum(LegendPosition)
      .optional()
      .describe('Which side of the plot area the legend reserves a band on; omit = right (default applied during lowering)'),
    orient: z
      .nativeEnum(LegendOrient)
      .optional()
      .describe('How legend entries are laid out; omit to derive from position (left/right -> vertical, top/bottom -> horizontal, applied during lowering)'),
    tickCount: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Target number of ticks for a continuous color ramp (a hint); meaningless for discrete legends and ignored there'),
    tickLabels: z
      .boolean()
      .optional()
      .describe('Whether to render the text labels beside swatches / ramp ticks; omit = true'),
  })
  .describe(
    'Legend guide: visualizes a non-positional scale (color / size / opacity / shape), with form derived from the bound scale type',
  );

/**
 * Guide union（axis + legend；grid 是 axis 子属性、非独立成员）
 * @description type 判别位驱动的 discriminated union；后续 reference line 等新 guide 按 type 追加成员，属非破坏新增
 */
export const GuideSchema = z.discriminatedUnion('type', [AxisGuideSchema, LegendGuideSchema]);

/** guide（axis 或 legend） */
export type Guide = z.infer<typeof GuideSchema>;
/** 坐标轴 guide（轴线 + 刻度 + 标签 + 可选网格） */
export type AxisGuide = z.infer<typeof AxisGuideSchema>;
/** 图例 guide（swatch / 色带 ramp / 分箱 / 梯度符号，由绑定 scale 类型决定形态） */
export type LegendGuide = z.infer<typeof LegendGuideSchema>;
