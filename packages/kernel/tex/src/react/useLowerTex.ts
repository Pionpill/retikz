import type { LowerTex } from '@retikz/core';

import { useEffect, useState } from 'react';

import type { MathJaxSvgEngine } from '../mathjax';

import { createLowerTex } from '../lower';
import { createMathJaxEngine } from '../mathjax';

let enginePromise: Promise<MathJaxSvgEngine> | undefined;

const getEngine = (): Promise<MathJaxSvgEngine> => {
  enginePromise ??= createMathJaxEngine();
  return enginePromise;
};

export const useLowerTex = (): LowerTex | undefined => {
  const [lower, setLower] = useState<LowerTex>();
  useEffect(() => {
    let alive = true;
    getEngine()
      .then(engine => {
        if (alive) setLower(() => createLowerTex(engine));
      })
      .catch(() => {
        // Keep undefined; compile will emit TEX_LOWERER_MISSING for nodes that need it.
      });
    return () => {
      alive = false;
    };
  }, []);
  return lower;
};
