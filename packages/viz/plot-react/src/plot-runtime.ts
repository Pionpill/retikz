import type { DataInputBindings, ExternalDatasets, ExternalRow } from '@retikz/data';
import type { PlotCompileEnvironment } from '@retikz/plot';
import type { IRPlot, PlotsLoweringOptions, PlotLineageRun } from '@retikz/plot';
import { lowerPlotWithLineage } from '@retikz/plot';
import type { LabelResolverByField } from '@retikz/plot-vanilla';
import { normalizePlotIR, resolveLabelOf } from '@retikz/plot-vanilla';

import { collectPlotDeclarations } from './adapter';
import { RetikzPlotReactError } from './error';
import type { PlotProps } from './Plot';

/**
 * `Plot` props 的完整 authoring 结果
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type PlotAuthoringResolution<TSource = never> = Readonly<{
  /** 完整 Plot Source IR */
  spec: IRPlot;

  /** 将绘图描述降低为 Core 图元时的运行时选项 */
  lowerOptions: PlotsLoweringOptions;
}> &
  (
    | Readonly<{
        /** 传给 Plot 下沉阶段的外部行数据集 */
        datasets: ExternalDatasets;
        dataBindings?: never;
      }>
    | Readonly<{
        /** 传给数据执行阶段的运行时源绑定 */
        dataBindings: DataInputBindings<TSource>;
        datasets?: never;
      }>
  );

/** `resolvePlotAuthoring` 的可选嵌入与默认数据引用配置 */
export type PlotAuthoringResolveOptions = Readonly<{
  /** 是否为 Tier 2 embedded authoring */
  embedded?: boolean;
  /** DSL 缺省时使用的稳定数据引用 */
  defaultDataReference?: string;
}>;

/** 组合 DSL 内部固定的数据集名（用户不可见） */
const DSL_DATA_REF = '__plot';

const embeddedDataRefs = new WeakMap<Array<ExternalRow>, string>();

let embeddedDataRefSeed = 0;

const embeddedDataRefFor = (rows: Array<ExternalRow>): string => {
  const existing = embeddedDataRefs.get(rows);
  if (existing !== undefined) return existing;

  const next = `${DSL_DATA_REF}_${embeddedDataRefSeed}`;
  embeddedDataRefSeed += 1;
  embeddedDataRefs.set(rows, next);

  return next;
};

const lowerPlotOptionsOf = <TSource>(
  props: PlotProps<TSource>,
  effectiveDatasetFieldMaps: PlotsLoweringOptions['datasetFieldMaps'],
  collectedResolveLabel: LabelResolverByField | undefined,
): PlotsLoweringOptions => {
  const {
    layout,
    definitions,
    implementations,
    provenance,
    datumProvenance,
    datumIdField,
    validateData,
    resolveField,
    resolveLabel,
    invalid,
    colorSchemes,
  } = props;

  // 显式 resolver 覆盖从 mark children 收集的同名 resolver
  const mergedResolveLabel =
    collectedResolveLabel !== undefined || resolveLabel !== undefined
      ? { ...collectedResolveLabel, ...resolveLabel }
      : undefined;

  return {
    layout,
    definitions,
    implementations,
    provenance,
    datumProvenance,
    datumIdField,
    datasetFieldMaps: effectiveDatasetFieldMaps,
    validateData,
    resolveField,
    resolveLabel: mergedResolveLabel,
    invalid,
    colorSchemes,
  };
};

const collectRowFields = (value: unknown, into: Set<string>, prefix = ''): void => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return;

  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    into.add(path);
    collectRowFields(child, into, path);
  }
};

const dataFieldNamesOf = (rows: Array<ExternalRow>): ReadonlySet<string> => {
  const fields = new Set<string>();
  for (const row of rows) collectRowFields(row, fields);
  return fields;
};

/** 将 React spec 入口的显式展示覆盖装配到 Plot Source IR */
const applyPlotPropsToSpec = (
  spec: IRPlot,
  props: Pick<IRPlot, 'width' | 'height' | 'defaultPlot' | 'plotRules' | 'dataExecution'>,
): IRPlot => {
  if (spec.dataExecution !== undefined && props.dataExecution !== undefined)
    throw new RetikzPlotReactError('Plot dataExecution is declared in both spec and root props');

  const width = spec.width === undefined && props.width !== undefined ? props.width : undefined;
  const height = spec.height === undefined && props.height !== undefined ? props.height : undefined;
  if (
    width === undefined &&
    height === undefined &&
    props.defaultPlot === undefined &&
    props.plotRules === undefined &&
    props.dataExecution === undefined
  ) {
    return spec;
  }

  return {
    ...spec,
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
    ...(props.defaultPlot === undefined ? {} : { defaultPlot: props.defaultPlot }),
    ...(props.plotRules === undefined ? {} : { plotRules: props.plotRules }),
    ...(props.dataExecution === undefined ? {} : { dataExecution: props.dataExecution }),
  };
};

/**
 * 解析 `<Plot>` props 为下沉运行时输入
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export const resolvePlotAuthoring = <TSource = never>(
  props: PlotProps<TSource>,
  options: PlotAuthoringResolveOptions = {},
): PlotAuthoringResolution<TSource> => {
  const dataRef = !props.spec
    ? (props.dataRef ??
      options.defaultDataReference ??
      (options.embedded && props.id !== undefined
        ? props.id
        : options.embedded
          ? embeddedDataRefFor(props.data)
          : DSL_DATA_REF))
    : DSL_DATA_REF;
  let spec: IRPlot;
  let datasets: ExternalDatasets;
  let effectiveDatasetFieldMaps = props.datasetFieldMaps;

  // DSL 入口 buildPlotIR 旁路收集的 per-mark resolveLabel（运行时函数、不进 IR）；spec 入口由 props.resolveLabel 直接给
  let collectedResolveLabel: LabelResolverByField | undefined;
  if (props.spec) {
    spec = applyPlotPropsToSpec(props.spec, props);
    datasets = props.data ?? {};
  } else {
    // DSL 入口：model 经 buildPlotIR 注入 data.model **并改走 type-driven 派生**（省略 AUTO 位置 scale 绑定，
    // 否则 model 的 temporal/nominal 不会派生 time/band、甚至被当显式 linear 校验）。扁平 fieldMap 映射到数据集名。
    spec = normalizePlotIR(collectPlotDeclarations(props.children), dataRef, {
      id: props.id,
      width: props.width,
      height: props.height,
      coordinate: props.coordinate,
      composition: props.composition,
      model: props.model,
      dataFieldNames: dataFieldNamesOf(props.data),
      defaultPlot: props.defaultPlot,
      plotRules: props.plotRules,
      transforms: props.dataTransforms,
      dataExecution: props.dataExecution,
      markTransformShortcuts: props.markTransformShortcuts,
      deferPositionScaleInference: props.model === undefined,
    });
    collectedResolveLabel = resolveLabelOf(spec);
    datasets = { [dataRef]: props.data };
    if (props.fieldMap) effectiveDatasetFieldMaps = { [dataRef]: props.fieldMap };
  }

  return {
    spec,
    ...(props.dataBindings === undefined ? { datasets } : { dataBindings: props.dataBindings }),
    lowerOptions: lowerPlotOptionsOf(props, effectiveDatasetFieldMaps, collectedResolveLabel),
  };
};

/**
 * 解析一组 `<Plot>` props 对应的 runtime-only 图元链路
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export const resolvePlotLineage = <TSource = never>(
  props: PlotProps<TSource>,
  options: { embedded?: boolean; environment: PlotCompileEnvironment },
): PlotLineageRun | undefined => {
  if (props.lineage === false) return undefined;

  const { spec, datasets, lowerOptions } = resolvePlotAuthoring(props, options);
  if (datasets === undefined || props.dataTransformExecutor !== undefined)
    throw new RetikzPlotReactError('Plot async lineage is delivered from the committed processing result');

  return lowerPlotWithLineage(spec, datasets, {
    ...lowerOptions,
    environment: options.environment,
    lineage: props.lineage ?? {},
    hostLineageMetadata: props.hostLineageMetadata,
  }).lineage;
};
