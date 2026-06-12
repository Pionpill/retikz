---
name: docs-doc-concept
description: retikz 概念页规范：`apps/docs/src/contents/<module>/concepts/**` 叶子页——先讲为什么需要、再给模块内心智模型、图文结合、内部模型按模块语境解释（core 的 IR/Scene 只是一例）、保持当前版本、延伸阅读。适用 core / plot / renderer 等各模块。通用规则见 docs-doc-principle，画法见 docs-figure-draw。retikz 专用。
---

# 概念类文档写法

## 何时用本 skill

- 在 `apps/docs/src/contents/<module>/concepts/**` 下加 / 改**叶子概念页**（如 core 的坐标系 / anchor / 分层；plot 的 scale / encoding / mark；renderer 的 backend / animation……）
- 动手前**必须先读** [`docs-doc-principle`](../docs-doc-principle/SKILL.md) 拿通用规则

本 skill 只覆盖**概念页特有**的页面结构与写法。其它一切（三处协同、双语、写作风格、Comparison、宽度、不引外链等）以 principle 为准；**配图画法**走 [`docs-figure-draw`](../docs-figure-draw/SKILL.md)，本 skill 不重复画法细节。

不归本 skill：

| 页 | 去哪 |
| --- | --- |
| 分组落地页（带 children，如 `concepts/design`、`concepts/basic-concepts`） | [`docs-doc-group`](../docs-doc-group/SKILL.md)——它们是「职责一览表 + LinkedCard 子项」骨架，不是概念叶子页 |
| 入口页（`introduction` / `get-start`） | `docs-doc-principle` 的「入口页例外」节 |
| 配图的 `stroke="none"` / 配色 / y 轴 / 双语拆分等画法 | [`docs-figure-draw`](../docs-figure-draw/SKILL.md) |

## 定位

概念页讲**抽象概念 / 心智模型 / 架构**——读者不是来查 API，是来「搞懂这套模型怎么运作、什么时候该用哪一层」。与其它 section 的边界：

| Section | 服务什么 |
| --- | --- |
| `components/` | 单组件 API 字典 + 该组件的 demo |
| `examples/` | 多组件组合成完整图，按 step 教 |
| `reference/` | schema 字段查询入口 |
| `concepts/`（本 skill） | 模块的抽象概念 / 心智模型 / 架构（core: 坐标系·anchor·分层；plot: scale·encoding；…） |

**不是**什么：

- 不是组件 API 字典（具体 props / 字段用 markdown link 跳 `components/` 或 `reference/`）
- 不是 step 教程（循序渐进搭一张完整图走 `examples/`）
- 不是 final-result 摆图秀（哪怕放成品图，也是为解释模型，不是炫效果）

## 按模块抽象概念

概念页**不绑定 core 的术语**。动笔前先识别**当前模块的核心模型**，再用它组织页面——同一套写法服务所有模块：

| 模块类型 | 概念页重点 | 该模块的内部模型（示例） |
| --- | --- | --- |
| core / 基础绘图 | 图元、坐标、关系、渲染链路 | Node / Path / Anchor、IR / Scene / compile |
| plot / 图表语义 | 数据到视觉的映射 | scale / domain / encoding / mark / axis / lowering |
| renderer / runtime | 输出目标与执行行为 | backend / animation / hydration / measurement |
| 扩展 / composite | 上层抽象如何下沉到底层能力 | lowering / adapter / registry |

本 skill 后文出现的 IR / Scene / Sugar / Kernel / anchor 等都是 **core 语境下的举例**，不是规则本身——换模块时替换成该模块对应的模型词。

## 页面结构：一概念一 H2

写作主线（模块无关）：**先说为什么需要这个概念 → 再给模块内的心智模型 → 用图 / 表 / 小 demo 支撑 → 说清边界·选择·常见误解 → 链到 API / reference / example**。

概念页**没有固定段序**（不像示例页的 6 段）；按概念拆 H2，顺序因主题而异。下面是一份**推荐小节菜单**——按需取用、不强凑：

| 小节类型 | 作用 | 语料里的例子 |
| --- | --- | --- |
| 总览 / 一张图看懂 | 开篇给一张全局图或职责框架表 | `primitive-model` 的「一张图看懂」、`layers` 的 hero 管线图 |
| 子概念分节 | 每个 H2 讲一个子概念 | `coordinate-system` 的 笛卡尔 / 极坐标 / user units / viewBox |
| 选择 / 决策 | 帮读者在变体间选 | 「怎么选择」「选择建议」「什么时候手写 viewBox」 |
| 边界 / 区别 | 和相邻概念划清界限 | `composite`「与 Sugar 的区别」、`primitive-model`「和扩展形状的关系」 |
| 约束 / 陷阱 | 易错点、硬性要求 | `position`「前向引用要求」、`animation`「触发与降级」 |
| 延伸阅读 | LinkedCard 网格收尾 | `layers`「延伸阅读」 |

开头约定：

- `title` / `description` 写 frontmatter，正文**不写 H1**
- 首段 1-2 句点出「这页讲什么概念、解决什么」，再展开
- 深架构 / 底层链路页配一个「首次阅读可以先跳过」的 `<ComponentAlert type="tip">`，让只想先画图的人先去 `get-start` / `components`

结尾约定：

- 收一个 `## 延伸阅读` + `<LinkedCard>` 网格（见下文「跨链接」）

H2 进右侧 TOC；同一概念下的细分点用 H3。

## 每个概念小节怎么写

- **先场景后术语**：先说「你会遇到什么 / 为什么需要它」，再命名该模块的专名（core: IR / Scene / anchor；plot: scale / encoding；renderer: backend / measurement……）
- **图文结合是默认**：凡涉及结构、层次、流程、引用关系的小节，**默认配一张叙述图**——抽象概念几乎都能画，能画就画。纯文字 + 表格只留给确实无结构可画的小节
- **一节一个支撑**：叙述图 / 表格 / 等价代码（按上一条，结构类优先图），不堆纯长段；段落≤3 行（principle 通则）
- **先行为后内部**：先讲这个抽象对用户意味着什么，再展开内部机制

## 叙述性插图

概念页**优先用能解释模型的图**，多数是 `<ComponentPreview hideCode>` 自绘的叙述插图（看懂概念，不是复制源码）。但 `hideCode` 不是死规则，按图的性质定：

| 图的性质 | hideCode | 例 |
| --- | --- | --- |
| 架构 / 模型 / 流程图 | 默认 `true`（隐藏代码） | 分层管线、依赖图、anchor 结构 |
| 用户可直接书写的概念语法 | 可 `false`，让读者看写法 | 坐标 / 定位语法、plot 的 encoding 写法 |
| 结果解释型（可视化模块常见） | demo code 与图并列 | plot 的 scale / mark 效果，代码 + 渲染结果对照 |

**多画图、图文结合**——概念页是 retikz 的活体演示，一个抽象概念配一张图，往往胜过三段文字。判断一页概念文档好不好，先看它有没有把模型「画」出来。配图风格走**学术、简约**（节点默认无描边、克制用色、不堆装饰）——细则见 [`docs-figure-draw`](../docs-figure-draw/SKILL.md)。

哪种概念配哪种图（图型通用，例子是 core 口味，换模块照搬图型即可）：

| 概念 | 图型 |
| --- | --- |
| 分层 / 管线 / 编译 / lowering 流程 | 横向或纵向流水线，箭头表数据流 |
| 包 / 依赖关系 | 依赖图（实线主依赖、虚线次依赖） |
| 单实体结构（core anchor / boundary、plot mark 等） | 单个实体放大 + 锚点 / 通道标注 |
| 引用 / 关系 / 数据→视觉映射 | 靠 id 连线的关系图 / 编码映射图 |

硬约束：

- **图必须和正文绑定**——正文要引用图里的标注（如「箭头上 `anchors` 代表的依赖」），否则图是孤儿
- **流程图善用 edge label**——`<Draw>` 的 `{ label: { text, side, textColor } }` 在箭头中点标注每段处理 / 中间产物
- **画法细节全部交给 [`docs-figure-draw`](../docs-figure-draw/SKILL.md)**：`stroke="none"` 当文字锚点、配色、y 轴朝下、宽度自适应、双语拆分条件、模板代码——本 skill 不重复

## 表格优先

概念页是表格密集型，四类主力表（列名通用，不绑模块）：

| 类型 | 列 | 用途 |
| --- | --- | --- |
| 模型表 | 概念 / 角色 / 影响 | 摆清一套模型里各部分的职责 |
| 决策表 | 场景 / 推荐 / 原因 | 帮读者在变体间选 |
| 映射表 | 用户写法 / 内部模型 / 输出效果 | 把「写什么」对到「内部怎么表示 / 渲染出什么」 |
| 对照表 | 概念 A / 概念 B / 何时用 | 划清相邻概念边界 |

宽度沿用 principle：≤3 列、单元格 ≤12 中文字；过长用 `<br />` 软断或拆段；cell 内 `|` 写 `\|`。

## 内部模型与抽象边界

principle 规定普通用法页**隐藏内部表示**；**概念 / 设计页是例外**——可以解释模块的内部模型，但**不默认展开内部实现**。把握分寸：

- **按模块语境解释内部模型，别强行套 IR / Scene**：core 的内部模型是 IR / Scene / compile；plot 是 scale / domain / lowering；renderer 是 backend / measurement / playback。讲当前模块那套。
- **先结果 / 类比，后内部**：先讲抽象对用户意味着什么，再展开机制
- **抽象 / 糖类概念给等价或展开示例**：声称「高层写法不引入新能力 / X 等价 Y」时，给两段**编译 / 下沉同构**的代码证明它（core 的 `<Draw way>` ↔ `<Path><Step/>` 是一例；plot 的高层 mark ↔ 下沉后的 Tier 1 同理），而不是只下断言
- **深机制点到为止 + 链出**：两趟编译、lowering 管线这类实现细节，讲清「做了什么 / 为什么有先后」即可，铺满实现细节链到 `reference/` 或专页

## 保持与当前版本一致

概念页描述架构面，**最容易随版本漂移过期**——本 skill 把「保鲜」列为硬要求：

- **不钉版本号**：别写「v0.2 的 X」「v0.3 新增 Y」这类历史钉号；**描述当前能力**，不钉阶段
- **`0.x` 不写兼容 / 迁移**：0.x 破坏性变更是常态，不留 v0.1→v0.x 迁移说明
- **改页先按模块当前能力面扫一遍**，把「仅 SVG」「只提供 React」「vX 的……」这类过期定性一并刷新。逐项核：
  - 该模块公开 API / DSL
  - 数据模型或中间表示（IR / schema / domain 等）
  - 渲染 / lowering / runtime 支持面
  - sidebar / URL / i18n 是否同步
  - demo 是否仍代表当前能力
- zh 是真源，刷新双语同步

## 跨链接与延伸阅读

- **正文 inline 链接按需深潜**：查字段 → `reference/`，看用法 → `components/`，看综合图 → `examples/`，相邻概念 → sibling concept。plot 等模块可能跳到 `examples/` 或模块自己的 reference——按该模块实际页型走，不照搬 core 的去向
- **页末固定 `## 延伸阅读` + LinkedCard 网格**：

```mdx
## 延伸阅读

<div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
  <LinkedCard href="/core/reference/schema">
    <span className="font-semibold">结构</span>
    <span className="mt-1 text-center text-sm text-muted-foreground">查 IR 各实体的字段</span>
  </LinkedCard>
  {/* 2-4 张，2 列网格 */}
</div>
```

- 卡片标题取**目标页 frontmatter `title`**；`href` 必须命中 `data/<module>.ts` 注册的 `id`
- `<LinkedCard>` 是全局 MDX 组件，**不用 import**
- 不引第三方外链（principle 通则）；项目仓库内文件用 GitHub 完整 URL 可链

## 阅读时间与读者

- 默认读者**初级前端**：会 React / TS，不熟 TikZ / IR / 几何术语和项目历史
- 深架构 / 底层链路页配「首次阅读可以先跳过」`<ComponentAlert type="tip">`
- 阅读时间沿用 principle（教程类 ≤10 分钟、字典类 ≤15 分钟）；超了拆子概念或分页

## 与其它 doc-skill 的分工

| 任务 | skill |
| --- | --- |
| 通用规则 / 三处协同 / 双语 / 页型分流 | [`docs-doc-principle`](../docs-doc-principle/SKILL.md) |
| 概念页结构与写法（本 skill） | `docs-doc-concept` |
| 叙述性插图画法 | [`docs-figure-draw`](../docs-figure-draw/SKILL.md) |
| 组件 API 页 | [`docs-doc-component`](../docs-doc-component/SKILL.md) |
| 示例 step 页 | [`docs-doc-example`](../docs-doc-example/SKILL.md) |
| 分组落地页 | [`docs-doc-group`](../docs-doc-group/SKILL.md) |
| schema 词典页 | `docs-doc-principle` 的「Reference 词典页」节 |

## 常见错误（概念页特有）

- **概念页当 API 字典写** —— 堆 props / 字段表是 `components/` / `reference/` 的活；概念页讲模型，具体 API 用 link 跳出去
- **小节光有文字、不配图** —— 结构 / 流程 / 关系类概念默认要配叙述图；通篇纯文字 + 表格是概念页的失败信号
- **图是孤儿** —— 插了架构图但正文不引用图里的标注；图必须被正文「指认」
- **配图过度装饰 / 滥用彩色** —— 节点乱描边、整图铺色、加阴影圆角；概念图要学术、简约（细则见 `docs-figure-draw`）
- **配图给了源码（漏 `hideCode`）** —— 概念页配图是「看懂概念」，显源码会被误当成「复制学写」的 demo
- **钉版本号** —— 「v0.2 的 Scope」「v0.3 新增」；描述当前能力，不钉历史阶段
- **陈旧能力面** —— 改概念页没顺手扫「仅 SVG / 只 React / vX 的」类过期定性
- **先术语后场景** —— 开篇就甩 IR / anchor / lowering，没先讲「你为什么需要它」
- **缺等价证明** —— 声称「高层写法不引入新能力 / X 等价 Y」（core 的 Sugar/Kernel 是一例）却不给两段同构代码
- **强行套 core 术语** —— 给 plot / renderer 概念页硬塞 IR / Scene / Sugar；换模块要用该模块的模型词（scale / encoding / backend / lowering……）
- **延伸阅读 / LinkedCard 断链** —— `href` 没命中注册 `id`，或 zh / en 目标 slug 不同没分别核
- **把分组落地页当概念叶子页写** —— 带 children 的（`concepts/design`）走 `docs-doc-group`
- **概念页之间不承接** —— 同组概念页要「接着上一篇讲」，开篇点明接着谁、讲什么；孤立堆叠读者串不起来
- **标题名实不符** —— 标题必须匹配内容，内容漂移就改标题（如「连线方式」扩进相对偏移 / Coordinate 后改成「连线与路由」）
- **demo / 文案与代码行为冲突** —— 声称某行为前先查 `packages/core` 源码核实；冲突时要么修正、要么把「例外」写清楚（如 margin 对参数驱动 shape 无效、compass anchor 走 bbox），不让文档和实现打架
- **同一知识点多处重复** —— 一个点只在归属页讲透，别处链过去（锚点词汇归图元模型，关系页链过去）；能枚举的用表格列全，别过度省略

## 验证

```bash
pnpm --filter @retikz/docs exec tsc --noEmit
pnpm --filter @retikz/docs dev     # 浏览器开页，确认中英、插图、TOC、菜单都对
```

逐项核：

- [ ] 结构 / 流程 / 关系类小节都配了叙述图（不是通篇纯文字 + 表格）
- [ ] hideCode 叙述图渲染正常、节点不重叠、箭头 / 虚线 / edge label 语义对，窄屏能缩放
- [ ] 配图学术简约：节点默认无描边、彩色克制、无多余装饰（灰度打印仍可读）
- [ ] 图里的标注被正文引用到（没有孤儿图）
- [ ] H2 / H3 进 TOC，能跳读
- [ ] 无版本钉号、无陈旧能力面表述
- [ ] demo / 行为描述与 `packages/core` 当前实现一致，冲突处的「例外」已写清
- [ ] 标题名实相符；同组概念页有承接、不孤立
- [ ] **链接自检**（TS / build 挡不住）：inline 站内路径命中注册 `id`；LinkedCard `href` 可达；zh / en 两份**分别**点；CJK / 带符号锚链接用 github-slugger 核 slug
