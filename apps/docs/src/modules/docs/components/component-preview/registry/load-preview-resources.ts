import type { ComponentPreviewFileConfig } from '../types';
import type { PreviewDemoModule, PreviewLoader, PreviewVanillaModule } from './contents';

import {
  buildIrJsonKey,
  buildSourceFileKey,
  buildVanillaKey,
  demoModuleLoaders,
  demoSourceLoaders,
  irJsonOverrideLoaders,
  localSourceFileLoaders,
  resolveDemoKey,
  resolveSourceBaselineFilename,
  vanillaModuleLoaders,
  vanillaOverrideLoaders,
} from './contents';
import { controlModuleLoaders, resolveControlsKey } from './controls';

/** 单个 ComponentPreview 的资源请求。 */
export type PreviewResourceRequest = {
  segments: Array<string>;
  name: string;
  lang: string;
  controlName: string | null;
  controlsDisabled: boolean;
  sourceFiles: Array<ComponentPreviewFileConfig>;
  diffFrom?: string;
};

/** 当前 preview 已加载的完整资源。 */
export type LoadedPreviewResources = {
  module: PreviewDemoModule;
  rawSource: string;
  controlModule?: Record<string, unknown>;
  baselineRawSource?: string;
  sourceContents: Readonly<Record<string, string | undefined>>;
  irJsonOverride?: string;
  vanillaOverride?: string;
  vanillaModule?: PreviewVanillaModule;
};

/** preview 资源是否存在。 */
export type PreviewResourceTarget = { status: 'missing'; key: string } | { status: 'loadable'; key: string };

/** preview 资源加载结果。 */
export type LoadPreviewResourcesResult =
  | { status: 'missing'; key: string }
  | { status: 'ready'; key: string; resources: LoadedPreviewResources };

const loadOptional = async <T>(loader: PreviewLoader<T> | undefined): Promise<T | undefined> => loader?.();

/** 同步解析 preview key，并区分缺失资源与待加载资源。 */
export const resolvePreviewResourceTarget = (request: PreviewResourceRequest): PreviewResourceTarget => {
  const key = resolveDemoKey(request.segments, request.name, request.lang);
  return demoModuleLoaders[key] === undefined || demoSourceLoaders[key] === undefined
    ? { status: 'missing', key }
    : { status: 'loadable', key };
};

const sourceKeysOf = (request: PreviewResourceRequest): Array<string> => {
  const keys = new Set<string>();
  for (const entry of request.sourceFiles) {
    keys.add(buildSourceFileKey(request.segments, entry.file));
    const baselineFilename = resolveSourceBaselineFilename(entry, request.name, request.diffFrom);
    if (baselineFilename !== undefined) keys.add(buildSourceFileKey(request.segments, baselineFilename));
  }
  return [...keys];
};

/** 只加载当前 ComponentPreview 实际引用的资源。 */
export const loadPreviewResources = async (request: PreviewResourceRequest): Promise<LoadPreviewResourcesResult> => {
  const target = resolvePreviewResourceTarget(request);
  if (target.status === 'missing') return target;

  const key = target.key;
  const moduleLoader = demoModuleLoaders[key];
  const rawSourceLoader = demoSourceLoaders[key];
  if (moduleLoader === undefined || rawSourceLoader === undefined) return { status: 'missing', key };

  const controlKey = request.controlsDisabled
    ? null
    : resolveControlsKey(request.segments, request.controlName ?? request.name, request.lang);
  const baselineKey = request.diffFrom ? resolveDemoKey(request.segments, request.diffFrom, request.lang) : null;
  const irJsonKey = buildIrJsonKey(request.segments, request.name);
  const vanillaKey = buildVanillaKey(request.segments, request.name);
  const sourceKeys = sourceKeysOf(request);

  try {
    const [
      module,
      rawSource,
      controlModule,
      baselineRawSource,
      irJsonOverride,
      vanillaOverride,
      vanillaModule,
      sourceEntries,
    ] = await Promise.all([
      moduleLoader(),
      rawSourceLoader(),
      loadOptional(controlKey === null ? undefined : controlModuleLoaders[controlKey]),
      loadOptional(baselineKey === null ? undefined : demoSourceLoaders[baselineKey]),
      loadOptional(irJsonOverrideLoaders[irJsonKey]),
      loadOptional(vanillaOverrideLoaders[vanillaKey]),
      loadOptional(vanillaModuleLoaders[vanillaKey]),
      Promise.all(
        sourceKeys.map(async sourceKey => [sourceKey, await loadOptional(localSourceFileLoaders[sourceKey])] as const),
      ),
    ]);

    return {
      status: 'ready',
      key,
      resources: {
        module,
        rawSource,
        controlModule,
        baselineRawSource,
        sourceContents: Object.fromEntries(sourceEntries),
        irJsonOverride,
        vanillaOverride,
        vanillaModule,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load preview "${key}": ${message}`, { cause: error });
  }
};
