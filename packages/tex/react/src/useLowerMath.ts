import { useEffect, useState } from 'react';
import type { LowerMath } from '@retikz/core';
import { type MathJaxSvgEngine, createLowerMath, createMathJaxEngine } from '@retikz/tex';

/** 进程级单例：MathJax startup 是异步且重，跨所有 useLowerMath 调用共享一个引擎 */
let enginePromise: Promise<MathJaxSvgEngine> | undefined;
const getEngine = (): Promise<MathJaxSvgEngine> => {
  enginePromise ??= createMathJaxEngine();
  return enginePromise;
};

/**
 * 异步启动 MathJax 并返回 core 的 `lowerMath` 注入函数（startup 未完成时返回 undefined）
 * @description 用法：`const lowerMath = useLowerMath(); <Layout lowerMath={lowerMath}>…<Math tex=.../></Layout>`。
 *   引擎进程级单例（多组件共享，不重复 startup）；`mathjax-full` 未安装时 startup 失败 → 保持 undefined，
 *   带公式的节点在 compile 期降级 + 警告（不崩）。startup 完成后触发一次重渲染填入 lowerMath。
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
