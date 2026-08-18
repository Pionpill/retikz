import type { MathJaxEngineOptions, MathJaxSvgEngine } from './types';

import { RetikzTexError, RetikzTexErrorCode } from '../error';
import { loadMathJaxConfigurations, resolveMathJaxEngineOptions } from './profiles';

type LiteAdaptor = { outerHTML: (node: unknown) => string };
type MathDocument = { convert: (tex: string, options: { display: boolean }) => unknown };
type MathjaxModule = {
  mathjax: { document: (doc: string, opts: { InputJax: unknown; OutputJax: unknown }) => MathDocument };
};
type TexModule = { TeX: new (opts: { packages: Array<string> }) => unknown };
type SvgModule = { SVG: new (opts: { fontCache: string }) => unknown };
type AdaptorModule = { liteAdaptor: () => LiteAdaptor };
type HandlerModule = { RegisterHTMLHandler: (adaptor: LiteAdaptor) => void };

/**
 * 构造一个基于 `mathjax-full`（optional peer）的同步 tex→SVG 引擎
 * @description 以**字面量** specifier 动态 import `mathjax-full` 的 SVG 输出栈（liteAdaptor，纯 JS、无 DOM，
 *   浏览器 / Node 通用），`fontCache:'none'` 内联字形路径便于解析。字面量形式让打包器（Vite / webpack）能静态
 *   解析并按需分包——dev / build 两端的浏览器侧动态 import 都可解析（变量 specifier 在浏览器无法解析裸模块名）；
 *   `mathjax-full` 仍是 optional peer：tex 库构建已将其 external，未安装时 import 失败 → 下方 catch 抛带安装提示
 *   的错误（同 `@napi-rs/canvas` optional peer 口径）。startup 异步故本工厂 async；引擎 `convert` 同步
 */
export const createMathJaxEngine = async (options?: MathJaxEngineOptions): Promise<MathJaxSvgEngine> => {
  const resolved = resolveMathJaxEngineOptions(options);
  let mods: {
    mj: MathjaxModule;
    tex: TexModule;
    svg: SvgModule;
    ad: AdaptorModule;
    hd: HandlerModule;
  };
  try {
    const [mj, tex, svg, ad, hd] = await Promise.all([
      import('mathjax-full/js/mathjax.js') as Promise<unknown>,
      import('mathjax-full/js/input/tex.js') as Promise<unknown>,
      import('mathjax-full/js/output/svg.js') as Promise<unknown>,
      import('mathjax-full/js/adaptors/liteAdaptor.js') as Promise<unknown>,
      import('mathjax-full/js/handlers/html.js') as Promise<unknown>,
    ]);
    await loadMathJaxConfigurations(resolved.extensions);
    mods = {
      mj: mj as MathjaxModule,
      tex: tex as TexModule,
      svg: svg as SvgModule,
      ad: ad as AdaptorModule,
      hd: hd as HandlerModule,
    };
  } catch (error) {
    throw new RetikzTexError(
      RetikzTexErrorCode.MathJax,
      '@retikz/tex: install the optional peer dependency "mathjax-full" to use createMathJaxEngine, or inject your own MathJaxSvgEngine.',
      { cause: error },
    );
  }
  const adaptor = mods.ad.liteAdaptor();
  mods.hd.RegisterHTMLHandler(adaptor);
  const texInput = new mods.tex.TeX({ packages: resolved.packages });
  const svgOutput = new mods.svg.SVG({ fontCache: 'none' });
  const doc = mods.mj.mathjax.document('', { InputJax: texInput, OutputJax: svgOutput });
  return {
    convert: (tex, opts) => adaptor.outerHTML(doc.convert(tex, { display: opts.display })),
  };
};
