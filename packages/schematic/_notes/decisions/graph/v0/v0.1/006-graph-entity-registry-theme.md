---
description: 建立 Graph 语义注册与主题样式；背景：Entity 与 Relation 需要开放的语义词汇、可替换的结构 Definition，以及随 Core Theme 变化的领域外观默认
keywords: 'Graph、color、currentColor、graphTheme、variant'
---

# ADR-006：建立 Graph 语义注册与主题样式

- 状态：Accepted
- 决策日期：2026-08-16
- 修订日期：2026-09-09
- 关联：[Entity contract](./007-entity-data-geometry.md) · [Relation contract](./008-relation-data-geometry.md) · [Graph context](./009-composable-graph-context.md)
- 替代：[GraphNode Variant ADR](./002-graph-node-variants.md)

> Theme 修订：本文的旧作者输入、生成片段和 Theme 切层语义由 [Graph Defaults、Rules 与 Theme 来源](./017-theme-source-fragments.md) 取代；其余能力与结构边界继续成立。

## 背景与目标

Entity 与 Relation 需要开放的语义词汇、可替换的结构 Definition，以及随 Core Theme 变化的领域外观默认。Graph 因此拥有 role、kind、predicate、direction 等领域语义和按这些 Canonical 语义匹配的 Theme rules；Core、Scene 与 renderer 不解释 Graph 词汇

早期 Variant 只间接选择视觉样式，与 Graph Theme 和元素显式 appearance 形成重复入口。本决策删除整条 Variant 轴：可复用语义进入 role、kind 或 predicate，批量视觉默认进入 Theme，单个实例的精确呈现进入 Core-compatible appearance

## 决策

### 语义 Definition 与 registry

Entity 与 Relation 分别拥有 role、kind、predicate Definition、registry 和 resolver。key 是开放的非空字符串；内置值只为 schema、编辑器和 LLM 提供已知词汇提示，不构成白名单。内置与自定义项通过同一 provider assembly、registry 和 resolver 消费

Entity role 拥有 shape、boundary、padding、cornerRadius 与基础 minimum size 等结构默认；kind 和 predicate 只表达稳定语义分类。Relation role、kind 与 predicate 按 ADR-008 拥有 direction、marker 和规范 dash 等结构语义

Graph 不提供 Variant Definition、registry、options 或 selector。Entity kind 以 `(role, kind)` 为身份，因此相同词面 kind 可以分别注册给不同 role；重复的同一身份、不同对象争用同一其余 Definition key、自定义项覆盖内置 key，以及缺失已引用 Definition 均 fail-loud；同一 Definition 对象的重复贡献可以按 provider assembly 规则去重

### Graph Theme style

Graph Theme style 与当前 Core Theme style 同名协作。Definition 按 [ADR-017](./017-theme-source-fragments.md) 返回 `{ defaults?, rules? }`，defaults 与作者 graphDefaults 同形；空片段不产生覆盖。Neutral 与命名规则随后进入同一有序解析链。

Neutral Entity baseline 使用当前 mode 的静态前景色作为 `color` 主色，以 `stroke: 1` 绘制完整主色描边，以 `fill: 0.08` 表达同色 contextual color 权重，由 Core 在对应 mode backdrop 上物化为不透明浅色；正文使用 `textColor: 'contrast'`，在最终填充确定后解析为黑色或白色。该 baseline 形成“主色描边、同色轻填充、对比文字”的低装饰默认，Entity 显式静态 `color` 会同步驱动描边与填充，显式 appearance 仍可分别覆盖任一通道

数值描边与填充必须从可静态解析的最终 Entity 主色确定。若显式 `color` 是 `currentColor` 等非静态 CSS 主色，Core 不猜测宿主颜色并 fail-loud；调用方必须改用静态 `color`，或以显式字符串描边和可静态解析的不透明填充同时覆盖两个 contextual 通道

省略 Core `theme.style` 时使用 Neutral baseline。显式 style 必须存在同名 Graph Theme Definition，否则 fail-loud。发布包只内置 Neutral；其它 reference style 由调用方通过同一公开 Definition 注入。宿主 Graph style 可以返回空稀疏覆盖并完整继承 Neutral；宿主可按需要注入命名风格，Graph 不承诺 Docs 的风格目录

### Selector 与级联

Entity selector 可以匹配 `role`、`kind`、`predicate` 与 `status`；Relation selector 还可以匹配有效 `direction`。单值或非空无重复列表表示允许值，同一 selector 的多个字段按 AND 匹配；省略 selector 匹配对应类型的全部元素

Theme selector 不接受 Variant、id、颜色或其它纯视觉 key。按单个 identity 设置外观时直接写入 Entity / Relation；非语义的批量变化由上层组合显式生成字段

完整级联由 [ADR-017](./017-theme-source-fragments.md) 定义：Neutral 与同名 Definition、主题规则、逐层作者 graphDefaults / graphRules、显式实例。自身 Theme 改变生成来源但不清除祖先作者层，未知 composite 内部保持不透明。

### Source 与运行时边界

`graphDefaults` 保存稀疏正式默认片段，`graphRules` 保存独立的 JSON-safe 有序规则。Definition、registry、callback、完整 token resolution 与运行时上下文不进入 Source IR。Direct IR、React 与 Vanilla 使用同一 definitions 和 resolve / lowering 真源；adapter 不维护私有 Theme、registry 或默认值

React 可以通过 `GraphThemeProvider` 组合 definitions；React / Vanilla authoring 中只有 Graph 入口声明 Graph definitions，并由同次 provider assembly 中的 Entity / Relation / Group / Block 等元素共享。它们仍可脱离 Graph 独立使用内置 definitions，但不能各自注入自定义 definitions。跨静态 InputEmbed 边界或 Vanilla authoring 必须通过 Graph 显式传递 definitions，不依赖 ambient 或全局可变 registry；直接 IR 编译仍可通过公开 Definition / provider 工厂显式提供 definitions

## 行为、失败语义与兼容性

- strict Source schema 拒绝 `variant`、`entityVariant` 和 selector `variant`
- 未注册 role、kind、predicate、Theme style 或 selector key 由 owner resolver fail-loud
- Theme callback 抛错或返回非法稀疏结构时报告 Definition callback 失败；空 defaults 片段合法
- Neutral Entity 默认填充保持不透明输出，以便 `contrast` 在未知宿主表面中仍可确定解析；它不把低透明度背景作为新的隐式 backdrop 契约
- Neutral Entity 的数值描边或填充遇到不可静态解析的最终主色时报告 Core contextual color 错误，不回退为 `currentColor`，也不静默猜测宿主颜色
- Neutral 的 `disabled` status 使用 `semantic.guide` 与 `[6, 4]` 描边虚线；Relation 只虚线化箭身，marker 保持该状态颜色和既有 shape
- Theme 只改变获准的 style/layout 默认，以及 Relation 的受限箭身 `dashPattern`；不改变语义、identity、显式 position、route 或 marker family
- 旧 Variant schema、常量、Definition、registry、options 与导出直接删除，不保留 alias 或 fallback

## 结果

Graph 语义扩展统一经过 Definition / registry，视觉默认统一经过 Graph Theme，实例覆盖统一复用 Core-compatible appearance。最终 lowering 仍只产生普通 Core Node、Path 与 Scope
