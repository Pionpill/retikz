import type { IRScope } from '@retikz/core';
import type { IRShapeValue, JsonValue } from '@retikz/core';
import type { DataFieldTypeValue } from '@retikz/data';

import { DataFieldType } from '@retikz/data';

import type { AnyChannelDefinition, AnyScaleDefinition, PositionScale } from '../../contract';
import type { ScaleDescriptor } from '../../providers';
import type { ChannelResolveContext } from '../../resolve/channel';
import type { EffectivePlotGuideTheme } from '../../resolve/theme';
import type { IRPlot, IRPlotLegendGuide, IRPlotScaleOperation, LegendChannelValue } from '../../schemas';
import type { LegendReserve, Rect } from '../../shared';
import type { LegendEntry, LowerLegendOptions } from '../guide';
import type { MarkDataView } from './types';

import { resolveLinearScale, resolveSqrtScale, scaleTicks } from '../../providers';
import { resolveChannelDefinition, resolveMarkChannels } from '../../resolve/channel';
import { resolveGuideTicks } from '../../resolve/guide';
import { resolveScaleDefinition } from '../../resolve/scale';
import { resolveLegendGuideTokens } from '../../resolve/theme';
import { LegendSymbolFit, PlotLayerZIndex, PlotScale } from '../../schemas';
import { lowerLegend } from '../guide';

/**
 * 收集所有 mark 在某非位置通道上的字段 descriptor（size / opacity / shape）
 * @description resolver 双产出的 descriptor 注册到 channel → descriptor 表；同通道多 mark 取首个有 descriptor 的
 *   legend 据 scale name 消歧；未具名的默认 scale 用 channel/field/type 签名区分
 */
export const collectChannelDescriptors = (
  node: IRPlot,
  channelCtx: ChannelResolveContext,
  markDataViews?: ReadonlyArray<MarkDataView>,
): Array<ScaleDescriptor> => {
  const out: Array<ScaleDescriptor> = [];
  const register = (descriptor: ScaleDescriptor | undefined): void => {
    if (descriptor) out.push(descriptor);
  };
  for (const view of markDataViews ?? node.marks.map(mark => ({ mark, rows: channelCtx.rows }))) {
    const markChannels = resolveMarkChannels(view.mark, { ...channelCtx, rows: view.rows });
    for (const descriptor of markChannels.descriptors ?? []) register(descriptor);
  }
  return out;
};

/** 判断两个 descriptor 数组字段是否逐项一致 */
const descriptorValuesEqual = (left: ReadonlyArray<JsonValue>, right: ReadonlyArray<JsonValue>): boolean =>
  left.length === right.length && left.every((value, index) => Object.is(value, right[index]));

/**
 * 校验同一 size scale identity 的重复 descriptor 是否等价
 * @description 多个 mark 可共享同一 size scale；legend 只在它们完整描述同一映射时合并
 */
const assertEquivalentSizeDescriptors = (descriptors: ReadonlyArray<ScaleDescriptor>): void => {
  if (descriptors.length < 2) return;
  const first = descriptors[0];
  const equivalent = descriptors
    .slice(1)
    .every(
      descriptor =>
        descriptor.channel === first.channel &&
        descriptor.scaleName === first.scaleName &&
        descriptor.scaleType === first.scaleType &&
        descriptor.field === first.field &&
        descriptor.fieldType === first.fieldType &&
        descriptor.colorScale === undefined &&
        first.colorScale === undefined &&
        descriptorValuesEqual(descriptor.domain, first.domain) &&
        descriptorValuesEqual(descriptor.range, first.range),
    );
  if (!equivalent) {
    throw new Error(
      `lowerPlots: legend channel "size" has conflicting size descriptors for scale "${first.scaleName ?? 'implicit'}"`,
    );
  }
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
  if (guide.channel === 'size') {
    const descriptorsByIdentity = new Map<string, Array<ScaleDescriptor>>();
    for (const descriptor of matched) {
      const identity =
        descriptor.scaleName ?? `${descriptor.channel}:${descriptor.field ?? ''}:${descriptor.scaleType}`;
      const group = descriptorsByIdentity.get(identity);
      if (group === undefined) descriptorsByIdentity.set(identity, [descriptor]);
      else group.push(descriptor);
    }
    for (const group of descriptorsByIdentity.values()) assertEquivalentSizeDescriptors(group);
  }
  if (guide.scale !== undefined) {
    if (matched.length === 0) {
      const scale = scaleByName.get(guide.scale);
      if (scale === undefined) throw new Error(`lowerPlots: legend references unknown scale "${guide.scale}"`);
      const scaleDefinition = resolveScaleDefinition(scale, { registry: scaleRegistry });
      if (scaleDefinition.family !== 'channel') {
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
  const scale = resolveLinearScale(
    { type: PlotScale.Linear, name: '__legend_numeric_ticks', domain: [lo, hi] },
    [],
    [0, 1],
  );
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
  const scale = resolveLinearScale(
    { type: PlotScale.Linear, name: '__legend_ramp_ticks', domain: [domain[0], domain[1]] },
    [],
    [0, 1],
  );
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

/** legend lowering 的固定公共字段（与具体形态和条目求值无关） */
type LegendLoweringBase = {
  channel: LegendChannelValue;
  position: 'right' | 'left' | 'top' | 'bottom';
  orient: 'vertical' | 'horizontal';
  fontSize: number;
  band: Rect;
  id: string;
  zIndex: number;
  style: LowerLegendOptions['style'];
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
  base: LegendLoweringBase,
  showLabels: boolean,
): LowerLegendOptions => {
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
    return { ...base, form: 'ramp', title, entries: [], ramp: { stops, ticks } };
  }

  // 分箱 swatch：quantize / threshold / quantile → 每档色块 + 区间标签（闭开口：[a, b)，末档闭）；edges = 档间内部边界
  if (resolution.edges !== undefined) {
    const edges = resolution.edges;
    const colors = resolution.range;
    const formatNumber = resolveLinearScale(
      {
        type: PlotScale.Linear,
        name: '__legend_bin_labels',
        domain: edges.length > 0 ? [edges[0], edges[edges.length - 1]] : [0, 1],
      },
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
    return { ...base, form: 'swatch', title, entries };
  }

  // ordinal 离散 swatch：每类别一色块 + 类别标签（domain = 类别序、range = 对应色，与实绘同源）
  const entries: Array<LegendEntry> = resolution.domain.map(
    (category, index): LegendEntry => ({ label: showLabels ? String(category) : '', color: resolution.range[index] }),
  );
  return { ...base, form: 'swatch', title, entries };
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
 * @description color descriptor 从 IRPlot.scales 具名 color scale 取（多于一个且未消歧 → fail-loud）；
 *   其它通道从 resolver descriptor 与 channel definition 取值。形态由 definition.legend 决定，标签复用 axis formatter 链。
 *   每个 legend 下沉成归属当前 plot owner 的稳定 id 独立 scope，落在传入的预留带内。
 */
export const buildLegendLayers = (
  node: IRPlot,
  channelDescriptors: ReadonlyArray<ScaleDescriptor>,
  legendGuides: Array<IRPlotLegendGuide>,
  fontSize: number,
  bands: Array<Rect>,
  channelRegistry: ReadonlyMap<string, AnyChannelDefinition>,
  scaleRegistry: ReadonlyMap<string, AnyScaleDefinition>,
  resolvedTheme: EffectivePlotGuideTheme,
): Array<IRScope> => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return legendGuides.map((guide, legendIndex): IRScope => {
    const band = bands[legendIndex] ?? { x: 0, y: 0, width: 0, height: 0 };
    const orient =
      guide.orient ?? (guide.position === 'top' || guide.position === 'bottom' ? 'horizontal' : 'vertical');
    const id = legendLayerId(node.id, guide.channel, legendIndex, legendGuides.length);
    const style = resolveLegendGuideTokens(resolvedTheme, guide.style);
    const base: LegendLoweringBase = {
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
      const options = resolveColorLegend(descriptor, guide, base, showLabels);
      return lowerLegend(options);
    }
    if (guide.channel === 'color') {
      throw new Error(
        'lowerPlots: legend channel "color" has no bound color scale; bind a color encoding with a scale or give the legend an explicit scale',
      );
    }
    // 非 color 通道：descriptor 提供 domain / range，definition.legend 决定可视形态
    if (!descriptor) {
      throw new Error(
        `lowerPlots: legend channel "${guide.channel}" has no bound scale (no mark encodes ${guide.channel} by field); cannot derive a legend`,
      );
    }
    const channelDefinition = resolveChannelDefinition(guide.channel, { channelRegistry });
    const legendForm =
      channelDefinition !== undefined && 'legend' in channelDefinition ? channelDefinition.legend : undefined;
    const channelOutput =
      channelDefinition !== undefined && 'output' in channelDefinition ? channelDefinition.output : undefined;
    if (legendForm === undefined) {
      throw new Error(`lowerPlots: channel "${guide.channel}" does not declare a legend form`);
    }
    // 标题只在用户显式给时渲染（见 resolveColorLegend 同注）
    const title = guide.title;
    if (legendForm === 'symbol') {
      if (channelOutput?.outputKind !== 'symbol') {
        throw new Error(
          `lowerPlots: channel "${guide.channel}" legend form "symbol" requires outputKind "symbol"; received "${channelOutput?.outputKind ?? 'unknown'}"`,
        );
      }
      const entries: Array<LegendEntry> = descriptor.domain.map((category, index) => ({
        label: showLabels ? String(category) : '',
        shape: descriptor.range[index] as IRShapeValue,
        symbolSize: style.symbolSize,
        color: 'currentColor',
      }));
      return lowerLegend({ ...base, form: 'swatch', title, entries });
    }
    if (legendForm === 'size') {
      if (channelOutput?.outputKind !== 'number') {
        throw new Error(
          `lowerPlots: channel "${guide.channel}" legend form "size" requires outputKind "number"; received "${channelOutput?.outputKind ?? 'unknown'}"`,
        );
      }
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
      return lowerLegend({ ...base, form: 'swatch', title, entries });
    }
    if (legendForm === 'ramp') {
      if (channelOutput?.outputKind !== 'color' && channelOutput?.outputKind !== 'number') {
        throw new Error(
          `lowerPlots: channel "${guide.channel}" legend form "ramp" requires outputKind "color" or "number"; received "${channelOutput?.outputKind ?? 'unknown'}"`,
        );
      }
      const [lo, hi] = [Number(descriptor.domain[0]), Number(descriptor.domain[descriptor.domain.length - 1])];
      const stops =
        channelOutput.outputKind === 'color'
          ? descriptor.range.map((color, index) => ({
              offset: descriptor.range.length === 1 ? 0 : index / (descriptor.range.length - 1),
              color: String(color),
            }))
          : descriptor.range.map((opacity, index) => ({
              offset: descriptor.range.length === 1 ? 0 : index / (descriptor.range.length - 1),
              color: 'currentColor',
              opacity: Math.max(0, Math.min(1, Number(opacity))),
            }));
      const normalizedStops =
        stops.length === 1
          ? [
              { ...stops[0], offset: 0 },
              { ...stops[0], offset: 1 },
            ]
          : stops;
      const ticks = showLabels ? legendRampTicks(descriptor, guide, [lo, hi]) : [];
      return lowerLegend({
        ...base,
        form: 'ramp',
        title,
        entries: [],
        ramp: { stops: normalizedStops, ticks },
      });
    }
    if (channelOutput?.outputKind === 'color') {
      const entries: Array<LegendEntry> = descriptor.domain.map((category, index) => ({
        label: showLabels ? String(category) : '',
        color: String(descriptor.range[index]),
      }));
      return lowerLegend({ ...base, form: 'swatch', title, entries });
    }
    if (channelOutput?.outputKind !== 'number') {
      throw new Error(
        `lowerPlots: channel "${guide.channel}" legend form "swatch" requires outputKind "color" or "number"; received "${channelOutput?.outputKind ?? 'unknown'}"`,
      );
    }
    // number swatch 用透明度表达
    const [lo, hi] = [Number(descriptor.domain[0]), Number(descriptor.domain[descriptor.domain.length - 1])];
    const ticks = niceNumericTicks([lo, hi], guide.ticks?.count ?? 3);
    const [oMin, oMax] = [Number(descriptor.range[0]), Number(descriptor.range[descriptor.range.length - 1])];
    const span = hi - lo;
    const entries: Array<LegendEntry> = ticks.map(tick => {
      const t = span === 0 ? 1 : (tick.value - lo) / span;
      return { label: showLabels ? tick.label : '', opacity: oMin + (oMax - oMin) * Math.max(0, Math.min(1, t)) };
    });
    return lowerLegend({ ...base, form: 'swatch', title, entries });
  });
};
