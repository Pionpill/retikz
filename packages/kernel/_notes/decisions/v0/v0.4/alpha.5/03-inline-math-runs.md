# ADR-03：文本 run 与行内 TeX 混排

- 状态：Accepted（已实现）
- 决策日期：2026-06-16
- 关联：[ADR-01 tex](./01-tex-package-and-node-math.md) · [ADR-02 带框公式](./02-node-embedded-math.md)

## 背景

常见文本会同时包含普通文字和公式，例如“当 $v=d/t$ 时”。字符串模型无法表达两者的测量、基线和样式差异，因此 IRLine 需要 run 序列。

## 决策

IRLine 支持 TextRun 与 MathRun：

- TextRun 保留 fill、opacity、font 等文字样式；MathRun 载荷为 tex、可选 displayMode、可选 fill，经 lowerTex 变为 glyph path
- 显式 { runs: [...] } 是结构化写法；纯字符串可在 compile 期解析 $...$ 为 inline、$$...$$ 为 display。整个 node 只有一个 display run 时，它表达独立公式块或带框公式
- 只有注入 lowerTex 才启用字符串解析；未注入时 $ 保持字面，确保价格、变量名等旧文本不变。反斜杠转义的 $ 保持字面
- 未闭合 $ 保留为字面文本并发出 TEXT_TEX_PARSE_ERROR，不抛
- 布局按 x 累加 runs；MathRun 依据 depth 与文字 alphabetic baseline 对齐，行高取各 run 上伸/下伸的最大范围。输出只使用 TextPrim、PathPrim、GroupPrim

## 兼容性与实现结果

独立公式、带框公式、Node text、Node label 和 edge label 共用同一 run/layout 与 lowerTex 透传；renderer 不理解 LaTeX。

## 遗留风险

自动换行/reflow、display 多行、公式内嵌图元/交互和 renderer 私有字体/MathML 方案仍未定义。
