import type { ExternalDatasets } from '@retikz/data';
import type { LowerPlotsOptions } from '@retikz/plot';
import type { EmbeddableDatasets } from '@retikz/react';

import { lowerPlots } from '@retikz/plot';

const EmbeddedPlotRuntimeOptions = Symbol('retikz.plot.embeddedRuntimeOptions');
const LocalLowerOptionKeys = new Set(['width', 'height', 'fieldMaps', 'resolveLabel']);

type EmbeddedPlotRuntimeEnvelope = {
  [EmbeddedPlotRuntimeOptions]: LowerPlotsOptions;
};

let embeddedRuntimeSeed = 0;

const runtimeOptionsOf = (value: unknown): LowerPlotsOptions | undefined => {
  if (value === null || typeof value !== 'object' || !(EmbeddedPlotRuntimeOptions in value)) return undefined;
  return (value as EmbeddedPlotRuntimeEnvelope)[EmbeddedPlotRuntimeOptions];
};

const mergeFieldMaps = (optionSets: Array<LowerPlotsOptions>): LowerPlotsOptions['fieldMaps'] => {
  const merged: NonNullable<LowerPlotsOptions['fieldMaps']> = {};
  for (const options of optionSets) {
    for (const [reference, fieldMap] of Object.entries(options.fieldMaps ?? {})) {
      const current = merged[reference] ?? {};
      for (const [field, path] of Object.entries(fieldMap)) {
        if (Object.hasOwn(current, field) && current[field] !== path) {
          throw new Error(
            `[retikz] <Plot>: embedded fieldMaps["${reference}"].${field} resolves to both "${current[field]}" and "${path}".`,
          );
        }
        current[field] = path;
      }
      merged[reference] = current;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
};

const mergeResolveLabels = (optionSets: Array<LowerPlotsOptions>): LowerPlotsOptions['resolveLabel'] => {
  const merged: NonNullable<LowerPlotsOptions['resolveLabel']> = {};
  for (const options of optionSets) {
    for (const [markId, resolveLabel] of Object.entries(options.resolveLabel ?? {})) {
      if (Object.hasOwn(merged, markId) && merged[markId] !== resolveLabel) {
        throw new Error(`[retikz] <Plot>: embedded mark "${markId}" received multiple resolveLabel functions.`);
      }
      merged[markId] = resolveLabel;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
};

/** 合并同一 Layout 内所有 Plot 共用的 lowering 选项。 */
const mergeLowerOptions = (optionSets: Array<LowerPlotsOptions>): LowerPlotsOptions => {
  const shared: Record<string, unknown> = {};
  for (const options of optionSets) {
    for (const [key, value] of Object.entries(options as Record<string, unknown>)) {
      if (value === undefined || LocalLowerOptionKeys.has(key)) continue;
      if (Object.hasOwn(shared, key) && !Object.is(shared[key], value)) {
        throw new Error(`[retikz] <Plot>: embedded plots in one <Layout> must share lower option "${key}".`);
      }
      shared[key] = value;
    }
  }

  const fieldMaps = mergeFieldMaps(optionSets);
  const resolveLabel = mergeResolveLabels(optionSets);
  return {
    ...(shared as LowerPlotsOptions),
    ...(fieldMaps !== undefined ? { fieldMaps } : {}),
    ...(resolveLabel !== undefined ? { resolveLabel } : {}),
  };
};

/**
 * 给嵌入式 Plot 数据附带 runtime-only lowering 选项。
 * @description 内部条目只在 Layout 聚合阶段传递，调用 lowerPlots 前会剥离，不进入 Plot IR 或 Scene。
 */
export const withEmbeddedPlotRuntime = (
  datasets: ExternalDatasets,
  lowerOptions: LowerPlotsOptions,
): EmbeddableDatasets => {
  let reference: string;
  do {
    reference = `@@retikz/plot-react/runtime/${embeddedRuntimeSeed}`;
    embeddedRuntimeSeed += 1;
  } while (Object.hasOwn(datasets, reference));

  const envelope: EmbeddedPlotRuntimeEnvelope = { [EmbeddedPlotRuntimeOptions]: lowerOptions };
  return Object.fromEntries([...Object.entries(datasets), [reference, envelope]]);
};

/** 用稳定函数引用聚合同一 Layout 内的 Plot 数据与 lowering 选项。 */
export const makeEmbeddedPlotComposites = (mergedDatasets: EmbeddableDatasets) => {
  const optionSets: Array<LowerPlotsOptions> = [];
  const datasetEntries: Array<[string, unknown]> = [];
  for (const [reference, value] of Object.entries(mergedDatasets)) {
    const lowerOptions = runtimeOptionsOf(value);
    if (lowerOptions === undefined) datasetEntries.push([reference, value]);
    else optionSets.push(lowerOptions);
  }

  return lowerPlots(Object.fromEntries(datasetEntries) as ExternalDatasets, mergeLowerOptions(optionSets));
};
