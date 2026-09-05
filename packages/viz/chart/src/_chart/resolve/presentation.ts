import type { IRChild, IRNode } from '@retikz/core';
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
import { createSurface } from '@retikz/standard';

import type { IRChartDefaults, IRChartPresentation, IRChartSource } from '../schemas';
import type { ChartPresentationResolution, EffectiveChartLayout } from './types';

import { ChartPresentationSlot } from '../constants';

const DEFAULT_CARTESIAN_CHART_LAYOUT: EffectiveChartLayout = { width: 800, height: 500 };
const DEFAULT_POLAR_CHART_LAYOUT: EffectiveChartLayout = { width: 400, height: 500 };

type TextSlot = 'title' | 'subtitle' | 'note' | 'source';

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
    coordinateType === 'polar-1d' || coordinateType === 'polar-2d'
      ? DEFAULT_POLAR_CHART_LAYOUT
      : DEFAULT_CARTESIAN_CHART_LAYOUT;
  return { ...defaults, ...source.layout };
};

/** 对已存在的 presentation 区域应用生成 defaults 与显式 Source */
const textNodeOf = (
  slot: TextSlot,
  region: NonNullable<IRChartPresentation[TextSlot]>,
  defaults: IRChartDefaults,
  id: string | undefined,
): IRNode => {
  const regionDefaults = defaults.presentation?.[slot];
  return NodeSchema.parse({
    type: 'node',
    ...(id === undefined ? {} : { id }),
    position: [0, 0],
    text: region.text,
    style: {
      fill: 'none',
      stroke: 'none',
      strokeWidth: 0,
      ...(regionDefaults?.style ?? {}),
      ...(region.style ?? {}),
    },
    layout: {
      padding: 0,
      margin: 0,
      ...(regionDefaults?.layout ?? {}),
      ...(region.layout ?? {}),
    },
  });
};

const flexOf = (
  presentation: IRChartPresentation,
  plot: IRPlot,
  defaults: IRChartDefaults,
  id: string | undefined,
): Readonly<{ content: IRFlexLayout; slots: ReadonlyArray<'title' | 'subtitle' | 'plot' | 'note' | 'source'> }> => {
  const children: Array<FlexLayoutItemInput> = [];
  const slots: Array<'title' | 'subtitle' | 'plot' | 'note' | 'source'> = [];
  const appendText = (slot: TextSlot): void => {
    const region = presentation[slot];
    if (region === undefined) return;
    slots.push(slot);
    children.push({
      kind: LayoutItemKind.Flex,
      key: `chart.presentation.${slot}`,
      child: textNodeOf(slot, region, defaults, id === undefined ? undefined : `${id}/presentation/${slot}`),
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
      gap: { column: 0, row: defaults.layout?.gap ?? 0 },
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
  defaults: IRChartDefaults,
): ChartPresentationResolution => {
  const id = source.id;
  const resolved =
    source.presentation === undefined
      ? { content: plot, slots: [ChartPresentationSlot.Plot] as const }
      : flexOf(source.presentation, plot, defaults, id);
  const content: IRChild = resolved.content;
  const surface: IRSurface = createSurface({
    namespace: 'standard',
    type: 'surface',
    ...(id === undefined ? {} : { id }),
    child: content,
    padding: source.layout?.padding ?? defaults.layout?.padding,
    background: source.background ?? defaults.background,
  });
  return {
    content,
    surface,
    layout: resolveChartLayout(source, plot),
    slots: resolved.slots,
  };
};
