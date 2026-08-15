import type { CompositeCoreProviderKey, CoreDependencyProvider, CoreProviderContribution } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';

import { BUILTIN_RIBBON_WIDTH_PROFILES, createRibbonProviderContribution } from '@retikz/standard/ribbon';
import { ContourShapeProvider, SectorShapeProvider } from '@retikz/standard/shape';

import type { LowerPlotsOptions } from './types';

import { PLOT_NAMESPACE } from '../../schemas';
import { lowerPlots } from './lower';

const PlotRuntimeOptions = Symbol('retikz.plot.runtimeOptions');
const PlotRuntimeReferencePrefix = '@@retikz/plot/runtime/';
const LocalLowerOptionKeys = new Set(['width', 'height', 'fieldMaps', 'resolveLabel']);

type PlotRuntimeEnvelope = {
  [PlotRuntimeOptions]: LowerPlotsOptions;
};

let plotRuntimeReferenceSeed = 0;

/** Plot Composite provider 的公开完整 key */
export const PlotProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: PLOT_NAMESPACE,
  type: 'plot',
});

/** 识别 provider-local lowering options envelope */
const runtimeOptionsOf = (value: unknown): LowerPlotsOptions | undefined => {
  if (value === null || typeof value !== 'object' || !(PlotRuntimeOptions in value)) return undefined;
  return (value as PlotRuntimeEnvelope)[PlotRuntimeOptions];
};

/** 合并多个 Plot contribution 的 field map */
const mergeFieldMaps = (optionSets: Array<LowerPlotsOptions>): LowerPlotsOptions['fieldMaps'] => {
  const merged: NonNullable<LowerPlotsOptions['fieldMaps']> = {};
  for (const options of optionSets) {
    for (const [reference, fieldMap] of Object.entries(options.fieldMaps ?? {})) {
      const current = merged[reference] ?? {};
      for (const [field, path] of Object.entries(fieldMap)) {
        if (Object.hasOwn(current, field) && current[field] !== path) {
          throw new Error(
            `[retikz] Plot provider: fieldMaps["${reference}"].${field} resolves to both "${current[field]}" and "${path}".`,
          );
        }
        current[field] = path;
      }
      merged[reference] = current;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
};

/** 合并多个 Plot contribution 的 mark label resolver */
const mergeResolveLabels = (optionSets: Array<LowerPlotsOptions>): LowerPlotsOptions['resolveLabel'] => {
  const merged: NonNullable<LowerPlotsOptions['resolveLabel']> = {};
  for (const options of optionSets) {
    for (const [markId, resolveLabel] of Object.entries(options.resolveLabel ?? {})) {
      if (Object.hasOwn(merged, markId) && merged[markId] !== resolveLabel) {
        throw new Error(`[retikz] Plot provider: mark "${markId}" received multiple resolveLabel functions.`);
      }
      merged[markId] = resolveLabel;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
};

/** 合并同一 compile assembly 内所有 Plot 共用的 lowering 选项 */
const mergeLowerOptions = (optionSets: Array<LowerPlotsOptions>): LowerPlotsOptions => {
  const shared: Record<string, unknown> = {};
  for (const options of optionSets) {
    for (const [key, value] of Object.entries(options as Record<string, unknown>)) {
      if (value === undefined || LocalLowerOptionKeys.has(key)) continue;
      if (Object.hasOwn(shared, key) && !Object.is(shared[key], value)) {
        throw new Error(`[retikz] Plot provider: plots in one compile assembly must share lower option "${key}".`);
      }
      shared[key] = value;
    }
  }

  const fieldMaps = mergeFieldMaps(optionSets);
  const resolveLabel = mergeResolveLabels(optionSets);
  return {
    ...(shared as LowerPlotsOptions),
    ...(fieldMaps === undefined ? {} : { fieldMaps }),
    ...(resolveLabel === undefined ? {} : { resolveLabel }),
  };
};

/** 使用 Core 已合并的 datasets 与 runtime envelopes 生成唯一 Plot definition */
const makePlotDefinition: CoreDependencyProvider['makeDefinition'] = mergedDatasets => {
  const optionSets: Array<LowerPlotsOptions> = [];
  const datasetEntries: Array<[string, unknown]> = [];
  for (const [reference, value] of Object.entries(mergedDatasets)) {
    const lowerOptions = runtimeOptionsOf(value);
    if (lowerOptions === undefined) datasetEntries.push([reference, value]);
    else optionSets.push(lowerOptions);
  }
  return lowerPlots(Object.fromEntries(datasetEntries) as ExternalDatasets, mergeLowerOptions(optionSets))[0];
};

/** 创建携带当前 Plot datasets 与 lowering options 的 Core dependency provider */
export const createPlotProvider = (
  datasets: ExternalDatasets,
  lowerOptions: LowerPlotsOptions = {},
): CoreDependencyProvider => {
  let runtimeReference: string;
  do {
    runtimeReference = `${PlotRuntimeReferencePrefix}${plotRuntimeReferenceSeed}`;
    plotRuntimeReferenceSeed += 1;
  } while (Object.hasOwn(datasets, runtimeReference));

  const runtimeEnvelope: PlotRuntimeEnvelope = { [PlotRuntimeOptions]: lowerOptions };
  return Object.freeze({
    key: PlotProviderKey,
    dependencies: Object.freeze([SectorShapeProvider.key, ContourShapeProvider.key]),
    datasets: Object.freeze({ ...datasets, [runtimeReference]: runtimeEnvelope }),
    makeDefinition: makePlotDefinition,
  });
};

/** 创建 Plot 及其 Standard Shape 静态依赖的完整 Core provider contribution */
export const createPlotProviderContribution = (
  datasets: ExternalDatasets,
  lowerOptions: LowerPlotsOptions = {},
): CoreProviderContribution => {
  const plotProvider = createPlotProvider(datasets, lowerOptions);
  const ribbonContribution = createRibbonProviderContribution(BUILTIN_RIBBON_WIDTH_PROFILES);
  return Object.freeze({
    roots: Object.freeze([PlotProviderKey, ...ribbonContribution.roots]),
    providers: Object.freeze([
      SectorShapeProvider,
      ContourShapeProvider,
      ...ribbonContribution.providers,
      plotProvider,
    ]),
  });
};
