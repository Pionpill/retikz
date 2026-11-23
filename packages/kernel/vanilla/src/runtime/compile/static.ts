import { SceneReconciler } from '@retikz/reconciler';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import type { LayerReconcilerOptions, InputSceneLayers } from '../../normalize';
import { normalizeSceneLayers, layerZIndex } from '../../normalize';
import {
  isLayerSource,
  mergeLayerOptions,
  assertPreparationActive,
  prepareProcessingInput,
  prepareProcessingInputAsync,
} from '../_input';
import type { AsyncProcessingOptions, InputPreparedProcessing, ProcessingOptions, ProcessingSource } from '../_input';
import type { VanillaCompileOutput } from './result-extension';
import { ResultExtensionHost, prepareCompileOutput } from './result-extension';
import type { PreparedAsyncStaticProcessing, LayerProcessingResult, ProcessingResult } from './types';

/** 已完成编译、等待宿主确认提交的 static processing 候选结果 */
export type PreparedStaticProcessing<TResult = ProcessingResult> = Pick<
  PreparedAsyncStaticProcessing<TResult>,
  'result' | 'commit'
>;

/** 分层输入返回逐层结果，单场景输入返回一份编译结果 */
type StaticResultFor<TSource extends ProcessingSource> = TSource extends InputSceneLayers
  ? LayerProcessingResult
  : ProcessingResult;

/** 准备一次 authored static processing，保留 compile result extension 的提交时机给宿主 */
export function prepareStaticProcessing<TSource extends ProcessingSource>(
  source: TSource,
  options: ProcessingOptions,
  revision: number,
): PreparedStaticProcessing<StaticResultFor<TSource>>;
export function prepareStaticProcessing(source: ProcessingSource, options: ProcessingOptions, revision: number) {
  if (isLayerSource(source)) {
    const layers = normalizeSceneLayers(source).map(layer => {
      const effective = mergeLayerOptions(options, layer);
      return {
        name: layer.name,
        zIndex: layerZIndex(layer),
        candidate: prepareStaticProcessingInput(prepareProcessingInput(source, effective, layer), effective, revision),
      };
    });
    return combinePreparedLayers(layers);
  }
  return prepareStaticProcessingInput(prepareProcessingInput(source, options), options, revision);
}

/** 所有层准备成功后才发送提交成功通知 */
const combinePreparedLayers = (
  layers: ReadonlyArray<{ name: string; zIndex: number; candidate: PreparedStaticProcessing }>,
): PreparedStaticProcessing<LayerProcessingResult> => ({
  result: Object.freeze(
    layers.map(({ name, zIndex, candidate }) => Object.freeze({ name, zIndex, result: candidate.result })),
  ),
  commit: () => {
    for (const layer of layers) layer.candidate.commit();
  },
});

/** 唯一的同步编译过程，消费已经完整准备的作者输入 */
const prepareStaticProcessingInput = (
  prepared: InputPreparedProcessing,
  options: ProcessingOptions,
  revision: number,
  signal?: AbortSignal,
): PreparedStaticProcessing => {
  const session =
    options.compileResultExtension &&
    ResultExtensionHost.open(options.compileResultExtension, { ...prepared, instance: {} });
  if (signal) assertPreparationActive(signal);
  const output = compileVanillaWithResultExtension(prepared, session, options.reconciler);
  if (signal) assertPreparationActive(signal);
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

/** 先准备完整作者树，再同步编译；发布权由调用方明确消费 */
export function prepareStaticProcessingAsync<TSource extends ProcessingSource>(
  source: TSource,
  options?: AsyncProcessingOptions,
  revision?: number,
): Promise<PreparedAsyncStaticProcessing<StaticResultFor<TSource>>>;
export async function prepareStaticProcessingAsync(
  source: ProcessingSource,
  options: AsyncProcessingOptions = {},
  revision = 0,
) {
  const signal = options.signal ?? new AbortController().signal;
  assertPreparationActive(signal);
  let candidate: PreparedStaticProcessing<ProcessingResult | LayerProcessingResult>;
  if (isLayerSource(source)) {
    const layers = [];
    for (const layer of normalizeSceneLayers(source)) {
      const effective = mergeLayerOptions(options, layer);
      const prepared = await prepareProcessingInputAsync(source, effective, signal, layer);
      assertPreparationActive(signal);
      layers.push({
        name: layer.name,
        zIndex: layerZIndex(layer),
        candidate: prepareStaticProcessingInput(prepared, effective, revision, signal),
      });
    }
    candidate = combinePreparedLayers(layers);
  } else {
    const prepared = await prepareProcessingInputAsync(source, options, signal);
    assertPreparationActive(signal);
    candidate = prepareStaticProcessingInput(prepared, options, revision, signal);
  }
  assertPreparationActive(signal);
  let terminal: 'pending' | 'committed' | 'discarded' = 'pending';

  return {
    result: candidate.result,
    commit: () => {
      if (terminal === 'committed') return;
      if (terminal === 'discarded')
        throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Cannot commit a discarded candidate');

      assertPreparationActive(signal);
      terminal = 'committed';
      candidate.commit();
    },
    discard: () => {
      if (terminal === 'discarded') return;
      if (terminal === 'committed')
        throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Cannot discard a committed candidate');

      terminal = 'discarded';
    },
  };
}

/** 异步准备作者输入后完成一次编译，返回无需管理会话生命周期的处理结果 */
export async function compileToSceneAsync<TSource extends ProcessingSource>(
  source: TSource,
  options: AsyncProcessingOptions = {},
): Promise<StaticResultFor<TSource>> {
  const candidate = await prepareStaticProcessingAsync(source, options, 0);
  candidate.commit();
  return candidate.result;
}

/** 同步编译 InputScene 或 Core IR，返回 revision 为 0 且无需释放的处理结果 */
export function compileToScene<TSource extends ProcessingSource>(
  source: TSource,
  options: ProcessingOptions = {},
): StaticResultFor<TSource> {
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
