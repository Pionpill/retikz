import type { IRChild } from '@retikz/core';
import type { IRPlotSpec } from '@retikz/plot';
import type { FlexLayoutItemInput } from '@retikz/standard';

import { NodeSchema } from '@retikz/core';
import {
  createFlexLayout,
  FlexLayoutDirection,
  FlexLayoutWrap,
  LayoutContainerBoxSchema,
  LayoutDistribution,
  LayoutItemKind,
} from '@retikz/standard';

import type {
  ChartPresentationPresetValue,
  IRChartPresentation,
  IRChartPresentationItemInspection,
  IRChartPresentationStyledText,
  IRChartPresentationText,
  IRChartResolvedStyleTokens,
} from '../../schemas';
import type { ResolvedChartPresentation } from './types';

import {
  CHART_PRESENTATION_RESOLVED_PLOT_SOURCE_PATH,
  ChartPresentationDefaultItemKey,
  ChartPresentationInspectionSchema,
  ChartPresentationItemContentKind,
  chartPresentationItemKeyOf,
  ChartPresentationPreset,
  ChartPresentationResolvedContentKind,
  ChartStyleToken,
} from '../../schemas';

/** 单个 presentation preset 使用的五个 resolved token key */
type PresentationPresetTokenKeys = {
  foreground:
    | typeof ChartStyleToken.ChartTitleForeground
    | typeof ChartStyleToken.ChartSubtitleForeground
    | typeof ChartStyleToken.ChartCaptionForeground
    | typeof ChartStyleToken.ChartNoteForeground
    | typeof ChartStyleToken.ChartSourceForeground
    | typeof ChartStyleToken.ChartCreditForeground;
  fontSize:
    | typeof ChartStyleToken.ChartTitleFontSize
    | typeof ChartStyleToken.ChartSubtitleFontSize
    | typeof ChartStyleToken.ChartCaptionFontSize
    | typeof ChartStyleToken.ChartNoteFontSize
    | typeof ChartStyleToken.ChartSourceFontSize
    | typeof ChartStyleToken.ChartCreditFontSize;
  fontWeight:
    | typeof ChartStyleToken.ChartTitleFontWeight
    | typeof ChartStyleToken.ChartSubtitleFontWeight
    | typeof ChartStyleToken.ChartCaptionFontWeight
    | typeof ChartStyleToken.ChartNoteFontWeight
    | typeof ChartStyleToken.ChartSourceFontWeight
    | typeof ChartStyleToken.ChartCreditFontWeight;
  lineHeight:
    | typeof ChartStyleToken.ChartTitleLineHeight
    | typeof ChartStyleToken.ChartSubtitleLineHeight
    | typeof ChartStyleToken.ChartCaptionLineHeight
    | typeof ChartStyleToken.ChartNoteLineHeight
    | typeof ChartStyleToken.ChartSourceLineHeight
    | typeof ChartStyleToken.ChartCreditLineHeight;
  align:
    | typeof ChartStyleToken.ChartTitleAlign
    | typeof ChartStyleToken.ChartSubtitleAlign
    | typeof ChartStyleToken.ChartCaptionAlign
    | typeof ChartStyleToken.ChartNoteAlign
    | typeof ChartStyleToken.ChartSourceAlign
    | typeof ChartStyleToken.ChartCreditAlign;
};

/** 六个文本 preset 与 Chart style token 的固定映射 */
const PRESENTATION_PRESET_TOKEN_KEYS: Readonly<Record<ChartPresentationPresetValue, PresentationPresetTokenKeys>> =
  Object.freeze({
    [ChartPresentationPreset.Title]: {
      foreground: ChartStyleToken.ChartTitleForeground,
      fontSize: ChartStyleToken.ChartTitleFontSize,
      fontWeight: ChartStyleToken.ChartTitleFontWeight,
      lineHeight: ChartStyleToken.ChartTitleLineHeight,
      align: ChartStyleToken.ChartTitleAlign,
    },
    [ChartPresentationPreset.Subtitle]: {
      foreground: ChartStyleToken.ChartSubtitleForeground,
      fontSize: ChartStyleToken.ChartSubtitleFontSize,
      fontWeight: ChartStyleToken.ChartSubtitleFontWeight,
      lineHeight: ChartStyleToken.ChartSubtitleLineHeight,
      align: ChartStyleToken.ChartSubtitleAlign,
    },
    [ChartPresentationPreset.Caption]: {
      foreground: ChartStyleToken.ChartCaptionForeground,
      fontSize: ChartStyleToken.ChartCaptionFontSize,
      fontWeight: ChartStyleToken.ChartCaptionFontWeight,
      lineHeight: ChartStyleToken.ChartCaptionLineHeight,
      align: ChartStyleToken.ChartCaptionAlign,
    },
    [ChartPresentationPreset.Note]: {
      foreground: ChartStyleToken.ChartNoteForeground,
      fontSize: ChartStyleToken.ChartNoteFontSize,
      fontWeight: ChartStyleToken.ChartNoteFontWeight,
      lineHeight: ChartStyleToken.ChartNoteLineHeight,
      align: ChartStyleToken.ChartNoteAlign,
    },
    [ChartPresentationPreset.Source]: {
      foreground: ChartStyleToken.ChartSourceForeground,
      fontSize: ChartStyleToken.ChartSourceFontSize,
      fontWeight: ChartStyleToken.ChartSourceFontWeight,
      lineHeight: ChartStyleToken.ChartSourceLineHeight,
      align: ChartStyleToken.ChartSourceAlign,
    },
    [ChartPresentationPreset.Credit]: {
      foreground: ChartStyleToken.ChartCreditForeground,
      fontSize: ChartStyleToken.ChartCreditFontSize,
      fontWeight: ChartStyleToken.ChartCreditFontWeight,
      lineHeight: ChartStyleToken.ChartCreditLineHeight,
      align: ChartStyleToken.ChartCreditAlign,
    },
  });

/** 区分 TextBlock shorthand 与带 wrapper style 的 preset object */
const isStyledText = (text: IRChartPresentationText): text is IRChartPresentationStyledText =>
  typeof text === 'object' && !Array.isArray(text);

/** 将一个 Chart 文本 preset 映射为无装饰 Core text Node */
const createPresentationTextNode = (
  preset: ChartPresentationPresetValue,
  value: IRChartPresentationText,
  tokens: IRChartResolvedStyleTokens,
): IRChild => {
  const authored = isStyledText(value) ? value : undefined;
  const tokenKeys = PRESENTATION_PRESET_TOKEN_KEYS[preset];
  return NodeSchema.parse({
    type: 'node',
    position: [0, 0],
    fill: 'none',
    stroke: 'none',
    strokeWidth: 0,
    padding: 0,
    margin: 0,
    text: authored?.text ?? value,
    textColor: authored?.textColor ?? tokens[tokenKeys.foreground],
    font: {
      family: tokens[ChartStyleToken.ChartFontFamily],
      size: tokens[tokenKeys.fontSize],
      weight: tokens[tokenKeys.fontWeight],
      ...authored?.font,
    },
    align: authored?.align ?? tokens[tokenKeys.align],
    lineHeight: authored?.lineHeight ?? tokens[tokenKeys.lineHeight],
    ...(authored?.maxTextWidth === undefined ? {} : { maxTextWidth: authored.maxTextWidth }),
  });
};

/** 建立一个 explicit presentation item 的 authored source path */
const presentationItemSourcePath = (index: number): string => `$spec/presentation/children/${index}`;

/** 提取一个 Chart item 显式 authored 的 sparse Standard Flex 字段 */
const presentationFlexFieldsOf = (
  item: IRChartPresentation['children'][number],
): Omit<FlexLayoutItemInput, 'kind' | 'key' | 'child'> => ({
  ...(item.margin === undefined ? {} : { margin: item.margin }),
  ...(item.basis === undefined ? {} : { basis: item.basis }),
  ...(item.grow === undefined ? {} : { grow: item.grow }),
  ...(item.shrink === undefined ? {} : { shrink: item.shrink }),
  ...(item.min === undefined ? {} : { min: item.min }),
  ...(item.max === undefined ? {} : { max: item.max }),
  ...(item.alignSelf === undefined ? {} : { alignSelf: item.alignSelf }),
});

/** 将一个 authored item 映射为 Standard Flex item 与轻量 inspection record */
const resolvePresentationItem = (
  item: IRChartPresentation['children'][number],
  index: number,
  plotSpec: IRPlotSpec,
  tokens: IRChartResolvedStyleTokens,
): { flexItem: FlexLayoutItemInput; inspection: IRChartPresentationItemInspection } => {
  const { content } = item;
  const flex = presentationFlexFieldsOf(item);
  const key = chartPresentationItemKeyOf(item);
  const sourcePath = presentationItemSourcePath(index);
  if (content.kind === ChartPresentationItemContentKind.Plot) {
    const plotKey = ChartPresentationDefaultItemKey.Plot;
    return {
      flexItem: { ...flex, kind: LayoutItemKind.Flex, key: plotKey, child: plotSpec },
      inspection: { key: plotKey, contentKind: ChartPresentationItemContentKind.Plot, sourcePath },
    };
  }
  if (content.kind === ChartPresentationItemContentKind.Preset) {
    return {
      flexItem: {
        ...flex,
        kind: LayoutItemKind.Flex,
        key,
        child: createPresentationTextNode(content.preset, content.text, tokens),
      },
      inspection: {
        key,
        contentKind: ChartPresentationItemContentKind.Preset,
        preset: content.preset,
        sourcePath,
      },
    };
  }
  return {
    flexItem: { ...flex, kind: LayoutItemKind.Flex, key, child: content.child },
    inspection: { key, contentKind: ChartPresentationItemContentKind.Child, sourcePath },
  };
};

/** 将可选 presentation 解析为 authored-order Standard Flex content 与 future surface handoff */
export const resolveChartPresentation = (
  presentation: IRChartPresentation | undefined,
  plotSpec: IRPlotSpec,
  tokens: IRChartResolvedStyleTokens,
): ResolvedChartPresentation => {
  const surfacePadding = LayoutContainerBoxSchema.shape.padding.parse(tokens[ChartStyleToken.ChartPadding]);
  if (presentation === undefined) {
    return {
      content: plotSpec,
      surfacePadding,
      inspection: ChartPresentationInspectionSchema.parse({
        contentKind: ChartPresentationResolvedContentKind.Plot,
        items: [
          {
            key: ChartPresentationDefaultItemKey.Plot,
            contentKind: ChartPresentationItemContentKind.Plot,
            sourcePath: CHART_PRESENTATION_RESOLVED_PLOT_SOURCE_PATH,
          },
        ],
      }),
    };
  }

  const resolved = presentation.children.map((item, index) => resolvePresentationItem(item, index, plotSpec, tokens));
  const content = createFlexLayout({
    direction: FlexLayoutDirection.Column,
    wrap: FlexLayoutWrap.NoWrap,
    columnGap: 0,
    rowGap: tokens[ChartStyleToken.ChartGap],
    justifyContent: LayoutDistribution.Start,
    alignContent: LayoutDistribution.Start,
    ...presentation.layout,
    children: resolved.map(item => item.flexItem),
  });
  return {
    content,
    surfacePadding,
    inspection: ChartPresentationInspectionSchema.parse({
      contentKind: ChartPresentationResolvedContentKind.FlexLayout,
      items: resolved.map(item => item.inspection),
    }),
  };
};
