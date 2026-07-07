# ADR-04：Node label inside placement

- 状态：Accepted
- 决策日期：2026-06-26
- Owner：core
- 关联：[kernel v0.4-alpha.6 roadmap](./roadmap.md) · [plot alpha.13 ADR-07](../../../../../../viz/_notes/decisions/plot/v0/v0.1/alpha.13/07-mark-label-surface.md)

## 背景

Node label 早期主要表达外侧标签，适合普通点、矩形节点和关系端点。但 plot 的 bar、cell、sector 等 node-like 图元需要把文字放在图元内部，且需要能稳定描述“顶部中点”“右侧 30%”这类边界位置。

## 决策记录

`Node.label` 增加 `placement` 与边界位置能力：

- `placement` 支持 `outside` 与 `inside`，默认仍为 `outside`。
- `position` 可以继续使用既有锚点，也可以在 box-like boundary 上使用 `{ boundary, fraction }`。
- `position: "center"` 是几何中心语义，不受 `placement` 改写。
- `inside` 不与 `pin` 混用；pin 表示外部引线，不适合作为内部 label contract。
- `{ boundary, fraction }` 第一版只承诺 box-like boundary，可由后续 shape definition 扩展。

该设计让 core 保持 label host 的唯一来源；plot 只把 mark label 投递给 node host，不重新定义 inside/outside 几何。

## 被否决方案

- 在 plot 新增 bar/cell 专用 label 字段：会复制 core label layout 语义。
- 用 text primitive 模拟内部标签：文字会脱离 node provenance、anchor 与后续 interaction policy。
- 让 `pin` 兼容内部标签：pin 的引线语义和 inside placement 冲突。

## 实现指针

- 发布版本：kernel group `v0.4.0-alpha.6`。
- 主要消费方：plot alpha.13 mark label surface 将 interval/cell/sector label 投递到 `Node.label`。
- 验收范围：core node label schema、boundary position 编译、inside/outside placement 和文档 Node label 说明。

> 🔄 本文件压缩前完整施工蓝图 = `git show a1afbddcd7f916acacc98a6bc4be9b49a7cb0f33:_notes/decisions/kernel/v0/v0.4/alpha.6/04-node-label-inside-placement.md`（封板全文）。
