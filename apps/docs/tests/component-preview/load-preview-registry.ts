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
): Promise<Record<string, T | undefined>> => {
  const modules: Record<string, T | undefined> = {};
  for (const [key, loader] of Object.entries(loaders)) {
    modules[key] = loader === undefined ? undefined : await loader();
  }
  return modules;
};

// Demo 同步消费 controls 的初始化结果；先完成 controls，避免测试模块加载器并发返回未初始化导出
export const controlModules = await materializeRegistry(controlModuleLoaders);
export const [demoModules, demoSources, localSourceFiles] = await Promise.all([
  materializeRegistry(demoModuleLoaders),
  materializeRegistry(demoSourceLoaders),
  materializeRegistry(localSourceFileLoaders),
]);
