import { AnchorRefSchema, PathBaseSchema, PositionSchema } from '@retikz/core';
import { z } from 'zod';

import { LogicCompositeType, NonBlankStringSchema } from '../../shared';

const LogicTargetFields = {
  id: NonBlankStringSchema.describe('Stable authored target identity.'),
  anchor: AnchorRefSchema.optional().describe('Optional anchor resolved by the consuming Core path or placement.'),
  offset: PositionSchema.optional().describe('World-space offset applied after target anchor resolution.'),
};

const LogicObjectTargetSchema = z.strictObject(LogicTargetFields).describe('Reference to a regular authored target.');

const LogicFrameTargetSchema = z
  .strictObject({
    kind: z.literal(LogicCompositeType.LogicFrame).describe('Discriminator for a LogicFrame target.'),
    ...LogicTargetFields,
    section: NonBlankStringSchema.optional().describe('Authored LogicFrame section key, if available.'),
  })
  .describe('Reference to a LogicFrame identity and optional authored section.');

/** Connector 端点和 Callout 放置使用的稳定目标引用 */
export const LogicDiagramTargetSchema = z
  .union([LogicObjectTargetSchema, LogicFrameTargetSchema])
  .describe('Stable target reference used by Connector endpoints and Callout placement.');

/** 笛卡尔坐标点或稳定的编写目标引用 */
export const LogicDiagramPointSchema = z
  .union([PositionSchema, LogicDiagramTargetSchema])
  .describe('Cartesian point or stable authored target reference.');

/** Connector 和 Callout 引导线共享的 Core Path 外观 */
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
