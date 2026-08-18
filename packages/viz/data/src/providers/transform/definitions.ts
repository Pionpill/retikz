import type { AnyTransformDefinition } from '../../contract';
import type {
  IRDataAnnotateTransform,
  IRDataSelectTransform,
  IRDataSortTransform,
  IRDataSummarizeTransform,
} from '../../schemas';

import { defineTransform, extractTransformKind } from '../../contract';
import { RetikzDataError } from '../../error';
import {
  AnnotateTransformSchema,
  SelectTransformSchema,
  SortTransformSchema,
  SummarizeTransformSchema,
} from '../../schemas';
import { createReadonlyMap } from '../../shared/collections';
import { freezeDefinitions } from '../shared';
import { reducerInputFields, reducerOutputFields, selectorInputFields } from '../statistics';
import { applyAnnotate, applySelect, applySummarize } from './group';
import { applySort } from './row';

/** 内置 sort transform definition；读取排序字段并稳定重排输入行 */
const sortTransformDefinition = defineTransform<IRDataSortTransform>({
  schema: SortTransformSchema,
  inputFields: operation => [operation.field],
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
  apply: (rows, operation, context) => applyAnnotate(rows, operation, context),
});

/** 内置 transform definition 列表；内置 transform 与自定义 transform 共享同一 registry 分派流程 */
export const BUILTIN_TRANSFORMS: ReadonlyArray<AnyTransformDefinition> = freezeDefinitions([
  sortTransformDefinition,
  summarizeTransformDefinition,
  selectTransformDefinition,
  annotateTransformDefinition,
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
