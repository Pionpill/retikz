import type { IRJsonObject } from '@retikz/core';
import type {
  DataFieldTypeValue,
  DataTransformFieldEffectValue,
  DataTransformOutputDescriptor,
  DataTransformOutputModel,
  DataTransformPhaseValue,
  IRDataReducerOperation,
  TransformContext,
} from '@retikz/data';
import type { IRPlotScaleOperation, IRPlotTransform } from '@retikz/plot';

import {
  DataTransform,
  DataTransformBindingClass,
  DataTransformFieldEffect,
  DataTransformPhase,
  DEFAULT_TRANSFORM_CONTEXT,
} from '@retikz/data';

import type {
  ChartEncodingResolution,
  ChartEncodingResolveContext,
  ChartResolvedFieldMapping,
} from '../contract/recipe';
import type { IRChartSource } from '../schemas';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';

type ChartTransformCapability = Readonly<{
  phase: DataTransformPhaseValue;
  fieldEffect: DataTransformFieldEffectValue;
}>;

type ChartEncodingScaleConsumer = Readonly<{
  family: 'position' | 'channel';
  type?: string;
  positionRole?: string;
  recipeFallback?: Readonly<{
    name: string;
    type: string;
  }>;
}>;

/** exact recipe中一个普通字段slot允许的mapping能力 */
export type ChartEncodingFieldConsumer<TSlot extends string = string> = Readonly<{
  slot: TSlot;
  transforms?: ReadonlyArray<ChartTransformCapability>;
  outputType?: DataFieldTypeValue;
  scale?: ChartEncodingScaleConsumer;
}>;

type ResolvedScaleSource = Readonly<{
  family: 'position' | 'channel';
  type: string;
}>;

type TransformOperationRecord = Readonly<{
  id: string;
  slot: string;
  slotIndex: number;
  phase: DataTransformPhaseValue;
  operation: IRPlotTransform;
  fieldEffect: DataTransformFieldEffectValue;
  inputs: ReadonlyArray<string>;
  outputs: ReadonlyArray<DataTransformOutputDescriptor>;
  producedFields: ReadonlyArray<string>;
  fieldsAfterReplace?: ReadonlyArray<string>;
}>;

type FieldProducer = Readonly<{
  id: string;
  slot: string;
  phase: DataTransformPhaseValue;
  slotIndex: number;
}>;

type FieldConsumer = Readonly<{
  id: string;
  slot: string;
  phase: DataTransformPhaseValue;
  slotIndex: number;
  fields: ReadonlyArray<string>;
  allowsSelfOutput: boolean;
}>;

const transformPhaseOrder: ReadonlyArray<DataTransformPhaseValue> = [
  DataTransformPhase.RowShape,
  DataTransformPhase.FieldDerive,
  DataTransformPhase.RowOrder,
  DataTransformPhase.CumulativeDerive,
  DataTransformPhase.FieldAdjust,
];

const transformPhaseIndex = new Map(transformPhaseOrder.map((phase, index) => [phase, index] as const));

const invalidEncoding = (message: string, path: ReadonlyArray<string | number>, cause?: unknown): RetikzChartError =>
  new RetikzChartError({
    code: RetikzChartErrorCode.InvalidChartIR,
    message,
    details: { path },
    ...(cause === undefined ? {} : { cause }),
  });

const mappingPathOf = (slot: string): ReadonlyArray<string | number> => ['recipe', 'encodings', slot];

const objectValueOf = (value: unknown): IRJsonObject | undefined => {
  if (value === null || Array.isArray(value) || typeof value !== 'object') return undefined;
  return value as IRJsonObject;
};

const directFieldsOf = (value: unknown): ReadonlyArray<string> => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(item => directFieldsOf(item));
  const object = objectValueOf(value);
  return object !== undefined && typeof object.field === 'string' ? [object.field] : [];
};

const mappingKindOf = (value: unknown): 'direct' | 'aggregate' | 'derived' | undefined => {
  if (typeof value === 'string') return 'direct';
  const object = objectValueOf(value);
  if (object === undefined) return undefined;
  if (Object.hasOwn(object, 'aggregate')) return 'aggregate';
  if (Object.hasOwn(object, 'transform')) return 'derived';
  if (Object.hasOwn(object, 'field')) return 'direct';
  return undefined;
};

const mappingScaleOf = (value: unknown): IRJsonObject | undefined => {
  const mapping = objectValueOf(value);
  return mapping === undefined ? undefined : objectValueOf(mapping.scale);
};

const outputDescriptorsOf = (model: DataTransformOutputModel): ReadonlyArray<DataTransformOutputDescriptor> =>
  model.kind === 'preserve' ? model.outputs : model.fields;

const producedFieldsOfOutputModel = (model: DataTransformOutputModel): Array<string> => {
  const descriptors = outputDescriptorsOf(model);
  return model.kind === 'preserve'
    ? descriptors.map(descriptor => descriptor.field)
    : descriptors
        .filter(descriptor => typeof descriptor.type === 'string' || descriptor.type.from !== descriptor.field)
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
  value: IRJsonObject,
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
    const descriptors = definition.outputs?.(parsed) ?? [];
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

const transformContextOf = (context: ChartEncodingResolveContext): TransformContext => ({
  ...DEFAULT_TRANSFORM_CONTEXT,
  statisticsReducerRegistry: context.runtime.reducers,
  rowSelectorRegistry: context.runtime.selectors,
});

const parseDerivedMapping = (
  context: ChartEncodingResolveContext,
  consumer: ChartEncodingFieldConsumer,
  value: IRJsonObject,
  slotIndex: number,
): Readonly<{ record: TransformOperationRecord; descriptor: DataTransformOutputDescriptor }> => {
  const operation = objectValueOf(value.transform) as IRPlotTransform | undefined;
  const output = value.output;
  const path = mappingPathOf(consumer.slot);
  if (operation === undefined || typeof operation.kind !== 'string' || typeof output !== 'string') {
    throw invalidEncoding(`Chart encoding "${consumer.slot}" has an invalid derived mapping`, path);
  }
  const definition = context.runtime.transforms.get(operation.kind);
  if (definition === undefined) {
    throw invalidEncoding(`Chart transform "${operation.kind}" is not registered`, [...path, 'transform']);
  }
  const schedule = definition.schedule;
  if (schedule === undefined || schedule.bindingClass !== DataTransformBindingClass.Field) {
    throw invalidEncoding(`Chart transform "${operation.kind}" is not available for encoding field mapping`, [
      ...path,
      'transform',
    ]);
  }
  if (!transformPhaseIndex.has(schedule.phase)) {
    throw invalidEncoding(`Chart transform "${operation.kind}" declares an unknown schedule phase`, [
      ...path,
      'transform',
    ]);
  }
  const accepted = consumer.transforms?.some(
    capability => capability.phase === schedule.phase && capability.fieldEffect === schedule.fieldEffect,
  );
  if (accepted !== true) {
    throw invalidEncoding(`Chart transform "${operation.kind}" is incompatible with encoding "${consumer.slot}"`, [
      ...path,
      'transform',
    ]);
  }

  try {
    const parsed = definition.schema.parse(operation) as never;
    const transformContext = transformContextOf(context);
    const model = definition.outputModel?.(parsed, transformContext);
    if (model === undefined) {
      throw invalidEncoding(`Chart transform "${operation.kind}" must declare a complete output model`, [
        ...path,
        'transform',
      ]);
    }
    const expectedEffect =
      model.kind === 'preserve' ? DataTransformFieldEffect.Preserve : DataTransformFieldEffect.Replace;
    if (schedule.fieldEffect !== expectedEffect) {
      throw invalidEncoding(
        `Chart transform "${operation.kind}" schedule field effect does not match its output model`,
        [...path, 'transform'],
      );
    }
    const descriptors = outputDescriptorsOf(model);
    const outputFields = definition.outputFields?.(parsed, transformContext);
    const producedFields = outputFields ?? producedFieldsOfOutputModel(model);
    const matches = descriptors.filter(descriptor => descriptor.field === output);
    if (matches.length !== 1) {
      throw invalidEncoding(
        `Chart transform "${operation.kind}" must describe mapping output "${output}" exactly once`,
        [...path, 'output'],
      );
    }
    assertOutputType(matches[0], consumer);
    return {
      record: {
        id: `derived:${consumer.slot}`,
        slot: consumer.slot,
        slotIndex,
        phase: schedule.phase,
        operation: parsed,
        fieldEffect: schedule.fieldEffect,
        inputs: definition.inputFields?.(parsed, transformContext) ?? [],
        outputs: descriptors,
        producedFields,
        ...(schedule.fieldEffect === DataTransformFieldEffect.Replace
          ? { fieldsAfterReplace: descriptors.map(descriptor => descriptor.field) }
          : {}),
      },
      descriptor: matches[0],
    };
  } catch (error) {
    if (error instanceof RetikzChartError) throw error;
    throw invalidEncoding(`Chart transform "${operation.kind}" is invalid`, [...path, 'transform'], error);
  }
};

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

const assertUniqueOperations = (records: ReadonlyArray<TransformOperationRecord>): void => {
  const sourceByOperation = new Map<string, string>();
  for (const record of records) {
    const key = canonicalJson(record.operation);
    const previous = sourceByOperation.get(key);
    if (previous !== undefined) {
      throw invalidEncoding(`Chart transform is already declared by encoding "${previous}"`, [
        ...mappingPathOf(record.slot),
        'transform',
      ]);
    }
    sourceByOperation.set(key, record.slot);
  }
};

const extensionTransformOutputs = (
  context: ChartEncodingResolveContext,
  operation: IRPlotTransform,
): ReadonlyArray<string> => {
  const definition = context.runtime.transforms.get(operation.kind);
  if (definition === undefined) return [];
  const parsed = definition.schema.safeParse(operation);
  if (!parsed.success) return [];
  const transformContext = transformContextOf(context);
  const model = definition.outputModel?.(parsed.data as never, transformContext);
  return model === undefined
    ? (definition.outputFields?.(parsed.data as never, transformContext) ?? [])
    : producedFieldsOfOutputModel(model);
};

const assertExtensionTransformConflicts = (
  context: ChartEncodingResolveContext,
  records: ReadonlyArray<TransformOperationRecord>,
): void => {
  const extensionTransforms = context.source.plotExtension?.transform ?? [];
  if (extensionTransforms.length === 0) return;
  const extensionOperations = new Set(extensionTransforms.map(operation => canonicalJson(operation)));
  const extensionOutputs = new Set(
    extensionTransforms.flatMap(operation => extensionTransformOutputs(context, operation)),
  );
  for (const record of records) {
    const path = [...mappingPathOf(record.slot), 'transform'];
    if (extensionOperations.has(canonicalJson(record.operation))) {
      throw invalidEncoding('Chart transform is also declared by plotExtension', path);
    }
    const duplicateOutput = record.producedFields.find(field => extensionOutputs.has(field));
    if (duplicateOutput !== undefined) {
      throw invalidEncoding(`Chart transform output "${duplicateOutput}" is already produced by plotExtension`, path);
    }
  }
};

const assertFieldDependencies = (
  producers: ReadonlyMap<string, FieldProducer>,
  consumers: ReadonlyArray<FieldConsumer>,
): void => {
  for (const consumer of consumers) {
    const consumerPhase = transformPhaseIndex.get(consumer.phase) as number;
    for (const field of consumer.fields) {
      const producer = producers.get(field);
      if (producer === undefined) continue;
      if (consumer.allowsSelfOutput && producer.id === consumer.id) continue;
      const producerPhase = transformPhaseIndex.get(producer.phase) as number;
      if (producerPhase < consumerPhase) continue;
      if (producerPhase === consumerPhase && producer.slotIndex < consumer.slotIndex) continue;
      throw invalidEncoding(
        `Chart encoding "${consumer.slot}" reads field "${field}" before encoding "${producer.slot}" produces it`,
        mappingPathOf(consumer.slot),
      );
    }
  }
};

const assertRowShapeAvailability = (
  records: ReadonlyArray<TransformOperationRecord>,
  finalConsumers: ReadonlyArray<Readonly<{ slot: string; field: string }>>,
): void => {
  let availableFields: Set<string> | undefined;
  for (const record of records) {
    if (availableFields !== undefined) {
      const currentFields = availableFields;
      const missing = record.inputs.find(field => !currentFields.has(field));
      if (missing !== undefined) {
        throw invalidEncoding(
          `Chart encoding "${record.slot}" reads field "${missing}" after a row-shaping operation removed it`,
          mappingPathOf(record.slot),
        );
      }
    }
    if (record.fieldEffect === DataTransformFieldEffect.Replace) {
      availableFields = new Set(record.fieldsAfterReplace ?? []);
      continue;
    }
    if (availableFields !== undefined) {
      for (const descriptor of record.outputs) availableFields.add(descriptor.field);
    }
  }
  if (availableFields === undefined) return;
  for (const consumer of finalConsumers) {
    if (availableFields.has(consumer.field)) continue;
    throw invalidEncoding(
      `Chart encoding "${consumer.slot}" binds field "${consumer.field}" after a row-shaping operation removed it`,
      mappingPathOf(consumer.slot),
    );
  }
};

const resolveScaleSource = (
  context: ChartEncodingResolveContext,
  operation: IRPlotScaleOperation,
  path: ReadonlyArray<string | number>,
): ResolvedScaleSource => {
  const definition = context.runtime.scales.get(operation.type);
  if (definition === undefined) {
    throw invalidEncoding(`Chart scale type "${operation.type}" is not registered`, path);
  }
  try {
    definition.schema.parse(operation);
  } catch (error) {
    throw invalidEncoding(`Chart scale "${operation.name}" is invalid`, path, error);
  }
  return { family: definition.family, type: operation.type };
};

const assertScaleCompatible = (
  consumer: ChartEncodingFieldConsumer,
  source: ResolvedScaleSource,
  path: ReadonlyArray<string | number>,
): void => {
  const expected = consumer.scale;
  if (expected === undefined)
    throw invalidEncoding(`Chart encoding "${consumer.slot}" does not support named scales`, path);
  if (source.family !== expected.family || (expected.type !== undefined && source.type !== expected.type)) {
    throw invalidEncoding(`Chart scale is incompatible with encoding "${consumer.slot}"`, path);
  }
};

/**
 * 把exact recipe field mappings解析为direct bindings与有序Plot operations
 * @description schema继续由具体chartType拥有；该helper只编排owner Definition、ordered slots与consumer连接
 */
export const resolveChartEncodingMappings = <
  TSource extends IRChartSource,
  TEncodingSlot extends Extract<keyof TSource['recipe']['encodings'], string>,
  TConsumerSlot extends TEncodingSlot,
>(
  context: ChartEncodingResolveContext<TSource>,
  encodingSlots: ReadonlyArray<TEncodingSlot>,
  consumers: ReadonlyArray<ChartEncodingFieldConsumer<TConsumerSlot>>,
): ChartEncodingResolution => {
  const slotOrder = new Map(encodingSlots.map((slot, index) => [slot, index] as const));
  const directEncodings: IRJsonObject = {};
  const aggregateMappings: Array<
    Readonly<{
      slot: string;
      slotIndex: number;
      operation: IRDataReducerOperation;
      descriptor: DataTransformOutputDescriptor;
      inputs: ReadonlyArray<string>;
    }>
  > = [];
  const transformRecords: Array<TransformOperationRecord> = [];

  for (const consumer of consumers) {
    const slot = consumer.slot;
    const slotIndex = slotOrder.get(slot);
    if (slotIndex === undefined) {
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
    const mapping = objectValueOf(value) as IRJsonObject;
    if (kind === 'aggregate') {
      const resolved = parseAggregateMapping(context, consumer, mapping);
      aggregateMappings.push({ slot, slotIndex, ...resolved });
      directEncodings[slot] = { field: resolved.descriptor.field } satisfies ChartResolvedFieldMapping;
      continue;
    }
    const resolved = parseDerivedMapping(context, consumer, mapping, slotIndex);
    transformRecords.push(resolved.record);
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

  const summarySlotIndex = Math.min(...aggregateMappings.map(mapping => mapping.slotIndex));
  const summaryRecord: TransformOperationRecord | undefined =
    aggregateMappings.length === 0
      ? undefined
      : {
          id: 'aggregate-summary',
          slot: aggregateMappings[0].slot,
          slotIndex: summarySlotIndex,
          phase: DataTransformPhase.RowShape,
          operation: {
            kind: DataTransform.Summarize,
            groupBy,
            metrics: aggregateMappings.map(mapping => mapping.operation),
          },
          fieldEffect: DataTransformFieldEffect.Replace,
          inputs: [...groupBy, ...aggregateMappings.flatMap(mapping => mapping.inputs)],
          outputs: aggregateMappings.map(mapping => mapping.descriptor),
          producedFields: aggregateMappings.map(mapping => mapping.descriptor.field),
          fieldsAfterReplace: [...groupBy, ...aggregateMappings.map(mapping => mapping.descriptor.field)],
        };

  const operationRecords = [...transformRecords, ...(summaryRecord === undefined ? [] : [summaryRecord])];
  assertUniqueOperations(transformRecords);
  assertExtensionTransformConflicts(context, operationRecords);

  const producers = new Map<string, FieldProducer>();
  for (const record of operationRecords) {
    for (const field of record.producedFields) {
      const previous = producers.get(field);
      if (previous !== undefined && previous.id !== record.id) {
        throw invalidEncoding(`Chart transform output "${field}" is already produced by encoding "${previous.slot}"`, [
          ...mappingPathOf(record.slot),
          'transform',
        ]);
      }
      producers.set(field, {
        id: record.id,
        slot: record.slot,
        phase: record.phase,
        slotIndex: record.slotIndex,
      });
    }
  }

  const fieldConsumers: Array<FieldConsumer> = transformRecords.map(record => ({
    id: record.id,
    slot: record.slot,
    phase: record.phase,
    slotIndex: record.slotIndex,
    fields: record.inputs,
    allowsSelfOutput: true,
  }));
  for (const mapping of aggregateMappings) {
    fieldConsumers.push({
      id: 'aggregate-summary',
      slot: mapping.slot,
      phase: DataTransformPhase.RowShape,
      slotIndex: summarySlotIndex,
      fields: mapping.inputs,
      allowsSelfOutput: false,
    });
  }
  for (const [field, slot] of groupBySources) {
    fieldConsumers.push({
      id: 'aggregate-summary',
      slot,
      phase: DataTransformPhase.RowShape,
      slotIndex: summarySlotIndex,
      fields: [field],
      allowsSelfOutput: false,
    });
  }
  assertFieldDependencies(producers, fieldConsumers);

  const extensionScales = context.source.plotExtension?.scales ?? [];
  const extensionScaleByName = new Map<string, IRPlotScaleOperation>();
  for (const [index, operation] of extensionScales.entries()) {
    if (extensionScaleByName.has(operation.name)) {
      throw invalidEncoding(`Plot scale "${operation.name}" is declared more than once`, [
        'plotExtension',
        'scales',
        index,
        'name',
      ]);
    }
    extensionScaleByName.set(operation.name, operation);
  }

  const fallbackByName = new Map<string, Readonly<{ slot: string; source: ResolvedScaleSource }>>();
  for (const consumer of consumers) {
    const scale = consumer.scale;
    if (scale?.recipeFallback !== undefined) {
      const fallback = scale.recipeFallback;
      fallbackByName.set(fallback.name, {
        slot: consumer.slot,
        source: { family: scale.family, type: fallback.type },
      });
    }
  }

  const encodingScaleByName = new Map<
    string,
    Readonly<{ slot: string; operation: IRPlotScaleOperation; source: ResolvedScaleSource }>
  >();
  for (const consumer of consumers) {
    const value = context.encodings[consumer.slot];
    const scale = mappingScaleOf(value);
    const operation = scale === undefined ? undefined : objectValueOf(scale.operation);
    if (operation === undefined) continue;
    const scaleOperation = operation as IRPlotScaleOperation;
    const path = [...mappingPathOf(consumer.slot), 'scale'];
    const existing = encodingScaleByName.get(scaleOperation.name);
    if (existing !== undefined) {
      throw invalidEncoding(
        `Chart scale "${scaleOperation.name}" is already declared by encoding "${existing.slot}"`,
        path,
      );
    }
    if (extensionScaleByName.has(scaleOperation.name)) {
      throw invalidEncoding(`Chart scale "${scaleOperation.name}" is also declared by plotExtension`, path);
    }
    const fallback = fallbackByName.get(scaleOperation.name);
    if (fallback !== undefined && fallback.slot !== consumer.slot) {
      throw invalidEncoding(`Chart scale "${scaleOperation.name}" conflicts with another recipe fallback`, path);
    }
    const source = resolveScaleSource(context, scaleOperation, path);
    assertScaleCompatible(consumer, source, path);
    encodingScaleByName.set(scaleOperation.name, { slot: consumer.slot, operation: scaleOperation, source });
  }

  const positionScales: Record<string, string> = {};
  const removedRecipeScales = new Set<string>();
  const encodingScales: Array<IRPlotScaleOperation> = [];
  for (const consumer of consumers) {
    const mapping = directEncodings[consumer.slot] as ChartResolvedFieldMapping | undefined;
    if (mapping === undefined) continue;
    const scale = mappingScaleOf(context.encodings[consumer.slot]);
    if (scale === undefined) continue;
    const path = [...mappingPathOf(consumer.slot), 'scale'];
    let name: string;
    const declaresOperation = Object.hasOwn(scale, 'operation');
    if (declaresOperation) {
      const operation = objectValueOf(scale.operation) as IRPlotScaleOperation;
      name = operation.name;
      encodingScales.push(operation);
    } else {
      const reference = scale.reference;
      if (typeof reference !== 'string') throw invalidEncoding('Chart scale reference must be non-empty', path);
      name = reference;
      const encodingSource = encodingScaleByName.get(reference)?.source;
      const extensionOperation = extensionScaleByName.get(reference);
      const fallback = fallbackByName.get(reference);
      if (fallback !== undefined && fallback.slot !== consumer.slot) {
        throw invalidEncoding(
          `Chart recipe fallback scale "${reference}" belongs to encoding "${fallback.slot}"`,
          path,
        );
      }
      const source =
        encodingSource ??
        (extensionOperation === undefined ? undefined : resolveScaleSource(context, extensionOperation, path)) ??
        fallback?.source;
      if (source === undefined) throw invalidEncoding(`Chart scale reference "${reference}" does not exist`, path);
      assertScaleCompatible(consumer, source, path);
    }

    const scaleConsumer = consumer.scale;
    if (scaleConsumer?.positionRole !== undefined) {
      positionScales[scaleConsumer.positionRole] = name;
    } else {
      directEncodings[consumer.slot] = { ...mapping, scale: name } satisfies ChartResolvedFieldMapping;
    }
    const recipeFallback = scaleConsumer?.recipeFallback;
    if (recipeFallback !== undefined && (declaresOperation || name !== recipeFallback.name)) {
      removedRecipeScales.add(recipeFallback.name);
    }
  }

  operationRecords.sort((left, right) => {
    const phaseDifference =
      (transformPhaseIndex.get(left.phase) as number) - (transformPhaseIndex.get(right.phase) as number);
    return phaseDifference === 0 ? left.slotIndex - right.slotIndex : phaseDifference;
  });

  const finalConsumers: Array<Readonly<{ slot: string; field: string }>> = [];
  for (const slot of encodingSlots) {
    const resolved = objectValueOf(directEncodings[slot]);
    if (resolved !== undefined && typeof resolved.field === 'string') {
      finalConsumers.push({ slot, field: resolved.field });
      continue;
    }
    for (const field of directFieldsOf(context.encodings[slot])) finalConsumers.push({ slot, field });
  }
  assertRowShapeAvailability(operationRecords, finalConsumers);

  return {
    encodings: directEncodings,
    transform: operationRecords.map(record => record.operation),
    scales: encodingScales,
    positionScales,
    removedRecipeScales,
  };
};
