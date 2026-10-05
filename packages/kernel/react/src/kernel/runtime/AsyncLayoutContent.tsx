import type { RuntimeDiagnostic } from '@retikz/runtime';
import type {
  AsyncProcessingController,
  AsyncProcessingOptions,
  PreparedAsyncStaticProcessing,
  ProcessingResult,
  ProcessingSource,
} from '@retikz/vanilla';
import { createProcessingControllerAsync, prepareStaticProcessingAsync } from '@retikz/vanilla';
import type { ComponentProps, FC } from 'react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { ProcessingResultHost } from '../../render/processing-result';

/** Layout 异步作者输入的框架桥接属性 */
export type AsyncLayoutContentProps = {
  /** 完整作者输入 */
  source: ProcessingSource;
  /** 固定共享 preparation 配置 */
  options: AsyncProcessingOptions;
  /** 更新方式 */
  mode: 'retained' | 'static';
  /** 成功帧宿主标识 */
  hostKey: string;
  /** renderer 宿主配置 */
  hostProps: Omit<ComponentProps<typeof ProcessingResultHost>, 'result'>;
  /** 已有 Runtime 诊断消费逻辑 */
  deliverDiagnostics: (
    controller: AsyncProcessingController,
    callback: ((diagnostic: RuntimeDiagnostic) => void) | undefined,
  ) => void;
  /** 诊断回调 */
  onDiagnostic?: (diagnostic: RuntimeDiagnostic) => void;
};

/** 只消费 Vanilla Promise 和 committed result，不管理领域计算或发布 revision */
export const AsyncLayoutContent: FC<AsyncLayoutContentProps> = props => {
  const { source, options, mode, hostKey, hostProps, deliverDiagnostics, onDiagnostic } = props;
  const [controller, setController] = useState<AsyncProcessingController>();
  const controllerRef = useRef<AsyncProcessingController>();
  const [staticResult, setStaticResult] = useState<ProcessingResult>();
  const resultRef = useRef<ProcessingResult>();
  const [initialError, setInitialError] = useState<unknown>();
  const onDiagnosticRef = useRef(onDiagnostic);
  useEffect(() => {
    onDiagnosticRef.current = onDiagnostic;
  }, [onDiagnostic]);
  const subscribe = useCallback(
    (notify: () => void) => controller?.subscribe(() => notify()) ?? (() => undefined),
    [controller],
  );
  const read = useCallback(() => controller?.read() ?? staticResult, [controller, staticResult]);
  const result = useSyncExternalStore(subscribe, read, read);

  useEffect(
    () => () => {
      controllerRef.current?.dispose();
      controllerRef.current = undefined;
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const abort = new AbortController();
    const signal = options.signal === undefined ? abort.signal : AbortSignal.any([abort.signal, options.signal]);
    let initialized = false;
    let candidate: PreparedAsyncStaticProcessing | undefined;
    let committed = false;

    const fail = (cause: unknown): void => {
      if (!active || signal.aborted) return;
      if (resultRef.current === undefined) setInitialError(() => cause);
      else if (process.env.NODE_ENV !== 'production') console.warn('[retikz] async Layout preparation failed', cause);
    };

    if (mode === 'static') {
      void prepareStaticProcessingAsync(source, { ...options, signal }, 0)
        .then(next => {
          candidate = next;
          if (!active) {
            next.discard();
            return;
          }

          next.commit();
          committed = true;
          resultRef.current = next.result;
          setStaticResult(next.result);
        })
        .catch(fail);
    } else if (controllerRef.current === undefined) {
      void createProcessingControllerAsync(source, { ...options, signal })
        .then(next => {
          if (!active) {
            next.dispose();
            return;
          }

          initialized = true;
          controllerRef.current = next;
          resultRef.current = next.read();
          setController(next);
          deliverDiagnostics(next, onDiagnosticRef.current);
        })
        .catch(fail);
    } else {
      const current = controllerRef.current;
      void current
        .update(source)
        .then(outcome => {
          if (active && outcome.kind === 'committed') resultRef.current = outcome.result;
        })
        .catch(fail)
        .finally(() => {
          if (active) deliverDiagnostics(current, onDiagnosticRef.current);
        });
    }

    return () => {
      active = false;
      if (!initialized) abort.abort();
      if (candidate !== undefined && !committed) candidate.discard();
    };
  }, [source, options, mode, deliverDiagnostics]);

  if (initialError !== undefined) throw initialError;
  if (result === undefined) return null;

  return <ProcessingResultHost key={hostKey} {...hostProps} result={result} />;
};
