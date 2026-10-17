import type { IRPlot, IRPlotDomainPadding, IRPlotGuide, IRPlotScaleOperation } from '@retikz/plot';
import { BuiltinPlotCoordinate, BuiltinPlotScale, PlotGuide } from '@retikz/plot';

import type { ChartScaleDefaultsResolveContext } from '../../_chart/contract';
import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import type { IRPointAutoPadding, IRPointPositionDomainPadding } from './schema';

const pointContinuousPositionScaleTypes = new Set<string>([
  BuiltinPlotScale.Linear,
  BuiltinPlotScale.Time,
  BuiltinPlotScale.Log,
  BuiltinPlotScale.Pow,
  BuiltinPlotScale.Sqrt,
  BuiltinPlotScale.Symlog,
  BuiltinPlotScale.Radial,
]);

/** 只转换作者明确声明的四边留白，自动策略由最终图元交给 Plot */
export const resolvePointScaleDefaults = (
  context: ChartScaleDefaultsResolveContext,
): ReadonlyArray<IRPlotScaleOperation> => {
  const padding = context.source.recipe.properties?.domainPadding as IRPointPositionDomainPadding | undefined;
  if (padding === undefined) return context.scales;
  const strategy = context.source.recipe.properties?.autoPadding as IRPointAutoPadding | undefined;
  const pointAware = (typeof strategy === 'object' ? strategy.kind : strategy) === 'point-aware';
  const coordinates =
    context.spatial.coordinate === undefined
      ? (context.spatial.composition?.views?.map(view => view.coordinate) ?? [])
      : [context.spatial.coordinate];
  const specificSide =
    typeof padding === 'object'
      ? ['left', 'right', 'top', 'bottom'].find(side => Object.hasOwn(padding, side))
      : undefined;
  if (
    specificSide !== undefined &&
    !coordinates.every(coordinate => coordinate.type === BuiltinPlotCoordinate.Cartesian2D)
  ) {
    throw new RetikzChartError({
      code: RetikzChartErrorCode.InvalidResolvedPlot,
      message: 'Specific Point domain padding sides require a Cartesian coordinate',
      details: { path: ['recipe', 'properties', 'domainPadding', specificSide] },
    });
  }
  const roles = new Map<string, 'x' | 'y'>([
    [pointRecipeId(context.source.recipe.chartType, 'scale.x'), 'x'],
    [pointRecipeId(context.source.recipe.chartType, 'scale.y'), 'y'],
  ]);
  for (const [role, name] of Object.entries(context.encodings.positionScales)) {
    if (role === 'x' || role === 'y') roles.set(name, role);
  }
  const extensions = new Set(
    (context.encodings.extensionScales ?? context.source.plotExtension?.scales ?? []).map(scale => scale.name),
  );
  return context.scales.map(scale => {
    const role = roles.get(scale.name);
    if (role === undefined || extensions.has(scale.name) || Object.hasOwn(scale, 'domainPadding')) return scale;
    if (!pointAware && !pointContinuousPositionScaleTypes.has(scale.type)) return scale;
    if (typeof padding === 'number') return { ...scale, domainPadding: padding };
    const start = padding[role === 'x' ? 'left' : 'top'] ?? padding[role] ?? padding.default;
    const end = padding[role === 'x' ? 'right' : 'bottom'] ?? padding[role] ?? padding.default;
    const kind = padding.kind ?? 'range';
    if (start === undefined && end === undefined && kind === 'range') return scale;
    const range = 'range' in scale ? scale.range : undefined;
    const increasing =
      Array.isArray(range) && typeof range[0] === 'number' && typeof range[1] === 'number'
        ? range[1] >= range[0]
        : role === 'x';
    const lower = increasing ? start : end;
    const upper = increasing ? end : start;
    const domainPadding: IRPlotDomainPadding = {
      kind,
      ...(lower === undefined ? (kind === 'ratio' ? { lower: 0 } : {}) : { lower }),
      ...(upper === undefined ? (kind === 'ratio' ? { upper: 0 } : {}) : { upper }),
    };
    return { ...scale, domainPadding };
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
      { type: BuiltinPlotScale.Linear, name: x },
      { type: BuiltinPlotScale.Linear, name: y },
    ],
    coordinate: { type: BuiltinPlotCoordinate.Cartesian2D, x, y },
  };
};

/** 创建 Point recipe 的默认轴 guide
 *
 * guide 的生成开关由 Source recipe.guides 在 resolve 阶段应用
 */
export const pointAxisGuidesOf = (): ReadonlyArray<IRPlotGuide> => [
  {
    type: PlotGuide.Axis,
    dimension: 'x',
  },
  {
    type: PlotGuide.Axis,
    dimension: 'y',
  },
];
