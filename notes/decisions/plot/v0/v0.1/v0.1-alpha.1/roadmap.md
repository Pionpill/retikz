# plot v0.1-alpha.1 实施待办：IR 骨架 + 最薄纵向闭环

> milestone 执行路线。长期决策放在同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.1 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md) · [`plot-design.md §11 / §13.1`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../_template.md)

## 目标

打通 `@retikz/plot` 最薄的端到端纵向切片：定义最小 Plot IR，并把单 mark（line / point）· linear scale · cartesian 经最小 lowering 下沉为 core IR，产出**无轴的散点 / 折线**，证明「Plot IR → core IR → 现有 renderer」这条链真的通。

不在 alpha.1：guide（轴 / 网格，alpha.2）、band/time/ordinal scale 与 bar mark（alpha.3）、polar（alpha.4）、scope/anchor 接通（alpha.5）。

## 执行模式

**单条串行**：每条 ADR 走完 5 阶段（设计 → 实现 → 自测 → 文档 → 收尾）、人工 review 后再开下一条。

**实现顺序按依赖叶子优先**（ADR 编号 ≠ 实现顺序）：根容器 ADR-01 在代码上 import 全部子结构（`plot.ts` import data/scale/coordinate/mark），故先落叶子、再拼根、最后 lowering——

```
02 data ─┐         03 scale ──┐   04 coordinate ──┐
         ├─ DatumValue        │                   │
05 encoding+mark ◄┘(channel.value 复用 DatumValue) │
         │                    │                   │
01 root ◄┴────────────────────┴───────────────────┘ (plot.ts import 全部叶子 + 自带 json.ts)
         │
06 lowering ◄ 依赖 01-05
```

- **02 / 03 / 04 互相独立**，可任意先后；
- **05 依赖 02**（`ChannelSchema.value` 复用 `DatumValueSchema`）；
- **01 依赖 02-05**（根 import 所有叶子），自带 `JSONValueSchema`（`meta` 用）；
- **06 依赖 01-05**。
- 实现顺序：`02·03·04 → 05 → 01 → 06`。

> **测试 case 规则放宽**：本 milestone 把 IR 拆为细粒度 ADR，**不强求模板「每 ADR ≥ 9 case」**——按 schema 复杂度适量取 case，只覆盖真实有意义的 accept/reject（极小 schema 如 coordinate 取数条即可，复杂的如 encoding+mark 取较全）。

## 前置 setup（非 ADR）

新建包 `packages/plot/plot`（`@retikz/plot`）脚手架，镜像 `packages/core/core` 工程约定：

- `package.json`（catalog 依赖 zod；workspace 链 `@retikz/core`）、`tsconfig`、`vite` 库构建、`vitest`、`src/index.ts` 空 barrel。
- 暂不出框架绑定包（`@retikz/plot-react` 等留到 v0.3）。

作为本 milestone 第一条落地 ADR（实现顺序上的 ADR-02 data）的前置步骤提交（emoji `:tada:` / `:package:`），不单独写 ADR。

## ADR 清单

| ADR | 主题 | Level | 依赖 | 状态 |
|---|---|---|---|---|
| [01](./01-plot-spec-root.md) | PlotSpec 根容器（Plot IR 根 + JSON 透传约束，含 anchor / scope 预留 `id` / `meta`） | red | 02-05、前置 setup | Proposed |
| [02](./02-plot-data.md) | Plot 数据结构（DatumValue / Datum / PlotData） | red | 前置 setup | Proposed |
| [03](./03-plot-scale.md) | Plot 比例尺（LinearScale + Scale union） | red | 前置 setup | Proposed |
| [04](./04-plot-coordinate.md) | Plot 坐标系（Cartesian2D + Coordinate union，持有位置 scale 绑定） | red | 前置 setup | Proposed |
| [05](./05-plot-encoding-mark.md) | Plot 编码与图元（Channel / Encoding + Point / Line / Mark union） | red | ADR-02 | Proposed |
| 06 | 最薄 lowering 纵向闭环（单 mark · linear · cartesian，Plot IR → core IR 下沉） | red | ADR-01~05 | 待起草 |

> 原单条 ADR-01「Plot IR 骨架」按数据结构拆为 01-05（[拆分背景见各 ADR 的「背景」段]）；原 ADR-02 lowering 顺延为 ADR-06。
> ADR-06 在 ADR-01~05 Accepted 后起草并分配文件名（`06-<slug>.md`）。

## 贯穿原则落点

[plot v0.1 roadmap](../roadmap.md) 的贯穿原则在 alpha.1 的体现：

- **anchor / scope 预留**：Plot IR 从一开始就带上可被引用的 `id`（根 → ADR-01，mark → ADR-05）与 `meta` 透传字段（根 → ADR-01，零成本埋点），但**不实现** anchor 命中 / scope-aware 解析——那是 alpha.5。alpha.1 只保证字段位就位、后续可非破坏性扩展。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede，不改历史决策。模板见 [`../../../_template.md`](../../../_template.md)。
