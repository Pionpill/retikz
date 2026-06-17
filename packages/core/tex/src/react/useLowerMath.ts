import { useEffect, useState } from 'react';
import type { LowerMath } from '@retikz/core';
import { createLowerMath } from '../lower/lower-math';
import { type MathJaxSvgEngine, createMathJaxEngine } from '../mathjax/engine';

/** 进程级单例：MathJax startup 是异步且重，跨所有 useLowerMath 调用共享一个引擎 */
let enginePromise: Promise<MathJaxSvgEngine> | undefined;
const getEngine = (): Promise<MathJaxSvgEngine> => {
  enginePromise ??= createMathJaxEngine();
  return enginePromise;
};

/**
 * 异步启动 MathJax 并返回 core 的 `lowerMath` 注入函数（startup 未完成时返回 undefined）
 * @description 用法：`const lowerMath = useLowerMath(); <Layout lowerMath={lowerMath}>…<Node>{{ tex }}</Node></Layout>`。
 *   把手写的 startup effect 收进一行；引擎进程级单例（多组件共享，不重复 startup）；`mathjax-full` 未安装时 startup
 *   失败 → 保持 undefined，带公式的节点在 compile 期降级 + 警告（不崩）。startup 完成后触发一次重渲染填入 lowerMath。
 *   仅此 `@retikz/tex/react` 子入口依赖 React（optional peer）；主入口 `@retikz/tex` 仍为无 React 的纯引擎。
 */
export const useLowerMath = (): LowerMath | undefined => {
  const [lower, setLower] = useState<LowerMath>();
  useEffect(() => {
    let alive = true;
    getEngine()
      .then(engine => {
        if (alive) setLower(() => createLowerMath(engine));
      })
      .catch(() => {
        // mathjax-full 未装 / startup 失败：保持 undefined，compile 走 MATH_LOWERER_MISSING 降级
      });
    return () => {
      alive = false;
    };
  }, []);
  return lower;
};
