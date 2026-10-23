import {
  BendDirection,
  FoldStepVia,
  PathDecorationSchema,
  PathFillSchema,
  PathGeometrySchema,
  PathStrokeSchema,
  PositionSchema,
  StepLabelSchema,
} from '@retikz/core';
import { CenterlineRibbonPathOptionsSchema, TaperRibbonWidthSchema } from '@retikz/extension';
import type { ValueOf } from '@retikz/foundation';
import { NonBlankStringSchema, PositiveNumberSchema } from '@retikz/foundation';
import { array, discriminatedUnion, enum as zodEnum, literal, number, strictObject } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { PolarInterpolation } from '../coordinate';
import { ChannelSchema, PathEncodingSchema, VisualEncodingSchema } from '../encoding';
import { PlotTargetEncodingSchema, PlotTargetRefSchema } from './anchor';
import { PointAutoPaddingSchema } from './auto-padding';
import { BuiltinPlotMark, MarkTransformSchema, markBase } from './base';
import { MarkPathLabelListSchema } from './label';
import { PointPropertiesSchema } from './point';
import {
  MarkBlendModeStyleSchema,
  MarkOpacityStyleSchema,
  MarkColorStyleSchema,
  MarkFillStyleSchema,
  MarkNonnegativeNumberStyleSchema,
  MarkStrokeStyleSchema,
  MarkZIndexStyleSchema,
  MarkShadowStyleSchema,
} from './style';

/** 关系图元采用的路径或带状几何形态 */
export const RelationGeometryKind = {
  Path: 'path',
  Ribbon: 'ribbon',
} as const;

/** relation 显式路由支持的 core step 类型 */
export const RelationRouteStepKind = {
  /** 移动到目标但不绘制 */
  Move: 'move',
  /** 绘制直线段 */
  Line: 'line',
  /** 绘制正交折线段 */
  Fold: 'fold',
  /** 绘制二次 Bezier 曲线 */
  Curve: 'curve',
  /** 绘制三次 Bezier 曲线 */
  Cubic: 'cubic',
  /** 绘制 bend 曲线 */
  Bend: 'bend',
} as const;

/** relation 自动路由策略类型 */
export const RelationRoutingKind = {
  /** 以直线连接相邻目标 */
  Line: 'line',
  /** 以 bend 曲线连接相邻目标 */
  Bend: 'bend',
  /** 以正交折线连接相邻目标 */
  Orthogonal: 'orthogonal',
} as const;

/** relation 正交路由标签落点策略 */
export const RelationOrthogonalLabelStep = {
  /** 放到最长的主线段 */
  Main: 'main',
  /** 放到最后一个可绘制线段 */
  Last: 'last',
} as const;

/** RelationMark 几何子类型值 */
export type RelationGeometryKind = ValueOf<typeof RelationGeometryKind>;

/** relation 显式路由支持的 core step 类型取值 */
export type RelationRouteStepKind = ValueOf<typeof RelationRouteStepKind>;

/** relation 自动路由策略类型取值 */
export type RelationRoutingKind = ValueOf<typeof RelationRoutingKind>;

/** relation 正交路由标签落点策略取值 */
export type RelationOrthogonalLabelStep = ValueOf<typeof RelationOrthogonalLabelStep>;

/** 复用标记局部变换规则，校验关系标记的数据变换序列 */
export const RelationTransformSchema = MarkTransformSchema;

/** 校验关系路径步骤标签的固定配置 */
export const RelationStepLabelSchema = StepLabelSchema.extend({
  text: StepLabelSchema.shape.text.optional(),
}).describe('Fixed step label properties; field text is supplied by the corresponding encoding');

/** 校验仅供普通路径关系使用的 Core Path 选项 */
export const RelationPathSpecificOptionsSchema = strictObject({
  style: strictObject({
    dashPattern: PathStrokeSchema.shape.dashPattern,
    fillRule: PathFillSchema.shape.fillRule,
    lineCap: PathStrokeSchema.shape.lineCap,
    lineJoin: PathStrokeSchema.shape.lineJoin,
  })
    .partial()
    .describe('Path-only dash, fill rule, cap and join overrides'),
  roundedCorners: PathGeometrySchema.shape.roundedCorners,
  rotate: PathGeometrySchema.shape.rotate,
  scale: PathGeometrySchema.shape.scale,
  marks: PathDecorationSchema.shape.marks,
})
  .partial()
  .describe('Core Path options used only when RelationMark kind is path');

/** 校验可降低为 Core 路径步骤的关系路由动作 */
export const RelationRouteStepSchema = strictObject({
  kind: zodEnum(RelationRouteStepKind).describe('Core path step kind for this relation route segment'),
  to: PlotTargetRefSchema.optional().describe(
    'Target for this step; omitted on the last drawable step defaults to RelationMark.target',
  ),
  via: zodEnum(FoldStepVia).optional().describe('Fold direction for kind=fold'),
  control: PositionSchema.optional().describe('Quadratic Bezier control point for kind=curve'),
  control1: PositionSchema.optional().describe('First cubic Bezier control point for kind=cubic'),
  control2: PositionSchema.optional().describe('Second cubic Bezier control point for kind=cubic'),
  bendDirection: zodEnum(BendDirection).optional().describe('Bend direction for kind=bend'),
  bendAngle: number().gt(-180).lt(180).optional().describe('Bend angle for kind=bend'),
  outAngle: number().optional().describe('Outgoing angle for kind=bend'),
  inAngle: number().optional().describe('Incoming angle for kind=bend'),
  looseness: PositiveNumberSchema.optional().describe('Curve looseness for kind=bend'),
  label: RelationStepLabelSchema.optional().describe('Optional label attached to this drawable step'),
}).describe('Relation route step lowered to a core path step');

const RelationLineRoutingSchema = strictObject({
  kind: literal(RelationRoutingKind.Line).describe(
    'Discriminator: connect source, via points, and target with straight line steps',
  ),
}).describe('Line relation routing strategy');

const RelationBendRoutingSchema = strictObject({
  kind: literal(RelationRoutingKind.Bend).describe('Discriminator: connect each segment with a core bend step'),
  bendDirection: zodEnum(BendDirection).optional().describe('Bend side relative to each relation segment'),
  bendAngle: number().gt(-180).lt(180).optional().describe('Bend angle in degrees for each relation segment'),
  outAngle: number().optional().describe('Outgoing angle in degrees for bend routing'),
  inAngle: number().optional().describe('Incoming angle in degrees for bend routing'),
  looseness: PositiveNumberSchema.optional().describe('Curve looseness factor for bend routing'),
}).describe('Bend relation routing strategy');

/** 关系标记算法式正交路由支持的两段折线方向 */
const RelationOrthogonalRoutingVia = {
  HorizontalThenVertical: FoldStepVia.HorizontalThenVertical,
  VerticalThenHorizontal: FoldStepVia.VerticalThenHorizontal,
} as const;

const RelationOrthogonalRoutingSchema = strictObject({
  kind: literal(RelationRoutingKind.Orthogonal).describe(
    'Discriminator: connect each segment with right-angle orthogonal line steps',
  ),
  via: zodEnum(RelationOrthogonalRoutingVia)
    .optional()
    .describe('Orthogonal direction: -| first horizontal then vertical; |- first vertical then horizontal'),
  labelStep: zodEnum(RelationOrthogonalLabelStep)
    .optional()
    .describe('Which generated drawable step receives the shorthand relation label; default main'),
})
  .superRefine((routing, ctx) => {
    if (routing.via === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['via'],
        message: 'orthogonal relation routing requires via',
      });
    }
  })
  .describe('Orthogonal relation routing strategy');

/** 校验端点引用解析后生成 Core 步骤的关系路由策略 */
export const RelationRoutingSchema = discriminatedUnion('kind', [
  RelationLineRoutingSchema,
  RelationBendRoutingSchema,
  RelationOrthogonalRoutingSchema,
]).describe('Relation route strategy lowered to core Path steps after source and target refs are resolved');

/** 校验各关系路径种类共用的图元视觉样式 */
export const RelationPrimitiveStyleSchema = strictObject({
  color: MarkColorStyleSchema.optional().describe('Shared relation master color: fixed color'),
  fill: MarkFillStyleSchema.optional().describe('Shared relation fill paint: fixed CSS color / IRPaint'),
  stroke: MarkStrokeStyleSchema.optional().describe('Shared relation stroke paint: fixed CSS color / IRPaint'),
  strokeWidth: MarkNonnegativeNumberStyleSchema.optional().describe(
    'Shared relation stroke width: fixed non-negative value',
  ),
  opacity: MarkOpacityStyleSchema.optional(),
  shadow: MarkShadowStyleSchema.optional().describe('Shared relation shadow: fixed preset / object'),
  blendMode: MarkBlendModeStyleSchema.optional().describe('Shared relation blendMode: fixed blend mode'),
  zIndex: MarkZIndexStyleSchema.optional().describe('Shared relation zIndex: fixed integer'),
}).describe('Style fields shared by RelationMark path kinds');

/** Relation projected target 可选端点 glyph 的封闭 Point 表现字段 */
export const RelationEndpointGlyphSchema = strictObject({
  ...PointPropertiesSchema.pick({
    color: true,
    size: true,
    shape: true,
    fill: true,
    stroke: true,
    strokeWidth: true,
    opacity: true,
    rotate: true,
    minimumSize: true,
  }).shape,
}).describe('Constant Point glyph appearance emitted at a projected Relation endpoint');

/** Relation source / target 的可选端点 glyph 配置 */
export const RelationEndpointGlyphsSchema = strictObject({
  source: RelationEndpointGlyphSchema.optional(),
  target: RelationEndpointGlyphSchema.optional(),
})
  .refine(endpoints => endpoints.source !== undefined || endpoints.target !== undefined, {
    message: 'relation endpoints require source or target glyph configuration',
  })
  .describe('Optional source and target glyphs emitted atomically with a projected Relation row');

/** 校验普通路径关系的插值、路由、标签与路径选项 */
export const RelationPathGeometrySchema = strictObject({
  interpolation: zodEnum(PolarInterpolation)
    .optional()
    .describe('Polar2D default projected-target path override; explicit route, routing, and ribbon do not consume it'),
  via: array(PlotTargetRefSchema)
    .optional()
    .describe('Optional intermediate waypoints; each projected waypoint may generate a core Coordinate'),
  route: array(RelationRouteStepSchema)
    .min(1)
    .optional()
    .describe('Explicit route steps after the initial move(source) step'),
  routing: RelationRoutingSchema.optional().describe(
    'Optional algorithmic route strategy; omitted means straight line routing',
  ),
  label: RelationStepLabelSchema.optional().describe(
    'Convenience label attached to the default route or the final drawable explicit route step',
  ),
  options: RelationPathSpecificOptionsSchema.optional().describe('Core Path options used only by path relations'),
})
  .superRefine((path, ctx) => {
    if (path.route !== undefined && path.routing !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['routing'],
        message: 'relation mark cannot use route and routing together; use explicit route steps or a routing strategy',
      });
    }

    if (path.via !== undefined && path.route !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['via'],
        message:
          'relation mark cannot use via and route together; encode waypoints as route steps when route is explicit',
      });
    }
  })
  .describe('Path geometry configuration for RelationMark');

/** 校验仅供带状关系使用的插值、对齐和采样选项 */
export const RelationRibbonSpecificOptionsSchema = strictObject({
  interpolation: TaperRibbonWidthSchema.shape.interpolation.unwrap().optional(),
  align: CenterlineRibbonPathOptionsSchema.shape.align.unwrap().optional(),
  sampling: CenterlineRibbonPathOptionsSchema.shape.sampling.unwrap().optional(),
}).describe('Extension Ribbon options used only by ribbon relations');

/** 校验带状关系的起止宽度及专属几何选项 */
export const RelationRibbonOptionsSchema = strictObject({
  width: MarkNonnegativeNumberStyleSchema.optional().describe(
    'Ribbon width at the source side, or the whole width when endWidth is omitted',
  ),
  endWidth: MarkNonnegativeNumberStyleSchema.optional().describe(
    'Optional ribbon width at the target side; set together with width for tapered ribbons',
  ),
  options: RelationRibbonSpecificOptionsSchema.optional().describe(
    'Core Path kind=ribbon options used only by ribbon relations',
  ),
}).describe('Ribbon geometry configuration for RelationMark');

/** 校验连接源与目标的关系标记，kind 决定普通描边或带状路径语义 */
export const RelationGeometrySchema = discriminatedUnion('kind', [
  RelationPathGeometrySchema.safeExtend({ kind: literal(RelationGeometryKind.Path) }),
  RelationRibbonOptionsSchema.safeExtend({ kind: literal(RelationGeometryKind.Ribbon) }),
]).describe('Relation path or ribbon construction');

/** 校验关系固定目标与几何属性 */
export const RelationPropertiesSchema = RelationPrimitiveStyleSchema.extend({
  source: PlotTargetRefSchema.optional(),
  target: PlotTargetRefSchema.optional(),
  geometry: RelationGeometrySchema,
  endpoints: RelationEndpointGlyphsSchema.optional(),
  autoPadding: PointAutoPaddingSchema.default(false).optional(),
  label: MarkPathLabelListSchema.optional().describe('Path-host label: lowered onto the generated core Path.label'),
});

/** 校验关系几何与目标中的字段依赖 */
export const RelationEncodingSchema = VisualEncodingSchema.extend({
  source: PlotTargetEncodingSchema.optional(),
  target: PlotTargetEncodingSchema.optional(),
  label: PathEncodingSchema.shape.label,
  geometry: strictObject({
    width: ChannelSchema.optional(),
    endWidth: ChannelSchema.optional(),
    via: array(PlotTargetEncodingSchema).optional(),
    route: array(
      strictObject({
        to: PlotTargetEncodingSchema.optional(),
        label: strictObject({ text: NonBlankStringSchema.optional() }).optional(),
      }),
    ).optional(),
    label: strictObject({ text: NonBlankStringSchema.optional() }).optional(),
  }).optional(),
});

/** 校验按记录连接目标的关系标记 */
export const RelationMarkSchema = strictObject({
  ...markBase,
  type: literal(BuiltinPlotMark.Relation),
  encodings: RelationEncodingSchema.optional(),
  properties: RelationPropertiesSchema,
})
  .superRefine((mark, ctx) => {
    const { properties, encodings } = mark;
    const geometry = properties.geometry;
    for (const role of ['source', 'target'] as const) {
      if (properties[role] === undefined && encodings?.[role] === undefined) {
        ctx.addIssue({ code: 'custom', path: ['properties', role], message: 'Relation requires both targets' });
      }
    }
    if (geometry.kind === 'ribbon') {
      if (geometry.width === undefined && encodings?.geometry?.width === undefined) {
        ctx.addIssue({ code: 'custom', path: ['properties', 'geometry', 'width'], message: 'Ribbon requires a width' });
      }
      if (
        geometry.options?.interpolation !== undefined &&
        geometry.endWidth === undefined &&
        encodings?.geometry?.endWidth === undefined
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['properties', 'geometry', 'options', 'interpolation'],
          message: 'Ribbon interpolation requires endWidth',
        });
      }
      for (const name of ['via', 'route', 'label'] as const) {
        if (encodings?.geometry?.[name] !== undefined) {
          ctx.addIssue({
            code: 'custom',
            path: ['encodings', 'geometry', name],
            message: 'Ribbon does not support path route encodings',
          });
        }
      }
    } else {
      for (const name of ['width', 'endWidth'] as const) {
        if (encodings?.geometry?.[name] !== undefined) {
          ctx.addIssue({
            code: 'custom',
            path: ['encodings', 'geometry', name],
            message: 'Path does not support ribbon width encodings',
          });
        }
      }
    }
    if (properties.endpoints === undefined) return;
    if (geometry.kind !== 'path') {
      ctx.addIssue({
        code: 'custom',
        path: ['properties', 'endpoints'],
        message: 'Endpoint glyphs require path geometry',
      });
      return;
    }
    if (
      geometry.via !== undefined ||
      geometry.route !== undefined ||
      encodings?.geometry?.via !== undefined ||
      encodings?.geometry?.route !== undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['properties', 'endpoints'],
        message: 'Endpoint glyphs cannot use via or route',
      });
    }
    for (const role of ['source', 'target'] as const) {
      const target = properties[role];
      const encoding = encodings?.[role];
      if (encoding?.position === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['properties', role],
          message: 'Endpoint glyphs require projected targets',
        });
      }
      if (
        (target !== undefined &&
          (('anchorId' in target && target.anchorId !== undefined) ||
            target.anchor !== undefined ||
            target.offset !== undefined ||
            target.boundary !== undefined)) ||
        encoding?.anchorId !== undefined
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['properties', role],
          message: 'Endpoint glyph targets cannot use anchor, offset, boundary or anchorId',
        });
      }
    }
  })
  .describe('Data relation mark');

/** relation 路由步骤标签声明 */
export type IRPlotRelationStepLabel = ZodInfer<typeof RelationStepLabelSchema>;

/** relation 路由中的单步声明 */
export type IRPlotRelationRouteStep = ZodInfer<typeof RelationRouteStepSchema>;

/** relation mark 的数据派生变换声明 */
export type IRPlotRelationTransform = ZodInfer<typeof RelationTransformSchema>;

/** relation mark 的路由策略声明 */
export type IRPlotRelationRouting = ZodInfer<typeof RelationRoutingSchema>;

/** relation primitive 的公共样式声明 */
export type IRPlotRelationPrimitiveStyle = ZodInfer<typeof RelationPrimitiveStyleSchema>;

/** Relation projected target 的端点 glyph 表现 */
export type IRPlotRelationEndpointGlyph = ZodInfer<typeof RelationEndpointGlyphSchema>;

/** Relation source / target 端点 glyph 配置 */
export type IRPlotRelationEndpointGlyphs = ZodInfer<typeof RelationEndpointGlyphsSchema>;

/** relation path 专属选项声明 */
export type IRPlotRelationPathSpecificOptions = ZodInfer<typeof RelationPathSpecificOptionsSchema>;

/** relation path 几何声明 */
export type IRPlotRelationPathGeometry = ZodInfer<typeof RelationPathGeometrySchema>;

/** relation ribbon 专属选项声明 */
export type IRPlotRelationRibbonSpecificOptions = ZodInfer<typeof RelationRibbonSpecificOptionsSchema>;

/** relation ribbon 几何选项声明 */
export type IRPlotRelationRibbonOptions = ZodInfer<typeof RelationRibbonOptionsSchema>;

/** relation mark 声明 */
export type IRPlotRelationMark = ZodInfer<typeof RelationMarkSchema>;
