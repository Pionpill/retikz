import type { ChartEncodingResolution, ChartEncodingResolveContext } from '../../contract/recipe';
import type { IRChartSource } from '../../schemas';
import type { ChartEncodingFieldConsumer } from './types';

import { resolveChartEncodingScales } from './scale';
import { resolveChartEncodingTransforms } from './transform';

/**
 * 把 exact recipe field mappings 解析为 direct bindings 与有序 Plot operations
 * @description schema 继续由具体 chartType 拥有；该 helper 只编排 owner Definition、ordered slots 与 consumer 连接
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
  const transforms = resolveChartEncodingTransforms(context, encodingSlots, consumers);
  const scales = resolveChartEncodingScales(context, consumers, transforms.encodings);
  return {
    encodings: transforms.encodings,
    transform: transforms.records.map(record => record.operation),
    scales: scales.scales,
    positionScales: scales.positionScales,
    removedRecipeScales: scales.removedRecipeScales,
  };
};
