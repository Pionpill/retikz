# ADR-05：Point family 的 Connected Scatter recipe

- 状态：Deferred / gated，未纳入当前 alpha.1 实现
- 决策日期：2026-08-23
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-04](./04-scatter.md)

## 当前结论

Connected Scatter 当前不属于 Point family 的已实现 chartType，也不属于 `@retikz/chart`、`@retikz/chart-vanilla` 或 `@retikz/chart-react` 的公开入口。当前不得依据本 ADR 创建 schema、recipe、provider、factory、React component、package subpath 或文档页面

本 ADR 仅保留未来 capability gate 的主题记录：如果重新启动该能力，需要另行确认 `order`、`series`、Path → Point 的固定语义、Plot scale / guide contract、缺值处理、mark 继承与三入口等价性，并在实现前重新审查本 ADR 与 alpha.1 roadmap

## 暂缓原因

Connected Scatter 同时引入有序 Path、轨迹分组与 Point 的多 semantic mark 输出。当前 alpha.1 只收敛 Scatter 的最小端到端闭环，尚未为上述组合冻结长期的 Plot 数据角色、排序、缺值和诊断契约

在 capability gate 解除前，应用应使用 Plot 直接表达 Path 与 Point 的组合；不得通过 Chart 的未知 recipe、fallback、别名或 adapter 旁路模拟该能力

## 重新启动条件

- Plot 为 `order`、`series`、开放 Path 与 Point 组合提供稳定的 schema、resolve、lowering、identity、provenance、lineage、locator 与 diagnostics 主链
- Chart 能复用同一套 Chart mark binding、Theme owner、provider contribution 与 `plotExtension` 边界，不复制 Plot 算法
- React、Vanilla、JSON 与 SSR 可以生成同一精确 Source，并完成一个最小端到端闭环
- 中英文文档、测试契约和 package public surface 能同步更新
