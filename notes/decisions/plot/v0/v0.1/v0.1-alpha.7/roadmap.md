# plot v0.1-alpha.7 实施待办：Aesthetics 全部视觉通道 + 连续 Scales 家族（阶段二 R2 · size/opacity/shape 通道 + color 真通道/series + 连续 scale）

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.1 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md)（阶段二 alpha.7）· [`plot-design §3.3 Aesthetics / §3.4 Scale / §3.9 Guide`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../_template.md) · 上个 milestone：[`v0.1-alpha.6`](../v0.1-alpha.6/roadmap.md)

## 目标

**阶段二第二轮**（GoG「**Aesthetics**」+「**Scales 家族**」）：在 alpha.6 把 `data.model` 升级成承重类型层之后，本轮**补齐全部非位置视觉通道（`size` / `opacity` / `shape`）、把 `color` 收口成名副其实的真 scale 通道、并把连续 scale 家族补到 log / pow / sqrt**。同时把 alpha.1~6 只服务位置/颜色的「通道 → scale」处理**抽象成通用机制**，opacity / shape 直接复用该 resolver。

> **范围调整（2026-06-08）**：原 alpha.7 只做 `size`，opacity / shape 留 alpha.8。因 alpha.7 体量偏小、且 opacity / shape 与 size 同属「非位置通道」并复用同一 resolver，决定**把 opacity / shape 前移并入本轮**（[部分前移决策](#opacity--shape-前移alpha8-部分并入)），alpha.7 成为完整的「Aesthetics + 连续 Scales」里程碑。alpha.8 收缩为「gradient / 离散化 scale + legend」。

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

## opacity / shape 前移（alpha.8 部分并入）

> 2026-06-08 范围调整：把原 alpha.8 的 opacity / shape 通道前移并入 alpha.7（gradient / 离散化 scale / legend 仍留 alpha.8）。下面两项为**新增设计决策（拟定，待外部评审）**，与上面四项已签字决策一同进 ADR-04 / ADR-05。

- **⑤ opacity 作用域 = 仅 PointMark**（与 size 一致的 S1 风格，进 PointMark 专属 encoding，不进全局 StyleEncoding）：continuous 字段经 **linear scale** 映射到 `[minOpacity, 1]`（默认 range，避免低值全透明不可见）；常量 `value` ∈ `[0, 1]`；负值 / 越界 fail-loud。落到 core node 的不透明度字段（实现期确认 core 支持，不足走 next-core）。bar/area/line/sector 的 opacity 顺延（与 size 同口径）。
- **⑥ shape 作用域 = 仅 PointMark**（glyph 形状本就只对散点有意义）：**categorical** 字段经 ordinal 式映射到一组 glyph（默认 shape 调色板 circle / square / triangle / diamond / cross… 循环），落到 core node 的 `shape`；常量 `value` = shape 名。连续 / 时间字段 fail-loud（形状是分类编码）。显式 shape scale + 自定义 glyph 集顺延。

## 不在 alpha.7（顺延）

- **legend** guide（由非位置 scale 派生 + 布局）→ alpha.8（依赖本轮的全部非位置 scale 就位）
- **离散化 scale**（quantize / threshold / quantile）+ **连续 color 色阶 gradient**（sequential / diverging）→ alpha.8
- **categorical → 离散 size 档**（D1：本轮只做 continuous→size）→ 顺延 / 需求驱动
- **opacity 作用于 bar/area/line/sector** + **shape 自定义 glyph 集 / 显式 shape scale** → 顺延（⑤⑥ 仅 PointMark）
- **symlog**（log 跨零/负值兜底）+ **L2 显式正 baseline 的 log 柱/面积** → 需求驱动
- **line strokeWidth / bar width / area 的 size 语义** → 顺延（① S1 范围外）
- **自定义通道注册表（`ChannelDefinition` 对外开放）** → 另立里程碑（plot-design §11「先内置，后开放自定义」）；本轮通道集为内置 curated，ADR-02 的 resolver 仅留注册表接缝，用户要任意视觉控制走 Kernel（`<Node>` / `<Path>`）
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
     ├─ 03 color 真通道收口 + series 一等化 (dep 02 的 resolver：color 迁入 + B/C 规则)
     ├─ 04 opacity 通道 (dep 02 的 resolver：⑤ continuous → linear [minOpacity,1])
     └─ 05 shape 通道 (dep 02 的 resolver：⑥ categorical → glyph 集 → core node shape)
```

> 01 → 02 是地基（sqrt scale + 通用 resolver）；03 / 04 / 05 都只依赖 02 的 resolver，彼此独立、可并行起草与实现。01/02/03 已实现（见状态），04/05 为本次范围调整新增。

> **测试 case 规则**（沿用 alpha milestone 放宽）：按复杂度适量，覆盖真实有意义的 accept/reject 与行为断言（size 半径几何、边界退化、color×series 拆分等价性、log+bar fail-loud），不硬凑每 ADR ≥ 9。

## 前置 setup

无新包。alpha.7 主要在 `plot/src/ir/scale.ts`（PlotScale **仅新增** log/pow/sqrt 三个连续变体；**不新增 size/radius scale type**）、`plot/src/ir/encoding.ts`（PointMark 专属 size 通道，不进全局 StyleEncoding、`value` 限 number）、`plot/src/lower/`（通道→scale 通用 resolver 抽取、size 默认派生到 sqrt 连续 scale + **通道级**负值校验、`expand.ts` color 类型校验、`mark.ts` color×series 收口 + size→core circle 尺寸换算、log/幂 + bar/area fail-loud guard）；`plot/src/lower/coerce.ts` **不改**全局 continuous 语义。react/vanilla 表面扩 `DslScaleX`（+ log/pow/sqrt）+ PointMark `size` prop。

## ADR 清单

| ADR | 主题 | Level | 依赖 | 状态 |
|---|---|---|---|---|
| [01](./01-continuous-scale-family.md) | 连续 scale 家族 log / pow / sqrt（L1：仅 point/line，bar/area fail-loud；公开 scale 家族**不含** size/radius type） | red | — | Proposed（已实现） |
| [02](./02-channel-scale-resolver-size.md) | 通道→scale 通用抽象 + size 通道（仅 PointMark，radius scale，③边界契约；size 默认派生到 01 的 sqrt；不进全局 StyleEncoding、`value` 限 number） | red | ADR-01 | Proposed（已实现） |
| [03](./03-color-series.md) | color 真通道收口 + series 一等化（④B/C 规则 + categorical fail-loud + continuous/temporal color fail-loud + 修单系列静默丢弃 + 隐式拆等价性） | red | ADR-02 | Proposed（已实现） |
| [04](./04-opacity-channel.md) | opacity 通道（仅 PointMark，⑤：continuous → linear [minOpacity,1]、常量 ∈ [0,1]、越界 fail-loud；落 core node 不透明度） | red | ADR-02 | Proposed |
| [05](./05-shape-channel.md) | shape 通道（仅 PointMark，⑥：categorical → glyph 集（默认 shape 调色板）→ core node shape；连续/时间 fail-loud） | red | ADR-02 | Proposed |

## 贯穿原则落点

- **alpha.1 埋点 → 承重**：`StyleEncodingSchema`（alpha.1 拆出、注释「color today; opacity / size / shape later」）本轮兑现第一个新通道 `size`，并把通道→scale 处理抽象成可复用机制，正是「零成本埋点 → 可用能力」。
- **scope-aware / locator**：color 隐式拆 series 改变 Path/Scope 数量，隐式拆 IR 必须等价显式 series，守住 alpha.5 接通的 datum locator parity。
- **AI 友好**：size 写成 radius scale 语义（不外泄 core 换算）、log/pow/sqrt 按 `PlotScale` 风格暴露裸字面量，`.describe` 契约完整。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede。模板见 [`../../../_template.md`](../../../_template.md)。
