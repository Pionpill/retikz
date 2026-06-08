# plot v0.1-alpha.7 实施待办：Aesthetics 上 + Scales 家族（阶段二 R2 · size 通道 + color 真通道/series + 连续 scale）

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.1 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md)（阶段二 alpha.7）· [`plot-design §3.3 Aesthetics / §3.4 Scale / §3.9 Guide`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../_template.md) · 上个 milestone：[`v0.1-alpha.6`](../v0.1-alpha.6/roadmap.md)

## 目标

**阶段二第二轮**（GoG「**Aesthetics**」上半 +「**Scales 家族**」）：在 alpha.6 把 `data.model` 升级成承重类型层之后，本轮**补第一个非位置视觉通道 `size`、把 `color` 收口成名副其实的真 scale 通道、并把连续 scale 家族补到 log / pow / sqrt**。同时把 alpha.1~6 只服务位置/颜色的「通道 → scale」处理**抽象成通用机制**，让 alpha.8 的 opacity / shape 通道能直接复用。

现状（alpha.1~6，见 [上轮调研](../v0.1-alpha.6/roadmap.md) + 代码核验）：

- **样式通道只有 color**：`StyleEncodingSchema` 仅 `color`，且 `EncodingSchema = PositionEncoding.merge(StyleEncoding)` 被**所有位置 mark 共享**、sector 直接复用 `StyleEncodingSchema`（`ir/encoding.ts` / `ir/mark.ts`）——直接往全局加通道会泄漏到语义不同的 mark。
- **color 名为真通道、实为半成品**：`makeColorResolver` **恒走 ordinal、从不查字段类型**（`lower/expand.ts`），连续/temporal 字段会被静默当 ordinal 调色；单系列 line/area 的 `color.field` 被**静默丢弃**（`lower/mark.ts`）。
- **scale 家族缺连续变体**：仅 linear / band / point / ordinal / time（`ir/scale.ts`），无 log / pow / sqrt。
- **三表面未跟上**：React `DslScaleX` 仅 `'linear' | 'time' | 'point'`、mark props 无 `size`（`react/.../buildPlotSpec.ts` / `marks.tsx`），vanilla 同缺。

三块（对齐 [v0.1 roadmap](../roadmap.md) line 40，延续「纵向薄片 + 三包 lockstep」）：

- **连续 scale 家族 log / pow / sqrt（ADR-01，结构叶子）**：`PlotScale` **仅新增** log / pow / sqrt 三个连续变体（公开 scale 家族；**不新增 size/radius scale type**）；按 L1 规则**仅作用 point / line**，bar / area + 非线性连续 scale **fail-loud**（baseline 0 与对数/幂结构冲突）。size 通道所需的 sqrt 即源于此——**统一真源，不另造内部 sqrt**（这也是把 scale 家族提到 01 的原因：消除 size「先内部 sqrt、后公开 Sqrt」的重复）。
- **通用「通道 → scale」抽象 + `size` 通道（ADR-02，dep 01 的 sqrt）**：把位置通道那套（按名绑定 + type-driven 派生 + fail-loud 兼容校验）提炼成可复用的通道→scale resolver；`size` 作为它的**第一个新消费者**落地——**仅作用于 PointMark**，语义是 **radius scale**（面积感知正确），默认**派生到 ADR-01 的 sqrt 连续 scale**，core 换算细节不外泄。撑住 alpha.8 的 opacity / shape。
- **`color` 真通道收口 + `series` 一等化（ADR-03，dep 02 的 resolver）**：补字段类型兼容校验（categorical→ordinal；continuous/temporal `color.field` → fail-loud，连续色阶留 alpha.8）；按 B/C 规则收口 color×series（修单系列 `color.field` 静默丢弃），保持 `series` 为一等显式分组、color 仅作 path mark 的兜底拆分来源。

## 四项已签字设计决策（2026-06-08 拍板，下游 ADR 按此写）

> 上一轮调研 + 外部（codex）P1 评审后，由人工拍板。各 ADR「决策」段以此为准。

- **① size 作用域 = S1（仅 PointMark）**：本轮 `size` 只定义为**散点 glyph 的视觉尺寸通道**，不泛化到 line strokeWidth / bar width / area。通道语义写成 **radius scale**；落到 core 时再换算成当前 circle node 的实际尺寸字段——**IR 用户不感知 `minimumSize` / `sqrt2` 这类实现细节**。line/area/bar/sector 的 size 语义明确顺延。
- **② log baseline = L1（log/pow/sqrt 仅 point/line）**：bar/area + log/pow/sqrt **fail-loud**。错误信息**覆盖三种非线性 scale**（原签字版只写 log，评审 P2 指出 sqrt+bar 报「log scale…」别扭，故泛化）：
  > `nonlinear continuous scale (log/pow/sqrt) cannot be used with interval/area because their baseline includes 0; use point/line or wait for explicit positive baseline support`

  理由：bar/area 的 `baseline=0` 是结构语义（`lower/expand.ts` 把 baseline 注入 domain、area baseline 默认 0），log/幂轴里「从 0 起的柱/面积」概念别扭。需要时后续再做 L2（显式正 baseline）。
- **③ size domain 边界契约**：默认 domain `[0, maxPositive]`；**若无正值 → 所有点用最小半径**（不崩、不报错）；**若只有一个正值 → 该值映射到 range 上界**；**负值一律 fail-loud**；**显式 domain 含负数 → 拒绝**。size channel 的 `value` 常量限 number。**负值校验落在 size channel / size scale resolver**——`lower/coerce.ts` **不改**全局 continuous 语义（负值对 continuous 字段本身合法，只对 size 通道非法）；size consumer 读 canonical value 后做**通道级**负值校验（评审 P1）。
- **④ color × series 收口规则（B/C）**：
  - **point / bar / sector**：按 **datum** 着色，**不**引入 series 语义；
  - **line / area**：path 是整体图元，按 **series** 着色；
  - **line / area 无显式 `series` 且有 categorical `color.field`** → **隐式按 color 拆 series**（修「单系列 color field 静默丢弃」）；
  - **显式 `series` + `color.field` 并存**且**同一 series 内 color 不恒定** → **fail-loud**；
  - **显式 `series` 优先**，color 不反向覆盖 series。

  边界：retikz **不走 ggplot「所有离散 aesthetic 自动分组」**——`series` 仍是一等显式分组语义，color 只是 path mark 的兜底拆分来源。隐式拆产出的 IR **必须等价于显式写 series**（保 alpha.5 datum locator parity，配等价性测试）。

## 不在 alpha.7（顺延）

- **opacity / shape 通道 + legend** → alpha.8（复用本轮 ADR-01 的通道→scale 抽象）
- **离散化 scale**（quantize / threshold / quantile）+ **连续 color 色阶**（sequential / diverging）→ alpha.8
- **categorical → 离散 size 档**（D1：本轮只做 continuous→size）→ 顺延 / 需求驱动
- **symlog**（log 跨零/负值兜底）+ **L2 显式正 baseline 的 log 柱/面积** → 需求驱动
- **line strokeWidth / bar width / area 的 size 语义** → 顺延（① S1 范围外）
- 更多 mark / 坐标系 / transform → alpha.9+

## core 依赖

**无新 core 依赖**——size 落到 core 现有 circle node 尺寸字段（仅消费、不改 core 内部）；其余纯 plot 内（`ir` + `lower` + react/vanilla 表面）。若实现期发现 core circle 尺寸表达不足，按 AGENTS.md「子组遇 core 能力不足先补 core」走 `next-core`，不在 plot 自造。

## 执行模式

**单条串行**：每 ADR 走 5 阶段（设计 → 实现 → 自测 → 文档 → 收尾），人工 review 后开下一条。三 ADR 01/02/03 起草为 `Proposed`；设计阶段的四项主决策已拍板（见上）；进实现前按 [`develop-design`](../../../../../../.agents/skills/develop-design/SKILL.md) 跑外部 LLM 评审（沿用 alpha.6）。

**三表面同步硬约束**（develop-design 要求）：每条 ADR 必须同时写 **IR schema + React JSX props + vanilla/spec 表面** 三处，文档站 demo 在同改动集露出。

## 实现顺序（编号 ≠ 依赖，结构叶子优先）

```
01 连续 scale 家族 log/pow/sqrt (结构叶子：新 scale 类型 + L1 限制；size 的 sqrt 真源)
 └─ 02 通道→scale 通用抽象 + size 通道 (dep 01 的 sqrt：提炼 resolver + size 派生到 sqrt)
     └─ 03 color 真通道收口 + series 一等化 (dep 02 的 resolver：color 迁入 + B/C 规则)
```

> 线性递进：02 依赖 01 的 sqrt scale，03 依赖 02 的通道→scale resolver。01 定稿后 02 / 03 的设计可并行起草，但实现按链序落地（评审采纳的依赖重排，消除 size 内部 sqrt 与公开 Sqrt 的重复）。

> **测试 case 规则**（沿用 alpha milestone 放宽）：按复杂度适量，覆盖真实有意义的 accept/reject 与行为断言（size 半径几何、边界退化、color×series 拆分等价性、log+bar fail-loud），不硬凑每 ADR ≥ 9。

## 前置 setup

无新包。alpha.7 主要在 `plot/src/ir/scale.ts`（PlotScale **仅新增** log/pow/sqrt 三个连续变体；**不新增 size/radius scale type**）、`plot/src/ir/encoding.ts`（PointMark 专属 size 通道，不进全局 StyleEncoding、`value` 限 number）、`plot/src/lower/`（通道→scale 通用 resolver 抽取、size 默认派生到 sqrt 连续 scale + **通道级**负值校验、`expand.ts` color 类型校验、`mark.ts` color×series 收口 + size→core circle 尺寸换算、log/幂 + bar/area fail-loud guard）；`plot/src/lower/coerce.ts` **不改**全局 continuous 语义。react/vanilla 表面扩 `DslScaleX`（+ log/pow/sqrt）+ PointMark `size` prop。

## ADR 清单

| ADR | 主题 | Level | 依赖 | 状态 |
|---|---|---|---|---|
| 01 | 连续 scale 家族 log / pow / sqrt（L1：仅 point/line，bar/area fail-loud；公开 scale 家族**不含** size/radius type） | red | — | 待起草 |
| 02 | 通道→scale 通用抽象 + size 通道（仅 PointMark，radius scale，③边界契约；size 默认派生到 01 的 sqrt；不进全局 StyleEncoding、`value` 限 number） | red | ADR-01 | 待起草 |
| 03 | color 真通道收口 + series 一等化（④B/C 规则 + categorical fail-loud + continuous/temporal color fail-loud + 修单系列静默丢弃 + 隐式拆等价性） | red | ADR-02 | 待起草 |

## 贯穿原则落点

- **alpha.1 埋点 → 承重**：`StyleEncodingSchema`（alpha.1 拆出、注释「color today; opacity / size / shape later」）本轮兑现第一个新通道 `size`，并把通道→scale 处理抽象成可复用机制，正是「零成本埋点 → 可用能力」。
- **scope-aware / locator**：color 隐式拆 series 改变 Path/Scope 数量，隐式拆 IR 必须等价显式 series，守住 alpha.5 接通的 datum locator parity。
- **AI 友好**：size 写成 radius scale 语义（不外泄 core 换算）、log/pow/sqrt 按 `PlotScale` 风格暴露裸字面量，`.describe` 契约完整。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede。模板见 [`../../../_template.md`](../../../_template.md)。
