import { InspectionLabelsInputSchema, InspectionLabelsSchema } from '@retikz/inspect';
import { z } from 'zod';

/** 布局检查器边界选项的稀疏输入结构 */
export const LayoutInspectBoundsOptionsInputSchema = z.strictObject({
  container: z.boolean().optional().describe('Whether to draw the outer container bounds.'),
  content: z.boolean().optional().describe('Whether to draw the content bounds inside container padding.'),
  slot: z.boolean().optional().describe('Whether to draw each parent-assigned child slot.'),
  allocation: z.boolean().optional().describe("Whether to draw each child's actual allocation bounds."),
  visual: z.boolean().optional().describe("Whether to draw each child's final visual bounds."),
});

/** 布局检查器盒模型间距的稀疏输入结构 */
export const LayoutInspectSpacingOptionsInputSchema = z.strictObject({
  padding: z.boolean().optional().describe('Whether to shade resolved container padding.'),
  margin: z.boolean().optional().describe('Whether to shade resolved child margins.'),
});

/** 三种布局检查器共用的稀疏选项结构 */
export const BaseLayoutInspectOptionsInputSchema = z
  .strictObject({
    bounds: z.union([z.boolean(), LayoutInspectBoundsOptionsInputSchema]).optional().describe('Bounds guides.'),
    spacing: z.union([z.boolean(), LayoutInspectSpacingOptionsInputSchema]).optional().describe('Box spacing.'),
    overflow: z.boolean().optional().describe('Whether to shade overflowing content.'),
    alignmentGuides: z.boolean().optional().describe('Whether to draw alignment guides.'),
    labels: InspectionLabelsInputSchema.describe('Whether to draw item labels.'),
  })
  .describe('Sparse shared options accepted by every Layout Inspector.');

/** 边界辅助信息的默认显示选项 */
const DefaultBounds = Object.freeze({ container: true, content: true, slot: true, allocation: true, visual: false });

/** 盒模型间距的默认显示选项 */
const DefaultSpacing = Object.freeze({ padding: true, margin: true });

/** 把稀疏共享选项解析为标准选项 */
export const resolveBaseLayoutInspectOptions = (options: z.input<typeof BaseLayoutInspectOptionsInputSchema>) => {
  const bounds =
    typeof options.bounds === 'boolean'
      ? options.bounds
        ? DefaultBounds
        : { container: false, content: false, slot: false, allocation: false, visual: false }
      : { ...DefaultBounds, ...options.bounds };
  const spacing =
    typeof options.spacing === 'boolean'
      ? options.spacing
        ? DefaultSpacing
        : { padding: false, margin: false }
      : { ...DefaultSpacing, ...options.spacing };
  return Object.freeze({
    bounds: Object.freeze(bounds),
    spacing: Object.freeze(spacing),
    overflow: options.overflow ?? true,
    alignmentGuides: options.alignmentGuides ?? true,
    labels: InspectionLabelsSchema.parse(options.labels),
  });
};

/** 三种布局检查器共用的标准选项结构 */
export const BaseLayoutInspectOptionsSchema = BaseLayoutInspectOptionsInputSchema.transform(
  resolveBaseLayoutInspectOptions,
).describe('Canonical shared options resolved for a Layout Inspector.');

/** 合并同类布局检查器的多层稀疏输入，并逐字段覆盖边界与间距选项 */
export const mergeLayoutInspectOptionsInput = <T extends z.input<typeof BaseLayoutInspectOptionsInputSchema>>(
  inherited: T,
  local: T,
): T => ({
  ...inherited,
  ...local,
  ...(local.bounds === undefined
    ? {}
    : {
        bounds:
          typeof inherited.bounds === 'object' && typeof local.bounds === 'object'
            ? { ...inherited.bounds, ...local.bounds }
            : local.bounds,
      }),
  ...(local.spacing === undefined
    ? {}
    : {
        spacing:
          typeof inherited.spacing === 'object' && typeof local.spacing === 'object'
            ? { ...inherited.spacing, ...local.spacing }
            : local.spacing,
      }),
});
