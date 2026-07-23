# table v0.1-alpha.1 Roadmap：最薄纵向闭环

> milestone 已完成最薄纵向闭环、根 schema 精确度修订与 React 组合式 authoring API。长期决策写入同目录 ADR。
> 关联：[`table v0.1 roadmap`](../roadmap.md) · [`table-design.md`](../../../../../architecture/table-design.md) · [`_template.md`](../../../../_template.md)

- 状态：已完成
- 首轮完成日期：2026-07-21
- 修订完成日期：2026-07-22
- 收尾完成日期：2026-07-23

## 目标

建立 `@retikz/table` 的最薄可用闭环：外部数据或显式 Cell 经 manual / detail 结构形成语义模型，以固定基础轨道完成布局并 lowering 为 Core IR；React 组件与 Vanilla plain spec / Tier 2 adapter 能消费同一 TableSpec。

alpha.1 用固定 `columnWidth` / `rowHeight` 避开尚未冻结的任意 `IRChild` intrinsic measurement。auto/minmax、span、完整 border 与换行测量进入 alpha.2。

## 执行顺序

```text
03 Cell payload + text presentation registry
  └─▶ 02 manual/detail + SemanticTableModel
        └─▶ 04 fixed-track layout
              └─▶ 01 root + external data binding
                    └─▶ 05 Core IR lowering + minimal manifest
                          └─▶ 06 React / Vanilla bindings
```

ADR 编号按概念阅读顺序组织，不等同于实现顺序；实现以依赖关系为准。

## ADR 清单

| ADR                                       | 主题                                                      | Level  | 依赖                                          | 状态     |
| ----------------------------------------- | --------------------------------------------------------- | ------ | --------------------------------------------- | -------- |
| [01](./01-table-spec-root.md)             | Table composite 根节点、外部数据引用与 package scaffold   | red    | ADR-02、ADR-04、Core composite、DataReference | Accepted |
| [02](./02-table-structure-model.md)       | manual/detail 结构与 canonical SemanticTableModel         | red    | ADR-03                                        | Accepted |
| [03](./03-cell-presentation.md)           | Cell payload、基础 text presentation 与 registry          | red    | Core IRChild、Data scalar                     | Accepted |
| [04](./04-table-layout.md)                | 固定轨道与 TableLayout                                    | red    | ADR-02~03                                     | Accepted |
| [05](./05-table-lowering.md)              | Table composite lowering、stable identity 与最小 manifest | red    | ADR-01~04                                     | Accepted |
| [06](./06-table-bindings.md)              | React 结构组件与 Vanilla plain spec / Tier 2 runtime      | red    | ADR-05、Kernel Vanilla plain spec             | Accepted |
| [07](./07-table-spec-variant-schemas.md)  | 精确 Table 变体 schema 与统一根 union                     | red    | ADR-01、ADR-02、ADR-06、Core composite union  | Accepted |
| [08](./08-table-react-composition-api.md) | DetailColumn 与 Row / Cell 组合式 React authoring         | yellow | ADR-06、ADR-07                                | Accepted |

## 测试策略

- schema ADR 覆盖真实 accept / reject，不为极小 schema 硬凑数量
- Semantic model 与 layout 使用 plain-data 断言，不只依赖 SVG snapshot
- lowering 验证 Core IR 形状、稳定 ID、数据来源和 renderer parity
- React / Vanilla 对同一 spec 产生等价 Table lowering 结果，并共享多实例 contribution 冲突语义
- `deps-guard` 确认 table 不依赖 plot、React、DOM 或 renderer

## 完成结果

- 八份 ADR 均已 Accepted，并压缩为长期决策记录；detail / manual / custom 拥有精确根 schema，通用 pipeline 消费统一 union
- `@retikz/table`、`@retikz/table-react`、`@retikz/table-vanilla` 已形成可构建、可测试的 lockstep alpha.1 薄片
- manual/detail、Cell presentation、固定轨道、Core lowering、manifest、React/Vanilla/SSR 已闭环
- 双语组件文档、可运行 demo、API 参考与三包 changelog 已同步

## 完成标准

- [x] 三包脚手架和公开入口可构建、类型检查与测试
- [x] manual / detail 两种结构共用 SemanticTableModel 与 lowering
- [x] 内置 text presentation 与自定义 presentation 走同一 registry
- [x] 固定轨道布局对非法尺寸、重复地址和缺失数据 fail-loud
- [x] React / Vanilla 都能渲染同一 TableSpec；Vanilla 可通过 Kernel `mount().update()` 用新 embed props 更新数据
- [x] alpha.2 需要的测量、span 与 border 缺口已明确，不以 alpha.1 私有补丁替代

## ADR 约定

每份 ADR 从 Proposed 开始，Architecture Gate PASS 且人工确认后改为 Accepted，之后才能进入实现。模板见 [`../../../../_template.md`](../../../../_template.md)。
