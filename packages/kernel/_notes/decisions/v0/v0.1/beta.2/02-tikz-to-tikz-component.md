# ADR-02：`<Tikz>` → `<TikZ>` 组件改名

- 状态：Accepted（已实现）
- 决策日期：2026-05-14
- 关联：

> **目标**：把顶层 React 容器从 `Tikz` / `TikzProps` 改为品牌一致的 `TikZ` / `TikZProps`（尾 `Z` 大写），不保留 alias。

## 背景 / 约束

- 原 LaTeX 项目品牌写法是 `TikZ`，尾部 `Z` 大写；顶层容器是用户最常 import、最常在文档中看到的组件，保持 `<TikZ>` 更贴近原品牌，也更易被熟悉 TikZ 的用户和 LLM 语料命中。
- 顶层容器是所有 JSX DSL 入口，改名波及 import / JSX 标签 / docs demo / 测试，是明确 breaking；beta 阶段仍允许公开 API 改名，rc 起冻结。

## 决策：直接改为 `TikZ` / `TikZProps`，不保留 alias

`Tikz` → `TikZ`、`TikzProps` → `TikZProps`，public barrel 只导出新名；组件 `displayName` 同步、builder 的 display-name 判断跟进；所有 docs demo / MDX 示例统一替换。文档路由 slug 仍可小写 `tikz`（不属于 React API surface）。

理由：

1. beta 不考虑兼容性，应在 rc 前把顶层命名一次性收敛。
2. `TikZ` 与原品牌一致，公开 API 表意更准确。
3. 不保留 alias 可避免 docs / autocomplete / LLM 示例继续扩散旧写法。

## 长期边界

- 新增 `<Scope>` / `<Group>` / 其他 Kernel 组件。
- 修改顶层容器 props 语义或默认值。
- 改文档页面 slug / sidebar key。
- 为旧 `<Tikz>` 提供 runtime warning 或 codemod 包。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：正文所列公开契约变更按 breaking 迁移；其余默认行为、失败语义与公开契约以正文为准。
