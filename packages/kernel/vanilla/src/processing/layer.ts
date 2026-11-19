import { mergeDefinedProperties } from '@retikz/foundation';

import type { LayerReconcilerOptions } from '../normalize';
import type { InputLayer, InputSceneLayers, LayerOptions } from '../normalize';
import { BuiltinLayerName } from '../normalize';
import type { ProcessingSource } from './types';

/** 仅显式图层使用列表结果 */
export const isLayerSource = (source: ProcessingSource): source is InputSceneLayers =>
  'layers' in source && source.layers !== undefined;

/** 先确定有效模式，不向全量会话传递增量策略 */
export const resolveLayerOptions = <T extends LayerOptions>(
  options: T,
  layer: InputLayer,
): Omit<T, keyof LayerOptions> & {
  compile: NonNullable<LayerOptions['compile']>;
  reconciler: LayerReconcilerOptions;
} => {
  const reconciler = mergeDefinedProperties<LayerReconcilerOptions>([
    options.reconciler,
    layer.name === BuiltinLayerName.Background ? { incremental: false } : undefined,
    layer.reconciler,
  ]);
  const { incremental, updateStrategy, ...shared } = reconciler;
  return {
    ...options,
    compile: mergeDefinedProperties([options.compile, layer.compile]),
    reconciler:
      incremental === false ? { ...shared, incremental: false as const } : { ...shared, incremental, updateStrategy },
  };
};
