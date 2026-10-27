import type {
  AnyTransformDefinition,
  ApplyTransformsOptions,
  DataFieldTypeMap,
  DataView,
  ExternalDatasets,
  ExternalRow,
  TransformContext,
} from '@retikz/data';
import {
  applyFieldResolver,
  assertFieldOrders,
  resolveFieldOrderRegistry,
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

import type { AnyPositionAdjustmentDefinition, AnyScaleDefinition } from '../../contract';
import { markPositionInputs, positionField } from '../../contract';
import { RetikzPlotError } from '../../error';
import type { AnyMarkDefinition } from '../../providers';
import { MARK_REGISTRY, resolvePositionAdjustmentRegistry, resolveScaleRegistry } from '../../providers';
import type { IRPlot, IRPlotMark } from '../../schemas';
import { collectSourceFields } from '../source-fields';
import type { LowerPlotsOptions } from './types';

/** 对单个mark应用局部transform，返回该mark实际消费的完整DataView */
export const applyMarkTransforms = (
  mark: IRPlotMark,
  dataView: DataView,
  options: ApplyTransformsOptions,
): DataView => {
  const transformDeclarations = mark.transforms;
  if (transformDeclarations === undefined) return dataView;

  return applyTransformsToDataView(
    dataView,
    transformDeclarations.map(declaration => declaration.operation),
    options,
  ).dataView;
};

/**
 * 校验 datasetFieldMaps 中的数据集与逻辑字段引用
 * @description 供 lowering 与 locator 共用，保证两条入口采用相同的 fail-loud 契约
 */
const assertDatasetFieldMaps = (
  spec: IRPlot,
  datasets: ExternalDatasets,
  datasetFieldMaps: LowerPlotsOptions['datasetFieldMaps'],
): void => {
  if (datasetFieldMaps === undefined) return;

  for (const ref of Object.keys(datasetFieldMaps)) {
    if (!Object.hasOwn(datasets, ref))
      throw new RetikzPlotError(`lowerPlots: datasetFieldMaps references unknown dataset "${ref}"`);
  }

  if (!Object.hasOwn(datasetFieldMaps, spec.data.reference)) return;

  const fieldMap = datasetFieldMaps[spec.data.reference];
  if (spec.data.model === undefined) {
    throw new RetikzPlotError(
      `lowerPlots: datasetFieldMaps for "${spec.data.reference}" requires data.model (no logical field contract without a model)`,
    );
  }

  const declared = new Set(spec.data.model.map(field => field.name));

  for (const logical of Object.keys(fieldMap)) {
    if (!declared.has(logical)) {
      throw new RetikzPlotError(
        `lowerPlots: datasetFieldMaps["${spec.data.reference}"] maps unknown logical field "${logical}" (not in data.model)`,
      );
    }
  }
};

/**
 * 准备绑定数据、字段类型及 lowering 所需 registry
 * @description 先校验 datasetFieldMaps，再解析 model / format / resolver 并恒归一化；transform 由调用方在本函数之后执行
 */
export const prepareRows = (
  spec: IRPlot,
  datasets: ExternalDatasets,
  options: LowerPlotsOptions,
  ingested: Array<ExternalRow>,
  registries = preparePlotRegistries(options),
): {
  /** 规范 rows 与完整逻辑字段模型 */
  dataView: DataView;
  fieldTypeMap: DataFieldTypeMap;
  normalized: Array<ExternalRow>;
  transformRegistry: Map<string, AnyTransformDefinition>;
  transformContext: TransformContext;
  scaleRegistry: Map<string, AnyScaleDefinition>;
  markRegistry: Readonly<Record<IRPlotMark['type'], AnyMarkDefinition>>;
  positionAdjustmentRegistry: Map<string, AnyPositionAdjustmentDefinition>;
  fieldOrderRegistry: ReturnType<typeof resolveFieldOrderRegistry>;
} => {
  assertDatasetFieldMaps(spec, datasets, options.datasetFieldMaps);
  assertFieldOrders(spec.data.model, registries.fieldOrderRegistry);
  const {
    transformRegistry,
    transformContext,
    scaleRegistry,
    markRegistry,
    positionAdjustmentRegistry,
    fieldOrderRegistry,
  } = registries;
  const userSourceFields = collectSourceFields(spec, transformRegistry, markRegistry, transformContext);

  for (const field of spec.data.model ?? []) userSourceFields.add(field.name);
  const baseTypes = resolveFieldTypes(spec.data.model, ingested, userSourceFields);
  const fieldMap =
    options.datasetFieldMaps !== undefined && Object.hasOwn(options.datasetFieldMaps, spec.data.reference)
      ? options.datasetFieldMaps[spec.data.reference]
      : undefined;

  const formatRegistry = resolveFormatRegistry(options.definitions?.formats);
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
  const positionFields = new Set<string>();
  for (const mark of spec.marks)
    for (const position of markPositionInputs(mark))
      for (const input of Object.values(position)) {
        const field = positionField(input);
        if (field !== undefined) positionFields.add(field);
      }

  for (const field of userSourceFields) {
    const physicalPath = fieldMap?.[field] ?? field;
    if (
      ingested.length > 0 &&
      positionFields.has(field) &&
      !spec.data.model?.some(declaration => declaration.name === field) &&
      !parsers.has(field) &&
      !ingested.some(row => Object.hasOwn(row, physicalPath) || resolveFieldPath(row, physicalPath) !== undefined)
    ) {
      throw new RetikzPlotError(`Plot references source field "${field}" absent from dataset "${spec.data.reference}"`);
    }
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
    fieldOrderRegistry,
  };
};

/** 为同步 lowering 和异步数据准备建立同一领域注册表 */
export const preparePlotRegistries = (options: LowerPlotsOptions) => {
  const transformRegistry = resolveTransformRegistry(options.definitions?.transforms);
  const transformContext: TransformContext = {
    ...DEFAULT_TRANSFORM_CONTEXT,
    regressionRegistry: resolveRegressionRegistry(options.definitions?.regressions),
    statisticsReducerRegistry: resolveStatisticsReducerRegistry(options.definitions?.statisticsReducers),
    rowSelectorRegistry: resolveRowSelectorRegistry(options.definitions?.rowSelectors),
  };
  transformContext.transformImplementationRegistry = resolveTransformImplementationRegistry(
    transformRegistry,
    options.implementations?.transforms,
  );
  transformContext.statisticsReducerImplementationRegistry = resolveStatisticsReducerImplementationRegistry(
    transformContext.statisticsReducerRegistry,
    options.implementations?.statisticsReducers,
  );
  transformContext.rowSelectorImplementationRegistry = resolveRowSelectorImplementationRegistry(
    transformContext.rowSelectorRegistry,
    options.implementations?.rowSelectors,
  );
  transformContext.regressionImplementationRegistry = resolveRegressionImplementationRegistry(
    transformContext.regressionRegistry,
    options.implementations?.regressions,
  );
  const scaleRegistry = resolveScaleRegistry(options.definitions?.scales);
  const markRegistry = MARK_REGISTRY;
  const positionAdjustmentRegistry = resolvePositionAdjustmentRegistry(options.definitions?.positionAdjustments);

  return {
    transformRegistry,
    transformContext,
    scaleRegistry,
    markRegistry,
    positionAdjustmentRegistry,
    fieldOrderRegistry: resolveFieldOrderRegistry(options.definitions?.fieldOrders),
  };
};
