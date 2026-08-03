# @retikz/data v0.1 Roadmap

> 状态：Done · 关联：[data v0 roadmap](../roadmap.md) · [plot v0.1 roadmap](../../../plot/v0/v0.1/roadmap.md)

## 定位

v0.1 建立独立 `@retikz/data` 边界，拥有 JSON-safe 数据模型、字段解析与格式化、共享 transform definition / registry / pipeline、statistics 与 runtime-only lineage。Plot、Table 与后续宿主可以消费这些通用能力，而不反向依赖 `@retikz/plot`。

## Milestones

| Milestone | 长期能力                                                           | ADR                                  |
| --------- | ------------------------------------------------------------------ | ------------------------------------ |
| beta.1    | 从 Plot 迁出通用数据层，固定 Data / Plot provider 与 pipeline 边界 | [`beta.1`](./beta.1/roadmap.md)（2） |
| beta.2    | 统一 `IRDataXxx` 命名、statistics 所有权与 runtime lineage         | [`beta.2`](./beta.2/roadmap.md)（2） |

## RC 与 stable 收口

- RC 冻结 schema、definition / registry、pipeline 与 lineage 公共契约，只接收兼容性 bug、诊断、文档和发布修正
- stable 收口补齐统计输出字段冲突的 fail-loud 诊断，避免覆盖既有数据，并完成 Data / Plot 最终 owner 对账
- `0.1.0` 以 npm `latest` 发布，annotated tag 为 `data-v0.1.0`

## Stable 契约

- schema-derived 公共类型使用 `IRDataXxx` owner 前缀
- 通用 transform 与 statistics 属于 Data；依赖坐标、scale、mark 或图形几何的 transform 属于 Plot
- lineage 保持 runtime-only，不写入 JSON IR 或 Scene meta
- canonical data-view preparation 与宿主共享 view lifecycle 延期到后续版本

## 验证策略

- Data schema、field、format、transform、statistics、registry、pipeline 与 lineage 测试
- Plot 的导入边界、公开导出、lowering 与 adapter 兼容性验证
- 发布声明、packed ESM / TypeScript 与 clean-consumer 依赖闭包验证
