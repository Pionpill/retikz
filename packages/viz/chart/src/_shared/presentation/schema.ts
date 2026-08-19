import type { IRTextBlock } from '@retikz/core';

import { FontSchema, NodeSchema, TextBlockSchema } from '@retikz/core';
import { FlexLayoutItemSchema } from '@retikz/layout';
import { z } from 'zod';

import { CHART_PRESENTATION_ITEM_KEY_BY_PRESET, ChartPresentationItemKey, ChartPresentationPreset } from './constants';

/** 判断 Core TextBlock 是否包含至少一个非空文本或公式叶节点 */
const hasTextContent = (block: IRTextBlock): boolean => {
  if (typeof block === 'string') return block.length > 0;
  return block.some(line => {
    if (typeof line === 'string') return line.length > 0;
    if ('text' in line) return line.text.length > 0;
    return line.runs.some(run => ('text' in run ? run.text.length > 0 : run.tex.length > 0));
  });
};

/** Chart 展示使用的非空 Core TextBlock */
export const ChartPresentationTextSchema = TextBlockSchema.refine(hasTextContent, {
  message: 'Chart presentation text requires at least one non-empty text or tex value',
});

/** Chart 从 Layout Flex 展示项复用的公开字段 */
export const ChartPresentationFlexItemSchema = z.strictObject({
  margin: FlexLayoutItemSchema.shape.margin.unwrap().optional(),
  basis: FlexLayoutItemSchema.shape.basis.unwrap().optional(),
  grow: FlexLayoutItemSchema.shape.grow.unwrap().optional(),
  shrink: FlexLayoutItemSchema.shape.shrink.unwrap().optional(),
  min: FlexLayoutItemSchema.shape.min.unwrap().optional(),
  max: FlexLayoutItemSchema.shape.max.unwrap().optional(),
  alignSelf: FlexLayoutItemSchema.shape.alignSelf.unwrap().optional(),
});

const ChartPresentationTextStyleShape = {
  font: FontSchema.optional(),
  textColor: NodeSchema.shape.textColor.unwrap().optional(),
  align: NodeSchema.shape.align.unwrap().optional(),
  lineHeight: NodeSchema.shape.lineHeight.unwrap().optional(),
  maxTextWidth: NodeSchema.shape.maxTextWidth.unwrap().optional(),
};

/** 确定展示结构中唯一的 Plot 占位项 */
export const ChartPresentationPlotItemSchema = z.strictObject({
  kind: z.literal('plot'),
  key: z.literal(ChartPresentationItemKey.Plot),
  ...ChartPresentationFlexItemSchema.shape,
});

const presetItemSchema = <TPreset extends keyof typeof CHART_PRESENTATION_ITEM_KEY_BY_PRESET>(preset: TPreset) =>
  z.strictObject({
    kind: z.literal('preset'),
    key: z.literal(CHART_PRESENTATION_ITEM_KEY_BY_PRESET[preset]),
    preset: z.literal(preset),
    text: ChartPresentationTextSchema,
    ...ChartPresentationTextStyleShape,
    ...ChartPresentationFlexItemSchema.shape,
  });

/** 确定形态的标题项 */
export const ChartPresentationTitleItemSchema = presetItemSchema(ChartPresentationPreset.Title);
/** 确定形态的副标题项 */
export const ChartPresentationSubtitleItemSchema = presetItemSchema(ChartPresentationPreset.Subtitle);
/** 确定形态的注释项 */
export const ChartPresentationNoteItemSchema = presetItemSchema(ChartPresentationPreset.Note);
/** 确定形态的数据来源项 */
export const ChartPresentationSourceItemSchema = presetItemSchema(ChartPresentationPreset.Source);

/** 确定形态的 Chart 展示项 */
export const ChartPresentationItemSchema = z.union([
  ChartPresentationPlotItemSchema,
  ChartPresentationTitleItemSchema,
  ChartPresentationSubtitleItemSchema,
  ChartPresentationNoteItemSchema,
  ChartPresentationSourceItemSchema,
]);

/** 按编写顺序确定的 Chart 展示结构 */
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
