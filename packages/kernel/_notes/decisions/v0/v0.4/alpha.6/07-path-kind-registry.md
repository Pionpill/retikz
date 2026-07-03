# ADR-07：Path kind registry

- 状态：Accepted
- 决策日期：2026-06-27
- Owner：core
- 关联：[kernel v0.4-alpha.6 roadmap](./roadmap.md) · [ADR-01](./01-ribbon.md) · [ADR-02](./02-ribbon-boundary-and-alignment.md) · [ADR-03](./03-ribbon-arc-cap.md) · [ADR-05](./05-ribbon-label.md) · [ADR-06](./06-path-ribbon-shared-contract.md)

## 背景

alpha.6 前半段曾把 ribbon 设计成独立 IR 实体。实现对账后发现，ribbon 与 stroke path 在 style、label、relation host、provenance 与 renderer 输出上高度同构；真正变化的是 path-like geometry kind。继续保留独立 `RibbonSchema` 会让内置 ribbon 获得特殊入口，而自定义 path-like 扩展只能另走补丁机制。

## 决策记录

Path 是 core 唯一的 path-like relation host。公开 IR 使用 `type: "path"`，并通过 `kind` 选择 path geometry：

- `kind: "stroke"` 表示既有普通路径；省略 `kind` 等价于 stroke。
- `kind: "ribbon"` 表示可变宽度 ribbon，参数位于 `ribbon`。
- 不发布 `type: "ribbon"`、`RibbonSchema` 或 `IRRibbon` 公共实体。

新增 path kind registry：

- `PathKindDefinition` 描述 kind 名称、schema、compile/lowering contract 与扩展能力。
- `definePathKind` 供内置与自定义 kind 使用。
- `CompileOptions.pathKinds` 注册额外 path kind。
- unknown kind 必须 fail-loud，并列出已注册 kind。
- 同名覆盖允许但必须警告，避免扩展无声替换内置行为。

共享契约：

- `DrawableStyleSchema` 与 `DrawableMetaSchema` 承载 path-like 公共 style/meta。
- `GeometryLabelSchema` 由 `Path.label` 统一承载，stroke path 与 ribbon path kind 共享。
- `RibbonPathOptionsSchema` 承载 ribbon-only 几何字段：`mode`、`width`、`start`、`end`、`interpolation`、`align`、`samples`、`sampling`、`upper`、`lower`。

React `<Ribbon>` 可以作为 sugar 保留，但必须产出 `Path kind="ribbon"`；文档也应把 Ribbon 放在 Path kind / relation host 语境下，而不是与 Node/Path 并列成新的 core primitive 家族。

## 被否决方案

- 保留独立 Ribbon IR：短期直观，但会制造 path-like host 分裂。
- 只把 ribbon 写成内置 if/else：不满足 definition / registry / capability contract 的扩展原则。
- 要求所有用户显式写 `kind: "stroke"`：会造成无意义破坏；省略 kind 仍可表示既有 path。
- 把自定义 kind 放到 renderer：扩展应在 core compile 前被 schema 与 registry 管理。

## 实现指针

- 发布版本：kernel group `v0.4.0-alpha.6`。
- 主要文件范围：core path schema/registry/compile，React sugar，Vanilla 消费，docs Path/Ribbon 页面。
- 验收范围：stroke 兼容、ribbon path kind 编译、custom kind 注册、unknown kind 诊断、React `<Ribbon>` 等价输出、plot relation ribbon 消费。

> 🔄 本文件压缩前完整施工蓝图 = `git show a1afbddcd7f916acacc98a6bc4be9b49a7cb0f33:_notes/decisions/kernel/v0/v0.4/alpha.6/07-path-kind-registry.md`（封板全文）。
