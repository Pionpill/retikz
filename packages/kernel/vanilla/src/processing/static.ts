import type { Scene, IRScene } from '@retikz/core';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import type { InputSceneChildren, InputSceneLayers } from '../normalize';
import { asLayerStack, layerZIndex, createEmptyInputRuntimeMetaSnapshot } from '../normalize';
import { assertPreparationActive } from './authoring';
import {
  commitVanillaCompileOutput,
  compileVanillaWithDriver,
  createVanillaCompileDriverSession,
  defaultVanillaCompileDriver,
} from './compile-driver';
import { isLayerSource, resolveLayerOptions } from './layer';
import { prepareProcessingInput, prepareProcessingInputAsync } from './prepare';
import type {
  AsyncProcessingOptions,
  InputPreparedProcessing,
  PreparedAsyncStaticProcessing,
  LayerProcessingResult,
  ProcessingOptions,
  ProcessingResult,
  ProcessingSource,
} from './types';

const EMPTY_ARTIFACTS = Object.freeze([]);

const EMPTY_LAYERS = Object.freeze([]);

const EMPTY_DIAGNOSTICS = Object.freeze([]);

/** 已完成编译、等待宿主确认提交的 static processing 候选结果 */
export type PreparedStaticProcessing<TResult = ProcessingResult> = Pick<
  PreparedAsyncStaticProcessing<TResult>,
  'result' | 'commit'
>;

/** 准备一次 authored static processing，保留 compile driver 的提交时机给宿主 */
export function prepareStaticProcessing(
  source: InputSceneLayers,
  options: ProcessingOptions,
  revision: number,
): PreparedStaticProcessing<LayerProcessingResult>;
export function prepareStaticProcessing(
  source: InputSceneChildren | IRScene,
  options: ProcessingOptions,
  revision: number,
): PreparedStaticProcessing;
export function prepareStaticProcessing(
  source: ProcessingSource,
  options: ProcessingOptions,
  revision: number,
): PreparedStaticProcessing<ProcessingResult | LayerProcessingResult>;
export function prepareStaticProcessing(source: ProcessingSource, options: ProcessingOptions, revision: number) {
  if (isLayerSource(source)) {
    const layers = asLayerStack(source).map(layer => {
      const effective = resolveLayerOptions(options, layer);
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

/** 所有层准备成功后才提交驱动通知 */
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
  assertCurrent?: () => void,
): PreparedStaticProcessing => {
  const input = Object.freeze({
    instance: Object.freeze({}),
    source: prepared.source,
    authoringSites: prepared.authoringSites,
    coreOptions: prepared.coreOptions,
  });
  const session = createVanillaCompileDriverSession(options.compileDriver ?? defaultVanillaCompileDriver, input);
  assertCurrent?.();
  const output = compileVanillaWithDriver(input, session, options.reconciler);
  assertCurrent?.();
  const result = Object.freeze({
    revision,
    scene: output.primary.scene,
    compileResult: output.primary,
    artifacts: Object.freeze([...output.primary.artifacts]),
    layers: Object.freeze([...output.layers]),
    diagnostics: Object.freeze([...output.diagnostics]),
    runtimeMeta: prepared.runtimeMeta,
  });
  let committed = false;

  return Object.freeze({
    result,
    commit: () => {
      if (committed) return;
      committed = true;
      commitVanillaCompileOutput(session, output);
    },
  });
};

/** 先准备完整作者树，再同步编译；发布权由调用方明确消费 */
export function prepareStaticProcessingAsync(
  source: InputSceneLayers,
  options?: AsyncProcessingOptions,
  revision?: number,
): Promise<PreparedAsyncStaticProcessing<LayerProcessingResult>>;
export function prepareStaticProcessingAsync(
  source: InputSceneChildren | IRScene,
  options?: AsyncProcessingOptions,
  revision?: number,
): Promise<PreparedAsyncStaticProcessing>;
export function prepareStaticProcessingAsync(
  source: ProcessingSource,
  options?: AsyncProcessingOptions,
  revision?: number,
): Promise<PreparedAsyncStaticProcessing<ProcessingResult | LayerProcessingResult>>;
export async function prepareStaticProcessingAsync(
  source: ProcessingSource,
  options: AsyncProcessingOptions = {},
  revision = 0,
) {
  const signal = options.signal ?? new AbortController().signal;
  const check = () => assertPreparationActive(signal);
  check();
  let candidate: PreparedStaticProcessing<ProcessingResult | LayerProcessingResult>;
  if (isLayerSource(source)) {
    const layers = [];
    for (const layer of asLayerStack(source)) {
      const effective = resolveLayerOptions(options, layer);
      const prepared = await prepareProcessingInputAsync(source, effective, signal, layer);
      check();
      layers.push({
        name: layer.name,
        zIndex: layerZIndex(layer),
        candidate: prepareStaticProcessingInput(prepared, { ...effective, adapters: undefined }, revision, check),
      });
    }
    candidate = combinePreparedLayers(layers);
  } else {
    const prepared = await prepareProcessingInputAsync(source, options, signal);
    check();
    candidate = prepareStaticProcessingInput(prepared, { ...options, adapters: undefined }, revision, check);
  }
  check();
  let terminal: 'pending' | 'committed' | 'discarded' = 'pending';

  return Object.freeze({
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
  });
}

/** 异步准备作者输入后完成一次编译，返回无需管理会话生命周期的处理结果 */
export function compileToSceneAsync(
  source: InputSceneLayers,
  options?: AsyncProcessingOptions,
): Promise<LayerProcessingResult>;
export function compileToSceneAsync(
  source: InputSceneChildren | IRScene,
  options?: AsyncProcessingOptions,
): Promise<ProcessingResult>;
export function compileToSceneAsync(
  source: ProcessingSource,
  options?: AsyncProcessingOptions,
): Promise<ProcessingResult | LayerProcessingResult>;
export async function compileToSceneAsync(source: ProcessingSource, options: AsyncProcessingOptions = {}) {
  const candidate = await prepareStaticProcessingAsync(source, options, 0);
  if (options.signal?.aborted) {
    candidate.discard();
    assertPreparationActive(options.signal);
  }

  candidate.commit();

  return candidate.result;
}

/** 用给定 revision 处理并立即提交一次 authored static result */
export const processToResult = (source: ProcessingSource, options: ProcessingOptions, revision: number) => {
  const prepared = prepareStaticProcessing(source, options, revision);
  prepared.commit();
  return prepared.result;
};

/** 同步编译 InputScene 或 Core IR，返回 revision 为 0 且无需释放的处理结果 */
export function compileToScene(source: InputSceneLayers, options?: ProcessingOptions): LayerProcessingResult;
export function compileToScene(source: InputSceneChildren | IRScene, options?: ProcessingOptions): ProcessingResult;
export function compileToScene(
  source: ProcessingSource,
  options?: ProcessingOptions,
): ProcessingResult | LayerProcessingResult;
export function compileToScene(source: ProcessingSource, options: ProcessingOptions = {}) {
  return processToResult(source, options, 0);
}

/** 将预编译 Scene 封装为不可更新的 static processing result */
export const processToStaticResult = (scene: Scene, _options: ProcessingOptions = {}): StaticProcessingResult => {
  void _options;
  return Object.freeze({
    revision: 0,
    scene,
    compileResult: undefined,
    artifacts: EMPTY_ARTIFACTS,
    layers: EMPTY_LAYERS,
    diagnostics: EMPTY_DIAGNOSTICS,
    runtimeMeta: createEmptyInputRuntimeMetaSnapshot(),
  });
};

/** 预编译 Scene 的固定 revision processing 结果 */
export type StaticProcessingResult = Omit<ProcessingResult, 'compileResult'> & {
  /** 预编译 Scene 没有 authored Core compile result */
  compileResult: undefined;
};
