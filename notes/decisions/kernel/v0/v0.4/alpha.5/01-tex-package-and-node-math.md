# ADR-01：`@retikz/tex` 包与公式降解能力

- 状态：Accepted（2026-06-17 完工；最终随 ADR-03 收敛）
- 决策日期：2026-06-16
- 关联：[v0.4-alpha.5 roadmap](./roadmap.md) · [ADR-03 行内混排](./03-inline-math-runs.md) · [core-design.md §7 AI 一等公民](../../../../../architecture/core-design.md) · `packages/kernel/tex` · `packages/kernel/core/src/compile/lower-tex.ts`

## 背景

retikz 是 TikZ-inspired 绘图库，必须能在节点、标签和说明文字中表达 LaTeX 公式。直接依赖 DOM、字体注入、MathML 或 renderer 私有能力都会破坏 renderer-agnostic Scene；唯一适合 core 底座的路径是把 MathJax SVG 中的 glyph path 降解成 retikz 已有的 `PathPrim`。

core 不能直接依赖 MathJax。公式降解需要像 `measureText` 一样作为宿主能力注入：core 只声明纯数据 schema、注入点、诊断与降级语义，具体 MathJax 初始化、SVG 解析、path 命令生成和缓存放在独立包 `@retikz/tex`。

## 决策

新增 core 组包 `@retikz/tex`，提供 MathJax SVG -> renderer-agnostic glyph path 的降解引擎：

- `createMathJaxEngine()` 启动 MathJax SVG 引擎。
- `createLowerTex(engine)` 返回可注入 core 的 `LowerTex`。
- `@retikz/tex/react` 提供 `useLowerTex()`，React 用户可直接传给 `<Layout lowerTex>`。
- MathJax 作为 optional peer，由用户安装和控制版本 / macro；core、render、react 都不依赖 MathJax。

最终公开模型在同一 alpha.5 未发布窗口内被 ADR-03 收敛：公式不是独立 `node.math` / `node.tex` 字段，也没有 `<TexNode>`；公式是文本的一部分。独立公式块写成节点文本中的单个 `$$...$$` display run，带框公式则是在同一个文本节点外加常规 `shape`。

错误语义沿用 core compile warn 通道：

- 未注入 `lowerTex` 时，含公式内容降级并发出 `TEX_LOWERER_MISSING`。
- `lowerTex` 返回 `null` 或 MathJax 失败时，公式段降级并发出 `TEX_INVALID`。
- core 不抛出 MathJax 运行时错误，不把 MathJax 对象、DOM 或字体状态写进 IR / Scene。

## 理由

1. glyph path 能复用现有 SVG / Canvas / Node renderer 的 path 管线，守住 Scene 的 renderer-agnostic 边界。
2. 独立 `@retikz/tex` 包把重依赖和异步初始化隔离在可选能力里，不污染 core 默认安装。
3. `lowerTex` 与既有 `measureText` 注入范式一致，缺失能力可以诊断降级。
4. 公式最终统一进文本 run，避免 `node.math`、`shape:'math'`、`<TexNode>` 等平行公开模型。

## 影响

- core 新增 `LowerTex` / `LoweredTex` 类型、`CompileOptions.lowerTex` 注入点、tex warn code，以及 compile 期 tex 降级通道。
- 新增 `packages/kernel/tex`，负责 MathJax SVG 解析、transform 展平、glyph path 输出和缓存。
- React / Vanilla 只负责透传 `lowerTex`；实际公式写法由 ADR-03 的文本 run 模型承载。
- 文档站新增 `@retikz/tex` 包页，并在示例中用 `useLowerTex()` 注入公式能力。

## 不在本 ADR 范围

- 公式编辑器、实时预览和增量重排。
- KaTeX / temml / MathML 等替代引擎。
- 化学式、乐谱等非数学 LaTeX 包的内建支持。
- 公式内部嵌入 retikz 图元或交互。

## 实现指针

实现以当前代码和测试为准，重点见：

- `packages/kernel/tex/src/**`
- `packages/kernel/core/src/compile/lower-tex.ts`
- `packages/kernel/core/src/compile/text-layout.ts`
- `packages/kernel/core/tests/compile/inline-tex.test.ts`
- `packages/kernel/tex/tests/lower-tex.test.ts`
- `apps/docs/src/contents/kernel/packages/tex/**`

> 压缩前完整施工蓝图：`git show 63220f823d012744b29551f0a4bf38ff269b0c7e:notes/decisions/core/v0/v0.4/alpha.5/01-tex-package-and-node-math.md`
