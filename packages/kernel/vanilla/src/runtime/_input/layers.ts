import { mergeDefinedProperties } from '@retikz/foundation';
import { ReconcilerMode } from '@retikz/reconciler';

import { BuiltinLayerName } from '../../normalize';
import type { InputLayer, LayerOptions, LayerReconcilerOptions } from '../../normalize';

/** 按调用方配置、背景层默认值、显式图层配置的优先顺序合并，仅增量模式保留更新策略 */
export const mergeLayerOptions = (
  options: LayerOptions,
  layer: InputLayer,
): {
  compile: NonNullable<LayerOptions['compile']>;
  reconciler: LayerReconcilerOptions;
} => {
  const reconciler = mergeDefinedProperties<LayerReconcilerOptions>([
    options.reconciler,
    layer.name === BuiltinLayerName.Background ? { mode: ReconcilerMode.Full } : undefined,
    layer.config?.reconciler,
  ]);
  const { mode = ReconcilerMode.Full, updateStrategy, ...shared } = reconciler;
  return {
    compile: mergeDefinedProperties([options.compile, layer.config?.compile]),
    reconciler: mode === ReconcilerMode.Incremental ? { ...shared, mode, updateStrategy } : { ...shared, mode },
  };
};
