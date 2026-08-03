import type {
  AnyTransformDefinition,
  DataFieldTypeMap,
  ExternalDatasets,
  ExternalRow,
  TransformContext,
} from '@retikz/data';

import {
  applyFieldResolver,
  applyTransforms,
  collectFormatFields,
  DEFAULT_TRANSFORM_CONTEXT,
  normalizeRows,
  resolveFieldPath,
  resolveFieldTypes,
  resolveFormatRegistry,
  resolveRowSelectorRegistry,
  resolveStatisticsReducerRegistry,
} from '@retikz/data';

import type { AnyMarkDefinition, AnyScaleDefinition } from '../../contract';
import type { IRPlotMarkOperation, IRPlotSpec, IRPlotTransform } from '../../schemas';
import type { LowerPlotsOptions } from './types';

import { resolveMarkRegistry, resolvePlotTransformRegistry, resolveScaleRegistry } from '../../providers';
import { collectSourceFields } from '../source-fields';

/** 对单个 mark 应用局部 transform，返回该 mark 实际消费的数据行 */
export const resolveMarkRows = (
  mark: IRPlotMarkOperation,
  rows: Array<ExternalRow>,
  transformRegistry: ReadonlyMap<string, AnyTransformDefinition>,
  transformContext: TransformContext,
): Array<ExternalRow> => {
  const transform = (mark as { transform?: Array<IRPlotTransform> }).transform;
  if (transform === undefined) return rows;
  return applyTransforms(rows, transform, transformRegistry, transformContext);
};

/**
 * 校验 fieldMaps 中的数据集与逻辑字段引用。
 * @description 供 lowering 与 locator 共用，保证两条入口采用相同的 fail-loud 契约
 */
export const validateFieldMaps = (
  spec: IRPlotSpec,
  datasets: ExternalDatasets,
  fieldMaps: LowerPlotsOptions['fieldMaps'],
): void => {
  if (fieldMaps === undefined) return;
  for (const ref of Object.keys(fieldMaps)) {
    if (!Object.hasOwn(datasets, ref)) throw new Error(`lowerPlots: fieldMaps references unknown dataset "${ref}"`);
  }
  if (!Object.hasOwn(fieldMaps, spec.data.reference)) return;
  const fieldMap = fieldMaps[spec.data.reference];
  if (spec.data.model === undefined) {
    throw new Error(
      `lowerPlots: fieldMaps for "${spec.data.reference}" requires data.model (no logical field contract without a model)`,
    );
  }
  const declared = new Set(spec.data.model.map(field => field.name));
  for (const logical of Object.keys(fieldMap)) {
    if (!declared.has(logical)) {
      throw new Error(
        `lowerPlots: fieldMaps["${spec.data.reference}"] maps unknown logical field "${logical}" (not in data.model)`,
      );
    }
  }
};

/**
 * 准备绑定数据、字段类型及 lowering 所需 registry。
 * @description 先校验 fieldMaps，再解析 model / format / resolver 并恒归一化；transform 由调用方在本函数之后执行
 */
export const prepareRows = (
  spec: IRPlotSpec,
  datasets: ExternalDatasets,
  options: LowerPlotsOptions,
  ingested: Array<ExternalRow>,
): {
  fieldTypes: DataFieldTypeMap;
  /** 最终字段类型具有 model、format、resolver 或有效观测依据的字段 */
  fieldTypeEvidence: ReadonlySet<string>;
  normalized: Array<ExternalRow>;
  transformRegistry: Map<string, AnyTransformDefinition>;
  transformContext: TransformContext;
  scaleRegistry: Map<string, AnyScaleDefinition>;
  markRegistry: Map<string, AnyMarkDefinition>;
} => {
  validateFieldMaps(spec, datasets, options.fieldMaps);
  const transformRegistry = resolvePlotTransformRegistry(options.transformDefinitions);
  const transformContext: TransformContext = {
    ...DEFAULT_TRANSFORM_CONTEXT,
    statisticsReducerRegistry: resolveStatisticsReducerRegistry(options.statisticsReducerDefinitions),
    rowSelectorRegistry: resolveRowSelectorRegistry(options.rowSelectorDefinitions),
  };
  const scaleRegistry = resolveScaleRegistry(options.scaleDefinitions);
  const markRegistry = resolveMarkRegistry(options.markDefinitions);
  const userSourceFields = collectSourceFields(spec, transformRegistry, markRegistry, transformContext);
  const baseTypes = resolveFieldTypes(spec.data.model, ingested, userSourceFields);
  const fieldMap =
    options.fieldMaps !== undefined && Object.hasOwn(options.fieldMaps, spec.data.reference)
      ? options.fieldMaps[spec.data.reference]
      : undefined;
  const formatRegistry = resolveFormatRegistry(options.formatDefinitions);
  const { fieldTypes: formatTypes, parsers: formatParsers } = collectFormatFields(
    spec.data.model,
    baseTypes,
    userSourceFields,
    formatRegistry,
  );
  const fieldTypeEvidence = new Set(
    (spec.data.model ?? [])
      .filter(field => userSourceFields.has(field.name) && (field.type !== undefined || field.format !== undefined))
      .map(field => field.name),
  );
  const resolveField = options.resolveField;
  const trackedResolveField: LowerPlotsOptions['resolveField'] =
    resolveField === undefined
      ? undefined
      : (field, context) => {
          const resolution = resolveField(field, context);
          if (resolution?.type !== undefined) fieldTypeEvidence.add(field);
          return resolution;
        };
  const { fieldTypes, parsers: resolverParsers } = applyFieldResolver(
    formatTypes,
    userSourceFields,
    spec.data.model,
    spec.data.reference,
    fieldMap,
    trackedResolveField,
  );
  const parsers = new Map([...formatParsers, ...resolverParsers]);
  const normalized = normalizeRows(ingested, fieldTypes, fieldMap, parsers);
  for (const field of userSourceFields) {
    const hasUsableObservation = normalized.some(row => {
      const value = resolveFieldPath(row, field);
      return typeof value === 'number' ? Number.isFinite(value) : value !== undefined && value !== null;
    });
    if (hasUsableObservation) fieldTypeEvidence.add(field);
  }
  return {
    fieldTypes,
    fieldTypeEvidence,
    normalized,
    transformRegistry,
    transformContext,
    scaleRegistry,
    markRegistry,
  };
};
