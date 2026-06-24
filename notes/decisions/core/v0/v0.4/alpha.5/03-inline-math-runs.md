# ADR-03：文本 run 与行内 TeX 混排

- 状态：Accepted（2026-06-19 落地于 v0.4.0-alpha.5）
- 决策日期：2026-06-16（实现收敛：2026-06-19）
- 关联：[v0.4-alpha.5 roadmap](./roadmap.md) · [ADR-01 tex 包](./01-tex-package-and-node-math.md) · [ADR-02 带框公式](./02-node-embedded-math.md) · `packages/kernel/core/src/schemas/text.ts` · `packages/kernel/core/src/parsers/inline-tex.ts` · `packages/kernel/core/src/compile/text-layout.ts`

## 背景

数学图示最常见的写法不是单独公式块，而是普通文字里夹公式，例如「当 $v=d/t$ 时」。这要求一行文本从「单段字符串」升级为「文字 run + 公式 run」序列，并在同一基线上排版。

alpha.5 早期草稿曾把独立公式和带框公式设计为 node 内容字段；实现期间统一收敛为文本模型：公式是文本的一部分，独立公式块和带框公式分别是单个 display 公式文本节点，以及该文本节点外加 shape。

## 决策

`IRLineSpec` 增加 run 序列形态：

- `TextRun` 表示普通文字片段，保留 fill / opacity / font 等文字样式能力。
- `MathRun` 使用 `{ tex, displayMode?, fill? }` 载荷，经注入的 `lowerTex` 降解为 glyph path。
- 显式 `{ runs: [...] }` 是结构化写法；纯字符串也可在 compile 期按 `$...$` / `$$...$$` 解析成 run。

字符串糖语义：

- `$...$` 解析为 inline math run。
- `$$...$$` 解析为 display math run；当整个 node 内容只有一个 display run 时，就成为独立公式块或带框公式。
- 解析只在注入 `lowerTex` 时启用；未注入时 `$` 保持字面，现有价格、变量名等含 `$` 文本零回归。
- `\$` 表示字面 `$`。
- 未闭合 `$` 保留为字面文本并发出 `TEXT_TEX_PARSE_ERROR`，不抛。

布局由共享的 `compile/text-layout.ts` 完成：文字 run 走 `measureText`，公式 run 走 `lowerTex`；一行内按 x 方向累加，公式按 depth 与文字 alphabetic baseline 对齐，行高由各 run 的上伸 / 下伸共同决定。emit 结果只使用既有 `TextPrim`、`PathPrim`、`GroupPrim`，renderer 不新增专用 text/tex primitive。

## 理由

1. 文本 run 是最贴近用户写作的公开模型，既支持 `$...$` 习惯，也支持显式 JSON runs。
2. compile 期 gating 保证未接入 tex 能力时旧字符串行为不变。
3. 公式统一进文本模型后，独立公式、带框公式、节点文本、节点 label、边 label 都复用同一套布局和降级语义。
4. renderer 仍只消费基础 Scene primitive，三端无需理解 LaTeX。

## 影响

- core 新增 `TexContentSchema`、`TextRunSchema`、`MathRunSchema`、`MixedLineSchema`，并扩展 `IRLineSpec`。
- core 新增 `parseInlineRuns` 和 `compile/text-layout.ts`，供 node text、node label、edge label 复用。
- compile warn code 增加 `TEX_LOWERER_MISSING`、`TEX_INVALID`、`TEXT_TEX_PARSE_ERROR`。
- React `Layout` 和 Vanilla `toScene` / `renderToString` 透传 `lowerTex`。
- 文档和 changelog 以 `lowerTex`、`$...$`、`$$...$$`、显式 `{ runs }` 为最终口径。

## 不在本 ADR 范围

- 自动换行和 reflow。
- display 公式内部的多行排版控制。
- 公式内部嵌入 retikz 图元或交互。
- renderer 级字体 / MathML / DOM 公式渲染。

## 实现指针

实现以当前代码和测试为准，重点见：

- `packages/kernel/core/src/schemas/text.ts`
- `packages/kernel/core/src/schemas/tex.ts`
- `packages/kernel/core/src/parsers/inline-tex.ts`
- `packages/kernel/core/src/compile/text-layout.ts`
- `packages/kernel/core/tests/ir/text-runs.test.ts`
- `packages/kernel/core/tests/parsers/inline-tex.test.ts`
- `packages/kernel/core/tests/compile/inline-tex.test.ts`
- `apps/docs/src/contents/core/packages/tex/**`
- `apps/docs/src/contents/core/examples/karl-circle/**`

> 压缩前完整施工蓝图：`git show 63220f823d012744b29551f0a4bf38ff269b0c7e:notes/decisions/core/v0/v0.4/alpha.5/03-inline-math-runs.md`
