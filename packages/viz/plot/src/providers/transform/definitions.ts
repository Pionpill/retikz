import type { AnyTransformDefinition } from '@retikz/data';

import { defineTransform, extractTransformKind, reducerInputFields, reducerOutputFields, resolveTransformRegistry, selectorInputFields } from '@retikz/data';

import type {
  BinTransform,
  DensityTransform,
  DeriveIntervalTransform,
  JitterTransform,
  NormalizeTransform,
  RelateTransform,
  SmoothTransform,
  StackTransform,
} from '../../schemas';

import {
  BinTransformSchema,
  DensityTransformSchema,
  DeriveIntervalTransformSchema,
  JitterTransformSchema,
  NormalizeTransformSchema,
  RelateTransformSchema,
  SmoothTransformSchema,
  StackTransformSchema,
} from '../../schemas';
import { applyDensity, densityInputFields, densityOutputFields } from './density';
import { applyBin, applyRelate, binMetricOperations, binOutputFields, relationEndpointOutputField } from './group';
import {
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

const stackTransformDefinition = defineTransform<StackTransform>({
  schema: StackTransformSchema,
  inputFields: operation => [
    operation.y,
    ...(operation.x !== undefined ? [operation.x] : []),
    ...(operation.groupBy !== undefined ? [operation.groupBy] : []),
  ],
  outputFields: operation => [operation.startField ?? DEFAULT_START_FIELD, operation.endField ?? DEFAULT_END_FIELD],
  apply: (rows, operation) => applyStack(rows, operation),
});

const binTransformDefinition = defineTransform<BinTransform>({
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
  apply: (rows, operation, context) => applyBin(rows, operation, context),
});

const normalizeTransformDefinition = defineTransform<NormalizeTransform>({
  schema: NormalizeTransformSchema,
  inputFields: operation => [operation.field, ...(operation.groupBy ?? [])],
  outputFields: operation => (operation.as !== undefined ? [operation.as] : []),
  apply: (rows, operation) => applyNormalize(rows, operation),
});

const deriveIntervalTransformDefinition = defineTransform<DeriveIntervalTransform>({
  schema: DeriveIntervalTransformSchema,
  inputFields: operation =>
    [operation.from, operation.startFrom, operation.endFrom].filter((field): field is string => field !== undefined),
  outputFields: operation => [
    operation.startField ?? DEFAULT_DERIVE_START_FIELD,
    operation.endField ?? DEFAULT_DERIVE_END_FIELD,
  ],
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
    ...(operation.measures ?? []).flatMap(measure =>
      [measure.as, measure.labelAs].filter((field): field is string => field !== undefined),
    ),
  ],
  apply: (rows, operation, context) => applyRelate(rows, operation, context),
});

const jitterTransformDefinition = defineTransform<JitterTransform>({
  schema: JitterTransformSchema,
  inputFields: operation => {
    const axis = operation.axis ?? 'x';
    return [
      axis === 'x' || axis === 'both' ? (operation.xField ?? DEFAULT_JITTER_X_FIELD) : undefined,
      axis === 'y' || axis === 'both' ? (operation.yField ?? DEFAULT_JITTER_Y_FIELD) : undefined,
    ].filter((field): field is string => field !== undefined);
  },
  apply: (rows, operation) => applyJitter(rows, operation),
});

const densityTransformDefinition = defineTransform<DensityTransform>({
  schema: DensityTransformSchema,
  inputFields: operation => densityInputFields(operation),
  outputFields: operation => densityOutputFields(operation),
  apply: (rows, operation, context) => applyDensity(rows, operation, context),
});

const smoothTransformDefinition = defineTransform<SmoothTransform>({
  schema: SmoothTransformSchema,
  inputFields: operation => smoothInputFields(operation),
  outputFields: operation => smoothOutputFields(operation),
  apply: (rows, operation, context) => applySmooth(rows, operation, context),
});

/** plot-only 内置 transform definition 列表；通过 data transform registry 与 data 内置项同路消费。 */
export const BUILTIN_PLOT_TRANSFORMS: ReadonlyArray<AnyTransformDefinition> = [
  stackTransformDefinition,
  binTransformDefinition,
  normalizeTransformDefinition,
  deriveIntervalTransformDefinition,
  relateTransformDefinition,
  jitterTransformDefinition,
  densityTransformDefinition,
  smoothTransformDefinition,
] as ReadonlyArray<AnyTransformDefinition>;

/** 按 kind 索引的 plot-only 内置 transform definition。 */
export const BUILTIN_PLOT_TRANSFORM_DEFINITIONS_BY_KIND: ReadonlyMap<string, AnyTransformDefinition> = new Map(
  BUILTIN_PLOT_TRANSFORMS.map(def => [extractTransformKind(def.schema), def] as const),
);

/**
 * 解析 plot transform registry。
 * @description 先注册 data 内置项，再注册 plot-only 内置项，最后合并用户自定义 definition。
 */
export const resolvePlotTransformRegistry = (
  custom?: ReadonlyArray<AnyTransformDefinition>,
): Map<string, AnyTransformDefinition> => resolveTransformRegistry([...BUILTIN_PLOT_TRANSFORMS, ...(custom ?? [])]);
