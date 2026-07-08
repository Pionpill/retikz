/**
 * 同步 tex→SVG 引擎接口（`@retikz/tex` 只吃这个抽象，不硬依赖 MathJax）
 * @description 由调用方在 await MathJax startup 后构造（见 `createMathJaxEngine`），或自备等价实现。
 *   `convert` 返回 MathJax SVG 标记串（`fontCache:'none'` 内联字形）。
 */
export type MathJaxSvgEngine = {
  convert: (tex: string, options: { display: boolean }) => string;
};

/**
 * `createMathJaxEngine` 的配置项
 * @description `packages` 会透传给 MathJax TeX input，默认只启用 `base` 包。
 */
export type MathJaxEngineOptions = {
  /** MathJax TeX input packages。@default ['base'] */
  packages?: Array<string>;
};

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
 *   的错误（同 `@napi-rs/canvas` optional peer 口径）。startup 异步故本工厂 async；引擎 `convert` 同步。
 */
export const createMathJaxEngine = async (options?: MathJaxEngineOptions): Promise<MathJaxSvgEngine> => {
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
    mods = {
      mj: mj as MathjaxModule,
      tex: tex as TexModule,
      svg: svg as SvgModule,
      ad: ad as AdaptorModule,
      hd: hd as HandlerModule,
    };
  } catch (error) {
    throw new Error(
      '@retikz/tex: install the optional peer dependency "mathjax-full" to use createMathJaxEngine, or inject your own MathJaxSvgEngine.',
      { cause: error },
    );
  }
  const adaptor = mods.ad.liteAdaptor();
  mods.hd.RegisterHTMLHandler(adaptor);
  const texInput = new mods.tex.TeX({ packages: options?.packages ?? ['base'] });
  const svgOutput = new mods.svg.SVG({ fontCache: 'none' });
  const doc = mods.mj.mathjax.document('', { InputJax: texInput, OutputJax: svgOutput });
  return {
    convert: (tex, opts) => adaptor.outerHTML(doc.convert(tex, { display: opts.display })),
  };
};
