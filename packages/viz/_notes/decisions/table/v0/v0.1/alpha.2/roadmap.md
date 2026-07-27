# table v0.1-alpha.2 Roadmap：二维约束布局

> 本 milestone 先解决任意 `IRChild` 的通用测量与受约束布局依赖，再扩展 Table 的轨道、跨度、边框与内容适配。长期决策写入同目录 ADR。
> 关联：[`table v0.1 roadmap`](../roadmap.md) · [`Kernel layout-aware composite ADR`](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.1/07-layout-aware-composite.md) · [`table-design.md`](../../../../../architecture/table-design.md) · [`table completeness`](../../../../../architecture/table-visualization-complete.md) · [`_template.md`](../../../../_template.md)

- 状态：已完成
- 启动日期：2026-07-23
- 完成日期：2026-07-27
- 执行校准：Core gate 消费 v0.5-alpha.1 ADR-07 的最终公开合同；Superseded Kernel alpha.2 草案不再作为依赖

## 目标

让 Table 能依据真实 Cell 内容完成 renderer-agnostic 的二维约束布局，覆盖 auto / fraction / minmax 轨道、矩形 span、padding、bounds-aware alignment、fit / overflow / clip、文本换行与自动行高，并在同一次 Core layout-aware compile 中产出 Scene 与 manifest。alpha.2 的有限父约束只覆盖宽度；row fraction / minmax 在 unconstrained 高度轴取自然 contribution。

alpha.2 不在 Table 内复制 Core 测量器或 replay wrapper。通用 `IRChild` intrinsic measurement、constrained layout 与可嵌套的 compile-local replay wrapper tree 是本 milestone 的前置 gate；上游能力已闭环，ADR-01～07 均已实现并收口为 Accepted。

## Gating

Kernel v0.5-alpha.1 ADR-07 提供测量、bounds、artifact 与 replay；Core 的 `context.replay()`、递归 `context.scope()` 和 callback-local opaque output child 支持带 clip/id/meta 的 Scope 包装。Table 只消费这些公开能力，没有引入私有 replay 或第二套测量。

Gate 的验收要求由 [ADR-01](./01-core-constrained-layout-gate.md) 冻结。以下方案不构成 PASS：

- Table 私建文字或 composite 测量器
- deep import Core compile 内部实现
- 按 `namespace`、Node、Path 或 Plot 类型建立白名单分支
- 只在 React、DOM 或单一 renderer 中成立的测量结果
- 测量阶段与最终 compile 使用不同 registry、compile options、host capabilities 或布局语义
- 重新 layout 原 child 来伪造 Scope around replay，或在 Table 私有类型中携带 opaque replay

## 候选 ADR 顺序

| ADR                                                     | 主题                                               | Level  | 依赖                  | 状态                |
| ------------------------------------------------------- | -------------------------------------------------- | ------ | --------------------- | ------------------- |
| [01](./01-core-constrained-layout-gate.md)              | Core 通用 `IRChild` constrained layout 前置门禁    | green  | Core Drawing Complete | Accepted，Gate PASS |
| [02](./02-track-sizing-schema-and-solver.md)            | auto / fraction / minmax 轨道 schema 与单轴 solver | red    | ADR-01 PASS           | Accepted，已实现    |
| [03](./03-cell-box-span-and-alignment.md)               | Cell box、padding、span 与 bounds-aware alignment  | red    | ADR-02                | Accepted，已实现    |
| [04](./04-content-fit-overflow-and-wrap.md)             | fit / overflow / clip、文本换行与自动行高          | red    | ADR-01~03             | Accepted，已实现    |
| [05](./05-border-graph-and-conflict-resolution.md)      | Border Graph、跨 Cell 边线与冲突规则               | red    | ADR-03                | Accepted，已实现    |
| [06](./06-layout-lowering-manifest-and-migration.md)    | 布局 lowering、manifest 与 alpha.1 固定轨道迁移    | red    | ADR-02~05             | Accepted，已实现    |
| [07](./07-react-vanilla-authoring-and-documentation.md) | React / Vanilla authoring 等价性与双语文档闭环     | yellow | ADR-06                | Accepted，已实现    |

最终实现保持 ADR-01 的能力边界：Table 不拥有私有测量、replay 或 renderer 分支。

## 执行顺序

```text
01 Core constrained layout gate
  └─▶ 02 track sizing
        ├─▶ 03 Cell box + span + alignment
        │     ├─▶ 04 fit + overflow + wrap
        │     └─▶ 05 Border Graph
        └──────────────┴─▶ 06 lowering + manifest + migration
                              └─▶ 07 adapters + docs
```

## 测试策略

- Core gate 用行为契约验证任意合法 `IRChild`、nested composite、含文本 Node 的换行、非局部引用和失败诊断，不用 Table 私有实现证明上游能力
- 轨道与 span solver 使用 plain-data 几何断言，覆盖确定性、约束传播、顺序无关、非法尺寸与冲突定义
- layout-aware compile 同时验证 Core output、Cell bounds、stable identity、manifest 映射和 renderer parity
- React / Vanilla 从相同 spec、datasets、definitions 与共同可表达的 host inputs 形成同一 Table transaction；需要数值对比时显式固定相同 measurer 条件
- `deps-guard` 确认 Table 不依赖 Core 内部 compile 路径、DOM、renderer 或 Plot

执行期测试契约保留在 ignored `notes/plans/table-alpha2-*/TEST_CONTRACT.md`；长期证据由正式 Table / React / Vanilla 测试与双语 docs 承载。

## 完成标准

- [x] ADR-01 的 Core gate 获得 Architecture Gate PASS 和人工确认
- [x] 上游 Core 公开能力满足 ADR-01 的全部可观察验收要求
- [x] Core replay wrapper tree 能表达 Table-local clip/meta Scope 包住 fit/alignment replay，且不重新 layout child
- [x] auto / fraction / minmax、span、Cell box、alignment、fit / overflow / clip、wrap、自动行高与 border 形成统一布局链路
- [x] Table lowering 不包含内容类型或 renderer 特判
- [x] React / Vanilla authoring 与派生 Core compile 环境等价
- [x] 双语文档、可运行示例、API 参考与 changelog 完成

## 不在 alpha.2 范围

- formatter、条件视觉编码、theme 与 legend；进入 alpha.3
- group、hierarchy、subtotal 与 grand total；进入 alpha.4
- pivot、matrix 与多层 header；进入 alpha.5
- fragmentation 与重复 header；进入 alpha.6
- virtual scroll 与 viewport windowing；进入 v0.2
- 有限高度 row fraction / minmax 分配与 nested height constraint；待未来 Core height-constraint 能力重新立项

## ADR 约定

ADR-01 冻结跨能力域前置合同；child layout/replay 基线以已发布的 Kernel v0.5-alpha.1 为准，replay wrapper tree 不另立 Kernel ADR。ADR-02～07 已压缩为长期决策记录，执行期 checklist 与 review prompt 不进入正式 ADR。
