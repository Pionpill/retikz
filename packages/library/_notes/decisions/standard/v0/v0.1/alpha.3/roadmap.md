# Standard v0.1 alpha.3 Roadmap：通用 Legend（已并入 alpha.2）

> 状态：Superseded，不形成独立 release
>
> 取代项：[alpha.2 ADR-09：通用 Legend 的已解析呈现契约](../alpha.2/09-generic-legend.md)
>
> 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.2 roadmap](../alpha.2/roadmap.md)

## 结论

Standard `0.1.0-alpha.2` 尚未发布，且该 milestone 已完成任意 `IRChild` 的 Box Layout、layout-aware probe / replay 与 typed artifact 底座。原计划留到 alpha.3 的 Legend 不再需要等待独立版本，直接由 alpha.2 ADR-09 冻结并交付。

原 alpha.3 Legend 规划对“Standard 拥有通用呈现、领域包保留解析与交互、依赖从领域包单向指向 Standard”的判断已经合并进 ADR-09。原计划的 schema、布局、artifact、capability loading、adapter 与测试 / 文档拆分不再作为多份长期 ADR，统一由 ADR-09 冻结和验收。

## 迁移边界

- Standard alpha.2 只发布可直接 authoring、可被领域包消费的通用 Legend 能力
- Plot、Table 与逻辑组件的实际迁移仍由各自 milestone 与 ADR 负责
- 不为原 alpha.3 规划保留 alias、兼容字段、临时 module 或平行实现
- 后续 Standard milestone 编号暂不因本次合并重排
