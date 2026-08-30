import { ChildSchema, NodeSchema, ScopePropsSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { FlexLayoutItemSchema, FlexMainDistributionSchema, LayoutGapSchema } from '@retikz/layout';
import { SurfaceInputSchema } from '@retikz/standard';
import { array, enum as zodEnum, literal, strictObject } from 'zod';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { GraphThemeLayerSchema } from '../theme';

export const BlockTextSchema = strictObject({
  text: NodeSchema.shape.text.unwrap().describe('Required Core Node text content for this Block text item.'),
  align: NodeSchema.shape.align,
  lineHeight: NodeSchema.shape.lineHeight,
  maxTextWidth: NodeSchema.shape.maxTextWidth,
  textColor: NodeSchema.shape.textColor,
  font: NodeSchema.shape.font,
  opacity: NodeSchema.shape.opacity,
}).describe('Core-compatible text fields used by Block structure labels.');

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
  trailing: ChildSchema.optional().describe('Optional arbitrary child placed after the Header text region.'),
}).describe('Independent Graph composite arranging an icon, text region and trailing child.');

const BlockCellInputSchema = strictObject({
  key: FlexLayoutItemSchema.shape.key,
  child: FlexLayoutItemSchema.shape.child,
  margin: FlexLayoutItemSchema.shape.margin
    .unwrap()
    .optional()
    .describe('Optional item margin outside the Row allocation slot.'),
  basis: FlexLayoutItemSchema.shape.basis
    .unwrap()
    .optional()
    .describe('Flex main-axis base slot; Block Cells default to zero for equal sharing.'),
  grow: FlexLayoutItemSchema.shape.grow
    .unwrap()
    .optional()
    .describe('Flex positive free-space factor; Block Cells default to one.'),
  shrink: FlexLayoutItemSchema.shape.shrink
    .unwrap()
    .optional()
    .describe('Flex shrink factor; Block Cells default to one.'),
  min: FlexLayoutItemSchema.shape.min,
  max: FlexLayoutItemSchema.shape.max,
  alignSelf: FlexLayoutItemSchema.shape.alignSelf,
}).superRefine((cell, context) => {
  if (cell.min !== undefined && cell.max !== undefined && cell.min > cell.max) {
    context.addIssue({
      code: 'custom',
      path: ['max'],
      message: 'max must be greater than or equal to min.',
    });
  }
});

export const BlockCellSchema = BlockCellInputSchema.describe(
  'Row-local sparse FlexLayout item fields excluding the fixed Flex discriminator.',
);

export const BlockSectionSchema = strictObject({
  namespace: literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
  type: literal(GraphType.BlockSection).describe('Block Section Source composite discriminator.'),
  ...ScopePropsSchema.shape,
  ...BlockSurfaceFields,
  title: BlockTextSchema.optional().describe('Optional Section title placed before its children.'),
  children: array(ChildSchema).optional().describe('Optional ordered arbitrary Core or Tier 2 children.'),
  gap: NonNegativeNumberSchema.optional().describe('Optional vertical gap between Section items in user units.'),
}).describe('Independent Graph composite presenting arbitrary children as a vertical content section.');

export const BlockRowSchema = strictObject({
  namespace: literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
  type: literal(GraphType.BlockRow).describe('Block Row Source composite discriminator.'),
  ...ScopePropsSchema.shape,
  ...BlockSurfaceFields,
  children: array(BlockCellSchema).optional().describe('Optional ordered Row-local Flex items.'),
  gap: NonNegativeNumberSchema.optional().describe('Optional horizontal gap between Row Cells in user units.'),
})
  .superRefine((row, context) => {
    const seenKeys = new Set<string>();
    row.children?.forEach((cell, index) => {
      if (seenKeys.has(cell.key)) {
        context.addIssue({
          code: 'custom',
          path: ['children', index, 'key'],
          message: `Duplicate Block Row Cell key '${cell.key}'.`,
        });
      }
      seenKeys.add(cell.key);
    });
  })
  .describe('Independent Graph composite arranging ordered Row-local Flex items horizontally.');

export const BlockSchema = strictObject({
  namespace: literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
  type: literal(GraphType.Block).describe('Block Source composite discriminator.'),
  ...ScopePropsSchema.shape,
  ...BlockSurfaceFields,
  graphTheme: GraphThemeLayerSchema.optional().describe('Optional Graph-local appearance rule layer.'),
  children: array(ChildSchema).optional().describe('Optional ordered arbitrary Core or Tier 2 children.'),
  width: NonNegativeNumberSchema.optional().describe('Optional fixed outer Block width including horizontal padding.'),
  minWidth: NonNegativeNumberSchema.optional().describe(
    'Optional minimum outer Block width including horizontal padding.',
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
