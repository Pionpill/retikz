import type { IRJsonObject } from '@retikz/core';
import type { IRPlotScaleOperation } from '@retikz/plot';

import type { ChartEncodingResolveContext, ChartResolvedFieldMapping } from '../../contract/recipe';
import type { IRChartSource } from '../../schemas';
import type { ChartEncodingFieldConsumer, ResolvedScaleSource } from './types';

import { invalidEncoding, mappingPathOf, mappingScaleOf, objectValueOf } from './shared';

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

/** exact encoding scale declaration、reference 与 recipe fallback 的连接结果 */
export type ChartEncodingScaleResolution = Readonly<{
  scales: ReadonlyArray<IRPlotScaleOperation>;
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
  directEncodings: IRJsonObject,
): ChartEncodingScaleResolution => {
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

  return { scales: encodingScales, positionScales, removedRecipeScales };
};
