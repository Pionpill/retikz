import type { IRScene } from '@retikz/core';
import type { CompileResult } from '@retikz/reconciler';
import { SceneReconciler } from '@retikz/reconciler';

import type { NamedLayerResult, InputScene, InputLayer } from '../../normalize';
import { normalizeSceneLayers, layerZIndex } from '../../normalize';
import { mergeLayerOptions, prepareProcessingInput } from '../_input';
import type { InputPreparedProcessing, ProcessingOptions } from '../_input';

/** 通过临时协调器编译，成功与失败都释放实例 */
const compilePreparedScene = (prepared: InputPreparedProcessing, options: ProcessingOptions): CompileResult => {
  const reconciler = new SceneReconciler(prepared.coreOptions, options.reconciler);
  try {
    return reconciler.mount(prepared.source).compilation.result;
  } finally {
    reconciler.dispose();
  }
};

/** 同步编译 InputScene 或 Core IR，直接返回协调器产出的 Scene 与 artifacts */
export const compileToScene = (source: InputScene | IRScene, options: ProcessingOptions = {}): CompileResult =>
  compilePreparedScene(prepareProcessingInput(source, options.compile), options);

/** 各层独立编译，全部成功后返回有序结果 */
export const compileLayers = (
  layers: ReadonlyArray<InputLayer>,
  options: ProcessingOptions = {},
): ReadonlyArray<NamedLayerResult<CompileResult>> => {
  return Object.freeze(
    normalizeSceneLayers(layers).map(layer => {
      const effective = mergeLayerOptions(options, layer);
      const prepared = prepareProcessingInput(layer.scene, effective.compile, layer.name);
      const result = compilePreparedScene(prepared, effective);
      return Object.freeze({ name: layer.name, zIndex: layerZIndex(layer), result });
    }),
  );
};
