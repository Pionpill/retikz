import type { IRTextBlock } from '@retikz/core';

import { FontSchema, NodeSchema, TextBlockSchema } from '@retikz/core';
import { FlexLayoutItemSchema } from '@retikz/layout';
import { z } from 'zod';

import {
  CHART_PRESENTATION_ITEM_KEY_BY_PRESET,
  ChartPresentationItemKey,
  ChartPresentationPosition,
  ChartPresentationPreset,
} from './constants';

/** 判断 Core TextBlock 是否包含至少一个非空 text 或 tex leaf */
const hasTextContent = (block: IRTextBlock): boolean => {
  if (typeof block === 'string') return block.length > 0;
  return block.some(line => {
    if (typeof line === 'string') return line.length > 0;
    if ('text' in line) return line.text.length > 0;
    return line.runs.some(run => ('text' in run ? run.text.length > 0 : run.tex.length > 0));
  });
};

/** Chart presentation 使用的非空 Core TextBlock */
export const ChartPresentationTextSchema = TextBlockSchema.refine(hasTextContent, {
  message: 'Chart presentation text requires at least one non-empty text or tex value',
});

/** Chart 从 Layout Flex item 复用的公开字段 */
export const ChartPresentationFlexItemSchema = z.strictObject({
  margin: FlexLayoutItemSchema.shape.margin.unwrap().optional(),
  basis: FlexLayoutItemSchema.shape.basis.unwrap().optional(),
  grow: FlexLayoutItemSchema.shape.grow.unwrap().optional(),
  shrink: FlexLayoutItemSchema.shape.shrink.unwrap().optional(),
  min: FlexLayoutItemSchema.shape.min.unwrap().optional(),
  max: FlexLayoutItemSchema.shape.max.unwrap().optional(),
  alignSelf: FlexLayoutItemSchema.shape.alignSelf.unwrap().optional(),
});

const ChartPresentationFlexItemShape = ChartPresentationFlexItemSchema.shape;
const ChartPresentationTextStyleShape = {
  font: FontSchema.optional(),
  textColor: NodeSchema.shape.textColor.unwrap().optional(),
  align: NodeSchema.shape.align.unwrap().optional(),
  lineHeight: NodeSchema.shape.lineHeight.unwrap().optional(),
  maxTextWidth: NodeSchema.shape.maxTextWidth.unwrap().optional(),
};

/** canonical presentation 中唯一 Plot placeholder */
export const ChartPresentationPlotItemSchema = z.strictObject({
  kind: z.literal('plot'),
  key: z.literal(ChartPresentationItemKey.Plot),
  ...ChartPresentationFlexItemShape,
});

const presetItemSchema = <TPreset extends keyof typeof CHART_PRESENTATION_ITEM_KEY_BY_PRESET>(preset: TPreset) =>
  z.strictObject({
    kind: z.literal('preset'),
    key: z.literal(CHART_PRESENTATION_ITEM_KEY_BY_PRESET[preset]),
    preset: z.literal(preset),
    text: ChartPresentationTextSchema,
    ...ChartPresentationTextStyleShape,
    ...ChartPresentationFlexItemShape,
  });

/** canonical title item */
export const ChartPresentationTitleItemSchema = presetItemSchema(ChartPresentationPreset.Title);
/** canonical subtitle item */
export const ChartPresentationSubtitleItemSchema = presetItemSchema(ChartPresentationPreset.Subtitle);
/** canonical note item */
export const ChartPresentationNoteItemSchema = presetItemSchema(ChartPresentationPreset.Note);
/** canonical source item */
export const ChartPresentationSourceItemSchema = presetItemSchema(ChartPresentationPreset.Source);

/** canonical Chart presentation item */
export const ChartPresentationItemSchema = z.union([
  ChartPresentationPlotItemSchema,
  ChartPresentationTitleItemSchema,
  ChartPresentationSubtitleItemSchema,
  ChartPresentationNoteItemSchema,
  ChartPresentationSourceItemSchema,
]);

/** canonical authored-order Chart presentation */
export const ChartPresentationSchema = z
  .strictObject({
    children: z.array(ChartPresentationItemSchema).min(1),
  })
  .superRefine((presentation, context) => {
    const plotCount = presentation.children.filter(item => item.kind === 'plot').length;
    if (plotCount !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['children'],
        message: 'Chart presentation requires exactly one Plot item',
      });
    }
    const presets = new Set<string>();
    presentation.children.forEach((item, index) => {
      if (item.kind !== 'preset') return;
      if (presets.has(item.preset)) {
        context.addIssue({
          code: 'custom',
          path: ['children', index, 'preset'],
          message: `Chart presentation preset '${item.preset}' may appear at most once`,
        });
      }
      presets.add(item.preset);
    });
  });

/** framework-neutral presentation authoring record */
export const ChartPresentationAuthoringRecordSchema = z.strictObject({
  preset: z.enum(ChartPresentationPreset),
  position: z.enum(ChartPresentationPosition).optional(),
  text: ChartPresentationTextSchema,
  ...ChartPresentationTextStyleShape,
  ...ChartPresentationFlexItemShape,
});
