# ADR-05：Ribbon host label

- 状态：被 ADR-07 收敛
- 决策日期：2026-06-26
- Owner：core
- 关联：[kernel v0.4-alpha.6 roadmap](./roadmap.md) · [ADR-07](./07-path-kind-registry.md) · [graph alpha.13 ADR-07](../../../../../../graph/_notes/decisions/v0/v0.1/alpha.13/07-mark-label-surface.md)

## 背景

ribbon 作为关系图元，需要能承载沿中心线或带状区域放置的标签。若 label 只能通过额外 text/node 叠加，文字会脱离 relation host、provenance、命中区域和后续交互策略。

## 决策记录

本 ADR 确立 ribbon 需要 host label 能力，但最终公开字段被 ADR-07 收敛为共享的 `Path.label`。也就是说，ribbon 不拥有独立的 label schema；`type: "path", kind: "ribbon"` 与普通 path 共用 `GeometryLabelSchema`。

稳定结论：

- path-like label 属于 geometry host，而不是 sibling text primitive。
- ribbon label 沿 path-like 几何投递，复用 `position`、`side`、`sloped`、`placement` 等 geometry label 字段。
- ribbon boundary 专用 label 不进入 alpha.6 第一版；如果后续需要按 upper/lower boundary 单独放置，应另开 ADR。
- plot relation ribbon label 通过 graph alpha.13 的 mark label surface 投递到最终 core `IRPath.label`。

## 被否决方案

- 新增 `Ribbon.label` 独立 schema：会和 path label 形成两套并行语义。
- 用额外 node/text 绘制 ribbon 文字：会丢失宿主关系。
- 在 plot relation 中定义 ribbon-only label：会绕开 core 的 label contract。

## 实现指针

- 最终公开契约见 [ADR-07](./07-path-kind-registry.md)：`Path.label` 由 stroke path 与 ribbon path kind 共享。
- 发布版本：kernel group `v0.4.0-alpha.6`。
- 验收范围：core geometry label schema、ribbon path 编译，以及 graph relation ribbon label 投递。

> 🔄 本文件压缩前完整施工蓝图 = `git show a1afbddcd7f916acacc98a6bc4be9b49a7cb0f33:_notes/decisions/kernel/v0/v0.4/alpha.6/05-ribbon-label.md`（封板全文）。
