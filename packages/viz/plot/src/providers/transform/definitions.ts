import type { AnyTransformDefinition, DataTransformOutputDescriptor, TransformContext } from '@retikz/data';

import {
  DataFieldType,
  DataTransformBindingClass,
  DataTransformFieldEffect,
  DataTransformPhase,
  defineTransform,
  extractTransformKind,
  reducerInputFields,
  reducerOutputDescriptors,
  reducerOutputFields,
  resolveTransformRegistry,
  selectorInputFields,
} from '@retikz/data';

import type {
  IRPlotBinTransform,
  IRPlotDensityTransform,
  IRPlotDeriveIntervalTransform,
  IRPlotJitterTransform,
  IRPlotNormalizeTransform,
  IRPlotRelateTransform,
  IRPlotSmoothTransform,
  IRPlotStackTransform,
} from '../../schemas';

import {
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

const stackTransformDefinition = defineTransform<IRPlotStackTransform>({
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
  compact: {
    phase: DataTransformPhase.CumulativeDerive,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Preserve,
  },
  apply: (rows, operation) => applyStack(rows, operation),
});

const binOutputModel = (operation: IRPlotBinTransform, context: TransformContext) => {
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

const binTransformDefinition = defineTransform<IRPlotBinTransform>({
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
  compact: {
    phase: DataTransformPhase.RowShape,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Replace,
  },
  apply: (rows, operation, context) => applyBin(rows, operation, context),
});

const normalizeTransformDefinition = defineTransform<IRPlotNormalizeTransform>({
  schema: NormalizeTransformSchema,
  inputFields: operation => [operation.field, ...(operation.groupBy ?? [])],
  outputFields: operation => (operation.as !== undefined ? [operation.as] : []),
  outputModel: operation => ({
    kind: 'preserve',
    outputs: [{ field: operation.as ?? operation.field, type: DataFieldType.Continuous }],
  }),
  compact: {
    phase: DataTransformPhase.FieldDerive,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Preserve,
  },
  apply: (rows, operation) => applyNormalize(rows, operation),
});

const deriveIntervalTransformDefinition = defineTransform<IRPlotDeriveIntervalTransform>({
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
  compact: {
    phase: DataTransformPhase.CumulativeDerive,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Preserve,
  },
  apply: (rows, operation) => applyDeriveInterval(rows, operation),
});

const relateTransformDefinition = defineTransform<IRPlotRelateTransform>({
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

const jitterTransformDefinition = defineTransform<IRPlotJitterTransform>({
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
  compact: {
    phase: DataTransformPhase.FieldAdjust,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Preserve,
  },
  apply: (rows, operation) => applyJitter(rows, operation),
});

const densityTransformDefinition = defineTransform<IRPlotDensityTransform>({
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

const smoothTransformDefinition = defineTransform<IRPlotSmoothTransform>({
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

/** plot-only 内置 transform definition 列表；通过 data transform registry 与 data 内置项同路消费 */
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

/** 按 kind 索引的 plot-only 内置 transform definition */
export const BUILTIN_PLOT_TRANSFORM_DEFINITIONS_BY_KIND: ReadonlyMap<string, AnyTransformDefinition> = new Map(
  BUILTIN_PLOT_TRANSFORMS.map(def => [extractTransformKind(def.schema), def] as const),
);

/**
 * 解析 plot transform registry。
 * @description 先注册 data 内置项，再注册 plot-only 内置项，最后合并用户自定义 definition
 */
export const resolvePlotTransformRegistry = (
  custom?: ReadonlyArray<AnyTransformDefinition>,
): Map<string, AnyTransformDefinition> => resolveTransformRegistry([...BUILTIN_PLOT_TRANSFORMS, ...(custom ?? [])]);
