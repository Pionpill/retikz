import type { IRScope } from '@retikz/core';
import type { DataFieldTypeMap, DataFieldTypeValue, ExternalRow } from '@retikz/data';

import { DataFieldType } from '@retikz/data';

import type { AnyChannelDefinition, AnyMarkDefinition, AnyScaleDefinition, PositionScale } from '../../contract';
import type { resolvePlotTheme, ScaleDescriptor } from '../../providers';
import type { IRPlotLegendGuide, IRPlotScaleOperation, IRPlotSpec, LegendChannelValue } from '../../schemas';
import type { LegendReserve, Rect } from '../../shared';
import type { LegendEntry, LegendInput } from '../guide';
import type { MarkDataView } from './types';

import {
  channelKindsForMark,
  resolveGuideTicks,
  resolveLegendGuideTokens,
  resolveLinearScale,
  resolveMarkChannels,
  resolveSqrtScale,
  scaleTicks,
} from '../../providers';
import { LegendSymbolFit, PlotLayerZIndex, PlotScale } from '../../schemas';
import { lowerLegend } from '../guide';

/**
 * 收集所有 mark 在某非位置通道上的字段 descriptor（size / opacity / shape）
 * @description resolver 双产出的 descriptor 注册到 channel → descriptor 表；同通道多 mark 取首个有 descriptor 的
 *   legend 据 scale name 消歧；未具名的默认 scale 用 channel/field/type 签名区分
 */
export const collectChannelDescriptors = (
  node: IRPlotSpec,
  channelCtx: {
    node: IRPlotSpec;
    rows: Array<ExternalRow>;
    fieldTypes: DataFieldTypeMap;
    scaleRegistry: ReadonlyMap<string, AnyScaleDefinition>;
    resolveColorScheme: (name: string) => (t: number) => string;
    palette: ReturnType<typeof resolvePlotTheme>['palette'];
  },
  channelRegistry: ReadonlyMap<string, AnyChannelDefinition>,
  markRegistry: ReadonlyMap<string, AnyMarkDefinition>,
  defaultColor: string,
  markDataViews?: ReadonlyArray<MarkDataView>,
): Array<ScaleDescriptor> => {
  const out: Array<ScaleDescriptor> = [];
  const register = (descriptor: ScaleDescriptor | undefined): void => {
    if (descriptor) out.push(descriptor);
  };
  for (const view of markDataViews ?? node.marks.map(mark => ({ mark, rows: channelCtx.rows }))) {
    const markChannels = resolveMarkChannels(
      view.mark,
      { ...channelCtx, rows: view.rows },
      channelRegistry,
      defaultColor,
      channelKindsForMark(view.mark, markRegistry),
    );
    for (const descriptor of markChannels.descriptors ?? []) register(descriptor);
  }
  return out;
};

const selectLegendDescriptor = (
  guide: IRPlotLegendGuide,
  descriptors: ReadonlyArray<ScaleDescriptor>,
  scaleByName: ReadonlyMap<string, IRPlotScaleOperation>,
  scaleRegistry: ReadonlyMap<string, AnyScaleDefinition>,
): ScaleDescriptor | undefined => {
  const matched = descriptors.filter(
    descriptor =>
      descriptor.channel === guide.channel && (guide.scale === undefined || descriptor.scaleName === guide.scale),
  );
  if (guide.scale !== undefined) {
    if (matched.length === 0) {
      const scale = scaleByName.get(guide.scale);
      if (scale === undefined) throw new Error(`lowerPlots: legend references unknown scale "${guide.scale}"`);
      const scaleDefinition = scaleRegistry.get(scale.type);
      if (scaleDefinition?.family !== 'channel') {
        throw new Error(
          `lowerPlots: scale "${guide.scale}" is not a color scale (legend channel "${guide.channel}" can only bind channel scales)`,
        );
      }
      throw new Error(`lowerPlots: legend channel "${guide.channel}" has no bound scale named "${guide.scale}"`);
    }
    return matched[0];
  }
  const signatures = new Set(
    matched.map(
      descriptor => descriptor.scaleName ?? `${descriptor.channel}:${descriptor.field ?? ''}:${descriptor.scaleType}`,
    ),
  );
  if (signatures.size > 1) {
    throw new Error(
      `lowerPlots: legend channel "${guide.channel}" is driven by multiple scales [${[...signatures].join(', ')}]; specify which via the legend "scale" field`,
    );
  }
  return matched[0];
};

/** 数值刻度 nice 化 + 格式化：复用 axis 的 scaleTicks 链，domain → {value, offset 0..1, label} */
const niceNumericTicks = (
  domain: readonly [number, number],
  count: number,
): Array<{ value: number; offset: number; label: string }> => {
  const [lo, hi] = domain;
  const scale = resolveLinearScale({ domain: [lo, hi] }, [], [0, 1]);
  const { values, labels } = scaleTicks(scale, count);
  const span = hi - lo;
  return values.map((value, index) => ({
    value: typeof value === 'number' ? value : Number(value),
    offset: span === 0 ? 0.5 : ((typeof value === 'number' ? value : Number(value)) - lo) / span,
    label: labels[index],
  }));
};

const legendRampTickScale = (
  domain: readonly [number, number],
  fieldType: DataFieldTypeValue | undefined,
): PositionScale => {
  const scale = resolveLinearScale({ domain: [domain[0], domain[1]] }, [], [0, 1]);
  return {
    coordinate: value => scale(Number(value)),
    domain: () => [domain[0], domain[1]],
    bandwidth: 0,
    ticks: count => scaleTicks(scale, count),
    tickKind: fieldType === DataFieldType.Temporal ? 'time' : 'number',
    range: () => [0, 1],
    setRange: () => {},
  };
};

const legendRampTicks = (
  descriptor: ScaleDescriptor,
  guide: IRPlotLegendGuide,
  domain: readonly [number, number],
): Array<{ offset: number; label: string }> => {
  const scale = legendRampTickScale(domain, descriptor.fieldType);
  const ticks = resolveGuideTicks(scale, guide.ticks, guide.tickLabels === false ? undefined : guide.tickLabels);
  const span = domain[1] - domain[0];
  return ticks.values.map((value, index) => {
    const numeric = Number(value);
    return {
      offset: span === 0 ? 0.5 : (numeric - domain[0]) / span,
      label: ticks.labels[index],
    };
  });
};

/** legend 专用 sqrt 半径映射：domain [lo, hi]（sqrt 感知）→ range [rMin, rMax]，与 mark size resolver 同核 */
const resolveSqrtForLegend = (
  domain: readonly [number, number],
  range: readonly [number, number],
): ((value: number) => number) => {
  const scale = resolveSqrtScale(
    {
      type: PlotScale.Sqrt,
      name: '__legend_size',
      domain: [Math.max(0, domain[0]), domain[1]],
      range: [range[0], range[1]],
    },
    [],
    range,
  );
  return value => scale(value);
};

/** legend baseInput 形状（lowerLegend 入参里与求值无关的固定部分） */
type LegendBaseInput = {
  channel: LegendChannelValue;
  position: 'right' | 'left' | 'top' | 'bottom';
  orient: 'vertical' | 'horizontal';
  fontSize: number;
  band: Rect;
  id: string;
  zIndex: number;
  style: LegendInput['style'];
};

/**
 * color legend 解析：消费 channel definition 产出的 colorScale descriptor → 按 legendForm 选 swatch / ramp / 分箱
 * @description legendForm='ramp'（sequential / diverging）→ core linearGradient 连续色带 + nice 刻度；
 *   legendForm='swatch' + edges（quantize/threshold/quantile）→ 每档区间 swatch（区间标签闭开口契约）；
 *   legendForm='swatch' 无 edges（ordinal）→ 逐类别色块 swatch。evaluator / domain / range 来自实绘解析结果。
 */
const resolveColorLegend = (
  descriptor: ScaleDescriptor,
  guide: IRPlotLegendGuide,
  baseInput: LegendBaseInput,
  showLabels: boolean,
): LegendInput => {
  // 标题只在用户显式给时渲染（field 名仅作占位 fallback 的语义来源，不自动生成标题 Node，避免与条目标签混淆）
  const title = guide.title;
  const resolution = descriptor.colorScale;
  if (resolution === undefined) {
    throw new Error(
      `lowerPlots: legend channel "${guide.channel}" has no color scale descriptor; cannot derive a color legend`,
    );
  }

  // 连续色带 ramp：sequential / diverging（沿带等距采样色 + nice 刻度；domain = resolution.domain [lo, hi]）
  if (resolution.legendForm === 'ramp') {
    const lo = Number(resolution.domain[0]);
    const hi = Number(resolution.domain[resolution.domain.length - 1]);
    const STOP_COUNT = 8;
    const stops = Array.from({ length: STOP_COUNT }, (_unused, index) => {
      const t = index / (STOP_COUNT - 1);
      return { offset: t, color: resolution.of(lo + (hi - lo) * t) ?? '' };
    });
    const ticks = showLabels ? legendRampTicks(descriptor, guide, [lo, hi]) : [];
    return { ...baseInput, form: 'ramp', title, entries: [], ramp: { stops, ticks } };
  }

  // 分箱 swatch：quantize / threshold / quantile → 每档色块 + 区间标签（闭开口：[a, b)，末档闭）；edges = 档间内部边界
  if (resolution.edges !== undefined) {
    const edges = resolution.edges;
    const colors = resolution.range;
    const formatNumber = resolveLinearScale(
      { domain: edges.length > 0 ? [edges[0], edges[edges.length - 1]] : [0, 1] },
      [],
      [0, 1],
    ).tickFormat();
    const entries: Array<LegendEntry> = colors.map((color, index): LegendEntry => {
      // 区间标签：首档 < e0、末档 ≥ e_last、中间 [e_{i-1}, e_i)
      const lower = index === 0 ? undefined : edges[index - 1];
      const upper = index < edges.length ? edges[index] : undefined;
      const label = !showLabels
        ? ''
        : lower === undefined && upper !== undefined
          ? `< ${formatNumber(upper)}`
          : lower !== undefined && upper === undefined
            ? `≥ ${formatNumber(lower)}`
            : `${formatNumber(lower as number)}–${formatNumber(upper as number)}`;
      return { label, color };
    });
    return { ...baseInput, form: 'swatch', title, entries };
  }

  // ordinal 离散 swatch：每类别一色块 + 类别标签（domain = 类别序、range = 对应色，与实绘同源）
  const entries: Array<LegendEntry> = resolution.domain.map(
    (category, index): LegendEntry => ({ label: showLabels ? String(category) : '', color: resolution.range[index] }),
  );
  return { ...baseInput, form: 'swatch', title, entries };
};

/** 单个 legend 在其所在边的预留带宽 / 带高（user units）；无文字度量 → 固定估算，溢出可接受（plot-design §13.1） */
const LEGEND_BAND_EXTENT = 80;

/** legend 与主体绘图区之间的间距（user units）；在预留带内让出，避免图例紧贴内容 */
const LEGEND_CONTENT_GAP = 24;

/**
 * 据 legend guide 估算各边 legend 预留带宽（同侧多个 legend 累加）
 * @description 喂 computePlotArea 在对应边收窄 plotArea；估算式占位、不测量。
 */
export const legendReserveOf = (legendGuides: Array<IRPlotLegendGuide>): LegendReserve => {
  const reserve: { right: number; left: number; top: number; bottom: number } = {
    right: 0,
    left: 0,
    top: 0,
    bottom: 0,
  };
  for (const guide of legendGuides) {
    reserve[guide.position ?? 'right'] += LEGEND_BAND_EXTENT;
  }
  return reserve;
};

/**
 * 为每个 legend 计算预留带矩形（落在 plotArea 旁的预留 gutter 内；同侧按声明序堆叠）
 * @description gutter 由 computePlotArea 在对应边按 legendReserveOf 让出；此处把每个 legend 摆进其所在边的带。
 */
export const reserveLegendBands = (
  legendGuides: Array<IRPlotLegendGuide>,
  width: number,
  height: number,
  plotArea: Rect,
): Array<Rect> => {
  const perSideOffset = new Map<string, number>();
  return legendGuides.map((guide): Rect => {
    const position = guide.position ?? 'right';
    const offset = perSideOffset.get(position) ?? 0;
    perSideOffset.set(position, offset + LEGEND_BAND_EXTENT);
    const plotRight = plotArea.x + plotArea.width;
    const plotBottom = plotArea.y + plotArea.height;
    switch (position) {
      case 'left':
        // 带右沿留 GAP 到 plot 左边（content 从带左起摆，本就远离 plot；右沿额外让 GAP）
        return { x: 4, y: plotArea.y + offset, width: Math.max(0, plotArea.x - 4 - LEGEND_CONTENT_GAP), height };
      case 'top':
        return {
          x: plotArea.x + offset,
          y: 4,
          width: LEGEND_BAND_EXTENT,
          height: Math.max(0, plotArea.y - 4 - LEGEND_CONTENT_GAP),
        };
      case 'bottom':
        return {
          x: plotArea.x + offset,
          y: plotBottom + LEGEND_CONTENT_GAP,
          width: LEGEND_BAND_EXTENT,
          height: Math.max(0, height - plotBottom - LEGEND_CONTENT_GAP),
        };
      default:
        return {
          x: plotRight + LEGEND_CONTENT_GAP,
          y: plotArea.y + offset,
          width: Math.max(0, width - plotRight - LEGEND_CONTENT_GAP),
          height,
        };
    }
  });
};

/** 生成 legend 的稳定 scope id；有 plot id 时收进对应 plot owner */
const legendLayerId = (plotId: string | undefined, channel: string, index: number, count: number): string => {
  const owner = plotId === undefined ? 'legend' : `${plotId}.legend`;
  return count > 1 ? `${owner}.${channel}.${index}` : `${owner}.${channel}`;
};

/**
 * 解析所有 legend guide → core legend scope（据通道 + 绑定 scale 类型选 swatch / ramp / 分箱 / 梯度符号）
 * @description color descriptor 从 PlotSpec.scales 具名 color scale 取（多于一个且未消歧 → fail-loud）；
 *   size / opacity / shape 从 resolver descriptor 注册表取。形态由 scale 类型决定，标签复用 axis formatter 链（决策 ⑨）。
 *   每个 legend 下沉成归属当前 plot owner 的稳定 id 独立 scope，落在传入的预留带内。
 */
export const buildLegendLayers = (
  node: IRPlotSpec,
  channelDescriptors: ReadonlyArray<ScaleDescriptor>,
  legendGuides: Array<IRPlotLegendGuide>,
  fontSize: number,
  bands: Array<Rect>,
  scaleRegistry: ReadonlyMap<string, AnyScaleDefinition>,
  resolvedTheme: ReturnType<typeof resolvePlotTheme>,
): Array<IRScope> => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return legendGuides.map((guide, legendIndex): IRScope => {
    const band = bands[legendIndex] ?? { x: 0, y: 0, width: 0, height: 0 };
    const orient =
      guide.orient ?? (guide.position === 'top' || guide.position === 'bottom' ? 'horizontal' : 'vertical');
    const id = legendLayerId(node.id, guide.channel, legendIndex, legendGuides.length);
    const style = resolveLegendGuideTokens(resolvedTheme, guide.style);
    const baseInput: LegendBaseInput = {
      channel: guide.channel,
      position: guide.position ?? 'right',
      orient,
      fontSize,
      band,
      id,
      zIndex: guide.layer?.zIndex ?? PlotLayerZIndex.Legend,
      style,
    };
    const showLabels = guide.tickLabels !== false;
    const descriptor = selectLegendDescriptor(guide, channelDescriptors, scaleByName, scaleRegistry);

    if (descriptor?.colorScale !== undefined) {
      const input = resolveColorLegend(descriptor, guide, baseInput, showLabels);
      return lowerLegend(input);
    }
    if (guide.channel === 'color') {
      throw new Error(
        'lowerPlots: legend channel "color" has no bound color scale; bind a color encoding with a scale or give the legend an explicit scale',
      );
    }
    // size / opacity / shape：从 resolver descriptor 取
    if (!descriptor) {
      throw new Error(
        `lowerPlots: legend channel "${guide.channel}" has no bound scale (no mark encodes ${guide.channel} by field); cannot derive a legend`,
      );
    }
    // 标题只在用户显式给时渲染（见 resolveColorLegend 同注）
    const title = guide.title;
    if (guide.channel === 'shape') {
      const entries: Array<LegendEntry> = descriptor.domain.map((category, index) => ({
        label: showLabels ? String(category) : '',
        shape: String(descriptor.range[index]),
        symbolSize: style.symbolSize,
        color: 'currentColor',
      }));
      return lowerLegend({ ...baseInput, form: 'swatch', title, entries });
    }
    if (guide.channel === 'size') {
      const [lo, hi] = [Number(descriptor.domain[0]), Number(descriptor.domain[descriptor.domain.length - 1])];
      const ticks = niceNumericTicks([lo, hi], guide.ticks?.count ?? 3).filter(tick => tick.value > 0);
      const reps = ticks.length > 0 ? ticks : [{ value: hi, offset: 1, label: String(hi) }];
      // 半径据 descriptor range（与 mark 实绘同源）线性插值（sqrt domain→radius）
      const [rMin, rMax] = [Number(descriptor.range[0]), Number(descriptor.range[descriptor.range.length - 1])];
      const radiusScale = resolveSqrtForLegend([lo, hi], [rMin, rMax]);
      const symbolRadiusLimit = style.symbolSize / Math.SQRT2;
      const fitScale =
        style.symbolFit === LegendSymbolFit.Fit && Number.isFinite(rMax) && rMax > 0
          ? Math.min(1, symbolRadiusLimit / rMax)
          : 1;
      const entries: Array<LegendEntry> = reps.map(tick => ({
        label: showLabels ? tick.label : '',
        radius:
          (style.symbolFit === LegendSymbolFit.Fit
            ? Math.min(radiusScale(tick.value) * fitScale, symbolRadiusLimit)
            : radiusScale(tick.value)) * style.symbolScale,
      }));
      return lowerLegend({ ...baseInput, form: 'swatch', title, entries });
    }
    // opacity：梯度透明度块（nice 几档 + 透明度）
    const [lo, hi] = [Number(descriptor.domain[0]), Number(descriptor.domain[descriptor.domain.length - 1])];
    const ticks = niceNumericTicks([lo, hi], guide.ticks?.count ?? 3);
    const [oMin, oMax] = [Number(descriptor.range[0]), Number(descriptor.range[descriptor.range.length - 1])];
    const span = hi - lo;
    const entries: Array<LegendEntry> = ticks.map(tick => {
      const t = span === 0 ? 1 : (tick.value - lo) / span;
      return { label: showLabels ? tick.label : '', opacity: oMin + (oMax - oMin) * Math.max(0, Math.min(1, t)) };
    });
    return lowerLegend({ ...baseInput, form: 'swatch', title, entries });
  });
};
