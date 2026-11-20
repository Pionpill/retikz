import type { IRScene } from '@retikz/core';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import type { InputLayer, InputSceneChildren, InputSceneLayers } from '../normalize';
import { asLayerStack } from '../normalize';
import { assertPreparationActive } from './authoring';
import { createPreparedInputProcessingController } from './internal';
import { isLayerSource, resolveLayerOptions } from './layer';
import { createLayerController } from './layer-controller';
import { prepareProcessingInputAsync } from './prepare';
import type { AsyncLayerProcessingController, LayerProcessingUpdateOutcome, InputPreparedProcessing } from './types';
import type { AsyncProcessingController, AsyncProcessingOptions, ProcessingSource } from './types';

/** 共享作者 preparation 的请求失效控制；事务与 committed revision 仍由同步 controller 管理 */
const createSingleControllerAsync = async (
  source: ProcessingSource,
  options: AsyncProcessingOptions = {},
): Promise<AsyncProcessingController> => {
  const fixed: AsyncProcessingOptions = Object.freeze({
    ...options,
    compile: options.compile === undefined ? undefined : Object.freeze({ ...options.compile }),
  });
  const initialAbort = new AbortController();
  const lifecycle = fixed.signal;
  const abortInitial = (): void => initialAbort.abort(lifecycle?.reason);
  if (lifecycle?.aborted) abortInitial();
  lifecycle?.addEventListener('abort', abortInitial, { once: true });
  let input;

  try {
    input = await prepareProcessingInputAsync(source, fixed, initialAbort.signal);
    assertPreparationActive(initialAbort.signal);
  } catch (cause) {
    lifecycle?.removeEventListener('abort', abortInitial);
    throw cause;
  }

  let controller;

  try {
    controller = createPreparedInputProcessingController(input, fixed, () =>
      assertPreparationActive(initialAbort.signal),
    );
  } finally {
    lifecycle?.removeEventListener('abort', abortInitial);
  }

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

  return Object.freeze({
    read: controller.read,
    subscribe: listener => {
      assertActive();
      return controller.subscribe(listener);
    },
    diagnostics: () => {
      const result = Object.freeze([...diagnostics, ...controller.diagnostics()]);
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
        const prepared = await prepareProcessingInputAsync(nextSource, fixed, abort.signal);
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
  } satisfies AsyncProcessingController);
};

/** 同一层的新准备取代旧请求；其它层的准备可独立完成 */
const createAsyncLayerController = async (
  source: InputSceneLayers,
  options: AsyncProcessingOptions,
): Promise<AsyncLayerProcessingController> => {
  const rootFields = ({ layers: _layers, ...fields }: InputSceneLayers) => fields;
  let root = rootFields(source);
  const lifecycle = new AbortController();
  const stop = () => lifecycle.abort(options.signal?.reason);
  if (options.signal?.aborted) stop();
  options.signal?.addEventListener('abort', stop, { once: true });
  const pending = new Map<string, AbortController>();
  let stackRequest: AbortController | undefined;
  const prepareLayer = (scene: Omit<InputSceneLayers, 'layers'>, layer: InputLayer, signal: AbortSignal) =>
    prepareProcessingInputAsync(
      { ...scene, children: layer.children },
      resolveLayerOptions(options, layer),
      signal,
      layer,
    );
  const prepareStack = async (scene: InputSceneLayers, signal: AbortSignal) => {
    const ready = new Map<string, InputPreparedProcessing>();
    for (const layer of asLayerStack(scene)) ready.set(layer.name, await prepareLayer(scene, layer, signal));
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
        const prepared = await prepareLayer(root, next, abort.signal);
        check();
        controller.replacePreparedLayer(next, prepared, check);
      } else {
        const ready = await prepareStack(next, abort.signal);
        check();
        controller.updatePreparedStack(next, ready, check);
        root = rootFields(next);
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
