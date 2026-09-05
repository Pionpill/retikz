import type { JsonObject } from '@retikz/foundation';
import type { IRPlotScaleOperation } from '@retikz/plot';

import type { ChartEncodingResolveContext, ChartResolvedFieldMapping } from '../../contract/recipe';
import type { IRChartSource } from '../../schemas';
import type { ChartEncodingFieldConsumer, ResolvedScaleSource } from './types';

import { invalidEncoding, mappingPathOf, mappingScaleOf, objectValueOf } from './shared';

type ResolvedScaleOperation = Readonly<{
  operation: IRPlotScaleOperation;
  source: ResolvedScaleSource;
}>;

const resolveScaleSource = (
  context: ChartEncodingResolveContext,
  operation: IRPlotScaleOperation,
  path: ReadonlyArray<string | number>,
): ResolvedScaleOperation => {
  const definition = context.runtime.scales.get(operation.type);
  if (definition === undefined) {
    throw invalidEncoding(`Chart scale type "${operation.type}" is not registered`, path);
  }
  let parsedOperation: IRPlotScaleOperation;
  try {
    parsedOperation = definition.schema.parse(operation) as IRPlotScaleOperation;
  } catch (error) {
    throw invalidEncoding(`Chart scale "${operation.name}" is invalid`, path, error);
  }
  if (parsedOperation.type !== operation.type || parsedOperation.name !== operation.name) {
    throw invalidEncoding(`Chart scale "${operation.name}" Definition schema must preserve type and name`, path);
  }
  return {
    operation: parsedOperation,
    source: { family: definition.family, type: parsedOperation.type },
  };
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

/** exact encoding scale declaration、reference 与 recipe fallback 的连接结果 */
export type ChartEncodingScaleResolution = Readonly<{
  scales: ReadonlyArray<IRPlotScaleOperation>;
  extensionScales: ReadonlyArray<IRPlotScaleOperation>;
  positionScales: Readonly<Record<string, string>>;
  removedRecipeScales: ReadonlySet<string>;
}>;

/** 解析 exact field mappings 的 scale declaration 与 reference */
export const resolveChartEncodingScales = <
  TSource extends IRChartSource,
  TEncodingSlot extends Extract<keyof TSource['recipe']['encodings'], string>,
>(
  context: ChartEncodingResolveContext<TSource>,
  consumers: ReadonlyArray<ChartEncodingFieldConsumer<TEncodingSlot>>,
  directEncodings: JsonObject,
): ChartEncodingScaleResolution => {
  const extensionScales = [...(context.source.plotExtension?.scales ?? [])];
  const extensionScaleByName = new Map<string, Readonly<{ index: number; operation: IRPlotScaleOperation }>>();
  for (const [index, operation] of extensionScales.entries()) {
    if (extensionScaleByName.has(operation.name)) {
      throw invalidEncoding(`Plot scale "${operation.name}" is declared more than once`, [
        'plotExtension',
        'scales',
        index,
        'name',
      ]);
    }
    extensionScaleByName.set(operation.name, { index, operation });
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

  const encodingScaleByName = new Map<string, Readonly<{ slot: string } & ResolvedScaleOperation>>();
  const encodingScaleBySlot = new Map<string, ResolvedScaleOperation>();
  for (const consumer of consumers) {
    const value = context.encodings[consumer.slot];
    const scale = mappingScaleOf(value);
    const operation = scale === undefined ? undefined : objectValueOf(scale.operation);
    if (operation === undefined) continue;
    const resolved = resolveScaleSource(context, operation as IRPlotScaleOperation, [
      ...mappingPathOf(consumer.slot),
      'scale',
    ]);
    const scaleOperation = resolved.operation;
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
    assertScaleCompatible(consumer, resolved.source, path);
    encodingScaleByName.set(scaleOperation.name, { slot: consumer.slot, ...resolved });
    encodingScaleBySlot.set(consumer.slot, resolved);
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
    const declaredScale = encodingScaleBySlot.get(consumer.slot);
    const declaresOperation = declaredScale !== undefined;
    if (declaredScale !== undefined) {
      name = declaredScale.operation.name;
      encodingScales.push(declaredScale.operation);
    } else {
      const reference = scale.reference;
      if (typeof reference !== 'string') throw invalidEncoding('Chart scale reference must be non-empty', path);
      name = reference;
      const encodingSource = encodingScaleByName.get(reference)?.source;
      const extensionEntry = extensionScaleByName.get(reference);
      const fallback = fallbackByName.get(reference);
      if (fallback !== undefined && fallback.slot !== consumer.slot) {
        throw invalidEncoding(
          `Chart recipe fallback scale "${reference}" belongs to encoding "${fallback.slot}"`,
          path,
        );
      }
      let resolvedExtension: ResolvedScaleOperation | undefined;
      if (extensionEntry !== undefined) {
        resolvedExtension = resolveScaleSource(context, extensionEntry.operation, path);
        extensionScales[extensionEntry.index] = resolvedExtension.operation;
        name = resolvedExtension.operation.name;
      }
      const source = encodingSource ?? resolvedExtension?.source ?? fallback?.source;
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

  return { scales: encodingScales, extensionScales, positionScales, removedRecipeScales };
};
