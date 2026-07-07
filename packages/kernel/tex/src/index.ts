// @retikz/tex —— LaTeX 公式经 MathJax SVG → renderer-agnostic 字形路径，接入 @retikz/core 的 lowerTex 注入
export { createLowerTex } from './lower/lower-tex';
export { createMathJaxEngine, type MathJaxEngineOptions, type MathJaxSvgEngine } from './mathjax/engine';
