import type { PreviewLoader } from '../../src/modules/docs/components/component-preview/registry';

import {
  controlModuleLoaders,
  demoModuleLoaders,
  demoSourceLoaders,
  localSourceFileLoaders,
} from '../../src/modules/docs/components/component-preview/registry';

/** 在完整性测试中显式加载生产 registry 的全部异步条目。 */
const materializeRegistry = async <T>(
  loaders: Readonly<Record<string, PreviewLoader<T> | undefined>>,
): Promise<Record<string, T | undefined>> =>
  Object.fromEntries(
    await Promise.all(
      Object.entries(loaders).map(async ([key, loader]) => [key, loader === undefined ? undefined : await loader()]),
    ),
  );

export const [demoModules, demoSources, localSourceFiles, controlModules] = await Promise.all([
  materializeRegistry(demoModuleLoaders),
  materializeRegistry(demoSourceLoaders),
  materializeRegistry(localSourceFileLoaders),
  materializeRegistry(controlModuleLoaders),
]);
