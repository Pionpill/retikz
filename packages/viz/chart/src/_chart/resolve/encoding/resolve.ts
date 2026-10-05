import type { ChartEncodingResolution, ChartEncodingResolveContext } from '../../contract/recipe';
import type { IRChartSource } from '../../schemas';
import { resolveChartEncodingScales } from './scale';
import { resolveChartEncodingTransforms } from './transform';
import type { ChartEncodingFieldConsumer } from './types';

/**
 * 把 exact recipe field mappings 解析为 direct bindings 与有序 Plot operations
 * @description schema 继续由具体 chartType 拥有；该 helper 只编排 owner Definition、ordered slots 与 consumer 连接
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 * @template TEncodingSlot 当前 recipe 允许的字段映射槽位名称
 * @template TConsumerSlot 当前消费方实际使用的字段映射槽位子集
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
    transform: transforms.records.map(record => ({
      operation: record.operation,
      ...(record.dataExecution === undefined ? {} : { dataExecution: record.dataExecution }),
    })),
    scales: scales.scales,
    extensionScales: scales.extensionScales,
    positionScales: scales.positionScales,
    removedRecipeScales: scales.removedRecipeScales,
  };
};
