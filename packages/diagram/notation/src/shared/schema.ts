import { BoxSpacingSchema, DrawableStyleSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { LayoutArtifactItemBaseSchema, LayoutArtifactRectSchema } from '@retikz/layout';
import { z } from 'zod';

import { LogicNeutralStyle } from './constants';

/** 统一或分边设置的非负间距 */
export const LogicSpacingSchema = z
  .union([NonNegativeNumberSchema, BoxSpacingSchema])
  .describe('Uniform or side-specific non-negative spacing.');

/** LogicFrame 和内容外壳保留的中性样式默认值 */
export const LogicNeutralStyleSchema = DrawableStyleSchema.extend({
  fill: DrawableStyleSchema.shape.fill.default(LogicNeutralStyle.fill),
  stroke: DrawableStyleSchema.shape.stroke.default(LogicNeutralStyle.stroke),
  strokeWidth: DrawableStyleSchema.shape.strokeWidth.default(LogicNeutralStyle.strokeWidth),
  opacity: DrawableStyleSchema.shape.opacity.default(LogicNeutralStyle.opacity),
});

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
