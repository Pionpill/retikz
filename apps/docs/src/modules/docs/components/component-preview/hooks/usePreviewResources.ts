import { useEffect, useMemo, useState } from 'react';

import type { LoadedPreviewResources, PreviewDemoModule, PreviewResourceRequest } from '../registry';

import { demoModuleLoaders, loadPreviewResources, resolvePreviewResourceTarget } from '../registry';

/** ComponentPreview 的异步资源状态。 */
export type PreviewResourcesState =
  | { status: 'idle'; key: null }
  | { status: 'missing'; key: string }
  | { status: 'loading'; key: string }
  | { status: 'ready'; key: string; resources: LoadedPreviewResources }
  | { status: 'error'; key: string; message: string };

type StoredPreviewResourcesState = {
  requestKey: string;
  state: Extract<PreviewResourcesState, { status: 'ready' | 'error' }>;
};

const requestKeyOf = (request: PreviewResourceRequest, key: string): string =>
  JSON.stringify([
    key,
    request.lang,
    request.controlName,
    request.controlsDisabled,
    request.diffFrom,
    request.sourceFiles.map(file => [file.file, file.diffFrom]),
  ]);

/** 按当前 preview key 加载资源，并隔离过期路由请求。 */
export const usePreviewResources = (request: PreviewResourceRequest | null): PreviewResourcesState => {
  const target = useMemo(() => (request === null ? null : resolvePreviewResourceTarget(request)), [request]);
  const requestKey = request === null || target === null ? null : requestKeyOf(request, target.key);
  const [stored, setStored] = useState<StoredPreviewResourcesState | null>(null);

  useEffect(() => {
    if (request === null || target === null || target.status === 'missing' || requestKey === null) return;
    let active = true;
    void loadPreviewResources(request)
      .then(result => {
        if (!active || result.status === 'missing') return;
        setStored({ requestKey, state: { status: 'ready', key: result.key, resources: result.resources } });
      })
      .catch(error => {
        if (!active) return;
        setStored({
          requestKey,
          state: {
            status: 'error',
            key: target.key,
            message: error instanceof Error ? error.message : String(error),
          },
        });
      });
    return () => {
      active = false;
    };
  }, [request, requestKey, target]);

  if (request === null || target === null || requestKey === null) return { status: 'idle', key: null };
  if (target.status === 'missing') return target;
  if (stored?.requestKey !== requestKey) return { status: 'loading', key: target.key };
  return stored.state;
};

/** 缩略图只需要 demo module。 */
export type PreviewDemoModuleState =
  | { status: 'idle'; key: null }
  | { status: 'missing'; key: string }
  | { status: 'loading'; key: string }
  | { status: 'ready'; key: string; module: PreviewDemoModule }
  | { status: 'error'; key: string; message: string };

type StoredPreviewDemoModuleState = {
  key: string;
  state: Extract<PreviewDemoModuleState, { status: 'ready' | 'error' }>;
};

/** 按 key 加载缩略图所需的单个 demo module。 */
export const usePreviewDemoModule = (key: string | null): PreviewDemoModuleState => {
  const loader = key === null ? undefined : demoModuleLoaders[key];
  const [stored, setStored] = useState<StoredPreviewDemoModuleState | null>(null);

  useEffect(() => {
    if (key === null || loader === undefined) return;
    let active = true;
    void loader()
      .then(module => {
        if (active) setStored({ key, state: { status: 'ready', key, module } });
      })
      .catch(error => {
        if (!active) return;
        setStored({
          key,
          state: {
            status: 'error',
            key,
            message: error instanceof Error ? error.message : String(error),
          },
        });
      });
    return () => {
      active = false;
    };
  }, [key, loader]);

  if (key === null) return { status: 'idle', key: null };
  if (loader === undefined) return { status: 'missing', key };
  if (stored?.key !== key) return { status: 'loading', key };
  return stored.state;
};
