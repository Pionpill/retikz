import { BoxSpacingSchema, ChildSchema, DrawableStyleSchema, PathBaseSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import {
  LayoutArtifactContainerSchema,
  LayoutArtifactItemBaseSchema,
  LayoutArtifactRectSchema,
  LayoutOverflowSchema,
  LayoutSizeSchema,
} from '@retikz/layout';
import { z } from 'zod';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { ContainerContentSizeDefault, ContainerNeutralStyle } from './constants';

/** 统一或分边设置的非负间距 */
export const ContainerSpacingSchema = z
  .union([NonNegativeNumberSchema, BoxSpacingSchema])
  .describe('Uniform or side-specific non-negative spacing.');

/** Container 和内容外壳保留的中性样式默认值 */
export const ContainerNeutralStyleSchema = DrawableStyleSchema.extend({
  fill: DrawableStyleSchema.shape.fill.default(ContainerNeutralStyle.fill),
  stroke: DrawableStyleSchema.shape.stroke.default(ContainerNeutralStyle.stroke),
  strokeWidth: DrawableStyleSchema.shape.strokeWidth.default(ContainerNeutralStyle.strokeWidth),
  opacity: DrawableStyleSchema.shape.opacity.default(ContainerNeutralStyle.opacity),
});

/** Container 外壳可用的严格几何联合 */
export const ContainerOuterArtifactSchema = z
  .strictObject({
    allocationBounds: LayoutArtifactRectSchema.describe('Resolved outer allocation rectangle.'),
    shellVisualBounds: LayoutArtifactRectSchema.nullable().describe('Outer shell visual bounds, or null when absent.'),
    visualBounds: LayoutArtifactRectSchema.describe('Union of shell, content, and component decoration bounds.'),
    visibleBounds: LayoutArtifactRectSchema.nullable().describe('Visible union bounds, or null when no area remains.'),
  })
  .describe('Strict geometry union for a Container outer shell.');

/** Container 内容放置 artifact 的严格结构 */
export const ContainerLayoutItemArtifactSchema = z
  .strictObject(LayoutArtifactItemBaseSchema.omit({ key: true, sourceIndex: true }).shape)
  .describe('Strict content placement artifact without container-owned key or source index.');

/** Container 轮廓外观 */
export const ContainerOutlineAppearanceSchema = z
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
  .describe('Outline-only appearance override for a Container shell or divider.');

const ContainerOutlineAppearanceCanonicalSchema = ContainerOutlineAppearanceSchema.extend({
  stroke: ContainerOutlineAppearanceSchema.shape.stroke.default('currentColor'),
  strokeWidth: ContainerOutlineAppearanceSchema.shape.strokeWidth.default(1),
  opacity: ContainerOutlineAppearanceSchema.shape.opacity.default(1),
});

/** Container 区域输入 */
export const ContainerRegionSchema = z
  .strictObject({
    child: ChildSchema.describe('JSON-safe child laid out inside the region.'),
    padding: ContainerSpacingSchema.optional().describe('Region-local padding overriding the block default.'),
  })
  .describe('One optional header or authored section region.');

/** Container 分段输入 */
export const ContainerSectionSchema = z
  .strictObject({
    key: NonBlankStringSchema.describe('Stable authored section identity local to the block.'),
    role: NonBlankStringSchema.optional().describe('Open authored section role preserved without dispatch.'),
    child: ChildSchema.describe('JSON-safe child laid out inside the section.'),
    padding: ContainerSpacingSchema.optional().describe('Section-local padding overriding the block default.'),
  })
  .describe('One authored Container section.');

/** Container 外壳及分隔线的外观覆盖 */
export const ContainerAppearanceSchema = z
  .strictObject({
    style: ContainerNeutralStyleSchema.default(ContainerNeutralStyle),
    cornerRadius: NonNegativeNumberSchema.default(8),
    dashPattern: ContainerOutlineAppearanceSchema.shape.dashPattern,
    dashOffset: ContainerOutlineAppearanceSchema.shape.dashOffset,
    divider: z.union([z.literal(false), ContainerOutlineAppearanceCanonicalSchema]).default({
      stroke: 'currentColor',
      strokeWidth: 1,
      opacity: 1,
    }),
    zIndex: z.number().int().default(0),
  })
  .describe('Neutral outer shell and divider appearance for Container.');

const ContainerShape = {
  namespace: z.literal(GRAPH_NAMESPACE).describe('Graph composite namespace.'),
  type: z.literal(GraphType.Container).describe('Container composite discriminator.'),
  id: NonBlankStringSchema.describe('Stable authored Container identity.'),
  entityVariant: NonBlankStringSchema.optional().describe(
    'Open default Entity variant key inherited by descendant Graph entities.',
  ),
  header: ContainerRegionSchema.optional().describe('Optional authored header region.'),
  sections: z.array(ContainerSectionSchema).default([]).describe('Authored sections in stable layout and paint order.'),
  size: LayoutSizeSchema.default(ContainerContentSizeDefault).describe('Allocation size policy for the outer block.'),
  padding: ContainerSpacingSchema.default(8).describe('Default padding applied to each authored region.'),
  rowGap: NonNegativeNumberSchema.default(0).describe('Blank spacing between adjacent authored regions.'),
  overflow: LayoutOverflowSchema.default('visible').describe('Outer content overflow policy.'),
  appearance: ContainerAppearanceSchema.default({
    style: ContainerNeutralStyle,
    cornerRadius: 8,
    divider: { stroke: 'currentColor', strokeWidth: 1, opacity: 1 },
    zIndex: 0,
  }).describe('Outer shell and divider appearance overrides.'),
} as const;

type ContainerValue = z.infer<z.ZodObject<typeof ContainerShape>>;

/** 校验 Container 的编写区域标识与非空约束 */
const refineContainer = (value: ContainerValue, context: z.RefinementCtx): void => {
  if (value.header === undefined && value.sections.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['sections'],
      message: 'Container requires a header or at least one section.',
    });
  }

  const seen = new Set<string>();
  value.sections.forEach((section, index) => {
    if (seen.has(section.key)) {
      context.addIssue({
        code: 'custom',
        path: ['sections', index, 'key'],
        message: `Duplicate Container section key '${section.key}'.`,
      });
    }
    seen.add(section.key);
  });
};

/** Container 的 JSON 安全规范模式 */
export const ContainerSchema = z
  .strictObject(ContainerShape)
  .superRefine(refineContainer)
  .describe('Canonical JSON-safe Container composite.');

const ContainerSectionArtifactSchema = z
  .strictObject({
    key: NonBlankStringSchema.describe('Authored Container section identity.'),
    role: NonBlankStringSchema.optional().describe('Authored section role, when provided.'),
    geometry: ContainerLayoutItemArtifactSchema.describe('Resolved section placement geometry.'),
  })
  .describe('Resolved authored Container section artifact.');

/** Container 编译产物载荷 */
export const ContainerArtifactSchema = z
  .strictObject({
    kind: z.literal(GraphType.Container).describe('Container artifact discriminator.'),
    id: NonBlankStringSchema.describe('Stable authored Container identity.'),
    outer: ContainerOuterArtifactSchema.describe('Resolved shell, content, and divider geometry union.'),
    container: LayoutArtifactContainerSchema.describe('Resolved header and section content geometry.'),
    header: ContainerLayoutItemArtifactSchema.nullable().describe('Resolved optional header placement, if authored.'),
    sections: z.array(ContainerSectionArtifactSchema).describe('Resolved authored sections in source order.'),
    dividerVisualBounds: z
      .array(LayoutArtifactRectSchema)
      .describe('Resolved divider visual rectangles in authored order.'),
  })
  .describe('Strict JSON-safe Container compile artifact payload.');
