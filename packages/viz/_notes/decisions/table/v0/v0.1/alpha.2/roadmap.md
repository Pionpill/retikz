# table v0.1-alpha.2 Roadmap：二维约束布局

> 本 milestone 先解决任意 `IRChild` 的通用测量与受约束布局依赖，再扩展 Table 的轨道、跨度、边框与内容适配。长期决策写入同目录 ADR。
> 关联：[`table v0.1 roadmap`](../roadmap.md) · [`Kernel contextual composite ADR`](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/01-contextual-composite-layout.md) · [`table-design.md`](../../../../../architecture/table-design.md) · [`table completeness`](../../../../../architecture/table-visualization-complete.md) · [`_template.md`](../../../../_template.md)

- 状态：设计已接受
- 启动日期：2026-07-23

## 目标

让 Table 能依据真实 Cell 内容完成 renderer-agnostic 的二维约束布局，覆盖 auto / fraction / minmax 轨道、矩形 span、padding、bounds-aware alignment、fit / overflow / clip、文本换行与自动行高，并在同一次 Core contextual compile 中产出 Scene 与 manifest。

alpha.2 不在 Table 内复制 Core 测量器。通用 `IRChild` intrinsic measurement 与 constrained layout 是本 milestone 的前置 gate；上游能力未闭环前，只进行 Table 侧设计，不实现私有 fallback。

## Gating

alpha.1 的固定 `columnWidth` / `rowHeight` 不依赖内容测量，可以继续使用。alpha.2 的内容驱动布局必须等待 Core 提供公开、可复用且与最终 compile 一致的通用能力。

Gate 的验收要求由 [ADR-01](./01-core-constrained-layout-gate.md) 冻结。以下方案不构成 PASS：

- Table 私建文字或 composite 测量器
- deep import Core compile 内部实现
- 按 `namespace`、Node、Path 或 Plot 类型建立白名单分支
- 只在 React、DOM 或单一 renderer 中成立的测量结果
- 测量阶段与最终 compile 使用不同 registry、compile options、host capabilities 或布局语义

## 候选 ADR 顺序

| ADR                                                     | 主题                                               | Level  | 依赖                  | 状态     |
| ------------------------------------------------------- | -------------------------------------------------- | ------ | --------------------- | -------- |
| [01](./01-core-constrained-layout-gate.md)              | Core 通用 `IRChild` constrained layout 前置门禁    | green  | Core Drawing Complete | Accepted |
| [02](./02-track-sizing-schema-and-solver.md)            | auto / fraction / minmax 轨道 schema 与二维 solver | red    | ADR-01 PASS           | Accepted |
| [03](./03-cell-box-span-and-alignment.md)               | Cell box、padding、span 与 bounds-aware alignment  | red    | ADR-02                | Accepted |
| [04](./04-content-fit-overflow-and-wrap.md)             | fit / overflow / clip、文本换行与自动行高          | red    | ADR-01~03             | Accepted |
| [05](./05-border-graph-and-conflict-resolution.md)      | Border Graph、跨 Cell 边线与冲突规则               | red    | ADR-03                | Accepted |
| [06](./06-layout-lowering-manifest-and-migration.md)    | 布局 lowering、manifest 与 alpha.1 固定轨道迁移    | red    | ADR-02~05             | Accepted |
| [07](./07-react-vanilla-authoring-and-documentation.md) | React / Vanilla authoring 等价性与双语文档闭环     | yellow | ADR-06                | Accepted |

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
- contextual compile 同时验证 Core output、Cell bounds、stable identity、manifest 映射和 renderer parity
- React / Vanilla 从相同 spec 与 datasets 形成等价 definitions、compile options、host capabilities 和约束，再产生等价布局
- `deps-guard` 确认 Table 不依赖 Core 内部 compile 路径、DOM、renderer 或 Plot

详细行为矩阵先记录在 ignored `notes/plans/table-alpha2-core-layout-gate/TEST_CONTRACT.md`，实现后再把每项映射到正式测试证据。

## 完成标准

- [ ] ADR-01 的 Core gate 获得 Architecture Gate PASS 和人工确认
- [ ] 上游 Core 公开能力满足 ADR-01 的全部可观察验收要求
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

## ADR 约定

每份 ADR 从 Proposed 开始，Architecture Gate PASS 且人工确认后才能进入实现。ADR-01 只冻结跨能力域前置合同；Core 具体 API 与 compile 时序由 Kernel v0.5-alpha.2 ADR-01 冻结。
