# @retikz/tex 工作指南

本文件只写 `@retikz/tex` 包内特有规则。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，kernel 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：把可选 TeX 排版引擎接入 Core 的 `LowerTex` 契约，使公式在进入 Scene 前成为 renderer-agnostic 字形路径
- **拥有的契约**：最小 TeX → SVG engine abstraction、MathJax optional-peer 集成、MathJax SVG 字形解析与 lowering、结果缓存及 `@retikz/tex/react` 异步 hook
- **不拥有的能力**：Core 文本 IR / schema、通用 SVG parser / renderer、字体排版标准、公式编辑器 UI、React 图形组件或 renderer 私有文本节点
- **输入与输出**：接收 TeX source、文本 style 与可注入 engine，复用 math 的纯仿射原子，输出符合 core `LowerTex` 的同步 lowerer 及 `LoweredTex | null`；通过 compile options 注入，不让 core 反依赖本包
- **缺口流向**：通用文本契约补 `@retikz/core`；TeX 引擎与字形转换留本包；路径执行交给 `@retikz/render`；React 初始化只留薄 hook；编辑体验和业务错误展示留应用层

## 硬约束

- `mathjax-full` 与 React 保持 optional peers；根入口不静态依赖 React，React 能力只从 `./react` 暴露。
- SVG parser 只服务受支持的 TeX 引擎输出，不扩张成通用 SVG 导入器。
- 二维矩阵表示、复合与点映射直接复用 `@retikz/math`；SVG 语法、可逆性、similarity 与 stroke policy 留在本包。
- 输出必须是 core 可消费的 plain data，不把 DOM、MathJax 实例或 SVG 字符串写入 IR / Scene。
- 解析失败返回契约允许的失败结果并由 core 诊断；不得静默生成错误字形。

## 验证

结构化改动后至少运行：

```bash
pnpm --filter @retikz/tex exec eslint . --fix
pnpm --filter @retikz/tex exec tsc --noEmit
pnpm --filter @retikz/tex test:changed
```
