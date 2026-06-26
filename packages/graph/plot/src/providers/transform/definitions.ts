import { type AnyTransformDefinition, type TransformContext, defineTransform, extractTransformKind } from '../../contract';
import { readSourceIndex, readSourceIndices, withGroupProvenance } from '../../pipeline';
import {
  type AggregateTransform,
  AggregateTransformSchema,
  type BinTransform,
  BinTransformSchema,
  type DeriveIntervalTransform,
  DeriveIntervalTransformSchema,
  type DeriveRelationTransform,
  DeriveRelationTransformSchema,
  type JitterTransform,
  JitterTransformSchema,
  type NormalizeTransform,
  NormalizeTransformSchema,
  type SortTransform,
  SortTransformSchema,
  type StackTransform,
  StackTransformSchema,
} from '../../schemas';
import { applyDeriveRelation, deriveRelationInputFields, deriveRelationOutputFields } from './derive-relation';
import { aggregateOutputField, applyAggregate, applyBin, binOutputFields } from './group';
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
  inputFields: operation => [operation.field, ...(operation.reduceField !== undefined ? [operation.reduceField] : [])],
  outputFields: operation => {
    const out = binOutputFields(operation);
    return [out.startField, out.endField, out.valueField];
  },
  apply: (rows, operation, context) => applyBin(rows, operation, context),
});

const aggregateTransformDefinition = defineTransform<AggregateTransform>({
  schema: AggregateTransformSchema,
  inputFields: operation => [...operation.groupBy, ...(operation.field !== undefined ? [operation.field] : [])],
  outputFields: operation => [aggregateOutputField(operation)],
  apply: (rows, operation, context) => applyAggregate(rows, operation, context),
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

const deriveRelationTransformDefinition = defineTransform<DeriveRelationTransform>({
  schema: DeriveRelationTransformSchema,
  inputFields: deriveRelationInputFields,
  outputFields: deriveRelationOutputFields,
  apply: (rows, operation) => applyDeriveRelation(rows, operation),
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

/** 内置 transform definition 列表；内置 7 个与自定义 transform 共享同一 registry 分派流程。 */
export const BUILTIN_TRANSFORMS: ReadonlyArray<AnyTransformDefinition> = [
  sortTransformDefinition,
  stackTransformDefinition,
  binTransformDefinition,
  aggregateTransformDefinition,
  normalizeTransformDefinition,
  deriveIntervalTransformDefinition,
  deriveRelationTransformDefinition,
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
