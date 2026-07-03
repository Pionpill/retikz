# plot 横向对比分析：ggplot2 / Vega-Lite / Observable Plot / Highcharts / ECharts / Recharts / AntV G2 / VChart vs retikz

> 目的：把 `@retikz/plot` 放进主流绘图库的坐标系里，看清现状差距与未来定位，为 roadmap 取舍提供参照。
> 范围：聚焦「图表层 / 绘图库」能力，不评 R 生态、不评业务图表美观度。
> 评分：公平客观、不迎合 retikz，标杆库在其强项给满分；retikz 现状按 **v0.1-alpha.12** 已落地能力打分（registry 三联 defineMark/Transform/Scale/Coordinate 全套扩展 + 6 mark / 7 transform / 13 scale + 19 配色 / 5 坐标系 / locator 定位 API 均已落地；facet / 动画 / 交互 UI 仍未实现），**目标 = 现有架构（core IR / Scene / Tier 2 分层）的能力上限**（受架构取舍约束，大数据性能等非目标维度即便做满也不高）。
> 版本：v0.1 · 日期：2026-06-06 · 关联：[`plot v0.1 roadmap`](../decisions/v0/v0.1/roadmap.md) · [`plot-design.md`](../architecture/plot-design.md) · [`core-design.md`](../../../../notes/architecture/core-design.md)

## 评分口径

**10 分制**（1 最差 → 10 最佳）：**1–2** 缺失 / 很弱　**3–4** 有限　**5–6** 中等　**7–8** 强　**9–10** 领先 / 标杆；**—** 不适用。

对比对象：**ggplot2**（R，图形语法范本）/ **Vega-Lite**（JSON spec GoG）/ **Observable Plot**（D3 团队 mark-based GoG）/ **Highcharts**（商业图表库）/ **ECharts**（Apache，option 驱动）/ **Recharts**（React 组件式）/ **AntV G2**（阿里 AntV，真·图形语法 JS 实现，建在 AntV G 渲染引擎上）/ **VChart**（字节 VisActor，VGrammar 语法层 + VRender 跨端渲染）/ **retikz 现状** / **retikz 目标**。现状只按已落地能力打分，架构预留 / roadmap 只进备注或目标分。

## 对比表

> ⚠️ **备注**：本表仅用于 `@retikz/plot` **开发阶段的内部评审参照**；评分由 LLM 生成、主观成分较大，**不可作为真实产品选型或对外的产品对比依据**。

| 分类 | 对比项 | ggplot2 | Vega-Lite | Observable Plot | Highcharts | ECharts | Recharts | AntV G2 | VChart | retikz 现状 | retikz 目标 | 备注 |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|
| 能力 | 图表类型覆盖 | 7 | 7 | 6 | 9 | 9 | 5 | 8 | 9 | 4 | 7 | 补：已有 point/path/region/interval/link/reference 6 mark，跨笛卡尔/极/三元可组合出柱/线/面/散点/饼/环/雷达/热力/桑基/参考线；缺 boxplot/candlestick/geo/graph 等专用图 |
| | 坐标系种类 | 7 | 5 | 4 | 5 | 7 | 4 | 8 | 7 | 6 | 7 | 已落地 cartesian2D/1D + polar2D/1D + ternary 5 种且 defineCoordinate 可扩展；缺 geo/parallel（G2 的 polar/theta/parallel/radial/helix 是同赛道最全参照） |
| | 交互 | 1 | 7 | 4 | 9 | 9 | 5 | 9 | 9 | 2 | 7 | 补：现仅 locator 定位 API（datum/series resolve，与 lowering 同投影 parity），无 hover/tooltip/缩放/选择 UI；依托 core 水合补足，学 G2 / VChart 交互动画 |
| | 动画 / 过渡 | 1 | 3 | 2 | 7 | 9 | 5 | 8 | 9 | 1 | 5 | 补：复用 core 动画 track 做数据更新过渡；VChart 把动画/叙事做成卖点，是高线参照 |
| | 组合 / 分面 | 9 | 9 | 7 | 3 | 5 | 3 | 9 | 6 | 3 | 7 | 补：现仅 marks 数组多层组合，facet 未实现；用 scope-aware IR 落 facet / 小多图（v0.5），学 ggplot facet 与 G2 rect/list/circle facet |
| | **能力 · 平均** | **5.0** | **6.2** | **4.6** | **6.6** | **7.8** | **4.4** | **8.4** | **8.0** | **3.2** | **6.6** | 主线：交互 + 图表类型 + facet 是三大补足项；G2/VChart 在能力广度上全面领先现状 |
| 图形语法 | 真·图形语法 | 10 | 9 | 8 | 1 | 3 | 3 | 9 | 5 | 7 | 9 | 补：data/transform/scale/coordinate/mark/guide 六件套均落地且 defineXxx 可扩展（alpha.12）；缺 facet / layer 继承 / 更丰富 guide。G2 v5 是 JS 阵营最完整真 GoG |
| | 声明式可序列化 spec | 3 | 10 | 3 | 6 | 6 | 1 | 6 | 6 | 8 | 9 | 守：IR 不混函数 / accessor 红线，operation/definition 二分让自定义扩展也不污染 IR；G2/VChart 的 spec 掺 encoder/回调，序列化纯度不及 retikz |
| | 可组合性 | 9 | 7 | 7 | 3 | 5 | 5 | 8 | 5 | 5 | 7 | 补：学 ggplot2 `+` 图层范式 / G2 composite view / Observable Plot mark 数组，做更优雅的组合 API |
| | **图形语法 · 平均** | **7.3** | **8.7** | **6.0** | **3.3** | **4.7** | **3.0** | **7.7** | **5.3** | **6.7** | **8.3** | 主线：丰富 GoG 四件套，守可序列化纯度逼近 Vega-Lite；G2 是同赛道最强真 GoG 对手 |
| 性能 | 大数据量渲染 | 3 | 3 | 3 | 7 | 10 | 1 | 6 | 9 | 3 | 5 | 取舍：非赛道，Canvas 后端兜底即可，不追 ECharts / VChart WebGL |
| | 包体积 / 底座轻量 | — | 3 | 4 | 5 | 5 | 5 | 4 | 4 | 7 | 6 | 守：plot 层按需引 d3 模块，core 仍仅 zod；G2(AntV G)/VChart(VRender) 底座偏重 |
| | **性能 · 平均** | **3.0** | **3.0** | **3.5** | **6.0** | **7.5** | **3.0** | **5.0** | **6.5** | **5.0** | **5.5** | 主线：守轻量，性能不追赛道 |
| API 设计 | 易用性 / 上手曲线 | 7 | 7 | 8 | 7 | 5 | 7 | 5 | 7 | 5 | 7 | 补：学 Observable Plot 智能默认 + `@retikz/chart` preset 层降门槛；G2 v5 语法上手成本偏高 |
| | 类型安全 | — | 5 | 5 | 7 | 5 | 7 | 6 | 7 | 8 | 9 | 守：`z.infer` 单源 + 禁 `any`；contract 层 defineXxx 泛型化让自定义扩展也强类型；alpha 期收敛 public API |
| | 框架集成 | — | 7 | 6 | 7 | 7 | 4 | 7 | 8 | 6 | 7 | 补：补 Vue / Svelte adapter，复用框架无关 IR；VChart 多框架 + 跨端是高线 |
| | **API 设计 · 平均** | **7.0** | **6.3** | **6.3** | **7.0** | **5.7** | **6.0** | **6.0** | **7.3** | **6.3** | **7.7** | 主线：智能默认 + preset + 扩框架 |
| 渲染器 | 后端多样性 | 5 | 5 | 2 | 5 | 7 | 1 | 9 | 8 | 5 | 7 | 校正：后端数量非 retikz 强项——G2(Canvas/SVG/WebGL/Skia) 最全，retikz 现仅 SVG+Canvas；plot 层不自造后端 |
| | renderer-agnostic / 后端可插拔 | 3 | 5 | 2 | 3 | 5 | 1 | 7 | 7 | 7 | 9 | 守：retikz 解耦边界是**可序列化 IR**，G2/VChart 解耦边界是运行时 scenegraph（换得了 renderer，存不下可移植描述） |
| | SSR / 无头渲染 | — | 5 | 4 | 5 | 5 | 4 | 6 | 7 | 7 | 7 | 守：保持 vanilla `renderToSvgString` framework-free SSR 路径 |
| | **渲染器 · 平均** | **4.0** | **5.0** | **2.7** | **4.3** | **5.7** | **2.0** | **7.3** | **7.3** | **6.3** | **7.7** | 主线：渲染优势不在「后端多」（G2/VChart 更多），在「解耦边界是可序列化 IR」 |
| AI | LLM 生成友好 | 3 | 10 | 4 | 5 | 5 | 3 | 5 | 6 | 6 | 9 | 补：建图表样例生态 + 真实生成验证，学 Vega-Lite 靠语料坐稳 LLM 出图标准；VChart 有 VMind AI 出图 |
| | schema / 契约可喂给 LLM | 1 | 7 | 3 | 3 | 3 | 1 | 3 | 3 | 8 | 9 | 守：每字段 `.describe`，沉淀 schema→tool definition 工具链；G2/VChart spec 无一等可喂 schema |
| | AI 原生 / 自我纠错 | 1 | 5 | 2 | 1 | 1 | 1 | 3 | 5 | 5 | 8 | 补：建评测集 + zod 错误回喂的自动修复闭环；VChart 靠 VMind 部分闭环 |
| | **AI · 平均** | **1.7** | **7.3** | **3.0** | **3.0** | **3.0** | **1.7** | **3.7** | **4.7** | **6.3** | **8.7** | 主线：守 schema 契约领先，补语料与自纠闭环 |
| 人群体验 | 新手学习（上手门槛） | 6 | 6 | 8 | 7 | 5 | 8 | 5 | 7 | 4 | 7 | 补：`@retikz/chart` preset 层降门槛，学 Recharts / Observable Plot 的好 API；语法驱动天生上手贵（G2 同病） |
| | 日常出图（高频效率） | 8 | 7 | 8 | 8 | 7 | 6 | 7 | 8 | 4 | 7 | 补：6 mark + 5 坐标系 + 13 scale 已能覆盖常见图，仍缺默认美观与开箱省心；学成熟库 / ggplot |
| | 深度使用（抽象 / 全面 / 可嵌入） | 9 | 8 | 7 | 6 | 7 | 4 | 8 | 7 | 7 | 9 | 守 + 补：defineMark/Transform/Scale/Coordinate 全套可扩展 + 后端中立 + 可连接图元，深度/可嵌入已显著起来（alpha.12） |
| | **人群体验 · 平均** | **7.7** | **7.0** | **7.7** | **7.0** | **6.3** | **6.0** | **6.7** | **7.3** | **5.0** | **7.7** | 主线：preset 补新手 / 日常，守深度用户强项 |

> **分组均值慎读**：均值为等权、且对维度选取高度敏感（本表偏重图形语法 / 渲染架构 / AI 等 retikz 结构强项），故不压成单一总分。retikz 现状低分（交互 2、动画 1、facet 3）是阶段性而非结构性；较高分（renderer-agnostic 7、schema 契约 8、类型安全 8、深度使用 7）是结构性优势，源于核心架构（registry 三联 + operation/definition 二分）而非堆功能。看分组趋势（如能力维度现状 3.2）比看总分可靠，结构优势 ≠ 整体成熟度。

## 图形语法分层评分

> 口径：只评 retikz plot 现状，不再横向比较各库；**功能完整度**看内置能力是否足够覆盖常见图表语义，**拓展性**看该层是否有一等 definition / registry / schema contract，以及扩展是否仍能保持 IR 可序列化。分数仍为 10 分制，现状按 alpha.12 已落地能力估算。

| 图形语法层级 | 功能完整度 | 拓展性 | 现状判断 | 主要缺口 / 下一步 |
|---|:--:|:--:|---|---|
| Data / 数据入口 | 5 | 6 | 能承载结构化数据并进入 plot spec，但更多是“数据作为输入”而非成熟 dataflow 层 | 数据集命名、跨 mark 共享、派生数据复用、异步 / 流式数据都还不是一等模型 |
| Transform / 数据变换 | 6 | 9 | 已有 7 类 transform，且 `defineTransform` 让内置与自定义同机制 | 需要补更完整的统计变换、窗口变换、bin / density 等常见图表数据流能力 |
| Scale / 尺度与配色 | 7 | 9 | 13 scale + 19 配色已能覆盖多数常见图，`defineScale` 拓展路径清楚 | 需要继续打磨默认值、domain 推断、legend/axis 联动与主题化体验 |
| Coordinate / 坐标系 | 6 | 9 | 5 种坐标系已覆盖 cartesian / polar / ternary 主干，`defineCoordinate` 是强拓展点 | 缺 geo、parallel、radial/helix 等更偏专用或高阶的坐标变体 |
| Mark / 几何图元 | 6 | 9 | 6 mark 已能组合出柱、线、面、散点、饼环、热力、桑基、参考线等基础图 | 缺 boxplot、candlestick、geo shape、graph edge/node 等专用 mark 家族 |
| Encoding / Channel | 5 | 7 | 已能把字段映射到位置、颜色、形状等视觉变量，是 mark 组合的核心胶水 | channel contract 与 guide / scale / mark 的联动还需收敛，复杂 channel 复用能力不足 |
| Guide / 轴与图例 | 4 | 5 | 有 guide 概念，但成熟度低于 data / scale / coordinate / mark 主干 | 需要补 axis / legend 的布局、主题、格式化、交互状态与自动推断 |
| Layer / Composition / Facet | 3 | 6 | 现状主要是 marks 数组多层组合；scope-aware IR 给 facet 留了位置 | facet、小多图、layer 继承、共享 scale / guide 还未形成完整语法 |
| Selection / Interaction | 2 | 5 | locator API 已给 datum/series resolve 打地基，但还不是完整交互语法 | hover、tooltip、brush、zoom、selection state、事件到 IR / runtime 的契约仍缺 |
| Lowering / IR 边界 | 7 | 9 | Tier 2 plot 可下沉到 core Kernel，IR / Scene 仍保持 renderer-agnostic 和可序列化 | 需要继续验证复杂图表 lowering 后的可调试性、source map / locator parity 和文档化 |
| **均值** | **5.1** | **7.4** | 现状是“功能成熟度中等偏早、拓展性明显先行”的结构 | 短期补功能广度，长期守住 operation/definition 二分与可序列化边界 |

结论：从图形语法分层看，retikz 的强项不是“每层功能都已成熟”，而是 **transform / scale / coordinate / mark / lowering 这些核心层的拓展契约已经先搭起来**。低分集中在 guide、facet、interaction 和 channel 联动，这些决定用户日常出图与复杂图表表达力；若后续补齐时仍沿用 definition / registry / 可序列化 operation 的同一套机制，目标形态会更接近 Vega-Lite 的 spec 纯度，同时保留 G2 式可扩展语法的灵活性。

### 图形语法分层横向对比

> 口径：单元格为 **功能完整度 / 拓展性**。功能完整度看内置语法与常见图表覆盖，拓展性看用户能否以稳定机制新增语法能力。这里的 Vega 指 **Vega-Lite**，Observable Plot 按 D3 团队的 Plot API 计，VChart 按 VisActor 的 VGrammar + VChart 组合能力计。

| 图形语法层级 | ggplot2 | Vega-Lite | Observable Plot | AntV G2 | VChart | retikz 现状 | 关键判断 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|---|
| Data / 数据入口 | 8/7 | 8/6 | 7/5 | 8/7 | 8/7 | 5/6 | 成熟库都有更自然的数据集、分组和派生数据语义；retikz 现状仍偏“输入数据”而非完整 dataflow |
| Transform / Stat | 9/8 | 8/5 | 7/5 | 8/8 | 8/7 | 6/9 | ggplot2 统计变换最成熟；retikz 内置数量还少，但 `defineTransform` 的扩展契约强 |
| Scale / 尺度 | 9/8 | 9/6 | 7/5 | 8/8 | 8/7 | 7/9 | retikz 已有可用基础，拓展性接近 G2；短板在自动推断、guide 联动和默认体验 |
| Coordinate / 坐标 | 8/7 | 6/5 | 5/4 | 9/8 | 8/7 | 6/9 | G2 坐标系最全；retikz 种类少于 G2/VChart，但 `defineCoordinate` 保留了高扩展上限 |
| Mark / Geom | 9/8 | 8/5 | 8/6 | 9/8 | 9/7 | 6/9 | ggplot2/G2/VChart 专用图元更全；retikz mark 家族少，但自定义 mark 与内置同机制 |
| Encoding / Channel | 8/7 | 9/6 | 8/5 | 9/8 | 8/7 | 5/7 | Vega-Lite 与 G2 的 channel 语义更完整；retikz 需要继续收敛 channel、scale、guide、mark 的联动契约 |
| Guide / Axis / Legend | 8/6 | 8/5 | 6/4 | 8/7 | 8/7 | 4/5 | retikz guide 明显早期；成熟库优势在布局、格式化、主题、自动推断与交互状态 |
| Layer / Composition / Facet | 10/8 | 9/6 | 7/5 | 9/8 | 7/6 | 3/6 | ggplot2 facet 与 G2 composite view 是高线；retikz 目前只有多 mark 组合，facet 仍是核心 gap |
| Selection / Interaction | 2/3 | 7/5 | 4/4 | 9/8 | 9/8 | 2/5 | G2/VChart 在交互语法和运行时能力领先；retikz 只有 locator 地基，还缺 selection grammar |
| Spec / IR 边界 | 3/4 | 10/5 | 3/4 | 6/8 | 6/7 | 8/9 | retikz 的可序列化 IR + operation/definition 二分是最强差异点；Vega-Lite spec 最纯但用户扩展弱 |
| **均值** | **7.4/6.6** | **8.2/5.4** | **6.2/4.7** | **8.3/7.8** | **7.9/7.0** | **5.2/7.4** | retikz 横向位置很清楚：功能成熟度仍落后，拓展性已经进入 G2/VChart 这一档 |

## 结论：结构优势 / gap / 取舍

**国内同赛道对手（G2 / VChart）画像**

- **AntV G2（阿里）= 同赛道最强对手**：JS 阵营里唯一与 retikz 同属「真·图形语法」的实现，且能力广度（图表类型 8 / 坐标系 8 / facet 9 / 交互 9 / 动画 8 / 生态 9）几乎全面领先 retikz 现状。retikz 只在 4 点反超：**序列化纯度**（G2 spec 掺 encoder/回调）、**schema 即 LLM 契约**、**解耦边界是可序列化 IR 而非运行时 scenegraph**、**底层 kernel IR 可被手写图元复用**。结论：retikz 不与 G2 拼广度/生态，靠这 4 点占差异化身位。
- **VChart（字节 VisActor）= 性能 / 动画 / 跨端见长**：大数据渲染（9）、动画叙事（9）、跨端（多框架 + 小程序 + Harmony）、VMind AI 出图是其强项；图形语法纯度（5.3）弱于 G2，spec 同样掺函数。属于「图表库 + 弱语法」一档，非纯 GoG 对手。
- **渲染维度认知校正**：「Canvas/SVG 可切换」**不是** retikz 独有优势——G2(Canvas/SVG/WebGL/Skia)、VChart、ECharts 后端都更全，retikz 现仅 SVG+Canvas 且缺 WebGL。retikz 渲染上真正可讲的只有一句：**解耦边界是可序列化 IR**（与「序列化 / AI 友好」同源），后端数量反而是短板。

**结构性差异化（高分从哪来）**

- **renderer-agnostic IR / Scene**：「画什么」编译成后端无关、**可序列化**的 IR/Scene，SVG/Canvas（未来更多）只是可插拔后端——对比库大多与某渲染器/运行时 scenegraph 强绑定（Recharts↔SVG、ECharts↔zrender、Highcharts↔自有、G2↔AntV G、VChart↔VRender）。注意：硬优势是**解耦边界可序列化**，不是「后端多」（G2/VChart 后端更多）。
- **schema 即 LLM 契约**：每 zod 字段强制 `.describe` → 直进 LLM tool definition（core-design §7），是 Vega-Lite 之外少有的「为模型生成而设计 IR」的库。
- **类型安全为红线**：`z.infer` 单源派生、IR 禁 `z.any()`/`as any`、判别 union 用 `as const` 枚举。
- **Kernel / Sugar / Tier 2 分层**：plot 经 `lowerComposites` 钩子下沉到 core Kernel，不污染 core 运行时（仅依赖 zod）、不撑爆 LLM 核心 schema，类比 PGFPlots 之于 TikZ。
- **registry 三联 + operation/definition 二分（alpha.12 落地）**：mark / transform / scale / coordinate 四类原语都 `defineXxx` 可扩展，自定义逻辑活在运行时 definition、operation 仍是纯 JSON——内置与自定义同机制，扩展不破坏 IR 序列化纯度。这是 G2/VChart 的 register 式 API 没有的「契约分离」。
- **IR 即真源、authoring 表面可多套**：react 与 vanilla 两套入口产出同一 IR，spec 可手写 / 程序生成 / AI 生成三态等价。

**现状 → 目标关键 gap（低分要补什么）**

- **交互（2 → 7）**：现仅 locator 定位 API（datum/series resolve，与 lowering 同投影 parity），hover/tooltip/缩放/选择 UI 留 v0.3、依赖 core 水合；定位地基已铺好降低后补成本，但这是差距最大、用户感知最强的一块。
- **图表类型覆盖（4 → 7）**：已有 6 mark 跨 5 坐标系能组合出柱/线/面/散点/饼/环/雷达/热力/桑基/参考线；缺 scatter 矩阵、boxplot、candlestick、geo/map、graph/network 等专用图，GoG 组合能摊薄部分但专用图需逐个落。
- **组合 / 分面（3 → 7）**：scope-aware IR 已预留，facet / 小多图落 v0.5；GoG 核心竞争力，未补齐则「真 GoG」说服力打折。
- **生态成熟度（文档 / a11y / 导出 / 测试覆盖）**：成熟库多年长尾，retikz 处早期 alpha，非一两个 milestone 可追平。

**取舍与非目标（避免误定位）**

- 不追极限大数据性能（IR 间接层固有开销）；定位「中等数据量流畅 + canvas 后端兜底」。
- 不与 Recharts 拼「纯 React 便捷度」；react 层价值在「React 手感 + 底层可序列化 IR」。
- **主攻生态位 = Vega-Lite ∩（renderer-agnostic + 类型安全 + AI 原生）**：守住 renderer-agnostic / schema 契约 / 类型安全三项结构优势，优先补交互与分面，放弃大数据性能赛道。
- **不与 G2 拼广度/生态**：G2 已证明「真 GoG + 工程实现 + 生态」可以做很全，retikz 追广度追不过、追生态没时间。差异化只押 4 张牌：可序列化纯度、schema 即 LLM 契约、解耦边界为可序列化 IR、底层 kernel IR 可被手写图元复用——这是 G2/VChart/ECharts 都没有的「TikZ 式统一 IR」身位。

## 更新记录

- **v0.1**（2026-06-06）：初版，六分类 10 分制对比表 + 详细说明。
- **v0.2**（2026-06-08）：补入 **Observable Plot** 列与逐库画像；新增 **「人群体验」分类**（新手 / 日常 / 深度三视角）。
- **压缩**（2026-06-12）：精简为对比表 + 评分口径 + 结论（结构优势 / gap / 非目标）；移除逐库画像与人群体验长文（逐库要点已在表的备注列、评分已在表内）。
- **v0.3**（2026-06-20）：补入国内同赛道 **AntV G2**（阿里）与 **VChart**（字节 VisActor）两列，重算分组均值；新增「国内同赛道对手画像」段落，校正渲染维度认知（后端数量非 retikz 强项，硬优势是解耦边界可序列化）；结论补「不与 G2 拼广度/生态」取舍。
- **v0.4**（2026-06-20）：retikz 现状评分基线从 **alpha.4** 重置到 **alpha.12** 实际落地能力。上调：图表类型覆盖 3→4、坐标系种类 4→6、交互 1→2、真·图形语法 6→7、类型安全 7→8、日常出图 3→4、深度使用 5→7（registry 三联全套扩展驱动）；连带分组均值 能力 2.4→3.2、图形语法 6.3→6.7、API 6.0→6.3、人群体验 4.0→5.0。动画 / facet / 大数据 / AI 语料维度无实现进展，保持原分。
- **v0.5**（2026-06-22）：新增「图形语法分层评分」与「图形语法分层横向对比」，按 Data / Transform / Scale / Coordinate / Mark / Channel / Guide / Composition / Interaction / Spec 边界拆分 retikz 现状及 ggplot2 / Vega-Lite / Observable Plot / AntV G2 / VChart 的功能完整度与拓展性，明确“拓展契约先行、功能成熟度仍需补齐”的判断。
