import { createReadonlyMap } from '@retikz/foundation';

import type { AnyTransformDefinition, DataTransformOutputDescriptor, TransformContext } from '../../contract';
import {
  DataTransformBindingClass,
  DataTransformFieldEffect,
  DataTransformPhase,
  defineTransform,
  extractTransformKind,
} from '../../contract';
import { RetikzDataError } from '../../error';
import type {
  IRDataAnnotateTransform,
  IRDataSelectTransform,
  IRDataSortTransform,
  IRDataSummarizeTransform,
  IRDataBinTransform,
  IRDataDensityTransform,
  IRDataDeriveIntervalTransform,
  IRDataJitterTransform,
  IRDataNormalizeTransform,
  IRDataRelateTransform,
  IRDataSmoothTransform,
  IRDataStackTransform,
} from '../../schemas';
import {
  AnnotateTransformSchema,
  SelectTransformSchema,
  SortTransformSchema,
  SummarizeTransformSchema,
  DataFieldType,
  BinTransformSchema,
  DensityTransformSchema,
  DeriveIntervalTransformSchema,
  JitterAxis,
  JitterTransformSchema,
  NormalizeTransformSchema,
  RelateTransformSchema,
  SmoothTransformSchema,
  StackTransformSchema,
} from '../../schemas';
import { freezeDefinitions } from '../shared';
import { reducerInputFields, reducerOutputDescriptors, reducerOutputFields, selectorInputFields } from '../statistics';
import { applyDensity, densityInputFields, densityOutputFields } from './density';
import {
  applyAnnotate,
  applySelect,
  applySummarize,
  applyBin,
  applyRelate,
  binMetricOperations,
  binOutputFields,
  relationEndpointOutputField,
} from './group';
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
import { applySmooth, smoothInputFields, smoothOutputFields } from './smooth';
/** 内置 sort transform definition；读取排序字段并稳定重排输入行 */
const sortTransformDefinition = defineTransform<IRDataSortTransform>({
  schema: SortTransformSchema,
  inputFields: operation => [operation.field],
  outputModel: () => ({ kind: 'preserve', outputs: [] }),
  schedule: {
    phase: DataTransformPhase.RowOrder,
    bindingClass: DataTransformBindingClass.Order,
    fieldEffect: DataTransformFieldEffect.Reorder,
  },
  apply: (rows, operation) => applySort(rows, operation),
});

/** 内置 summarize transform definition；声明 groupBy 与 reducer 输入字段，并输出 reducer 派生字段 */
const summarizeTransformDefinition = defineTransform<IRDataSummarizeTransform>({
  schema: SummarizeTransformSchema,
  inputFields: (operation, context) => [
    ...(operation.groupBy ?? []),
    ...operation.metrics.flatMap(metric => reducerInputFields(metric, context.statisticsReducerRegistry)),
  ],
  outputFields: (operation, context) =>
    operation.metrics.flatMap(metric => reducerOutputFields(metric, context.statisticsReducerRegistry)),
  outputModel: (operation, context) => {
    const outputs = operation.metrics.flatMap(metric =>
      reducerOutputDescriptors(metric, context.statisticsReducerRegistry),
    );
    const outputFields = operation.metrics.flatMap(metric =>
      reducerOutputFields(metric, context.statisticsReducerRegistry),
    );
    if (outputs.length !== outputFields.length) return undefined;
    return {
      kind: 'replace',
      fields: [...(operation.groupBy ?? []).map(field => ({ field, type: { from: field } as const })), ...outputs],
    };
  },
  apply: (rows, operation, context) => applySummarize(rows, operation, context),
});

/** 内置 select transform definition；声明 groupBy 与 selector 输入字段，并可输出 rankAs 字段 */
const selectTransformDefinition = defineTransform<IRDataSelectTransform>({
  schema: SelectTransformSchema,
  inputFields: (operation, context) => [
    ...(operation.groupBy ?? []),
    ...selectorInputFields(operation.selector, context.rowSelectorRegistry),
  ],
  outputFields: operation => (operation.rankAs !== undefined ? [operation.rankAs] : []),
  outputModel: operation => ({
    kind: 'preserve',
    outputs: operation.rankAs === undefined ? [] : [{ field: operation.rankAs, type: DataFieldType.Continuous }],
  }),
  apply: (rows, operation, context) => applySelect(rows, operation, context),
});

/** 内置 annotate transform definition；声明 groupBy、reducer、selector 输入字段，并输出全部回填字段 */
const annotateTransformDefinition = defineTransform<IRDataAnnotateTransform>({
  schema: AnnotateTransformSchema,
  inputFields: (operation, context) => [
    ...(operation.groupBy ?? []),
    ...(operation.metrics ?? []).flatMap(metric => reducerInputFields(metric, context.statisticsReducerRegistry)),
    ...(operation.selectors ?? []).flatMap(selector =>
      selectorInputFields(selector.selector, context.rowSelectorRegistry),
    ),
  ],
  outputFields: (operation, context) => [
    ...(operation.metrics ?? []).flatMap(metric => reducerOutputFields(metric, context.statisticsReducerRegistry)),
    ...(operation.selectors ?? []).map(selector => selector.as),
  ],
  outputModel: (operation, context) => ({
    kind: 'preserve',
    outputs: [
      ...(operation.metrics ?? []).flatMap(metric =>
        reducerOutputDescriptors(metric, context.statisticsReducerRegistry),
      ),
      ...(operation.selectors ?? []).map(annotation => {
        const selector = annotation.selector;
        return {
          field: annotation.as,
          type: 'by' in selector ? ({ from: selector.by } as const) : DataFieldType.Continuous,
        };
      }),
    ],
  }),
  apply: (rows, operation, context) => applyAnnotate(rows, operation, context),
});

const stackTransformDefinition = defineTransform<IRDataStackTransform>({
  schema: StackTransformSchema,
  inputFields: operation => [
    operation.y,
    ...(operation.x !== undefined ? [operation.x] : []),
    ...(operation.groupBy !== undefined ? [operation.groupBy] : []),
  ],
  outputFields: operation => [operation.startField ?? DEFAULT_START_FIELD, operation.endField ?? DEFAULT_END_FIELD],
  outputModel: operation => ({
    kind: 'preserve',
    outputs: [
      { field: operation.startField ?? DEFAULT_START_FIELD, type: DataFieldType.Continuous },
      { field: operation.endField ?? DEFAULT_END_FIELD, type: DataFieldType.Continuous },
    ],
  }),
  schedule: {
    phase: DataTransformPhase.CumulativeDerive,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Preserve,
  },
  apply: (rows, operation) => applyStack(rows, operation),
});

const binOutputModel = (operation: IRDataBinTransform, context: TransformContext) => {
  const metrics = binMetricOperations(operation);
  const metricFields = metrics.flatMap(metric => reducerOutputFields(metric, context.statisticsReducerRegistry));
  const metricDescriptors = metrics.flatMap(metric =>
    reducerOutputDescriptors(metric, context.statisticsReducerRegistry),
  );
  if (
    metricFields.length !== metricDescriptors.length ||
    metricFields.some((field, index) => metricDescriptors[index]?.field !== field)
  ) {
    return undefined;
  }
  const output = binOutputFields(operation);
  const fields: Array<DataTransformOutputDescriptor> = [
    { field: operation.field, type: { from: operation.field } },
    { field: output.startField, type: DataFieldType.Continuous },
    { field: output.endField, type: DataFieldType.Continuous },
    ...metricDescriptors,
  ];
  return { kind: 'replace' as const, fields };
};

const binTransformDefinition = defineTransform<IRDataBinTransform>({
  schema: BinTransformSchema,
  inputFields: (operation, context) => [
    operation.field,
    ...binMetricOperations(operation).flatMap(metric => reducerInputFields(metric, context.statisticsReducerRegistry)),
  ],
  outputFields: (operation, context) => {
    const out = binOutputFields(operation);
    return [
      out.startField,
      out.endField,
      ...binMetricOperations(operation).flatMap(metric =>
        reducerOutputFields(metric, context.statisticsReducerRegistry),
      ),
    ];
  },
  outputModel: binOutputModel,
  schedule: {
    phase: DataTransformPhase.RowShape,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Replace,
  },
  apply: (rows, operation, context) => applyBin(rows, operation, context),
});

const normalizeTransformDefinition = defineTransform<IRDataNormalizeTransform>({
  schema: NormalizeTransformSchema,
  inputFields: operation => [operation.field, ...(operation.groupBy ?? [])],
  outputFields: operation => (operation.as !== undefined ? [operation.as] : []),
  outputModel: operation => ({
    kind: 'preserve',
    outputs: [{ field: operation.as ?? operation.field, type: DataFieldType.Continuous }],
  }),
  schedule: {
    phase: DataTransformPhase.FieldDerive,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Preserve,
  },
  apply: (rows, operation) => applyNormalize(rows, operation),
});

const deriveIntervalTransformDefinition = defineTransform<IRDataDeriveIntervalTransform>({
  schema: DeriveIntervalTransformSchema,
  inputFields: operation =>
    [operation.from, operation.startFrom, operation.endFrom].filter((field): field is string => field !== undefined),
  outputFields: operation => [
    operation.startField ?? DEFAULT_DERIVE_START_FIELD,
    operation.endField ?? DEFAULT_DERIVE_END_FIELD,
  ],
  outputModel: operation => ({
    kind: 'preserve',
    outputs: [
      { field: operation.startField ?? DEFAULT_DERIVE_START_FIELD, type: DataFieldType.Continuous },
      { field: operation.endField ?? DEFAULT_DERIVE_END_FIELD, type: DataFieldType.Continuous },
    ],
  }),
  schedule: {
    phase: DataTransformPhase.CumulativeDerive,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Preserve,
  },
  apply: (rows, operation) => applyDeriveInterval(rows, operation),
});

const relateTransformDefinition = defineTransform<IRDataRelateTransform>({
  schema: RelateTransformSchema,
  inputFields: (operation, context) => [
    ...(operation.groupBy ?? []),
    ...selectorInputFields(operation.source.selector, context.rowSelectorRegistry),
    ...selectorInputFields(operation.target.selector, context.rowSelectorRegistry),
    ...Object.values(operation.source.fields),
    ...Object.values(operation.target.fields),
    ...(operation.measures ?? []).map(measure => measure.field),
  ],
  outputFields: operation => [
    ...Object.keys(operation.source.fields).map(field => relationEndpointOutputField('source', field)),
    ...Object.keys(operation.target.fields).map(field => relationEndpointOutputField('target', field)),
    ...(operation.measures ?? []).flatMap(measure =>
      [measure.as, measure.labelAs].filter((field): field is string => field !== undefined),
    ),
  ],
  outputModel: operation => ({
    kind: 'replace',
    fields: [
      ...(operation.groupBy ?? []).map(field => ({ field, type: { from: field } }) as const),
      ...Object.entries(operation.source.fields).map(([field, sourceField]) => ({
        field: relationEndpointOutputField('source', field),
        type: { from: sourceField },
      })),
      ...Object.entries(operation.target.fields).map(([field, sourceField]) => ({
        field: relationEndpointOutputField('target', field),
        type: { from: sourceField },
      })),
      ...(operation.measures ?? []).flatMap(measure => [
        { field: measure.as, type: DataFieldType.Continuous } as const,
        ...(measure.labelAs !== undefined
          ? [{ field: measure.labelAs, type: DataFieldType.Categorical } as const]
          : []),
      ]),
    ],
  }),
  apply: (rows, operation, context) => applyRelate(rows, operation, context),
});

const jitterTransformDefinition = defineTransform<IRDataJitterTransform>({
  schema: JitterTransformSchema,
  inputFields: operation => {
    const axis = operation.axis ?? JitterAxis.X;
    return [
      axis === JitterAxis.X || axis === JitterAxis.Both ? (operation.xField ?? DEFAULT_JITTER_X_FIELD) : undefined,
      axis === JitterAxis.Y || axis === JitterAxis.Both ? (operation.yField ?? DEFAULT_JITTER_Y_FIELD) : undefined,
    ].filter((field): field is string => field !== undefined);
  },
  outputModel: operation => {
    const axis = operation.axis ?? JitterAxis.X;
    const fields = [
      axis === JitterAxis.X || axis === JitterAxis.Both ? (operation.xField ?? DEFAULT_JITTER_X_FIELD) : undefined,
      axis === JitterAxis.Y || axis === JitterAxis.Both ? (operation.yField ?? DEFAULT_JITTER_Y_FIELD) : undefined,
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
  apply: (rows, operation) => applyJitter(rows, operation),
});

const densityTransformDefinition = defineTransform<IRDataDensityTransform>({
  schema: DensityTransformSchema,
  inputFields: operation => densityInputFields(operation),
  outputFields: operation => densityOutputFields(operation),
  outputModel: operation => ({
    kind: 'replace',
    fields: [
      ...(operation.groupBy ?? []).map(field => ({ field, type: { from: field } }) as const),
      { field: operation.xAs, type: DataFieldType.Continuous },
      { field: operation.densityAs, type: DataFieldType.Continuous },
    ],
  }),
  apply: (rows, operation, context) => applyDensity(rows, operation, context),
});

const smoothTransformDefinition = defineTransform<IRDataSmoothTransform>({
  schema: SmoothTransformSchema,
  inputFields: operation => smoothInputFields(operation),
  outputFields: operation => smoothOutputFields(operation),
  outputModel: operation => ({
    kind: 'replace',
    fields: [
      ...(operation.groupBy ?? []).map(field => ({ field, type: { from: field } }) as const),
      { field: operation.xAs, type: DataFieldType.Continuous },
      { field: operation.yAs, type: DataFieldType.Continuous },
    ],
  }),
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
 * 按 kind 索引的内置 transform definition。
 * @description 主要供诊断与测试确认内置覆盖；自定义 definition 不写入此表，而是在每次 lowering 时合并
 */
export const BUILTIN_TRANSFORM_DEFINITIONS_BY_KIND: ReadonlyMap<string, AnyTransformDefinition> =
  createReadonlyMap(BUILTIN_TRANSFORM_REGISTRY);

/**
 * 解析 transform registry。
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
