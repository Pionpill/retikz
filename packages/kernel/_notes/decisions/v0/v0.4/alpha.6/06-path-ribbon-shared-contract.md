# ADR-06：Path / Ribbon shared contract

- 状态：被 ADR-07 收敛
- 决策日期：2026-06-26
- Owner：core
- 关联：[kernel v0.4-alpha.6 roadmap](./roadmap.md) · [ADR-07](./07-path-kind-registry.md)

## 背景

普通 path 与 ribbon 都是 path-like drawable host：它们共享 style、meta、label、provenance 与图层语义，但几何参数不同。若分别维护两套字段，内置能力和扩展能力会在 schema、renderer 与 plot relation 消费上分叉。

## 决策记录

本 ADR 将 path/ribbon 的公共字段抽成共享 drawable contract。ADR-07 最终把命名收敛为 `DrawableStyleSchema` 与 `DrawableMetaSchema`，并让 `Path` 作为唯一 path-like IR host。

稳定结论：

- 共享 style 包括颜色、fill、opacity、shadow、blendMode、zIndex 等 drawable 级字段。
- path-only 字段继续留在 stroke path 语义中，例如 dash、arrow、lineCap、lineJoin、roundedCorners、marks、children 等。
- ribbon-only 字段进入 `Path.ribbon`，例如 mode、width、start/end、interpolation、align、samples/sampling、upper/lower。
- label 复用 `GeometryLabelSchema`，由 `Path.label` 统一承载。
- 内置与自定义 path kind 通过同一 registry 消费共享 contract，不给内置 ribbon 走私有入口。

## 被否决方案

- 保留独立 `RibbonDefault` / `RibbonStyle`：会制造与 PathDefault 平行的配置面。
- 把共享 style 写成 renderer 私有字段：会让 Scene 不再是唯一渲染契约。
- 仅在 TypeScript 类型上抽公共字段：zod schema 才是 IR 单一真源，必须在 schema 层收敛。

## 实现指针

- 最终公开契约见 [ADR-07](./07-path-kind-registry.md)。
- 发布版本：kernel group `v0.4.0-alpha.6`。
- 验收范围：core schema registry、Path default 继承、plot relation ribbon 对共享 style/meta 的消费。

> 🔄 本文件压缩前完整施工蓝图 = `git show a1afbddcd7f916acacc98a6bc4be9b49a7cb0f33:_notes/decisions/kernel/v0/v0.4/alpha.6/06-path-ribbon-shared-contract.md`（封板全文）。
