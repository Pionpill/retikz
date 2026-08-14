import { ChildSchema, PathBaseSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import {
  LayoutArtifactContainerSchema,
  LayoutArtifactRectSchema,
  LayoutOverflowSchema,
  LayoutSizeSchema,
} from '@retikz/layout';
import { z } from 'zod';

import {
  LogicContentSizeDefault,
  LogicLayoutItemArtifactSchema,
  LogicNeutralStyle,
  LogicNeutralStyleSchema,
  LogicOuterArtifactSchema,
  LogicSpacingSchema,
  NOTATION_NAMESPACE,
  NotationElementType,
} from '../../shared';
import { LogicNodeVariant } from '../../unit';

/** LogicFrame 轮廓外观 */
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

const LogicOutlineAppearanceCanonicalSchema = LogicOutlineAppearanceSchema.extend({
  stroke: LogicOutlineAppearanceSchema.shape.stroke.default('currentColor'),
  strokeWidth: LogicOutlineAppearanceSchema.shape.strokeWidth.default(1),
  opacity: LogicOutlineAppearanceSchema.shape.opacity.default(1),
});

/** LogicFrame 区域输入 */
export const LogicFrameRegionSchema = z
  .strictObject({
    child: ChildSchema.describe('JSON-safe child laid out inside the region.'),
    padding: LogicSpacingSchema.optional().describe('Region-local padding overriding the block default.'),
  })
  .describe('One optional header or authored section region.');

/** LogicFrame 分段输入 */
export const LogicFrameSectionSchema = z
  .strictObject({
    key: NonBlankStringSchema.describe('Stable authored section identity local to the block.'),
    role: NonBlankStringSchema.optional().describe('Open authored section role preserved without dispatch.'),
    child: ChildSchema.describe('JSON-safe child laid out inside the section.'),
    padding: LogicSpacingSchema.optional().describe('Section-local padding overriding the block default.'),
  })
  .describe('One authored LogicFrame section.');

/** LogicFrame 外壳及分隔线的外观覆盖 */
export const LogicFrameAppearanceSchema = z
  .strictObject({
    style: LogicNeutralStyleSchema.default(LogicNeutralStyle),
    cornerRadius: NonNegativeNumberSchema.default(8),
    dashPattern: LogicOutlineAppearanceSchema.shape.dashPattern,
    dashOffset: LogicOutlineAppearanceSchema.shape.dashOffset,
    divider: z.union([z.literal(false), LogicOutlineAppearanceCanonicalSchema]).default({
      stroke: 'currentColor',
      strokeWidth: 1,
      opacity: 1,
    }),
    zIndex: z.number().int().default(0),
  })
  .describe('Neutral outer shell and divider appearance for LogicFrame.');

const LogicFrameShape = {
  namespace: z.literal(NOTATION_NAMESPACE).describe('Notation composite namespace.'),
  type: z.literal(NotationElementType.LogicFrame).describe('LogicFrame composite discriminator.'),
  id: NonBlankStringSchema.describe('Stable authored LogicFrame identity.'),
  logicNodeVariant: z
    .enum(LogicNodeVariant)
    .optional()
    .describe('Default visual variant inherited by descendant logic nodes.'),
  header: LogicFrameRegionSchema.optional().describe('Optional authored header region.'),
  sections: z
    .array(LogicFrameSectionSchema)
    .default([])
    .describe('Authored sections in stable layout and paint order.'),
  size: LayoutSizeSchema.default(LogicContentSizeDefault).describe('Allocation size policy for the outer block.'),
  padding: LogicSpacingSchema.default(8).describe('Default padding applied to each authored region.'),
  rowGap: NonNegativeNumberSchema.default(0).describe('Blank spacing between adjacent authored regions.'),
  overflow: LayoutOverflowSchema.default('visible').describe('Outer content overflow policy.'),
  appearance: LogicFrameAppearanceSchema.default({
    style: LogicNeutralStyle,
    cornerRadius: 8,
    divider: { stroke: 'currentColor', strokeWidth: 1, opacity: 1 },
    zIndex: 0,
  }).describe('Outer shell and divider appearance overrides.'),
} as const;

type LogicFrameValue = z.infer<z.ZodObject<typeof LogicFrameShape>>;

/** 校验 LogicFrame 的编写区域标识与非空约束 */
const refineLogicFrame = (value: LogicFrameValue, context: z.RefinementCtx): void => {
  if (value.header === undefined && value.sections.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['sections'],
      message: 'LogicFrame requires a header or at least one section.',
    });
  }

  const seen = new Set<string>();
  value.sections.forEach((section, index) => {
    if (seen.has(section.key)) {
      context.addIssue({
        code: 'custom',
        path: ['sections', index, 'key'],
        message: `Duplicate LogicFrame section key '${section.key}'.`,
      });
    }
    seen.add(section.key);
  });
};

/** LogicFrame 的 JSON 安全规范模式 */
export const LogicFrameSchema = z
  .strictObject(LogicFrameShape)
  .superRefine(refineLogicFrame)
  .describe('Canonical JSON-safe Notation LogicFrame composite.');

const LogicFrameSectionArtifactSchema = z
  .strictObject({
    key: NonBlankStringSchema.describe('Authored LogicFrame section identity.'),
    role: NonBlankStringSchema.optional().describe('Authored section role, when provided.'),
    geometry: LogicLayoutItemArtifactSchema.describe('Resolved section placement geometry.'),
  })
  .describe('Resolved authored LogicFrame section artifact.');

/** LogicFrame 编译产物载荷 */
export const LogicFrameArtifactSchema = z
  .strictObject({
    kind: z.literal(NotationElementType.LogicFrame).describe('LogicFrame artifact discriminator.'),
    id: NonBlankStringSchema.describe('Stable authored LogicFrame identity.'),
    outer: LogicOuterArtifactSchema.describe('Resolved shell, content, and divider geometry union.'),
    container: LayoutArtifactContainerSchema.describe('Resolved header and section content geometry.'),
    header: LogicLayoutItemArtifactSchema.nullable().describe('Resolved optional header placement, if authored.'),
    sections: z.array(LogicFrameSectionArtifactSchema).describe('Resolved authored sections in source order.'),
    dividerVisualBounds: z
      .array(LayoutArtifactRectSchema)
      .describe('Resolved divider visual rectangles in authored order.'),
  })
  .describe('Strict JSON-safe LogicFrame compile artifact payload.');
