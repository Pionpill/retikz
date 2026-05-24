# ADR-02：maxTextWidth 自动换行（折行阈值 + 短文本收缩）

- 状态：Accepted
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.7 plan §第二部分](./roadmap.md) · [tikz-gap-analysis §1 Node](../../../../../analysis/2026-05-07-tikz-gap-analysis.md) · 本 milestone [ADR-01](./01-paint-basics.md) / [ADR-03](./03-pin.md)

> **前置依赖**：复用编译期注入的文字度量接口 `TextMeasurer`（`packages/core/src/compile/text-metrics.ts:29`）+ 现有 node 多行布局（`compile/node.ts`）。本 ADR 不改度量接口，只在其上加折行。

## 背景

node 文本现状：`text` 是单行 `string` 或多行 `LineSpec[]`（`packages/core/src/ir/text.ts`），**只能手动分行**。node 布局用注入的 `TextMeasurer`（react canvas measureText / ssr fontkit）算每行宽高、定外接框。

痛点：长 label 无法按给定宽度自动折行（TikZ `[text width=3cm]`）。折行算法只能落在 core 文本布局层（度量在这里）。

**语义岔路（评审 P2#2）**：TikZ `text width` 是**固定段落宽度**（盒宽恒定，短文本也撑满 + 留白）。但 retikz 是通用图表库——居中节点带固定宽留白视觉别扭。故拍板用**折行阈值 + 短文本收缩**语义，字段名 `maxTextWidth` 与语义一致（区别于 TikZ 的固定 `text width`）。

## 选项

### A. `maxTextWidth` = 折行阈值 + 短文本收缩（**推荐，已拍**）

```ts
// ir/node.ts
maxTextWidth: z.number().finite().positive().optional()
  .describe('Max line width before wrapping (user units). Box shrinks to actual content for short text; not a fixed paragraph width.'),
```

- 盒宽 = `min(实际最长行, maxTextWidth)`；超过阈值才折行、短文本盒子收缩到内容不留白。
- 优：贴通用图表（Mermaid / draw.io 风格），居中节点无多余留白；字段名自解释。
- 缺：与 TikZ `text width` 语义不完全一致（TikZ 固定宽）——但本库定位非 LaTeX 论文。

### B. `textWidth` = 固定段落宽度（TikZ 对齐）

- 盒宽恒 = `textWidth`，短文本在固定盒内按 `align` 对齐 + 留白。
- 缺：通用图表里固定宽留白视觉别扭；用户拍板否决（评审 P2#2）。

### C. 不加字段（继续只手动分行）

- 缺：长 label 无自动折行，最痛可用性洞不补。否决。

## 决策：A

理由：

1. **用户拍板（评审 P2#2）**：折行阈值 + 短文本收缩，贴通用图表定位。
2. **字段名 = 语义**：`maxTextWidth` 明确是"上限 / 阈值"，不误导成固定宽。
3. **复用现成度量**：`TextMeasurer` 已注入，折行只是在其上加贪心断行，无新基建。

## 决策细节

> 主选项已锁；以下随讨论收敛。

1. **盒宽语义**：`maxTextWidth` 未给 → 现行为（手动分行）不变；给定 → 盒宽 = `min(实际最长行, maxTextWidth)`。
2. **贪心断行**：对每个逻辑行用 `TextMeasurer` 累加 token 宽度，> `maxTextWidth` 即换行。
3. **断行单位**：西文按**词**（空白分割）、CJK 按**字**（无空白连续段逐字可断）——单一断行器处理中英混排。
4. **并入现有多行布局**：折出的物理行走现有 `LineSpec` / `align` / `lineHeight` 同管线；折出行**继承该逻辑行的 `LineSpec` 样式**（fill / opacity / font）。
5. **`align` 自动生效**：多物理行按现有 `align`（left/center/right）对齐，无需新逻辑。
6. **英文 `.describe`**：`maxTextWidth` 字段带英文 describe（schema reference + LLM tool schema）。

## 待决策点

- **`LineSpec[]`（已手动分行）+ `maxTextWidth` 同给**：各逻辑行再各自折行（推荐）vs 冲突报错。倾向各自折行（正交、可叠加）。
- **长不可断 token**（单个超过 `maxTextWidth` 的西文长词 / 无空白长串）：硬断（按字符切）vs 溢出（该行超阈值）。倾向溢出（不硬断破坏单词），文档说明。
- **CJK 标点禁则**（行首不能是 `，。）`、行尾不能是 `（` 等）：倾向**不处理**（过细，非通用图表刚需），文档标注。

## DSL 表面

```tsx
{/* 长文本到阈值折行；盒宽收缩到实际最长行 */}
<Node maxTextWidth={120}>A fairly long node label that wraps</Node>

{/* 中英混排：西文按词、CJK 按字 */}
<Node maxTextWidth={80}>这是一段较长的中文 with English 混排标签</Node>

{/* 短文本：盒子贴内容，不撑满 maxTextWidth */}
<Node maxTextWidth={200}>OK</Node>
```

## 测试设计

`packages/core/tests/compile/node-text-wrap.test.ts`（新建）覆盖折行 / 断点 / 盒宽收缩 / 样式继承 / 与现有多行协同。详见"实现契约 § 测试象限"。

## 影响

- `packages/core/src/ir/node.ts`：加 `maxTextWidth?: z.number().finite().positive()`。
- `packages/core/src/compile/node.ts`（+ 可能新 `compile/text-wrap.ts`）：贪心断行器，接入现有多行布局。
- `packages/core/src/index.ts`：无新公开类型（字段随 NodeSchema）。
- 文档：Node 页 `maxTextWidth`（折行 demo，含 CJK / 西文混排）。
- 对外 API：纯叠加字段，零破坏（未给时行为不变）。

## 不在本 ADR 范围

- **Paint / 资源表**→ [ADR-01](./01-paint-basics.md)；**pin**→ [ADR-03](./03-pin.md)。
- **真弧长 / step label 折行**：仅 node 文本，path label 不在本段。
- **富文本 / 数学排版**：纯文本断行；数学 → 未来 `@retikz/math`。

---

## 实现契约（必填）

### Level

`yellow`

- 动 `packages/core/src/ir/node.ts`（加一字段）
- 动 `packages/core/src/compile/**`（折行器 + node 布局接入）
- 不动 primitive 契约 / index 公开面 / render
- 取最高 = yellow

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/node.ts` | 加字段 | `NodeSchema.maxTextWidth` | `z.number().finite().positive().optional()` | 未给 = 不折行 | 折行阈值（user units）；超过才折行、短文本盒收缩，非固定段落宽 |

> **英文 `.describe` 硬要求**：`maxTextWidth` 落地 `.describe(...)` 必须英文，写明"max width / wrap threshold, box shrinks for short text, not fixed paragraph width"。

### 文件 scope

- `packages/core/src/ir/node.ts`（加字段）
- `packages/core/src/compile/node.ts`（接入折行）+ `packages/core/src/compile/text-wrap.ts`（新建：贪心断行器，可选独立文件）
- `packages/core/tests/compile/node-text-wrap.test.ts`（新建）
- `apps/docs/src/contents/core/components/node/`（Node 页 + maxTextWidth demo）

### 测试象限

#### Happy path（≥ 3）

- `wrap_long_western`：西文长文本 + `maxTextWidth` → 按词折多行、每行宽 ≤ 阈值
- `wrap_cjk_by_char`：CJK 长文本 → 逐字折行、每行宽 ≤ 阈值
- `wrap_mixed_cjk_western`：中英混排 → 西文按词、CJK 按字、混排断点正确
- `box_shrinks_for_short_text`：短文本 + 大 `maxTextWidth` → 盒宽 = 实际文本宽（不撑满阈值）

#### 边界（≥ 2）

- `no_maxwidth_unchanged`：未给 `maxTextWidth` → 与现有单行 / 手动多行布局快照一致（零破坏）
- `box_width_equals_min`：盒宽 = `min(实际最长行, maxTextWidth)`（长文本 = 阈值、短文本 = 内容）
- `wrapped_line_inherits_linespec`：`LineSpec` 样式（fill / font）在折出的物理行上保留

#### 错误路径（≥ 2）

- `maxwidth_non_positive_rejected`：`maxTextWidth: 0` / 负 → schema 拒（`.finite().positive()`，`.positive()` 单用拦不住 `Infinity`）
- `maxwidth_nan_rejected`：`NaN` / `Infinity` → schema 拒
- `long_unbreakable_token`：单 token 超阈值 → 按拍定行为（溢出 / 硬断），不崩

#### 交互（≥ 2）

- `wrap_with_align_center`：折多行 + `align: 'center'` → 各行居中对齐
- `wrap_with_lineheight`：折多行 + `lineHeight` → 行距正确累加、外接框高度对
- `wrap_with_linespec_array`：显式 `LineSpec[]` + `maxTextWidth` → 各逻辑行再各自折行（按待决策拍板）

### 依赖的现有元素

- `packages/core/src/compile/text-metrics.ts` 的 `TextMeasurer` / `fallbackMeasurer` —— **引用**：折行靠它度量 token 宽
- `packages/core/src/compile/node.ts` 的多行布局 —— **修改**：折行结果并入
- `packages/core/src/ir/text.ts` 的 `LineSpec` —— **引用**：折出行继承逻辑行样式
- node 的 `align` / `lineHeight` 处理 —— **引用**：折后多行自动复用
