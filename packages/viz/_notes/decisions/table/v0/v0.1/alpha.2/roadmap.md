# table v0.1-alpha.2 Roadmap：二维约束布局

> 本 milestone 先解决任意 `IRChild` 的通用测量与受约束布局依赖，再扩展 Table 的轨道、跨度、边框与内容适配。长期决策写入同目录 ADR。
> 关联：[`table v0.1 roadmap`](../roadmap.md) · [`Kernel layout-aware composite ADR`](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.1/07-layout-aware-composite.md) · [`table-design.md`](../../../../../architecture/table-design.md) · [`table completeness`](../../../../../architecture/table-visualization-complete.md) · [`_template.md`](../../../../_template.md)

- 状态：In Progress（Core blocker 已实现，ADR-01 Architecture Gate PASS）
- 启动日期：2026-07-23
- 执行校准：2026-07-26，Core gate 改为消费 v0.5-alpha.1 ADR-07 的最终公开合同；Superseded Kernel alpha.2 草案不再作为依赖

## 目标

让 Table 能依据真实 Cell 内容完成 renderer-agnostic 的二维约束布局，覆盖 auto / fraction / minmax 轨道、矩形 span、padding、bounds-aware alignment、fit / overflow / clip、文本换行与自动行高，并在同一次 Core layout-aware compile 中产出 Scene 与 manifest。alpha.2 的有限父约束只覆盖宽度；row fraction / minmax 在 unconstrained 高度轴取自然 contribution。

alpha.2 不在 Table 内复制 Core 测量器或 replay wrapper。通用 `IRChild` intrinsic measurement、constrained layout 与可嵌套的 compile-local replay wrapper tree 是本 milestone 的前置 gate；上游能力现已闭环，ADR-01 已通过新的 Architecture Gate Round 2/3，Table 产品实现按 ADR-02～07 继续推进。

## Gating

alpha.1 的固定 `columnWidth` / `rowHeight` 不依赖内容测量，可以继续使用。Kernel v0.5-alpha.1 ADR-07 已满足测量、bounds、artifact 与 replay；随后 Core 按 ignored plan 增加 `context.replay()`、递归 `context.scope()` 和 callback-local opaque output child，补齐带 clip/id/meta 的 Scope 包装。alpha.2 下一步是重新执行 Architecture Gate，而不是再增加 Kernel ADR。

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
| [03](./03-cell-box-span-and-alignment.md)               | Cell box、padding、span 与 bounds-aware alignment  | red    | ADR-02                | Proposed，已校准    |
| [04](./04-content-fit-overflow-and-wrap.md)             | fit / overflow / clip、文本换行与自动行高          | red    | ADR-01~03             | Proposed，已校准    |
| [05](./05-border-graph-and-conflict-resolution.md)      | Border Graph、跨 Cell 边线与冲突规则               | red    | ADR-03                | Proposed，已校准    |
| [06](./06-layout-lowering-manifest-and-migration.md)    | 布局 lowering、manifest 与 alpha.1 固定轨道迁移    | red    | ADR-02~05             | Proposed，已校准    |
| [07](./07-react-vanilla-authoring-and-documentation.md) | React / Vanilla authoring 等价性与双语文档闭环     | yellow | ADR-06                | Proposed，已校准    |

候选标题和拆分可在对应 ADR 启动时调整；不能绕过 ADR-01 提前冻结 Table 私有测量 API。

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

Core gate 的详细行为矩阵记录在 ignored `notes/plans/table-alpha2-core-layout-gate/TEST_CONTRACT.md`；各产品 ADR 启动时再建立自己的 ignored 测试契约，并在实现后映射到正式测试证据。

## 完成标准

- [x] ADR-01 的 Core gate 获得 Architecture Gate PASS 和人工确认
- [x] 上游 Core 公开能力满足 ADR-01 的全部可观察验收要求
- [x] Core replay wrapper tree 能表达 Table-local clip/meta Scope 包住 fit/alignment replay，且不重新 layout child
- [ ] auto / fraction / minmax、span、Cell box、alignment、fit / overflow / clip、wrap、自动行高与 border 形成统一布局链路
- [ ] Table lowering 不包含内容类型或 renderer 特判
- [ ] React / Vanilla authoring 与派生 Core compile 环境等价
- [ ] 双语文档、可运行示例、API 参考、changelog 与发布检查完成

## 不在 alpha.2 范围

- formatter、条件视觉编码、theme 与 legend；进入 alpha.3
- group、hierarchy、subtotal 与 grand total；进入 alpha.4
- pivot、matrix 与多层 header；进入 alpha.5
- fragmentation 与重复 header；进入 alpha.6
- virtual scroll 与 viewport windowing；进入 v0.2
- 有限高度 row fraction / minmax 分配与 nested height constraint；待未来 Core height-constraint 能力重新立项

## ADR 约定

每份 ADR 从 Proposed 开始，Architecture Gate PASS 且人工确认后才能进入实现。ADR-01 只冻结跨能力域前置合同；现有 child layout/replay 基线以已发布的 Kernel v0.5-alpha.1 与本次 ignored plan 实现为准，replay wrapper tree 不另立 Kernel ADR。
