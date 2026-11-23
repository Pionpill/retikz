import type { IRScene } from '@retikz/core';
import { SceneReconciler } from '@retikz/reconciler';

import type { LayerReconcilerOptions, InputScene, InputLayer } from '../../normalize';
import { normalizeSceneLayers, layerZIndex } from '../../normalize';
import { mergeLayerOptions, prepareProcessingInput } from '../_input';
import type { InputPreparedProcessing, ProcessingOptions } from '../_input';
import type { VanillaCompileOutput } from './result-extension';
import { ResultExtensionHost, prepareCompileOutput } from './result-extension';
import type { LayerProcessingResult, ProcessingResult } from './types';

/** 已完成编译、等待宿主确认提交的 static processing 候选结果 */
export type PreparedStaticProcessing = Readonly<{
  /** 已完成的编译结果 */
  result: ProcessingResult;
  /** 宿主采用结果后通知扩展；重复调用不重复通知 */
  commit: () => void;
}>;

/** 同步编译单图，扩展在宿主采用后才收到通知 */
export const prepareStaticProcessing = (
  source: InputScene | IRScene,
  options: ProcessingOptions,
  revision: number,
): PreparedStaticProcessing => prepareStaticProcessingInput(prepareProcessingInput(source, options), options, revision);

/** 各层独立编译；全部成功后才发送提交通知 */
export const compileLayers = (
  layers: ReadonlyArray<InputLayer>,
  options: ProcessingOptions = {},
): LayerProcessingResult => {
  const entries = normalizeSceneLayers(layers).map(layer => {
    const effective = mergeLayerOptions(options, layer);
    const candidate = prepareStaticProcessingInput(
      prepareProcessingInput(layer.scene, effective, layer.name),
      effective,
      0,
    );
    return { layer, candidate };
  });
  const result = Object.freeze(
    entries.map(({ layer, candidate }) =>
      Object.freeze({ name: layer.name, zIndex: layerZIndex(layer), result: candidate.result }),
    ),
  );
  for (const { candidate } of entries) candidate.commit();
  return result;
};

/** 唯一的同步编译过程，消费已经完整准备的作者输入 */
const prepareStaticProcessingInput = (
  prepared: InputPreparedProcessing,
  options: ProcessingOptions,
  revision: number,
): PreparedStaticProcessing => {
  const session =
    options.compileResultExtension &&
    ResultExtensionHost.open(options.compileResultExtension, { ...prepared, instance: {} });
  const output = compileVanillaWithResultExtension(prepared, session, options.reconciler);
  const result = Object.freeze({
    revision,
    compileResult: output.primary,
    processingDiagnostics: output.processingDiagnostics,
  });
  let committed = false;

  return {
    result,
    commit: () => {
      if (committed) return;
      committed = true;
      session?.notifyCommit(output);
    },
  };
};

/** 同步编译 InputScene 或 Core IR，返回 revision 为 0 且无需释放的处理结果 */
export function compileToScene(source: InputScene | IRScene, options: ProcessingOptions = {}): ProcessingResult {
  const prepared = prepareStaticProcessing(source, options, 0);
  prepared.commit();
  return prepared.result;
}

/** 为 static/SSR 执行与 retained Computation 同构的一次扩展编译 */
export const compileVanillaWithResultExtension = (
  input: InputPreparedProcessing,
  session: ResultExtensionHost | undefined,
  execution?: LayerReconcilerOptions,
): VanillaCompileOutput => {
  const reconciler = new SceneReconciler(input.coreOptions, execution);
  try {
    const output = prepareCompileOutput(reconciler.mount(input.source).compilation, session);
    const diagnostics = reconciler.diagnostics();
    return diagnostics.length === 0
      ? output
      : {
          ...output,
          processingDiagnostics: Object.freeze([...output.processingDiagnostics, ...diagnostics]),
        };
  } finally {
    reconciler.dispose();
  }
};
