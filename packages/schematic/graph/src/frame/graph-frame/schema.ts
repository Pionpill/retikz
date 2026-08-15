import { ChildSchema, PathBaseSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import {
  LayoutArtifactContainerSchema,
  LayoutArtifactRectSchema,
  LayoutOverflowSchema,
  LayoutSizeSchema,
} from '@retikz/layout';
import { z } from 'zod';

import { GraphNodeVariant } from '../../node';
import {
  GRAPH_NAMESPACE,
  GraphContentSizeDefault,
  GraphElementType,
  GraphLayoutItemArtifactSchema,
  GraphNeutralStyle,
  GraphNeutralStyleSchema,
  GraphOuterArtifactSchema,
  GraphSpacingSchema,
} from '../../shared';

/** GraphFrame 轮廓外观 */
export const GraphOutlineAppearanceSchema = z
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
  .describe('Outline-only appearance override for a GraphFrame shell or divider.');

const GraphOutlineAppearanceCanonicalSchema = GraphOutlineAppearanceSchema.extend({
  stroke: GraphOutlineAppearanceSchema.shape.stroke.default('currentColor'),
  strokeWidth: GraphOutlineAppearanceSchema.shape.strokeWidth.default(1),
  opacity: GraphOutlineAppearanceSchema.shape.opacity.default(1),
});

/** GraphFrame 区域输入 */
export const GraphFrameRegionSchema = z
  .strictObject({
    child: ChildSchema.describe('JSON-safe child laid out inside the region.'),
    padding: GraphSpacingSchema.optional().describe('Region-local padding overriding the block default.'),
  })
  .describe('One optional header or authored section region.');

/** GraphFrame 分段输入 */
export const GraphFrameSectionSchema = z
  .strictObject({
    key: NonBlankStringSchema.describe('Stable authored section identity local to the block.'),
    role: NonBlankStringSchema.optional().describe('Open authored section role preserved without dispatch.'),
    child: ChildSchema.describe('JSON-safe child laid out inside the section.'),
    padding: GraphSpacingSchema.optional().describe('Section-local padding overriding the block default.'),
  })
  .describe('One authored GraphFrame section.');

/** GraphFrame 外壳及分隔线的外观覆盖 */
export const GraphFrameAppearanceSchema = z
  .strictObject({
    style: GraphNeutralStyleSchema.default(GraphNeutralStyle),
    cornerRadius: NonNegativeNumberSchema.default(8),
    dashPattern: GraphOutlineAppearanceSchema.shape.dashPattern,
    dashOffset: GraphOutlineAppearanceSchema.shape.dashOffset,
    divider: z.union([z.literal(false), GraphOutlineAppearanceCanonicalSchema]).default({
      stroke: 'currentColor',
      strokeWidth: 1,
      opacity: 1,
    }),
    zIndex: z.number().int().default(0),
  })
  .describe('Neutral outer shell and divider appearance for GraphFrame.');

const GraphFrameShape = {
  namespace: z.literal(GRAPH_NAMESPACE).describe('Graph composite namespace.'),
  type: z.literal(GraphElementType.GraphFrame).describe('GraphFrame composite discriminator.'),
  id: NonBlankStringSchema.describe('Stable authored GraphFrame identity.'),
  graphNodeVariant: z
    .enum(GraphNodeVariant)
    .optional()
    .describe('Default visual variant inherited by descendant logic nodes.'),
  header: GraphFrameRegionSchema.optional().describe('Optional authored header region.'),
  sections: z
    .array(GraphFrameSectionSchema)
    .default([])
    .describe('Authored sections in stable layout and paint order.'),
  size: LayoutSizeSchema.default(GraphContentSizeDefault).describe('Allocation size policy for the outer block.'),
  padding: GraphSpacingSchema.default(8).describe('Default padding applied to each authored region.'),
  rowGap: NonNegativeNumberSchema.default(0).describe('Blank spacing between adjacent authored regions.'),
  overflow: LayoutOverflowSchema.default('visible').describe('Outer content overflow policy.'),
  appearance: GraphFrameAppearanceSchema.default({
    style: GraphNeutralStyle,
    cornerRadius: 8,
    divider: { stroke: 'currentColor', strokeWidth: 1, opacity: 1 },
    zIndex: 0,
  }).describe('Outer shell and divider appearance overrides.'),
} as const;

type GraphFrameValue = z.infer<z.ZodObject<typeof GraphFrameShape>>;

/** 校验 GraphFrame 的编写区域标识与非空约束 */
const refineGraphFrame = (value: GraphFrameValue, context: z.RefinementCtx): void => {
  if (value.header === undefined && value.sections.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['sections'],
      message: 'GraphFrame requires a header or at least one section.',
    });
  }

  const seen = new Set<string>();
  value.sections.forEach((section, index) => {
    if (seen.has(section.key)) {
      context.addIssue({
        code: 'custom',
        path: ['sections', index, 'key'],
        message: `Duplicate GraphFrame section key '${section.key}'.`,
      });
    }
    seen.add(section.key);
  });
};

/** GraphFrame 的 JSON 安全规范模式 */
export const GraphFrameSchema = z
  .strictObject(GraphFrameShape)
  .superRefine(refineGraphFrame)
  .describe('Canonical JSON-safe GraphFrame composite.');

const GraphFrameSectionArtifactSchema = z
  .strictObject({
    key: NonBlankStringSchema.describe('Authored GraphFrame section identity.'),
    role: NonBlankStringSchema.optional().describe('Authored section role, when provided.'),
    geometry: GraphLayoutItemArtifactSchema.describe('Resolved section placement geometry.'),
  })
  .describe('Resolved authored GraphFrame section artifact.');

/** GraphFrame 编译产物载荷 */
export const GraphFrameArtifactSchema = z
  .strictObject({
    kind: z.literal(GraphElementType.GraphFrame).describe('GraphFrame artifact discriminator.'),
    id: NonBlankStringSchema.describe('Stable authored GraphFrame identity.'),
    outer: GraphOuterArtifactSchema.describe('Resolved shell, content, and divider geometry union.'),
    container: LayoutArtifactContainerSchema.describe('Resolved header and section content geometry.'),
    header: GraphLayoutItemArtifactSchema.nullable().describe('Resolved optional header placement, if authored.'),
    sections: z.array(GraphFrameSectionArtifactSchema).describe('Resolved authored sections in source order.'),
    dividerVisualBounds: z
      .array(LayoutArtifactRectSchema)
      .describe('Resolved divider visual rectangles in authored order.'),
  })
  .describe('Strict JSON-safe GraphFrame compile artifact payload.');
