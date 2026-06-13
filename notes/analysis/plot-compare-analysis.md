# plot 横向对比分析：ggplot2 / Vega-Lite / Observable Plot / Highcharts / ECharts / Recharts vs retikz

> 目的：把 `@retikz/plot` 放进主流绘图库的坐标系里，看清现状差距与未来定位，为 roadmap 取舍提供参照。
> 范围：聚焦「图表层 / 绘图库」能力，不评 R 生态、不评业务图表美观度。
> 评分：公平客观、不迎合 retikz，标杆库在其强项给满分；retikz 现状按 **v0.1-alpha.4** 已落地能力打分，**目标 = 现有架构（core IR / Scene / Tier 2 分层）的能力上限**（受架构取舍约束，大数据性能等非目标维度即便做满也不高）。
> 版本：v0.1 · 日期：2026-06-06 · 关联：[`plot v0.1 roadmap`](../decisions/plot/v0/v0.1/roadmap.md) · [`plot-design.md`](../architecture/plot-design.md) · [`core-design.md`](../architecture/core-design.md)

## 评分口径

**10 分制**（1 最差 → 10 最佳）：**1–2** 缺失 / 很弱　**3–4** 有限　**5–6** 中等　**7–8** 强　**9–10** 领先 / 标杆；**—** 不适用。

对比对象：**ggplot2**（R，图形语法范本）/ **Vega-Lite**（JSON spec GoG）/ **Observable Plot**（D3 团队 mark-based GoG）/ **Highcharts**（商业图表库）/ **ECharts**（Apache，option 驱动）/ **Recharts**（React 组件式）/ **retikz 现状** / **retikz 目标**。现状只按已落地能力打分，架构预留 / roadmap 只进备注或目标分。

## 对比表

> ⚠️ **备注**：本表仅用于 `@retikz/plot` **开发阶段的内部评审参照**；评分由 LLM 生成、主观成分较大，**不可作为真实产品选型或对外的产品对比依据**。

| 分类 | 对比项 | ggplot2 | Vega-Lite | Observable Plot | Highcharts | ECharts | Recharts | retikz 现状 | retikz 目标 | 备注 |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|
| 能力 | 图表类型覆盖 | 7 | 7 | 6 | 9 | 9 | 5 | 3 | 7 | 补：GoG 组合摊薄通用图 + 逐个补 scatter/heatmap/boxplot/candlestick/geo/graph，参考 ECharts 类型清单 |
| | 坐标系种类 | 7 | 5 | 4 | 5 | 7 | 4 | 4 | 7 | 补：靠 core coordinate 抽象逐个补坐标系，参考 ECharts / ggplot coord 族 |
| | 交互 | 1 | 7 | 4 | 9 | 9 | 5 | 1 | 7 | 补：依托 core 水合 + 已埋 datum locator 补 hover/tooltip/缩放/选择，学 Highcharts / ECharts 交互 |
| | 动画 / 过渡 | 1 | 3 | 2 | 7 | 9 | 5 | 1 | 5 | 补：复用 core 动画 track 做数据更新过渡，学 ECharts progressive / 入场动画 |
| | 组合 / 分面 | 9 | 9 | 7 | 3 | 5 | 3 | 3 | 7 | 补：用 scope-aware IR 落 facet / 小多图（v0.5），学 ggplot facet 与 Vega-Lite concat/repeat |
| | **能力 · 平均** | **5.0** | **6.2** | **4.6** | **6.6** | **7.8** | **4.4** | **2.4** | **6.6** | 主线：交互 + 图表类型 + facet 是三大补足项 |
| 图形语法 | 真·图形语法 | 10 | 9 | 8 | 1 | 3 | 3 | 6 | 9 | 补：丰富 facet / layer / transform / guide，对照 ggplot2 geom/stat/scale/coord 体系 |
| | 声明式可序列化 spec | 3 | 10 | 3 | 6 | 6 | 1 | 8 | 9 | 守：IR 不混函数 / accessor 红线，保持近 Vega-Lite 的纯 JSON spec |
| | 可组合性 | 9 | 7 | 7 | 3 | 5 | 5 | 5 | 7 | 补：学 ggplot2 `+` 图层范式 / Observable Plot mark 数组，做更优雅的组合 API |
| | **图形语法 · 平均** | **7.3** | **8.7** | **6.0** | **3.3** | **4.7** | **3.0** | **6.3** | **8.3** | 主线：丰富 GoG 四件套，守可序列化纯度逼近 Vega-Lite |
| 性能 | 大数据量渲染 | 3 | 3 | 3 | 7 | 10 | 1 | 3 | 5 | 取舍：非赛道，Canvas 后端兜底即可，不追 ECharts WebGL |
| | 包体积 / 底座轻量 | — | 3 | 4 | 5 | 5 | 5 | 7 | 6 | 守：plot 层按需引 d3 模块，core 仍仅 zod |
| | **性能 · 平均** | **3.0** | **3.0** | **3.5** | **6.0** | **7.5** | **3.0** | **5.0** | **5.5** | 主线：守轻量，性能不追赛道 |
| API 设计 | 易用性 / 上手曲线 | 7 | 7 | 8 | 7 | 5 | 7 | 5 | 7 | 补：学 Observable Plot 智能默认 + `@retikz/chart` preset 层降门槛 |
| | 类型安全 | — | 5 | 5 | 7 | 5 | 7 | 7 | 9 | 守：`z.infer` 单源 + 禁 `any`；alpha 期收敛 public API |
| | 框架集成 | — | 7 | 6 | 7 | 7 | 4 | 6 | 7 | 补：补 Vue / Svelte adapter，复用框架无关 IR |
| | **API 设计 · 平均** | **7.0** | **6.3** | **6.3** | **7.0** | **5.7** | **6.0** | **6.0** | **7.7** | 主线：智能默认 + preset + 扩框架 |
| 渲染器 | 后端多样性 | 5 | 5 | 2 | 5 | 7 | 1 | 5 | 7 | 守：随 core 后端走（现 SVG + Canvas），plot 层不自造后端 |
| | renderer-agnostic / 后端可插拔 | 3 | 5 | 2 | 3 | 5 | 1 | 7 | 9 | 守：IR/Scene 与后端解耦红线；随 core 多后端扩展自然受益 |
| | SSR / 无头渲染 | — | 5 | 4 | 5 | 5 | 4 | 7 | 7 | 守：保持 vanilla `renderToSvgString` framework-free SSR 路径 |
| | **渲染器 · 平均** | **4.0** | **5.0** | **2.7** | **4.3** | **5.7** | **2.0** | **6.3** | **7.7** | 主线：守 renderer-agnostic 结构优势，随 core 后端扩展 |
| AI | LLM 生成友好 | 3 | 10 | 4 | 5 | 5 | 3 | 6 | 9 | 补：建图表样例生态 + 真实生成验证，学 Vega-Lite 靠语料坐稳 LLM 出图标准 |
| | schema / 契约可喂给 LLM | 1 | 7 | 3 | 3 | 3 | 1 | 8 | 9 | 守：每字段 `.describe`，沉淀 schema→tool definition 工具链 |
| | AI 原生 / 自我纠错 | 1 | 5 | 2 | 1 | 1 | 1 | 5 | 8 | 补：建评测集 + zod 错误回喂的自动修复闭环 |
| | **AI · 平均** | **1.7** | **7.3** | **3.0** | **3.0** | **3.0** | **1.7** | **6.3** | **8.7** | 主线：守 schema 契约领先，补语料与自纠闭环 |
| 人群体验 | 新手学习（上手门槛） | 6 | 6 | 8 | 7 | 5 | 8 | 4 | 7 | 补：`@retikz/chart` preset 层降门槛，学 Recharts / Observable Plot 的好 API |
| | 日常出图（高频效率） | 8 | 7 | 8 | 8 | 7 | 6 | 3 | 7 | 补：补 mark 数量 + 默认美观，学成熟库 / ggplot 的开箱省心 |
| | 深度使用（抽象 / 全面 / 可嵌入） | 9 | 8 | 7 | 6 | 7 | 4 | 5 | 9 | 守 + 补：稳 Tier1 可连接图元 + 后端中立，坐实深度用户天花板（目标与 ggplot 并列） |
| | **人群体验 · 平均** | **7.7** | **7.0** | **7.7** | **7.0** | **6.3** | **6.0** | **4.0** | **7.7** | 主线：preset 补新手 / 日常，守深度用户强项 |

> **分组均值慎读**：均值为等权、且对维度选取高度敏感（本表偏重图形语法 / 渲染架构 / AI 等 retikz 结构强项），故不压成单一总分。retikz 现状低分（交互 1、动画 1、类型覆盖 3）是阶段性而非结构性；较高分（renderer-agnostic 7、schema 契约 8、类型安全 7）是结构性优势，源于核心架构而非堆功能。看分组趋势（如能力维度现状仅 2.4）比看总分可靠，结构优势 ≠ 整体成熟度。

## 结论：结构优势 / gap / 取舍

**结构性差异化（高分从哪来）**

- **renderer-agnostic IR / Scene**：「画什么」编译成后端无关 IR/Scene，SVG/Canvas（未来更多）只是可插拔后端——对比库大多与某渲染器强绑定（Recharts↔SVG、ECharts↔zrender、Highcharts↔自有）。最硬结构优势。
- **schema 即 LLM 契约**：每 zod 字段强制 `.describe` → 直进 LLM tool definition（core-design §7），是 Vega-Lite 之外少有的「为模型生成而设计 IR」的库。
- **类型安全为红线**：`z.infer` 单源派生、IR 禁 `z.any()`/`as any`、判别 union 用 `as const` 枚举。
- **Kernel / Sugar / Tier 2 分层**：plot 经 `lowerComposites` 钩子下沉到 core Kernel，不污染 core 运行时（仅依赖 zod）、不撑爆 LLM 核心 schema，类比 PGFPlots 之于 TikZ。
- **IR 即真源、authoring 表面可多套**：react 与 vanilla 两套入口产出同一 IR，spec 可手写 / 程序生成 / AI 生成三态等价。

**现状 → 目标关键 gap（低分要补什么）**

- **交互（1 → 7）**：当前完全静态，hover/tooltip/缩放/选择留 v0.3，依赖 core 水合；已预埋 anchor / datum locator 降低后补成本，但这是差距最大、用户感知最强的一块。
- **图表类型覆盖（3 → 7）**：现仅基础 mark 家族；缺 scatter 矩阵、heatmap、boxplot、candlestick、geo/map、graph/network 等，GoG 组合能摊薄部分但专用图需逐个落。
- **组合 / 分面（3 → 7）**：scope-aware IR 已预留，facet / 小多图落 v0.5；GoG 核心竞争力，未补齐则「真 GoG」说服力打折。
- **生态成熟度（文档 / a11y / 导出 / 测试覆盖）**：成熟库多年长尾，retikz 处早期 alpha，非一两个 milestone 可追平。

**取舍与非目标（避免误定位）**

- 不追极限大数据性能（IR 间接层固有开销）；定位「中等数据量流畅 + canvas 后端兜底」。
- 不与 Recharts 拼「纯 React 便捷度」；react 层价值在「React 手感 + 底层可序列化 IR」。
- **主攻生态位 = Vega-Lite ∩（renderer-agnostic + 类型安全 + AI 原生）**：守住 renderer-agnostic / schema 契约 / 类型安全三项结构优势，优先补交互与分面，放弃大数据性能赛道。

## 更新记录

- **v0.1**（2026-06-06）：初版，六分类 10 分制对比表 + 详细说明。
- **v0.2**（2026-06-08）：补入 **Observable Plot** 列与逐库画像；新增 **「人群体验」分类**（新手 / 日常 / 深度三视角）。
- **压缩**（2026-06-12）：精简为对比表 + 评分口径 + 结论（结构优势 / gap / 非目标）；移除逐库画像与人群体验长文（逐库要点已在表的备注列、评分已在表内）。
