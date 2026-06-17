# plot v0.1-alpha.12 Roadmap：Statistics 基础 + mark 抽象收敛

> 上游：[plot v0.1 roadmap](../roadmap.md)「Statistics 基础」行。
> 主题：① 给 `transform` 层补统计变换（grammar of graphics 的 Statistics 组件）——现状 transform 仅 `sort` / `stack`（alpha.3），本轮补 bin / histogram / aggregate / normalize / derive-interval / jitter（ADR-01/02，已 Accepted）；② **grammar 地基收敛**——把 mark 从 9 个图表形状 mark 收敛为 6 个抽象数据几何 mark + mark registry（ADR-03/04，2026-06-17 追加）。

## ADR 索引

| ADR | 主题 | 状态 |
| --- | --- | --- |
| [01](./01-bin-aggregate.md) | **bin + aggregate**：连续分箱（histogram 底座 + rect binned cell 边界来源）+ 分组聚合（sum/mean/count/min/max）；**改变行数**的规约 transform | Accepted |
| [02](./02-derive-normalize-jitter.md) | **normalize + derive-interval + jitter**：组内百分比归一化（接 stack）+ 字段算区间 start/end（喂 interval/rect/sector）+ 位置抖动（确定性 seed）；**保行数**的逐行派生 / 调整 | Accepted |
| [03](./03-mark-abstraction-registry.md) | **抽象 mark 模型 + registry（引擎层）**：mark 收敛为 6 个数据几何 mark（point/path/region/interval/link/reference）+ `MarkDefinition` 注册分发；interval 用坐标系无关正交 `bounds` 统一 bar/sector/rect/histogram/heatmap、point 吸收 text；删 sector/rect/text、改 line→path/area→region/rule→reference/ribbon→link。⚠️ BREAKING IR | Proposed |
| [04](./04-mark-surface-convergence.md) | **mark 公开表面收敛（表面层）**：react/vanilla 组件对齐 6 抽象 mark（BarMark+RectMark→IntervalMark、TextMark→PointMark、line/area/rule/ribbon 改名）+ build-plot-spec 便捷 props 映射到抽象 `bounds` IR + docs 按数据几何重组。依赖 ADR-03。⚠️ BREAKING API | Proposed |

## 排序与依赖

- **ADR-03 supersede ADR-01/02 的 interval 字段行**：ADR-03 把 interval 的 `x0Field`/`x1Field`（ADR-01）、`y0`/`y1` 专属读取（ADR-02 derive-interval / normalize 对接）收敛进 `bounds.extent(from,to)`。**transform 定义本身不变**（bin 仍产 binStart/binEnd、stack/normalize/derive-interval 仍产 y0/y1）；变的只是 interval mark 改用 `bounds.extent` 指向这些字段。实现顺序：ADR-03（引擎）→ ADR-04（表面），二者依赖 ADR-01/02 的 transform 产物。
- **位置**：Statistics 排在 Geometry（alpha.11）之后、Facets（alpha.14）之前——geom 先就位，再喂统计派生数据。
- **接 alpha.11 钩子**：bin 产出的箱边喂 rect「binned heatmap 显式区间边」（alpha.11 ADR-02 明确 gate 于 bin transform）；derive-interval / aggregate 丰富 interval `y0/y1`、sector 累积界的数据来源；bin/histogram 呼应 alpha.9 cartesian1D「histogram 底座」。
- **下游**：alpha.13 boxplot ← alpha.12/13 stat；density / smooth(回归) / quartile 在 alpha.13、不在本轮。

## 三包 lockstep

遵守 v0.1「三包 lockstep」硬原则：每条 ADR 同时交付 @retikz/plot（transform IR + lowering）/ @retikz/plot-react（transform 的 authoring 表面——**现状 transform 由 mark props 自动装配（如 `<BarMark stack>` → stack transform），本轮新 transform 的 React 表面是关键待决策点**）/ @retikz/plot-vanilla（SSR 测试，renderPlot 纯 spec 驱动）/ docs（双语 mdx + demo）。

## 本轮关键设计点（各 ADR 展开）

- **改行数语义**：bin / aggregate 把 N 行 → M 箱 / 组，与 sort / stack（保行数）不同——transform 链顺序、与 series/scale 域的协同要定清。
- **bin 边界策略**：箱数 / 箱宽 / nice / 域来源；产出箱边对接 rect 显式区间边。
- **jitter 确定性**：IR 必须 JSON-safe，随机抖动用可序列化 **seed**（不塞函数），守 SSR / locator parity / 确定性。
- **transform 的 React authoring 表面**：`<Transform>` 声明组件 vs 沿用 mark props 自动装配 vs `<Plot transforms>` —— 三包 lockstep 的核心未定项。

## 测试 case 规则

延续 plot alpha milestone 放宽口径：覆盖真实有意义的 accept/reject 与数据断言即可，不硬凑（见 [`plot _template.md`](../../../_template.md) § 测试象限）。
