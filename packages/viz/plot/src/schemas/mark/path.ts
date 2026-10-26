import {
  CssColorSchema,
  OpacitySchema,
  PathDecorationSchema,
  PathStrokeSchema,
  PathTransformSchema,
  GraphicOpacityValueSchema,
  GraphicEffectsSchema,
  GraphicFillSchema,
  GraphicStrokeSchema,
  PathFillSchema,
} from '@retikz/core';
import { CenterlineRibbonPathOptionsSchema, RibbonLabelSchema } from '@retikz/extension';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import type { ValueOf } from '@retikz/foundation';
import {
  array,
  boolean,
  discriminatedUnion,
  enum as zodEnum,
  literal,
  never,
  number,
  strictObject,
  union,
  string,
} from 'zod';
import type { infer as ZodInfer } from 'zod';

import { CoordinateConnection, PolarInterpolation } from '../coordinate';
import { PathEncodingSchema, PositionEncodingSchema, ChannelSchema } from '../encoding';
import { AnchorIdSchema, hasValidAnchorSource, PathEndpointSchema } from './anchor';
import { BuiltinPlotMark, markBase } from './base';
import { MarkPathLabelListSchema } from './label';
import { PlotPathStepSchema } from './path-step';

/** 数据路径的中心线带状选项；宽度也可由通道提供 */
export const PlotPathRibbonSchema = CenterlineRibbonPathOptionsSchema.omit({ mode: true, label: true }).partial();

/** PathMark 支持的路径几何种类 */
export const PathMarkKind = { Stroke: 'stroke', Ribbon: 'ribbon' } as const;
export type PathMarkKind = ValueOf<typeof PathMarkKind>;

const ribbonLabel = RibbonLabelSchema.extend({
  text: RibbonLabelSchema.shape.text.optional(),
  displayFormat: NonBlankStringSchema.optional(),
});
const ribbonLabels = union([string(), ribbonLabel, array(union([string(), ribbonLabel])).min(1)]);

/** PathMark 外观绑定，附加中心线带宽通道 */
export const PathMarkAppearanceEncodingSchema = PathEncodingSchema.extend({
  ribbon: strictObject({ width: ChannelSchema.optional(), endWidth: ChannelSchema.optional() })
    .optional()
    .describe('Ribbon widths in drawing units after optional channel scaling'),
});

/** 开放轨迹跨缺值连接段的常量描边覆盖 */
export const PlotPathConnectNullsStyleSchema = PathStrokeSchema.extend({
  stroke: CssColorSchema.optional(),
  strokeOpacity: OpacitySchema.optional(),
  dashPattern: PathStrokeSchema.shape.dashPattern.unwrap().default([6, 4]).optional(),
}).describe('Stroke overrides for bridges across missing projected points in an open unfilled path');

/**
 * PathMark 相邻点连接方式
 * @description 面向图表层的曲线类型；底层会下沉为 core Path 的 line / cubic / smooth steps
 */
export const PathCurve = {
  /** 折线连接：每相邻两点用直线段连接 */
  Linear: 'linear',
  /** 阶梯线：水平段在相邻点中间切换 */
  Step: 'step',
  /** 前置阶梯：先切换到下一个 y，再沿 x 前进 */
  StepBefore: 'stepBefore',
  /** 后置阶梯：先沿 x 前进，再切换到下一个 y */
  StepAfter: 'stepAfter',
  /** 基础 B 样条：平滑但通常不穿过每个中间点 */
  Basis: 'basis',
  /** Cardinal 样条：穿过数据点，曲率较柔和 */
  Cardinal: 'cardinal',
  /** Catmull-Rom 样条：穿过数据点，局部形状跟随相邻点 */
  CatmullRom: 'catmullRom',
  /** x 单调三次插值：适合 x 递增的趋势线，减少极值过冲 */
  MonotoneX: 'monotoneX',
  /** y 单调三次插值：适合 y 递增的轨迹，减少极值过冲 */
  MonotoneY: 'monotoneY',
  /** 自然三次样条：整体连续、端点二阶导为 0 */
  Natural: 'natural',
} as const;

/**
 * PathMark 闭合策略关键字
 * @description cycle 首尾闭合；baseline 回到常量基线；stack 回到逐行基线字段，适合堆叠面积
 */
export const PathClosureKind = {
  /** 首尾直接闭合，形成多边形 / 雷达轮廓 */
  Cycle: 'cycle',
  /** 上沿回到常量 baseline 后闭合，形成常规面积 */
  Baseline: 'baseline',
  /** 上沿回到每行 baselineField 指向的下边界后闭合，形成堆叠面积 / 区间带 */
  Stack: 'stack',
} as const;

/** PathMark 相邻点连接方式 */
export type PathCurve = ValueOf<typeof PathCurve>;

/** PathMark 闭合策略 */
export type PathClosureKind = ValueOf<typeof PathClosureKind>;

const PathCycleClosureSchema = strictObject({
  kind: literal(PathClosureKind.Cycle).describe('Cycle closure: connect the final point back to the first point'),
}).describe('Path cycle closure: closes the path as a polygon; set fill to render an area');

const PathBaselineClosureSchema = strictObject({
  kind: literal(PathClosureKind.Baseline).describe(
    'Baseline closure: return from the upper outline to a baseline value',
  ),
  baseline: number()
    .optional()
    .describe(
      'Constant baseline value for the return edge; omit to use 0 when it is inside the value-axis domain, otherwise the nearest value-axis domain edge. Finite-only to keep the IR JSON round-trippable',
    ),
}).describe('Path baseline closure: closes the upper outline down to a baseline; set fill to render an area');

const PathStackClosureSchema = strictObject({
  kind: literal(PathClosureKind.Stack).describe(
    'Stack closure: return from the upper outline to a per-row baseline field',
  ),
}).describe(
  'Path stack closure: closes the upper outline against a per-row lower-bound field; set fill to render an area',
);

/** 校验循环、基线或逐行堆叠基线闭合策略；几何闭合不自动开启填充 */
export const PathClosureSchema = discriminatedUnion('kind', [
  PathCycleClosureSchema,
  PathBaselineClosureSchema,
  PathStackClosureSchema,
]).describe(
  'Path closure strategy: cycle, baseline, or per-row stacked baseline. Providing closure makes PathMark geometrically closed; fill still controls whether the path is painted as an area',
);

/** 校验按记录顺序连接为一维轨迹的路径标记 */
export const PathPropertiesSchema = strictObject({
  kind: zodEnum(PathMarkKind).optional().describe('Path geometry kind; omitted means stroke'),
  ribbon: PlotPathRibbonSchema.optional(),
  ...PathTransformSchema.shape,
  ...PathDecorationSchema.shape,
  ...GraphicFillSchema.shape,
  ...GraphicStrokeSchema.shape,
  ...GraphicEffectsSchema.shape,
  ...PathFillSchema.shape,
  connection: zodEnum(CoordinateConnection)
    .optional()
    .describe(
      'Coordinate interpolation for coordinate endpoints; straight connection when an endpoint references a mark',
    ),
  color: CssColorSchema.optional(),
  closed: boolean()
    .optional()
    .describe(
      'Connect the last point back to the first, closing the path into a polygon; under polar this yields a radar outline. Default false',
    ),
  connectNulls: union([boolean(), PlotPathConnectNullsStyleSchema])
    .optional()
    .describe(
      'False or omitted splits at invalid projected points. True or an object bridges open unfilled paths with a default dashed stroke; object fields override bridge stroke only. Closed or filled paths accept boolean only',
    ),
  closure: PathClosureSchema.optional().describe(
    'Close the path using a cycle, a baseline, or a per-row stacked baseline. Set fill when the closed path should render as an area',
  ),
  curve: zodEnum(PathCurve).optional().describe('Connection curve between adjacent ordered points; default linear'),
  interpolation: zodEnum(PolarInterpolation)
    .optional()
    .describe('Polar2D connection-space override; omit to inherit the resolved coordinate interpolation'),
  opacity: GraphicOpacityValueSchema.optional(),
  cornerRadius: NonNegativeNumberSchema.optional().describe(
    'Path geometric corner radius: fixed core Path cornerRadius',
  ),
  zIndex: number().int().optional(),
  anchorId: AnchorIdSchema.optional().describe(
    'Stable id rule for generated per-datum core Coordinates along this path',
  ),
  label: union([MarkPathLabelListSchema, ribbonLabels])
    .optional()
    .describe('Host labels using the selected path kind contract'),
}).describe('Fixed data path properties and construction rules');

/** 校验按顶点组织的路径或逐实例完整端点，输入形态互斥 */
export const PathMarkEncodingSchema = union([
  PathMarkAppearanceEncodingSchema.extend({
    anchorId: NonBlankStringSchema.optional(),
    position: PositionEncodingSchema,
    steps: never().optional(),
    from: never().optional(),
    to: never().optional(),
    series: NonBlankStringSchema.optional(),
    order: NonBlankStringSchema.optional(),
    closure: strictObject({ baseline: NonBlankStringSchema }).optional(),
  }),
  PathMarkAppearanceEncodingSchema.extend({
    anchorId: NonBlankStringSchema.optional(),
    from: PathEndpointSchema,
    steps: never().optional(),
    to: PathEndpointSchema,
    position: never().optional(),
    series: never().optional(),
    order: never().optional(),
    closure: never().optional(),
  }),
  PathMarkAppearanceEncodingSchema.extend({
    anchorId: NonBlankStringSchema.optional(),
    steps: array(PlotPathStepSchema).min(2),
    from: never().optional(),
    to: never().optional(),
    position: never().optional(),
    series: never().optional(),
    order: never().optional(),
    closure: never().optional(),
  }),
]);

/** 校验按系列与顺序连接数据顶点的路径 */
export const PathMarkSchema = strictObject({
  ...markBase,
  type: literal(BuiltinPlotMark.Path),
  encodings: PathMarkEncodingSchema,
  properties: PathPropertiesSchema.optional(),
})
  .refine(hasValidAnchorSource, {
    path: ['properties', 'anchorId'],
    message: 'anchorId requires exactly one of field, template, or generator',
  })
  .superRefine((mark, context) => {
    const properties = mark.properties;
    const binding = mark.encodings.ribbon;
    const issue = (path: Array<string | number>, message: string) =>
      context.addIssue({ code: 'custom', path, message });
    const labels =
      properties?.label === undefined ? [] : Array.isArray(properties.label) ? properties.label : [properties.label];
    if (properties?.kind !== 'ribbon') {
      if (properties?.ribbon !== undefined) issue(['properties', 'ribbon'], 'Ribbon options require kind=ribbon');
      if (binding !== undefined) issue(['encodings', 'ribbon'], 'Ribbon channels require kind=ribbon');
      for (const label of labels)
        if (typeof label !== 'string' && 'placement' in label)
          issue(['properties', 'label'], 'Ribbon placement requires kind=ribbon');
    } else {
      const width = properties.ribbon?.width;
      if (width === undefined && binding?.width === undefined)
        issue(['properties', 'ribbon', 'width'], 'Ribbon requires a width rule or width binding');
      if (binding !== undefined && (width?.kind === 'profile' || width?.kind === 'stops'))
        issue(['encodings', 'ribbon'], 'Width bindings cannot override profile or stops');
      if (binding?.endWidth !== undefined && width !== undefined && width.kind !== 'taper')
        issue(['encodings', 'ribbon', 'endWidth'], 'endWidth requires a taper width rule');
      for (const field of ['closed', 'closure', 'connectNulls', 'cornerRadius', 'marks'] as const) {
        if (properties[field] !== undefined) issue(['properties', field], `Ribbon cannot use ${field}`);
      }
      if (mark.encodings.cornerRadius !== undefined)
        issue(['encodings', 'cornerRadius'], 'Ribbon cannot use cornerRadius');
      for (const label of labels)
        if (typeof label !== 'string' && ('interrupt' in label || 'gap' in label))
          issue(['properties', 'label'], 'Ribbon labels cannot interrupt the path');
      mark.encodings.steps?.forEach((step, index) => {
        if ('label' in step && step.label !== undefined)
          issue(['encodings', 'steps', index, 'label'], 'Ribbon cannot use step labels');
      });
    }
    if (mark.encodings.steps === undefined) return;
    for (const field of ['curve', 'closure', 'closed', 'connectNulls', 'interpolation', 'connection'] as const) {
      if (mark.properties?.[field] !== undefined)
        context.addIssue({
          code: 'custom',
          path: ['properties', field],
          message: `Explicit steps cannot use ${field}`,
        });
    }
  })
  .transform(mark => {
    if (mark.encodings.steps !== undefined) return mark;
    if (mark.properties === undefined || mark.properties.connection !== undefined) return mark;
    const referencesMark =
      mark.encodings.from !== undefined && ('mark' in mark.encodings.from || 'mark' in mark.encodings.to);
    return {
      ...mark,
      properties: {
        ...mark.properties,
        connection: referencesMark ? CoordinateConnection.Straight : CoordinateConnection.Coordinate,
      },
    };
  })
  .describe('Data path mark; segment appearance uses its first row');

/** PathMark 闭合策略配置 */
export type IRPlotPathClosure = ZodInfer<typeof PathClosureSchema>;

/** path mark（折线 / 轮廓） */
export type IRPlotPathMark = ZodInfer<typeof PathMarkSchema>;
