# ADR-02：maxTextWidth 自动换行（折行阈值 + 短文本收缩）

- 状态：Accepted（已实现）
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.7 plan §第二部分](./roadmap.md) · [tikz-gap-analysis §1 Node](../../../../../analysis/tikz-gap-analysis.md) · 本 milestone [ADR-01](./01-paint-basics.md) / [ADR-03](./03-pin.md)

## 背景 / 约束

- node 文本原本只能手动分行（`text` 是单行 `string` 或多行 `LineSpec[]`），长 label 无法按给定宽度自动折行（TikZ `[text width=3cm]`）。
- 折行算法只能落在 core 文本布局层——node 布局靠编译期注入的 `TextMeasurer`（react canvas measureText / ssr fontkit）算每行宽高，度量在这里，折行就得在这里。本 ADR 不改度量接口，只在其上加贪心断行。
- **语义岔路**：TikZ `text width` 是**固定段落宽度**（盒宽恒定，短文本也撑满 + 留白）。但 retikz 是通用图表库——居中节点带固定宽留白视觉别扭。

## 决策：`maxTextWidth` = 折行阈值 + 短文本收缩

字段 `maxTextWidth?: z.number().finite().positive()`（`core/src/ir/node.ts`，完整 schema + 英文 describe 见代码）。语义：

- 盒宽 = `min(实际最长行, maxTextWidth)`；超过阈值才折行、短文本盒子收缩到内容不留白。
- 未给 → 现行为（手动分行）不变。

理由：

1. **贴通用图表定位**（Mermaid / draw.io 风格）：折行阈值 + 短文本收缩，居中节点无多余留白；本库定位非 LaTeX 论文，不照搬 TikZ 固定宽。
2. **字段名 = 语义**：`maxTextWidth` 明确是"上限 / 阈值"，区别于 TikZ 固定 `text width`，不误导成固定宽。
3. **复用现成度量**：`TextMeasurer` 已注入，折行只是在其上加贪心断行，无新基建。

设计细节（具体决策）：

- **贪心断行**：对每个逻辑行用 `TextMeasurer` 累加 token 宽度，> `maxTextWidth` 即换行。
- **断行单位**：西文按**词**（空白分割）、CJK 按**字**（无空白连续段逐字可断），单一断行器处理中英混排。
- **并入现有多行布局**：折出的物理行走现有 `LineSpec` / `align` / `lineHeight` 同管线；折出行**继承该逻辑行的 `LineSpec` 样式**（fill / opacity / font）。`align`（left/center/right）自动生效。
- **`LineSpec[]`（已手动分行）+ `maxTextWidth` 同给**：各逻辑行**再各自折行**（正交、可叠加），不冲突报错。
- **长不可断 token**（单个超阈值的西文长词 / 无空白长串）：**溢出**（该行超阈值），不硬断破坏单词，文档说明。
- **CJK 标点禁则**（行首不能是 `，。）` 等）：**不处理**（过细，非通用图表刚需），文档标注。

### 被否决的选项

- **B：`textWidth` = 固定段落宽度（TikZ 对齐）**——盒宽恒 = `textWidth`，短文本在固定盒内按 `align` 对齐 + 留白；通用图表里固定宽留白视觉别扭，用户拍板否决。
- **C：不加字段（继续只手动分行）**——长 label 无自动折行，最痛可用性洞不补。

## 不在本 ADR 范围

- **Paint / 资源表** → [ADR-01](./01-paint-basics.md)；**pin** → [ADR-03](./03-pin.md)。
- **path label 折行**：仅 node 文本，真弧长 / step label 不在本段。
- **富文本 / 数学排版**：纯文本断行；数学 → 未来 `@retikz/math`。

---

> **实现指针**：level `yellow`（动 IR node 加一字段 + compile 折行器，不动 primitive 契约 / index 公开面 / render）、additive 非 breaking（未给时行为不变）。真源以代码为准——`NodeSchema.maxTextWidth`（`core/src/ir/node.ts`）、贪心断行器并入多行布局（`core/src/compile/node.ts`，断行逻辑随 node 布局，无独立 text-wrap 文件）。测试在 `core/tests/compile/node-text-wrap.test.ts`。完整施工契约（Schema 表 / 文件 scope / 测试象限 / DSL 表面 / 待决策点）见本文件 git 历史。

> 🔖 封板压缩 commit `d0ae9bf2`；压缩前完整施工蓝图 = `git show d0ae9bf2^:notes/decisions/core/v0/v0.2/v0.2-alpha.7/02-max-text-width.md`。
