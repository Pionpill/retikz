import type { ThemeModeValue, ThemeStyleValue } from '@retikz/core';

import { ThemeMode, ThemeStyle } from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

// @ts-expect-error Chart resolver 结果必须保持 owner-private
import type { ChartResolution } from '../src';
// @ts-expect-error presentation content resolver 结果必须保持 owner-private
import type { ResolvedChartPresentation } from '../src';
// @ts-expect-error recipe 基础类型必须保持 owner-private
import type { InternalChartSpecBound } from '../src';
// @ts-expect-error 通用 style 取值类型由 Core 所有
import type { ChartStyleValue } from '../src';
// @ts-expect-error 通用 mode 取值类型由 Core 所有
import type { ChartThemeModeValue } from '../src';
import type {
  ChartContributionSourceValue,
  ChartPresentationDefaultItemKeyValue,
  ChartPresentationItemContentKindValue,
  ChartPresentationPresetValue,
  ChartPresentationResolvedContentKindValue,
  ChartStyleTokenSourceValue,
  ChartStyleTokenValue,
  IRChartInspection,
  IRChartInspectionMember,
  IRChartPresentation,
  IRChartPresentationChildContent,
  IRChartPresentationChildItem,
  IRChartPresentationInspection,
  IRChartPresentationItem,
  IRChartPresentationItemContent,
  IRChartPresentationItemInspection,
  IRChartPresentationLayout,
  IRChartPresentationPlotContent,
  IRChartPresentationPlotItem,
  IRChartPresentationPresetContent,
  IRChartPresentationPresetItem,
  IRChartPresentationStyledText,
  IRChartPresentationText,
  IRChartPresentationTextBlock,
  IRChartResolvedStyleTokens,
  IRChartShared,
  IRChartStyleSurface,
  IRChartStyleTokenOverrides,
} from '../src';

import * as chart from '../src';

describe('@retikz/chart package root', () => {
  it('拒绝 owner-private 类型从包根导入', () => {
    expectTypeOf<ChartResolution>();
    expectTypeOf<ResolvedChartPresentation>();
    expectTypeOf<InternalChartSpecBound>();
    expectTypeOf<ChartStyleValue>();
    expectTypeOf<ChartThemeModeValue>();
  });

  it('只暴露 shared、presentation、inspection 与 theme 数据契约', () => {
    expect(Object.keys(chart).sort()).toEqual([
      'CHART_PRESENTATION_DEFAULT_ITEM_KEY_BY_PRESET',
      'ChartContributionSource',
      'ChartInspectionMemberSchema',
      'ChartInspectionSchema',
      'ChartPresentationChildContentSchema',
      'ChartPresentationChildItemSchema',
      'ChartPresentationDefaultItemKey',
      'ChartPresentationInspectionSchema',
      'ChartPresentationItemContentKind',
      'ChartPresentationItemContentSchema',
      'ChartPresentationItemInspectionSchema',
      'ChartPresentationItemSchema',
      'ChartPresentationLayoutSchema',
      'ChartPresentationPlotContentSchema',
      'ChartPresentationPlotItemSchema',
      'ChartPresentationPreset',
      'ChartPresentationPresetContentSchema',
      'ChartPresentationPresetItemSchema',
      'ChartPresentationResolvedContentKind',
      'ChartPresentationSchema',
      'ChartPresentationStyledTextSchema',
      'ChartPresentationTextBlockSchema',
      'ChartPresentationTextSchema',
      'ChartResolvedStyleTokensSchema',
      'ChartSharedSchema',
      'ChartStyleSurfaceSchema',
      'ChartStyleToken',
      'ChartStyleTokenOverridesSchema',
      'ChartStyleTokenSource',
    ]);
    expect(chart.ChartStyleTokenSource).toEqual({ Preset: 'preset', StyleToken: 'style-token' });
    expect(chart).not.toHaveProperty('ChartStyle');
    expect(chart).not.toHaveProperty('ChartThemeMode');
    expect(ThemeStyle).toEqual({ Neutral: 'neutral', Academic: 'academic', Vibrant: 'vibrant', Clean: 'clean' });
    expect(ThemeMode).toEqual({ Light: 'light', Dark: 'dark' });
    expect(chart.ChartPresentationDefaultItemKey.Plot).toBe('chart.plot');
    expect(chart.ChartPresentationPreset).toHaveProperty('Title', 'title');
  });

  it('公开 schema 派生 presentation union 而不公开 resolver 或 recipe', () => {
    const style: ThemeStyleValue = ThemeStyle.Neutral;
    const mode: ThemeModeValue = ThemeMode.Dark;
    const token: ChartStyleTokenValue = 'chart.axis.enabled';
    const tokenSource: ChartStyleTokenSourceValue = 'style-token';
    const overrides: IRChartStyleTokenOverrides = { [token]: false };
    const surface: IRChartStyleSurface = {
      chartThemeTokens: overrides,
      plotThemeTokens: { 'plot.palette.series': ['#2563eb'] },
    };
    const shared: IRChartShared = { data: { reference: 'rows' }, ...surface };
    const preset: ChartPresentationPresetValue = 'title';
    const itemContentKind: ChartPresentationItemContentKindValue = 'preset';
    const resolvedContentKind: ChartPresentationResolvedContentKindValue = 'flex-layout';
    const plotKey: ChartPresentationDefaultItemKeyValue = 'chart.plot';
    const textBlock: IRChartPresentationTextBlock = 'Revenue';
    const styledText: IRChartPresentationStyledText = { text: textBlock, font: { size: 20 } };
    const text: IRChartPresentationText = styledText;
    const plotContent: IRChartPresentationPlotContent = { kind: 'plot' };
    const presetContent: IRChartPresentationPresetContent = { kind: 'preset', preset, text };
    const childContent: IRChartPresentationChildContent = {
      kind: 'child',
      child: { type: 'scope', children: [] },
    };
    const content: IRChartPresentationItemContent = presetContent;
    const plotItem: IRChartPresentationPlotItem = { content: plotContent };
    const presetItem: IRChartPresentationPresetItem = { content: presetContent };
    const childItem: IRChartPresentationChildItem = { key: 'badge', content: childContent };
    const item: IRChartPresentationItem = presetItem;
    const presentationLayout: IRChartPresentationLayout = { gap: { column: 0, row: 8 }, alignItems: 'start' };
    const presentation: IRChartPresentation = {
      layout: presentationLayout,
      children: [presetItem, plotItem, childItem],
    };
    const itemInspection: IRChartPresentationItemInspection = {
      key: 'chart.presentation.title',
      contentKind: itemContentKind,
      preset,
      sourcePath: '$spec/presentation/children/0',
    };
    const presentationInspection: IRChartPresentationInspection = {
      contentKind: resolvedContentKind,
      items: [itemInspection, { key: plotKey, contentKind: 'plot', sourcePath: '$spec/presentation/children/1' }],
    };
    const source: ChartContributionSourceValue = 'type-default';
    const member: IRChartInspectionMember = {
      target: 'mark.main',
      kind: 'mark',
      core: true,
      value: { type: 'point' },
      sources: [{ kind: source, path: '$recipe/scatter/mark.main' }],
    };
    expectTypeOf<IRChartResolvedStyleTokens>().toMatchTypeOf<IRChartInspection['style']['chart']['tokens']>();
    expectTypeOf<IRChartInspectionMember>().toMatchTypeOf<typeof member>();

    expect({
      shared,
      member,
      style,
      mode,
      tokenSource,
      presentation,
      presentationInspection,
      content,
      item,
    }).toBeDefined();
  });
});
