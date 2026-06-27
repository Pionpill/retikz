import { type AnyTransformDefinition, type TransformContext, defineTransform, extractTransformKind } from '../../contract';
import { readSourceIndex, readSourceIndices, withGroupProvenance } from '../../pipeline';
import {
  type AnnotateTransform,
  AnnotateTransformSchema,
  type BinTransform,
  BinTransformSchema,
  type DeriveIntervalTransform,
  DeriveIntervalTransformSchema,
  type JitterTransform,
  JitterTransformSchema,
  type NormalizeTransform,
  NormalizeTransformSchema,
  type RelateTransform,
  RelateTransformSchema,
  type SelectTransform,
  SelectTransformSchema,
  type SortTransform,
  SortTransformSchema,
  type StackTransform,
  StackTransformSchema,
  type SummarizeTransform,
  SummarizeTransformSchema,
} from '../../schemas';
import { reducerInputFields, reducerOutputFields, selectorInputFields } from '../statistics';
import { applyAnnotate, applyBin, applyRelate, applySelect, applySummarize, binMetricOperations, binOutputFields, relationEndpointOutputField } from './group';
import { DEFAULT_DERIVE_END_FIELD, DEFAULT_DERIVE_START_FIELD, DEFAULT_END_FIELD, DEFAULT_JITTER_X_FIELD, DEFAULT_JITTER_Y_FIELD, DEFAULT_START_FIELD, applyDeriveInterval, applyJitter, applyNormalize, applySort, applyStack } from './row';

/** 默认 transform 上下文：使用 plot provenance symbol 标记，不把来源信息写进 JSON IR。 */
export const DEFAULT_TRANSFORM_CONTEXT: TransformContext = {
  readSourceIndex,
  readSourceIndices,
  groupProvenance: withGroupProvenance,
};

const sortTransformDefinition = defineTransform<SortTransform>({
  schema: SortTransformSchema,
  inputFields: operation => [operation.field],
  apply: (rows, operation) => applySort(rows, operation),
});

const stackTransformDefinition = defineTransform<StackTransform>({
  schema: StackTransformSchema,
  inputFields: operation => [operation.y, ...(operation.x !== undefined ? [operation.x] : []), ...(operation.groupBy !== undefined ? [operation.groupBy] : [])],
  outputFields: operation => [operation.startField ?? DEFAULT_START_FIELD, operation.endField ?? DEFAULT_END_FIELD],
  apply: (rows, operation) => applyStack(rows, operation),
});

const binTransformDefinition = defineTransform<BinTransform>({
  schema: BinTransformSchema,
  inputFields: (operation, context) => [
    operation.field,
    ...binMetricOperations(operation).flatMap(metric => reducerInputFields(metric, context.statReducerRegistry)),
  ],
  outputFields: (operation, context) => {
    const out = binOutputFields(operation);
    return [out.startField, out.endField, ...binMetricOperations(operation).flatMap(metric => reducerOutputFields(metric, context.statReducerRegistry))];
  },
  apply: (rows, operation, context) => applyBin(rows, operation, context),
});

const summarizeTransformDefinition = defineTransform<SummarizeTransform>({
  schema: SummarizeTransformSchema,
  inputFields: (operation, context) => [
    ...(operation.groupBy ?? []),
    ...operation.metrics.flatMap(metric => reducerInputFields(metric, context.statReducerRegistry)),
  ],
  outputFields: (operation, context) => operation.metrics.flatMap(metric => reducerOutputFields(metric, context.statReducerRegistry)),
  apply: (rows, operation, context) => applySummarize(rows, operation, context),
});

const selectTransformDefinition = defineTransform<SelectTransform>({
  schema: SelectTransformSchema,
  inputFields: (operation, context) => [
    ...(operation.groupBy ?? []),
    ...selectorInputFields(operation.selector, context.rowSelectorRegistry),
  ],
  outputFields: operation => (operation.rankAs !== undefined ? [operation.rankAs] : []),
  apply: (rows, operation, context) => applySelect(rows, operation, context),
});

const annotateTransformDefinition = defineTransform<AnnotateTransform>({
  schema: AnnotateTransformSchema,
  inputFields: (operation, context) => [
    ...(operation.groupBy ?? []),
    ...(operation.metrics ?? []).flatMap(metric => reducerInputFields(metric, context.statReducerRegistry)),
    ...(operation.selectors ?? []).flatMap(selector => selectorInputFields(selector.selector, context.rowSelectorRegistry)),
  ],
  outputFields: (operation, context) => [
    ...(operation.metrics ?? []).flatMap(metric => reducerOutputFields(metric, context.statReducerRegistry)),
    ...(operation.selectors ?? []).map(selector => selector.as),
  ],
  apply: (rows, operation, context) => applyAnnotate(rows, operation, context),
});

const normalizeTransformDefinition = defineTransform<NormalizeTransform>({
  schema: NormalizeTransformSchema,
  inputFields: operation => [operation.field, ...(operation.groupBy ?? [])],
  outputFields: operation => (operation.as !== undefined ? [operation.as] : []),
  apply: (rows, operation) => applyNormalize(rows, operation),
});

const deriveIntervalTransformDefinition = defineTransform<DeriveIntervalTransform>({
  schema: DeriveIntervalTransformSchema,
  inputFields: operation => [operation.from, operation.startFrom, operation.endFrom].filter((field): field is string => field !== undefined),
  outputFields: operation => [operation.startField ?? DEFAULT_DERIVE_START_FIELD, operation.endField ?? DEFAULT_DERIVE_END_FIELD],
  apply: (rows, operation) => applyDeriveInterval(rows, operation),
});

const relateTransformDefinition = defineTransform<RelateTransform>({
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
    ...(operation.measures ?? []).flatMap(measure => [measure.as, measure.labelAs].filter((field): field is string => field !== undefined)),
  ],
  apply: (rows, operation, context) => applyRelate(rows, operation, context),
});

const jitterTransformDefinition = defineTransform<JitterTransform>({
  schema: JitterTransformSchema,
  inputFields: operation => {
    const axis = operation.axis ?? 'x';
    return [
      axis === 'x' || axis === 'both' ? operation.xField ?? DEFAULT_JITTER_X_FIELD : undefined,
      axis === 'y' || axis === 'both' ? operation.yField ?? DEFAULT_JITTER_Y_FIELD : undefined,
    ].filter((field): field is string => field !== undefined);
  },
  apply: (rows, operation) => applyJitter(rows, operation),
});

/** 内置 transform definition 列表；内置 transform 与自定义 transform 共享同一 registry 分派流程。 */
export const BUILTIN_TRANSFORMS: ReadonlyArray<AnyTransformDefinition> = [
  sortTransformDefinition,
  stackTransformDefinition,
  binTransformDefinition,
  summarizeTransformDefinition,
  selectTransformDefinition,
  annotateTransformDefinition,
  normalizeTransformDefinition,
  deriveIntervalTransformDefinition,
  relateTransformDefinition,
  jitterTransformDefinition,
] as ReadonlyArray<AnyTransformDefinition>;

/**
 * 按 kind 索引的内置 transform definition。
 * @description 主要供诊断与测试确认内置覆盖；自定义 definition 不写入此表，而是在每次 lowering 时合并。
 */
export const BUILTIN_TRANSFORM_DEFINITIONS_BY_KIND: ReadonlyMap<string, AnyTransformDefinition> = new Map(
  BUILTIN_TRANSFORMS.map(def => [extractTransformKind(def.schema), def] as const),
);

/**
 * 解析 transform registry。
 * @description 内置 transform 总是先注册；用户自定义 definition 不能覆盖内置 kind，也不能彼此重复。
 */
export const resolveTransformRegistry = (custom?: ReadonlyArray<AnyTransformDefinition>): Map<string, AnyTransformDefinition> => {
  const registry = new Map<string, AnyTransformDefinition>();
  for (const def of BUILTIN_TRANSFORMS) {
    registry.set(extractTransformKind(def.schema), def);
  }
  for (const def of custom ?? []) {
    const kind = extractTransformKind(def.schema);
    if (registry.has(kind)) {
      throw new Error(`lowerPlots: duplicate transform registration: "${kind}"`);
    }
    registry.set(kind, def);
  }
  return registry;
};
