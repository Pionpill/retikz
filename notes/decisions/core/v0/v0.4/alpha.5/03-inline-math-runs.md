# ADR-03：行内 text+math 混排（C）—— 文本行升级为 run 序列，公式与文字共基线

- 状态：Accepted（2026-06-19 落地于 v0.4.0-alpha.5；E3 与 E1/E2 同处 alpha.5 未发布周期，故合入 alpha.5 而非另起 alpha.6）
- 决策日期：2026-06-16（实现 2026-06-19）

> **落地与两处偏离草稿**：(1) `$$...$$` = **display 公式**（不是草稿里的「空 math 跳过」）；独占一个 node 时 = 独立 / 带框公式。(2) **全统一**：alpha.5 同周期内 E1/E2 曾引入的 `node.tex` 字段 + `<TexNode>` + tex 内容 `displayMode` 一并移除（公式统一为文本里的 math run，node.tex 未随任何 release 发布），ADR-01（独立公式 A）/ ADR-02（带框公式 B）被「内容为单个 `$$...$$` math run + 可选 shape」吸收。命名按 shipped 的 `tex`（非草稿的 `math`/`lowerMath`）：`MathRunSchema.tex`、`options.lowerTex`、warn `TEXT_TEX_PARSE_ERROR` / `TEX_LOWERER_MISSING` / `TEX_INVALID`。解析在 **compile 期**（gated on `lowerTex` 注入），原始字符串留在 IR；新增共享 `compile/text-layout.ts` 混排布局，被 node text / node label / edge label 复用。
- 关联：[v0.4-alpha.5 roadmap](./roadmap.md) · [ADR-01 tex 包 + node.math](./01-tex-package-and-node-math.md)（共享 `lowerMath` + `IRMathContent`）· [ADR-02 带框公式](./02-node-embedded-math.md) · `ir/text.ts`（行内容模型）· `compile/node.ts` / `compile/text-metrics.ts`（文本测量 / 布局）· `compile/constant.ts`（`CompileWarningCode` / `onWarn`）· `parsers/`（IR 构造期 sugar）

> **范围**：E3「行内 text+math 混排（C）」——一行文字里夹公式，文字与公式左右排在同一基线（TikZ `节点 {当 $v=d/t$ 时}`）。独立公式块（A）见 [ADR-01](./01-tex-package-and-node-math.md)、带框公式（B）见 [ADR-02](./02-node-embedded-math.md)。**本轮最重**——动 core 文本内容模型。
>
> **依赖**：复用 [ADR-01](./01-tex-package-and-node-math.md) 的 `IRMathContent` + `options.lowerMath` + math warn code；本 ADR 增「行内 run 序列」schema + `$...$` 解析糖 + 混排布局。

## 背景

A（公式即整个 node 内容）和 B（带框公式）都把公式当**一整块**。最自然的数学叙述是**夹在文字里**：「当 $v = d/t$ 时，位移为 $s = vt$」——文字与公式在同一行同一基线交替。这要求 node 单行内容从「一段文字」升级为「文字段 + 公式段交替的 run 序列」。

retikz 现有文本模型（`ir/text.ts`）：`IRTextBlock = string | Array<IRLineSpec>`，`IRLineSpec = string | { text, fill?, opacity?, font? }`——**一行 = 一段纯文字**，无行内分段、无 math run。要支持行内混排，须 (1) 让一行能是 run 序列、(2) 混排布局（run 左右排、公式按 depth 对齐文字基线、行高取各 run 上伸/下伸最大值）、(3) emit 成 `GroupPrim(定位 TextPrim + 字形 PathPrim)`。这是 alpha.5 唯一动 core 文本模型的一项，单独隔离。

## 决策：`IRLineSpec` 增「run 序列」形态 + `$...$` 解析糖（gated）；compile 混排布局复用 `lowerMath`

core 扩 `ir/text.ts`（**additive**，旧 string / line-object 形态逐字不变）：

```ts
// 文字 run —— 与现有 line 对象同字段集（含 opacity，避免能力丢失，见评审 WARNING 3）
export const TextRunSchema = z.object({
  text: z.string(),
  fill: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),  // 保留现有 LineSpec 的 opacity 能力
  font: FontSchema.optional(),
}).describe('A text segment in a mixed line (same fields as a line object).');

// 公式 run（复用 ADR-01 的 IRMathContent；行内恒 inline 度量）
export const MathRunSchema = z.object({
  math: MathContentSchema,   // { tex, displayMode? }，行内 displayMode 恒 false
}).describe('An inline math segment, baseline-aligned to surrounding text.');

// 行的新形态：run 序列（与旧 string / 行对象并存于 IRLineSpec union 第三支）
export const MixedLineSchema = z.object({
  runs: z.array(z.union([TextRunSchema, MathRunSchema])).min(1),
}).describe('A line composed of text and math runs laid out left-to-right on a shared baseline.');
// IRLineSpec = string | 行对象 | MixedLineSchema（additive）
```

### `$...$` 解析糖语法（精确定义，解评审 WARNING 4）

纯字符串里的 `$...$` 解析成 math run、其余为 text run，**canonical IR 仍是 runs 数组**（糖在 IR 构造期，同 `parseWay`）。规则：

- **gating（关键，向后兼容）**：`$...$` 解析**仅在注入了 `options.lowerMath` 时启用**。未接 tex 能力时，`$` 一律字面文本——**现有含 `$` 的纯文本（如 `"$5.00"`）零行为变化**。
- `\$`（反斜杠 + `$`）→ 字面 `$`，不作分隔符（任何时候）。
- 启用时，未转义 `$` 成对切分：`$` … `$` 之间为 math run 的 tex，之间的普通文本为 text run。
- **`$$`**（两个相邻未转义 `$`）→ 空 math run，规约为**跳过**（等价 `tex=''`，同 ADR-01 empty-tex 边界）；不解释为 LaTeX display 数学（display 用显式 `displayMode` run，行内不混 display）。
- **不闭合 / 落单 `$`**（奇数个未转义 `$`）→ 容错：该 `$` 起的剩余片段按**字面文本**保留 + `onWarn(TEXT_MATH_PARSE_ERROR)`，**不抛**。
- 显式 `runs` 数组永远绕过糖（canonical 直给）。

布局（`compile`，复用 ADR-01 的 `options.lowerMath`）：一行内 run 左→右累加 x；text run 经 `measureText` 取 `{width, ascent, descent}`（缺 ascent/descent 用 fontSize 比例 fallback），math run 经 `lowerMath` 取 `{width, height, depth}`；**基线对齐**：以文字 alphabetic 基线为准，math run 按其 `depth` 下沉使公式基线贴合；行高 = max(各 run 上伸) + max(各 run 下伸)。emit：一行 → `GroupPrim`，内含定位 `TextPrim`（连续同样式 text run 合并）+ 字形 `PathPrim`（math run，平移到 x / 基线）。**renderer 零改动**（产物全是既有 prim）。降级：math run 无 `lowerMath` → `onWarn(MATH_LOWERER_MISSING)` + 跳过该 run（文字 run 正常）；非法 tex run → `onWarn(MATH_TEX_INVALID)` + 占位。

理由：

1. **唯一自然的行内数学**——文字夹公式是数学叙述默认形态，A/B 覆盖不到。
2. **additive、零回归 + 兼容安全**——`IRLineSpec` 加第三支 union；旧纯文本不进 run 慢路径；`$...$` gating on `lowerMath` 使现有含 `$` 文本零变化（解 WARNING 4 兼容风险）。
3. **复用 ADR-01 注入 + onWarn**——公式 run 测量 / emit 用 `options.lowerMath`，错误走 `CompileWarningCode` / `onWarn`（解 WARNING 2，不用 `warnUnsupported`）。
4. **保留现有能力**——`TextRunSchema` 含 `opacity`（解 WARNING 3），与现 line 对象同字段集。
5. **`$...$` AI 友好**——LLM 写惯行内 `$...$`；canonical runs 数组 JSON 友好。

## 待决策点 🔻

- **基线对齐口径**：公式 run 用 MathJax `verticalAlign`/depth 贴文字 alphabetic 基线（倾向）；分数 / 上下标超行高时行高按 run 实际撑开（倾向）vs 截断（否决，切公式）。常量「可诊断近似」按快照微调。
- **emit 形态**：一行混排 emit `GroupPrim(TextPrim... + PathPrim...)`（倾向，复用 prim、renderer 零改）vs 扩 `TextPrim` 内嵌 run（否决，污染 TextPrim + 改 renderer）。
- **块对齐 / 多行**：多行混排逐行布局、`align` 按行宽偏移行起点（倾向）；**自动换行 / reflow 不做**（手动断行），留后续。
- **`$$` / display 行内**：本轮 `$$` = 空 math 跳过、行内不支持 display（倾向）；如需行内 display 由显式 `runs` 的 `math.displayMode` 给（不经糖）。

## DSL 表面

react（文本直接写 `$...$`，或显式 runs）：

```tsx
import { Layout, Node } from '@retikz/react';
import { createLowerMath, createMathJaxEngine } from '@retikz/tex';
// 组件内：useState/useEffect 启动 MathJax → setLowerMath(() => createLowerMath(engine))
<Layout lowerMath={lowerMath}>
  {/* $...$ 糖（lowerMath 已注入时启用）：文字里夹公式 */}
  <Node id="a" position={[0, 0]} shape="rectangle">当 $v = d/t$ 时，位移 $s = v t$</Node>
  {/* 显式 runs（canonical，含 text run opacity） */}
  <Node id="b" position={[0, -30]} text={{ runs: [{ text: '能量 ', opacity: 0.8 }, { math: { tex: 'E=mc^2' } }] }} />
  {/* 字面美元：未注入 tex 时 $ 即字面；任何时候 \$ 字面 */}
  <Node id="c" position={[0, -60]}>价格 \$5.00</Node>
</Layout>
```

vanilla：

```ts
const lowerMath = createLowerMath(await startMathJax());
figure([
  node('a', { position: [0, 0], shape: 'rectangle', text: '当 $v=d/t$ 时' }),
  node('b', { position: [0, -30], text: { runs: [{ text: '能量 ' }, { math: { tex: 'E=mc^2' } }] } }),
]);
// toScene(fig, { lowerMath, measureText })
```

## 测试设计

`packages/core/core/tests/{ir/text-runs.test.ts, compile/inline-math.test.ts, parsers/inline-math.test.ts}` + `packages/core/tex/tests/**` 覆盖：`$...$` 解析（含 gating / 转义 / 不闭合 / `$$`）、混排布局 + 基线、行高撑开、emit group、降级、opacity 保留、round-trip。具体见「实现契约 § 测试象限」。

## 影响

- **core**：`ir/text.ts`（加 `TextRunSchema`（含 opacity）/ `MathRunSchema` / `MixedLineSchema`，`IRLineSpec` union 第三支）、`parsers/inline-math.ts`（新建，`$...$` → runs，gated on lowerMath）、`compile/text-layout.ts`（新建，混排布局 + emit group）或扩 `compile/node.ts`、`compile/constant.ts`（加 `TEXT_MATH_PARSE_ERROR`，复用 ADR-01 的 `MATH_LOWERER_MISSING` / `MATH_TEX_INVALID`）、`src/index.ts`。复用 ADR-01 `options.lowerMath`。**red 级**（additive，旧纯文本零回归）。
- **renderer**：**零改动**（混排 emit 成既有 `GroupPrim` + `TextPrim` + `PathPrim`）。
- **对外 API**：`IRLineSpec` 加 union 支 + `text` 字符串支持 `$...$`（gated）；additive，旧纯文本 / 含 `$` 文本零回归。
- **文档站**：行内混排双语页 + demo（`$...$`、多公式一行、转义、与 A/B 对比）。

## 不在本 ADR 范围

- **自动换行 / reflow** —— 手动断行。
- **行内 display 数学（`$$`）/ 公式内嵌图元 / 其它 run 类型（链接 / 图标）** —— run 模型留口不实现。
- **A / B** —— [ADR-01](./01-tex-package-and-node-math.md) / [ADR-02](./02-node-embedded-math.md)。

---

## 实现契约（必填）🔻

### Level

`red`——动 `packages/core/core/src/ir/**`（text run 模型）、`parsers/**`（`$...$`）、`compile/**`（混排布局 + warn code）、`src/index.ts`（导出）。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/core/src/ir/text.ts` | 加 | `TextRunSchema` | `z.object({ text, fill?, opacity?, font? })` | — | 混排行内文字段（同 line 对象字段集，含 opacity） |
| 同上 | 加 | `MathRunSchema` | `z.object({ math: MathContentSchema })` | — | 混排行内公式段（基线对齐） |
| 同上 | 加 | `MixedLineSchema` | `z.object({ runs: z.array(union).min(1) })` | — | run 序列行（text+math 共基线） |
| 同上 | 改 | `IRLineSpec` / `TextBlockSchema` | union 加 `MixedLineSchema` 支 | — | 行可为 run 序列（additive 第三支） |
| `packages/core/core/src/compile/constant.ts` | 加 | `CompileWarningCode.TEXT_MATH_PARSE_ERROR` | const-enum 成员 | — | `$...$` 不闭合等解析容错的可诊断 warn |

`MathContentSchema` 来自 ADR-01（`ir/math.ts`）。`MATH_LOWERER_MISSING` / `MATH_TEX_INVALID` 复用 ADR-01。字段名 / warn code 写死。`TextPrim` **不改**。

### 文件 scope

- core：`ir/text.ts`（run schema + union 扩展，`TextRunSchema` 含 opacity）、`ir/index.ts`、`parsers/inline-math.ts`（新建：`$...$` → runs，gated on `lowerMath` 存在）、`parsers/index.ts`、`compile/text-layout.ts`（新建：混排行布局 + emit group）或扩 `compile/node.ts`、`compile/constant.ts`（`TEXT_MATH_PARSE_ERROR`）、`src/index.ts`（导出 run 类型）
- `@retikz/tex`：无新增（复用 ADR-01 `createLowerMath`）；`@retikz/react` 文本 children 透传 `$...$` 自然可用
- 测试：`packages/core/core/tests/ir/text-runs.test.ts`、`tests/compile/inline-math.test.ts`、`tests/parsers/inline-math.test.ts`
- **不动**：`render/src/**`、`primitive/text.ts`（TextPrim 不变）
- `apps/docs/**`（stage 4）

### 测试象限（≥9）

**Happy（≥3）**：`parse-dollar`（`"当 $v=d/t$ 时"` + lowerMath → `[text, math, text]` runs）；`mixed-line-layout`（run x 左→右累加、宽 = Σrun 宽）；`baseline-align`（公式 run 按 depth 贴文字基线）；`emit-group`（一行混排 → `GroupPrim(TextPrim + glyph PathPrim)`，renderer 零改动）。

**边界（≥2）**：`gating-no-lowermath`（未注入 lowerMath → `$5.00` 等字面、零行为变化）；`escaped-dollar`（`\$` → 字面 `$`）；`double-dollar-empty`（`$$` → 空 math 跳过）；`line-height-grows`（含分数 / 上标的公式 run 撑开行高）；`opacity-preserved`（text run `opacity` 生效）。

**错误路径（≥2）**：`unbalanced-dollar`（落单 `$` → 剩余按字面 + `onWarn(TEXT_MATH_PARSE_ERROR)`，不抛）；`mathrun-lowermath-missing`（注入了 lowerMath 但渲染失败 → `MATH_TEX_INVALID` 占位，文字 run 正常）；`invalid-tex-run`（单个非法 tex run 降级、不毁整行）。

**交互（≥2）**：`mixed-with-textanchor`（混排行 + block `align` → 行起点按行宽偏移）；`multiline-mixed`（多行、部分行含公式，逐行布局）；`per-run-style`（text run `fill` / `font` / `opacity` 生效、公式 run 颜色继承）。

**round-trip（≥1）**：含 `{ runs:[text(含 opacity), math] }` 的 IR JSON 往返深等。

### 依赖的现有元素

- `ir/text.ts` 的 `IRTextBlock` / `IRLineSpec` / `FontSchema` / 现有 line 对象 `opacity`—— **扩展**（加 run union 支，`TextRunSchema` 保留 opacity，旧支不动）。
- `compile/text-metrics.ts` 的 `measureText`（`{width, ascent?, descent?}`）—— **引用**（text run 测量；混排需 ascent/descent，缺省 fallback 估）。
- [ADR-01](./01-tex-package-and-node-math.md) 的 `options.lowerMath` + `IRMathContent` + math warn code —— **共用**（公式 run 测量 / emit / 降级）。
- `parsers/`（`parseWay` 等 IR 构造期 sugar）—— **参照**（`$...$` 解析同位；gating 读 `lowerMath` 是否注入）。
- `compile/constant.ts` 的 `CompileWarningCode` / `onWarn`—— **扩展**（`TEXT_MATH_PARSE_ERROR`；解析 / 降级走 warn 通道，非 `warnUnsupported`）。
- `primitive/{group,text,path}.ts`—— **引用**（混排 emit 产物，prim 不改）。
- `compile/node.ts` 文本 emit 路径 —— **扩展**（识别 run 序列走混排布局）。
