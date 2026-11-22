import { mergeDefinedProperties } from '@retikz/foundation';
import { ReconcilerMode } from '@retikz/reconciler';

import { BuiltinLayerName } from '../../normalize';
import type { InputLayer, InputSceneLayers, LayerOptions, LayerReconcilerOptions } from '../../normalize';
import type { ProcessingSource } from './types';

/** 仅显式图层使用列表结果 */
export const isLayerSource = (source: ProcessingSource): source is InputSceneLayers =>
  'layers' in source && source.layers !== undefined;

/** 按调用方配置、背景层默认值、显式图层配置的优先顺序合并，仅增量模式保留更新策略 */
export const mergeLayerOptions = <T extends LayerOptions>(
  options: T,
  layer: InputLayer,
): Omit<T, keyof LayerOptions> & {
  compile: NonNullable<LayerOptions['compile']>;
  reconciler: LayerReconcilerOptions;
} => {
  const reconciler = mergeDefinedProperties<LayerReconcilerOptions>([
    options.reconciler,
    layer.name === BuiltinLayerName.Background ? { mode: ReconcilerMode.Full } : undefined,
    layer.reconciler,
  ]);
  const { mode = ReconcilerMode.Full, updateStrategy, ...shared } = reconciler;
  return {
    ...options,
    compile: mergeDefinedProperties([options.compile, layer.compile]),
    reconciler: mode === ReconcilerMode.Incremental ? { ...shared, mode, updateStrategy } : { ...shared, mode },
  };
};
