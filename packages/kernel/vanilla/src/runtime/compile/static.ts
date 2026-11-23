import type { IRScene } from '@retikz/core';
import type { CompileResult } from '@retikz/reconciler';
import { SceneReconciler } from '@retikz/reconciler';

import type { NamedLayerResult, InputScene, InputLayer } from '../../normalize';
import { normalizeSceneLayers, layerZIndex } from '../../normalize';
import { mergeLayerOptions, prepareProcessingInput } from '../_input';
import type { InputPreparedProcessing, ProcessingOptions } from '../_input';
import { ResultExtensionHost } from './result-extension';

/** 编译已准备的单图；层栈将通知保留到所有层都成功后 */
const compilePreparedScene = (
  prepared: InputPreparedProcessing,
  options: ProcessingOptions,
  notifications?: Array<() => void>,
): CompileResult => {
  const session =
    options.compileResultExtension &&
    ResultExtensionHost.open(options.compileResultExtension, { ...prepared, instance: {} });
  const reconciler = new SceneReconciler(prepared.coreOptions, options.reconciler);
  let result: CompileResult;
  try {
    const { compilation } = reconciler.mount(prepared.source);
    session?.prepare(compilation);
    result = compilation.result;
  } finally {
    reconciler.dispose();
  }
  if (session) {
    if (notifications) notifications.push(() => session.notifyCommit(result));
    else session.notifyCommit(result);
  }
  return result;
};

/** 同步编译 InputScene 或 Core IR，直接返回协调器产出的 Scene 与 artifacts */
export const compileToScene = (source: InputScene | IRScene, options: ProcessingOptions = {}): CompileResult =>
  compilePreparedScene(prepareProcessingInput(source, options), options);

/** 各层独立编译；全部成功后才发送提交通知 */
export const compileLayers = (
  layers: ReadonlyArray<InputLayer>,
  options: ProcessingOptions = {},
): ReadonlyArray<NamedLayerResult<CompileResult>> => {
  const notifications: Array<() => void> = [];
  const results = normalizeSceneLayers(layers).map(layer => {
    const effective = mergeLayerOptions(options, layer);
    const prepared = prepareProcessingInput(layer.scene, effective, layer.name);
    const result = compilePreparedScene(prepared, effective, notifications);
    return Object.freeze({ name: layer.name, zIndex: layerZIndex(layer), result });
  });
  for (const notify of notifications) notify();
  return Object.freeze(results);
};
