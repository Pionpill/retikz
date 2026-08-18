import type { MathJaxEngineOptions, MathJaxExtensionValue, ResolvedMathJaxEngineOptions } from './types';

import { RetikzTexError, RetikzTexErrorCode } from '../error';
import { MATHJAX_EXTENSION_ORDER, MATHJAX_MATH_EXTENSIONS, MathJaxProfile } from './constants';

const EXTENSION_SET = new Set<string>(MATHJAX_EXTENSION_ORDER);
const PROFILE_SET = new Set<string>(Object.values(MathJaxProfile));

/** 规范化 profile、扩展顺序、内部依赖与共享键 */
export const resolveMathJaxEngineOptions = (options?: MathJaxEngineOptions): ResolvedMathJaxEngineOptions => {
  const profile = options?.profile ?? MathJaxProfile.Base;
  if (!PROFILE_SET.has(profile)) {
    throw new RetikzTexError(RetikzTexErrorCode.MathJax, `Unknown MathJax profile: ${String(profile)}`);
  }
  for (const extension of options?.extensions ?? []) {
    if (!EXTENSION_SET.has(extension)) {
      throw new RetikzTexError(RetikzTexErrorCode.MathJax, `Unknown MathJax extension: ${String(extension)}`);
    }
  }
  const requested = new Set<MathJaxExtensionValue>(
    profile === MathJaxProfile.Math ? MATHJAX_MATH_EXTENSIONS : undefined,
  );
  for (const extension of options?.extensions ?? []) requested.add(extension);
  const extensions = MATHJAX_EXTENSION_ORDER.filter(extension => requested.has(extension));
  const packages = ['base'];
  for (const extension of extensions) {
    if (extension === 'cases') packages.push('empheq');
    packages.push(extension);
  }
  return {
    profile,
    extensions,
    packages,
    key: `${profile}|${extensions.join(',')}`,
  };
};

/** 以字面量 dynamic import 加载选中扩展的 MathJax configuration */
export const loadMathJaxConfigurations = async (extensions: Array<MathJaxExtensionValue>): Promise<void> => {
  for (const extension of extensions) {
    switch (extension) {
      case 'ams':
        await import('mathjax-full/js/input/tex/ams/AmsConfiguration.js');
        break;
      case 'newcommand':
        await import('mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js');
        break;
      case 'boldsymbol':
        await import('mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration.js');
        break;
      case 'braket':
        await import('mathjax-full/js/input/tex/braket/BraketConfiguration.js');
        break;
      case 'cancel':
        await import('mathjax-full/js/input/tex/cancel/CancelConfiguration.js');
        break;
      case 'cases':
        await import('mathjax-full/js/input/tex/empheq/EmpheqConfiguration.js');
        await import('mathjax-full/js/input/tex/cases/CasesConfiguration.js');
        break;
      case 'centernot':
        await import('mathjax-full/js/input/tex/centernot/CenternotConfiguration.js');
        break;
      case 'mathtools':
        await import('mathjax-full/js/input/tex/mathtools/MathtoolsConfiguration.js');
        break;
      case 'color':
        await import('mathjax-full/js/input/tex/color/ColorConfiguration.js');
        break;
    }
  }
};
