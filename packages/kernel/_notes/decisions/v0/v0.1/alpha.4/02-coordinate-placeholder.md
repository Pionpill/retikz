# ADR-02：`<Coordinate>` 占位节点的 IR 表达

- 状态：Accepted（已实现）
- 决策日期：2026-05-10
- 关联：[v0 roadmap §v0.1.0-alpha.4](../../roadmap.md) · tikz-gap-analysis §3（历史分析已删除）

> **目标**：把 TikZ `\coordinate (m) at (3,2);`（命名一个点、不画图形、供相对定位 / path 端点引用）升为一等 IR 概念。

## 背景 / 约束

- alpha.3 无占位概念，"放个引用点"得 fake 空 Node（`stroke/fill=transparent`）：仍走 layoutNode 撑出不可见矩形并参与 viewBox 扩展；AI / codec 无法区分真 Node 与 fake 占位；用户心智从"点"绕到"不可见矩形"。

## 决策：独立 `IRChild` kind `'coordinate'`

`IRChild` discriminated union 从 2 项（node / path）扩到 3 项，coordinate 仅 `id`（必填）+ `position`（三形态同 Node）。编译期单独 case：不发 primitive、不扩 bbox，但注册进 nodeIndex 让 path / `at.of` 能命中。

设计细节（具体决策）：

- **nodeIndex 表示**：coordinate 复用 `NodeLayout`，构造 `shape:'rectangle'` + 0×0 矩形。`boundaryPoint` 在 0×0 rect 上恒返回中心，正合"占位无形状边界"——path 端点引用时贴中心、不外扩；零尺寸是 NodeLayout 本就允许的合法值，不污染类型、未来加字段也能跟着默认，无需拆 union。
- **不进 viewBox**：allPoints 只在 `type==='node'` 分支 push 4 角，coordinate 分支不 push——故含极远 coordinate 的场景 viewBox 与空场景一致（走空点集兜底）。

理由：

1. **Schema 字段最少**（id + position）——AI 生成 / 校验最简单。
2. **discriminator 正交**——`type` 一眼分 node / path / coordinate，三类各管自己。
3. **与现有体系对称**——polar `origin` / Step `to` / `at.of` 全经 nodeIndex 字符串引用，coordinate 加进 nodeIndex 即可。

## 长期边界

- coordinate 自身 anchor（`m.north`）：占位无形状边界，所有 anchor 退化为中心，不提供显式 anchor 语法。
- `\path[name path=...]` / `\path coordinate (...)` 等其它占位变体：留 v0.2+。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：正文所列默认行为与既有契约保持兼容；其余默认行为、失败语义与公开契约以正文为准。
