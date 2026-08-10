import type { IRPlotGuide, IRPlotSpec } from '@retikz/plot';
import type { ReactNode } from 'react';

import { PLOT_NAMESPACE, PlotComposite, PlotCoordinate, PlotGuide, PlotSpecSchema } from '@retikz/plot';

import type { BuildPlotSpecOptions, ResolveLabelMap } from './contracts';

import { collectPlotDeclarations } from './collector';
import { normalizePlotDeclarations } from './normalize';

export type {
  BuildPlotSpecOptions,
  CoordinateInput,
  MarkTransformShortcutContext,
  MarkTransformShortcutDefinition,
  ResolveLabelMap,
} from './contracts';

/** 默认 guide（供 decorateDefaultGuides 复用，薄 Plot 本身不补） */
const DEFAULT_GUIDES: ReadonlyArray<IRPlotGuide> = [
  { type: PlotGuide.Axis, dimension: 'x' },
  { type: PlotGuide.Axis, dimension: 'y', grid: true },
];

/** buildPlotSpec 收集的 resolveLabel 运行时旁路 */
const resolveLabelBySpec = new WeakMap<IRPlotSpec, ResolveLabelMap>();

/** 取某 PlotSpec 经 buildPlotSpec 收集的 resolveLabel 运行时表 */
export const resolveLabelOf = (spec: IRPlotSpec): ResolveLabelMap | undefined => resolveLabelBySpec.get(spec);

/**
 * 把 React Plot children 构造成 schema-valid 的 PlotSpec
 * @description 先收集 JSON-safe declarations 与 runtime sidecar，再统一归一化 Plot members 并组装根字段
 */
export const buildPlotSpec = (children: ReactNode, dataRef: string, options: BuildPlotSpecOptions = {}): IRPlotSpec => {
  const data = options.model ? { reference: dataRef, model: options.model } : { reference: dataRef };
  const collection = collectPlotDeclarations(children);
  const plotRootContext = {
    data,
    ...(options.model === undefined ? {} : { model: options.model }),
    ...(options.dataFieldNames === undefined ? {} : { dataFieldNames: options.dataFieldNames }),
    ...(options.coordinate === undefined
      ? {}
      : { coordinate: { value: options.coordinate, path: ['options', 'coordinate'] } }),
    ...(options.composition === undefined
      ? {}
      : { composition: { value: options.composition, path: ['options', 'composition'] } }),
    ...(options.transforms === undefined ? {} : { dataTransforms: options.transforms }),
    ...(options.markTransformShortcuts === undefined ? {} : { markTransformShortcuts: options.markTransformShortcuts }),
    ...(options.deferPositionScaleInference === undefined
      ? {}
      : { deferPositionScaleInference: options.deferPositionScaleInference }),
    mode: 'plot-root' as const,
  };
  const { fragment, runtime } = normalizePlotDeclarations(collection, plotRootContext);
  const parsed = PlotSpecSchema.parse({
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    ...(options.id === undefined ? {} : { id: options.id }),
    data,
    ...fragment,
    ...(options.plotThemeTokens === undefined ? {} : { plotThemeTokens: options.plotThemeTokens }),
    ...(options.plotTheme === undefined ? {} : { plotTheme: options.plotTheme }),
    ...(options.width === undefined ? {} : { width: options.width }),
    ...(options.height === undefined ? {} : { height: options.height }),
  });
  if (runtime.resolveLabel !== undefined) resolveLabelBySpec.set(parsed, runtime.resolveLabel);
  return parsed;
};

/**
 * 给薄 Plot 产物补默认坐标轴
 * @description cartesian2D 且无任何显式 axis 时前置 x 轴与带网格的 y 轴，其余情况原样返回
 */
export const decorateDefaultGuides = (spec: IRPlotSpec): IRPlotSpec => {
  if (spec.coordinate === undefined) return spec;
  if (spec.coordinate.type !== PlotCoordinate.Cartesian2D) return spec;
  const guides = spec.guides ?? [];
  if (guides.some(guide => guide.type === PlotGuide.Axis)) return spec;
  return { ...spec, guides: [...DEFAULT_GUIDES, ...guides] };
};
