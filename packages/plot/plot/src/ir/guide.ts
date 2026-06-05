import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/**
 * guide 类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'axis'` 同样可用）
 * @description grammar-of-graphics 的 guide 是 scale 的可视化身（坐标轴 / 图例…）；alpha.2 仅 axis，后续加 legend / reference line
 */
export const PlotGuide = {
  /** 坐标轴：轴线 + 刻度 + 刻度标签，可选对齐网格 */
  Axis: 'axis',
} as const;

/** guide 类型 */
export type GuideType = ValueOf<typeof PlotGuide>;

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

/**
 * Guide union（alpha.2 仅 axis；grid 是 axis 子属性、非独立成员）
 * @description 预留：legend / reference line 进来时升为 z.discriminatedUnion('type', [AxisGuideSchema, …])——type 判别位已在，升级非破坏
 */
export const GuideSchema = AxisGuideSchema;

/** guide（alpha.2：axis，含可选 grid 子属性） */
export type Guide = z.infer<typeof GuideSchema>;
/** 坐标轴 guide（轴线 + 刻度 + 标签 + 可选网格） */
export type AxisGuide = z.infer<typeof AxisGuideSchema>;
