import type { IRPlot, IRPlotGuide } from '@retikz/plot';

import { PLOT_NAMESPACE, PlotComposite, PlotCoordinate, PlotGuide } from '@retikz/plot';

import type {
  BuildPlotOptions,
  PlotAuthoringContext,
  PlotAuthoringRuntime,
  PlotDeclarationCollection,
  PlotMemberFragment,
  ResolveLabelMap,
} from './contracts';

import { RetikzPlotVanillaError } from '../../error';
import { normalizePlotDeclarations } from './normalize';

export type {
  BuildPlotOptions,
  InputPlotCoordinate,
  MarkTransformShortcutContext,
  MarkTransformShortcutDefinition,
  ResolveLabelMap,
} from './contracts';

/** 默认 guide（供 decorateDefaultGuides 复用，薄 Plot 本身不补） */
const DEFAULT_GUIDES: ReadonlyArray<IRPlotGuide> = [
  { type: PlotGuide.Axis, dimension: 'x' },
  { type: PlotGuide.Axis, dimension: 'y' },
];

/** buildPlotIR 收集的 resolveLabel 运行时旁路 */
const resolveLabelByPlotIR = new WeakMap<IRPlot, ResolveLabelMap>();

/** 取某 IRPlot 经 buildPlotIR 收集的 resolveLabel 运行时表 */
export const resolveLabelOf = (spec: IRPlot): ResolveLabelMap | undefined => resolveLabelByPlotIR.get(spec);

/** Chart typed extension 的 Plot-owned declaration 归一化结果 */
export type ResolvedPlotExtensionAuthoring = Readonly<{
  /** JSON-safe Plot member fragment */
  fragment: PlotMemberFragment;
  /** 不进入 IR 的 Plot runtime sidecar */
  runtime: PlotAuthoringRuntime;
}>;

/**
 * 将 Chart typed children 交给 Plot 的正式 collector 和 normalizer
 * @description 保留 React Fragment 路径、来源冲突诊断和 runtime sidecar。Chart 只消费返回值，不复制 Plot authoring 规则
 */
export const resolvePlotExtensionAuthoring = (
  collection: PlotDeclarationCollection,
  context: Omit<PlotAuthoringContext, 'mode'>,
): ResolvedPlotExtensionAuthoring => {
  return normalizePlotDeclarations(collection, { ...context, mode: 'chart-extension' });
};

/**
 * 把 React Plot children 构造成 Plot Source IR
 * @description 先收集 JSON-safe declarations 与 runtime sidecar，再统一归一化 Plot members 并组装根字段
 */
export const normalizePlotIR = (
  collection: PlotDeclarationCollection,
  dataRef: string,
  options: BuildPlotOptions = {},
): IRPlot => {
  const data = options.model ? { reference: dataRef, model: options.model } : { reference: dataRef };
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
  const { composition, coordinate, guides, marks, scales, transform } = fragment;
  if (scales === undefined || marks === undefined || guides === undefined) {
    throw new RetikzPlotVanillaError('normalizePlotIR: plot-root normalization must provide scales, marks, and guides');
  }
  const coordinateRoot =
    composition !== undefined
      ? { composition }
      : coordinate !== undefined
        ? { coordinate }
        : (() => {
            throw new RetikzPlotVanillaError(
              'normalizePlotIR: plot-root normalization must provide coordinate or composition',
            );
          })();
  const spec = {
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    ...(options.id === undefined ? {} : { id: options.id }),
    data,
    ...(transform === undefined ? {} : { transform }),
    scales,
    ...coordinateRoot,
    marks,
    guides,
    ...(options.plotThemeTokens === undefined ? {} : { plotThemeTokens: options.plotThemeTokens }),
    ...(options.plotThemeTokenRules === undefined ? {} : { plotThemeTokenRules: options.plotThemeTokenRules }),
    ...(options.plotTheme === undefined ? {} : { plotTheme: options.plotTheme }),
    ...(options.width === undefined ? {} : { width: options.width }),
    ...(options.height === undefined ? {} : { height: options.height }),
  } satisfies IRPlot;
  if (runtime.resolveLabel !== undefined) resolveLabelByPlotIR.set(spec, runtime.resolveLabel);
  return spec;
};

/**
 * 给薄 Plot 产物补默认坐标轴
 * @description cartesian2D 且无任何显式 axis 时前置 x 轴与带网格的 y 轴，其余情况原样返回
 */
export const decorateDefaultGuides = (spec: IRPlot): IRPlot => {
  if (spec.coordinate === undefined) return spec;
  if (spec.coordinate.type !== PlotCoordinate.Cartesian2D) return spec;
  const guides = spec.guides ?? [];
  if (guides.some(guide => guide.type === PlotGuide.Axis)) return spec;
  return { ...spec, guides: [...DEFAULT_GUIDES, ...guides] };
};
