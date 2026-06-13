# ADR-02：interval(bar) mark（baseline→value 矩形，bandwidth 定柱宽，下沉 rectangle Node）

- 状态：Accepted（已实现）
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot-design.md §3.7 mark / §4.5 mark 构造](../../../../../architecture/plot-design.md) · 回溯：[alpha.1 ADR-05 encoding/mark](../alpha.1/05-plot-encoding-mark.md) · [alpha.1 ADR-06 lowering](../alpha.1/06-plot-lowering.md) · 依赖：[ADR-01 band scale](./01-band-scale.md) · 消费方：[ADR-05 relation](./05-relation.md)

## 背景

塑造决策的硬约束：

- alpha.1 已有 `point` / `line` 两种 mark，柱状图需要第三种 **interval（bar）**——从一条 **baseline**（通常值 0）到数据值的矩形区间（plot-design §3.7）。在 cartesian2D 竖直柱里：x 是分类（[ADR-01](./01-band-scale.md) band scale，柱宽 = `bandwidth`），y 从 baseline 到 value。
- 本 ADR 只做**单系列竖直柱**：一类别一根柱、统一颜色、baseline=0。分组 / 堆叠 / 横向柱 / 自定义 baseline / start-end 区间（甘特）留 [ADR-05](./05-relation.md) 与后续。
- **bar 下沉成什么 core 图元有硬约束**：core `PathSchema.children` 要求 `.min(2)` step，单个 `rectangle` step 的 path 不合法；逐柱 4-step path 体积大。而 core **rectangle Node**（`shape:'rectangle'` + `minimumWidth` + `minimumHeight` + `padding:0`，position=矩形中心）无 step 数约束、一柱一 Node、最省 IR——与 alpha.1 散点用 circle Node 同构。

## 决策：interval mark 进 MarkSchema；每柱下沉成一个 padding:0 的 rectangle Node，宽=bandwidth、高=|baseline→value|

`MarkSchema` 加 `interval` 成员（`type` 判别位，非破坏）。encoding 复用现有 `x`（band 类别）/ `y`（数值）位置通道，无新字段。lowering 对每行：x 中心 = band scale 的 `coordinate(category)`、柱宽 = `bandwidth`；y 端点 = `yScale.coordinate(0)`（baseline，clamp 进 range）与 `yScale.coordinate(value)`；柱 = 中心在 `[xc, (yBase+yVal)/2]`、`minimumWidth=bandwidth`、`minimumHeight=|yBase−yVal|` 的 rectangle Node。共享样式（shape / padding0 / fill / 无描边）上提到图层 Scope 的 `nodeDefault`（沿用 alpha.1「Scope 承载共享、Node 只留几何」原则）。

判别串是决策的一部分——`type:'interval'` 进 `PlotMark` 常量：

```ts
export const PlotMark = { Point: 'point', Line: 'line', Interval: 'interval' } as const;
```

真源见 `packages/plot/plot/src/ir/mark.ts`（schema）与 `src/lower/mark.ts`（interval 分支）。

理由：

1. **rectangle Node 最省 IR、与既有 mark 同构**：一柱一 Node（vs 4-step path），共享样式上提 Scope；core rectangle Node 的 `minimumWidth/Height` 正好表达「显式柱尺寸」，`padding:0` 让盒子 = 柱本身。绕开 `PathSchema.children.min(2)` 对单矩形的拒绝。
2. **复用 band scale 的 `bandwidth` / `coordinate`**（[ADR-01](./01-band-scale.md)）：柱宽 / 柱位单一真源就是 x band scale，与该轴刻度严格对齐，不另算。
3. **baseline=0 投影 + clamp**：`yScale.coordinate(0)` 给柱底；值有正负时柱自然分布在 baseline 两侧（`minimumHeight=|yBase−yVal|`、中心取两端中点）。clamp 守 range 边界（与 alpha.2 投影一致）。
4. **encoding 零新增**：interval 复用 x/y，降低 schema 面与 LLM 负担；baseline / 横向 / start-end 等扩展留后续可选字段（非破坏）。

### 实现期拍板的取舍

- **下沉成 rectangle Node vs Path rectangle step**：选 **rectangle Node**（理由见上）。Path 方案受 `children.min(2)` 限制、单柱要凑步数，且矩形 step 的 fill 在 path 级、与「逐柱样式」张力大。代价：依赖 core Node 的 `minimumWidth/Height + padding:0` 精确等于柱尺寸——以几何断言测试锁定（盒子 = 柱、不被默认 padding 撑大，类比 alpha.1 散点 `minimumSize` 的 W 修复）。
- **baseline 取值**：alpha.3 固定 **0**；可配置 baseline / 对数轴 baseline / start-end 双端 encoding（甘特）留后续（非破坏加 `baseline?` / `y2?`）。
- **value 缺失 / 非有限 / 类别缺失**：该行**跳过**（不产 Node），与 alpha.1 mark 投影返回 null 的跳过语义一致；全跳过 → 图层 null。
- **0 值柱**：`yVal === yBase` → `minimumHeight=0`，**仍产 Node**（高度 0 矩形），不特殊剔除。
- **柱描边**：默认 `strokeWidth:0`（纯填充柱，主流默认）；描边 / 圆角（`roundedCorners`）留后续样式字段。
- **柱宽是否减 padding**：柱宽直接用 `bandwidth`（band scale 的 paddingInner 已在 [ADR-01](./01-band-scale.md) 留出柱间缝）；bar 层不再二次缩。

## 影响

- **对外 API**：`@retikz/plot` 公开 `IntervalMarkSchema`，`PlotMark` 增 `Interval` 成员，`MarkSchema` 升 3 成员 union——均非破坏（旧 point/line spec 不受影响）。
- **对 core**：无（仍下沉到既有 rectangle Node，不依赖 core 新能力）。
- **被消费**：[ADR-05](./05-relation.md) 在此基础上加 dodge（切子带 + 偏移）/ stack（消费 y0/y1）。

## DSL 表面

面向用户的 `<BarMark>` 见 [ADR-07](./07-bindings-dsl.md) 与[文档站](https://pionpill.github.io/retikz/)。

## 不在本 ADR 范围

- **分组（dodge）/ 堆叠（stack）柱、多系列** → [ADR-05](./05-relation.md)。
- **颜色编码（按字段着色）** → [ADR-04](./04-color-scale.md)（本 ADR 柱统一 currentColor）。
- **横向柱（y 分类 / x 数值）、自定义 baseline、start-end 双端区间（甘特）、圆角 / 描边样式** → 后续。
- **area / sector / rule / text mark** → 后续。

---

> **实现指针**：level `red`（动 `plot/src/ir/**` mark schema + `src/lower/**` 下沉契约）、非 breaking（仅扩 union 成员，守 alpha.1 mark 跳过语义）。
> - 真源以代码为准：`IntervalMarkSchema` / `PlotMark`（含 `Interval`）/ `MarkSchema`（`packages/plot/plot/src/ir/mark.ts`）；interval 下沉分支与 baseline=0 入 y 域见 `src/lower/mark.ts` / `src/lower/expand.ts`，消费 [ADR-01](./01-band-scale.md) projector 的 `xBandwidth` / `xCoordinate` / `yCoordinate`。柱下沉目标是 core `NodeSchema`（`shape:'rectangle'` / `minimumWidth` / `minimumHeight` / `padding`），仅用既有字段不改 core。
> - 测试见 `packages/plot/plot/tests/ir/mark.schema.test.ts`（schema accept/reject）与 `tests/lower/lowerPlots.test.ts`（柱宽=bandwidth、柱高=|baseline−value|、柱中心、负值跨 baseline、0 值仍产 Node、缺失跳过 / 全跳过 null 图层、与 point/line 共存、band 轴对齐、Node 盒=柱）。
> - 完整施工契约（Schema 改动表 / 测试象限 / 文件 scope）见本 ADR Proposed commit。

> 🔖 封板压缩 commit `82295fcc`；压缩前完整施工蓝图 = `git show 82295fcc^:notes/decisions/plot/v0/v0.1/alpha.3/02-interval-mark.md`。
