import type { MathJaxEngineOptions, MathJaxExtensionValue } from './types';

import { MATHJAX_EXTENSION_ORDER, MathJaxProfile } from './constants';

/** 将 profile 与追加项展开为按稳定顺序去重的有效扩展 */
export const resolveMathJaxExtensions = (options?: MathJaxEngineOptions): Array<MathJaxExtensionValue> => {
  const profile = options?.profile ?? MathJaxProfile.Base;
  const requested = new Set<MathJaxExtensionValue>(
    profile === MathJaxProfile.Math ? MATHJAX_EXTENSION_ORDER : undefined,
  );
  for (const extension of options?.extensions ?? []) requested.add(extension);
  return MATHJAX_EXTENSION_ORDER.filter(extension => requested.has(extension));
};

const configurationLoaders = {
  ams: () => import('mathjax-full/js/input/tex/ams/AmsConfiguration.js'),
  newcommand: () => import('mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js'),
  boldsymbol: () => import('mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration.js'),
  braket: () => import('mathjax-full/js/input/tex/braket/BraketConfiguration.js'),
  cancel: () => import('mathjax-full/js/input/tex/cancel/CancelConfiguration.js'),
  cases: async () => {
    await import('mathjax-full/js/input/tex/empheq/EmpheqConfiguration.js');
    await import('mathjax-full/js/input/tex/cases/CasesConfiguration.js');
  },
  centernot: () => import('mathjax-full/js/input/tex/centernot/CenternotConfiguration.js'),
  mathtools: () => import('mathjax-full/js/input/tex/mathtools/MathtoolsConfiguration.js'),
  color: () => import('mathjax-full/js/input/tex/color/ColorConfiguration.js'),
} satisfies Record<MathJaxExtensionValue, () => Promise<unknown>>;

/** 以字面量 dynamic import 加载选中扩展的 MathJax configuration */
export const loadMathJaxConfigurations = async (extensions: Array<MathJaxExtensionValue>): Promise<void> => {
  for (const extension of extensions) {
    await configurationLoaders[extension]();
  }
};
