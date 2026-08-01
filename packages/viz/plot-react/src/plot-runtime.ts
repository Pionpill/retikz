import type { ExternalDatasets, ExternalRow } from '@retikz/data';
import type { IRPlotSpec, LowerPlotsOptions, PlotLineageRun } from '@retikz/plot';

import { lowerPlotWithLineage, PlotSpecSchema } from '@retikz/plot';

import type { ResolveLabelMap } from './adapter';
import type { PlotProps } from './Plot';

import { buildPlotSpec, resolveLabelOf } from './adapter';

type PlotRuntime = {
  spec: IRPlotSpec;
  datasets: ExternalDatasets;
  lowerOptions: LowerPlotsOptions;
};

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

const lowerPlotOptionsOf = (
  props: PlotProps,
  effectiveFieldMaps: LowerPlotsOptions['fieldMaps'],
  collectedResolveLabel: ResolveLabelMap | undefined,
): LowerPlotsOptions => {
  const {
    width,
    height,
    fontSize,
    margin,
    provenance,
    datumProvenance,
    datumIdField,
    validateData,
    resolveField,
    resolveLabel,
    invalid,
    coordinates,
    transformDefinitions,
    statisticsReducerDefinitions,
    rowSelectorDefinitions,
    scaleDefinitions,
    channelDefinitions,
    colorSchemes,
    markDefinitions,
    formatDefinitions,
  } = props;
  // DSL 入口 <PointMark resolveLabel> / <IntervalMark resolveLabel> 收集的 per-mark 函数，与显式 props.resolveLabel 合并（显式优先）
  const mergedResolveLabel =
    collectedResolveLabel !== undefined || resolveLabel !== undefined
      ? { ...collectedResolveLabel, ...resolveLabel }
      : undefined;
  return {
    width,
    height,
    fontSize,
    margin,
    provenance,
    datumProvenance,
    datumIdField,
    fieldMaps: effectiveFieldMaps,
    validateData,
    resolveField,
    resolveLabel: mergedResolveLabel,
    invalid,
    coordinates,
    transformDefinitions,
    statisticsReducerDefinitions,
    rowSelectorDefinitions,
    scaleDefinitions,
    channelDefinitions,
    colorSchemes,
    markDefinitions,
    formatDefinitions,
  };
};

const withIntrinsicSize = (spec: IRPlotSpec, width: number | undefined, height: number | undefined): IRPlotSpec => ({
  ...spec,
  ...(spec.width === undefined && width !== undefined ? { width } : {}),
  ...(spec.height === undefined && height !== undefined ? { height } : {}),
});

const withPlotColors = (spec: IRPlotSpec, colors: Array<string> | undefined): IRPlotSpec => ({
  ...spec,
  ...(colors !== undefined ? { colors } : {}),
});

const withPlotTheme = (spec: IRPlotSpec, theme: IRPlotSpec['theme'] | undefined): IRPlotSpec => ({
  ...spec,
  ...(theme !== undefined ? { theme } : {}),
});

const withPlotLayout = (spec: IRPlotSpec, layout: IRPlotSpec['layout'] | undefined): IRPlotSpec => ({
  ...spec,
  ...(layout !== undefined ? { layout } : {}),
});

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

/** 解析 `<Plot>` props 为下沉运行时输入。 */
export const resolvePlotRuntime = (props: PlotProps, options: { embedded?: boolean } = {}): PlotRuntime => {
  const dataRef = !props.spec
    ? (props.dataRef ??
      (options.embedded && props.id !== undefined
        ? props.id
        : options.embedded
          ? embeddedDataRefFor(props.data)
          : DSL_DATA_REF))
    : DSL_DATA_REF;
  let spec: IRPlotSpec;
  let datasets: ExternalDatasets;
  let effectiveFieldMaps = props.fieldMaps;
  // DSL 入口 buildPlotSpec 旁路收集的 per-mark resolveLabel（运行时函数、不进 IR）；spec 入口由 props.resolveLabel 直接给
  let collectedResolveLabel: ResolveLabelMap | undefined;
  if (props.spec) {
    spec = withPlotLayout(withPlotTheme(withPlotColors(props.spec, props.colors), props.theme), props.layout);
    datasets = props.data;
  } else {
    // DSL 入口：model 经 buildPlotSpec 注入 data.model **并改走 type-driven 派生**（省略 AUTO 位置 scale 绑定，
    // 否则 model 的 temporal/nominal 不会派生 time/band、甚至被当显式 linear 校验）。扁平 fieldMap 映射到数据集名。
    spec = buildPlotSpec(props.children, dataRef, {
      id: props.id,
      width: props.width,
      height: props.height,
      coordinate: props.coordinate,
      composition: props.composition,
      model: props.model,
      dataFieldNames: dataFieldNamesOf(props.data),
      colors: props.colors,
      theme: props.theme,
      layout: props.layout,
      transforms: props.dataTransforms,
      markTransformShortcuts: props.markTransformShortcuts,
      deferPositionScaleInference: props.model === undefined,
    });
    collectedResolveLabel = resolveLabelOf(spec);
    datasets = { [dataRef]: props.data };
    if (props.fieldMap) effectiveFieldMaps = { [dataRef]: props.fieldMap };
  }
  // 入口校验：非法 spec（缺判别字段等）抛清晰 ZodError，而非落到 core 内部崩
  const validated = PlotSpecSchema.parse(withIntrinsicSize(spec, props.width, props.height));
  return {
    spec: validated,
    datasets,
    lowerOptions: lowerPlotOptionsOf(props, effectiveFieldMaps, collectedResolveLabel),
  };
};

/** 解析一组 `<Plot>` props 对应的 runtime-only 图元链路。 */
export const resolvePlotLineage = (
  props: PlotProps,
  options: { embedded?: boolean } = {},
): PlotLineageRun | undefined => {
  if (props.lineage === false) return undefined;
  const { spec, datasets, lowerOptions } = resolvePlotRuntime(props, options);
  return lowerPlotWithLineage(spec, datasets, {
    ...lowerOptions,
    lineage: props.lineage ?? {},
    hostLineageMetadata: props.hostLineageMetadata,
  }).lineage;
};
