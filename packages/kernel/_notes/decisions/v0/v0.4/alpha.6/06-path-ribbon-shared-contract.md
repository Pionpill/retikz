# ADR-06：Path / Ribbon shared contract

- 状态：被 ADR-07 收敛
- 决策日期：2026-06-26
- 关联：[ADR-07](./07-path-kind-registry.md)

## 背景

普通 Path 与 Ribbon 都是 path-like drawable host，共享 style、meta、label、provenance 和图层语义；分别维护会使 schema、renderer 和领域消费分叉

## 决策

Path 是唯一 path-like IR host。共享字段由 `DrawableStyleSchema` 与 `DrawableMetaSchema` 承载：颜色、fill、opacity、shadow、blendMode、zIndex 等 drawable 级字段由两类 Path kind 共用

Path-only 字段继续属于 stroke path，包括 dash、arrow、lineCap、lineJoin、roundedCorners、marks、children 等；ribbon-only 字段进入 `Path.ribbon`，包括 mode、width、start/end、interpolation、align、samples/sampling、upper/lower。`Path.label` 统一复用 `GeometryLabelSchema`

内置和自定义 path kind 必须通过同一 registry 消费共享 contract；内置 Ribbon 不得走私有入口

## 兼容性与最终结果

ADR-07 将上述共享契约纳入 `type: "path"`，保持普通 stroke 的默认和字段语义；共享 schema 是 IR 真源，不提供 renderer 私有字段或独立 Ribbon defaults

## 遗留边界

领域 Path recipe、布局和 renderer-specific drawing behavior 仍由各自 owner 负责
