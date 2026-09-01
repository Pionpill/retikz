import type {
  IRPlot,
  IRPlotDomainPadding,
  IRPlotGuide,
  IRPlotMarkOperation,
  IRPlotPointMark,
  IRPlotScaleOperation,
} from '@retikz/plot';

import {
  isBuiltinMark,
  isBuiltinScaleOperation,
  MarkValueKind,
  PlotCoordinate,
  PlotDomainPaddingKind,
  PlotGuide,
  PlotMark,
  PlotScale,
  POINT_DEFAULT_RADIUS,
  SIZE_MAX_RADIUS,
} from '@retikz/plot';

import type { ChartScaleDefaultsResolveContext } from '../../_chart/contract';
import type { IRPointPositionDomainPadding } from './schema';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';

const pointContinuousPositionScaleTypes = new Set<string>([
  PlotScale.Linear,
  PlotScale.Time,
  PlotScale.Log,
  PlotScale.Pow,
  PlotScale.Sqrt,
  PlotScale.Symlog,
  PlotScale.Radial,
]);

type PointPositionRole = 'x' | 'y';
type PointVisualSide = 'left' | 'right' | 'top' | 'bottom';
type PointSizeSource = Readonly<{ size?: IRPlotPointMark['size'] }>;

const invalidPointScaleDefaults = (message: string, path: ReadonlyArray<string | number>): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidResolvedPlot,
    message,
    details: { path },
  });

const assertRadius = (value: number, path: ReadonlyArray<string | number>): number => {
  if (Number.isFinite(value) && value >= 0) return value;
  throw invalidPointScaleDefaults('Point radius must be a finite nonnegative number', path);
};

const pointRadiusOf = (
  source: PointSizeSource,
  scalesByName: ReadonlyMap<string, IRPlotScaleOperation>,
  path: ReadonlyArray<string | number>,
): number => {
  const size = source.size;
  if (size === undefined) return POINT_DEFAULT_RADIUS;
  if (size.kind === MarkValueKind.Constant) return assertRadius(size.value, [...path, 'size', 'value']);
  if (size.scale === undefined) return SIZE_MAX_RADIUS;
  const scale = scalesByName.get(size.scale);
  if (scale === undefined) {
    throw invalidPointScaleDefaults(`Point size scale "${size.scale}" is not available`, [...path, 'size', 'scale']);
  }
  if (!isBuiltinScaleOperation(scale) || scale.type !== PlotScale.Sqrt) {
    throw invalidPointScaleDefaults(`Point size scale "${size.scale}" must be a sqrt scale`, [
      ...path,
      'size',
      'scale',
    ]);
  }
  return assertRadius(Math.max(...(scale.range ?? [SIZE_MAX_RADIUS])), [...path, 'size', 'scale']);
};

const maximumPointRadiusOf = (
  marks: ReadonlyArray<IRPlotMarkOperation>,
  scales: ReadonlyArray<IRPlotScaleOperation>,
): number => {
  const scalesByName = new Map(scales.map(scale => [scale.name, scale]));
  const radii: Array<number> = [];
  for (const [markIndex, mark] of marks.entries()) {
    if (!isBuiltinMark(mark)) continue;
    if (mark.type === PlotMark.Point) {
      radii.push(pointRadiusOf(mark, scalesByName, ['recipe', 'marks', markIndex]));
      continue;
    }
    if (mark.type !== PlotMark.Relation || mark.endpoints === undefined) continue;
    for (const endpoint of ['source', 'target'] as const) {
      const glyph = mark.endpoints[endpoint];
      if (glyph !== undefined) {
        radii.push(pointRadiusOf(glyph, scalesByName, ['recipe', 'marks', markIndex, 'endpoints', endpoint]));
      }
    }
  }
  return radii.length === 0 ? 0 : Math.max(...radii);
};

const hasSpecificSide = (padding: IRPointPositionDomainPadding | undefined): boolean =>
  typeof padding === 'object' &&
  (padding.left !== undefined ||
    padding.right !== undefined ||
    padding.top !== undefined ||
    padding.bottom !== undefined);

const assertSpecificSidesSupport = (
  padding: IRPointPositionDomainPadding | undefined,
  spatial: Pick<IRPlot, 'coordinate' | 'composition'>,
): void => {
  if (!hasSpecificSide(padding)) return;
  const coordinates =
    spatial.coordinate === undefined
      ? (spatial.composition?.views?.map(view => view.coordinate) ?? [])
      : [spatial.coordinate];
  if (coordinates.length > 0 && coordinates.every(coordinate => coordinate.type === PlotCoordinate.Cartesian2D)) return;
  const side = (['left', 'right', 'top', 'bottom'] as const).find(
    name => typeof padding === 'object' && padding[name] !== undefined,
  );
  throw invalidPointScaleDefaults('Specific Point domain padding sides require a Cartesian coordinate', [
    'recipe',
    'properties',
    'domainPadding',
    side ?? 'default',
  ]);
};

const visualPaddingOf = (
  padding: IRPointPositionDomainPadding | undefined,
  role: PointPositionRole,
  side: PointVisualSide,
  fallback: number,
): number => {
  if (typeof padding === 'number') return padding;
  return padding?.[side] ?? padding?.[role] ?? padding?.default ?? fallback;
};

const domainPaddingOf = (
  padding: IRPointPositionDomainPadding | undefined,
  role: PointPositionRole,
  scale: IRPlotScaleOperation,
  radius: number,
): IRPlotDomainPadding => {
  const kind =
    typeof padding === 'object' ? (padding.kind ?? PlotDomainPaddingKind.Range) : PlotDomainPaddingKind.Range;
  const fallback = kind === PlotDomainPaddingKind.Ratio ? 0 : radius;
  const startSide: PointVisualSide = role === 'x' ? 'left' : 'top';
  const endSide: PointVisualSide = role === 'x' ? 'right' : 'bottom';
  const start = visualPaddingOf(padding, role, startSide, fallback);
  const end = visualPaddingOf(padding, role, endSide, fallback);
  const rawRange = 'range' in scale ? scale.range : undefined;
  const range =
    Array.isArray(rawRange) &&
    rawRange.length === 2 &&
    typeof rawRange[0] === 'number' &&
    typeof rawRange[1] === 'number'
      ? rawRange
      : undefined;
  const increasing = range === undefined ? role === 'x' : range[1] >= range[0];
  return {
    kind,
    lower: increasing ? start : end,
    upper: increasing ? end : start,
  };
};

/** 按最终 Point semantic marks 为未显式配置的连续位置 scale 补齐 range padding */
export const resolvePointScaleDefaults = (
  context: ChartScaleDefaultsResolveContext,
): ReadonlyArray<IRPlotScaleOperation> => {
  const padding = context.source.recipe.properties?.domainPadding as IRPointPositionDomainPadding | undefined;
  assertSpecificSidesSupport(padding, context.spatial);
  const radius = maximumPointRadiusOf(context.chartMarks, context.scales);
  const roleByScaleName = new Map<string, PointPositionRole>([
    [pointRecipeId(context.source.recipe.chartType, 'scale.x'), 'x'],
    [pointRecipeId(context.source.recipe.chartType, 'scale.y'), 'y'],
  ]);
  for (const [role, scaleName] of Object.entries(context.encodings.positionScales)) {
    if (role === 'x' || role === 'y') roleByScaleName.set(scaleName, role);
  }
  const extensionScaleNames = new Set(context.source.plotExtension?.scales?.map(scale => scale.name) ?? []);
  return context.scales.map(scale => {
    const role = roleByScaleName.get(scale.name);
    if (
      role === undefined ||
      extensionScaleNames.has(scale.name) ||
      Object.hasOwn(scale, 'domainPadding') ||
      !isBuiltinScaleOperation(scale) ||
      !pointContinuousPositionScaleTypes.has(scale.type)
    ) {
      return scale;
    }
    return { ...scale, domainPadding: domainPaddingOf(padding, role, scale, radius) };
  });
};

/** 生成 Point recipe 使用的稳定 Plot member identity */
export const pointRecipeId = (chartType: string, target: string): string => `__chart.${chartType}.${target}`;

/** 为 Point recipe 建立二维笛卡尔 scaffold */
export const pointCartesian2DOf = (
  chartType: string,
): Readonly<{
  scales: readonly [IRPlotScaleOperation, IRPlotScaleOperation];
  coordinate: NonNullable<IRPlot['coordinate']>;
}> => {
  const x = pointRecipeId(chartType, 'scale.x');
  const y = pointRecipeId(chartType, 'scale.y');
  return {
    scales: [
      { type: PlotScale.Linear, name: x },
      { type: PlotScale.Linear, name: y },
    ],
    coordinate: { type: PlotCoordinate.Cartesian2D, x, y },
  };
};

/** 依据 Point recipe theme 创建默认轴 guide */
export const pointAxisGuidesOf = (
  chartType: string,
  theme: Readonly<{ axisEnabled: boolean; axisGridEnabled: boolean }>,
): ReadonlyArray<IRPlotGuide> => {
  if (!theme.axisEnabled) return [];
  return [
    {
      type: PlotGuide.Axis,
      dimension: 'x',
    },
    {
      type: PlotGuide.Axis,
      dimension: 'y',
      ...(theme.axisGridEnabled ? { grid: true } : {}),
    },
  ];
};
