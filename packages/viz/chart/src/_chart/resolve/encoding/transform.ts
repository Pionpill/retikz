import type {
  DataTransformOutputDescriptor,
  DataTransformOutputModel,
  IRDataReducerOperation,
  TransformSemanticContext,
  IRDataTransform,
} from '@retikz/data';
import { BuiltinDataTransform } from '@retikz/data';
import type { JsonObject } from '@retikz/foundation';

import { RetikzChartError } from '../../../error';
import type { ChartEncodingResolveContext, ChartResolvedFieldMapping } from '../../contract/recipe';
import type { IRChartSource } from '../../schemas';
import { directFieldsOf, invalidEncoding, mappingKindOf, mappingPathOf, objectValueOf } from './shared';
import type { ChartEncodingFieldConsumer, ChartAggregateOperation } from './types';

const outputDescriptorsOf = (model: DataTransformOutputModel): ReadonlyArray<DataTransformOutputDescriptor> =>
  model.kind === 'preserve' ? model.outputs : model.fields;

const producedFieldsOfOutputModel = (model: DataTransformOutputModel): Array<string> => {
  const descriptors = outputDescriptorsOf(model);
  return model.kind === 'preserve'
    ? descriptors.map(descriptor => descriptor.field)
    : descriptors
        .filter(
          descriptor =>
            descriptor.type === undefined ||
            typeof descriptor.type === 'string' ||
            descriptor.type.from !== descriptor.field,
        )
        .map(descriptor => descriptor.field);
};

const assertOutputType = (descriptor: DataTransformOutputDescriptor, consumer: ChartEncodingFieldConsumer): void => {
  if (consumer.outputType === undefined || typeof descriptor.type !== 'string') return;
  if (descriptor.type !== consumer.outputType) {
    throw invalidEncoding(
      `Chart encoding "${consumer.slot}" requires a ${consumer.outputType} transform output`,
      mappingPathOf(consumer.slot),
    );
  }
};

const parseAggregateMapping = (
  context: ChartEncodingResolveContext,
  consumer: ChartEncodingFieldConsumer,
  value: JsonObject,
): Readonly<{
  operation: IRDataReducerOperation;
  descriptor: DataTransformOutputDescriptor;
  inputs: ReadonlyArray<string>;
}> => {
  const operation = objectValueOf(value.aggregate) as IRDataReducerOperation | undefined;
  const path = [...mappingPathOf(consumer.slot), 'aggregate'];
  if (operation === undefined || typeof operation.kind !== 'string') {
    throw invalidEncoding(`Chart encoding "${consumer.slot}" has an invalid aggregate operation`, path);
  }

  const definition = context.runtime.reducers.get(operation.kind);
  if (definition === undefined) {
    throw invalidEncoding(`Chart aggregate reducer "${operation.kind}" is not registered`, path);
  }

  try {
    const parsed = definition.schema.parse(operation) as never;
    const descriptors = definition.outputs(parsed);
    if (descriptors.length !== 1) {
      throw invalidEncoding(`Chart aggregate reducer "${operation.kind}" must declare exactly one scalar output`, path);
    }

    assertOutputType(descriptors[0], consumer);

    return {
      operation: parsed,
      descriptor: descriptors[0],
      inputs: definition.inputFields?.(parsed) ?? [],
    };
  } catch (error) {
    if (error instanceof RetikzChartError) throw error;
    throw invalidEncoding(`Chart aggregate reducer "${operation.kind}" is invalid`, path, error);
  }
};

const transformContextOf = (context: ChartEncodingResolveContext): TransformSemanticContext => ({
  model: context.source.data.model ?? [],
  statisticsReducerRegistry: context.runtime.reducers,
  regressionRegistry: context.runtime.regressions,
  rowSelectorRegistry: context.runtime.selectors,
});

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(item => canonicalJson(item)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

const extensionTransformOutputs = (
  context: ChartEncodingResolveContext,
  operation: IRDataTransform,
): ReadonlyArray<string> => {
  const definition = context.runtime.transforms.get(operation.kind);
  if (definition === undefined) return [];

  const parsed = definition.schema.safeParse(operation);
  if (!parsed.success) return [];

  const transformContext = transformContextOf(context);
  const model = definition.outputModel(parsed.data as never, transformContext);

  return producedFieldsOfOutputModel(model);
};

const assertExtensionTransformConflicts = (
  context: ChartEncodingResolveContext,
  records: ReadonlyArray<ChartAggregateOperation>,
): void => {
  const extensionTransforms = context.source.plotExtension?.transform ?? [];
  if (extensionTransforms.length === 0) return;

  const extensionOperations = new Set(extensionTransforms.map(declaration => canonicalJson(declaration.operation)));
  const extensionOutputs = new Set(
    extensionTransforms.flatMap(declaration => extensionTransformOutputs(context, declaration.operation)),
  );

  for (const record of records) {
    const path = [...mappingPathOf(record.slot), 'aggregate'];
    if (extensionOperations.has(canonicalJson(record.operation))) {
      throw invalidEncoding('Chart transform is also declared by plotExtension', path);
    }

    const duplicateOutput = record.producedFields.find(field => extensionOutputs.has(field));
    if (duplicateOutput !== undefined) {
      throw invalidEncoding(`Chart transform output "${duplicateOutput}" is already produced by plotExtension`, path);
    }
  }
};

/** 字段绑定与聚合操作的解析结果 */
type ChartEncodingTransformResolution = Readonly<{
  /** 已改写为直接字段消费形式的映射 */
  encodings: JsonObject;
  /** 由聚合映射合并生成的数据操作 */
  records: ReadonlyArray<ChartAggregateOperation>;
}>;

/**
 * 解析直接字段映射，并将聚合映射合并为 Data 汇总操作
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 * @template TEncodingSlot 当前 recipe 允许的字段映射槽位名称
 * @template TConsumerSlot 当前消费方实际使用的字段映射槽位子集
 */
export const resolveChartEncodingTransforms = <
  TSource extends IRChartSource,
  TEncodingSlot extends Extract<keyof TSource['recipe']['encodings'], string>,
  TConsumerSlot extends TEncodingSlot,
>(
  context: ChartEncodingResolveContext<TSource>,
  encodingSlots: ReadonlyArray<TEncodingSlot>,
  consumers: ReadonlyArray<ChartEncodingFieldConsumer<TConsumerSlot>>,
): ChartEncodingTransformResolution => {
  const slots = new Set(encodingSlots);
  const directEncodings: JsonObject = {};
  const aggregateMappings: Array<
    Readonly<{
      slot: string;
      operation: IRDataReducerOperation;
      descriptor: DataTransformOutputDescriptor;
      inputs: ReadonlyArray<string>;
    }>
  > = [];

  for (const consumer of consumers) {
    const slot = consumer.slot;
    if (!slots.has(slot)) {
      throw invalidEncoding(`Chart encoding consumer "${slot}" is absent from ordered encodingSlots`, [
        'encodingSlots',
      ]);
    }

    if (!Object.hasOwn(context.encodings, slot)) continue;

    const value = context.encodings[slot];
    const kind = mappingKindOf(value);
    if (kind === undefined) continue;
    if (kind === 'direct') {
      const fields = directFieldsOf(value);
      if (fields.length !== 1)
        throw invalidEncoding(`Chart encoding "${slot}" must bind one field`, mappingPathOf(slot));

      directEncodings[slot] = { field: fields[0] } satisfies ChartResolvedFieldMapping;
      continue;
    }

    const mapping = objectValueOf(value) as JsonObject;
    const resolved = parseAggregateMapping(context, consumer, mapping);
    aggregateMappings.push({ slot, ...resolved });
    directEncodings[slot] = { field: resolved.descriptor.field } satisfies ChartResolvedFieldMapping;
  }

  const groupBy: Array<string> = [];
  const groupBySources = new Map<string, string>();

  for (const slot of encodingSlots) {
    for (const field of directFieldsOf(context.encodings[slot])) {
      if (groupBySources.has(field)) continue;
      groupBySources.set(field, slot);
      groupBy.push(field);
    }
  }

  const aggregateOutputs = new Set<string>();

  for (const mapping of aggregateMappings) {
    if (aggregateOutputs.has(mapping.descriptor.field)) {
      throw invalidEncoding(`Chart aggregate output "${mapping.descriptor.field}" is declared more than once`, [
        ...mappingPathOf(mapping.slot),
        'aggregate',
      ]);
    }

    if (groupBySources.has(mapping.descriptor.field)) {
      throw invalidEncoding(`Chart aggregate output "${mapping.descriptor.field}" conflicts with a groupBy field`, [
        ...mappingPathOf(mapping.slot),
        'aggregate',
      ]);
    }

    aggregateOutputs.add(mapping.descriptor.field);
  }

  const summaryRecord: ChartAggregateOperation | undefined =
    aggregateMappings.length === 0
      ? undefined
      : {
          slot: aggregateMappings[0].slot,
          operation: {
            kind: BuiltinDataTransform.Summarize,
            params: {
              groupBy,
              metrics: aggregateMappings.map(mapping => mapping.operation),
            },
          },
          producedFields: aggregateMappings.map(mapping => mapping.descriptor.field),
        };

  const operationRecords = summaryRecord === undefined ? [] : [summaryRecord];
  assertExtensionTransformConflicts(context, operationRecords);

  for (const mapping of aggregateMappings) {
    const dependentOutput = mapping.inputs.find(field => aggregateOutputs.has(field));
    if (dependentOutput !== undefined) {
      throw invalidEncoding(
        `Chart aggregate cannot read sibling aggregate output "${dependentOutput}"`,
        mappingPathOf(mapping.slot),
      );
    }
  }

  return { encodings: directEncodings, records: operationRecords };
};
