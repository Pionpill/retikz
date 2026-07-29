# table v0.1-alpha.3 Roadmap：可持久化 authoring 与呈现语法

> 本 milestone 先修正 manual Table 的可持久化 authoring 形态，再继续扩展 formatter、presentation、selector / rule、条件视觉 scale 与 theme / legend。具体公开字段和行为由同目录 ADR 冻结。
> 关联：[`table v0.1 roadmap`](../roadmap.md) · [`table-design.md`](../../../../../architecture/table-design.md) · [`table completeness`](../../../../../architecture/table-visualization-complete.md) · [`_template.md`](../../../../_template.md)

- 状态：进行中
- 启动日期：2026-07-29

## 目标

让 Table 的公开 authoring 语法保持 JSON-safe、易手写且可由 React / Vanilla 等价消费。manual Table 不再要求作者重复声明行列数量与逐 Cell 地址；同一行优先二维结构直接进入 Table schema，再由 Table 主责包规范化为 canonical rows、columns 与 Cells。

后续 presentation 能力继续沿现有 Definition / registry 与 value → `IRChild` 链路扩展。本 milestone 不因 manual authoring 修订提前实现 formatter、rule、conditional scale、theme 或 legend。

## ADR 顺序

| ADR                                       | 主题                                    | Level | 依赖                    | 状态     |
| ----------------------------------------- | --------------------------------------- | ----- | ----------------------- | -------- |
| [01](./01-manual-row-matrix-authoring.md) | manual Table 行优先二维持久化 authoring | red   | alpha.2 canonical model | Accepted |

其余呈现语法 ADR 由后续设计分别冻结，不在 ADR-01 的文件 scope 或实现授权内。

## ADR-01 完成情况

- [x] manual persistence、framework-neutral helper、React 与 Vanilla 共用同一个 `rows` schema
- [x] canonical model、layout、lowering 与 manifest 继续消费统一结构，不出现 adapter 私有 Table 语义
- [x] 旧 dimensions + addressed Cells 公开写法完成 breaking 迁移
- [x] schema、adapter parity、JSON round-trip、layout 与双语 docs 证据完整

## 不在 ADR-01 范围

- formatter、条件视觉编码、theme 与 legend
- group、hierarchy、subtotal、pivot、matrix 与多层 header
- 选择、编辑、虚拟滚动和异步数据状态
