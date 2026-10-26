import type { CompositeCoreProviderKey, CoreDependencyProvider, CoreProviderContribution } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import { mergeExternalDatasets } from '@retikz/data';
import { ContourShapeProvider, SectorShapeProvider, createRibbonProviderContribution } from '@retikz/extension';

import { RetikzPlotError } from '../../error';
import { PLOT_NAMESPACE } from '../../schemas';
import { lowerPlots } from './lower';
import type { LowerPlotsOptions } from './types';

const LocalLowerOptionKeys = new Set(['layout', 'definitions', 'implementations', 'datasetFieldMaps', 'resolveLabel']);

/** Plot 提供者的运行时参数 */
export type PlotProviderParams = Readonly<{
  /** 按引用名索引的行数据集 */
  datasets: ExternalDatasets;
  /** Plot 编译选项 */
  lowerOptions: LowerPlotsOptions;
}>;

/** Plot Composite provider 的公开完整 key */
export const PlotProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: PLOT_NAMESPACE,
  type: 'plot',
});

/** 合并多个 Plot contribution 的 field map */
const mergeDatasetFieldMaps = (optionSets: Array<LowerPlotsOptions>): LowerPlotsOptions['datasetFieldMaps'] => {
  const merged: NonNullable<LowerPlotsOptions['datasetFieldMaps']> = {};

  for (const options of optionSets) {
    for (const [reference, fieldMap] of Object.entries(options.datasetFieldMaps ?? {})) {
      const current = merged[reference] ?? {};

      for (const [field, path] of Object.entries(fieldMap)) {
        if (Object.hasOwn(current, field) && current[field] !== path) {
          throw new RetikzPlotError(
            `[retikz] Plot provider: datasetFieldMaps["${reference}"].${field} resolves to both "${current[field]}" and "${path}".`,
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
        throw new RetikzPlotError(`[retikz] Plot provider: mark "${markId}" received multiple resolveLabel functions.`);
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
        throw new RetikzPlotError(
          `[retikz] Plot provider: plots in one compile assembly must share lower option "${key}".`,
        );
      }

      shared[key] = value;
    }
  }

  for (const group of ['layout', 'definitions', 'implementations'] as const) {
    const merged: Record<string, unknown> = {};
    for (const options of optionSets) {
      for (const [key, value] of Object.entries(options[group] ?? {})) {
        if (value === undefined || (group === 'layout' && (key === 'width' || key === 'height'))) continue;
        if (Object.hasOwn(merged, key) && !Object.is(merged[key], value)) {
          throw new RetikzPlotError(
            `[retikz] Plot provider: plots in one compile assembly must share lower option "${group}.${key}".`,
          );
        }
        merged[key] = value;
      }
    }
    if (Object.keys(merged).length > 0) shared[group] = merged;
  }

  const datasetFieldMaps = mergeDatasetFieldMaps(optionSets);
  const resolveLabel = mergeResolveLabels(optionSets);

  return {
    ...(shared as LowerPlotsOptions),
    ...(datasetFieldMaps === undefined ? {} : { datasetFieldMaps }),
    ...(resolveLabel === undefined ? {} : { resolveLabel }),
  };
};

/** 合并 Plot 所属参数并物化唯一定义 */
const makePlotDefinition: CoreDependencyProvider<PlotProviderParams>['makeDefinition'] = contributions =>
  lowerPlots(
    mergeExternalDatasets(contributions.map(params => params.datasets)),
    mergeLowerOptions(contributions.map(params => params.lowerOptions)),
  )[0];

/** 创建携带数据集与编译选项的 Plot 提供者 */
export const createPlotProvider = (
  datasets: ExternalDatasets,
  lowerOptions: LowerPlotsOptions = {},
): CoreDependencyProvider<PlotProviderParams> =>
  Object.freeze({
    key: PlotProviderKey,
    dependencies: Object.freeze([SectorShapeProvider.key, ContourShapeProvider.key]),
    params: Object.freeze({ datasets: Object.freeze({ ...datasets }), lowerOptions }),
    makeDefinition: makePlotDefinition,
  });

/** 创建 Plot 及其 Standard Shape 静态依赖的完整 Core provider contribution */
export const createPlotProviderContribution = (
  datasets: ExternalDatasets,
  lowerOptions: LowerPlotsOptions = {},
): CoreProviderContribution => {
  const plotProvider = createPlotProvider(datasets, lowerOptions);
  const ribbonContribution = createRibbonProviderContribution();

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
