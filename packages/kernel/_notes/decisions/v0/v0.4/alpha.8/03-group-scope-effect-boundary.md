# ADR-03：Group / Scope 级视觉效果延期边界

- 状态：Accepted（2026-07-03 收尾确认：alpha.4 图元级 effect 语义保持；group / scope effect、blend isolation 与 offscreen composite 延后到独立设计）
- 决策日期：2026-07-03
- 关联：[v0.4-alpha.8 roadmap](./roadmap.md) · [ADR-01 closeout](./01-drawing-complete-alpha4-closeout.md) · [alpha.4 ADR-01 shadow](../alpha.4/01-scene-drop-shadow.md) · [alpha.4 ADR-02 blend](../alpha.4/02-blend-mode.md)

## 背景

alpha.4 已实现 element-level `shadow` / `blendMode`。它的明确边界是：effect 作用于 Node 主 shape、Path 主路径和端点箭头；Text、label、pin、GroupPrim、Scope 整体不继承。这个边界让 alpha.4 可以不引入 SVG group filter、blend isolation 或 Canvas offscreen composite。

从 Drawing Complete 的 Composition 能力面看，仍存在一个真实缺口：用户可能想表达“整张卡片含文字一起投影”、“一整个 scope 与背景混合”、“某个 group 内部先合成再与外部混合”。这些都不是 alpha.4 图元级 effect 能表达的。

alpha.8 不新增 runtime API。本 ADR 只把 group / scope 级 effect 定位为更长期或独立 ADR，不把它误归为 alpha.4 bug。

## 决策：group / scope 级 effect 继续延期，必须独立设计

alpha.8 固定以下边界：

1. **图元级 effect 维持现状**：`RectPrim` / `EllipsePrim` / `PathPrim` 支持 `shadow` / `blendMode`；`TextPrim` / `GroupPrim` 不支持。
2. **Scope 只能通过 `nodeDefault` / `pathDefault` 给子元素默认 effect**，不能把整个 scope 当一个合成层投影或混合。
3. **未来若做 group / scope effect，必须新增组级语义**：`GroupPrim` effect 字段、scope authoring surface、SVG `<g filter>` / isolation、Canvas offscreen draw-and-composite、layout overflow 与 hit-test 边界都要一起设计。
4. **blur / mask / layer 不搭车**：blur 依赖更复杂的滤镜支持；mask 与 clip / alpha composite 边界不同；named layer 是 zIndex 之上的 composition 主题。它们不随 group effect 自动进入 scope。

理由：

1. group effect 改变绘制顺序、合成边界与可能的 layout overflow，是 render-observable 行为，不适合 alpha.8 收口期插入。
2. SVG 与 Canvas 对 group isolation 的模型不同，必须有专门 parity 测试，不能简单把 `blendMode` 挂到 `GroupPrim`。
3. 保持 alpha.4 图元级效果稳定，有助于 beta / rc 前收敛 API 面。

## 未来设计必须回答的问题

- `GroupPrim.shadow` 是否扩大 Scene.layout，还是仅渲染外溢。
- `Scope shadow` 是否影响 synthetic scope bbox / anchor。
- `blendMode` 作用于组内每个元素，还是组先 offscreen 合成后整体混合。
- SVG 是否需要 `isolation:isolate`，Canvas 是否需要 offscreen canvas。
- group effect 是否影响 hit-test 命中区域，尤其 shadow 外溢是否可命中。
- animations 与 group effect 的合成顺序如何定义。

## 完备性影响

本 ADR 不执行完整绘图完备性检测；完整审计入口在 [ADR-01](./01-drawing-complete-alpha4-closeout.md)。这里仅记录 group / scope effect 对完备标准的影响：

- 对 Style / Resource 与 Composition 能力面：alpha.4 图元级 effect 已覆盖主几何 primitive，但不能表达“整组先合成再投影 / 混合”的 composition layer。
- 对 core 边界：组级 renderer-agnostic effect 属于 core 候选；具体卡片组件、编辑器 layer 面板或宿主 UI 不属于 core。
- 对后续设计：未来若支持 group / scope effect，需要一起设计 `GroupPrim` 或 Scene 组合层字段、layout overflow、SVG `<g filter>` / isolation、Canvas offscreen composite、hit-test 边界与跨端 parity 测试。
- 对 alpha.8：不新增 `IRScope.shadow`、`GroupPrim.shadow`、blend isolation 或 renderer composite 行为；只把缺口登记为独立后续设计。

## 不在本 ADR 范围

- 给 `GroupPrim` / `IRScope` 新增 effect 字段。
- 实现 SVG group filter 或 Canvas offscreen composite。
- 修改 alpha.4 `shadow` / `blendMode` 图元级语义。
- 设计 blur / mask / named layer。

---

> **实现指针**：本 ADR 已随 kernel v0.4-alpha.8 发布落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在发布 tag 历史中。

> 🔖 发布后压缩；压缩前完整施工蓝图 = `git show v0.4.0-alpha.8:packages/kernel/_notes/decisions/v0/v0.4/alpha.8/03-group-scope-effect-boundary.md`。
