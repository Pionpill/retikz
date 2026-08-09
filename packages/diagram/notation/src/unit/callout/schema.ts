import { AnchorRefSchema, ChildSchema, PathBaseSchema, PositionSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { LayoutArtifactContainerSchema, LayoutArtifactRectSchema } from '@retikz/layout';
import { z } from 'zod';

import {
  LogicLayoutItemArtifactSchema,
  LogicOuterArtifactSchema,
  NOTATION_NAMESPACE,
  NotationElementType,
} from '../../shared';
import { LogicContentShellAppearanceSchema } from '../internal/content-shell';
import { CalloutSide } from './constants';

const LogicTargetFields = {
  id: NonBlankStringSchema.describe('Stable authored target identity.'),
  anchor: AnchorRefSchema.optional().describe('Optional anchor resolved by Callout placement.'),
  offset: PositionSchema.optional().describe('World-space offset applied after target anchor resolution.'),
};

const LogicObjectTargetSchema = z.strictObject(LogicTargetFields).describe('Reference to a regular authored target.');

const LogicFrameTargetSchema = z
  .strictObject({
    kind: z.literal(NotationElementType.LogicFrame).describe('Discriminator for a LogicFrame target.'),
    ...LogicTargetFields,
    section: NonBlankStringSchema.optional().describe('Authored LogicFrame section key, if available.'),
  })
  .describe('Reference to a LogicFrame identity and optional authored section.');

/** Callout 放置使用的稳定目标引用 */
export const LogicDiagramTargetSchema = z
  .union([LogicObjectTargetSchema, LogicFrameTargetSchema])
  .describe('Stable target reference used by Callout placement.');

/** Callout 引导线使用的 Core Path 外观 */
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
  .describe('Core Path stroke, decoration, and stacking appearance fields allowed for a Callout leader.');

export const CalloutSideSchema = z.enum(CalloutSide).describe('Explicit Callout placement side.');

const CalloutLeaderAppearanceSchema = ConnectorAppearanceSchema.extend({
  stroke: ConnectorAppearanceSchema.shape.stroke.default('currentColor'),
  strokeWidth: ConnectorAppearanceSchema.shape.strokeWidth.default(1),
  roundedCorners: ConnectorAppearanceSchema.shape.roundedCorners.default(0),
  zIndex: ConnectorAppearanceSchema.shape.zIndex.default(0),
});

/** Callout 的显式放置输入 */
export const CalloutPlacementSchema = z
  .strictObject({
    side: CalloutSideSchema,
    gap: NonNegativeNumberSchema.default(8),
    offset: z.number().default(0),
  })
  .describe('Explicit Callout side, normal gap, and tangent offset.');

const CalloutResolvedPlacementSchema = z
  .strictObject({
    side: CalloutSideSchema.describe('Resolved Callout placement side.'),
    gap: NonNegativeNumberSchema.describe('Resolved non-negative normal gap.'),
    offset: z.number().describe('Resolved signed tangent offset.'),
  })
  .describe('Strict resolved Callout placement with all canonical fields present.');

const CalloutShape = {
  namespace: z.literal(NOTATION_NAMESPACE).describe('Notation composite namespace.'),
  type: z.literal(NotationElementType.Callout).describe('Callout composite discriminator.'),
  id: NonBlankStringSchema.describe('Stable authored Callout identity.'),
  target: LogicDiagramTargetSchema.describe('Whole-target or authored section target.'),
  content: ChildSchema.describe('JSON-safe Callout content.'),
  placement: CalloutPlacementSchema,
  leader: z
    .union([z.literal(false), CalloutLeaderAppearanceSchema])
    .default({ stroke: 'currentColor', strokeWidth: 1, roundedCorners: 0, zIndex: 0 })
    .describe('Optional leader appearance, or false to disable the leader.'),
  appearance: LogicContentShellAppearanceSchema.default({
    size: { x: { kind: 'content' }, y: { kind: 'content' } },
    padding: 8,
    overflow: 'visible',
    shape: { type: 'rectangle', params: { cornerRadius: 8 } },
    boundary: 'shape',
    style: { fill: 'transparent', stroke: 'currentColor', strokeWidth: 1, opacity: 1 },
    zIndex: 0,
  }).describe('Stage-like Callout content shell appearance.'),
} as const;

/** Callout 的 JSON 安全规范模式 */
export const CalloutSchema = z.strictObject(CalloutShape).describe('Canonical JSON-safe Notation Callout composite.');

const CalloutLeaderArtifactSchema = z
  .strictObject({
    from: PositionSchema.describe('Leader start point in Callout allocation coordinates.'),
    to: PositionSchema.describe('Leader end point in Callout allocation coordinates.'),
    visualBounds: LayoutArtifactRectSchema.describe('Leader visual bounds in Callout allocation coordinates.'),
  })
  .describe('Resolved Callout leader geometry.');

/** Callout 的 JSON 安全严格编译产物 */
export const CalloutArtifactSchema = z
  .strictObject({
    kind: z.literal('callout').describe('Callout artifact discriminator.'),
    id: NonBlankStringSchema.describe('Stable authored Callout identity.'),
    target: LogicDiagramTargetSchema.describe('Authored Callout target preserved in the artifact.'),
    placement: CalloutResolvedPlacementSchema.describe('Resolved Callout placement values.'),
    outer: LogicOuterArtifactSchema,
    container: LayoutArtifactContainerSchema,
    content: LogicLayoutItemArtifactSchema,
    leader: CalloutLeaderArtifactSchema.nullable().describe('Resolved leader geometry, or null when disabled.'),
  })
  .describe('Strict JSON-safe Callout compile artifact payload.');
