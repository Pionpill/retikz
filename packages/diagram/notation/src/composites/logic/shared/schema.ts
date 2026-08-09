import {
  AnchorRefSchema,
  BoundarySchema,
  BoxSpacingSchema,
  ChildSchema,
  DrawableStyleSchema,
  PathBaseSchema,
  PositionSchema,
  StepLabelSchema,
} from '@retikz/core';
import {
  LayoutArtifactItemBaseSchema,
  LayoutArtifactRectSchema,
  LayoutOverflowSchema,
  LayoutSizeSchema,
} from '@retikz/layout';
import { z } from 'zod';

import {
  CalloutSide,
  ConnectorBendDirection,
  ConnectorOrthogonalPattern,
  ConnectorRouteKind,
  LogicCompositeType,
  NOTATION_NAMESPACE,
} from './constants';

/** Non-empty and non-whitespace authored identifier */
export const NonBlankStringSchema = z.string().refine(value => value.trim().length > 0, {
  message: 'String must contain at least one non-whitespace character.',
});

const LogicTargetFields = {
  id: NonBlankStringSchema.describe('Stable authored target identity.'),
  anchor: AnchorRefSchema.optional().describe('Optional anchor resolved by the consuming Core path or placement.'),
  offset: PositionSchema.optional().describe('World-space offset applied after target anchor resolution.'),
};

const LogicObjectTargetSchema = z.strictObject(LogicTargetFields).describe('Reference to a regular authored target.');

const LogicFrameTargetSchema = z
  .strictObject({
    kind: z.literal('logicFrame').describe('Discriminator for a LogicFrame target.'),
    ...LogicTargetFields,
    section: NonBlankStringSchema.optional().describe('Authored LogicFrame section key, if available.'),
  })
  .describe('Reference to a LogicFrame identity and optional authored section.');

/** Stable target reference used by Connector endpoints and Callout placement */
export const LogicDiagramTargetSchema = z
  .union([LogicObjectTargetSchema, LogicFrameTargetSchema])
  .describe('Stable target reference used by Connector endpoints and Callout placement.');

/** Cartesian point or stable authored target reference */
export const LogicDiagramPointSchema = z
  .union([PositionSchema, LogicDiagramTargetSchema])
  .describe('Cartesian point or stable authored target reference.');

/** Uniform or side-specific non-negative spacing */
export const LogicSpacingSchema = z
  .union([z.number().nonnegative(), BoxSpacingSchema])
  .describe('Uniform or side-specific non-negative spacing.');

const NeutralStyleDefault = { fill: 'transparent', stroke: 'currentColor', strokeWidth: 1, opacity: 1 } as const;

/** Neutral style defaults retained by LogicFrame and content shells */
export const LogicNeutralStyleSchema = DrawableStyleSchema.extend({
  fill: DrawableStyleSchema.shape.fill.default('transparent'),
  stroke: DrawableStyleSchema.shape.stroke.default('currentColor'),
  strokeWidth: DrawableStyleSchema.shape.strokeWidth.default(1),
  opacity: DrawableStyleSchema.shape.opacity.default(1),
});

/** Legacy-compatible appearance vocabulary for remaining layout composites */
export const LogicUnitAppearanceBaseShape = {
  size: LayoutSizeSchema.optional(),
  padding: LogicSpacingSchema.optional(),
  overflow: LayoutOverflowSchema.optional(),
  shape: z.string().min(1).optional(),
  boundary: BoundarySchema.optional(),
  style: DrawableStyleSchema.optional(),
  zIndex: z.number().int().optional(),
} as const;

export const LogicUnitAppearanceSchema = z
  .strictObject(LogicUnitAppearanceBaseShape)
  .describe('Appearance, sizing, and boundary overrides for one content shell.');

/** LogicFrame outline appearance */
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
  .describe('Outline-only appearance override for a LogicFrame shell or divider.');

export const LogicOutlineAppearanceCanonicalSchema = LogicOutlineAppearanceSchema.extend({
  stroke: LogicOutlineAppearanceSchema.shape.stroke.default('currentColor'),
  strokeWidth: LogicOutlineAppearanceSchema.shape.strokeWidth.default(1),
  opacity: LogicOutlineAppearanceSchema.shape.opacity.default(1),
});

/** Core Path appearance shared by Connector and Callout leader */
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

/** LogicFrame region input */
export const LogicFrameRegionSchema = z
  .strictObject({
    child: ChildSchema.describe('JSON-safe child laid out inside the region.'),
    padding: LogicSpacingSchema.optional().describe('Region-local padding overriding the block default.'),
  })
  .describe('One optional header or authored section region.');

/** LogicFrame section input */
export const LogicFrameSectionSchema = z
  .strictObject({
    key: NonBlankStringSchema.describe('Stable authored section identity local to the block.'),
    role: NonBlankStringSchema.optional().describe('Open authored section role preserved without dispatch.'),
    child: ChildSchema.describe('JSON-safe child laid out inside the section.'),
    padding: LogicSpacingSchema.optional().describe('Section-local padding overriding the block default.'),
  })
  .describe('One authored LogicFrame section.');

export const LogicNeutralStyle = NeutralStyleDefault;
export const LogicContentSizeDefault = { x: { kind: 'content' }, y: { kind: 'content' } } as const;

/** Notation 复合元素外壳可用的严格几何联合 */
export const LogicOuterArtifactSchema = z
  .strictObject({
    allocationBounds: LayoutArtifactRectSchema.describe('Resolved outer allocation rectangle.'),
    shellVisualBounds: LayoutArtifactRectSchema.nullable().describe('Outer shell visual bounds, or null when absent.'),
    visualBounds: LayoutArtifactRectSchema.describe('Union of shell, content, and component decoration bounds.'),
    visibleBounds: LayoutArtifactRectSchema.nullable().describe('Visible union bounds, or null when no area remains.'),
  })
  .describe('Strict geometry union for a Notation composite outer shell.');

export const LogicLayoutItemArtifactSchema = z
  .strictObject(LayoutArtifactItemBaseSchema.omit({ key: true, sourceIndex: true }).shape)
  .describe('Strict content placement artifact without container-owned key or source index.');

export const ConnectorRouteKindSchema = z.enum(ConnectorRouteKind).describe('Connector route variant discriminator.');
export const ConnectorOrthogonalPatternSchema = z
  .enum(ConnectorOrthogonalPattern)
  .describe('Orthogonal route direction pattern.');
export const ConnectorBendDirectionSchema = z.enum(ConnectorBendDirection).describe('Bend side direction.');
export const CalloutSideSchema = z.enum(CalloutSide).describe('Explicit Callout placement side.');
export const LogicGeometryLabelSchema = StepLabelSchema.describe('Core step label input for a Connector.');

export { LogicCompositeType, NOTATION_NAMESPACE };
