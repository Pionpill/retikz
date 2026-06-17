/**
 * 同步 tex→SVG 引擎接口（`@retikz/tex` 只吃这个抽象，不硬依赖 MathJax）
 * @description 由调用方在 await MathJax startup 后构造（见 `createMathJaxEngine`），或自备等价实现。
 *   `convert` 返回 MathJax SVG 标记串（`fontCache:'none'` 内联字形）。
 */
export type MathJaxSvgEngine = {
  convert: (tex: string, options: { display: boolean }) => string;
};

/** 经字符串 specifier 动态 import（变量形式让打包器 / tsc 不静态解析 optional peer 的类型） */
const importModule = async <T>(specifier: string): Promise<T> => (await import(specifier)) as T;

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
 * @description 动态 import `mathjax-full` 的 SVG 输出栈（liteAdaptor，纯 Node、无 DOM），`fontCache:'none'`
 *   内联字形路径便于解析。未安装 `mathjax-full` → 抛带安装提示的错误（同 `@napi-rs/canvas` optional peer 口径）。
 *   startup 是异步，故本工厂 async；得到的引擎 `convert` 同步，可直接喂 `createLowerMath` / `compileToScene`。
 */
export const createMathJaxEngine = async (
  options?: { packages?: Array<string> },
): Promise<MathJaxSvgEngine> => {
  let mods: {
    mj: MathjaxModule;
    tex: TexModule;
    svg: SvgModule;
    ad: AdaptorModule;
    hd: HandlerModule;
  };
  try {
    const [mj, tex, svg, ad, hd] = await Promise.all([
      importModule<MathjaxModule>('mathjax-full/js/mathjax.js'),
      importModule<TexModule>('mathjax-full/js/input/tex.js'),
      importModule<SvgModule>('mathjax-full/js/output/svg.js'),
      importModule<AdaptorModule>('mathjax-full/js/adaptors/liteAdaptor.js'),
      importModule<HandlerModule>('mathjax-full/js/handlers/html.js'),
    ]);
    mods = { mj, tex, svg, ad, hd };
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
