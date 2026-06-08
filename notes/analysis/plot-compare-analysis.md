# plot 横向对比分析：ggplot2 / Vega-Lite / Observable Plot / Highcharts / ECharts / Recharts vs retikz

> 目的：把 `@retikz/plot` 放进主流绘图库的坐标系里，看清**现状差距**与**未来定位**，为 roadmap 取舍提供参照。
> 范围：聚焦「图表层 / 绘图库」能力，不评 R 语言生态、不评具体业务图表美观度。
> 说明：**评分必须公平公正、不得迎合 retikz**——按各库真实能力客观打分，retikz 有短板就如实给低分，绝不因这是本仓项目而抬高；标杆库（ggplot2 之于图形语法、Vega-Lite 之于 spec/LLM、ECharts 之于性能）在其强项上就该拿满分，retikz 不与之争虚高。评分用于横向相对定位、非基准测试数字；retikz 现状按当前 v0.1-alpha.4 打分，**retikz 目标 = 现有架构的能力上限**——即在不推翻 core IR / Scene / Tier 2 分层等现有架构前提下、把已规划能力做到位后该维度可达的天花板（受架构取舍约束，故大数据性能等非目标维度即便「做满」也不会高）。
> 版本：v0.1 · 日期：2026-06-06 · 关联：[`plot v0.1 roadmap`](../decisions/plot/v0/v0.1/roadmap.md) · [`plot-design.md`](../architecture/plot-design.md) · [`core-design.md`](../architecture/core-design.md)

## 评分口径

**10 分制**（1 最差 → 10 最佳）：

- **1–2** 缺失 / 很弱　**3–4** 有限　**5–6** 中等　**7–8** 强　**9–10** 领先 / 标杆（10 留给该维度的事实标准 / 范本）
- **—** 不适用（该维度对该库无意义，如 ggplot2 的前端框架集成）
- 对比对象：**ggplot2**（R，图形语法范本）/ **Vega-Lite**（JSON spec GoG）/ **Observable Plot**（D3 团队 mark-based GoG）/ **Highcharts**（商业图表库）/ **ECharts**（Apache，option 驱动）/ **Recharts**（React 组件式）/ **retikz 现状** / **retikz 目标**
- **retikz 现状只按已落地能力打分**：架构预留、扩展便利、roadmap 规划只写进备注或目标分，不直接抬高现状分。

## 对比表

> ⚠️ **备注**：本表单仅用于 `@retikz/plot` **开发阶段的内部评审参照**；评分由 LLM 生成、主观成分较大，**不可作为真实产品选型或对外的产品对比依据**。

| 分类 | 对比项 | ggplot2 | Vega-Lite | Observable Plot | Highcharts | ECharts | Recharts | retikz 现状 | retikz 目标 | 备注 |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|
| 能力 | 图表类型覆盖 | 7 | 7 | 6 | 9 | 9 | 5 | 3 | 7 | 商业 / 成熟库类型最广；Observable Plot 靠 mark + transform 摊覆盖面但缺极坐标族；retikz 现仅 line/point/bar/area/sector/pie/radar |
| | 坐标系种类 | 7 | 5 | 4 | 5 | 7 | 4 | 4 | 7 | retikz 现仅 cartesian2D + polar2D；Observable Plot 仅 cartesian + geo 投影、**故意不做极坐标**；coordinate 抽象提升未来扩展性，但不直接计入现状能力 |
| | 交互 | 1 | 7 | 4 | 9 | 9 | 5 | 1 | 7 | Observable Plot 有 tip / pointer / crosshair，重交互回落 D3；retikz 交互留 v0.3，但已预埋 anchor / datum locator |
| | 动画 / 过渡 | 1 | 3 | 2 | 7 | 9 | 5 | 1 | 5 | ECharts 动画最强；Observable Plot 几无过渡语法（重渲染）；retikz 规划中但非首要 |
| | 组合 / 分面 | 9 | 9 | 7 | 3 | 5 | 3 | 3 | 7 | GoG 系强项；Observable Plot `fx`/`fy` facet-as-channel 极顺手；retikz scope-aware IR 已预留，facet 落 v0.5 |
| | **能力 · 平均** | **5.0** | **6.2** | **4.6** | **6.6** | **7.8** | **4.4** | **2.4** | **6.6** | |
| 图形语法 | 真·图形语法 | 10 | 9 | 8 | 1 | 3 | 3 | 6 | 9 | retikz 管线方向正确，但 facet/layer/transform/guide 丰富度仍处早期；Observable Plot 是真 GoG（偏便利 mark 风味）；ggplot2 是范本 |
| | 声明式可序列化 spec | 3 | 10 | 3 | 6 | 6 | 1 | 8 | 9 | retikz IR 100% JSON 可序列化、单一真源；Vega-Lite 是 JSON spec 范本；Observable Plot options 含函数 / accessor / D3 scale 对象 → 不可序列化；Highcharts/ECharts option 可序列化但常混入函数 / 运行时配置 |
| | 可组合性 | 9 | 7 | 7 | 3 | 5 | 5 | 5 | 7 | ggplot2 `+` 图层范式最优雅；Observable Plot mark 数组 + transform 包 mark 亦优雅 |
| | **图形语法 · 平均** | **7.3** | **8.7** | **6.0** | **3.3** | **4.7** | **3.0** | **6.3** | **8.3** | |
| 性能 | 大数据量渲染 | 3 | 3 | 3 | 7 | 10 | 1 | 3 | 5 | ECharts（canvas+WebGL）领先；Observable Plot 同 SVG/D3 中等；retikz 设计重点不在极限性能 |
| | 包体积 / 底座轻量 | — | 3 | 4 | 5 | 5 | 5 | 7 | 6 | retikz core 运行时依赖仅 zod；Observable Plot 捆 D3 一截偏重；plot 层已引入 d3-array / d3-scale / d3-scale-chromatic，仍偏轻但不按 core 单独计 8 |
| | **性能 · 平均** | **3.0** | **3.0** | **3.5** | **6.0** | **7.5** | **3.0** | **5.0** | **5.5** | ggplot2 包体积不适用，其均值仅 1 项 |
| API 设计 | 易用性 / 上手曲线 | 7 | 7 | 8 | 7 | 5 | 7 | 5 | 7 | Observable Plot 常见图上手最快（智能默认极强）；ECharts option 庞杂；retikz 早期文档 + GoG 学习成本 |
| | 类型安全 | — | 5 | 5 | 7 | 5 | 7 | 7 | 9 | Observable Plot 有 TS 类型但 channel accessor 偏松；retikz 类型由 zod `z.infer` 派生、IR 禁 `any`；但 alpha 期 public API 稳定性与生态验证仍有限 |
| | 框架集成 | — | 7 | 6 | 7 | 7 | 4 | 6 | 7 | Observable Plot 返回 DOM 节点、vanilla / notebook 取向；retikz 框架无关 IR + react / vanilla 两套 runtime；暂未覆盖 Vue/Svelte 等生态 |
| | **API 设计 · 平均** | **7.0** | **6.3** | **6.3** | **7.0** | **5.7** | **6.0** | **6.0** | **7.7** | ggplot2 仅计易用性，API 均值不可与前端库直接比较 |
| 渲染器 | 后端多样性 | 5 | 5 | 2 | 5 | 7 | 1 | 5 | 7 | Observable Plot 仅 SVG 单后端；retikz 现 SVG + Canvas 两后端 |
| | renderer-agnostic / 后端可插拔 | 3 | 5 | 2 | 3 | 5 | 1 | 7 | 9 | **retikz 核心卖点**：IR/Scene 与后端解耦；Observable Plot 紧绑 SVG/D3；现状已有基础，但后端生态与成熟度仍早期 |
| | SSR / 无头渲染 | — | 5 | 4 | 5 | 5 | 4 | 7 | 7 | Observable Plot SSR 需 DOM polyfill；retikz vanilla runtime = framework-free SSR（`renderToSvgString`） |
| | **渲染器 · 平均** | **4.0** | **5.0** | **2.7** | **4.3** | **5.7** | **2.0** | **6.3** | **7.7** | |
| AI | LLM 生成友好 | 3 | 10 | 4 | 5 | 5 | 3 | 6 | 9 | Vega-Lite 现为 LLM 出图事实标准；Observable Plot 看似声明但含函数、无校验；retikz 以此为设计目标，但样例生态和真实生成验证仍少 |
| | schema / 契约可喂给 LLM | 1 | 7 | 3 | 3 | 3 | 1 | 8 | 9 | retikz 每个 zod 字段 `.describe` 即给 LLM 的契约（core-design §7），刻意设计；Observable Plot 仅 TS 类型 / 文档、无 JSON schema 契约 |
| | AI 原生 / 自我纠错 | 1 | 5 | 2 | 1 | 1 | 1 | 5 | 8 | retikz zod 校验错误可喂回模型自纠；Observable Plot 无 schema 校验循环；但尚未形成完整的自动修复循环与评测集 |
| | **AI · 平均** | **1.7** | **7.3** | **3.0** | **3.0** | **3.0** | **1.7** | **6.3** | **8.7** | |
| 人群体验 | 新手学习（上手门槛） | 6 | 6 | 8 | 7 | 5 | 8 | 4 | 7 | 新手偏好好 API：Recharts / Observable Plot 上手最低；retikz 现状概念多 + alpha 文档薄，preset 层（`@retikz/chart`）落地后改善 |
| | 日常出图（高频效率） | 8 | 7 | 8 | 8 | 7 | 6 | 3 | 7 | 高频出图看默认美观 + 覆盖常见需求：成熟库与 Observable Plot / ggplot 省心；retikz 现状 mark 少 |
| | 深度使用（抽象 / 全面 / 可嵌入） | 9 | 8 | 7 | 6 | 7 | 4 | 5 | 9 | 老手看底层抽象 + 功能全面 + 可定制 / 可嵌入：ggplot 扩展生态最深；Observable Plot 可下钻 D3 但 SVG / 无坐标系封顶；retikz 目标靠 Tier1 可连接图元 + 后端中立撑结构性上限 |
| | **人群体验 · 平均** | **7.7** | **7.0** | **7.7** | **7.0** | **6.3** | **6.0** | **4.0** | **7.7** | |

> retikz 现状的低分（交互 1、动画 1、类型覆盖 3）是**阶段性**而非**结构性**——它们落在 roadmap 后续 milestone；retikz 较高分（renderer-agnostic 7、schema 契约 8、类型安全 7）是**结构性优势**，源于核心架构而非堆功能。注意：retikz 现状在多数能力维度仍明显落后于成熟库，结构优势不等于整体成熟度。
>
> **分组平均慎读**：均值为**等权**、且对**对比维度的选取**高度敏感——本表偏重图形语法 / 渲染架构 / AI 等 retikz 的结构强项，故不再压成单一总分，避免误读为整体成熟度或生产可用度排名。看趋势看分组（如能力维度 retikz 现状仅 2.4）比看总分更可靠。

## 详细说明

### 逐库画像

- **ggplot2（图形语法范本）**：Wilkinson《Grammar of Graphics》最权威的工程实现，`aes` 映射 + geom 图层 + `+` 组合 + facet 是后世所有 GoG 库的参照系。**强**在语法完备、图层组合、分面；**弱**在它是 R 代码而非可序列化 spec（跨语言 / 持久化 / LLM 生成都不便）、原生静态无交互（要 plotly/shiny）、不在 Web 前端生态。对 retikz 的意义：**语法层的标杆**——retikz 的 mark/encoding/scale/coordinate 直接对标其 geom/aes/scale/coord，但要补上 ggplot2 没有的「可序列化 IR + Web 渲染 + 交互」。

- **Vega-Lite（JSON spec GoG，retikz 最近的参照）**：把图形语法压成一份 JSON spec，声明式、可序列化、可校验，配 Vega 运行时渲染 SVG/Canvas 并支持声明式交互（selection）。**强**在 spec 即契约、组合（layer/concat/facet/repeat）、且**已成 LLM 出图的事实标准**（大量 text-to-chart 直接生成 Vega-Lite）。**弱**在大数据性能一般、包体积偏大、底层 Vega 学习曲线陡。**对 retikz 是头号对标对象**：retikz 与它共享「spec/IR 即真源」哲学，差异在 retikz 把 IR 与渲染后端彻底解耦（renderer-agnostic）、用 zod `.describe` 把「schema 即 LLM 契约」做成一等设计、且类型安全更强。retikz 想抢的正是 Vega-Lite 的「AI 生成目标」生态位。

- **Observable Plot（D3 团队的 mark-based GoG，retikz 最近的同类）**：Mike Bostock / Observable 团队基于 D3 的图形语法库，`Plot.dot/line/areaY/barY` + `{x, y, fill}` channel + 自动推断 scale，主打「最快画出一张图」。**强**在极致的智能默认（轴 / 网格 / 图例 / scale 类型 / domain 全自动，常见图近乎零 spec）、mark 词汇丰富（dot/line/area/cell/rule/text/link/arrow/vector/geo/raster/contour/density/hexbin…）、facet 作为 `fx`/`fy` 通道一等支持、transform 包在 mark 上可组合（`Plot.groupX` / `Plot.stackY`）。**弱**在 options 里塞函数 / accessor / D3 scale 对象 → **不可序列化**（持久化 / 跨语言 / LLM 生成都不便，返回 live SVG DOM）、**仅 SVG 单后端**、**故意不做极坐标 / 饼图**（Bostock 立场，只有 cartesian + geo 投影）、无声明式交互语法（基础 tip / pointer，重交互回落 D3）。**对 retikz 的意义**：架构上是镜像对照——Observable Plot 在「可序列化 IR / 坐标系 / 后端中立」三处恰恰做不到，正是 retikz 的赌注；但它的「人体工学」值得学：更狠的隐式默认、非位置通道自动 provision scale、facet-as-channel、per-mark transform、mark 词汇表当 checklist。一句话——**学 Observable Plot「让常见图几乎不用写」，别学它「把函数塞进 spec」**。它是整张表里与 retikz 最近的同类（同为 JS 里比 Vega-Lite 轻的 mark-based GoG），原表遗漏，本版补入。

- **Highcharts（商业成熟库）**：图表类型驱动（chart.type 配置），SVG 渲染 + boost 模块走 canvas 提升大数据性能，交互 / 导出 / 无障碍打磨极成熟，文档与 TS 定义完善。**强**在类型覆盖（含 stock/maps/gantt）、交互完整度、工程成熟度；**弱**在非图形语法（组合 / 自定义受限）、商业授权、spec 偏「配置对象」而非语义语法。对 retikz 的意义：**成熟度与交互完整度的天花板参照**，提醒 retikz 交互 / 导出 / a11y 是长尾硬工。

- **ECharts（option 驱动，性能强）**：Apache 顶级项目，option 对象描述 series，canvas 优先（zrender 抽象层，亦支持 SVG / WebGL via echarts-gl），**大数据与动画是最强项**（progressive render、百万级点）。**强**在性能、功能广度、动画、生态（尤其国内）；**弱**在 option 对象庞杂（非 GoG、组合性靠堆 series）、包体积大、语义抽象层次低。对 retikz 的意义：**性能维度的标杆**——但 retikz 不以极限性能为首要目标（IR 间接层有固有开销），应明确「不追 ECharts 的大数据生态位」这一非目标。其 zrender 后端抽象与 retikz 的 renderer-agnostic 思路相近，可借鉴。

- **Recharts（React 组件式）**：用可组合 React 组件声明图表，底层 D3 + SVG。**强**在 React 开发者体验、TS、上手快；**弱**在 SVG 大数据性能差、仅 React、JSX 不可序列化（无法持久化 / 跨端 / 喂 LLM 生成）、非真 GoG。对 retikz 的意义：retikz 的 `@retikz/plot-react` 组合 DSL 与之形态相近，但 retikz 的 React 层只是 authoring 表面，**底下是可序列化 IR**——这正是 Recharts 缺的那一层，retikz 的 react runtime 应主打「同样的 React 手感 + 多出一份可持久化 / 可渲染多后端 / 可喂 AI 的 IR」。

### retikz 的结构性差异化（高分从哪来）

- **renderer-agnostic IR / Scene（渲染器无关）**：core 把「画什么」编译成与后端无关的 IR/Scene，SVG/Canvas（未来更多）只是可插拔后端。对比库大多与某一渲染器强绑定（Recharts↔SVG、ECharts↔zrender、Highcharts↔自有）。这是 retikz 最硬的结构优势——新增后端、SSR、跨端不动上层语义。
- **schema 即 LLM 契约**：每个 zod 字段强制 `.describe(...)`（英文、写含义不复述字段名），直接进 LLM tool definition（core-design §7）。这把「AI 友好」从口号变成可执行的工程约束，是 Vega-Lite 之外少有的「为模型生成而设计 IR」的库。
- **类型安全为红线**：类型由 `z.infer` 从 zod 单一派生、IR 禁 `z.any()`/`as any`、判别联合用 `as const` 枚举。消费者拿到的类型与运行时校验同源，漂移成本低。
- **Kernel / Sugar / Tier 2 分层**：plot 作为 Tier 2 经 `lowerComposites` 钩子下沉到 core Kernel 原语，不污染 core 运行时（core 仅依赖 zod）、不撑爆 LLM 核心 schema。这让「图表层可独立演进、底座保持轻量」，类比 PGFPlots 之于 TikZ。
- **IR 即真源、authoring 表面可多套**：react 与 vanilla 两套入口产出同一 IR，spec 可手写 / 程序生成 / AI 生成三态等价。

### 现状 → 目标的关键 gap（低分要补什么）

- **交互（现 1 → 目标 7）**：当前完全静态，hover/tooltip/缩放/选择留 v0.3，依赖 core 水合而非仅 authoring 表面。已预埋 anchor / datum locator 降低后补成本，但这是与成熟库差距最大、用户感知最强的一块。
- **图表类型覆盖（现 3 → 目标 7）**：现仅基础 mark 家族；缺 scatter 矩阵、heatmap、boxplot、candlestick、geo/map、graph/network 等。靠 GoG 组合能摊薄部分，但专用图仍需逐个落。
- **组合 / 分面（现 3 → 目标 7）**：scope-aware IR 已预留，facet / 小多图落 v0.5；这是 GoG 库的核心竞争力，未补齐则「真 GoG」说服力打折。
- **生态成熟度（文档 / a11y / 导出 / 测试覆盖）**：Highcharts/ECharts 多年打磨的长尾，retikz 处早期 alpha，非一两个 milestone 可追平。

### 取舍与非目标（避免误定位）

- **不追极限大数据性能**：IR 间接层 + 语义优先注定 retikz 不会在百万级点上对标 ECharts WebGL。性能目标定在「中等数据量流畅 + canvas 后端兜底」，把资源投到语法 / IR / AI / 多后端，而非大数据渲染军备竞赛。
- **不与 Recharts 拼「纯 React 便捷度」**：retikz 的 react 层价值在「React 手感 + 底层可序列化 IR」，而非比 Recharts 更轻。
- **主攻生态位 = Vega-Lite ∩（renderer-agnostic + 类型安全 + AI 原生）**：retikz 最现实的差异化是「像 Vega-Lite 一样 spec/AI 友好，但 IR 渲染器无关、类型更安全、与 TikZ 式节点-路径-scope 原语同源」。横向对比的结论应反哺 roadmap：**优先补交互与分面（差距大且用户感知强），守住 renderer-agnostic / schema 契约 / 类型安全三项结构优势，明确放弃大数据性能赛道。**

### 人群体验视角（新手 / 日常 / 深度）

前六个分类是**客观能力维度**；「人群体验」分类是从**不同使用者立场**做的综合折射——同一组能力，新手、日常用户、深度用户感受截然不同：

- **新手学习（上手门槛）**：新手最看「有没有好 API、概念负担低不低」。Recharts（React 组件直觉）与 Observable Plot（智能默认、近零 spec）门槛最低；ggplot2 / Vega-Lite 概念完整但要先理解 GoG；retikz 现状概念多 + alpha 文档薄，**这块要靠上层 preset（`@retikz/chart`，§5 / §6）补**——primitive 层天生偏专家。
- **日常出图（高频效率）**：看「默认是否美观、常见需求是否一把覆盖」。成熟库、Observable Plot、ggplot 在此最省心；retikz 现状受限于 mark 数量，目标随语法铺开追平。
- **深度使用（抽象 / 全面 / 可嵌入）**：老手转而关注**底层抽象、功能全面性、可定制与可组合**。ggplot 的 geom/stat 扩展生态最深；Observable Plot 可下钻 D3，但 SVG 单后端 + 无坐标系是其封顶；**retikz 的结构性赌注正长在这一格**——Tier1 可连接图元 + renderer-agnostic + 可嵌入更大图解，是深度用户的天花板（也是为何 retikz 目标在此与 ggplot 并列最高、却在「新手」格不占优）。

> 启示：retikz 的**结构优势天然偏向深度用户**，新手 / 日常体验是其相对软肋——这正说明 `@retikz/chart` preset 层不是可选项而是补齐受众覆盖的必需层。别用 primitive 层的专家心智去衡量新手体验。

## 更新记录

> 本文是活文档，按版本记录修订；每次实质调整递增小版本。

- **v0.1**（2026-06-06）：初版，六分类 10 分制对比表 + 详细说明。
- **v0.2**（2026-06-08）：补入 **Observable Plot** 列与逐库画像（retikz 最近的同类，原表遗漏）；新增 **「人群体验」分类**（新手 / 日常 / 深度三视角）+ 对应说明。
