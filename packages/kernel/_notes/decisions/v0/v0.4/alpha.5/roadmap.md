# v0.4.0-alpha.5 路线：LaTeX 数学公式 `@retikz/tex`（E）

> 写于 2026-06-16。承接 [v0.4 roadmap 候选 E「数学公式」](../roadmap.md#e--数学公式latex2026-06-12-方向落地靠后)（方向已定：MathJax SVG → lowering 成路径，独立包 + optional peer）。
>
> 关联：[`v0.4 roadmap`](../roadmap.md) · [`core-design.md §7 AI 一等公民`](../../../../../../../notes/architecture/core-design.md) · `compile/compile.ts`（`options.lowerMath` 注入）· `compile/node.ts`（内容路径）· `ir/text.ts`（行内容模型）· `primitive/{group,path}.ts`

> **✅ 完工对账（2026-06-19）**：alpha.5（E1 + E2 + E3）全部落地。**最终实现形态以 [ADR-03](./03-inline-math-runs.md) 为真源**，与本设计稿有两处偏离，对账如下：
>
> 1. **命名**：本稿草拟的 `node.math` / `lowerMath` / `MATH_*` 最终落地为 `tex` 命名——文本里的 `$...$`（inline）/ `$$...$$`（display）/ 显式 `{ runs }`、`options.lowerTex`、warn `TEX_LOWERER_MISSING` / `TEX_INVALID` / `TEXT_TEX_PARSE_ERROR`。
> 2. **统一模型**：E1/E2 曾引入「公式作 node 内容」`node.tex` + `<TexNode>`，E3（ADR-03）在**同一未发布周期内**将其收敛为「公式 = 文本里的 math run」，`node.tex` / `<TexNode>` / 内容 `displayMode` 一并移除（未随任何 release 发布）。独立公式 = 内容为单个 `$$...$$` 的 node、带框公式 = 该 node 配 shape，A/B 由 C 吸收。
> 3. 解析在 **compile 期**（gated on `lowerTex` 注入），原始字符串留 IR；新增共享 `compile/text-layout.ts` 混排布局，node text / node label / edge label 复用。
>    下方 §接入机制 / §子项 是**设计阶段记录**，`node.math` / `lowerMath` 等措辞保留原貌、不回改，以本对账 + ADR-03 为最终口径。验收（见文末）全过：core/tex/react/vanilla `tsc` + 全仓 lint + 全测试绿、三端一致、文档（tex 包页 + karl-circle）同步。

## 定位

alpha.5 给 retikz 补上**数学排版**——一个 TikZ-inspired 库的旗舰刚需：节点 / 标签里写 LaTeX 公式。守 renderer-agnostic 红线：用 **MathJax SVG 模式**（glyph = SVG path，非字体），lower 成 `PathPrim`，三端（SVG / 浏览器 Canvas / Node 位图）一致、无字体注入。能力落在新独立包 **`@retikz/tex`**，MathJax 走 optional peerDependency；**core 不依赖 MathJax / tex 包**（经 `lowerMath` 注入接入），但本轮 core 新增内容 schema（`IRNode.math` / 行内 math run）+ `lowerMath` 注入点——**alpha.5 是 red-level core 变更**（additive / optional，缺省零回归）。

衡量标准：同一份带公式的 IR 经 `compileToScene`（注入 tex 能力）产出字形 `PathPrim`，三端视觉一致；缺省（无公式）时零回归；非法 tex 可诊断降级、不致崩。

## 子项（3 ADR，A 是地基，B/C 消费）

| #   | 子项                                                                             | 代号 | ADR                                         | 状态                                                                                                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------- | ---- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | `@retikz/tex` 包（core 分组）+ `lowerMath` 引擎 + `node.math` 内容（独立公式 A） | E    | [ADR-01](./01-tex-package-and-node-math.md) | ✅ Accepted（已实现 + 文档 + changelog；core schema/compile + `packages/kernel/tex` 引擎，真实 mathjax-full 集成验证；React 公式走 `<Node>` children 对象）                                                                                                       |
| E2  | 带框公式（B）——`node.math` + 任意 shape 容器                                     | E    | [ADR-02](./02-node-embedded-math.md)        | ✅ Accepted（经 E1 统一内容路径落地，几乎零增量；B 行为由 `node-math` 测试覆盖）                                                                                                                                                                                  |
| E3  | 行内 text+math 混排（C）——`IRLineSpec` run 序列 + `$...$`                        | E    | [ADR-03](./03-inline-math-runs.md)          | ✅ Accepted（v0.4.0-alpha.5，2026-06-19：`{ runs }` + `$...$`/`$$...$$`（compile 期 gated）+ 共享 `compile/text-layout.ts`；node text / node label / edge label 全覆盖。两处偏离：`$$..$$`=display、并把 E1/E2 的 `node.tex`/`<TexNode>` 收敛进文本 runs 全统一） |

## 接入机制（2026-06-16 拍板；route 2 激进 + 多 LLM 评审后定稿）

**统一为「公式作 node 内容」模型**（不引入 `shape:'math'` 平行模型——避免两套公开公式节点模型，见多 LLM 评审 BLOCKING 2）。公式始终是 node 内容（`node.math`，与 `text` 平行）/ 行内 math run，经 `options.lowerMath` 注入渲染。**alpha.5 接受 red-level core schema 变更**（多 LLM 评审 BLOCKING 1：B/C 确需改 core，roadmap 据实承认，不再声称「core 零改动」）：

- **共享地基（ADR-01）**：`@retikz/tex` 提供 MathJax→PathPrim 引擎 `createLowerMath(mathjax): LowerMath`（`tex2svg` → 解析 SVG `path d`（`<use>` 解引用 + transform 展平）→ `PathCommand[]` + bbox/depth（ex→user），按 tex 缓存，非法 tex → null）。core 新增 `IRNode.math`（`{tex, displayMode?}`）+ `CompileOptions.lowerMath` 注入 + `compile/node.ts` 内容路径（内容尺寸来源按 text/math 分派）。错误走既有 `CompileWarningCode` / `onWarn`（`MATH_LOWERER_MISSING` / `MATH_TEX_INVALID`），不扩 shape API、不抛。
- **A 独立公式块（ADR-01）** = 无 shape 的 `node.math`：bbox = 公式 bbox，复用 Node 全套几何（position / compass anchor / boundaryPoint 连线 / zIndex / opacity / alpha.4 shadow·blend）。react 公式作 `<Node>` children 对象 `<Node>{{ tex }}</Node>`（或 `math` prop），无 `<Math>` sugar。
- **B 带框公式（ADR-02）** = 有 shape 的 `node.math`：任意 shape（rectangle / circle / star…）容器据公式 bbox 自动尺寸（+ padding），框走 node 常规 `fill` / `stroke` / `cornerRadius`。几乎零增量（复用 ADR-01 内容路径 + 既有「shape 包住内容」链路）。
- **C 行内混排（ADR-03）** = `IRLineSpec` 增 run 序列（`TextRunSchema`（含 opacity）/ `MathRunSchema`）+ `$...$` 解析糖（**gated on `lowerMath` 存在**——未接 tex 时 `$` 字面，现有含 `$` 文本零回归）+ 混排布局（公式 run 按 depth 贴文字基线），emit `GroupPrim(TextPrim + glyph PathPrim)`。新增 `TEXT_MATH_PARSE_ERROR` warn code。
- **React/vanilla 注入通道（ADR-01 补齐，评审 BLOCKING 3）**：`@retikz/react` `Layout.tsx` 现仅传 shapes/arrows/patterns/pathGenerators/composites，**无 lowerMath 通道**——ADR-01 给 `Layout` 加 `lowerMath` prop 透传 `compileToScene`；vanilla `toScene` 同步透传；react builder 支持 `<Node>` children 写公式对象。**不另立 react-tex 包**——应用自行用 `@retikz/tex` 的 `createMathJaxEngine` + `createLowerMath`（effect 里 await startup）取得 `lowerMath` 传入 `<Layout>`。
- **MathJax = optional peerDependency**：照搬 `@napi-rs/canvas`（`peerDependenciesMeta.optional` + 动态 import + 缺失诊断），用户自装、掌控版本 / macro；引擎以**字面量** specifier 动态 import，打包器可解析 + 按需懒加载。

**三端 renderer 全零改动**——公式都 emit 成既有 `PathPrim` / `TextPrim` / `GroupPrim`。

为什么不用 composite→IR（plot 范式）：composite `expand` 产 Tier-1 IR、公式成独立 Tier2 节点，B「节点内容=公式」别扭、锚点只能走 scope bbox。「公式作 node 内容」让 A/B/C 共用一条 `node.math` / run + `lowerMath` 链路、单一公开模型，且 B 几乎免费。

## 依赖与边界

- **独立于其它候选**：纯新包 `@retikz/tex` + core 内容 schema 扩展（`IRNode.math` / 行内 math run）+ `options.lowerMath` 注入；不依赖 math / path 文法等其它 v0.4 方向。
- **不在 alpha.5**：
  - **公式编辑 / 实时预览 / 增量重排**：归 domain / 编辑器，非 core 机制。
  - **MathJax 之外的引擎（KaTeX / temml / MathML）**：font / DOM 绑定走不通 Canvas / Node，已淘汰（见 v0.4 roadmap §E）。
  - **化学式 / 乐谱等非数学 LaTeX 包**：MathJax 扩展由用户配 macro，core 不内置。
  - **公式内嵌入 retikz 图元 / 交互**：超出排版范围。

## 验收（alpha.5 整体）✅ 2026-06-19 全过

- [x] E1 / E2 / E3 各自 ADR 验收条款全过；core + tex + react + vanilla `tsc --noEmit` + 全仓 `pnpm lint` 全绿；全测试套件绿（core 2176 / react 415 / tex 24 / vanilla 85，含新增 `tests/{parsers/inline-tex,compile/inline-tex,ir/text-runs}`，并迁移删除 node-tex 测试）。
- [x] core 新增 `IRLineSpec.{ runs }`（`TextRun` / `MathRun`）+ `CompileOptions.lowerTex` 均 optional / additive，缺省（无公式、纯文本含 `$`）逐字不变、零回归；`$...$` 解析 gated on `lowerTex` 注入，未接 tex 时 `$` 字面。
- [x] 公式统一 emit 成既有 `PathPrim` / `TextPrim` / `GroupPrim`——**renderer 三端零改动**（沿用既有 prim 的三端一致性覆盖），含 `@retikz/tex` 真实 mathjax-full 经 `compileToScene` 端到端用例；MathJax 缺失 / 非法 tex / 不闭合 `$` 可诊断降级（`TEX_LOWERER_MISSING` / `TEX_INVALID` / `TEXT_TEX_PARSE_ERROR`）、不崩。
- [x] `apps/docs` 同步：tex 包页双语（`$...$` / `$$...$$` / `{ runs }` / 带框 / 多行 / 手动注入）+ karl-circle 七步示例（边标注、刻度、α、右侧文字 + 公式混排说明框）；changelog alpha.5 + ADR-03 + 本 roadmap 对账。
