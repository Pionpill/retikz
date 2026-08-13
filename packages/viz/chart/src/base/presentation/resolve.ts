import type { IRChild } from '@retikz/core';
import type { FlexLayoutItemInput } from '@retikz/layout';
import type { IRPlotSpec } from '@retikz/plot';

import { NodeSchema } from '@retikz/core';
import {
  createFlexLayout,
  FlexLayoutDirection,
  FlexLayoutWrap,
  LayoutDistribution,
  LayoutItemKind,
} from '@retikz/layout';

import type { IRChartResolvedThemeTokens } from '../style';
import type { ChartPresentationPresetValue } from './constants';
import type { ResolvedChartPresentation } from './resolved';
import type { IRChartPresentation, IRChartPresentationItem } from './types';

import { ChartThemeToken } from '../style';
import { ChartPresentationPreset } from './constants';
import { ChartPresentationInspectionSchema } from './inspection';

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

/** 按 canonical children 顺序映射为 Layout Flex，绝不按 preset 二次排序 */
export const resolveChartPresentation = (
  presentation: IRChartPresentation | undefined,
  plot: IRPlotSpec,
  tokens: IRChartResolvedThemeTokens,
): ResolvedChartPresentation => {
  if (presentation === undefined) {
    return {
      content: plot,
      inspection: ChartPresentationInspectionSchema.parse({
        kind: 'plot',
        items: [{ key: 'chart.plot', kind: 'plot', sourcePath: '$resolved/plot' }],
      }),
    };
  }

  const items = presentation.children.map((item, index) => ({
    flex: {
      ...flexFieldsOf(item),
      kind: LayoutItemKind.Flex,
      key: item.key,
      child: item.kind === 'plot' ? plot : presetNode(item, tokens),
    } satisfies FlexLayoutItemInput,
    inspection: {
      key: item.key,
      kind: item.kind,
      ...(item.kind === 'preset' ? { preset: item.preset } : {}),
      sourcePath: `$spec/presentation/children/${index}`,
    },
  }));
  return {
    content: createFlexLayout({
      direction: FlexLayoutDirection.Column,
      wrap: FlexLayoutWrap.NoWrap,
      gap: { column: 0, row: tokens[ChartThemeToken.ChartGap] },
      justifyContent: LayoutDistribution.Start,
      alignContent: LayoutDistribution.Start,
      children: items.map(item => item.flex),
    }),
    inspection: ChartPresentationInspectionSchema.parse({
      kind: 'flex-layout',
      items: items.map(item => item.inspection),
    }),
  };
};
