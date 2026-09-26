import type { LowerTex } from '@retikz/core';

import type { MathJaxEngineOptions } from '../mathjax';
import { createMathJaxEngine } from '../mathjax';
import { createLowerTex } from './lower-tex';
import type { LowerTexOptions } from './types';

/**
 * 一步创建 MathJax 引擎与 Core lowerer 的配置
 *
 * @description 合并 `MathJaxEngineOptions` 的解析配置与 `LowerTexOptions` 的诊断回调，作为 `createMathJaxLowerTex` 的单一输入。它只描述工厂参数，不保存引擎、缓存或渲染状态
 */
export type MathJaxLowerTexOptions = MathJaxEngineOptions & LowerTexOptions;

/**
 * 创建使用内置 MathJax profile 的 Core lowerer
 *
 * @description 异步加载可选的 `mathjax-full`、建立同步 SVG 引擎，并返回可交给 Core 的 `LowerTex`。适合不需要替换引擎实现的场景；如果应用已有兼容引擎，使用 `createLowerTex` 保留引擎所有权
 * @param options 同时控制 MathJax 扩展和 lowering 诊断的可选配置
 * @returns Promise 在引擎初始化完成后兑现为可注入 Core 的同步 LowerTex
 * @throws 引擎初始化失败时先通知 onDiagnostic，再拒绝 Promise；此时诊断 source 为空字符串
 *
 * @example
 * import { createMathJaxLowerTex, MathJaxProfile } from '@retikz/tex';
 *
 * const lowerTex = await createMathJaxLowerTex({
 *   profile: MathJaxProfile.Math,
 *   onDiagnostic: diagnostic => console.warn(diagnostic.message),
 * });
 */
export const createMathJaxLowerTex = async (options?: MathJaxLowerTexOptions): Promise<LowerTex> => {
  try {
    const engine = await createMathJaxEngine({
      profile: options?.profile,
      extensions: options?.extensions,
    });
    return createLowerTex(engine, { onDiagnostic: options?.onDiagnostic });
  } catch (error) {
    options?.onDiagnostic?.({
      kind: 'engine-error',
      source: '',
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
