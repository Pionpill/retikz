import { createReadonlyMap } from '@retikz/foundation';

import { defineTransformImplementation } from '../../contract';
import type { AnySynchronousTransformImplementation } from '../../contract';
import type { AnyTransformDefinition, DataTransformOutputDescriptor } from '../../contract';
import {
  DataTransformBindingClass,
  DataTransformFieldEffect,
  DataTransformPhase,
  defineTransform,
  extractTransformKind,
} from '../../contract';
import type { AnyTransformImplementation, TransformSemanticContext } from '../../contract';
import type { RegressionModel, RegressionPair } from '../../contract';
import { RetikzDataError } from '../../error';
import type { IRDataBinTransform } from '../../schemas';
import {
  AnnotateParamsSchema,
  SelectParamsSchema,
  SortParamsSchema,
  SummarizeParamsSchema,
  DataFieldType,
  BinParamsSchema,
  DensityParamsSchema,
  DeriveIntervalParamsSchema,
  JitterAxis,
  JitterParamsSchema,
  NormalizeParamsSchema,
  RelateParamsSchema,
  SmoothParamsSchema,
  StackParamsSchema,
} from '../../schemas';
import { resolveRegressionDependency } from '../regression';
import { freezeDefinitions, resolveImplementationRegistry } from '../shared';
import {
  reducerInputFields,
  reducerOutputDescriptors,
  selectorInputFields,
  resolveReducerDependency,
  resolveSelectorDependency,
} from '../statistics';
import { runTransformComputationAsync } from './computation';
import { applyDensity, densityInputFields } from './density';
import {
  applyAnnotate,
  applySelect,
  applySummarize,
  applyBin,
  applyRelate,
  binMetricOperations,
  binOutputFields,
  relationEndpointOutputField,
  validateReducerMetrics,
} from './group';
import { computeAnnotate, computeBin, computeRelate, computeSelect, computeSummarize } from './group';
import type { GroupComputation } from './group';
import {
  applySort,
  applyDeriveInterval,
  applyJitter,
  applyNormalize,
  applyStack,
  DEFAULT_DERIVE_END_FIELD,
  DEFAULT_DERIVE_START_FIELD,
  DEFAULT_END_FIELD,
  DEFAULT_JITTER_X_FIELD,
  DEFAULT_JITTER_Y_FIELD,
  DEFAULT_START_FIELD,
} from './row';
import { applySmooth, smoothInputFields } from './smooth';
import { computeSmooth } from './smooth';

/** 异步驱动复用同一组算法与 Definition；不按返回值探测或重跑计算 */
export const createAsyncBuiltinTransformImplementations = (
  computation: GroupComputation,
  regression: {
    fit: (pairs: Array<RegressionPair>) => RegressionModel | Promise<RegressionModel>;
    validateExtent: (extent: [number, number]) => void;
  },
): ReadonlyArray<AnyTransformImplementation> => [
  sortTransformImplementation,
  defineTransformImplementation({
    definition: summarizeTransformDefinition,
    apply: (rows, operation, context) =>
      runTransformComputationAsync(computeSummarize(rows, operation, context, computation)),
  }),
  defineTransformImplementation({
    definition: selectTransformDefinition,
    apply: (rows, operation, context) =>
      runTransformComputationAsync(computeSelect(rows, operation, context, computation)),
  }),
  defineTransformImplementation({
    definition: annotateTransformDefinition,
    apply: (rows, operation, context) =>
      runTransformComputationAsync(computeAnnotate(rows, operation, context, computation)),
  }),
  stackTransformImplementation,
  defineTransformImplementation({
    definition: binTransformDefinition,
    apply: (rows, operation, context) =>
      runTransformComputationAsync(computeBin(rows, operation, context, computation)),
  }),
  normalizeTransformImplementation,
  deriveIntervalTransformImplementation,
  defineTransformImplementation({
    definition: relateTransformDefinition,
    apply: (rows, operation, context) =>
      runTransformComputationAsync(computeRelate(rows, operation, context, computation)),
  }),
  jitterTransformImplementation,
  densityTransformImplementation,
  defineTransformImplementation({
    definition: smoothTransformDefinition,
    apply: (rows, operation, context) =>
      runTransformComputationAsync(computeSmooth(rows, operation, context, regression)),
  }),
];

/** 内置 sort transform definition；读取排序字段并稳定重排输入行 */
const sortTransformDefinition = defineTransform({
  kind: 'sort',
  paramsSchema: SortParamsSchema,
  inputFields: operation => [operation.params.field],
  outputModel: () => ({ kind: 'preserve', outputs: [] }),
  schedule: {
    phase: DataTransformPhase.RowOrder,
    bindingClass: DataTransformBindingClass.Order,
    fieldEffect: DataTransformFieldEffect.Reorder,
  },
});

/** 与 sortTransformDefinition 共享语义的内置计算 */
const sortTransformImplementation = defineTransformImplementation({
  definition: sortTransformDefinition,
  apply: (rows, operation) => applySort(rows, operation),
});

/** 内置 summarize transform definition；声明 groupBy 与 reducer 输入字段，并输出 reducer 派生字段 */
const summarizeTransformDefinition = defineTransform({
  kind: 'summarize',
  paramsSchema: SummarizeParamsSchema,
  validate: (operation, context) =>
    validateReducerMetrics(operation.params.metrics, context, {
      reservedFields: new Set(operation.params.groupBy ?? []),
      reservedLabel: 'a groupBy field',
    }),
  dependencies: (operation, context) =>
    operation.params.metrics.map(metric => resolveReducerDependency(metric, context.statisticsReducerRegistry)),
  inputFields: (operation, context) => [
    ...(operation.params.groupBy ?? []),
    ...operation.params.metrics.flatMap(metric => reducerInputFields(metric, context.statisticsReducerRegistry)),
  ],
  outputModel: (operation, context) => {
    const outputs = operation.params.metrics.flatMap(metric =>
      reducerOutputDescriptors(metric, context.statisticsReducerRegistry),
    );
    return {
      kind: 'replace',
      fields: [
        ...(operation.params.groupBy ?? []).map(field => ({ field, type: { from: field } as const })),
        ...outputs,
      ],
    };
  },
});

/** 与 summarizeTransformDefinition 共享语义的内置计算 */
const summarizeTransformImplementation = defineTransformImplementation({
  definition: summarizeTransformDefinition,
  apply: (rows, operation, context) => applySummarize(rows, operation, context),
});

/** 内置 select transform definition；声明 groupBy 与 selector 输入字段，并可输出 rankAs 字段 */
const selectTransformDefinition = defineTransform({
  kind: 'select',
  paramsSchema: SelectParamsSchema,
  dependencies: (operation, context) => [
    resolveSelectorDependency(operation.params.selector, context.rowSelectorRegistry),
  ],
  inputFields: (operation, context) => [
    ...(operation.params.groupBy ?? []),
    ...selectorInputFields(operation.params.selector, context.rowSelectorRegistry),
  ],
  outputModel: operation => ({
    kind: 'preserve',
    outputs:
      operation.params.rankAs === undefined ? [] : [{ field: operation.params.rankAs, type: DataFieldType.Continuous }],
  }),
});

/** 与 selectTransformDefinition 共享语义的内置计算 */
const selectTransformImplementation = defineTransformImplementation({
  definition: selectTransformDefinition,
  apply: (rows, operation, context) => applySelect(rows, operation, context),
});

/** 内置 annotate transform definition；声明 groupBy、reducer、selector 输入字段，并输出全部回填字段 */
const annotateTransformDefinition = defineTransform({
  kind: 'annotate',
  paramsSchema: AnnotateParamsSchema,
  validate: (operation, context) =>
    validateReducerMetrics(operation.params.metrics ?? [], context, {
      reservedFields: new Set((operation.params.selectors ?? []).map(selector => selector.as)),
      reservedLabel: 'an annotate selector output field',
    }),
  dependencies: (operation, context) => [
    ...(operation.params.metrics ?? []).map(metric =>
      resolveReducerDependency(metric, context.statisticsReducerRegistry),
    ),
    ...(operation.params.selectors ?? []).map(annotation =>
      resolveSelectorDependency(annotation.selector, context.rowSelectorRegistry),
    ),
  ],
  inputFields: (operation, context) => [
    ...(operation.params.groupBy ?? []),
    ...(operation.params.metrics ?? []).flatMap(metric =>
      reducerInputFields(metric, context.statisticsReducerRegistry),
    ),
    ...(operation.params.selectors ?? []).flatMap(selector =>
      selectorInputFields(selector.selector, context.rowSelectorRegistry),
    ),
  ],
  outputModel: (operation, context) => ({
    kind: 'preserve',
    outputs: [
      ...(operation.params.metrics ?? []).flatMap(metric =>
        reducerOutputDescriptors(metric, context.statisticsReducerRegistry),
      ),
      ...(operation.params.selectors ?? []).map(annotation => {
        const selector = annotation.selector;
        return {
          field: annotation.as,
          type: 'by' in selector ? ({ from: selector.by } as const) : DataFieldType.Continuous,
        };
      }),
    ],
  }),
});

/** 与 annotateTransformDefinition 共享语义的内置计算 */
const annotateTransformImplementation = defineTransformImplementation({
  definition: annotateTransformDefinition,
  apply: (rows, operation, context) => applyAnnotate(rows, operation, context),
});

const stackTransformDefinition = defineTransform({
  kind: 'stack',
  paramsSchema: StackParamsSchema,
  inputFields: operation => [
    operation.params.y,
    ...(operation.params.x !== undefined ? [operation.params.x] : []),
    ...(operation.params.groupBy !== undefined ? [operation.params.groupBy] : []),
  ],
  outputModel: operation => ({
    kind: 'preserve',
    outputs: [
      { field: operation.params.startField ?? DEFAULT_START_FIELD, type: DataFieldType.Continuous },
      { field: operation.params.endField ?? DEFAULT_END_FIELD, type: DataFieldType.Continuous },
    ],
  }),
  schedule: {
    phase: DataTransformPhase.CumulativeDerive,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Preserve,
  },
});

/** 与 stackTransformDefinition 共享语义的内置计算 */
const stackTransformImplementation = defineTransformImplementation({
  definition: stackTransformDefinition,
  apply: (rows, operation) => applyStack(rows, operation),
});

const binOutputModel = (operation: IRDataBinTransform, context: TransformSemanticContext) => {
  const metrics = binMetricOperations(operation);
  const metricDescriptors = metrics.flatMap(metric =>
    reducerOutputDescriptors(metric, context.statisticsReducerRegistry),
  );
  const output = binOutputFields(operation);
  const fields: Array<DataTransformOutputDescriptor> = [
    { field: operation.params.field, type: { from: operation.params.field } },
    { field: output.startField, type: DataFieldType.Continuous },
    { field: output.endField, type: DataFieldType.Continuous },
    ...metricDescriptors,
  ];

  return { kind: 'replace' as const, fields };
};

const binTransformDefinition = defineTransform({
  kind: 'bin',
  paramsSchema: BinParamsSchema,
  dependencies: (operation, context) =>
    binMetricOperations(operation).map(metric => resolveReducerDependency(metric, context.statisticsReducerRegistry)),
  inputFields: (operation, context) => [
    operation.params.field,
    ...binMetricOperations(operation).flatMap(metric => reducerInputFields(metric, context.statisticsReducerRegistry)),
  ],
  outputModel: binOutputModel,
  schedule: {
    phase: DataTransformPhase.RowShape,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Replace,
  },
});

/** 与 binTransformDefinition 共享语义的内置计算 */
const binTransformImplementation = defineTransformImplementation({
  definition: binTransformDefinition,
  apply: (rows, operation, context) => applyBin(rows, operation, context),
});

const normalizeTransformDefinition = defineTransform({
  kind: 'normalize',
  paramsSchema: NormalizeParamsSchema,
  inputFields: operation => [operation.params.field, ...(operation.params.groupBy ?? [])],
  outputModel: operation => ({
    kind: 'preserve',
    outputs: [{ field: operation.params.as ?? operation.params.field, type: DataFieldType.Continuous }],
  }),
  schedule: {
    phase: DataTransformPhase.FieldDerive,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Preserve,
  },
});

/** 与 normalizeTransformDefinition 共享语义的内置计算 */
const normalizeTransformImplementation = defineTransformImplementation({
  definition: normalizeTransformDefinition,
  apply: (rows, operation) => applyNormalize(rows, operation),
});

const deriveIntervalTransformDefinition = defineTransform({
  kind: 'derive-interval',
  paramsSchema: DeriveIntervalParamsSchema,
  inputFields: operation =>
    [operation.params.from, operation.params.startFrom, operation.params.endFrom].filter(
      (field): field is string => field !== undefined,
    ),
  outputModel: operation => ({
    kind: 'preserve',
    outputs: [
      { field: operation.params.startField ?? DEFAULT_DERIVE_START_FIELD, type: DataFieldType.Continuous },
      { field: operation.params.endField ?? DEFAULT_DERIVE_END_FIELD, type: DataFieldType.Continuous },
    ],
  }),
  schedule: {
    phase: DataTransformPhase.CumulativeDerive,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Preserve,
  },
});

/** 与 deriveIntervalTransformDefinition 共享语义的内置计算 */
const deriveIntervalTransformImplementation = defineTransformImplementation({
  definition: deriveIntervalTransformDefinition,
  apply: (rows, operation) => applyDeriveInterval(rows, operation),
});

const relateTransformDefinition = defineTransform({
  kind: 'relate',
  paramsSchema: RelateParamsSchema,
  dependencies: (operation, context) => [
    resolveSelectorDependency(operation.params.source.selector, context.rowSelectorRegistry),
    resolveSelectorDependency(operation.params.target.selector, context.rowSelectorRegistry),
  ],
  inputFields: (operation, context) => [
    ...(operation.params.groupBy ?? []),
    ...selectorInputFields(operation.params.source.selector, context.rowSelectorRegistry),
    ...selectorInputFields(operation.params.target.selector, context.rowSelectorRegistry),
    ...Object.values(operation.params.source.fields),
    ...Object.values(operation.params.target.fields),
    ...(operation.params.measures ?? []).map(measure => measure.field),
  ],
  outputModel: operation => ({
    kind: 'replace',
    fields: [
      ...(operation.params.groupBy ?? []).map(field => ({ field, type: { from: field } }) as const),
      ...Object.entries(operation.params.source.fields).map(([field, sourceField]) => ({
        field: relationEndpointOutputField('source', field),
        type: { from: sourceField },
      })),
      ...Object.entries(operation.params.target.fields).map(([field, sourceField]) => ({
        field: relationEndpointOutputField('target', field),
        type: { from: sourceField },
      })),
      ...(operation.params.measures ?? []).flatMap(measure => [
        { field: measure.as, type: DataFieldType.Continuous } as const,
        ...(measure.labelAs !== undefined
          ? [{ field: measure.labelAs, type: DataFieldType.Categorical } as const]
          : []),
      ]),
    ],
  }),
});

/** 与 relateTransformDefinition 共享语义的内置计算 */
const relateTransformImplementation = defineTransformImplementation({
  definition: relateTransformDefinition,
  apply: (rows, operation, context) => applyRelate(rows, operation, context),
});

const jitterTransformDefinition = defineTransform({
  kind: 'jitter',
  paramsSchema: JitterParamsSchema,
  inputFields: operation => {
    const axis = operation.params.axis ?? JitterAxis.X;
    return [
      axis === JitterAxis.X || axis === JitterAxis.Both
        ? (operation.params.xField ?? DEFAULT_JITTER_X_FIELD)
        : undefined,
      axis === JitterAxis.Y || axis === JitterAxis.Both
        ? (operation.params.yField ?? DEFAULT_JITTER_Y_FIELD)
        : undefined,
    ].filter((field): field is string => field !== undefined);
  },
  outputModel: operation => {
    const axis = operation.params.axis ?? JitterAxis.X;
    const fields = [
      axis === JitterAxis.X || axis === JitterAxis.Both
        ? (operation.params.xField ?? DEFAULT_JITTER_X_FIELD)
        : undefined,
      axis === JitterAxis.Y || axis === JitterAxis.Both
        ? (operation.params.yField ?? DEFAULT_JITTER_Y_FIELD)
        : undefined,
    ].filter((field): field is string => field !== undefined);

    return {
      kind: 'preserve',
      outputs: fields.map(field => ({ field, type: { from: field } })),
    };
  },
  schedule: {
    phase: DataTransformPhase.FieldAdjust,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Preserve,
  },
});

/** 与 jitterTransformDefinition 共享语义的内置计算 */
const jitterTransformImplementation = defineTransformImplementation({
  definition: jitterTransformDefinition,
  apply: (rows, operation) => applyJitter(rows, operation),
});

const densityTransformDefinition = defineTransform({
  kind: 'density',
  paramsSchema: DensityParamsSchema,
  inputFields: operation => densityInputFields(operation),
  outputModel: operation => ({
    kind: 'replace',
    fields: [
      ...(operation.params.groupBy ?? []).map(field => ({ field, type: { from: field } }) as const),
      { field: operation.params.xAs, type: DataFieldType.Continuous },
      { field: operation.params.densityAs, type: DataFieldType.Continuous },
    ],
  }),
});

/** 与 densityTransformDefinition 共享语义的内置计算 */
const densityTransformImplementation = defineTransformImplementation({
  definition: densityTransformDefinition,
  apply: (rows, operation, context) => applyDensity(rows, operation, context),
});

const smoothTransformDefinition = defineTransform({
  kind: 'smooth',
  paramsSchema: SmoothParamsSchema,
  dependencies: (operation, context) => [
    resolveRegressionDependency(operation.params.method ?? { kind: 'linear' }, context.regressionRegistry),
  ],
  inputFields: operation => smoothInputFields(operation),
  outputModel: operation => ({
    kind: 'replace',
    fields: [
      ...(operation.params.groupBy ?? []).map(field => ({ field, type: { from: field } }) as const),
      { field: operation.params.xAs, type: DataFieldType.Continuous },
      { field: operation.params.yAs, type: DataFieldType.Continuous },
    ],
  }),
});

/** 与 smoothTransformDefinition 共享语义的内置计算 */
const smoothTransformImplementation = defineTransformImplementation({
  definition: smoothTransformDefinition,
  apply: (rows, operation, context) => applySmooth(rows, operation, context),
});

/** 内置 transform definition 列表；内置 transform 与自定义 transform 共享同一 registry 分派流程 */
export const BUILTIN_TRANSFORMS: ReadonlyArray<AnyTransformDefinition> = freezeDefinitions([
  sortTransformDefinition,
  summarizeTransformDefinition,
  selectTransformDefinition,
  annotateTransformDefinition,
  stackTransformDefinition,
  binTransformDefinition,
  normalizeTransformDefinition,
  deriveIntervalTransformDefinition,
  relateTransformDefinition,
  jitterTransformDefinition,
  densityTransformDefinition,
  smoothTransformDefinition,
]);

/** 默认 transform registry 的私有稳定索引；公开只读视图与每次 resolver 副本均从此生成 */
const BUILTIN_TRANSFORM_REGISTRY = new Map(
  BUILTIN_TRANSFORMS.map(def => [extractTransformKind(def.schema), def] as const),
);

/**
 * 按 kind 索引的内置 transform definition
 * @description 主要供诊断与测试确认内置覆盖；自定义 definition 不写入此表，而是在每次 lowering 时合并
 */
export const BUILTIN_TRANSFORM_DEFINITIONS_BY_KIND: ReadonlyMap<string, AnyTransformDefinition> =
  createReadonlyMap(BUILTIN_TRANSFORM_REGISTRY);

/**
 * 解析 transform registry
 * @description 内置 transform 总是先注册；用户自定义 definition 不能覆盖内置 kind，也不能彼此重复
 */
export const resolveTransformRegistry = (
  custom?: ReadonlyArray<AnyTransformDefinition>,
): Map<string, AnyTransformDefinition> => {
  const registry = new Map(BUILTIN_TRANSFORM_REGISTRY);

  for (const def of custom ?? []) {
    const kind = extractTransformKind(def.schema);
    if (registry.has(kind)) {
      throw new RetikzDataError(`data: duplicate transform registration: "${kind}"`);
    }

    registry.set(kind, def);
  }

  return registry;
};

/** 内置同步计算集合；与语义 registry 分离 */
export const BUILTIN_TRANSFORM_IMPLEMENTATIONS: ReadonlyArray<AnySynchronousTransformImplementation> =
  freezeDefinitions([
    sortTransformImplementation,
    summarizeTransformImplementation,
    selectTransformImplementation,
    annotateTransformImplementation,
    stackTransformImplementation,
    binTransformImplementation,
    normalizeTransformImplementation,
    deriveIntervalTransformImplementation,
    relateTransformImplementation,
    jitterTransformImplementation,
    densityTransformImplementation,
    smoothTransformImplementation,
  ]);

/**
 * 独立计算 registry；内置和自定义引用同一语义身份
 * @template TImplementation 自定义变换实现类型，默认限定同步数据行数组结果
 */
export const resolveTransformImplementationRegistry = <
  TImplementation extends AnyTransformImplementation = AnySynchronousTransformImplementation,
>(
  definitions: ReadonlyMap<string, AnyTransformDefinition> = resolveTransformRegistry(),
  custom: ReadonlyArray<TImplementation> = [],
): Map<string, TImplementation | AnySynchronousTransformImplementation> =>
  resolveImplementationRegistry(definitions, [...BUILTIN_TRANSFORM_IMPLEMENTATIONS, ...custom], extractTransformKind);
