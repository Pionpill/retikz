---
description: 完整 Diagram 的固定 Presentation 槽位、显式 Legend 与统一 Scene 输出
keywords: 'Diagram、Assembly、Presentation、IRTextBlock、IRLegend、legend'
---

# ADR-001：Diagram Assembly 与 Presentation

- 状态：Accepted
- 决策日期：2026-08-29
- 修订日期：2026-09-14
- 关联：[Diagram v0.1 roadmap](./roadmap.md) · [Frame](./002-diagram-frame-spacing-appearance.md) · [文本区域与 Defaults](./008-theme-source-fragments.md)

## 背景与目标

Graph 表达关系语义与可独立绘制的内容，但不拥有完整图示的外围说明或自动布局。title、description、drawing core 与 legend 必须进入同一个可编译、测量、检查和导出的输出，避免宿主在 Scene 外补画内容。

Diagram 组合 Core 文字、Standard Legend / Surface 与 Layout 排列能力，不建立平行文字、Legend 或 renderer 语义。

## 固定区域装配

完整 Diagram 的逻辑阅读和结构遍历顺序固定为 title、description、drawing core、legend。Source 字段或 JSX 书写顺序不改变槽位；Frame 可以改变 Legend 的物理停靠边，但不改变区域角色。

Presentation 只接受可选且唯一的 title、description、legend；出现时至少声明一个槽位。省略区域不生成子树、占位 bounds 或区域 artifact，间距只存在于实际相邻区域之间。

共享装配只把 drawing core 视为可测量、排列、包装的不透明内容，不读取其内部语义。具体 Source 由 drawing core 决定，不提供接受任意 body 的通用 IRDiagram。

## 文本区域

[ADR-008](./008-theme-source-fragments.md) 替代最初直接以 TextBlock 表示 title / description 的形态。两个槽位现在使用相同区域对象：

```json
{
  "title": {
    "text": "系统架构",
    "style": { "font": { "size": 18 } },
    "layout": { "align": "start" }
  }
}
```

text 必需且完整复用 Core TextBlock，支持单行、多行、逐行样式及 text / math runs；内容合法性沿 Core schema。Diagram 不额外 trim，也不将显式内容折叠为区域省略。style 只接受 textColor/font/opacity，layout 只接受 align/lineHeight/maxTextWidth。

区域不接受任意 Core child 或完整 Node，position、shape、boundary、padding、margin、stroke 与 identity 不能混入文本。Defaults 提供块级表现，TextBlock 内显式行 / run 样式仍沿 Core 继承。

## 显式 Legend

legend 直接接受完整 Standard IRLegend，项目、刻度、sample、label、方向、换行、内部间距、key 和有效空内容均沿 Standard 契约。Diagram 只有一个 Legend 槽位，不增加平行 item 或 Legend 数组。

Diagram 不根据 Entity、Relation、role、kind、predicate、shape、颜色或 Scene 猜测 Legend。只有作者显式声明的 Legend 才进入输出；Theme 默认不能创建它或改变内容和内部排列方向。

## 输出与 identity

存在的区域共同进入同一 Scene，并按 Core / Layout 的 allocation、visual 与 visible contribution 形成完整 bounds。SVG、Canvas 与导出消费相同 Scene，不能出现只属于页面、metadata 或某个 renderer 的区域。

Inspect 与具体 Diagram artifact 区分 presentation.title、presentation.description、drawing core 和 presentation.legend。只有具体 Source 的显式 id 建立最外层 identity；派生文本、Surface 和内部 Layout 不发布额外 identity。Standard Legend 自己的显式 id 与 item / tick key 保持 owner 语义。

所有区域分别下沉到 Core 文本 Node、Layout 与 Standard Surface / Legend。Source 不保存这棵派生树，也不复制 Core 的边界或裁剪机制。

## 三入口与失败语义

Flow 是当前具体消费者，通过三个包的 `/flow` 子路径提供 Direct IR、Vanilla 与 React。包根不提供临时通用 Diagram composite，共享装配仍是具体 drawing core 的内部依赖。

Direct IR 是持久化真源，Vanilla 组装 typed Input，React 调度同一 Source。三入口不能拥有不同的 Presentation、Legend、输出或错误恢复能力。

未知区域字段、空 Presentation 对象和非法 TextBlock / Legend 结构在对应 schema 路径拒绝；下游文字、Legend、布局和编译错误保留 owner 诊断。不存在区域完全折叠，不能由 adapter、Docs 或 renderer 补画。

## 最终契约

Presentation 与 drawing core 形成同一个 renderer-neutral 图示。文本区域采用 ADR-008 的正式内容与格式对象，具体 identity、布局结果和 artifact 由 [Flow 编排](./005-flow-orchestration-result-artifact.md) 定义。
