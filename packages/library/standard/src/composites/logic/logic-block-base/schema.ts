import { z } from 'zod';

import {
  LayoutArtifactContainerSchema,
  LayoutArtifactRectSchema,
  LayoutOverflowSchema,
  LayoutSizeSchema,
} from '../../layout/shared';
import { STANDARD_NAMESPACE } from '../../shared';
import {
  LogicBlockRegionSchema,
  LogicBlockSectionSchema,
  LogicCompositeType,
  LogicContentSizeDefault,
  LogicLayoutItemArtifactSchema,
  LogicNeutralStyle,
  LogicNeutralStyleSchema,
  LogicOuterArtifactSchema,
  LogicOutlineAppearanceCanonicalSchema,
  LogicOutlineAppearanceSchema,
  LogicSpacingSchema,
  NonBlankStringSchema,
} from '../shared';

/** LogicBlockBase 外壳及 divider 的 appearance 覆盖 */
export const LogicBlockAppearanceSchema = z
  .strictObject({
    style: LogicNeutralStyleSchema.default(LogicNeutralStyle),
    cornerRadius: z.number().nonnegative().default(8),
    dashPattern: LogicOutlineAppearanceSchema.shape.dashPattern,
    dashOffset: LogicOutlineAppearanceSchema.shape.dashOffset,
    divider: z.union([z.literal(false), LogicOutlineAppearanceCanonicalSchema]).default({
      stroke: 'currentColor',
      strokeWidth: 1,
      opacity: 1,
    }),
    zIndex: z.number().int().default(0),
  })
  .describe('Neutral outer shell and divider appearance for LogicBlockBase.');

const LogicBlockBaseShape = {
  namespace: z.literal(STANDARD_NAMESPACE).describe('Standard composite namespace.'),
  type: z.literal(LogicCompositeType.LogicBlockBase).describe('LogicBlockBase composite discriminator.'),
  id: NonBlankStringSchema.describe('Stable authored LogicBlockBase identity.'),
  header: LogicBlockRegionSchema.optional().describe('Optional authored header region.'),
  sections: z
    .array(LogicBlockSectionSchema)
    .default([])
    .describe('Authored sections in stable layout and paint order.'),
  size: LayoutSizeSchema.default(LogicContentSizeDefault).describe('Allocation size policy for the outer block.'),
  padding: LogicSpacingSchema.default(8).describe('Default padding applied to each authored region.'),
  rowGap: z.number().nonnegative().default(0).describe('Blank spacing between adjacent authored regions.'),
  overflow: LayoutOverflowSchema.default('visible').describe('Outer content overflow policy.'),
  appearance: LogicBlockAppearanceSchema.default({
    style: LogicNeutralStyle,
    cornerRadius: 8,
    divider: { stroke: 'currentColor', strokeWidth: 1, opacity: 1 },
    zIndex: 0,
  }).describe('Outer shell and divider appearance overrides.'),
} as const;

type LogicBlockBaseValue = z.infer<z.ZodObject<typeof LogicBlockBaseShape>>;

/** 校验 LogicBlockBase 的 authored region identity 与非空约束 */
const refineLogicBlockBase = (value: LogicBlockBaseValue, context: z.RefinementCtx): void => {
  if (value.header === undefined && value.sections.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['sections'],
      message: 'LogicBlockBase requires a header or at least one section.',
    });
  }

  const seen = new Set<string>();
  value.sections.forEach((section, index) => {
    if (seen.has(section.key)) {
      context.addIssue({
        code: 'custom',
        path: ['sections', index, 'key'],
        message: `Duplicate LogicBlockBase section key '${section.key}'.`,
      });
    }
    seen.add(section.key);
  });
};

/** LogicBlockBase canonical JSON-safe schema */
export const LogicBlockBaseSchema = z
  .strictObject(LogicBlockBaseShape)
  .superRefine(refineLogicBlockBase)
  .describe('Canonical JSON-safe Standard LogicBlockBase composite.');

const LogicBlockSectionArtifactSchema = z
  .strictObject({
    key: NonBlankStringSchema.describe('Authored LogicBlockBase section identity.'),
    role: NonBlankStringSchema.optional().describe('Authored section role, when provided.'),
    geometry: LogicLayoutItemArtifactSchema.describe('Resolved section placement geometry.'),
  })
  .describe('Resolved authored LogicBlockBase section artifact.');

/** LogicBlockBase compile artifact payload */
export const LogicBlockBaseArtifactSchema = z
  .strictObject({
    kind: z.literal(LogicCompositeType.LogicBlockBase).describe('LogicBlockBase artifact discriminator.'),
    id: NonBlankStringSchema.describe('Stable authored LogicBlockBase identity.'),
    outer: LogicOuterArtifactSchema.describe('Resolved shell, content, and divider geometry union.'),
    container: LayoutArtifactContainerSchema.describe('Resolved header and section content geometry.'),
    header: LogicLayoutItemArtifactSchema.nullable().describe('Resolved optional header placement, if authored.'),
    sections: z.array(LogicBlockSectionArtifactSchema).describe('Resolved authored sections in source order.'),
    dividerVisualBounds: z
      .array(LayoutArtifactRectSchema)
      .describe('Resolved divider visual rectangles in authored order.'),
  })
  .describe('Strict JSON-safe LogicBlockBase compile artifact payload.');
