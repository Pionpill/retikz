import { ChildSchema, NodeSchema, ScopePropsSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { FlexMainDistributionSchema, LayoutGapSchema } from '@retikz/layout';
import { SurfaceInputSchema } from '@retikz/standard';
import { array, enum as zodEnum, literal, strictObject, string, union } from 'zod';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { GraphThemeLayerSchema } from '../theme';

const BlockTextObjectSchema = strictObject({
  text: NodeSchema.shape.text.unwrap().describe('Required Core Node text content for this Block text item.'),
  align: NodeSchema.shape.align,
  lineHeight: NodeSchema.shape.lineHeight,
  maxTextWidth: NodeSchema.shape.maxTextWidth,
  textColor: NodeSchema.shape.textColor,
  font: NodeSchema.shape.font,
  opacity: NodeSchema.shape.opacity,
});

export const BlockTextSchema = union([string(), BlockTextObjectSchema]).describe(
  'Block structure text as a string shorthand or Core-compatible text fields.',
);

/** Block Header 文本区的排列方向 */
const BlockHeaderDirectionSchema = zodEnum(['horizontal', 'vertical']).describe(
  'Physical direction used to arrange the Header title and description.',
);

const BlockSurfaceFields = {
  padding: SurfaceInputSchema.shape.padding,
  background: SurfaceInputSchema.shape.background,
  border: SurfaceInputSchema.shape.border,
  cornerRadius: SurfaceInputSchema.shape.cornerRadius,
  overflow: SurfaceInputSchema.shape.overflow,
};

export const BlockHeaderSchema = strictObject({
  namespace: literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
  type: literal(GraphType.BlockHeader).describe('Block Header Source composite discriminator.'),
  icon: ChildSchema.optional().describe('Optional arbitrary child placed before the Header text region.'),
  title: BlockTextSchema.describe('Required primary Header title.'),
  description: BlockTextSchema.optional().describe('Optional secondary Header description.'),
  direction: BlockHeaderDirectionSchema.optional().describe(
    'Optional direction for the title and description text region; omitted means vertical.',
  ),
  itemGap: LayoutGapSchema.optional().describe(
    'Optional minimum physical gap between the Header title and description.',
  ),
  justifyContent: FlexMainDistributionSchema.optional().describe(
    'Optional main-axis distribution within the Header title and description text region.',
  ),
  trail: ChildSchema.optional().describe('Optional arbitrary child placed after the Header text region.'),
}).describe('Independent Graph composite arranging an icon, text region and trail child.');

export const BlockSectionSchema = strictObject({
  namespace: literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
  type: literal(GraphType.BlockSection).describe('Block Section Source composite discriminator.'),
  ...ScopePropsSchema.shape,
  ...BlockSurfaceFields,
  title: BlockTextSchema.optional().describe('Optional Section title placed before its children.'),
  children: array(ChildSchema).optional().describe('Optional ordered arbitrary Core or Tier 2 children.'),
  gap: NonNegativeNumberSchema.optional().describe('Optional vertical gap between Section items in user units.'),
}).describe('Independent Graph composite presenting arbitrary children as a vertical content section.');

const BlockRowFields = {
  namespace: literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
  type: literal(GraphType.BlockRow).describe('Block Row Source composite discriminator.'),
  ...ScopePropsSchema.shape,
  ...BlockSurfaceFields,
  gap: NonNegativeNumberSchema.optional().describe('Optional horizontal gap between Row children in user units.'),
};

const BlockRowContentSchema = strictObject({
  ...BlockRowFields,
  content: union([BlockTextSchema, array(BlockTextSchema)]).describe(
    'Block text shorthand lowered to one full-width item or multiple equal-width Row items.',
  ),
});

const BlockRowChildrenSchema = strictObject({
  ...BlockRowFields,
  children: array(ChildSchema).optional().describe('Optional ordered arbitrary Core or Tier 2 children.'),
});

export const BlockRowSchema = union([BlockRowContentSchema, BlockRowChildrenSchema]).describe(
  'Independent Graph composite arranging Block text content or direct arbitrary children horizontally.',
);

export const BlockSchema = strictObject({
  namespace: literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
  type: literal(GraphType.Block).describe('Block Source composite discriminator.'),
  ...ScopePropsSchema.shape,
  ...BlockSurfaceFields,
  graphTheme: GraphThemeLayerSchema.optional().describe('Optional Graph-local appearance rule layer.'),
  children: array(ChildSchema).optional().describe('Optional ordered arbitrary Core or Tier 2 children.'),
  width: NonNegativeNumberSchema.optional().describe('Optional fixed outer Block width including horizontal padding.'),
  minWidth: NonNegativeNumberSchema.optional().describe(
    'Optional minimum outer Block width including horizontal padding; omitted Source resolves to 240.',
  ),
  gap: NonNegativeNumberSchema.optional().describe('Optional vertical gap between Block children in user units.'),
})
  .superRefine((block, context) => {
    if (block.width !== undefined && block.minWidth !== undefined && block.minWidth > block.width) {
      context.addIssue({
        code: 'custom',
        path: ['minWidth'],
        message: 'minWidth must be less than or equal to width.',
      });
    }
  })
  .describe('JSON-safe Graph Block combining a complete Scope, Surface and ordered arbitrary children.');
