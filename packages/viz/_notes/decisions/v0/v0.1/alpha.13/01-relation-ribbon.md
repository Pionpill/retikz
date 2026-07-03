# ADR-01：Relation ribbon

- 状态：Accepted
- 决策日期：2026-06-25
- Owner：plot
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [kernel alpha.6 ADR-07](../../../../../../kernel/_notes/decisions/v0/v0.4/alpha.6/07-path-kind-registry.md)

## 背景

plot 的 relation 需要表达有流量宽度的边，例如 Sankey、alluvial 或 flow relation。alpha.13 不能新增 chart preset，也不能让 plot 绕开 core 输出私有 ribbon primitive；它必须复用 kernel alpha.6 定稿的 `Path kind="ribbon"`。

## 决策记录

`RelationMark` 增加 `kind?: "path" | "ribbon"`，默认仍为 `"path"`。当 `kind: "ribbon"` 时，relation 复用现有 source/target/transform/color/provenance 机制，但 lowering 产物是 core `Path`，且 `kind` 为 `"ribbon"`。

字段边界：

- shared relation 字段继续放在 mark 顶层，例如 source、target、transform、style、label 与 provenance。
- path-only 几何字段放在 `path` 子对象。
- ribbon-only 几何字段放在 `ribbon` 子对象。
- ribbon 第一版表达单段 source -> target relation，至少需要 width；可选端点宽度、曲率等仍是 ribbon 子对象语义。
- `kind: "ribbon"` 不支持 `path.route`、via、routing、step label 或 arrow；这些属于 path relation 的路由/step 模型。

该设计保持 plot 只是 grammar/lowering 层：relation ribbon 不是新 chart，不新增 `RibbonMark`，也不绕开 core path kind registry。

## 被否决方案

- 新增 `RibbonMark`：会把 relation 的 source/target/provenance 复制一套。
- 让 plot 输出 raw path primitive：会跳过 core `Path.kind="ribbon"` 的 schema 与 label host。
- 在 `path` 子对象里混放 ribbon 参数：会让 path route 与 ribbon centerline 语义相互污染。
- 支持 route step ribbon 第一版：需要定义多段宽度插值、step label 与转角闭合，超出 alpha.13 范围。

## 实现指针

- 发布版本：viz group `v0.1.0-alpha.13`。
- 依赖能力：kernel group `v0.4.0-alpha.6` 的 `Path.kind="ribbon"`。
- 验收范围：`packages/viz/plot` relation schema/lowering，React `<RelationMark kind="ribbon">`，Vanilla PlotSpec 消费，以及 viz relation docs/demo。

> 🔄 本文件压缩前完整施工蓝图 = `git show a1afbddcd7f916acacc98a6bc4be9b49a7cb0f33:_notes/decisions/graph/v0/v0.1/alpha.13/01-relation-ribbon.md`（封板全文）。
