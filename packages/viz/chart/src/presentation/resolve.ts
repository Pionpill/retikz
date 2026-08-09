import type { IRChild } from '@retikz/core';
import type { FlexLayoutItemInput } from '@retikz/layout';
import type { IRPlotSpec } from '@retikz/plot';

import { NodeSchema } from '@retikz/core';
import {
  createFlexLayout,
  FlexLayoutDirection,
  FlexLayoutWrap,
  LayoutContainerBoxSchema,
  LayoutDistribution,
  LayoutItemKind,
} from '@retikz/layout';

import type { IRChartResolvedThemeTokens } from '../style';
import type { ChartPresentationPresetValue } from './constants';
import type { IRChartPresentationItemInspection } from './inspection';
import type { ResolvedChartPresentation } from './resolved';
import type { IRChartPresentation, IRChartPresentationStyledText, IRChartPresentationText } from './types';

import { ChartThemeToken } from '../style';
import {
  CHART_PRESENTATION_RESOLVED_PLOT_SOURCE_PATH,
  ChartPresentationDefaultItemKey,
  ChartPresentationItemContentKind,
  chartPresentationItemKeyOf,
  ChartPresentationPreset,
  ChartPresentationResolvedContentKind,
} from './constants';
import { ChartPresentationInspectionSchema } from './inspection';

/** 单个 presentation preset 使用的五个 resolved token key */
type PresentationPresetTokenKeys = {
  foreground:
    | typeof ChartThemeToken.ChartTitleForeground
    | typeof ChartThemeToken.ChartSubtitleForeground
    | typeof ChartThemeToken.ChartCaptionForeground
    | typeof ChartThemeToken.ChartNoteForeground
    | typeof ChartThemeToken.ChartSourceForeground
    | typeof ChartThemeToken.ChartCreditForeground;
  fontSize:
    | typeof ChartThemeToken.ChartTitleFontSize
    | typeof ChartThemeToken.ChartSubtitleFontSize
    | typeof ChartThemeToken.ChartCaptionFontSize
    | typeof ChartThemeToken.ChartNoteFontSize
    | typeof ChartThemeToken.ChartSourceFontSize
    | typeof ChartThemeToken.ChartCreditFontSize;
  fontWeight:
    | typeof ChartThemeToken.ChartTitleFontWeight
    | typeof ChartThemeToken.ChartSubtitleFontWeight
    | typeof ChartThemeToken.ChartCaptionFontWeight
    | typeof ChartThemeToken.ChartNoteFontWeight
    | typeof ChartThemeToken.ChartSourceFontWeight
    | typeof ChartThemeToken.ChartCreditFontWeight;
  lineHeight:
    | typeof ChartThemeToken.ChartTitleLineHeight
    | typeof ChartThemeToken.ChartSubtitleLineHeight
    | typeof ChartThemeToken.ChartCaptionLineHeight
    | typeof ChartThemeToken.ChartNoteLineHeight
    | typeof ChartThemeToken.ChartSourceLineHeight
    | typeof ChartThemeToken.ChartCreditLineHeight;
  align:
    | typeof ChartThemeToken.ChartTitleAlign
    | typeof ChartThemeToken.ChartSubtitleAlign
    | typeof ChartThemeToken.ChartCaptionAlign
    | typeof ChartThemeToken.ChartNoteAlign
    | typeof ChartThemeToken.ChartSourceAlign
    | typeof ChartThemeToken.ChartCreditAlign;
};

/** 六个文本 preset 与 Chart style token 的固定映射 */
const PRESENTATION_PRESET_TOKEN_KEYS: Readonly<Record<ChartPresentationPresetValue, PresentationPresetTokenKeys>> =
  Object.freeze({
    [ChartPresentationPreset.Title]: {
      foreground: ChartThemeToken.ChartTitleForeground,
      fontSize: ChartThemeToken.ChartTitleFontSize,
      fontWeight: ChartThemeToken.ChartTitleFontWeight,
      lineHeight: ChartThemeToken.ChartTitleLineHeight,
      align: ChartThemeToken.ChartTitleAlign,
    },
    [ChartPresentationPreset.Subtitle]: {
      foreground: ChartThemeToken.ChartSubtitleForeground,
      fontSize: ChartThemeToken.ChartSubtitleFontSize,
      fontWeight: ChartThemeToken.ChartSubtitleFontWeight,
      lineHeight: ChartThemeToken.ChartSubtitleLineHeight,
      align: ChartThemeToken.ChartSubtitleAlign,
    },
    [ChartPresentationPreset.Caption]: {
      foreground: ChartThemeToken.ChartCaptionForeground,
      fontSize: ChartThemeToken.ChartCaptionFontSize,
      fontWeight: ChartThemeToken.ChartCaptionFontWeight,
      lineHeight: ChartThemeToken.ChartCaptionLineHeight,
      align: ChartThemeToken.ChartCaptionAlign,
    },
    [ChartPresentationPreset.Note]: {
      foreground: ChartThemeToken.ChartNoteForeground,
      fontSize: ChartThemeToken.ChartNoteFontSize,
      fontWeight: ChartThemeToken.ChartNoteFontWeight,
      lineHeight: ChartThemeToken.ChartNoteLineHeight,
      align: ChartThemeToken.ChartNoteAlign,
    },
    [ChartPresentationPreset.Source]: {
      foreground: ChartThemeToken.ChartSourceForeground,
      fontSize: ChartThemeToken.ChartSourceFontSize,
      fontWeight: ChartThemeToken.ChartSourceFontWeight,
      lineHeight: ChartThemeToken.ChartSourceLineHeight,
      align: ChartThemeToken.ChartSourceAlign,
    },
    [ChartPresentationPreset.Credit]: {
      foreground: ChartThemeToken.ChartCreditForeground,
      fontSize: ChartThemeToken.ChartCreditFontSize,
      fontWeight: ChartThemeToken.ChartCreditFontWeight,
      lineHeight: ChartThemeToken.ChartCreditLineHeight,
      align: ChartThemeToken.ChartCreditAlign,
    },
  });

/** 区分 TextBlock shorthand 与带 wrapper style 的 preset object */
const isStyledText = (text: IRChartPresentationText): text is IRChartPresentationStyledText =>
  typeof text === 'object' && !Array.isArray(text);

/** 将一个 Chart 文本 preset 映射为无装饰 Core text Node */
const createPresentationTextNode = (
  preset: ChartPresentationPresetValue,
  value: IRChartPresentationText,
  tokens: IRChartResolvedThemeTokens,
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
      family: tokens[ChartThemeToken.ChartFontFamily],
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

/** 提取一个 Chart item 显式 authored 的 sparse Layout Flex 字段 */
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

/** 将一个 authored item 映射为 Layout Flex item 与轻量 inspection record */
const resolvePresentationItem = (
  item: IRChartPresentation['children'][number],
  index: number,
  plotSpec: IRPlotSpec,
  tokens: IRChartResolvedThemeTokens,
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

/** 将可选 presentation 解析为 authored-order Layout Flex content 与 future surface handoff */
export const resolveChartPresentation = (
  presentation: IRChartPresentation | undefined,
  plotSpec: IRPlotSpec,
  tokens: IRChartResolvedThemeTokens,
): ResolvedChartPresentation => {
  const surfacePadding = LayoutContainerBoxSchema.shape.padding.parse(tokens[ChartThemeToken.ChartPadding]);
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
    gap: { column: 0, row: tokens[ChartThemeToken.ChartGap] },
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
