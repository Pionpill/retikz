# plot v0.1-alpha.3 实施待办：横向补 mark（bar）+ 分类 / 时间 / 颜色 scale + relation（group/stack）

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.1 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md) · [`plot-design.md §3.3 transform / §3.4 scale / §3.6 encoding / §3.7 mark / §3.8 relation`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../_template.md) · 上个 milestone：[`v0.1-alpha.2`](../v0.1-alpha.2/roadmap.md)

## 目标

把 alpha.1/alpha.2 打通的「单系列折线 / 散点 + 轴 / 网格」**横向补宽**到**柱状图与多系列**：管线第 5 段 mark 补 **interval(bar)**，第 3 段 scale 补**分类 / 时间 / 颜色**三类，第 8 段 relation 补 **group(dodge) / stack**，并首次引入 alpha.1/alpha.2 都没有的两段能力——**transform 阶段**与**非位置通道**。产出从 alpha.2 的「带轴折线 / 散点」升级为「**柱状图 / 分组柱 / 堆叠柱 / 多系列折线**」。仍限 **cartesian2D**（polar 留 alpha.4）。

随之引入三块前两个 milestone 没有的能力：

- **transform 阶段（全新管线段）**：alpha.1/alpha.2 的 `expandPlot` 直接用原始 `rows`；本 milestone 在 scale / mark 之前插入 transform（sort / groupBy / stack），纯 JSON 进出（plot-design §3.3）。
- **非位置通道（color）**：alpha.1/alpha.2 的 encoding 仅 x/y 位置通道；本 milestone 加 color 非位置通道 + ordinal/color scale，mark 据此着色（plot-design §3.6 区分位置 / 非位置通道）。
- **分类 scale 与分类域推断**：scale 不再只有连续 linear；band / point 的域是「按数据序去重的分类值」，projector 要处理 `bandwidth`（点 / 线居中、柱占宽），guide 刻度落 band 中心、无 `nice`。

不在 alpha.3：polar 坐标系与径向 / 角向 guide（alpha.4）、scope/anchor 接通与 datum locator（alpha.5）、area / sector / rule / text mark、log / pow / quantize / threshold scale、size / opacity / shape 等其余非位置通道、legend（与 color scale 配套的图例留后续）、aggregate / bin / normalize 等 transform、facet。

## 执行模式

**单条串行**：每条 ADR 走完 5 阶段（设计 → 实现 → 自测 → 文档 → 收尾）、人工 review 后再开下一条。本 milestone 的 ADR 草案先一次性起草为 `Proposed`，用户 review ack 后逐条进实现。

**三包 lockstep**（沿用 alpha.1/alpha.2）：每加一个能力（scale / mark / relation / 通道），`@retikz/plot` / `@retikz/plot-react` / `@retikz/plot-vanilla` + 文档 demo 同步露出。

## 实现顺序（编号 ≠ 实现顺序，依赖叶子优先）

```
01 band/point scale + PositionScale ─┬─ 02 interval(bar) mark ─┐
                                     ├─ 04 color scale + 通道 ──┤
                                     └─ 06 time scale ──────────┤
03 transform ─────────────────────────────────────────────────┼─ 05 relation ─┐
                                            （05 依赖 02+03+04）─┘               ├─ 07 三包 DSL + 文档
                                                                                │
                                          06 / 04 / 01…直达 ────────────────────┘
```

- **只有 01 / 03 是真叶子**：01 = scale union 起步 + `PositionScale` 抽象；03 = transform 管线段（不依赖 scale）。可任意先后；
- **02 / 04 / 06 都依赖 01**：02 用 `bandwidth` / `coordinate` 定柱、04 复用 `inferCategoryDomain` / `CategoryValueSchema`、06 复用 `PositionScale`（time 作连续 scale 纳入）。**不能在 01 之前实现**，否则重复造类型 / 找不到抽象（评审 P1-2）；
- **05 依赖 02 + 03 + 04**（分组 / 堆叠柱要 bar 几何 + stack transform + color 区分系列）；
- **07 依赖全部**（DSL 装配 + 端到端渲染验证）。
- 实现顺序：`01·03 → 02·04·06 → 05 → 07`。

> **测试 case 规则**：沿用 alpha.1/alpha.2 的放宽——按复杂度适量，覆盖真实有意义的 accept/reject 与几何断言，不硬凑「每 ADR ≥ 9」。

## 前置 setup

无新包（三包脚手架 alpha.1 已建）。transform 是 `packages/plot/plot/src/lower/**`（或新 `transform/`）下的新阶段；scale union / mark union / encoding 扩展在 `src/ir/**`。plot 包新增 d3 子依赖（catalog 登记，具体见各 ADR）：

- **band/point scale**：`d3-scale` 已在（`scaleBand` / `scalePoint` 同包）；
- **color scale**：`d3-scale-chromatic`（配色方案）；
- **time scale**：`d3-scale`（`scaleUtc`，UTC 语义、已在）+ 视需要 `d3-time` / `d3-time-format`。

## ADR 清单

| ADR | 主题 | Level | 依赖 | 状态 |
|---|---|---|---|---|
| [01](./01-band-scale.md) | band / point scale（分类域按数据序去重，projector 处理 `bandwidth`，guide 刻度落 band 中心、无 nice） | red | 前置无 | Proposed |
| [02](./02-interval-mark.md) | interval(bar) mark（baseline→value 矩形，`bandwidth` 定柱宽，下沉 core `Node`/`Path`） | red | ADR-01 | Proposed |
| [03](./03-transform.md) | transform 最小集（sort / groupBy / stack；`expandPlot` 前插管线段，纯 JSON 进出） | red | 前置无 | Proposed |
| [04](./04-color-scale.md) | ordinal·color scale + color 非位置通道（encoding 加 color，scale 加 ordinal，mark 消费 color 着色） | red | ADR-01 | Proposed |
| [05](./05-relation.md) | relation：group(dodge) + stack（多系列柱 / 折线几何，集成 02+03+04；order 已有） | red | ADR-02、03、04 | Proposed |
| [06](./06-time-scale.md) | time scale（`scaleUtc` 刻度 / 格式 + 时间轴，UTC 语义，与折线正交） | red | ADR-01 | Proposed |
| [07](./07-bindings-dsl.md) | 三包 guide 露出（`<BarMark>`、group/stack/series props、color encoding；vanilla / docs 同步） | red | ADR-01~06 | Proposed |

> 起草阶段全部 `Proposed`；逐条实现 + 自测（对抗 Bug Hunter）+ 文档 + 审计后改 `Accepted`，落在 `next-plot`。

## 贯穿原则落点

[plot v0.1 roadmap](../roadmap.md) 的贯穿原则在 alpha.3 的体现：

- **anchor / scope 预留**：bar mark、多系列子图层延续 alpha.1 的 `id` 句柄字段位就位、解析留 alpha.5；多系列（group/stack）下沉出的子 Scope 为将来「按系列 / 按 datum 命中」预留结构，alpha.3 仅内部埋点、不承诺外部可引用。
- **relation 与 mark 解耦**：group / stack / order 是 mark 构造的输入而非后处理（plot-design §3.8 / §4.5）——「怎么连 / 怎么堆 / 怎么分组」不揉进 mark `type`，多系列几何由 relation + transform 驱动，bar 与 line 共用同一套 relation 语义。
- **位置 / 非位置通道分流**：color 作为首个非位置通道，确立 encoding 「位置通道喂坐标系、非位置通道喂 mark 视觉属性」的分流（plot-design §4.2/§4.3），为 size / opacity / shape 等后续通道铺路。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede，不改历史决策。模板见 [`../../../_template.md`](../../../_template.md)。
