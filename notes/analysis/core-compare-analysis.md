# core 底座横向对比分析：TikZ/PGF / D3 / Two.js / Mermaid / react-flow / Excalidraw / Vega vs retikz

> 目的：把 `@retikz/core`（core / render / react / vanilla 四个 Tier 1 包）放进底层绘图 / IR 基础库的坐标系里，看清底座能力位置与架构能力上限，为 core roadmap 取舍提供参照。
> 范围：只评「底座 / 底层能力」——图元 / 几何 / 锚点 / 路径文法、IR / Scene 架构、renderer-agnostic、跨框架、扩展性、AI 契约、类型与性能；**不评图表层**（chart / scale / guide 归 `@retikz/plot`，见 [`plot-compare-analysis.md`](./plot-compare-analysis.md)）。
> 评分：公平客观、不迎合 retikz，标杆库在其强项给满分；retikz 现状按 **core 0.3.0-beta.1** 已落地能力打分，**目标 = 现有架构（IR 居中 / Scene 渲染中立 / Kernel·Sugar·Tier 2 分层 / core 仅依赖 zod）的能力上限**（受架构取舍约束，大数据性能等非目标维度即便做满也不高）。
> 版本：v0.1 · 日期：2026-06-12 · 关联：[`core-design.md`](../architecture/core-design.md) · [`plot-compare-analysis.md`](./plot-compare-analysis.md) · `packages/core/AGENTS.md`

## 评分口径

**10 分制**（1 最差 → 10 最佳）：**1–2** 缺失 / 很弱　**3–4** 有限　**5–6** 中等　**7–8** 强　**9–10** 领先 / 标杆（10 留给该维度的事实标准）；**—** 不适用。

对比对象：**TikZ/PGF**（图元 / 锚点 / 路径文法范本，retikz 灵感源）/ **D3**（可编程底层 kernel 范本）/ **Two.js**（renderer-agnostic 2D 范本）/ **Mermaid**（diagram-as-code DSL）/ **react-flow**（React 节点-边 + 交互）/ **Excalidraw**（可序列化 scene JSON 范本）/ **Vega**（JSON spec + renderer-agnostic runtime）/ **retikz 现状** / **retikz 目标**。现状只按已落地能力打分，架构预留 / roadmap 只进备注或目标分。

## 对比表

> ⚠️ **备注**：本表仅用于 core 模块**开发阶段的内部评审参照**；评分由 LLM 生成、主观成分较大，**不可作为真实产品选型或对外的产品对比依据**。

| 分类 | 对比项 | TikZ/PGF | D3 | Two.js | Mermaid | react-flow | Excalidraw | Vega | retikz 现状 | retikz 目标 | 备注 |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|
| 图元能力 | 形状 / 节点系统 | 9 | 4 | 4 | 3 | 4 | 3 | 3 | 6 | 8 | 补：借 registry 逐个补常用 shape，学 TikZ `shapes` 的 anchor 命名与参数化约定 |
| | 路径文法 | 10 | 6 | 3 | 2 | 4 | 2 | 3 | 7 | 9 | 补：补完整 `to[]` 语法与 decorations（snake/coil/markings），对照 TikZ path operation 清单 |
| | 锚点 / 定位系统 | 10 | 2 | 2 | 2 | 5 | 3 | 2 | 7 | 9 | 补：补通用 calc——点投影 `($(A)!(P)!(B)$)`、intersections 交点求解，学 TikZ `calc` 库 |
| | 箭头 / marker | 10 | 3 | 2 | 4 | 5 | 4 | 2 | 6 | 8 | 补：学 TikZ `arrows.meta`，把箭头尺寸 / 比例 / 内缩开成 registry 参数 |
| | 几何 / 坐标系 | 9 | 7 | 5 | 2 | 4 | 4 | 7 | 7 | 8 | 补：补几何工具链（曲线交点 / 切线 / 更多坐标系），对标 TikZ 几何库广度 |
| | **图元能力 · 平均** | **9.6** | **4.4** | **3.2** | **2.6** | **4.4** | **3.2** | **3.4** | **6.6** | **8.4** | 主线：以 TikZ 词汇表为 checklist 逐项补，registry 摊薄长尾 |
| 架构 / IR | 可序列化 IR / spec | 2 | 1 | 2 | 6 | 7 | 9 | 10 | 9 | 9 | 守：保持禁函数 / ref / class 红线；学 Vega 发布官方 JSON Schema 供外部消费 |
| | renderer-agnostic / 后端可插拔 | 3 | 2 | 9 | 2 | 2 | 2 | 7 | 8 | 9 | 补：学 Two.js 多后端，落地 WebGL / Skia / PDF 后端反证 Scene 中立度 |
| | 跨框架 adapter | — | 6 | 5 | 6 | 1 | 2 | 6 | 7 | 8 | 补：落地 Vue / Svelte / Solid runtime，用第二、三套 adapter 证明框架无关 IR |
| | 扩展性（registry / Tier 2 / meta） | 8 | 9 | 4 | 3 | 7 | 4 | 6 | 8 | 9 | 补：学 D3 模块化可编程，丰富各 registry 的组合与可编程程度 |
| | **架构 / IR · 平均** | **4.3** | **4.5** | **5.0** | **4.3** | **4.3** | **4.3** | **7.3** | **8.0** | **8.8** | 主线：守可序列化 / 中立红线，靠多后端 + 多框架兑现架构上限 |
| 渲染 | 后端多样性 | 6 | 4 | 7 | 3 | 3 | 4 | 6 | 7 | 8 | 补：学 Two.js 补 WebGL 后端，验证 Scene 对位图 / 矢量 / GPU 三路皆中立 |
| | SSR / 无头渲染 | 7 | 4 | 3 | 6 | 1 | 3 | 7 | 8 | 8 | 守：保持 `renderToSvgString` 纯字符串路径；补 SSR 字体注入示例文档 |
| | 文本度量 | 9 | 5 | 4 | 5 | 5 | 5 | 7 | 7 | 8 | 补：把常见字体精确度量（opentype/fontkit）做成开箱可用，缩小与 TikZ 字体引擎精度差 |
| | **渲染 · 平均** | **7.3** | **4.3** | **4.7** | **4.7** | **3.0** | **4.0** | **6.7** | **7.3** | **8.0** | 主线：补 WebGL 后端 + 开箱字体度量，守无头纯字符串路径 |
| 表现增强 | 样式系统（级联 / scope / 继承） | 9 | 5 | 3 | 5 | 5 | 4 | 6 | 8 | 8 | 补：学 TikZ `every` / `pgfkeys`，细化按类型 / 选择器的样式覆盖 |
| | 动画 | 2 | 8 | 5 | 1 | 4 | 1 | 5 | 7 | 8 | 补：学 D3 命令式灵活度，经 ADR 补 along-path / wipe；morph 走 Tier 2 不进 core |
| | 交互 / 水合 | 1 | 8 | 3 | 3 | 9 | 9 | 7 | 6 | 8 | 补：在水合 context 上搭 drag / connect / select / 吸附 behavior 层，学 react-flow / Excalidraw 交互模型 |
| | **表现增强 · 平均** | **4.0** | **7.0** | **3.7** | **3.0** | **6.0** | **4.7** | **6.0** | **7.0** | **8.0** | 主线：交互行为库是第一优先（差距最大），动画补路径类 |
| AI | LLM 生成友好 | 6 | 3 | 3 | 8 | 3 | 5 | 9 | 6 | 9 | 补：建样例生态 + IR↔TikZ codec，学 Vega / Mermaid 靠语料与示例提升生成命中率 |
| | schema / 契约可喂给 LLM | 1 | 1 | 1 | 3 | 3 | 4 | 8 | 9 | 9 | 守：保持每字段 `.describe`；沉淀 zod→JSON Schema→tool definition 工具链 |
| | AI 原生 / patch 编辑 / 自纠错 | 1 | 1 | 1 | 3 | 2 | 3 | 5 | 6 | 8 | 补：建「生成-校验-修复」自动闭环 + 评测集，把 zod 错误回喂做成标准循环 |
| | **AI · 平均** | **2.7** | **1.7** | **1.7** | **4.7** | **2.7** | **4.0** | **7.3** | **7.0** | **8.7** | 主线：守 schema 契约领先，补语料生态与自纠闭环 |
| API / 类型 | 类型安全 | — | 6 | 5 | 4 | 8 | 6 | 5 | 8 | 9 | 守：`z.infer` 单源 + 禁 `any`；rc 期冻结 public API 收敛漂移 |
| | 易用性 / 上手 | 4 | 4 | 8 | 9 | 7 | 8 | 4 | 5 | 7 | 补：学 Mermaid / Observable 的智能默认，铺 sugar + plot preset + 概念文档降门槛 |
| | 框架集成 | — | 6 | 5 | 7 | 7 | 6 | 7 | 6 | 8 | 补：补 Vue / Svelte / Solid adapter |
| | **API / 类型 · 平均** | **4.0** | **5.3** | **6.0** | **6.7** | **7.3** | **6.7** | **5.3** | **6.3** | **8.0** | 主线：冻结 API + 铺 sugar/文档 + 扩框架 |
| 性能 / 轻量 | 大数据 / 复杂图渲染 | 3 | 7 | 6 | 3 | 6 | 7 | 5 | 4 | 5 | 取舍：非设计目标，Canvas 后端兜底即可，不追 D3 / WebGL 军备 |
| | 包体积 / 底座轻量 | — | 4 | 7 | 3 | 5 | 3 | 2 | 7 | 6 | 守：core 运行时仅 `zod` 红线（零 React / DOM），重依赖经 Tier 2 下沉 |
| | **性能 / 轻量 · 平均** | **3.0** | **5.5** | **6.5** | **3.0** | **5.5** | **5.0** | **3.5** | **5.5** | **5.5** | 主线：守零依赖轻量，性能不追赛道 |
| 人群体验 | 图解作者（技术写作 / 论文配图） | 9 | 5 | 5 | 7 | 6 | 7 | 4 | 5 | 8 | 补：补 mark 词汇 + 文档 + sugar，用「TikZ 表达力 + 浏览器 + AI」承接 TikZ 用户 |
| | 库 / domain 包开发者 | 6 | 9 | 5 | 3 | 6 | 4 | 6 | 7 | 9 | 守 + 补：稳定 registry / Tier 2 API，出 plot / flow 等示范 domain 包坐实抽象 |
| | AI agent / LLM | 4 | 2 | 2 | 7 | 3 | 5 | 8 | 7 | 9 | 补：建 codec + 评测集，把「schema 即契约 + 可 patch」坐实成 AI 生态位 |
| | **人群体验 · 平均** | **6.3** | **5.3** | **4.0** | **5.7** | **5.0** | **5.3** | **6.0** | **6.3** | **8.7** | 主线：守 domain / AI 强项，补图解作者的 mark + 文档 |

> **分组均值慎读**：均值为等权、且对维度选取高度敏感（本表偏重图元文法 / IR 架构 / renderer-agnostic / AI 等 retikz 结构强项），故不压成单一总分。retikz 现状低分（交互 6、易用性 5、大数据 4）多为阶段性 / 取舍性；高分（图元 6.6、renderer-agnostic 8、schema 契约 9、动画 7、可序列化 IR 9）是结构性优势，源于 IR 居中 + Scene 中立 + 零依赖 + schema 即契约的架构。看分组趋势比看总分可靠，结构优势 ≠ 整体成熟度（生态 / 交互行为库 / 大数据仍明显落后成熟库）。

## 结论：结构优势 / gap / 取舍

**结构性差异化（高分从哪来）**

- **renderer-agnostic IR / Scene**：「画什么」编译成后端无关 IR / Scene（最大公约子集，禁 SVG-only / Canvas-only），SVG / Canvas / Node 位图只是可插拔后端——最硬的结构优势，新增后端 / SSR / 跨端不动上层语义。
- **可序列化语义 IR**：100% JSON、zod 单一真源、禁函数 / ref / class，且带语义层（id 引用、path target、anchor 求交、scope 级联）——比 Excalidraw / react-flow 的扁平 JSON 多一层 diagram 语义，近 Vega spec 但面向通用图解。
- **schema 即 LLM 契约**：每 zod 字段强制 `.describe` → 直进 LLM tool definition（core-design §7）；配 JSON Patch 增量编辑 + zod 校验自纠，构成「生成-校验-修复」闭环地基。
- **类型安全为红线**：类型由 `z.infer` 单源派生、IR 禁 `z.any()` / `as any`、判别 union 用 `as const` 枚举。
- **Kernel / Sugar / Tier 2 分层 + 零依赖**：core 运行时依赖仅 `zod`（CI 守门零 React / DOM），重依赖（d3-scale / dagre）经 `lowerComposites` 下沉、不进 core，类比 PGFPlots 之于 TikZ。
- **五类扩展 registry**：shape / arrow / pattern / pathGenerator / composite 运行时依赖注入（含函数、不进 IR，IR 只存字符串名）。

**现状 → 目标关键 gap（低分要补什么）**

- **交互行为库（6 → 8）**：水合底座扎实，缺 react-flow / Excalidraw 级高层行为（drag / connect / select / 框选 / 吸附）——差距最大、用户感知最强，应在水合 context 上搭可复用 behavior 层。
- **图元词汇量（6–7 → 8–9）**：文法已对标 TikZ，但内置 shape / arrow / pattern 数量、decorations、`to[]` 完整语法、`calc` 几何仍远少于 TikZ；registry 可摊薄但常用图元需逐个补。
- **文本度量（7 → 8）**：`TextMeasurer` 接口正确但 fallback 是平均字宽估算（不准），SSR 需注入 opentype/fontkit——要把常见字体精确度量做成开箱可用。
- **易用性 / 文档（5 → 7）**：Kernel 原语天生专家级，sugar / plot preset 缓解，beta 文档仍薄。
- **跨框架（6 → 8）**：React + Vanilla 已验证，Vue / Svelte / Solid adapter 未落地。
- **生态成熟度**：IR↔TikZ codec、a11y、更多导出格式、测试覆盖处 beta，非一两个 milestone 可追平。

**取舍与非目标（避免误定位）**

- 不追极限大数据性能（IR 间接层固有开销）；定位「中等图解流畅 + Canvas 后端兜底」。
- 不做命令式底层灵活度赛道；要手画能力走 path generator / shape registry 扩展点，不把 IR 退化成命令式。
- 不锁单框架 / 单后端；宁可交互成熟度暂落后，押跨框架 + 跨后端 + 可序列化。
- **主攻生态位 = TikZ 表达力 ∩ Vega 式可序列化 spec ∩（renderer-agnostic + 类型安全 + AI 原生）**：守住图元文法 / renderer-agnostic / 可序列化 IR / schema 契约 / 类型安全，优先补交互行为库与图元词汇量，放弃大数据性能与单框架交互深耕两条赛道。

## 更新记录

- **v0.1**（2026-06-12）：初版，按 core 0.3.0-beta.1 现状打分；八分类 10 分制对比表 + 逐库画像 + 结构性差异 + gap + 取舍 + 人群体验三视角。
- **压缩**（2026-06-12）：精简为对比表 + 评分口径 + 结论（结构优势 / gap / 非目标）；移除逐库画像与人群体验长文（逐库要点已在表的备注列、评分已在表内）。
