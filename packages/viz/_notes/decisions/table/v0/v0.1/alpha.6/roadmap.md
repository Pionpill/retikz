# table v0.1-alpha.6 Roadmap：分片与追溯收口

> 本 milestone 收口 Table 的外围组合、跨 occurrence 追溯、分片与完整 diagnostics。具体公开契约与行为由本目录 ADR 冻结。
>
> 关联：[`table v0.1 roadmap`](../roadmap.md) · [`alpha.3 descriptor seed`](../alpha.3/roadmap.md) · [`table-design.md`](../../../../../architecture/table-design.md) · [`table completeness`](../../../../../architecture/table-visualization-complete.md)

- 状态：计划中

## 目标

- 把 alpha.3 Legend descriptor seed 解析为 Standard Legend / Flex 输入，完成 Table body 与外围内容的通用组合
- 以 occurrence-safe artifact link 关联 Table lineage、Standard typed artifact 与最终 bounds
- 支持 fragmentation、重复 header，并收口 manifest / lineage / locator / diagnostics
- 保持 direct、React、Vanilla、SSR 与 zh / en docs 的同一产品链路

## ADR 与依赖

| ADR                                                        | 主题                                                 | 依赖                                                               | 状态     |
| ---------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| [01](./01-standard-legend-consumption-and-traceability.md) | Standard Legend、外围 Box Layout 与 artifact lineage | alpha.3 descriptor seed；Table body boundary；occurrence-safe join | Proposed |

fragmentation、重复 header 与完整 diagnostics 的具体 ADR 在进入设计时补充；本 roadmap 不预留尚未冻结的公开字段或实现方案。

## Milestone 边界

- Table 拥有 descriptor 解析、领域 placement intent、fragmentation 语义与 lineage
- Standard 拥有 Legend、Flex / Grid / Overlay、外围布局与 typed artifacts
- Core 拥有 measurement / replay、occurrence remap 与通用 artifact link
- adapters 只贡献 definitions、接入宿主生命周期并消费同一 manifest / link contract

## 完成标准

- [ ] 当前 milestone ADR 通过 Architecture Gate 与人工确认
- [ ] Table body 以 JSON-safe composition boundary 进入 Standard Box Layout
- [ ] authored item key 可关联 nested replay 后的最终 child occurrence
- [ ] direct、React、Vanilla、SSR 的 Scene、artifacts、manifest 与 diagnostics 等价
- [ ] fragmentation、重复 header 与完整追溯边界由对应 ADR 冻结并闭环
- [ ] zh / en docs、README、changelog 与真实产品行为一致

## 不在 alpha.6 范围

- 单元格编辑、电子表格公式与协作编辑
- 服务端分页、异步加载与缓存状态
- 自动协调多个 Plot Cell 的 scale、axis、grid 或 legend
