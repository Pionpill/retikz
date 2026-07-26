import type { LowerTex } from '@retikz/core';

import type { MathJaxEngineOptions } from '../mathjax';
import type { LowerTexOptions } from './types';

import { createMathJaxEngine } from '../mathjax';
import { createLowerTex } from './lower-tex';

/** 一步创建 MathJax 引擎与 Core lowerer 的配置 */
export type MathJaxLowerTexOptions = MathJaxEngineOptions & LowerTexOptions;

/** 创建使用内置 MathJax profile 的 Core lowerer */
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
