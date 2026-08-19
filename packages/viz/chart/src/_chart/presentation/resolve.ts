import type { IRChild } from '@retikz/core';
import type { FlexLayoutItemInput } from '@retikz/layout';
import type { IRPlot } from '@retikz/plot';

import { NodeSchema } from '@retikz/core';
import {
  createFlexLayout,
  FlexLayoutDirection,
  FlexLayoutWrap,
  LayoutDistribution,
  LayoutItemKind,
} from '@retikz/layout';

import type { ChartPresentationPresetValue } from '../../_shared/presentation';
import type { IRChartPresentation, IRChartPresentationItem } from '../../_shared/presentation';
import type { IRChartResolvedThemeTokens } from '../../_shared/style';

import { ChartPresentationPreset } from '../../_shared/presentation';
import { ChartThemeToken } from '../../_shared/style';

type PresentationPresetTokenKeys = {
  foreground: keyof IRChartResolvedThemeTokens;
  fontSize: keyof IRChartResolvedThemeTokens;
  fontWeight: keyof IRChartResolvedThemeTokens;
  lineHeight: keyof IRChartResolvedThemeTokens;
  align: keyof IRChartResolvedThemeTokens;
};

const PRESENTATION_PRESET_TOKEN_KEYS: Readonly<Record<ChartPresentationPresetValue, PresentationPresetTokenKeys>> = {
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
};

const flexFieldsOf = (item: IRChartPresentationItem): Omit<FlexLayoutItemInput, 'kind' | 'key' | 'child'> => ({
  ...(item.margin === undefined ? {} : { margin: item.margin }),
  ...(item.basis === undefined ? {} : { basis: item.basis }),
  ...(item.grow === undefined ? {} : { grow: item.grow }),
  ...(item.shrink === undefined ? {} : { shrink: item.shrink }),
  ...(item.min === undefined ? {} : { min: item.min }),
  ...(item.max === undefined ? {} : { max: item.max }),
  ...(item.alignSelf === undefined ? {} : { alignSelf: item.alignSelf }),
});

const presetNode = (
  item: Extract<IRChartPresentationItem, { kind: 'preset' }>,
  tokens: IRChartResolvedThemeTokens,
): IRChild => {
  const keys = PRESENTATION_PRESET_TOKEN_KEYS[item.preset];
  return NodeSchema.parse({
    type: 'node',
    position: [0, 0],
    fill: 'none',
    stroke: 'none',
    strokeWidth: 0,
    padding: 0,
    margin: 0,
    text: item.text,
    textColor: item.textColor ?? tokens[keys.foreground],
    font: {
      family: tokens[ChartThemeToken.ChartFontFamily],
      size: tokens[keys.fontSize],
      weight: tokens[keys.fontWeight],
      ...item.font,
    },
    align: item.align ?? tokens[keys.align],
    lineHeight: item.lineHeight ?? tokens[keys.lineHeight],
    ...(item.maxTextWidth === undefined ? {} : { maxTextWidth: item.maxTextWidth }),
  });
};

/** 按确定的子项顺序映射为 Layout Flex，绝不按预设二次排序 */
export const resolveChartPresentation = (
  presentation: IRChartPresentation | undefined,
  plot: IRPlot,
  tokens: IRChartResolvedThemeTokens,
): IRChild => {
  if (presentation === undefined) return plot;

  const items = presentation.children.map(
    item =>
      ({
        ...flexFieldsOf(item),
        kind: LayoutItemKind.Flex,
        key: item.key,
        child: item.kind === 'plot' ? plot : presetNode(item, tokens),
      }) satisfies FlexLayoutItemInput,
  );
  return createFlexLayout({
    direction: FlexLayoutDirection.Column,
    wrap: FlexLayoutWrap.NoWrap,
    gap: { column: 0, row: tokens[ChartThemeToken.ChartGap] },
    justifyContent: LayoutDistribution.Start,
    alignContent: LayoutDistribution.Start,
    children: items,
  });
};
