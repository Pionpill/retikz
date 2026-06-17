// @retikz/tex —— LaTeX 数学公式经 MathJax SVG → renderer-agnostic 字形路径，接入 @retikz/core 的 lowerMath 注入
export { createLowerMath } from './lower/lower-math';
export { createMathJaxEngine, type MathJaxSvgEngine } from './mathjax/engine';
export { parseMathJaxSvg } from './svg/parse-svg';
export { parsePathD, transformCommands } from './svg/path-d';
export { type Matrix, parseTransform } from './svg/matrix';
