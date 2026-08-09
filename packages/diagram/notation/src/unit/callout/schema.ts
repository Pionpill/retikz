import { ChildSchema, PositionSchema } from '@retikz/core';
import { LayoutArtifactContainerSchema, LayoutArtifactRectSchema } from '@retikz/standard/layout';
import { z } from 'zod';

import { LogicContentShellAppearanceSchema } from '../internal/content-shell';
import {
  CalloutSideSchema,
  ConnectorAppearanceSchema,
  LogicCompositeType,
  LogicDiagramTargetSchema,
  LogicLayoutItemArtifactSchema,
  LogicOuterArtifactSchema,
  NonBlankStringSchema,
  NOTATION_NAMESPACE,
} from '../shared';

const CalloutLeaderAppearanceSchema = ConnectorAppearanceSchema.extend({
  stroke: ConnectorAppearanceSchema.shape.stroke.default('currentColor'),
  strokeWidth: ConnectorAppearanceSchema.shape.strokeWidth.default(1),
  roundedCorners: ConnectorAppearanceSchema.shape.roundedCorners.default(0),
  zIndex: ConnectorAppearanceSchema.shape.zIndex.default(0),
});

/** Callout 的显式 placement 输入 */
export const CalloutPlacementSchema = z
  .strictObject({
    side: CalloutSideSchema,
    gap: z.number().nonnegative().default(8),
    offset: z.number().default(0),
  })
  .describe('Explicit Callout side, normal gap, and tangent offset.');

const CalloutResolvedPlacementSchema = z
  .strictObject({
    side: CalloutSideSchema.describe('Resolved Callout placement side.'),
    gap: z.number().nonnegative().describe('Resolved non-negative normal gap.'),
    offset: z.number().describe('Resolved signed tangent offset.'),
  })
  .describe('Strict resolved Callout placement with all canonical fields present.');

const CalloutShape = {
  namespace: z.literal(NOTATION_NAMESPACE).describe('Notation composite namespace.'),
  type: z.literal(LogicCompositeType.Callout).describe('Callout composite discriminator.'),
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

/** Callout canonical JSON-safe schema */
export const CalloutSchema = z.strictObject(CalloutShape).describe('Canonical JSON-safe Notation Callout composite.');

const CalloutLeaderArtifactSchema = z
  .strictObject({
    from: PositionSchema.describe('Leader start point in Callout allocation coordinates.'),
    to: PositionSchema.describe('Leader end point in Callout allocation coordinates.'),
    visualBounds: LayoutArtifactRectSchema.describe('Leader visual bounds in Callout allocation coordinates.'),
  })
  .describe('Resolved Callout leader geometry.');

/** Callout strict JSON-safe compile artifact */
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
