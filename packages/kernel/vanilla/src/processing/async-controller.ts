import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import { assertPreparationActive } from './authoring';
import { createPreparedInputProcessingController } from './internal/controller';
import { prepareProcessingInputAsync } from './prepare';
import type { AsyncProcessingController, AsyncProcessingOptions, ProcessingSource } from './types';

/** 共享作者 preparation 的请求失效控制；事务与 committed revision 仍由同步 controller 管理 */
export const createProcessingControllerAsync = async (
  source: ProcessingSource,
  options: AsyncProcessingOptions = {},
): Promise<AsyncProcessingController> => {
  const fixed: AsyncProcessingOptions = Object.freeze({
    ...options,
    compile: options.compile === undefined ? undefined : Object.freeze({ ...options.compile }),
    adapters: options.adapters === undefined ? undefined : Object.freeze([...options.adapters]),
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
    controller = createPreparedInputProcessingController(input, { ...fixed, adapters: undefined }, () =>
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
