# plot v0.1-alpha.1 实施待办：IR 骨架 + 最薄纵向闭环

> milestone 执行路线。长期决策放在同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.1 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md) · [`plot-design.md §11 / §13.1`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../_template.md)

## 目标

打通 `@retikz/plot` 最薄的端到端纵向切片：定义最小 Plot IR，并把单 mark（line / point）· linear scale · cartesian 经最小 lowering 下沉为 core IR，产出**无轴的散点 / 折线**，证明「Plot IR → core IR → 现有 renderer」这条链真的通。

不在 alpha.1：guide（轴 / 网格，alpha.2）、band/time/ordinal scale 与 bar mark（alpha.3）、polar（alpha.4）、scope/anchor 接通（alpha.5）。

## 执行模式

**单条串行**：ADR-01 走完 5 阶段（设计 → 实现 → 自测 → 文档 → 收尾）、人工 review 后，再开 ADR-02。ADR-02 依赖 ADR-01 的 IR 产物，不并行。

## 前置 setup（非 ADR）

新建包 `packages/plot/plot`（`@retikz/plot`）脚手架，镜像 `packages/core/core` 工程约定：

- `package.json`（catalog 依赖 zod；workspace 链 `@retikz/core`）、`tsconfig`、`vite` 库构建、`vitest`、`src/index.ts` 空 barrel。
- 暂不出框架绑定包（`@retikz/plot-react` 等留到 v0.3）。

作为 ADR-01 实现的前置步骤提交（emoji `:tada:` / `:package:`），不单独写 ADR。

## ADR 清单

| ADR | 主题 | Level | 依赖 | 状态 |
|---|---|---|---|---|
| [01](./01-plot-ir-skeleton.md) | Plot IR 骨架 + zod schema（data / encoding / scale / coordinate / mark 最小表示，含 anchor / scope 预留字段） | red | 前置 setup | Proposed |
| 02 | 最薄 lowering 纵向闭环（单 mark · linear · cartesian，Plot IR → core IR 下沉） | red | ADR-01 | 待起草 |

> ADR-02 在 ADR-01 Accepted 后起草并分配文件名（`02-<slug>.md`）。

## 贯穿原则落点

[plot v0.1 roadmap](../roadmap.md) 的贯穿原则在 alpha.1 的体现：

- **anchor / scope 预留**：ADR-01 的 IR 从一开始就带上可被引用的 `id` 与 `meta` 透传字段（零成本埋点），但**不实现** anchor 命中 / scope-aware 解析——那是 alpha.5。ADR-01 只保证字段位就位、后续可非破坏性扩展。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede，不改历史决策。模板见 [`../../../_template.md`](../../../_template.md)。
