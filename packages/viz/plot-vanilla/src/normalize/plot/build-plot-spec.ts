import type { IRPlotGuide, IRPlotSpec } from '@retikz/plot';

import { PLOT_NAMESPACE, PlotComposite, PlotCoordinate, PlotGuide } from '@retikz/plot';

import type {
  BuildPlotSpecOptions,
  PlotAuthoringContext,
  PlotAuthoringRuntime,
  PlotDeclarationCollection,
  PlotMemberFragment,
  ResolveLabelMap,
} from './contracts';

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
  { type: PlotGuide.Axis, dimension: 'y' },
];

/** buildPlotSpec 收集的 resolveLabel 运行时旁路 */
const resolveLabelBySpec = new WeakMap<IRPlotSpec, ResolveLabelMap>();

/** 取某 PlotSpec 经 buildPlotSpec 收集的 resolveLabel 运行时表 */
export const resolveLabelOf = (spec: IRPlotSpec): ResolveLabelMap | undefined => resolveLabelBySpec.get(spec);

/** Chart typed extension 的 Plot-owned declaration 归一化结果 */
export type ResolvedPlotExtensionAuthoring = Readonly<{
  /** JSON-safe Plot member fragment */
  fragment: PlotMemberFragment;
  /** 不进入 IR 的 Plot runtime sidecar */
  runtime: PlotAuthoringRuntime;
}>;

/** Plot Vanilla 接收的无框架 authoring 输入 */
export type InputPlotAuthoring =
  | Readonly<{
      /** 已有的 Plot Source IR */
      spec: IRPlotSpec;
      /** 覆盖 Plot 固有宽度 */
      width?: number;
      /** 覆盖 Plot 固有高度 */
      height?: number;
      /** Plot 主题 token 稀疏覆盖 */
      plotThemeTokens?: IRPlotSpec['plotThemeTokens'];
      /** Plot 主题 token 规则 */
      plotThemeTokenRules?: IRPlotSpec['plotThemeTokenRules'];
      /** Plot 主题 */
      plotTheme?: IRPlotSpec['plotTheme'];
    }>
  | Readonly<{
      /** React 等框架收集的声明记录 */
      declarations: PlotDeclarationCollection;
      /** Plot 外部数据引用 */
      dataReference: string;
      /** Plot Source IR 根级 authoring 选项 */
      options?: BuildPlotSpecOptions;
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
export const normalizePlotSpec = (
  collection: PlotDeclarationCollection,
  dataRef: string,
  options: BuildPlotSpecOptions = {},
): IRPlotSpec => {
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
    throw new Error('normalizePlotSpec: plot-root normalization must provide scales, marks, and guides');
  }
  const coordinateRoot =
    composition !== undefined
      ? { composition }
      : coordinate !== undefined
        ? { coordinate }
        : (() => {
            throw new Error('normalizePlotSpec: plot-root normalization must provide coordinate or composition');
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
  } satisfies IRPlotSpec;
  if (runtime.resolveLabel !== undefined) resolveLabelBySpec.set(spec, runtime.resolveLabel);
  return spec;
};

/** 将无框架 Plot authoring 输入归一为 Source IR */
export const normalizePlotAuthoring = (input: InputPlotAuthoring): IRPlotSpec => {
  if ('spec' in input) {
    return Object.assign(
      {},
      input.spec,
      input.spec.width === undefined && input.width !== undefined ? { width: input.width } : {},
      input.spec.height === undefined && input.height !== undefined ? { height: input.height } : {},
      input.plotThemeTokens === undefined ? {} : { plotThemeTokens: input.plotThemeTokens },
      input.plotThemeTokenRules === undefined ? {} : { plotThemeTokenRules: input.plotThemeTokenRules },
      input.plotTheme === undefined ? {} : { plotTheme: input.plotTheme },
    );
  }
  return normalizePlotSpec(input.declarations, input.dataReference, input.options);
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
