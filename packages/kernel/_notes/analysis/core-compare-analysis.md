# core 底座横向对比分析：TikZ/PGF / D3 / Two.js / Mermaid / react-flow / Excalidraw / Vega vs retikz

> 目的：把 `@retikz/core` 所在的 kernel 底座（math / core / render / react / vanilla / tex 六包）放进底层绘图 / IR 基础库的坐标系里，看清底座能力位置与架构能力上限，为 core roadmap 取舍提供参照。
> 范围：只评「底座 / 底层能力」——图元 / 几何 / 锚点 / 路径文法、IR / Scene 架构、renderer-agnostic、跨框架、扩展性、AI 契约、类型与性能；**不评图表层**（chart / scale / guide 归 `@retikz/plot`，见 [`plot-compare-analysis.md`](../../../viz/_notes/analysis/plot-compare-analysis.md)）。
> 评分：公平客观、不迎合 retikz，标杆库在其强项给满分；retikz 现状按 **kernel 0.4.0-beta.2** 已落地能力打分，**目标 = 现有架构（IR 居中 / Scene 渲染中立 / Kernel·Sugar·Tier 2 分层 / core 仅依赖 zod + 零依赖 math）的能力上限**（受架构取舍约束，大数据性能等非目标维度即便做满也不高）。本次只按仓库事实刷新 retikz 两列，未重新评估外部库分数。
> 版本：v0.2 · 日期：2026-07-18 · 关联：[`core-design.md`](../../../../notes/architecture/core-design.md) · [`plot-compare-analysis.md`](../../../viz/_notes/analysis/plot-compare-analysis.md) · `packages/kernel/AGENTS.md`

## 评分口径

**10 分制**（1 最差 → 10 最佳）：**1–2** 缺失 / 很弱　**3–4** 有限　**5–6** 中等　**7–8** 强　**9–10** 领先 / 标杆（10 留给该维度的事实标准）；**—** 不适用。

对比对象：**TikZ/PGF**（图元 / 锚点 / 路径文法范本，retikz 灵感源）/ **D3**（可编程底层 kernel 范本）/ **Two.js**（renderer-agnostic 2D 范本）/ **Mermaid**（diagram-as-code DSL）/ **react-flow**（React 节点-边 + 交互）/ **Excalidraw**（可序列化 scene JSON 范本）/ **Vega**（JSON spec + renderer-agnostic runtime）/ **retikz 现状** / **retikz 目标**。现状只按已落地能力打分，架构预留 / roadmap 只进备注或目标分。

## 对比表

> ⚠️ **备注**：本表仅用于 core 模块**开发阶段的内部评审参照**；评分由 LLM 生成、主观成分较大，**不可作为真实产品选型或对外的产品对比依据**。

| 分类        | 对比项                             | TikZ/PGF |   D3    | Two.js  | Mermaid | react-flow | Excalidraw |  Vega   | retikz 现状 | retikz 目标 | 备注                                                                                                       |
| ----------- | ---------------------------------- | :------: | :-----: | :-----: | :-----: | :--------: | :--------: | :-----: | :---------: | :---------: | ---------------------------------------------------------------------------------------------------------- |
| 图元能力    | 形状 / 节点系统                    |    9     |    4    |    4    |    3    |     4      |     3      |    3    |      8      |      9      | 现状：7 个 shape provider + circle / diamond preset，含 contour 与自定义 registry；补常用 shape 长尾       |
|             | 路径文法                           |    10    |    6    |    3    |    2    |     4      |     2      |    3    |      8      |      9      | 现状：13 种 step、smooth / rounded corners / ribbon / generator / 几何标签；仍缺完整 `to[]` 与 decorations |
|             | 锚点 / 定位系统                    |    10    |    2    |    2    |    2    |     5      |     3      |    2    |      8      |      9      | 现状：命名 / 角度锚点、relative / polar / between、scope 包络与 boundary；仍缺通用 calc / 曲线交点         |
|             | 箭头 / marker                      |    10    |    3    |    2    |    4    |     5      |     4      |    2    |      8      |      9      | 现状：8 个内置箭头、detail 参数、自动 shrink 与统一 registry；长尾样式和更细参数化仍少于 `arrows.meta`     |
|             | 几何 / 坐标系                      |    9     |    7    |    5    |    2    |     4      |     4      |    7    |      8      |      9      | 现状：零依赖 math 覆盖求交、凸包、圆 / 椭圆 / 多边形 / 三角形与 Catmull–Rom；缺曲线求交和更多坐标系        |
|             | **图元能力 · 平均**                | **9.6**  | **4.4** | **3.2** | **2.6** |  **4.4**   |  **3.2**   | **3.4** |   **8.0**   |   **9.0**   | 主线：核心文法与扩展机制已成形，继续用 TikZ 词汇表补图元和几何长尾                                         |
| 架构 / IR   | 可序列化 IR / spec                 |    2     |    1    |    2    |    6    |     7      |     9      |   10    |      9      |      9      | 守：保持禁函数 / ref / class 红线；学 Vega 发布官方 JSON Schema 供外部消费                                 |
|             | renderer-agnostic / 后端可插拔     |    3     |    2    |    9    |    2    |     2      |     2      |    7    |      8      |      9      | 现状：同一 Scene 覆盖 SVG descriptor / string、浏览器 Canvas 与 Node 位图；WebGL / PDF 尚未反证            |
|             | 跨框架 adapter                     |    —     |    6    |    5    |    6    |     1      |     2      |    6    |      7      |      8      | 现状：React + framework-free Vanilla 均完整接入；Vue / Svelte / Solid adapter 尚未落地                     |
|             | 扩展性（registry / Tier 2 / meta） |    8     |    9    |    4    |    3    |     7      |     4      |    6    |      9      |      9      | 现状：9 类 provider / composite 注册面、Tier 2 双向转换、React embeddable 与 Vanilla adapter 已落地        |
|             | **架构 / IR · 平均**               | **4.3**  | **4.5** | **5.0** | **4.3** |  **4.3**   |  **4.3**   | **7.3** |   **8.3**   |   **8.8**   | 主线：可序列化 / 中立 / 扩展契约已较完整，剩余上限主要靠更多独立后端与框架兑现                             |
| 渲染        | 后端多样性                         |    6     |    4    |    7    |    3    |     3      |     4      |    6    |      8      |      8      | 现状：SVG、浏览器 Canvas、Node PNG / JPEG / WebP；若进入 GPU 赛道再评估 WebGL 后端                         |
|             | SSR / 无头渲染                     |    7     |    4    |    3    |    6    |     1      |     3      |    7    |      8      |      8      | 守：保持 `renderToSvgString` 纯字符串路径；补 SSR 字体注入示例文档                                         |
|             | 文本度量                           |    9     |    5    |    4    |    5    |     5      |     5      |    7    |      7      |      8      | 补：把常见字体精确度量（opentype/fontkit）做成开箱可用，缩小与 TikZ 字体引擎精度差                         |
|             | **渲染 · 平均**                    | **7.3**  | **4.3** | **4.7** | **4.7** |  **3.0**   |  **4.0**   | **6.7** |   **7.7**   |   **8.0**   | 主线：多环境输出已落地，剩余短板是 SSR 精确字体度量                                                        |
| 表现增强    | 样式系统（级联 / scope / 继承）    |    9     |    5    |    3    |    5    |     5      |     4      |    6    |      9      |      9      | 现状：scope 四通道默认 / reset、paint / pattern / image、shadow、blend、clip 与 zIndex 已贯通              |
|             | 动画                               |    2     |    8    |    5    |    1    |     4      |     1      |    5    |      8      |      9      | 现状：12 通道、keyframe / easing / trigger、SVG CSS+WAAPI、Canvas rAF、控制与静态截帧；仍缺 morph 等长尾   |
|             | 交互 / 水合                        |    1     |    8    |    3    |    3    |     9      |     9      |    7    |      7      |      8      | 现状：SVG / Canvas 统一事件、水合 context、命中测试与动画控制；仍缺 drag / connect / select 行为层         |
|             | **表现增强 · 平均**                | **4.0**  | **7.0** | **3.7** | **3.0** |  **6.0**   |  **4.7**   | **6.0** |   **8.0**   |   **8.7**   | 主线：静态表现与动画已强，下一步价值集中在 headless 交互行为与动画长尾                                     |
| AI          | LLM 生成友好                       |    6     |    3    |    3    |    8    |     3      |     5      |    9    |      7      |      9      | 现状：语义 IR、严格 schema、plain spec 与诊断已改善生成命中；仍缺 IR↔TikZ codec 和规模化样例 / 评测        |
|             | schema / 契约可喂给 LLM            |    1     |    1    |    1    |    3    |     3      |     4      |    8    |      9      |      9      | 守：保持每字段 `.describe`；沉淀 zod→JSON Schema→tool definition 工具链                                    |
|             | AI 原生 / patch 编辑 / 自纠错      |    1     |    1    |    1    |    3    |     2      |     3      |    5    |      6      |      8      | 补：建「生成-校验-修复」自动闭环 + 评测集，把 zod 错误回喂做成标准循环                                     |
|             | **AI · 平均**                      | **2.7**  | **1.7** | **1.7** | **4.7** |  **2.7**   |  **4.0**   | **7.3** |   **7.3**   |   **8.7**   | 主线：结构化生成入口已增强，patch runtime、codec、评测与自动自纠闭环仍是主要差距                           |
| API / 类型  | 类型安全                           |    —     |    6    |    5    |    4    |     8      |     6      |    5    |      9      |      9      | 现状：严格 Zod 契约、schema 派生类型、判别 union、公开面与动态键边界均已收敛                               |
|             | 易用性 / 上手                      |    4     |    4    |    8    |    9    |     7      |     8      |    4    |      7      |      8      | 现状：React Kernel + Sugar、Vanilla figure / layer / embed、统一 mount API；仍需 preset 与概念文档         |
|             | 框架集成                           |    —     |    6    |    5    |    7    |     7      |     6      |    7    |      7      |      8      | 现状：React / Vanilla 的 SVG、Canvas、SSR、水合与动画语义已对齐；尚缺其他框架 adapter                      |
|             | **API / 类型 · 平均**              | **4.0**  | **5.3** | **6.0** | **6.7** |  **7.3**   |  **6.7**   | **5.3** |   **7.7**   |   **8.3**   | 主线：作者 API 已从专家原语扩到 plain spec，下一步是扩框架和降低 preset / 文档门槛                         |
| 性能 / 轻量 | 大数据 / 复杂图渲染                |    3     |    7    |    6    |    3    |     6      |     7      |    5    |      4      |      5      | 取舍：非设计目标，Canvas 后端兜底即可，不追 D3 / WebGL 军备                                                |
|             | 包体积 / 底座轻量                  |    —     |    4    |    7    |    3    |     5      |     3      |    2    |      7      |      7      | 守：core 仅 `zod` + 零依赖 `@retikz/math`，零 React / DOM；重依赖留在可选包或 Tier 2                       |
|             | **性能 / 轻量 · 平均**             | **3.0**  | **5.5** | **6.5** | **3.0** |  **5.5**   |  **5.0**   | **3.5** |   **5.5**   |   **6.0**   | 主线：守轻量分层；大数据仍不追赛道，Vanilla update 目前仍是整图重渲染                                      |
| 人群体验    | 图解作者（技术写作 / 论文配图）    |    9     |    5    |    5    |    7    |     6      |     7      |    4    |      7      |      8      | 现状：shape / path / style / 动画 / TeX 与 React Sugar 已显著扩展；仍需更多 mark 词汇和低门槛文档          |
|             | 库 / domain 包开发者               |    6     |    9    |    5    |    3    |     6      |     4      |    6    |      9      |      9      | 现状：统一 provider contract、composite、Tier 2 双向转换及两套 adapter 已坐实 domain 扩展边界              |
|             | AI agent / LLM                     |    4     |    2    |    2    |    7    |     3      |     5      |    8    |      8      |      9      | 现状：JSON Schema、可序列化 IR、诊断与稳定 identity 已具备；仍缺 codec、patch 执行器和评测闭环             |
|             | **人群体验 · 平均**                | **6.3**  | **5.3** | **4.0** | **5.7** |  **5.0**   |  **5.3**   | **6.0** |   **8.0**   |   **8.7**   | 主线：domain 开发者已达目标档，继续补图解作者词汇与 AI 工具闭环                                            |

> **分组均值慎读**：均值为等权、且对维度选取高度敏感（本表偏重图元文法 / IR 架构 / renderer-agnostic / AI 等 retikz 结构强项），故不压成单一总分。retikz 现状低分主要剩在大数据 4、AI patch 6、跨框架 7 和交互 7，既有阶段性 gap，也有明确取舍；高分（图元 8.0、扩展性 9、样式 9、schema 契约 9、类型安全 9、可序列化 IR 9）来自 IR 居中 + Scene 中立 + 轻量分层 + schema 即契约的结构。看分组趋势比看总分可靠，结构优势 ≠ 整体成熟度（生态 / 交互行为库 / 局部更新 / 大数据仍明显落后成熟库）。

## 结论：结构优势 / gap / 取舍

**结构性差异化（高分从哪来）**

- **renderer-agnostic IR / Scene**：「画什么」编译成后端无关 IR / Scene（最大公约子集，禁 SVG-only / Canvas-only），同一 Scene 已贯通 SVG descriptor / string、浏览器 Canvas 和 Node 位图；新增后端 / SSR / 跨端不动上层语义。
- **可序列化语义 IR**：100% JSON、严格 Zod schema、禁函数 / ref / class，且带语义层（id 引用、path target、anchor 求交、scope 级联）——比 Excalidraw / react-flow 的扁平 JSON 多一层 diagram 语义，近 Vega spec 但面向通用图解。
- **schema 即 LLM 契约**：字段 `.describe`、严格对象和 `z.toJSONSchema(SceneSchema)` 出口已由测试锁定；配稳定 identity、编译诊断和未来 patch runtime，可继续搭「生成-校验-修复」闭环，但当前还没有完整执行器。
- **类型安全为红线**：公开 IR 类型以 schema 派生为主，递归边界保持窄且有 schema / round-trip 测试；IR 禁 `z.any()` / `as any`，判别 union 用 `as const` 枚举。
- **Kernel / Sugar / Tier 2 分层 + 轻量底座**：core 运行时只依赖 `zod` 与零依赖 `@retikz/math`（零 React / DOM），TeX 等重能力留在可选包，domain 逻辑经 composite lowering 下沉、不进 core，类比 PGFPlots 之于 TikZ。
- **九类扩展 registry**：shape / boundary / clip / arrow / pattern / pathGenerator / pathKind / ribbonWidthProfile / composite 统一走 Definition、provider resolver 与 compile 消费链；React embeddable、Vanilla adapter 和 `lowerIRToKernel` 补齐 Tier 2 双向边界。
- **跨后端动画与水合**：12 个声明式动画通道、trigger / easing / 控制 / 静态截帧已覆盖 SVG 与 Canvas；统一 hydration context 和 Canvas hit-test 使两端事件语义对齐。

**现状 → 目标关键 gap（低分要补什么）**

- **交互行为库（7 → 8）**：SVG / Canvas 水合、命中和动画控制已贯通，缺 react-flow / Excalidraw 级高层行为（drag / connect / select / 框选 / 吸附）——下一步应在 hydration context 上搭 headless behavior 层。
- **图元词汇量（8 → 9）**：13 种 path step、shape / arrow registry、smooth / rounded / ribbon 已落地，但内置 shape / arrow / pattern 数量、decorations、完整 `to[]`、通用 `calc` 与曲线求交仍远少于 TikZ。
- **文本度量（7 → 8）**：`TextMeasurer` 接口正确但 fallback 是平均字宽估算（不准），SSR 需注入 opentype/fontkit——要把常见字体精确度量做成开箱可用。
- **AI patch / 自纠（6 → 8）**：Vanilla 已有 figure / layer / embed identity 与失效元数据，但 `update()` 仍整图重渲染、不承诺局部 patch；还需 patch 执行器、错误回喂和评测闭环。
- **易用性 / 文档（7 → 8）**：React Sugar 与 Vanilla plain spec 已降低门槛，Kernel 原语仍偏专家级，常用 preset 和概念文档仍可加强。
- **跨框架（7 → 8）**：React + Vanilla 已完整验证，Vue / Svelte / Solid adapter 未落地。
- **生态成熟度**：IR↔TikZ codec、a11y、更多导出格式与样例语料仍处 beta，非一两个 milestone 可追平。

**取舍与非目标（避免误定位）**

- 不追极限大数据性能（IR 间接层和当前整图更新固有开销）；定位「中等图解流畅 + Canvas 后端兜底」。
- 不做命令式底层灵活度赛道；要手画能力走 path generator / shape registry 扩展点，不把 IR 退化成命令式。
- 不锁单框架 / 单后端；宁可交互成熟度暂落后，押跨框架 + 跨后端 + 可序列化。
- **主攻生态位 = TikZ 表达力 ∩ Vega 式可序列化 spec ∩（renderer-agnostic + 类型安全 + AI 原生）**：守住图元文法 / renderer-agnostic / 可序列化 IR / schema 契约 / 类型安全，优先补 headless 交互、局部 patch / 自纠闭环与图元长尾，放弃极限大数据性能与单框架编辑器深耕两条赛道。

## 更新记录

- **v0.1**（2026-06-12）：初版，按 core 0.3.0-beta.1 现状打分；八分类 10 分制对比表 + 逐库画像 + 结构性差异 + gap + 取舍 + 人群体验三视角。
- **压缩**（2026-06-12）：精简为对比表 + 评分口径 + 结论（结构优势 / gap / 非目标）；移除逐库画像与人群体验长文（逐库要点已在表的备注列、评分已在表内）。
- **v0.2**（2026-07-18）：按 kernel 0.4.0-beta.2 现有代码刷新 retikz 现状 / 目标分；纳入 math、扩展 provider、路径与样式、Node 位图、跨后端动画 / 水合、Vanilla plain spec 与 Tier 2 双向能力，外部库分数未重评。
