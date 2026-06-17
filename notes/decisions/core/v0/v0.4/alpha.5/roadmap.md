# v0.4.0-alpha.5 路线：LaTeX 数学公式 `@retikz/tex`（E）

> 写于 2026-06-16。承接 [v0.4 roadmap 候选 E「数学公式」](../roadmap.md#e--数学公式latex2026-06-12-方向落地靠后)（方向已定：MathJax SVG → lowering 成路径，独立包 + optional peer）。
>
> 关联：[`v0.4 roadmap`](../roadmap.md) · [`core-design.md §7 AI 一等公民`](../../../../../architecture/core-design.md) · `compile/compile.ts`（`options.lowerMath` 注入）· `compile/node.ts`（内容路径）· `ir/text.ts`（行内容模型）· `primitive/{group,path}.ts`

## 定位

alpha.5 给 retikz 补上**数学排版**——一个 TikZ-inspired 库的旗舰刚需：节点 / 标签里写 LaTeX 公式。守 renderer-agnostic 红线：用 **MathJax SVG 模式**（glyph = SVG path，非字体），lower 成 `PathPrim`，三端（SVG / 浏览器 Canvas / Node 位图）一致、无字体注入。能力落在新独立包 **`@retikz/tex`**，MathJax 走 optional peerDependency；**core 不依赖 MathJax / tex 包**（经 `lowerMath` 注入接入），但本轮 core 新增内容 schema（`IRNode.math` / 行内 math run）+ `lowerMath` 注入点——**alpha.5 是 red-level core 变更**（additive / optional，缺省零回归）。

衡量标准：同一份带公式的 IR 经 `compileToScene`（注入 tex 能力）产出字形 `PathPrim`，三端视觉一致；缺省（无公式）时零回归；非法 tex 可诊断降级、不致崩。

## 子项（3 ADR，A 是地基，B/C 消费）

| # | 子项 | 代号 | ADR | 状态 |
|---|---|---|---|---|
| E1 | `@retikz/tex` 包 + `lowerMath` 引擎 + `node.math` 内容（独立公式 A） | E | [ADR-01](./01-tex-package-and-node-math.md) | ✅ Accepted（已实现 + 文档 + changelog；core schema/compile + `@retikz/tex`(+react) 引擎，真实 mathjax-full 集成验证） |
| E2 | 带框公式（B）——`node.math` + 任意 shape 容器 | E | [ADR-02](./02-node-embedded-math.md) | ✅ Accepted（经 E1 统一内容路径落地，几乎零增量；B 行为由 `node-math` 测试覆盖） |
| E3 | 行内 text+math 混排（C）——`IRLineSpec` run 序列 + `$...$` | E | [ADR-03](./03-inline-math-runs.md) | ⏸ Proposed（**延后**：最重，扩 core text-run 模型 + `$...$` parser + 混排布局；留下一里程碑单独做，文档已标注「行内混排待后续」） |

## 接入机制（2026-06-16 拍板；route 2 激进 + 多 LLM 评审后定稿）

**统一为「公式作 node 内容」模型**（不引入 `shape:'math'` 平行模型——避免两套公开公式节点模型，见多 LLM 评审 BLOCKING 2）。公式始终是 node 内容（`node.math`，与 `text` 平行）/ 行内 math run，经 `options.lowerMath` 注入渲染。**alpha.5 接受 red-level core schema 变更**（多 LLM 评审 BLOCKING 1：B/C 确需改 core，roadmap 据实承认，不再声称「core 零改动」）：

- **共享地基（ADR-01）**：`@retikz/tex` 提供 MathJax→PathPrim 引擎 `createLowerMath(mathjax): LowerMath`（`tex2svg` → 解析 SVG `path d`（`<use>` 解引用 + transform 展平）→ `PathCommand[]` + bbox/depth（ex→user），按 tex 缓存，非法 tex → null）。core 新增 `IRNode.math`（`{tex, displayMode?}`）+ `CompileOptions.lowerMath` 注入 + `compile/node.ts` 内容路径（内容尺寸来源按 text/math 分派）。错误走既有 `CompileWarningCode` / `onWarn`（`MATH_LOWERER_MISSING` / `MATH_TEX_INVALID`），不扩 shape API、不抛。
- **A 独立公式块（ADR-01）** = 无 shape 的 `node.math`：bbox = 公式 bbox，复用 Node 全套几何（position / compass anchor / boundaryPoint 连线 / zIndex / opacity / alpha.4 shadow·blend）。react `<Math tex>` = `<Node math>` sugar。
- **B 带框公式（ADR-02）** = 有 shape 的 `node.math`：任意 shape（rectangle / circle / star…）容器据公式 bbox 自动尺寸（+ padding），框走 node 常规 `fill` / `stroke` / `cornerRadius`。几乎零增量（复用 ADR-01 内容路径 + 既有「shape 包住内容」链路）。
- **C 行内混排（ADR-03）** = `IRLineSpec` 增 run 序列（`TextRunSchema`（含 opacity）/ `MathRunSchema`）+ `$...$` 解析糖（**gated on `lowerMath` 存在**——未接 tex 时 `$` 字面，现有含 `$` 文本零回归）+ 混排布局（公式 run 按 depth 贴文字基线），emit `GroupPrim(TextPrim + glyph PathPrim)`。新增 `TEXT_MATH_PARSE_ERROR` warn code。
- **React/vanilla 注入通道（ADR-01 补齐，评审 BLOCKING 3）**：`@retikz/react` `Layout.tsx` 现仅传 shapes/arrows/patterns/pathGenerators/composites，**无 lowerMath 通道**——ADR-01 给 `Layout` 加 `lowerMath` prop 透传 `compileToScene`；vanilla `toScene` 同步透传。`@retikz/tex-react` 的 `useLowerMath` 启动 MathJax 并经此注入。
- **MathJax = optional peerDependency**：照搬 `@napi-rs/canvas`（`peerDependenciesMeta.optional` + 动态 import + 缺失诊断），用户自装、掌控版本 / macro。

**三端 renderer 全零改动**——公式都 emit 成既有 `PathPrim` / `TextPrim` / `GroupPrim`。

为什么不用 composite→IR（plot 范式）：composite `expand` 产 Tier-1 IR、公式成独立 Tier2 节点，B「节点内容=公式」别扭、锚点只能走 scope bbox。「公式作 node 内容」让 A/B/C 共用一条 `node.math` / run + `lowerMath` 链路、单一公开模型，且 B 几乎免费。

## 依赖与边界

- **独立于其它候选**：纯新包 `@retikz/tex` + core 内容 schema 扩展（`IRNode.math` / 行内 math run）+ `options.lowerMath` 注入；不依赖 math / path 文法等其它 v0.4 方向。
- **不在 alpha.5**：
  - **公式编辑 / 实时预览 / 增量重排**：归 domain / 编辑器，非 core 机制。
  - **MathJax 之外的引擎（KaTeX / temml / MathML）**：font / DOM 绑定走不通 Canvas / Node，已淘汰（见 v0.4 roadmap §E）。
  - **化学式 / 乐谱等非数学 LaTeX 包**：MathJax 扩展由用户配 macro，core 不内置。
  - **公式内嵌入 retikz 图元 / 交互**：超出排版范围。

## 验收（alpha.5 整体）

- E1 / E2 / E3 各自 ADR 验收条款全过；core + tex + 下游 `tsc --noEmit` + 全仓 `pnpm lint` 全绿。
- core 新增 `IRNode.math` / 行内 math run / `CompileOptions.lowerMath` 均 optional / additive，缺省（无公式、纯文本含 `$`）逐字不变、零回归；`$...$` 解析 gated on `lowerMath` 注入，未接 tex 时 `$` 字面。
- 三端（SVG / 浏览器 Canvas / Node 位图）公式视觉一致性测试（几何断言 / 字形 path 数量与 bbox）；MathJax 缺失 / 非法 tex 有可诊断降级。
- `apps/docs` 同步：公式双语文档 + demo（独立公式块 / 节点内嵌 / 行内混排 + MathJax 安装说明）。
