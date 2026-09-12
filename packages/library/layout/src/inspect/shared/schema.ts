import { InspectionLabelsSchema } from '@retikz/inspect';
import { boolean, strictObject, union } from 'zod';

/** 布局检查器边界选项的选项结构及默认值 */
export const LayoutInspectBoundsOptionsSchema = strictObject({
  container: boolean().default(true).describe('Whether to draw the outer container bounds.'),
  content: boolean().default(true).describe('Whether to draw the content bounds inside container padding.'),
  slot: boolean().default(true).describe('Whether to draw each parent-assigned child slot.'),
  allocation: boolean().default(true).describe("Whether to draw each child's actual allocation bounds."),
  visual: boolean().default(false).describe("Whether to draw each child's final visual bounds."),
});

/** 布局检查器盒模型间距的选项结构及默认值 */
export const LayoutInspectSpacingOptionsSchema = strictObject({
  padding: boolean().default(true).describe('Whether to shade resolved container padding.'),
  margin: boolean().default(true).describe('Whether to shade resolved child margins.'),
});

/** 三种布局检查器共用的选项结构及默认值 */
export const BaseLayoutInspectOptionsSchema = strictObject({
  bounds: union([boolean(), LayoutInspectBoundsOptionsSchema]).default(true).describe('Bounds guides.'),
  spacing: union([boolean(), LayoutInspectSpacingOptionsSchema]).default(true).describe('Box spacing.'),
  overflow: boolean().default(true).describe('Whether to shade overflowing content.'),
  alignmentGuides: boolean().default(true).describe('Whether to draw alignment guides.'),
  labels: InspectionLabelsSchema.describe('Whether to draw item labels.'),
}).describe('Shared options accepted by every Layout Inspector.');
