# plot v0.1-alpha.8 实施待办：高级 Scales（连续色阶 + 离散化）+ Legend（阶段二 R3 · color gradient / quantize·threshold·quantile / 图例）

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.1 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md)（阶段二 alpha.8）· [`plot-design §3.4 Scale / §3.9 Guide`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../_template.md) · 上个 milestone：[`v0.1-alpha.7`](../v0.1-alpha.7/roadmap.md)

## 目标

**阶段二第三轮**（GoG「**Scales 进阶**」+「**Guide · Legend**」）：在 alpha.7 把全部非位置通道（size / opacity / shape / color）收口成真 scale 通道、且补齐连续 scale 家族（log / pow / sqrt）之后，本轮做两件事——

1. **把 color 通道从「仅 categorical → ordinal」扩到连续域**：补 **连续色阶**（sequential / diverging gradient）+ **离散化 scale**（quantize / threshold / quantile），了结 alpha.7 留下的「continuous / temporal `color.field` → fail-loud」债（[alpha.7 ADR-03](../v0.1-alpha.7/03-color-series.md) 明确「连续色阶留 alpha.8」）。
2. **补 legend guide**：把 alpha.2 起只有 axis 的 `GuideSchema` 升成 discriminated union，由非位置 scale（ordinal color / sequential·diverging color / 离散化 color / size / opacity / shape）派生 legend，并做纯函数布局。

现状（alpha.1~7，见 [上轮](../v0.1-alpha.7/roadmap.md) + 代码核验）：

- **color 只有 ordinal**：`PlotScale` 连续族已到 log/pow/sqrt，但**颜色映射仅 `ordinal`**（`ir/scale.ts`）；`makeColorResolver`（`lower/expand.ts`）对 continuous / temporal `color.field` 一律 **fail-loud**——本轮的连续色阶正是它的出口。
- **无离散化 scale**：quantize / threshold / quantile 全缺；连续字段想要「分档着色」（choropleth 风）目前无路径。
- **guide 仅 axis**：`GuideSchema = AxisGuideSchema`（非 union，`ir/guide.ts` 已注释「legend 进来时升 discriminatedUnion，type 判别位已在、升级非破坏」）；`PlotGuide` 仅 `Axis`；`lower/guide.ts` 只下沉坐标轴。**非位置 scale 全部就位却无任何 legend**，读图无图例。
- **布局无文字度量**（[plot-design §13.1](../../../../../architecture/plot-design.md) 结构性约束）：纯函数 lowering 无 text measurement，legend 宽度 / swatch 排布只能以 `fontSize` 等为输入估算，不做测量驱动的自适应——本轮 legend 布局须接受这一上限（估算式，非测量式）。

三块（对齐 [v0.1 roadmap](../roadmap.md) line 41「高级 Scales + Legend」，延续「纵向薄片 + 三包 lockstep」）：

- **连续色阶 sequential / diverging（结构叶子）**：`PlotScale` 新增连续颜色 scale；continuous / temporal `color.field` 经它映射到色带（sequential 单调、diverging 带中点）。复用 `d3-scale-chromatic`（已是 `@retikz/plot` 依赖）取内置配色方案。这是 alpha.7 color fail-loud 的兑现出口。
  - **mark 作用域边界（衔接 alpha.7 ADR-03 B/C 规则，本轮写死）**：连续色阶 per-datum 着色**仅 point / bar / sector**（按 datum 取色，与 ④B/C 一致）。**line / area 是 path 级整体图元、按 series 着色**——连续字段几乎必然「同 series 内 color 不恒定」，直接命中 alpha.7 ADR-03 既有的「同 series 内 color 不恒定 → fail-loud」，故 **line/area + 连续 `color.field` 本轮 fail-loud**（错误信息引导：连续色仅 point/bar/sector，或等 path/stroke gradient）。**path / stroke gradient（一条线沿程渐变）本轮不做**，顺延需求驱动。
- **离散化 scale quantize / threshold / quantile（dep 连续色阶的 range 形态）**：连续 domain → 离散输出（本轮输出为**离散 color 档**）。三者区别——quantize 等宽分箱、threshold 自定义断点、quantile 按数据分位分箱。落地后「连续字段分档着色」成立，且为 legend 的「分箱图例」提供 scale 形态。
- **legend guide（dep 上两块 + alpha.7 全部非位置 scale）**：`GuideSchema` 升 discriminated union（`PlotGuide` 加 `Legend`）；legend target 按 **`channel` + 可选 `scale`** 绑定（消歧多 scale，决策 ⑥），由对应非位置 scale 派生——ordinal/shape → 离散 swatch 列表，sequential/diverging → 连续色带 ramp，quantize/threshold/quantile → 分箱 swatch，size → 梯度符号（graduated symbols），opacity → 梯度透明度；纯函数**估算布局 + 占位**（牵动 `layout/expand`，决策 ⑩）下沉成 core Node / Path / Scope。配套：alpha.7 通道 resolver 须暴露可复用 scale descriptor；显式 Legend **不抑制默认 axes**（决策 ⑦）。

## 待调研 + 待决策（ADR 起草前定，列表供决策）

> 沿用 alpha.6/7 流程：**临近开发先调研同类库（Vega-Lite / ggplot2 / Observable Plot / Highcharts）+ 外部 LLM 评审，再拍板进 ADR**。以下为本轮已识别、需在 ADR-01~03 起草前定的关键决策点，**先列出供后续决策**，未签字前不进实现。

- **① 连续色阶判别串拆分**：`sequential` / `diverging` 拆成两个独立 `PlotScale` 成员，还是一个 `sequential` + 可选 `midpoint`（有中点即 diverging）？倾向**两个独立成员**（判别清晰、与裸字面量友好、`.describe` 各自完整），但 diverging 复用 sequential 的 interpolator 机制。
- **② 配色方案表面**：内置 scheme 用**命名词表**（closed enum，如 `'viridis' / 'blues' / 'rdbu'`，可序列化进 IR）还是允许用户传 range 颜色数组？倾向**命名词表 + 可选 range 覆盖**（词表保 LLM 友好 + 可序列化，range 给逃生）。词表取 `d3-scale-chromatic` 子集，避免全量撑爆 schema describe。
- **③ 离散化 scale 输出域**：本轮 quantize / threshold / quantile 的 range **只做 color** 还是同时支持 size 档？倾向**仅 color**（与「高级 Scales 服务颜色」主线一致；离散 size 档即 alpha.7 顺延的 D1，需求驱动再做）。
- **④ threshold 断点契约**：threshold 的 `breakpoints` 是否要求严格升序、`range` 长度须 = `breakpoints.length + 1`？倾向**强校验 fail-loud**（断点乱序 / 长度不匹配直接拒，不静默截断）。
- **⑤ quantile 的 domain 来源**：quantile 按数据分位分箱——domain 必须从绑定数据现算（不像 linear 可显式给 `[min,max]`）；显式 domain 与 quantile 语义冲突时如何处理？倾向**quantile 不接受显式数值 domain，只接受分箱数 `count`**（分位由数据定），显式 domain → fail-loud。
- **⑥ legend target 语义（评审 P1，关键）**：legend 绑什么？**只按 channel 绑定有歧义**——一张 plot 的 IR 可有多个 color scale，多个 mark 也可能各自绑 size/opacity/shape，且 alpha.7 的 size/opacity/shape 默认 scale **多在 resolver 内部合成、未必物化进 `PlotSpec.scales`**。倾向 legend target 支持 **`channel` + 可选 `scale`**（消歧到具体 scale），必要时再加可选 `mark`；**配套要求**：alpha.7 的通道 resolver 须产出**可被 legend 复用的 scale descriptor**（把内部合成 scale 暴露成可引用对象），否则 legend 拿不到 size/opacity/shape 的 domain/range 去渲染。这条会反向牵动 alpha.7 resolver 的产物形态，须在 ADR-03 起草期定。
- **⑦ legend 显式声明 + 默认 axes 合并规则（评审 P1，关键）**：legend 倾向**显式声明出**（`<Legend channel="color" />`，与 axis 一致；自动派生留 theme 层 auto-guide）。**但当前 `buildPlotSpec.ts:293` 的规则是「只要有任何 guide 就不加默认 axes」——加 `<Legend>` 会让默认 x/y 轴消失**（真 bug）。本轮须把合并规则改成：**显式 `Axis` 才覆盖默认 `Axis`；`Legend` 不抑制默认 `Axis`**（按 guide 的 `type` 分别判断默认补齐，而非「有任何 guide 就清空」）。落点 `buildPlotSpec.ts` guide 合并 + vanilla 对应。
- **⑧ React / vanilla 连续色阶入口（评审 P1，关键）**：当前 React 表面**无法承载连续色阶**——`buildPlotSpec.ts:102` 把所有 color 绑死 `AUTO_COLOR`、`:289` 固定 push **ordinal** scale。「continuous color 不再 fail-loud」必须有 React 入口才走得通。三选一（ADR-01 起草期定）：(a) 显式 `<ColorScale type="sequential" scheme=…>` 组件；(b) `<Plot colorScale=…>` prop；(c) **有 model 时 type-driven 自动派生**（continuous/temporal color field → sequential，categorical → ordinal，复用 alpha.6 type-driven 选型链）。倾向 **(c) 为主 + (a)/(b) 为显式覆盖**，与 alpha.6「类型驱动、可显式覆盖」一致。
- **⑨ legend tick / label 契约（评审 P2）**：连续 ramp、时间色阶、quantize/threshold/quantile 分箱各需标签生成规则，至少定：`tickCount`（ramp 上标几个刻度）、数字格式、temporal 格式（复用 alpha.6 type-driven formatter）、**分箱区间标签的闭开口**（threshold `[a, b)` 还是 `a–b`）。复用 axis 已有的 tick formatter 链，不另造一套。
- **⑩ legend 布局参数 + 占位（评审 P2）**：位置（`'right' / 'left' / 'top' / 'bottom'`）+ 朝向（vertical / horizontal）+ 与 plot area 的占位关系。**legend 占位不只是 `lower/guide.ts` 的事**——要先**估算 legend 尺寸再决定 plotArea**（否则 legend 只能 overlay 或画到边界外），牵动 `lower/layout.ts` / `expand.ts`（见前置 setup）。受**无文字度量**约束，宽度按 `fontSize` × 估算字符数算，标签过长会溢出——倾向**先做固定位置 + 估算布局 + 估算占位，溢出文档明示**，测量驱动自适应留后续（结构上限，见 plot-design §13.1）。

## 不在 alpha.8（顺延）

- **categorical → 离散 size / opacity 档**（D1：连续→size 已在 alpha.7，离散档需求驱动）→ 顺延
- **symlog**（log 跨零/负值兜底）+ **L2 显式正 baseline 的 log 柱/面积** → 需求驱动（alpha.7 顺延项，延续）
- **theme 层 auto-guide**（声明通道即自动出 legend / 默认调色板 token）→ alpha.14 Theme
- **legend 交互**（hover 高亮 / 点击筛选）→ v0.3 交互线（依赖 core 水合，非 authoring）
- **legend 测量驱动自适应**（标签防重叠 / 宽度自适应 / 旋转）→ 结构上限，不做（plot-design §13.1）
- **自定义通道注册表对外开放** → 另立里程碑（plot-design §11「先内置，后开放自定义」，延续 alpha.7 边界）
- 更多 mark / 坐标系 / transform → alpha.9+

## core 依赖

**预计无新 core 依赖**——连续色阶 / 离散化 scale 纯 plot 内（`ir/scale.ts` + `lower/`）；legend 下沉到 core 现有 Node / Path / Scope（色带 ramp 可用 core 已有 paint server 渐变，swatch 用 Node）。若实现期发现 legend 色带渐变 / core paint 表达不足，按 AGENTS.md「子组遇 core 能力不足先补 core」走 `next-core`，不在 plot 自造。**color gradient 落到 core 渐变 paint server 这一点需在 ADR-01 起草期核验 core 能力**（core 已有 linearGradient / radialGradient paint server，见 core IR；legend 连续色带是否够用待确认）。

## 执行模式

**单条串行**：每 ADR 走 5 阶段（设计 → 实现 → 自测 → 文档 → 收尾），人工 review 后开下一条。3 条 ADR（01~03）均 red，按 [`develop-design`](../../../../../../.agents/skills/develop-design/SKILL.md) 先调研 + 外部 LLM 评审、人工签字后进实现（沿用 alpha.6/7）。

**三表面同步硬约束**（develop-design 要求）：每条 ADR 必须同时写 **IR schema + React JSX props + vanilla/spec 表面** 三处，文档站 demo 在同改动集露出（连续色阶 / 离散化 / legend 各配 mdx + demo）。

## 实现顺序（编号 ≠ 依赖，结构叶子优先）

```
01 连续色阶 sequential / diverging (结构叶子：新颜色 scale 类型 + scheme/range schema；color fail-loud 的出口)
 └─ 02 离散化 scale quantize / threshold / quantile (dep 01：复用 01 的 scheme/range schema 产离散 color 档)
     └─ 03 legend guide (dep 01/02 + alpha.7 全部非位置 scale：GuideSchema 升 union + 派生 + 布局占位)
```

> **依赖链统一为 01 → 02 → 03**（修评审 P2 指出的前后不一致）：02 离散化的输出域**复用 01 的 scheme / range schema**（同一套命名配色词表 + range 覆盖，决策 ②），故 02 dep 01、**不并行**；03 legend 依赖前两块的 scale 形态全部就位（连续色带 ramp / 分箱 swatch 都要在 legend 里渲染）+ alpha.7 全部非位置 scale 的可复用 descriptor（决策 ⑥）。

> **测试 case 规则**（沿用 alpha milestone 放宽）：按复杂度适量，覆盖真实有意义的 accept/reject 与行为断言（色阶端点映射、diverging 中点、quantize 等宽边界、threshold 断点校验、quantile 分位、legend swatch/ramp 数量与位置、continuous color 不再 fail-loud），不硬凑每 ADR ≥ 9。

## 前置 setup

无新包。alpha.8 主要在：

- `plot/src/ir/scale.ts`（`PlotScale` 加连续色阶 + 离散化成员；扩 `ScaleSchema` discriminatedUnion + 派生类型）
- `plot/src/ir/guide.ts`（`PlotGuide` 加 `Legend`；`GuideSchema` 升 `z.discriminatedUnion('type', [AxisGuideSchema, LegendGuideSchema])`；legend target 字段 `channel` + 可选 `scale`，见决策 ⑥）
- `plot/src/lower/scale.ts`（连续色阶 / 离散化 resolve；color 通道接通连续色阶——`lower/expand.ts` 的 `makeColorResolver` 去掉 continuous/temporal fail-loud、改派生连续色阶；line/area + 连续 color 仍 fail-loud，见上「mark 作用域边界」）
- `plot/src/lower/channel.ts`（alpha.7 通道 resolver 产出**可被 legend 复用的 scale descriptor**，决策 ⑥）
- `plot/src/lower/guide.ts`（legend 派生 + 纯函数布局 → core Node/Path/Scope；标签复用 axis tick formatter 链，决策 ⑨）
- `plot/src/lower/{layout,expand}.ts`（**legend 占位**：先估算 legend 尺寸再决定 plotArea，决策 ⑩；否则 legend 只能 overlay / 出界）
- react/vanilla 表面：
  - 连续色阶入口（决策 ⑧）——改 `buildPlotSpec.ts:102/289`（当前所有 color 绑死 `AUTO_COLOR` + 固定 push ordinal），加 type-driven 派生 sequential / 显式 color-scale 覆盖
  - **默认 axes 合并规则**（决策 ⑦）——改 `buildPlotSpec.ts:293`（当前「有任何 guide 即不加默认 axes」），改成按 guide `type` 分别判断：显式 Axis 才覆盖默认 Axis、Legend 不抑制默认 Axis
  - 新增 `<Legend>` 组件 / vanilla spec 表面

## ADR 清单（拟定，待起草）

> 本轮 ADR 尚未起草——按惯例临近开发先调研同类库 + 外部评审、人工签字后再写 ADR 草案（Proposed）。下表为**拟定拆分**，编号 / 主题在起草期可微调。

| ADR | 主题 | Level（预估） | 依赖 | 状态 |
|---|---|---|---|---|
| 01 | 连续色阶 sequential / diverging（continuous/temporal color → 色带；内置 scheme 词表 + 可选 range；line/area 连续 color 仍 fail-loud、无 path gradient；React type-driven 派生入口；了结 alpha.7 color fail-loud） | red | — | 待起草 |
| 02 | 离散化 scale quantize / threshold / quantile（连续 domain → 离散 color 档；复用 01 scheme/range schema；threshold 断点强校验；quantile 数据分位） | red | ADR-01 | 待起草 |
| 03 | legend guide（GuideSchema 升 union；target = channel + 可选 scale；resolver 暴露可复用 descriptor；估算布局 + 占位；显式 Legend 不抑制默认 axes；标签复用 axis formatter） | red | ADR-01/02 + alpha.7 非位置 scale | 待起草 |

## 贯穿原则落点

- **alpha.7 埋点 → 承重**：alpha.7 把 continuous/temporal color 显式 fail-loud（「连续色阶留 alpha.8」），本轮 ADR-01 正是该埋点的兑现出口；非位置 scale 全部就位后，ADR-03 legend 把它们统一可视化。
- **scope-aware / locator**：legend 下沉成独立 Scope（不污染 plot area 坐标系），守住 mark 的 datum locator parity；legend swatch 不参与命中（读图辅助，非数据 mark）。
- **AI 友好**：连续色阶按 `PlotScale` 风格暴露裸字面量 + 命名 scheme 词表（可序列化、LLM 可生成）；legend 按 channel 绑定（与 encoding 通道一一对应），`.describe` 契约完整。
- **结构上限诚实**：legend 布局受无文字度量约束（plot-design §13.1），estimated 而非 measured，文档明示溢出行为，不假装做了自适应。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede。模板见 [`../../../_template.md`](../../../_template.md)。
