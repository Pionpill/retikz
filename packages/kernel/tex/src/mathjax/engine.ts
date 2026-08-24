import type { MathJaxEngineOptions, MathJaxExtensionValue, MathJaxSvgEngine } from './types';

import { RetikzTexError, RetikzTexErrorCode } from '../error';
import { loadMathJaxConfigurations, resolveMathJaxExtensions } from './profiles';

type LiteAdaptor = { outerHTML: (node: unknown) => string };
type MathDocument = { convert: (tex: string, options: { display: boolean }) => unknown };
type MathJaxModule = {
  mathjax: {
    document: (documentSource: string, options: { InputJax: unknown; OutputJax: unknown }) => MathDocument;
  };
};
type TexModule = { TeX: new (options: { packages: Array<string> }) => unknown };
type SvgModule = { SVG: new (options: { fontCache: string }) => unknown };
type AdaptorModule = { liteAdaptor: () => LiteAdaptor };
type HandlerModule = { RegisterHTMLHandler: (adaptor: LiteAdaptor) => void };

/** 根据有效 extension 集合生成 MathJax TeX package 顺序 */
const getMathJaxPackages = (extensions: Array<MathJaxExtensionValue>): Array<string> => {
  const packages = ['base'];
  for (const extension of extensions) {
    if (extension === 'cases') packages.push('empheq');
    packages.push(extension);
  }
  return packages;
};

/**
 * 创建基于可选 `mathjax-full` peer 的同步 TeX → SVG 引擎
 * @remarks 使用字面量 dynamic import 支持打包器分包；`fontCache: 'none'` 让字形以内联路径输出
 */
export const createMathJaxEngine = async (options?: MathJaxEngineOptions): Promise<MathJaxSvgEngine> => {
  const extensions = resolveMathJaxExtensions(options);
  let modules: {
    mathJaxModule: MathJaxModule;
    tex: TexModule;
    svg: SvgModule;
    adaptorModule: AdaptorModule;
    handlerModule: HandlerModule;
  };
  try {
    const [mathJaxModule, tex, svg, adaptorModule, handlerModule] = await Promise.all([
      import('mathjax-full/js/mathjax.js') as Promise<MathJaxModule>,
      import('mathjax-full/js/input/tex.js') as Promise<TexModule>,
      import('mathjax-full/js/output/svg.js') as Promise<SvgModule>,
      import('mathjax-full/js/adaptors/liteAdaptor.js') as Promise<AdaptorModule>,
      import('mathjax-full/js/handlers/html.js') as unknown as Promise<HandlerModule>,
    ]);
    await loadMathJaxConfigurations(extensions);
    modules = { mathJaxModule, tex, svg, adaptorModule, handlerModule };
  } catch (error) {
    throw new RetikzTexError(
      RetikzTexErrorCode.MathJax,
      '@retikz/tex: failed to initialize MathJax; verify that a compatible "mathjax-full" version is installed and inspect the error cause.',
      { cause: error },
    );
  }
  const adaptor = modules.adaptorModule.liteAdaptor();
  modules.handlerModule.RegisterHTMLHandler(adaptor);
  const texInput = new modules.tex.TeX({ packages: getMathJaxPackages(extensions) });
  const svgOutput = new modules.svg.SVG({ fontCache: 'none' });
  const mathDocument = modules.mathJaxModule.mathjax.document('', { InputJax: texInput, OutputJax: svgOutput });
  return {
    convert: (tex, convertOptions) => adaptor.outerHTML(mathDocument.convert(tex, { display: convertOptions.display })),
  };
};
