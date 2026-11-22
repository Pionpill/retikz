import type { IRScene } from '@retikz/core';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import type { InputLayer, InputSceneChildren, InputSceneLayers } from '../../normalize';
import { normalizeSceneLayers } from '../../normalize';
import { isLayerSource, mergeLayerOptions, assertPreparationActive, prepareProcessingInputAsync } from '../_input';
import type { InputPreparedProcessing, AsyncProcessingOptions, ProcessingSource } from '../_input';
import { createLayerController } from './layer';
import { SceneRuntime } from './runtime';
import type { AsyncLayerProcessingController, LayerProcessingUpdateOutcome, AsyncProcessingController } from './types';

/** 共享作者 preparation 的请求失效控制；事务与 committed revision 仍由同步 controller 管理 */
const createSingleControllerAsync = async (
  source: ProcessingSource,
  options: AsyncProcessingOptions = {},
): Promise<AsyncProcessingController> => {
  const lifecycle = options.signal;
  const signal = lifecycle ?? new AbortController().signal;
  const input = await prepareProcessingInputAsync(source, options, signal);
  assertPreparationActive(signal);
  const controller = SceneRuntime.fromPrepared(input, options, () => assertPreparationActive(signal));

  let disposed = false;
  let request = 0;
  let pending: AbortController | undefined;
  const diagnostics: Array<unknown> = [];

  const assertActive = (): void => {
    if (disposed) throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Processing controller is disposed');
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    request++;
    pending?.abort();
    lifecycle?.removeEventListener('abort', dispose);
    controller.dispose();
  };

  lifecycle?.addEventListener('abort', dispose, { once: true });
  if (lifecycle?.aborted) {
    dispose();
    assertActive();
  }

  return {
    read: controller.read,
    subscribe: controller.subscribe,
    diagnostics: () => {
      if (diagnostics.length === 0) return controller.diagnostics();
      const result = [...diagnostics, ...controller.diagnostics()];
      diagnostics.length = 0;
      return result;
    },
    dispose,
    update: async nextSource => {
      assertActive();
      const current = ++request;
      pending?.abort();
      const abort = new AbortController();
      pending = abort;
      let transactionStarted = false;

      try {
        const prepared = await prepareProcessingInputAsync(nextSource, options, abort.signal);
        if (disposed || current !== request) return { kind: 'superseded' };

        assertPreparationActive(abort.signal);
        transactionStarted = true;
        controller.updatePrepared(prepared, () => assertPreparationActive(abort.signal));

        return { kind: 'committed', result: controller.read() };
      } catch (cause) {
        if (disposed || current !== request) return { kind: 'superseded' };
        if (!transactionStarted) diagnostics.push(cause);
        throw cause;
      } finally {
        if (current === request) pending = undefined;
      }
    },
  } satisfies AsyncProcessingController;
};

/** 同一层的新准备取代旧请求；其它层的准备可独立完成 */
const createAsyncLayerController = async (
  source: InputSceneLayers,
  options: AsyncProcessingOptions,
): Promise<AsyncLayerProcessingController> => {
  const lifecycle = new AbortController();
  const stop = () => lifecycle.abort(options.signal?.reason);
  if (options.signal?.aborted) stop();
  options.signal?.addEventListener('abort', stop, { once: true });
  const pending = new Map<string, AbortController>();
  let stackRequest: AbortController | undefined;
  const prepareLayer = (scene: Omit<InputSceneLayers, 'layers'>, layer: InputLayer, signal: AbortSignal) =>
    prepareProcessingInputAsync(
      { ...scene, children: layer.children },
      mergeLayerOptions(options, layer),
      signal,
      layer,
    );
  const prepareStack = async (scene: InputSceneLayers, signal: AbortSignal) => {
    const ready = new Map<string, InputPreparedProcessing>();
    for (const layer of normalizeSceneLayers(scene)) ready.set(layer.name, await prepareLayer(scene, layer, signal));
    assertPreparationActive(signal);
    return ready;
  };
  const start = async () => {
    try {
      const initial = await prepareStack(source, lifecycle.signal);
      return createLayerController(source, options, initial, () => assertPreparationActive(lifecycle.signal));
    } catch (cause) {
      options.signal?.removeEventListener('abort', stop);
      throw cause;
    }
  };
  const controller = await start();
  const cancelAll = () => {
    stackRequest?.abort();
    for (const abort of pending.values()) abort.abort();
    pending.clear();
  };
  const dispose = () => {
    cancelAll();
    options.signal?.removeEventListener('abort', stop);
    lifecycle.signal.removeEventListener('abort', dispose);
    lifecycle.abort();
    controller.dispose();
  };
  lifecycle.signal.addEventListener('abort', dispose, { once: true });
  if (lifecycle.signal.aborted) {
    dispose();
    assertPreparationActive(lifecycle.signal);
  }
  const request = async (next: InputSceneLayers | InputLayer): Promise<LayerProcessingUpdateOutcome> => {
    assertPreparationActive(lifecycle.signal);
    const abort = new AbortController();
    if ('name' in next) {
      stackRequest?.abort();
      pending.get(next.name)?.abort();
      pending.set(next.name, abort);
    } else {
      cancelAll();
      stackRequest = abort;
    }
    const check = () => assertPreparationActive(abort.signal);
    try {
      if ('name' in next) {
        const prepared = await prepareLayer(controller.readRoot(), next, abort.signal);
        check();
        controller.replacePreparedLayer(next, prepared, check);
      } else {
        const ready = await prepareStack(next, abort.signal);
        check();
        controller.updatePreparedStack(next, ready, check);
      }
      return { kind: 'committed', result: controller.read() };
    } catch (cause) {
      if (abort.signal.aborted) return { kind: 'superseded' };
      throw cause;
    } finally {
      if ('name' in next && pending.get(next.name) === abort) pending.delete(next.name);
      if (stackRequest === abort) stackRequest = undefined;
    }
  };
  const cancelLayer = (name: string) => {
    stackRequest?.abort();
    pending.get(name)?.abort();
  };
  return {
    read: controller.read,
    subscribe: controller.subscribe,
    diagnostics: controller.diagnostics,
    dispose,
    getScopeId: controller.getScopeId,
    update: request,
    replaceLayer: request,
    removeLayer: name => {
      cancelLayer(name);
      controller.removeLayer(name);
    },
    setLayerOrder: (name, order) => {
      cancelLayer(name);
      controller.setLayerOrder(name, order);
    },
    updateLayer: (name, batch, expected) => {
      cancelLayer(name);
      controller.updateLayer(name, batch, expected);
    },
  };
};

/** 创建与输入形式一致的异步控制器 */
export function createProcessingControllerAsync(
  source: InputSceneLayers,
  options?: AsyncProcessingOptions,
): Promise<AsyncLayerProcessingController>;
export function createProcessingControllerAsync(
  source: InputSceneChildren | IRScene,
  options?: AsyncProcessingOptions,
): Promise<AsyncProcessingController>;
export function createProcessingControllerAsync(
  source: ProcessingSource,
  options?: AsyncProcessingOptions,
): Promise<AsyncProcessingController | AsyncLayerProcessingController>;
export function createProcessingControllerAsync(source: ProcessingSource, options: AsyncProcessingOptions = {}) {
  return isLayerSource(source)
    ? createAsyncLayerController(source, options)
    : createSingleControllerAsync(source, options);
}
