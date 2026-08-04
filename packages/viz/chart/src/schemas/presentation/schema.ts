import type { IRChild, IRTextBlock } from '@retikz/core';

import { ChildSchema, FontSchema, NodeSchema, TextBlockSchema } from '@retikz/core';
import {
  FlexLayoutDirection,
  FlexLayoutItemSchema,
  FlexLayoutSchema,
  FlexLayoutWrap,
  LayoutDistribution,
  LayoutItemKind,
  STANDARD_NAMESPACE,
} from '@retikz/standard';
import { z } from 'zod';

import {
  ChartPresentationDefaultItemKey,
  ChartPresentationItemContentKind,
  chartPresentationItemKeyOf,
  ChartPresentationPreset,
} from './constants';

// 判断 Core TextBlock 是否至少包含一个非空 text 或 tex leaf
const hasTextBlockContent = (block: IRTextBlock): boolean => {
  if (typeof block === 'string') return block.length > 0;
  return block.some(line => {
    if (typeof line === 'string') return line.length > 0;
    if ('text' in line) return line.text.length > 0;
    return line.runs.some(run => ('text' in run ? run.text.length > 0 : run.tex.length > 0));
  });
};

// 为 Chart-owned optional 字段拒绝不属于 JSON 的显式 undefined
const rejectOwnUndefined = (value: Record<string, unknown>, context: z.RefinementCtx): void => {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) {
      context.addIssue({
        code: 'custom',
        path: [key],
        message: 'Chart presentation fields must omit unset values instead of using undefined',
      });
    }
  }
};

export const ChartPresentationTextBlockSchema = TextBlockSchema.refine(hasTextBlockContent, {
  message: 'Chart presentation text requires at least one non-empty text or tex value',
}).describe('Core TextBlock containing at least one non-empty text or tex leaf for a Chart presentation preset');

export const ChartPresentationStyledTextSchema = z
  .strictObject({
    text: ChartPresentationTextBlockSchema.describe('Non-empty Core TextBlock rendered by this presentation preset'),
    font: FontSchema.optional().describe('Sparse preset-local font leaves overriding resolved Chart style tokens'),
    textColor: NodeSchema.shape.textColor
      .unwrap()
      .optional()
      .describe('Preset-local text color overriding the resolved foreground token'),
    align: NodeSchema.shape.align
      .unwrap()
      .optional()
      .describe('Preset-local text alignment overriding the resolved alignment token'),
    lineHeight: NodeSchema.shape.lineHeight
      .unwrap()
      .optional()
      .describe('Preset-local line height overriding the resolved line-height token'),
    maxTextWidth: NodeSchema.shape.maxTextWidth
      .unwrap()
      .optional()
      .describe('Optional maximum line width before Core text wrapping'),
  })
  .superRefine(rejectOwnUndefined)
  .describe('Strict Chart presentation text wrapper with sparse Core Node text-style overrides');

export const ChartPresentationTextSchema = z
  .union([ChartPresentationTextBlockSchema, ChartPresentationStyledTextSchema])
  .describe('Non-empty Chart presentation text as a Core TextBlock shorthand or a strict styled wrapper');

export const ChartPresentationLayoutSchema = z
  .strictObject({
    size: FlexLayoutSchema.shape.size.unwrap().optional().describe('Optional Standard Flex container size policy'),
    padding: FlexLayoutSchema.shape.padding.unwrap().optional().describe('Optional Standard Flex content padding'),
    overflow: FlexLayoutSchema.shape.overflow.unwrap().optional().describe('Optional Standard Flex overflow policy'),
    direction: FlexLayoutSchema.shape.direction
      .unwrap()
      .optional()
      .describe('Optional Standard Flex main-axis direction'),
    wrap: FlexLayoutSchema.shape.wrap.unwrap().optional().describe('Optional Standard Flex wrapping policy'),
    columnGap: FlexLayoutSchema.shape.columnGap
      .unwrap()
      .optional()
      .describe('Optional Standard Flex physical horizontal gap'),
    rowGap: FlexLayoutSchema.shape.rowGap.unwrap().optional().describe('Optional Standard Flex physical vertical gap'),
    justifyContent: FlexLayoutSchema.shape.justifyContent
      .unwrap()
      .optional()
      .describe('Optional Standard Flex main-axis distribution'),
    alignItems: FlexLayoutSchema.shape.alignItems
      .unwrap()
      .optional()
      .describe('Optional Standard Flex cross-axis item alignment'),
    alignContent: FlexLayoutSchema.shape.alignContent
      .unwrap()
      .optional()
      .describe('Optional Standard Flex wrapped-line distribution'),
  })
  .superRefine(rejectOwnUndefined)
  .describe('Sparse Standard Flex container fields authored by Chart presentation');

const ChartPresentationFlexItemShape = {
  margin: FlexLayoutItemSchema.shape.margin.unwrap().optional().describe('Optional Standard Flex item margin'),
  basis: FlexLayoutItemSchema.shape.basis.unwrap().optional().describe('Optional Standard Flex item basis'),
  grow: FlexLayoutItemSchema.shape.grow.unwrap().optional().describe('Optional Standard Flex item grow factor'),
  shrink: FlexLayoutItemSchema.shape.shrink.unwrap().optional().describe('Optional Standard Flex item shrink factor'),
  min: FlexLayoutItemSchema.shape.min.unwrap().optional().describe('Optional Standard Flex item minimum slot'),
  max: FlexLayoutItemSchema.shape.max.unwrap().optional().describe('Optional Standard Flex item maximum slot'),
  alignSelf: FlexLayoutItemSchema.shape.alignSelf
    .unwrap()
    .optional()
    .describe('Optional Standard Flex item cross-axis alignment'),
};

export const ChartPresentationPlotContentSchema = z
  .strictObject({
    kind: z
      .literal(ChartPresentationItemContentKind.Plot)
      .describe('Discriminator for the single resolved Plot placeholder'),
  })
  .describe('Chart presentation content resolved to the current PlotSpec');

export const ChartPresentationPresetContentSchema = z
  .strictObject({
    kind: z.literal(ChartPresentationItemContentKind.Preset).describe('Discriminator for a Chart text preset'),
    preset: z.enum(ChartPresentationPreset).describe('Closed Chart text preset selecting style token semantics'),
    text: ChartPresentationTextSchema.describe('Non-empty renderer-neutral text authored for this preset'),
  })
  .describe('Chart presentation text preset content');

export const ChartPresentationChildContentSchema = z
  .strictObject({
    kind: z.literal(ChartPresentationItemContentKind.Child).describe('Discriminator for arbitrary custom content'),
    child: ChildSchema.describe('JSON-safe Core or registered Tier 2 child preserved by Chart'),
  })
  .describe('Custom Chart presentation content carried as one IRChild');

export const ChartPresentationItemContentSchema = z
  .discriminatedUnion('kind', [
    ChartPresentationPlotContentSchema,
    ChartPresentationPresetContentSchema,
    ChartPresentationChildContentSchema,
  ])
  .describe('Content selected for one authored Chart presentation item');

const ChartPresentationItemBaseSchema = z
  .strictObject({
    key: z.string().min(1).optional().describe('Optional container-local item identity when a default is available'),
    ...ChartPresentationFlexItemShape,
    content: ChartPresentationItemContentSchema.describe('Renderer-neutral content of this authored item'),
  })
  .superRefine((item, context) => {
    rejectOwnUndefined(item, context);
    if (
      item.content.kind === ChartPresentationItemContentKind.Plot &&
      item.key !== undefined &&
      item.key !== ChartPresentationDefaultItemKey.Plot
    ) {
      context.addIssue({
        code: 'custom',
        path: ['key'],
        message: `Chart Plot item key must be '${ChartPresentationDefaultItemKey.Plot}'`,
      });
    }
    if (item.content.kind === ChartPresentationItemContentKind.Child && item.key === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['key'],
        message: 'Custom Chart presentation child requires an explicit key',
      });
    }
  })
  .describe('Shared validated input shape for every authored Chart presentation item');

export const ChartPresentationPlotItemSchema = z
  .strictObject({
    key: z.literal(ChartPresentationDefaultItemKey.Plot).optional().describe('Fixed Chart Plot item identity'),
    ...ChartPresentationFlexItemShape,
    content: ChartPresentationPlotContentSchema.describe('Single resolved Plot placeholder'),
  })
  .describe('Authored Chart presentation item containing the single Plot placeholder');

export const ChartPresentationPresetItemSchema = z
  .strictObject({
    key: z.string().min(1).optional().describe('Optional item identity overriding the preset default key'),
    ...ChartPresentationFlexItemShape,
    content: ChartPresentationPresetContentSchema.describe('Chart text preset content'),
  })
  .describe('Authored Chart presentation item containing one text preset');

export const ChartPresentationChildItemSchema = z
  .strictObject({
    key: z.string().min(1).describe('Required container-local identity for custom content'),
    ...ChartPresentationFlexItemShape,
    content: ChartPresentationChildContentSchema.describe('Arbitrary JSON-safe child content'),
  })
  .describe('Authored Chart presentation item containing one arbitrary IRChild');

const ChartPresentationItemVariantSchema = z
  .union([ChartPresentationPlotItemSchema, ChartPresentationPresetItemSchema, ChartPresentationChildItemSchema])
  .describe('Schema-derived Chart presentation item output union');

type ChartPresentationItemBase = z.infer<typeof ChartPresentationItemBaseSchema>;
type ChartPresentationItemVariant = z.infer<typeof ChartPresentationItemVariantSchema>;

export const ChartPresentationItemSchema = ChartPresentationItemBaseSchema.pipe(
  ChartPresentationItemVariantSchema as z.ZodType<ChartPresentationItemVariant, ChartPresentationItemBase>,
).describe('Strict authored Chart presentation item with sparse Standard Flex fields');

type ChartPresentationItem = z.infer<typeof ChartPresentationItemSchema>;

type ChartPresentationInput = {
  layout?: z.infer<typeof ChartPresentationLayoutSchema>;
  children: Array<ChartPresentationItem>;
};

// 用 Standard Flex schema 校验 Chart 不拥有的 container 与 item 语义
const validateStandardFlexContract = (presentation: ChartPresentationInput, context: z.RefinementCtx): void => {
  const placeholder: IRChild = { type: 'scope', children: [] };
  const result = FlexLayoutSchema.safeParse({
    namespace: STANDARD_NAMESPACE,
    type: 'flexLayout',
    direction: FlexLayoutDirection.Column,
    wrap: FlexLayoutWrap.NoWrap,
    columnGap: 0,
    rowGap: 0,
    justifyContent: LayoutDistribution.Start,
    alignContent: LayoutDistribution.Start,
    ...presentation.layout,
    children: presentation.children.map((item, index) => {
      const { content } = item;
      const key =
        content.kind === ChartPresentationItemContentKind.Child && item.key === undefined
          ? `__invalid-chart-presentation-child-${index}`
          : chartPresentationItemKeyOf(item);
      return {
        ...(item.margin === undefined ? {} : { margin: item.margin }),
        ...(item.basis === undefined ? {} : { basis: item.basis }),
        ...(item.grow === undefined ? {} : { grow: item.grow }),
        ...(item.shrink === undefined ? {} : { shrink: item.shrink }),
        ...(item.min === undefined ? {} : { min: item.min }),
        ...(item.max === undefined ? {} : { max: item.max }),
        ...(item.alignSelf === undefined ? {} : { alignSelf: item.alignSelf }),
        kind: LayoutItemKind.Flex,
        key,
        child: content.kind === ChartPresentationItemContentKind.Child ? content.child : placeholder,
      };
    }),
  });
  if (result.success) return;
  for (const issue of result.error.issues) {
    const path = issue.path[0] === 'children' ? issue.path : ['layout', ...issue.path];
    context.addIssue({ ...issue, path });
  }
};

export const ChartPresentationSchema = z
  .strictObject({
    layout: ChartPresentationLayoutSchema.optional().describe('Optional sparse Standard Flex container overrides'),
    children: z.array(ChartPresentationItemSchema).min(1).describe('Non-empty presentation items in authored order'),
  })
  .superRefine((presentation, context) => {
    rejectOwnUndefined(presentation, context);
    const plotIndexes = presentation.children.flatMap((item, index) =>
      item.content.kind === ChartPresentationItemContentKind.Plot ? [index] : [],
    );
    if (plotIndexes.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['children'],
        message: 'Chart presentation requires exactly one Plot item',
      });
    } else if (plotIndexes.length > 1) {
      context.addIssue({
        code: 'custom',
        path: ['children', plotIndexes[1], 'content'],
        message: 'Chart presentation allows exactly one Plot item',
      });
    }
    validateStandardFlexContract(presentation, context);
  })
  .describe('Strict authored-order Chart presentation mapped to one Standard FlexLayout');
