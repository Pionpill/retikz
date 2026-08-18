# ADR-03: endpoint arrow split 命名中性化

- 状态：Accepted（已实现）
- 决策日期：2026-05-14
- 关联： · [beta.1 ADR-01 renderer-neutral core](../beta.1/01-core-comments-renderer-neutral.md)

> **目标**：把 core 拆分 sub-path 的 helper 从 `splitSubPathsForMarkers` 改为 `splitSubPathsForEndpointArrows`，注释不再以 SVG marker 解释，回归端点箭头的中性语义。

## 背景 / 约束

- 实际语义不是「core 需要 SVG marker」，而是「端点箭头只属于整条 path 的首端和末端」：一条 `PathPrim` 内含多个 sub-path 时，把箭头挂到每个 sub-path 会在中间断点产生多余箭头。
- SVG marker 只是 React/SVG renderer 的实现方式；Canvas / PDF / Skia renderer 也会面对同一端点箭头语义。core compile 层的命名与注释属于 beta.2 正在收敛的 renderer-neutral 泄漏。

## 决策：改名为 `splitSubPathsForEndpointArrows`

helper 命名与注释改为 endpoint arrows / path endpoints 语义；core 输出的是 `arrowStart` / `arrowEnd` 端点箭头规格，不是 renderer marker。

理由：

1. beta.2 在收敛 core 的 renderer-neutral 边界，旧命名 / 注释属同类泄漏。
2. 改动为 internal 级，不改 IR / Scene 结构与运行时结果。
3. 新命名更准确：多 sub-path + 有端点箭头时，仅首段保留 `arrowStart`、末段保留 `arrowEnd`。

决策细节：注释改为「多 sub-path + 有端点箭头时，仅首段保留 `arrowStart`，末段保留 `arrowEnd`」；测试标题不再写 SVG marker，只断言首末端箭头归属；React/SVG renderer 仍可把 `arrowStart` / `arrowEnd` 翻译成 SVG marker。

## 长期边界

- 改变 sub-path 拆分行为（仅命名 / 注释收敛）。
- React renderer 的 marker id / marker dedup 行为。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：正文所列默认行为与既有契约保持兼容；其余默认行为、失败语义与公开契约以正文为准。
