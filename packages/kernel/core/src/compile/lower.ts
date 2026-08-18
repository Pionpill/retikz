import type { IRScene } from '../schemas';
import type { LoweredIRScene, LowerIRToKernelOptions } from './types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../error';
import { resolveCompositeRegistry, resolveThemeStyleRegistry } from '../providers';
import { lowerComposites } from './orchestration';

/**
 * 把完整 IR 中的 composite 递归展开成可由 Kernel 直接消费的 Tier 1 IR。
 *
 * @description 未注册 composite 会携带 provider key 与 IR path 直接抛错，避免返回静默缺失节点的结果
 */
export const lowerIRToKernel = (ir: IRScene, options: LowerIRToKernelOptions = {}): LoweredIRScene =>
  lowerComposites(ir, resolveCompositeRegistry(options.composites), {
    themeStyles: resolveThemeStyleRegistry(options.themeStyles),
    maxDepth: options.maxCompositeDepth,
    onWarn: () => undefined,
    onUnregistered: (key, path) => {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `lowerIRToKernel: composite '${key}' is not registered at ${path}.`,
      );
    },
  });
