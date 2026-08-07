import {
  AnchorRefSchema,
  BoundarySchema,
  BoxSpacingSchema,
  ChildSchema,
  DrawableStyleSchema,
  PathBaseSchema,
  PositionSchema,
  ShapeRefSchema,
  StepLabelSchema,
  StrokeDashOffsetSchema,
  StrokeDashPatternSchema,
} from '@retikz/core';
import { z } from 'zod';

import {
  LayoutArtifactItemBaseSchema,
  LayoutArtifactRectSchema,
  LayoutOverflowSchema,
  LayoutSizeSchema,
} from '../../layout/shared';
import { STANDARD_NAMESPACE } from '../../shared';
import {
  CalloutSide,
  ConnectorBendDirection,
  ConnectorOrthogonalPattern,
  ConnectorRouteKind,
  LogicCompositeType,
  TerminalRole,
} from './constants';

/** 非空且不接受仅由空白组成的作者字符串 */
export const NonBlankStringSchema = z.string().refine(value => value.trim().length > 0, {
  message: 'String must contain at least one non-whitespace character.',
});

/** Standard 逻辑组件的稳定 JSON target */
const LogicTargetFields = {
  id: NonBlankStringSchema.describe('Stable authored target identity.'),
  anchor: AnchorRefSchema.optional().describe('Optional anchor resolved by the consuming Core path or placement.'),
  offset: PositionSchema.optional().describe('World-space offset applied after target anchor resolution.'),
};

const LogicObjectTargetSchema = z
  .strictObject(LogicTargetFields)
  .describe('Reference to a regular authored Standard or Core target by stable id.');

const LogicBlockTargetSchema = z
  .strictObject({
    kind: z.literal('logicBlock').describe('Discriminator for a LogicBlockBase target.'),
    ...LogicTargetFields,
    section: NonBlankStringSchema.optional().describe('Authored LogicBlockBase section key, if available.'),
  })
  .describe('Reference to a LogicBlockBase identity and optional authored section.');

/** 逻辑图组件公开的整体或普通 target union */
export const LogicDiagramTargetSchema = z
  .union([LogicObjectTargetSchema, LogicBlockTargetSchema])
  .describe('Stable target reference used by Connector endpoints and Callout placement.');

/** 逻辑图端点或显式折点 */
export const LogicDiagramPointSchema = z
  .union([PositionSchema, LogicDiagramTargetSchema])
  .describe('Cartesian point or stable authored target reference.');

/** 逻辑组件使用的统一非负 spacing 输入 */
export const LogicSpacingSchema = z
  .union([z.number().nonnegative(), BoxSpacingSchema])
  .describe('Uniform or side-specific non-negative spacing.');

const NeutralStyleDefault = {
  fill: 'transparent',
  stroke: 'currentColor',
  strokeWidth: 1,
  opacity: 1,
} as const;

/** 逻辑语义单元的中性样式与规范字段默认值 */
export const LogicNeutralStyleSchema = DrawableStyleSchema.extend({
  fill: DrawableStyleSchema.shape.fill.default('transparent'),
  stroke: DrawableStyleSchema.shape.stroke.default('currentColor'),
  strokeWidth: DrawableStyleSchema.shape.strokeWidth.default(1),
  opacity: DrawableStyleSchema.shape.opacity.default(1),
});

/** 逻辑单元共用的 neutral appearance schema */
export const LogicUnitAppearanceBaseShape = {
  size: LayoutSizeSchema.optional(),
  padding: LogicSpacingSchema.optional(),
  overflow: LayoutOverflowSchema.optional(),
  shape: z.union([z.string().min(1), ShapeRefSchema]).optional(),
  boundary: BoundarySchema.optional(),
  style: DrawableStyleSchema.optional(),
  dashPattern: StrokeDashPatternSchema.optional(),
  dashOffset: StrokeDashOffsetSchema.optional(),
  zIndex: z.number().int().optional(),
} as const;

/** 逻辑单元的完整外观覆盖契约 */
export const LogicUnitAppearanceSchema = z
  .strictObject(LogicUnitAppearanceBaseShape)
  .describe('Appearance, sizing, and boundary overrides for one semantic logic unit.');

/** 逻辑块 divider 可用的 Core outline 样式字段 */
export const LogicOutlineAppearanceSchema = z
  .strictObject({
    color: PathBaseSchema.shape.color,
    stroke: PathBaseSchema.shape.stroke,
    strokeWidth: PathBaseSchema.shape.strokeWidth,
    strokeOpacity: PathBaseSchema.shape.strokeOpacity,
    opacity: PathBaseSchema.shape.opacity,
    dashPattern: PathBaseSchema.shape.dashPattern,
    dashOffset: PathBaseSchema.shape.dashOffset,
    lineCap: PathBaseSchema.shape.lineCap,
    lineJoin: PathBaseSchema.shape.lineJoin,
  })
  .describe('Outline-only appearance override for a LogicBlockBase shell or divider.');

/** LogicBlockBase 轮廓外观与规范描边默认值 */
export const LogicOutlineAppearanceCanonicalSchema = LogicOutlineAppearanceSchema.extend({
  stroke: LogicOutlineAppearanceSchema.shape.stroke.default('currentColor'),
  strokeWidth: LogicOutlineAppearanceSchema.shape.strokeWidth.default(1),
  opacity: LogicOutlineAppearanceSchema.shape.opacity.default(1),
});

/** Connector 与 Callout leader 共用的 Core Path appearance 白名单 */
export const ConnectorAppearanceSchema = z
  .strictObject({
    color: PathBaseSchema.shape.color,
    stroke: PathBaseSchema.shape.stroke,
    strokeWidth: PathBaseSchema.shape.strokeWidth,
    strokeOpacity: PathBaseSchema.shape.strokeOpacity,
    opacity: PathBaseSchema.shape.opacity,
    shadow: PathBaseSchema.shape.shadow,
    blendMode: PathBaseSchema.shape.blendMode,
    dashPattern: PathBaseSchema.shape.dashPattern,
    dashOffset: PathBaseSchema.shape.dashOffset,
    lineCap: PathBaseSchema.shape.lineCap,
    lineJoin: PathBaseSchema.shape.lineJoin,
    roundedCorners: PathBaseSchema.shape.roundedCorners,
    marks: PathBaseSchema.shape.marks,
    zIndex: PathBaseSchema.shape.zIndex,
  })
  .describe('Core Path stroke, decoration, and stacking appearance fields allowed for a Connector.');

/** LogicBlockBase 的通用 region 输入 */
export const LogicBlockRegionSchema = z
  .strictObject({
    child: ChildSchema.describe('JSON-safe child laid out inside the region.'),
    padding: LogicSpacingSchema.optional().describe('Region-local padding overriding the block default.'),
  })
  .describe('One optional header or authored section region.');

/** LogicBlockBase 的 authored section 输入 */
export const LogicBlockSectionSchema = z
  .strictObject({
    key: NonBlankStringSchema.describe('Stable authored section identity local to the block.'),
    role: NonBlankStringSchema.optional().describe('Open authored section role preserved without dispatch.'),
    child: ChildSchema.describe('JSON-safe child laid out inside the section.'),
    padding: LogicSpacingSchema.optional().describe('Section-local padding overriding the block default.'),
  })
  .describe('One authored LogicBlockBase section.');

/** 逻辑单元外观的中性默认值，供各组件 schema 组合 */
export const LogicNeutralStyle = NeutralStyleDefault;

/** 逻辑单元尺寸默认值 */
export const LogicContentSizeDefault = { x: { kind: 'content' }, y: { kind: 'content' } } as const;

/** 逻辑组件的 strict outer artifact */
export const LogicOuterArtifactSchema = z
  .strictObject({
    allocationBounds: LayoutArtifactRectSchema.describe('Resolved outer allocation rectangle.'),
    shellVisualBounds: LayoutArtifactRectSchema.nullable().describe('Outer shell visual bounds, or null when absent.'),
    visualBounds: LayoutArtifactRectSchema.describe('Union of shell, content, and component decoration bounds.'),
    visibleBounds: LayoutArtifactRectSchema.nullable().describe('Visible union bounds, or null when no area remains.'),
  })
  .describe('Strict geometry union for a Standard logic composite outer shell.');

/** 单一逻辑 region / content 的 placement artifact，不复制 layout item identity */
export const LogicLayoutItemArtifactSchema = z
  .strictObject(LayoutArtifactItemBaseSchema.omit({ key: true, sourceIndex: true }).shape)
  .describe('Strict content placement artifact without container-owned key or source index.');

/** 逻辑单元 role 枚举 schema */
export const TerminalRoleSchema = z.enum(TerminalRole).describe('Closed Terminal role discriminator.');

/** Connector route kind schema */
export const ConnectorRouteKindSchema = z.enum(ConnectorRouteKind).describe('Connector route variant discriminator.');

/** Connector orthogonal pattern schema */
export const ConnectorOrthogonalPatternSchema = z
  .enum(ConnectorOrthogonalPattern)
  .describe('Orthogonal route direction pattern.');

/** Connector bend direction schema */
export const ConnectorBendDirectionSchema = z.enum(ConnectorBendDirection).describe('Bend side direction.');

/** Callout placement side schema */
export const CalloutSideSchema = z.enum(CalloutSide).describe('Explicit Callout placement side.');

/** Connector 复用的 Core step label schema */
export const LogicGeometryLabelSchema = StepLabelSchema.describe('Core step label input for a Connector.');

export { LogicCompositeType, STANDARD_NAMESPACE };
