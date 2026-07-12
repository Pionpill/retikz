import type { LowerTex } from '@retikz/core';

import { useEffect, useState } from 'react';

import type { MathJaxSvgEngine } from '../mathjax';

import { createLowerTex } from '../lower';
import { createMathJaxEngine } from '../mathjax';

let enginePromise: Promise<MathJaxSvgEngine | undefined> | undefined;

/** 获取共享 MathJax 引擎；初始化失败时报告原始错误并清空缓存，允许后续挂载重试。 */
const getEngine = (): Promise<MathJaxSvgEngine | undefined> => {
  if (!enginePromise) {
    const handled = createMathJaxEngine().catch(error => {
      if (enginePromise === handled) enginePromise = undefined;
      console.error('[retikz/tex] Failed to initialize MathJax.', error);
      return undefined;
    });
    enginePromise = handled;
  }
  return enginePromise;
};

/** 异步创建并缓存默认 MathJax lowerer；初始化失败时保持 `undefined`，后续重新挂载会重试。 */
export const useLowerTex = (): LowerTex | undefined => {
  const [lower, setLower] = useState<LowerTex>();
  useEffect(() => {
    let alive = true;
    void getEngine().then(engine => {
      if (alive && engine) setLower(() => createLowerTex(engine));
    });
    return () => {
      alive = false;
    };
  }, []);
  return lower;
};
