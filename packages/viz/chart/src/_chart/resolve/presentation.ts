import type { IRChild, IRNode, IRTextBlock } from '@retikz/core';
import type { FlexLayoutItemInput, IRFlexLayout } from '@retikz/layout';
import type { IRPlot } from '@retikz/plot';
import type { IRSurface } from '@retikz/standard';

import { NodeSchema } from '@retikz/core';
import {
  createFlexLayout,
  FlexLayoutDirection,
  FlexLayoutWrap,
  LayoutDistribution,
  LayoutItemKind,
} from '@retikz/layout';
import { PlotCoordinate } from '@retikz/plot';
import { createSurface } from '@retikz/standard';

import type { IRChartPresentation, IRChartSource } from '../schemas';
import type { IRChartThemeResolution } from '../schemas/theme';
import type { ChartPresentationResolution, EffectiveChartLayout } from './types';

import { ChartPresentationSlot, ChartThemeToken } from '../constants';

type PresentationSlot = keyof IRChartPresentation;

type PresentationTokenKeys = Readonly<{
  foreground: keyof IRChartThemeResolution;
  fontSize: keyof IRChartThemeResolution;
  fontWeight: keyof IRChartThemeResolution;
  lineHeight: keyof IRChartThemeResolution;
  align: keyof IRChartThemeResolution;
}>;

const PRESENTATION_TOKEN_KEYS: Readonly<Record<PresentationSlot, PresentationTokenKeys>> = {
  title: {
    foreground: ChartThemeToken.TitleForeground,
    fontSize: ChartThemeToken.TitleFontSize,
    fontWeight: ChartThemeToken.TitleFontWeight,
    lineHeight: ChartThemeToken.TitleLineHeight,
    align: ChartThemeToken.TitleAlign,
  },
  subtitle: {
    foreground: ChartThemeToken.SubtitleForeground,
    fontSize: ChartThemeToken.SubtitleFontSize,
    fontWeight: ChartThemeToken.SubtitleFontWeight,
    lineHeight: ChartThemeToken.SubtitleLineHeight,
    align: ChartThemeToken.SubtitleAlign,
  },
  note: {
    foreground: ChartThemeToken.NoteForeground,
    fontSize: ChartThemeToken.NoteFontSize,
    fontWeight: ChartThemeToken.NoteFontWeight,
    lineHeight: ChartThemeToken.NoteLineHeight,
    align: ChartThemeToken.NoteAlign,
  },
  source: {
    foreground: ChartThemeToken.SourceForeground,
    fontSize: ChartThemeToken.SourceFontSize,
    fontWeight: ChartThemeToken.SourceFontWeight,
    lineHeight: ChartThemeToken.SourceLineHeight,
    align: ChartThemeToken.SourceAlign,
  },
};

const DEFAULT_CARTESIAN_CHART_LAYOUT: EffectiveChartLayout = { width: 800, height: 500 };
const DEFAULT_POLAR_CHART_LAYOUT: EffectiveChartLayout = { width: 400, height: 500 };

/** 读取 Plot 默认视图实际使用的坐标系 */
const defaultCoordinateTypeOf = (plot: IRPlot): string | undefined => {
  if (plot.coordinate !== undefined) return plot.coordinate.type;
  const composition = plot.composition;
  return composition?.views?.find(view => view.id === composition.defaultView)?.coordinate.type;
};

/** 按最终坐标系补齐 Chart 外部尺寸，同时保留 authored dimension 优先级 */
const resolveChartLayout = (source: IRChartSource, plot: IRPlot): EffectiveChartLayout => {
  const coordinateType = defaultCoordinateTypeOf(plot);
  const defaults =
    coordinateType === PlotCoordinate.Polar1D || coordinateType === PlotCoordinate.Polar2D
      ? DEFAULT_POLAR_CHART_LAYOUT
      : DEFAULT_CARTESIAN_CHART_LAYOUT;
  return { ...defaults, ...source.layout };
};

const textNodeOf = (
  slot: PresentationSlot,
  text: IRTextBlock,
  tokens: IRChartThemeResolution,
  id: string | undefined,
): IRNode => {
  const keys = PRESENTATION_TOKEN_KEYS[slot];
  return NodeSchema.parse({
    type: 'node',
    ...(id === undefined ? {} : { id }),
    position: [0, 0],
    fill: 'none',
    stroke: 'none',
    strokeWidth: 0,
    padding: 0,
    margin: 0,
    text,
    textColor: tokens[keys.foreground],
    font: {
      family: tokens[ChartThemeToken.FontFamily],
      size: tokens[keys.fontSize],
      weight: tokens[keys.fontWeight],
    },
    align: tokens[keys.align],
    lineHeight: tokens[keys.lineHeight],
  });
};

const flexOf = (
  presentation: IRChartPresentation,
  plot: IRPlot,
  tokens: IRChartThemeResolution,
  id: string | undefined,
): Readonly<{ content: IRFlexLayout; slots: ReadonlyArray<'title' | 'subtitle' | 'plot' | 'note' | 'source'> }> => {
  const children: Array<FlexLayoutItemInput> = [];
  const slots: Array<'title' | 'subtitle' | 'plot' | 'note' | 'source'> = [];
  const appendText = (slot: PresentationSlot): void => {
    const text = presentation[slot];
    if (text === undefined) return;
    slots.push(slot);
    children.push({
      kind: LayoutItemKind.Flex,
      key: `chart.presentation.${slot}`,
      child: textNodeOf(slot, text, tokens, id === undefined ? undefined : `${id}/presentation/${slot}`),
    });
  };

  appendText('title');
  appendText('subtitle');
  slots.push(ChartPresentationSlot.Plot);
  children.push({ kind: LayoutItemKind.Flex, key: 'chart.plot', child: plot, grow: 1 });
  appendText('note');
  appendText('source');

  return {
    content: createFlexLayout({
      direction: FlexLayoutDirection.Column,
      wrap: FlexLayoutWrap.NoWrap,
      gap: { column: 0, row: tokens[ChartThemeToken.Gap] },
      justifyContent: LayoutDistribution.Start,
      alignContent: LayoutDistribution.Start,
      children,
    }),
    slots,
  };
};

/** 生成固定 title → subtitle → plot → note → source presentation 与 Surface */
export const resolveChartPresentation = (
  source: IRChartSource,
  plot: IRPlot,
  tokens: IRChartThemeResolution,
): ChartPresentationResolution => {
  const id = source.id;
  const resolved =
    source.presentation === undefined
      ? { content: plot, slots: [ChartPresentationSlot.Plot] as const }
      : flexOf(source.presentation, plot, tokens, id);
  const content: IRChild = resolved.content;
  const surface: IRSurface = createSurface({
    namespace: 'standard',
    type: 'surface',
    ...(id === undefined ? {} : { id }),
    child: content,
    padding: tokens[ChartThemeToken.Padding],
    background: { fill: tokens[ChartThemeToken.CanvasFill] },
  });
  return {
    content,
    surface,
    layout: resolveChartLayout(source, plot),
    slots: resolved.slots,
  };
};
