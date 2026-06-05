# ADR-02：`<Tikz>` → `<TikZ>` 组件改名

- 状态：Accepted（已实现）
- 决策日期：2026-05-14
- 关联：[v0.1-beta.2 plan TODO-2](./roadmap.md) · [AGENTS.md Kernel / Sugar / Tier 2 分层](../../../../../../AGENTS.md)

> **范围**：把顶层 React 容器从 `Tikz` / `TikzProps` 改为品牌一致的 `TikZ` / `TikZProps`（尾 `Z` 大写），不保留 alias。

## 背景 / 约束

- 原 LaTeX 项目品牌写法是 `TikZ`，尾部 `Z` 大写；顶层容器是用户最常 import、最常在文档中看到的组件，保持 `<TikZ>` 更贴近原品牌，也更易被熟悉 TikZ 的用户和 LLM 语料命中。
- 顶层容器是所有 JSX DSL 入口，改名波及 import / JSX 标签 / docs demo / 测试，是明确 breaking；beta 阶段仍允许公开 API 改名，rc 起冻结。

## 决策：直接改为 `TikZ` / `TikZProps`，不保留 alias

`Tikz` → `TikZ`、`TikzProps` → `TikZProps`，public barrel 只导出新名；组件 `displayName` 同步、builder 的 display-name 判断跟进；所有 docs demo / MDX 示例统一替换。文档路由 slug 仍可小写 `tikz`（不属于 React API surface）。

理由：

1. beta 不考虑兼容性，应在 rc 前把顶层命名一次性收敛。
2. `TikZ` 与原品牌一致，公开 API 表意更准确。
3. 不保留 alias 可避免 docs / autocomplete / LLM 示例继续扩散旧写法。

### 被否决的选项

- **B：新增 `TikZ`、保留 `Tikz` deprecated alias** —— 对用户更平滑，但把旧命名带进 rc 前最后窗口，文档和类型 hover 长期出现两个顶层容器名。
- **C：保持 `Tikz`** —— 无迁移成本，但错过 beta 改名窗口。

## 不在本 ADR 范围

- 新增 `<Scope>` / `<Group>` / 其他 Kernel 组件。
- 修改顶层容器 props 语义或默认值。
- 改文档页面 slug / sidebar key。
- 为旧 `<Tikz>` 提供 runtime warning 或 codemod 包。

---

> **实现指针**：level `red`（改 `@retikz/react` 公开组件名 + props 类型名，影响所有 docs demo；运行时管线不变）。本 ADR 落地后顶层容器又经后续改名为 `<Layout>`，当前真源以代码为准——`react/src/kernel/Layout.tsx`（组件 + props 类型）、`react/src/kernel/index.ts` / `react/src/index.ts`（public export）、`react/src/kernel/_displayNames.ts` / `builder.ts`（display-name 判断）。测试在 `react/tests/kernel/`。完整原文（实现契约 / Schema 改动表 / 测试象限）见本文件 git 历史。
