# ADR-01：@retikz/tex 与公式降解能力

- 状态：Accepted（已实现；最终随 ADR-03 收敛）
- 决策日期：2026-06-16
- 关联：[ADR-02 带框公式](./02-node-embedded-math.md) · [ADR-03 行内混排](./03-inline-math-runs.md)

## 背景

公式必须进入 renderer-agnostic Scene，但 core 不能依赖 MathJax、DOM、字体状态或具体 renderer。MathJax SVG 的 glyph path 可以降解为既有 PathPrim，因此引擎能力应由可选包注入。

## 决策

@retikz/tex 提供 MathJax SVG 到 glyph PathPrim 的降解：

- createMathJaxEngine 创建引擎，createLowerTex(engine) 产生可传给 core 的 LowerTex；@retikz/tex/react 提供 useLowerTex
- MathJax 是 optional peer，由用户控制安装、版本和 macro；core、render、react 不直接依赖它
- 最终公开模型没有 node.math、node.tex 或 TexNode。公式是文本的一部分：单独公式使用单个 $$...$$ display run，带框公式使用同一文本节点加普通 shape
- 未注入 lowerTex 时发出 TEX_LOWERER_MISSING；lowerTex 返回 null 或引擎失败时发出 TEX_INVALID。两者都只降级公式段，不抛 MathJax 运行时错误
- MathJax 对象、DOM 和字体状态不进入 IR 或 Scene；glyph path 继续走现有 renderer-agnostic primitive

## 兼容性与实现结果

core 已增加 lowerTex 注入点与诊断，tex 包和 React/Vanilla 透传已实现；公式公开模型由 ADR-03 的 text run 收敛。

## 遗留风险

公式编辑器、实时重排、替代引擎、非数学 TeX 包和公式内嵌 retikz 图元不属于本能力。
