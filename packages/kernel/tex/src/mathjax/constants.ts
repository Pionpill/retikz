/** 内置 MathJax 配置档 */
export const MathJaxProfile = {
  Base: 'base',
  Math: 'math',
} as const;

/** 可按需加载的 MathJax 扩展 */
export const MathJaxExtension = {
  Ams: 'ams',
  Newcommand: 'newcommand',
  Boldsymbol: 'boldsymbol',
  Braket: 'braket',
  Cancel: 'cancel',
  Cases: 'cases',
  Centernot: 'centernot',
  Mathtools: 'mathtools',
  Color: 'color',
} as const;

/** 扩展的稳定规范顺序 */
export const MATHJAX_EXTENSION_ORDER = Object.values(MathJaxExtension);

/** math profile 固定启用的扩展 */
export const MATHJAX_MATH_EXTENSIONS = [...MATHJAX_EXTENSION_ORDER];
