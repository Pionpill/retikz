# plot 横向对比分析：ggplot2 / Vega-Lite / Observable Plot / Highcharts / ECharts / Recharts / AntV G2 / VChart vs retikz

> 目的：把 `@retikz/plot` 放进主流绘图库的坐标系里，看清现状差距与未来定位，为 roadmap 取舍提供参照。
> 范围：聚焦「图表层 / 绘图库」能力，不评 R 生态、不评业务图表美观度。
> 评分：公平客观、不迎合 retikz，标杆库在其强项给满分；retikz 现状按 **v0.1.0-beta.2** 与 `next-viz@b7809fa` 已落地能力打分（独立 `@retikz/data` 数据层；transform / statistics / scale / coordinate / mark / channel 的 definition + registry 扩展闭环；5 个抽象 mark / 12 类内置 transform / 15 类 scale + 21 套配色 / 5 类坐标系；facet / 共享轨道 / 同面板多轴 / theme / guide 布局 / provenance / lineage 均已落地；动画、selection grammar 与 hover / tooltip / zoom 等交互 UI 仍未实现），**目标 = 现有架构（core IR / Scene / Tier 2 分层）的能力上限**（受架构取舍约束，大数据性能等非目标维度即便做满也不高）。
> 版本：v0.6 · 日期：2026-07-15 · 关联：[`plot v0.1 roadmap`](../decisions/plot/v0/v0.1/roadmap.md) · [`plot-design.md`](../architecture/plot-design.md) · [`core-design.md`](../../../../notes/architecture/core-design.md)

## 评分口径

**10 分制**（1 最差 → 10 最佳）：**1–2** 缺失 / 很弱　**3–4** 有限　**5–6** 中等　**7–8** 强　**9–10** 领先 / 标杆；**—** 不适用。

对比对象：**ggplot2**（R，图形语法范本）/ **Vega-Lite**（JSON spec GoG）/ **Observable Plot**（D3 团队 mark-based GoG）/ **Highcharts**（商业图表库）/ **ECharts**（Apache，option 驱动）/ **Recharts**（React 组件式）/ **AntV G2**（阿里 AntV，真·图形语法 JS 实现，建在 AntV G 渲染引擎上）/ **VChart**（字节 VisActor，VGrammar 语法层 + VRender 跨端渲染）/ **retikz 现状** / **retikz 目标**。现状只按已落地能力打分，架构预留 / roadmap 只进备注或目标分。

## 对比表

> ⚠️ **备注**：本表仅用于 `@retikz/plot` **开发阶段的内部评审参照**；评分由 LLM 生成、主观成分较大，**不可作为真实产品选型或对外的产品对比依据**。

| 分类     | 对比项                           | ggplot2 | Vega-Lite | Observable Plot | Highcharts | ECharts | Recharts | AntV G2 | VChart  | retikz 现状 | retikz 目标 | 备注                                                                                                                                                               |
| -------- | -------------------------------- | :-----: | :-------: | :-------------: | :--------: | :-----: | :------: | :-----: | :-----: | :---------: | :---------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 能力     | 图表类型覆盖                     |    7    |     7     |        6        |     9      |    9    |    5     |    8    |    9    |      6      |      7      | 5 个抽象 mark + 统计变换已覆盖柱/线/面/散点/饼环/雷达/热力/关系 ribbon/箱线/密度/回归/参考结构；仍缺 candlestick、geo/map、层级与 graph layout 等专用语义          |
|          | 坐标系种类                       |    7    |     5     |        4        |     5      |    7    |    4     |    8    |    7    |      6      |      7      | cartesian2D/1D + polar2D/1D + ternary2D 共 5 类且 `defineCoordinate` 可扩展；组合 registry 增强多视图，不等于新增 geo / parallel 等坐标类型                        |
|          | 交互                             |    1    |     7     |        4        |     9      |    9    |    5     |    9    |    9    |      3      |      7      | locator 已支持 datum/series、coordinate view、facet、track 消歧，并有 provenance / lineage；仍无 hover/tooltip/brush/zoom/selection state 与事件接线               |
|          | 动画 / 过渡                      |    1    |     3     |        2        |     7      |    9    |    5     |    8    |    9    |      1      |      5      | 补：复用 core 动画 track 做数据更新过渡；VChart 把动画/叙事做成卖点，是高线参照                                                                                    |
|          | 组合 / 分面                      |    9    |     9     |        7        |     3      |    5    |    3     |    9    |    6    |      8      |      9      | 已有 facet grid、shared scaffold tracks、overlay / 同面板多轴、shared / independent / synchronized scale 与 axis/grid resolve；嵌套 arrangement 和自定义组合仍有限 |
|          | **能力 · 平均**                  | **5.0** |  **6.2**  |     **4.6**     |  **6.6**   | **7.8** | **4.4**  | **8.4** | **8.0** |   **4.8**   |   **7.0**   | 组合与统计图形已不再是早期缺口；现阶段能力短板主要是交互、动画和专用图表语义                                                                                       |
| 图形语法 | 真·图形语法                      |   10    |     9     |        8        |     1      |    3    |    3     |    9    |    5    |      8      |      9      | Data→Transform→Encoding→Scale→Coordinate→Mark→Guide→Layer/Lowering 主链已落地，核心原语走 definition / registry 同路扩展；guide/composition 扩展面仍未完全开放     |
|          | 声明式可序列化 spec              |    3    |    10     |        3        |     6      |    6    |    1     |    6    |    6    |      9      |      9      | Plot IR、theme、composition、transform 均保持 JSON-safe；运行时 definition / resolver / label 函数通过 options 注入，不进入 IR                                     |
|          | 可组合性                         |    9    |     7     |        7        |     3      |    5    |    5     |    8    |    5    |      8      |      9      | marks 多层、mark-local data view、facet、tracks、overlay、多轴与 plot label zIndex 已形成统一组合模型；复杂嵌套组合和 authoring 便捷度仍可增强                     |
|          | **图形语法 · 平均**              | **7.3** |  **8.7**  |     **6.0**     |  **3.3**   | **4.7** | **3.0**  | **7.7** | **5.3** |   **8.3**   |   **9.0**   | GoG 主链与组合能力已显著成熟；下一步重点不是补 facet 本身，而是开放 guide/composition 扩展并提升日常 authoring 体验                                                |
| 性能     | 大数据量渲染                     |    3    |     3     |        3        |     7      |   10    |    1     |    6    |    9    |      3      |      5      | 取舍：非赛道，Canvas 后端兜底即可，不追 ECharts / VChart WebGL                                                                                                     |
|          | 包体积 / 底座轻量                |    —    |     3     |        4        |     5      |    5    |    5     |    4    |    4    |      7      |      6      | 守：plot 层按需引 d3 模块，core 仍仅 zod；G2(AntV G)/VChart(VRender) 底座偏重                                                                                      |
|          | **性能 · 平均**                  | **3.0** |  **3.0**  |     **3.5**     |  **6.0**   | **7.5** | **3.0**  | **5.0** | **6.5** |   **5.0**   |   **5.5**   | 主线：守轻量，性能不追赛道                                                                                                                                         |
| API 设计 | 易用性 / 上手曲线                |    7    |     7     |        8        |     7      |    5    |    7     |    5    |    7    |      6      |      7      | React 组件、mark 统计糖、轴绑定、facet/scaffold 组件与 Vanilla builder 已降低手写 IR 成本；仍缺 chart preset 与更强智能默认                                        |
|          | 类型安全                         |    —    |     5     |        5        |     7      |    5    |    7     |    6    |    7    |      9      |      9      | schema `z.infer` 单源，data/plot/adapter 公共类型与 definition 泛型闭环；运行时扩展函数留在 options，IR 不用 `any` 逃逸                                            |
|          | 框架集成                         |    —    |     7     |        6        |     7      |    7    |    4     |    7    |    8    |      7      |      7      | React 支持独立与 Layout 内多 Plot 嵌入，Vanilla 有 plain builder + SSR；仍无 Vue / Svelte adapter                                                                  |
|          | **API 设计 · 平均**              | **7.0** |  **6.3**  |     **6.3**     |  **7.0**   | **5.7** | **6.0**  | **6.0** | **7.3** |   **7.3**   |   **7.7**   | authoring 表面与类型契约已补强，主要门槛转为缺少 preset、范例生态和更多框架 adapter                                                                                |
| 渲染器   | 后端多样性                       |    5    |     5     |        2        |     5      |    7    |    1     |    9    |    8    |      5      |      7      | 校正：后端数量非 retikz 强项——G2(Canvas/SVG/WebGL/Skia) 最全，retikz 现仅 SVG+Canvas；plot 层不自造后端                                                            |
|          | renderer-agnostic / 后端可插拔   |    3    |     5     |        2        |     3      |    5    |    1     |    7    |    7    |      8      |      9      | Plot IR 经统一 lowering 进入 core IR / Scene，React / Vanilla 共用同一边界；自定义运行时 definition 也不进入可序列化 operation                                     |
|          | SSR / 无头渲染                   |    —    |     5     |        4        |     5      |    5    |    4     |    6    |    7    |      7      |      7      | 守：保持 vanilla `renderToSvgString` framework-free SSR 路径                                                                                                       |
|          | **渲染器 · 平均**                | **4.0** |  **5.0**  |     **2.7**     |  **4.3**   | **5.7** | **2.0**  | **7.3** | **7.3** |   **6.7**   |   **7.7**   | 渲染优势仍不在后端数量，而在 Plot IR→core IR→Scene 的可序列化、跨 authoring 解耦边界                                                                               |
| AI       | LLM 生成友好                     |    3    |    10     |        4        |     5      |    5    |    3     |    5    |    6    |      6      |      9      | 补：建图表样例生态 + 真实生成验证，学 Vega-Lite 靠语料坐稳 LLM 出图标准；VChart 有 VMind AI 出图                                                                   |
|          | schema / 契约可喂给 LLM          |    1    |     7     |        3        |     3      |    3    |    1     |    3    |    3    |      9      |      9      | data / plot 的 Zod schema、判别 union 与英文 `.describe` 已覆盖 theme、composition、guide、layout 和 mark-local transform；仍需继续建设 schema→tool 与语料工具链   |
|          | AI 原生 / 自我纠错               |    1    |     5     |        2        |     1      |    1    |    1     |    3    |    5    |      5      |      8      | 补：建评测集 + zod 错误回喂的自动修复闭环；VChart 靠 VMind 部分闭环                                                                                                |
|          | **AI · 平均**                    | **1.7** |  **7.3**  |     **3.0**     |  **3.0**   | **3.0** | **1.7**  | **3.7** | **4.7** |   **6.7**   |   **8.7**   | schema 契约继续增强，但生成语料、评测与自动纠错仍是决定 AI 体验的主要缺口                                                                                          |
| 人群体验 | 新手学习（上手门槛）             |    6    |     6     |        8        |     7      |    5    |    8     |    5    |    7    |      5      |      7      | React/Vanilla authoring、默认 scale/guide/theme 已改善上手体验；缺少 chart preset 与成熟示例仍使 GoG 概念成本偏高                                                  |
|          | 日常出图（高频效率）             |    8    |     7     |        8        |     8      |    7    |    6     |    7    |    8    |      7      |      7      | 12 transform + 15 scale + 5 坐标 + 统计图形、facet、多轴、theme/legend 已覆盖多数常见出图；交互与 preset 仍影响开箱效率                                            |
|          | 深度使用（抽象 / 全面 / 可嵌入） |    9    |     8     |        7        |     6      |    7    |    4     |    8    |    7    |      9      |      9      | definition / registry 覆盖数据统计、transform、scale、coordinate、mark、channel，配合 composition、locator、lineage 与多 Plot 嵌入，深度扩展闭环已形成             |
|          | **人群体验 · 平均**              | **7.7** |  **7.0**  |     **7.7**     |  **7.0**   | **6.3** | **6.0**  | **6.7** | **7.3** |   **7.0**   |   **7.7**   | 深度使用已成为实质强项；新手与日常体验下一步取决于 preset、交互和示例生态                                                                                          |

> **分组均值慎读**：均值为等权、且对维度选取高度敏感（本表偏重图形语法 / 渲染架构 / AI 等 retikz 结构强项），故不压成单一总分。retikz 现状低分仍集中在交互（3）与动画（1）；facet 已落地，不再计作缺失。较高分（renderer-agnostic 8、schema 契约 9、类型安全 9、深度使用 9）是结构性优势，来自 JSON-safe IR、definition / registry 同路扩展和统一 lowering，而非单纯堆功能。能力维度现状从 3.2 升到 4.8，说明统计图形与组合能力已有明显进展，但结构优势仍不等于整体产品成熟度。

## 图形语法分层评分

> 口径：只评 retikz plot 现状，不再横向比较各库；**功能完整度**看内置能力是否足够覆盖常见图表语义，**拓展性**看该层是否有一等 definition / registry / schema contract，以及扩展是否仍能保持 IR 可序列化。分数仍为 10 分制，现状按 v0.1.0-beta.2 的公开入口、schema / contract / provider / pipeline 与现有测试估算。

| 图形语法层级                | 功能完整度 | 拓展性  | 现状判断                                                                                                                                     | 主要缺口 / 下一步                                                                            |
| --------------------------- | :--------: | :-----: | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Data / 数据入口             |     6      |    7    | `@retikz/data` 提供外部命名引用、model / format、字段路径与归一化；root transform 和 mark-local row view 可共享或隔离派生数据                | 单 Plot 仍绑定一个根数据集；跨数据集 join、命名派生 view、异步 / 流式 dataflow 不是一等模型  |
| Transform / 数据变换        |     8      |    9    | 4 类 data transform + 8 类 plot transform，并有 reducer / selector registry；已覆盖 bin、stack、统计汇总、分位带、density、smooth、relate 等 | 仍缺 filter / calculate、window、fold / pivot、join 等成熟 dataflow 常用算子                 |
| Scale / 尺度与配色          |     8      |    9    | 15 类 scale + 21 套配色，已打通 domain / tick 策略、theme palette、channel descriptor 与 legend；`defineScale` 内置自定义同路                | identity 等长尾尺度、更多自动推断与复杂 guide 联动仍可补强                                   |
| Coordinate / 坐标系         |     7      |    9    | 5 类坐标覆盖 cartesian / polar / ternary 主干，`defineCoordinate` 可扩展；同一 Plot 可注册、叠加和组合多个 coordinate view                   | 缺 geo、parallel 等专用坐标；自定义 coordinate 的高级 guide 能力仍受现有 axis contract 约束  |
| Mark / 几何图元             |     8      |    9    | point / path / interval / relation / reference 五个抽象 mark 已覆盖 ribbon、区间带、箱线、密度、回归、扇区拉出、标签与多种曲线               | candlestick、geo shape、层级布局与 graph layout 等专用语义仍需组合或新增能力                 |
| Encoding / Channel          |     8      |    9    | 字段 / 常量、位置与非位置通道、scale descriptor 和 core Scope / Node / Path delivery 已统一到 channel registry；自定义通道与内置同路         | 条件编码、交互状态编码与可复用 encoding 配置仍未形成稳定语法                                 |
| Guide / 轴与图例            |     8      |    5    | axis 已支持 domain/tick source、密度、marker、label 避让、title/grid、箭头与 origin crossing；legend、theme/palette 和 plot labels 已联动    | Guide union 仍只含 axis / legend，缺 `defineGuide`、自定义 legend item/template 与交互 guide |
| Layer / Composition / Facet |     8      |    7    | facet grid、shared tracks、overlay / 多轴、scale/axis/grid resolve、spacing、header、zIndex 和 scope provenance 已形成统一 composition       | 同一 Plot 不能混合 facet 与 tracks，复杂嵌套和自定义 arrangement / layout solver 尚未开放    |
| Selection / Interaction     |     3      |    6    | locator 可按 datum / series / coordinate view / facet / track 定位，provenance 与 runtime-only lineage 能回查 source、transform 和图元       | 仍无 hover、tooltip、brush、zoom、selection state、事件 / hit-test 到状态映射的完整契约      |
| Lowering / IR 边界          |     9      |    9    | data 与 plot 分包后仍经统一 registry 和 lowering 下沉到 core IR；React / Vanilla、locator 与 lineage 复用同一 spec 和投影语义                | 继续补复杂组合的诊断、lineage 文档和自定义 runtime definition 的部署约束                     |
| **均值**                    |  **7.3**   | **7.9** | 现状已从“拓展契约先行”进入“多数 GoG 主层功能与拓展同时可用”，低分集中在交互与 guide/composition 的开放扩展                                   | 短期优先补交互语法与日常 preset，长期守住 operation / definition 二分和可序列化边界          |

结论：从图形语法分层看，retikz 已不再只是“拓展契约先搭起来”：transform / scale / coordinate / mark / channel / lowering 的内置能力与扩展闭环已形成，guide 和 composition 的内置功能也跨过早期阶段。当前真正的低谷是 **interaction 的可观察运行时能力**，其次是 guide / composition 尚未开放与核心原语同等级的 definition 入口；继续沿用 JSON-safe operation + runtime definition 的机制补齐，才能同时守住 Vega-Lite 式 spec 纯度和 G2 式扩展弹性。

### 图形语法分层横向对比

> 口径：单元格为 **功能完整度 / 拓展性**。功能完整度看内置语法与常见图表覆盖，拓展性看用户能否以稳定机制新增语法能力。这里的 Vega 指 **Vega-Lite**，Observable Plot 按 D3 团队的 Plot API 计，VChart 按 VisActor 的 VGrammar + VChart 组合能力计。

| 图形语法层级                |   ggplot2   |  Vega-Lite  | Observable Plot |   AntV G2   |   VChart    | retikz 现状 | 关键判断                                                                                                 |
| --------------------------- | :---------: | :---------: | :-------------: | :---------: | :---------: | :---------: | -------------------------------------------------------------------------------------------------------- |
| Data / 数据入口             |     8/7     |     8/6     |       7/5       |     8/7     |     8/7     |     6/7     | retikz 已有独立 data contract、外部引用和 mark-local view，但仍不是支持多源连接与流式更新的完整 dataflow |
| Transform / Stat            |     9/8     |     8/5     |       7/5       |     8/8     |     8/7     |     8/9     | 12 类 transform + reducer / selector registry 已补齐统计主干；长尾差距转为 window、join、fold 等算子     |
| Scale / 尺度                |     9/8     |     9/6     |       7/5       |     8/8     |     8/7     |     8/9     | 15 类 scale 已打通 domain/tick、theme palette、channel descriptor 与 legend；扩展仍走 `defineScale`      |
| Coordinate / 坐标           |     8/7     |     6/5     |       5/4       |     9/8     |     8/7     |     7/9     | 坐标种类仍少于 G2/VChart，但多 coordinate view 组合与 `defineCoordinate` 提高了实际表达力和扩展上限      |
| Mark / Geom                 |     9/8     |     8/5     |       8/6       |     9/8     |     9/7     |     8/9     | 抽象 mark 数量不多，但 relation ribbon、统计几何、标签、sector pull 和统一自定义 mark 已覆盖更多语义     |
| Encoding / Channel          |     8/7     |     9/6     |       8/5       |     9/8     |     8/7     |     8/9     | channel registry 已统一位置、mark 与 core delivery，并向 legend 提供 descriptor；短板转为条件/交互编码   |
| Guide / Axis / Legend       |     8/6     |     8/5     |       6/4       |     8/7     |     8/7     |     8/5     | 内置 axis/legend/theme/layout 已成熟很多；拓展性仍被闭合 Guide union 和缺少 `defineGuide` 拉低           |
| Layer / Composition / Facet |    10/8     |     9/6     |       7/5       |     9/8     |     7/6     |     8/7     | facet、tracks、overlay、多轴和 resolve 策略已落地；复杂嵌套与自定义 arrangement 仍是下一层差距           |
| Selection / Interaction     |     2/3     |     7/5     |       4/4       |     9/8     |     9/8     |     3/6     | locator / provenance / lineage 已能稳定反查图元，selection grammar 与交互运行时仍缺                      |
| Spec / IR 边界              |     3/4     |    10/5     |       3/4       |     6/8     |     6/7     |     9/9     | data/plot 分包与多 authoring 表面仍共享纯 JSON Plot IR；自定义逻辑通过 runtime definition 注入           |
| **均值**                    | **7.4/6.6** | **8.2/5.4** |   **6.2/4.7**   | **8.3/7.8** | **7.9/7.0** | **7.3/7.9** | retikz 的 GoG 功能已进入可用主干，扩展性保持强项；横向最明显的落后集中在 interaction                     |

## 结论：结构优势 / gap / 取舍

**国内同赛道对手（G2 / VChart）画像**

- **AntV G2（阿里）= 同赛道最强对手**：JS 阵营里唯一与 retikz 同属「真·图形语法」的实现，能力广度（图表类型 8 / 坐标系 8 / facet 9 / 交互 9 / 动画 8 / 生态 9）尤其在交互、动画、专用语义与生态上仍领先 retikz；但 facet / composition 已不再是 retikz 的空白。retikz 的 4 个明确结构差异仍是：**序列化纯度**（G2 spec 掺 encoder/回调）、**schema 即 LLM 契约**、**解耦边界是可序列化 IR 而非运行时 scenegraph**、**底层 kernel IR 可被手写图元复用**。结论：retikz 不与 G2 拼广度/生态，靠这 4 点占差异化身位。
- **VChart（字节 VisActor）= 性能 / 动画 / 跨端见长**：大数据渲染（9）、动画叙事（9）、跨端（多框架 + 小程序 + Harmony）、VMind AI 出图是其强项；图形语法纯度（5.3）弱于 G2，spec 同样掺函数。属于「图表库 + 弱语法」一档，非纯 GoG 对手。
- **渲染维度认知校正**：「Canvas/SVG 可切换」**不是** retikz 独有优势——G2(Canvas/SVG/WebGL/Skia)、VChart、ECharts 后端都更全，retikz 现仅 SVG+Canvas 且缺 WebGL。retikz 渲染上真正可讲的只有一句：**解耦边界是可序列化 IR**（与「序列化 / AI 友好」同源），后端数量反而是短板。

**结构性差异化（高分从哪来）**

- **renderer-agnostic IR / Scene**：「画什么」编译成后端无关、**可序列化**的 IR/Scene，SVG/Canvas（未来更多）只是可插拔后端——对比库大多与某渲染器/运行时 scenegraph 强绑定（Recharts↔SVG、ECharts↔zrender、Highcharts↔自有、G2↔AntV G、VChart↔VRender）。注意：硬优势是**解耦边界可序列化**，不是「后端多」（G2/VChart 后端更多）。
- **schema 即 LLM 契约**：每 zod 字段强制 `.describe` → 直进 LLM tool definition（core-design §7），是 Vega-Lite 之外少有的「为模型生成而设计 IR」的库。
- **类型安全为红线**：`z.infer` 单源派生、IR 禁 `z.any()`/`as any`、判别 union 用 `as const` 枚举。
- **Kernel / Sugar / Tier 2 分层**：plot 经 `lowerComposites` 钩子下沉到 core Kernel，不污染 core 运行时（仅依赖 zod）、不撑爆 LLM 核心 schema，类比 PGFPlots 之于 TikZ。
- **definition / registry + operation / definition 二分**：transform / statistics / scale / coordinate / mark / channel 都允许运行时 definition 扩展，内置与自定义同路解析；operation、theme 与 composition 仍是纯 JSON，扩展不破坏 IR 序列化纯度。
- **data / plot 职责拆分但管线统一**：`@retikz/data` 承担数据模型、format、statistics、transform 与 lineage 基础，`@retikz/plot` 只保留图形语法专属变换和 lowering；分包没有分裂 registry 或数据身份。
- **IR 即真源、authoring 表面可多套**：React 组件、Layout 内多 Plot 嵌入、Vanilla builder / SSR 和手写 spec 最终都产出或消费同一 `IRPlotSpec`；locator / provenance / lineage 也沿同一 lowering 投影反查。

**现状 → 目标关键 gap（低分要补什么）**

- **交互（3 → 7）**：locator / provenance / lineage 已能定位 datum、series、coordinate view、facet 与 track，但还没有 selection grammar、hover / tooltip / brush / zoom、事件命中和交互状态回写；这是差距最大、用户感知最强的一块。
- **图表类型覆盖（6 → 7）**：箱线、密度、回归、relation ribbon 等统计 / 关系语义已经补上；剩余缺口集中在 candlestick、geo/map、层级与 graph layout 等需要新领域能力或专用 preset 的图。
- **guide / composition 扩展闭环**：内置 axis / legend / facet / tracks 已达到可用水平，但 guide 仍是闭合 union、composition arrangement 也没有 definition / registry；复杂嵌套、facet + tracks 混合和自定义 legend / arrangement 是下一层抽象缺口。
- **动画（1 → 5）**：plot 仍没有数据更新过渡或叙事动画语法；即便可复用 core animation track，也需要先定义数据身份、插值与 enter/update/exit 契约。
- **生态成熟度（文档 / a11y / 导出 / 迁移与社区语料）**：当前已进入 beta，但成熟库多年积累的长尾仍非一两个 milestone 可追平。

**取舍与非目标（避免误定位）**

- 不追极限大数据性能（IR 间接层固有开销）；定位「中等数据量流畅 + canvas 后端兜底」。
- 不与 Recharts 拼「纯 React 便捷度」；react 层价值在「React 手感 + 底层可序列化 IR」。
- **主攻生态位 = Vega-Lite ∩（renderer-agnostic + 类型安全 + AI 原生）**：守住 renderer-agnostic / schema 契约 / 类型安全三项结构优势，优先补交互、常用 preset 与 guide/composition 扩展，放弃大数据性能赛道。
- **不与 G2 拼广度/生态**：G2 已证明「真 GoG + 工程实现 + 生态」可以做很全，retikz 追广度追不过、追生态没时间。差异化只押 4 张牌：可序列化纯度、schema 即 LLM 契约、解耦边界为可序列化 IR、底层 kernel IR 可被手写图元复用——这是 G2/VChart/ECharts 都没有的「TikZ 式统一 IR」身位。

## 更新记录

- **v0.1**（2026-06-06）：初版，六分类 10 分制对比表 + 详细说明。
- **v0.2**（2026-06-08）：补入 **Observable Plot** 列与逐库画像；新增 **「人群体验」分类**（新手 / 日常 / 深度三视角）。
- **压缩**（2026-06-12）：精简为对比表 + 评分口径 + 结论（结构优势 / gap / 非目标）；移除逐库画像与人群体验长文（逐库要点已在表的备注列、评分已在表内）。
- **v0.3**（2026-06-20）：补入国内同赛道 **AntV G2**（阿里）与 **VChart**（字节 VisActor）两列，重算分组均值；新增「国内同赛道对手画像」段落，校正渲染维度认知（后端数量非 retikz 强项，硬优势是解耦边界可序列化）；结论补「不与 G2 拼广度/生态」取舍。
- **v0.4**（2026-06-20）：retikz 现状评分基线从 **alpha.4** 重置到 **alpha.12** 实际落地能力。上调：图表类型覆盖 3→4、坐标系种类 4→6、交互 1→2、真·图形语法 6→7、类型安全 7→8、日常出图 3→4、深度使用 5→7（registry 三联全套扩展驱动）；连带分组均值 能力 2.4→3.2、图形语法 6.3→6.7、API 6.0→6.3、人群体验 4.0→5.0。动画 / facet / 大数据 / AI 语料维度无实现进展，保持原分。
- **v0.5**（2026-06-22）：新增「图形语法分层评分」与「图形语法分层横向对比」，按 Data / Transform / Scale / Coordinate / Mark / Channel / Guide / Composition / Interaction / Spec 边界拆分 retikz 现状及 ggplot2 / Vega-Lite / Observable Plot / AntV G2 / VChart 的功能完整度与拓展性，明确“拓展契约先行、功能成熟度仍需补齐”的判断。
- **v0.6**（2026-07-15）：只按 `next-viz@b7809fa` 的 retikz 现有能力更新：基线升至 **v0.1.0-beta.2**，纳入 `@retikz/data` 分包、统计 / mark / channel 扩展、facet / tracks / 多轴 composition、axis / legend / theme / layout、provenance / lineage 与 React / Vanilla authoring；重算 retikz 现状、目标下限和相关均值，其他库评分保持不变。
