import type {
  AnyTransformDefinition,
  DataFieldTypeMap,
  DataView,
  ExternalDatasets,
  ExternalRow,
  TransformContext,
  IRDataTransformDeclaration,
} from '@retikz/data';
import {
  applyFieldResolver,
  applyTransformsToDataView,
  collectFormatFields,
  createDataView,
  DEFAULT_TRANSFORM_CONTEXT,
  normalizeRows,
  resolveFieldPath,
  resolveFieldTypes,
  resolveFormatRegistry,
  resolveRowSelectorRegistry,
  resolveRegressionRegistry,
  resolveStatisticsReducerRegistry,
  resolveTransformRegistry,
  resolveTransformImplementationRegistry,
  resolveStatisticsReducerImplementationRegistry,
  resolveRowSelectorImplementationRegistry,
  resolveRegressionImplementationRegistry,
} from '@retikz/data';

import type { AnyMarkDefinition, AnyPositionAdjustmentDefinition, AnyScaleDefinition } from '../../contract';
import { RetikzPlotError } from '../../error';
import { resolveMarkRegistry, resolvePositionAdjustmentRegistry, resolveScaleRegistry } from '../../providers';
import type { IRPlot, IRPlotMarkOperation } from '../../schemas';
import { collectSourceFields } from '../source-fields';
import type { LowerPlotsOptions } from './types';

/** 对单个mark应用局部transform，返回该mark实际消费的完整DataView */
export const applyMarkTransforms = (
  mark: IRPlotMarkOperation,
  dataView: DataView,
  transformRegistry: ReadonlyMap<string, AnyTransformDefinition>,
  transformContext: TransformContext,
): DataView => {
  const transform = (mark as { transform?: Array<IRDataTransformDeclaration> }).transform;
  if (transform === undefined) return dataView;

  return applyTransformsToDataView(
    dataView,
    transform.map(declaration => declaration.operation),
    { registry: transformRegistry, context: transformContext },
  );
};

/**
 * 校验 fieldMaps 中的数据集与逻辑字段引用。
 * @description 供 lowering 与 locator 共用，保证两条入口采用相同的 fail-loud 契约
 */
export const validateFieldMaps = (
  spec: IRPlot,
  datasets: ExternalDatasets,
  fieldMaps: LowerPlotsOptions['fieldMaps'],
): void => {
  if (fieldMaps === undefined) return;

  for (const ref of Object.keys(fieldMaps)) {
    if (!Object.hasOwn(datasets, ref))
      throw new RetikzPlotError(`lowerPlots: fieldMaps references unknown dataset "${ref}"`);
  }

  if (!Object.hasOwn(fieldMaps, spec.data.reference)) return;

  const fieldMap = fieldMaps[spec.data.reference];
  if (spec.data.model === undefined) {
    throw new RetikzPlotError(
      `lowerPlots: fieldMaps for "${spec.data.reference}" requires data.model (no logical field contract without a model)`,
    );
  }

  const declared = new Set(spec.data.model.map(field => field.name));

  for (const logical of Object.keys(fieldMap)) {
    if (!declared.has(logical)) {
      throw new RetikzPlotError(
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
  spec: IRPlot,
  datasets: ExternalDatasets,
  options: LowerPlotsOptions,
  ingested: Array<ExternalRow>,
): {
  /** 规范 rows 与完整逻辑字段模型 */
  dataView: DataView;
  fieldTypeMap: DataFieldTypeMap;
  normalized: Array<ExternalRow>;
  transformRegistry: Map<string, AnyTransformDefinition>;
  transformContext: TransformContext;
  scaleRegistry: Map<string, AnyScaleDefinition>;
  markRegistry: Map<string, AnyMarkDefinition>;
  positionAdjustmentRegistry: Map<string, AnyPositionAdjustmentDefinition>;
} => {
  validateFieldMaps(spec, datasets, options.fieldMaps);
  const { transformRegistry, transformContext, scaleRegistry, markRegistry, positionAdjustmentRegistry } =
    preparePlotRegistries(options);
  const userSourceFields = collectSourceFields(spec, transformRegistry, markRegistry, transformContext);

  for (const field of spec.data.model ?? []) userSourceFields.add(field.name);
  const baseTypes = resolveFieldTypes(spec.data.model, ingested, userSourceFields);
  const fieldMap =
    options.fieldMaps !== undefined && Object.hasOwn(options.fieldMaps, spec.data.reference)
      ? options.fieldMaps[spec.data.reference]
      : undefined;

  const formatRegistry = resolveFormatRegistry(options.formatDefinitions);
  const { fieldTypeMap: formatTypes, parsers: formatParsers } = collectFormatFields(
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
  const { fieldTypeMap, parsers: resolverParsers } = applyFieldResolver(
    formatTypes,
    userSourceFields,
    spec.data.model,
    spec.data.reference,
    fieldMap,
    trackedResolveField,
  );

  const parsers = new Map([...formatParsers, ...resolverParsers]);
  const normalized = normalizeRows(ingested, fieldTypeMap, fieldMap, parsers);

  for (const field of userSourceFields) {
    const hasUsableObservation = normalized.some(row => {
      const value = resolveFieldPath(row, field);
      return typeof value === 'number' ? Number.isFinite(value) : value !== undefined && value !== null;
    });
    if (hasUsableObservation) fieldTypeEvidence.add(field);
  }

  return {
    dataView: createDataView(
      normalized,
      [...userSourceFields].map(name => {
        const type = fieldTypeEvidence.has(name) ? fieldTypeMap.get(name) : undefined;
        const order = spec.data.model?.find(field => field.name === name)?.order;
        return { name, ...(type === undefined ? {} : { type }), ...(order === undefined ? {} : { order }) };
      }),
    ),
    fieldTypeMap,
    normalized,
    transformRegistry,
    transformContext,
    scaleRegistry,
    markRegistry,
    positionAdjustmentRegistry,
  };
};

/** 为同步 lowering 和异步数据准备建立同一领域注册表 */
export const preparePlotRegistries = (options: LowerPlotsOptions) => {
  const transformRegistry = resolveTransformRegistry(options.transformDefinitions);
  const transformContext: TransformContext = {
    ...DEFAULT_TRANSFORM_CONTEXT,
    regressionRegistry: resolveRegressionRegistry(options.regressionDefinitions),
    statisticsReducerRegistry: resolveStatisticsReducerRegistry(options.statisticsReducerDefinitions),
    rowSelectorRegistry: resolveRowSelectorRegistry(options.rowSelectorDefinitions),
  };
  transformContext.transformImplementationRegistry = resolveTransformImplementationRegistry(
    transformRegistry,
    options.transformImplementations,
  );
  transformContext.statisticsReducerImplementationRegistry = resolveStatisticsReducerImplementationRegistry(
    transformContext.statisticsReducerRegistry,
    options.statisticsReducerImplementations,
  );
  transformContext.rowSelectorImplementationRegistry = resolveRowSelectorImplementationRegistry(
    transformContext.rowSelectorRegistry,
    options.rowSelectorImplementations,
  );
  transformContext.regressionImplementationRegistry = resolveRegressionImplementationRegistry(
    transformContext.regressionRegistry,
    options.regressionImplementations,
  );
  const scaleRegistry = resolveScaleRegistry(options.scaleDefinitions);
  const markRegistry = resolveMarkRegistry(options.markDefinitions);
  const positionAdjustmentRegistry = resolvePositionAdjustmentRegistry(options.positionAdjustmentDefinitions);

  return { transformRegistry, transformContext, scaleRegistry, markRegistry, positionAdjustmentRegistry };
};
