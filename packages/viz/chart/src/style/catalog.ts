import { NodeTextAlign } from '@retikz/core';
import { AxisTickMarkKind, LegendSymbolFit } from '@retikz/plot';

import type { ChartStyleTokenValue, ChartStyleValue, ChartThemeModeValue, IRChartResolvedStyleTokens } from './types';

import { ChartStyle, ChartStyleToken, ChartThemeMode } from './constants';
import { ChartResolvedStyleTokensSchema } from './schema';

/** 单个 preset 在 light/dark 间保持不变的结构与尺寸 */
type PresetStructure = {
  /** Chart surface 内边距 */
  padding: number;
  /** presentation slot 间距 */
  gap: number;
  /** Chart 与 Plot 的字体回退 */
  fontFamily: string;
  /** Plot 静态标签字号 */
  plotLabelSize: number;
  /** 默认 axis baseline 开关 */
  axisLineEnabled: boolean;
  /** tick label 字号 */
  tickLabelSize: number;
  /** tick 到 label 的间距 */
  tickLabelGap: number;
  /** axis title 字号 */
  axisTitleSize: number;
  /** recipe 默认 grid 开关 */
  axisGridEnabled: boolean;
  /** grid 绘制透明度 */
  gridOpacity: number;
  /** legend title 字号 */
  legendTitleSize: number;
  /** legend title 字重 */
  legendTitleWeight: number;
  /** legend label 字号 */
  legendLabelSize: number;
  /** legend swatch 尺寸 */
  swatchSize: number;
  /** swatch 与 label 的间距 */
  swatchGap: number;
  /** legend entry 间距 */
  entryGap: number;
  /** legend title 与 entry 的间距 */
  titleGap: number;
  /** 连续 legend ramp 长度 */
  rampLength: number;
  /** 连续 legend ramp 厚度 */
  rampThickness: number;
  /** legend symbol 视觉盒尺寸 */
  symbolSize: number;
  /** 顺序 scale 的 scheme 名称 */
  sequential: string;
  /** 发散 scale 的 scheme 名称 */
  diverging: string;
};

/** 六个 presentation slot 的 size、weight 与 lineHeight tuple */
type SlotTypography = ReadonlyArray<readonly [number, number, number]>;

/** 单个 preset/mode 的 paint 与数据 palette */
type PresetPaint = {
  /** Chart 画布填充色 */
  canvas: string;
  /** Plot 面板填充色 */
  plot: string;
  /** Plot guide 排版前景色 */
  plotForeground: string;
  /** Plot 静态标签前景色 */
  plotLabel: string;
  /** 六个 presentation slot 的前景色 */
  slots: ReadonlyArray<string>;
  /** axis line、tick label、title 与 grid paint */
  axis: ReadonlyArray<string>;
  /** legend title 与 label paint */
  legend: ReadonlyArray<string>;
  /** categorical、series 与 sector 共用 palette */
  palette: ReadonlyArray<string>;
};

/** 单个 presentation slot 对应的五个 canonical token */
type PresentationTokenGroup = {
  /** 文本前景色 token */
  foreground: ChartStyleTokenValue;
  /** 字号 token */
  fontSize: ChartStyleTokenValue;
  /** 字重 token */
  fontWeight: ChartStyleTokenValue;
  /** 行高 token */
  lineHeight: ChartStyleTokenValue;
  /** 文本对齐 token */
  align: ChartStyleTokenValue;
};

/** 各 preset 在明暗模式间共享的结构与尺寸 */
const structures: Record<ChartStyleValue, PresetStructure> = {
  [ChartStyle.Neutral]: {
    padding: 16,
    gap: 6,
    fontFamily: 'system-ui, Segoe UI, sans-serif',
    plotLabelSize: 11,
    axisLineEnabled: false,
    tickLabelSize: 11,
    tickLabelGap: 5,
    axisTitleSize: 12,
    axisGridEnabled: true,
    gridOpacity: 0.55,
    legendTitleSize: 12,
    legendTitleWeight: 600,
    legendLabelSize: 11,
    swatchSize: 12,
    swatchGap: 6,
    entryGap: 6,
    titleGap: 6,
    rampLength: 96,
    rampThickness: 10,
    symbolSize: 12,
    sequential: 'cividis',
    diverging: 'brbg',
  },
  [ChartStyle.Academic]: {
    padding: 16,
    gap: 6,
    fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    plotLabelSize: 11,
    axisLineEnabled: true,
    tickLabelSize: 11,
    tickLabelGap: 5,
    axisTitleSize: 12,
    axisGridEnabled: true,
    gridOpacity: 0.6,
    legendTitleSize: 12,
    legendTitleWeight: 600,
    legendLabelSize: 11,
    swatchSize: 12,
    swatchGap: 6,
    entryGap: 6,
    titleGap: 6,
    rampLength: 100,
    rampThickness: 10,
    symbolSize: 12,
    sequential: 'cividis',
    diverging: 'rdbu',
  },
  [ChartStyle.Vibrant]: {
    padding: 16,
    gap: 8,
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    plotLabelSize: 12,
    axisLineEnabled: false,
    tickLabelSize: 12,
    tickLabelGap: 6,
    axisTitleSize: 13,
    axisGridEnabled: true,
    gridOpacity: 1,
    legendTitleSize: 13,
    legendTitleWeight: 700,
    legendLabelSize: 12,
    swatchSize: 14,
    swatchGap: 7,
    entryGap: 8,
    titleGap: 8,
    rampLength: 112,
    rampThickness: 14,
    symbolSize: 14,
    sequential: 'turbo',
    diverging: 'spectral',
  },
  [ChartStyle.Clean]: {
    padding: 12,
    gap: 4,
    fontFamily: 'system-ui, Segoe UI, sans-serif',
    plotLabelSize: 10,
    axisLineEnabled: false,
    tickLabelSize: 10,
    tickLabelGap: 4,
    axisTitleSize: 11,
    axisGridEnabled: false,
    gridOpacity: 1,
    legendTitleSize: 11,
    legendTitleWeight: 600,
    legendLabelSize: 10,
    swatchSize: 10,
    swatchGap: 5,
    entryGap: 5,
    titleGap: 5,
    rampLength: 88,
    rampThickness: 8,
    symbolSize: 10,
    sequential: 'cividis',
    diverging: 'rdbu',
  },
};

/** 各 preset 的六个 presentation slot 排版值 */
const typography: Record<ChartStyleValue, SlotTypography> = {
  [ChartStyle.Neutral]: [
    [18, 600, 22],
    [13, 400, 18],
    [12, 400, 17],
    [11, 400, 15],
    [11, 500, 15],
    [11, 500, 15],
  ],
  [ChartStyle.Academic]: [
    [18, 600, 22],
    [13, 400, 18],
    [12, 400, 17],
    [11, 400, 15],
    [11, 400, 15],
    [11, 400, 15],
  ],
  [ChartStyle.Vibrant]: [
    [20, 700, 24],
    [14, 500, 19],
    [12, 400, 17],
    [11, 400, 15],
    [11, 500, 15],
    [11, 500, 15],
  ],
  [ChartStyle.Clean]: [
    [17, 600, 21],
    [12, 400, 17],
    [11, 400, 15],
    [10, 400, 14],
    [10, 400, 14],
    [10, 400, 14],
  ],
};

/** 各 preset 的浅色模式 paint */
const lightPaints: Record<ChartStyleValue, PresetPaint> = {
  [ChartStyle.Neutral]: {
    canvas: '#FFFFFF',
    plot: '#FAFAFA',
    plotForeground: '#18181B',
    plotLabel: '#3F3F46',
    slots: ['#09090B', '#3F3F46', '#52525B', '#71717A', '#71717A', '#71717A'],
    axis: ['#D4D4D8', '#52525B', '#3F3F46', '#E4E4E7'],
    legend: ['#3F3F46', '#52525B'],
    palette: ['#E76E50', '#2A9D90', '#274754', '#E8C468', '#F4A462'],
  },
  [ChartStyle.Academic]: {
    canvas: '#FFFFFF',
    plot: '#FFFFFF',
    plotForeground: '#1F2937',
    plotLabel: '#374151',
    slots: ['#111827', '#374151', '#4B5563', '#6B7280', '#6B7280', '#6B7280'],
    axis: ['#9CA3AF', '#4B5563', '#374151', '#D1D5DB'],
    legend: ['#374151', '#4B5563'],
    palette: [
      '#4E79A7',
      '#F28E2B',
      '#E15759',
      '#76B7B2',
      '#59A14F',
      '#EDC948',
      '#B07AA1',
      '#FF9DA7',
      '#9C755F',
      '#BAB0AC',
    ],
  },
  [ChartStyle.Vibrant]: {
    canvas: '#F8FAFC',
    plot: '#E5ECF6',
    plotForeground: '#2A3F5F',
    plotLabel: '#2A3F5F',
    slots: ['#172B4D', '#425466', '#52616B', '#66788A', '#66788A', '#66788A'],
    axis: ['#AAB8C2', '#2A3F5F', '#2A3F5F', '#FFFFFF'],
    legend: ['#2A3F5F', '#425466'],
    palette: [
      '#636EFA',
      '#EF553B',
      '#00CC96',
      '#AB63FA',
      '#FFA15A',
      '#19D3F3',
      '#FF6692',
      '#B6E880',
      '#FF97FF',
      '#FECB52',
    ],
  },
  [ChartStyle.Clean]: {
    canvas: '#FFFFFF',
    plot: '#FFFFFF',
    plotForeground: '#111827',
    plotLabel: '#374151',
    slots: ['#111827', '#374151', '#4B5563', '#6B7280', '#6B7280', '#6B7280'],
    axis: ['#9CA3AF', '#374151', '#374151', '#E5E7EB'],
    legend: ['#374151', '#4B5563'],
    palette: ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00', '#F0E442', '#000000'],
  },
};

/** 各 preset 的深色模式 paint */
const darkPaints: Record<ChartStyleValue, PresetPaint> = {
  [ChartStyle.Neutral]: {
    canvas: '#09090B',
    plot: '#18181B',
    plotForeground: '#FAFAFA',
    plotLabel: '#D4D4D8',
    slots: ['#FAFAFA', '#D4D4D8', '#A1A1AA', '#A1A1AA', '#A1A1AA', '#A1A1AA'],
    axis: ['#3F3F46', '#D4D4D8', '#E4E4E7', '#3F3F46'],
    legend: ['#E4E4E7', '#D4D4D8'],
    palette: ['#4C78A8', '#59A14F', '#F28E2B', '#B07AA1', '#E15759'],
  },
  [ChartStyle.Academic]: {
    canvas: '#0F172A',
    plot: '#111827',
    plotForeground: '#E5E7EB',
    plotLabel: '#D1D5DB',
    slots: ['#F9FAFB', '#D1D5DB', '#CBD5E1', '#94A3B8', '#94A3B8', '#94A3B8'],
    axis: ['#64748B', '#CBD5E1', '#E2E8F0', '#334155'],
    legend: ['#E2E8F0', '#CBD5E1'],
    palette: [
      '#60A5FA',
      '#FDBA74',
      '#F87171',
      '#5EEAD4',
      '#86EFAC',
      '#FDE047',
      '#D8B4FE',
      '#FDA4AF',
      '#D6A77A',
      '#CBD5E1',
    ],
  },
  [ChartStyle.Vibrant]: {
    canvas: '#111827',
    plot: '#1E293B',
    plotForeground: '#F8FAFC',
    plotLabel: '#E2E8F0',
    slots: ['#FFFFFF', '#E2E8F0', '#CBD5E1', '#94A3B8', '#94A3B8', '#94A3B8'],
    axis: ['#64748B', '#E2E8F0', '#F1F5F9', '#475569'],
    legend: ['#F1F5F9', '#E2E8F0'],
    palette: [
      '#636EFA',
      '#EF553B',
      '#00CC96',
      '#AB63FA',
      '#FFA15A',
      '#19D3F3',
      '#FF6692',
      '#B6E880',
      '#FF97FF',
      '#FECB52',
    ],
  },
  [ChartStyle.Clean]: {
    canvas: '#0B0F14',
    plot: '#0B0F14',
    plotForeground: '#F3F4F6',
    plotLabel: '#D1D5DB',
    slots: ['#F9FAFB', '#D1D5DB', '#D1D5DB', '#9CA3AF', '#9CA3AF', '#9CA3AF'],
    axis: ['#6B7280', '#D1D5DB', '#E5E7EB', '#374151'],
    legend: ['#E5E7EB', '#D1D5DB'],
    palette: ['#56B4E9', '#F0B44D', '#4DD4AC', '#E58AC8', '#7AC7F0', '#FF7A59', '#F6E36B', '#E5E7EB'],
  },
};

/** 六个 presentation slot 与 canonical token 的固定映射 */
const presentationTokenGroups: ReadonlyArray<PresentationTokenGroup> = [
  {
    foreground: ChartStyleToken.ChartTitleForeground,
    fontSize: ChartStyleToken.ChartTitleFontSize,
    fontWeight: ChartStyleToken.ChartTitleFontWeight,
    lineHeight: ChartStyleToken.ChartTitleLineHeight,
    align: ChartStyleToken.ChartTitleAlign,
  },
  {
    foreground: ChartStyleToken.ChartSubtitleForeground,
    fontSize: ChartStyleToken.ChartSubtitleFontSize,
    fontWeight: ChartStyleToken.ChartSubtitleFontWeight,
    lineHeight: ChartStyleToken.ChartSubtitleLineHeight,
    align: ChartStyleToken.ChartSubtitleAlign,
  },
  {
    foreground: ChartStyleToken.ChartCaptionForeground,
    fontSize: ChartStyleToken.ChartCaptionFontSize,
    fontWeight: ChartStyleToken.ChartCaptionFontWeight,
    lineHeight: ChartStyleToken.ChartCaptionLineHeight,
    align: ChartStyleToken.ChartCaptionAlign,
  },
  {
    foreground: ChartStyleToken.ChartNoteForeground,
    fontSize: ChartStyleToken.ChartNoteFontSize,
    fontWeight: ChartStyleToken.ChartNoteFontWeight,
    lineHeight: ChartStyleToken.ChartNoteLineHeight,
    align: ChartStyleToken.ChartNoteAlign,
  },
  {
    foreground: ChartStyleToken.ChartSourceForeground,
    fontSize: ChartStyleToken.ChartSourceFontSize,
    fontWeight: ChartStyleToken.ChartSourceFontWeight,
    lineHeight: ChartStyleToken.ChartSourceLineHeight,
    align: ChartStyleToken.ChartSourceAlign,
  },
  {
    foreground: ChartStyleToken.ChartCreditForeground,
    fontSize: ChartStyleToken.ChartCreditFontSize,
    fontWeight: ChartStyleToken.ChartCreditFontWeight,
    lineHeight: ChartStyleToken.ChartCreditLineHeight,
    align: ChartStyleToken.ChartCreditAlign,
  },
];

/** 生成六个 presentation slot 的 canonical token */
const presentationTokens = (
  style: ChartStyleValue,
  paint: PresetPaint,
): Partial<Record<ChartStyleTokenValue, unknown>> =>
  Object.fromEntries(
    presentationTokenGroups.flatMap((tokens, index) => {
      const [size, weight, lineHeight] = typography[style][index];
      return [
        [tokens.foreground, paint.slots[index]],
        [tokens.fontSize, size],
        [tokens.fontWeight, weight],
        [tokens.lineHeight, lineHeight],
        [tokens.align, NodeTextAlign.Start],
      ];
    }),
  );

/** 组装并校验单个 preset/mode 的完整 canonical token map */
const createPreset = (style: ChartStyleValue, mode: ChartThemeModeValue): IRChartResolvedStyleTokens => {
  const structure = structures[style];
  const paint = mode === ChartThemeMode.Light ? lightPaints[style] : darkPaints[style];
  const draft: Partial<Record<ChartStyleTokenValue, unknown>> = {
    [ChartStyleToken.ChartCanvasFill]: paint.canvas,
    [ChartStyleToken.ChartPadding]: structure.padding,
    [ChartStyleToken.ChartGap]: structure.gap,
    [ChartStyleToken.ChartFontFamily]: structure.fontFamily,
    ...presentationTokens(style, paint),
    [ChartStyleToken.PlotSurfaceFill]: paint.plot,
    [ChartStyleToken.PlotForeground]: paint.plotForeground,
    [ChartStyleToken.PlotLabelForeground]: paint.plotLabel,
    [ChartStyleToken.PlotLabelFontSize]: structure.plotLabelSize,
    [ChartStyleToken.AxisEnabled]: true,
    [ChartStyleToken.AxisLineEnabled]: structure.axisLineEnabled,
    [ChartStyleToken.AxisLineStroke]: paint.axis[0],
    [ChartStyleToken.AxisLineStrokeWidth]: 1,
    [ChartStyleToken.AxisLineDrawOpacity]: 1,
    [ChartStyleToken.AxisTickMark]:
      style === ChartStyle.Academic
        ? { kind: AxisTickMarkKind.Line, length: 4, line: { stroke: paint.axis[0], strokeWidth: 1 } }
        : false,
    [ChartStyleToken.AxisTickLabelEnabled]: true,
    [ChartStyleToken.AxisTickLabelForeground]: paint.axis[1],
    [ChartStyleToken.AxisTickLabelFontSize]: structure.tickLabelSize,
    [ChartStyleToken.AxisTickLabelGap]: structure.tickLabelGap,
    [ChartStyleToken.AxisTitleForeground]: paint.axis[2],
    [ChartStyleToken.AxisTitleFontSize]: structure.axisTitleSize,
    [ChartStyleToken.AxisTitleFontWeight]: 600,
    [ChartStyleToken.AxisGridEnabled]: structure.axisGridEnabled,
    [ChartStyleToken.AxisGridStroke]: paint.axis[3],
    [ChartStyleToken.AxisGridStrokeWidth]: 1,
    [ChartStyleToken.AxisGridDrawOpacity]: structure.gridOpacity,
    [ChartStyleToken.LegendEnabled]: true,
    [ChartStyleToken.LegendTitleForeground]: paint.legend[0],
    [ChartStyleToken.LegendTitleFontSize]: structure.legendTitleSize,
    [ChartStyleToken.LegendTitleFontWeight]: structure.legendTitleWeight,
    [ChartStyleToken.LegendLabelForeground]: paint.legend[1],
    [ChartStyleToken.LegendLabelFontSize]: structure.legendLabelSize,
    [ChartStyleToken.LegendSwatchSize]: structure.swatchSize,
    [ChartStyleToken.LegendSwatchGap]: structure.swatchGap,
    [ChartStyleToken.LegendEntryGap]: structure.entryGap,
    [ChartStyleToken.LegendTitleGap]: structure.titleGap,
    [ChartStyleToken.LegendRampLength]: structure.rampLength,
    [ChartStyleToken.LegendRampThickness]: structure.rampThickness,
    [ChartStyleToken.LegendSymbolSize]: structure.symbolSize,
    [ChartStyleToken.LegendSymbolScale]: 1,
    [ChartStyleToken.LegendSymbolFit]: LegendSymbolFit.Fit,
    [ChartStyleToken.DataPaletteCategorical]: paint.palette,
    [ChartStyleToken.DataPaletteSeries]: paint.palette,
    [ChartStyleToken.DataPaletteSector]: paint.palette,
    [ChartStyleToken.DataPaletteSequential]: structure.sequential,
    [ChartStyleToken.DataPaletteDiverging]: structure.diverging,
  };
  const ordered = Object.fromEntries(Object.values(ChartStyleToken).map(token => [token, draft[token]]));
  return ChartResolvedStyleTokensSchema.parse(ordered);
};

/** 递归冻结仅含 JSON 值的内建 preset */
const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

/** 内建 Chart style catalog */
export const BUILTIN_CHART_STYLE_PRESETS = deepFreeze(
  Object.fromEntries(
    Object.values(ChartStyle).map(style => [
      style,
      Object.fromEntries(Object.values(ChartThemeMode).map(mode => [mode, createPreset(style, mode)])),
    ]),
  ) as Record<ChartStyleValue, Record<ChartThemeModeValue, IRChartResolvedStyleTokens>>,
);

/** 返回隔离于内建 catalog 的完整 preset token clone */
export const getChartStylePreset = (style: ChartStyleValue, mode: ChartThemeModeValue): IRChartResolvedStyleTokens =>
  structuredClone(BUILTIN_CHART_STYLE_PRESETS[style][mode]);
