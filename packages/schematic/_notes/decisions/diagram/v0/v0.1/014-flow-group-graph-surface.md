---
description: Flow Group 复用 Graph Group 的呈现与上下文契约，并保留 Flow 自动布局和全局引用边界
keywords: 'Flow、Group、caption、labels、Scope、Schema、graphDefaults'
---

# ADR-014：Flow Group 复用 Graph Group

- 状态：Accepted
- 决策日期：2026-09-29
- 关联：[Source](./003-flow-source-model.md) · [布局定义](./004-flow-layout-definition-registry.md) · [几何交付](./005-flow-orchestration-result-artifact.md) · [平级 catalog](./007-flow-catalog-source-layout-groups.md) · [Defaults](./008-theme-source-fragments.md)

## 背景与目标

Flow Group 已下沉为 Graph Group，但仅开放 caption.title 和部分 Surface 字段，使同一种分组呈现能力存在两份不同的作者契约。Flow 应复用 Graph Group 已公开的文本、标签、外壳和上下文能力，并保证自动布局的测量与最终绘制消费同一份 Graph 输入。

## 公开契约

Flow Group 直接复用 Graph Group 的公开字段、字段名、值域和校验：完整 caption、labels、Surface 字段、graphDefaults、graphRules，以及适用的 Core Scope 字段。caption 支持 title、description、side、direction、itemGap、bodyGap，文本项完整复用 Graph caption 的 Core TextBlock 和格式字段。caption 至少有 title 或 description；隐藏全部说明时省略 caption。

Flow 保留自身必填 id、引用式非空 children、rank、自动 layout 与 routing。Graph namespace/type 由下沉确定，Graph 任意内容 children 由 Flow 包含树和布局结果生成。Flow Group 不接受 transforms、placement、localNamespace：位置和连线路径由同一个 Flow 布局定义确定，element identity 在 Flow 范围内保持可引用；这三个字段会改变这两项结构契约。其它 Graph Group 字段不再通过 Flow 白名单复制。

Direct IR、Vanilla 与 React 表达同一契约；React 的嵌套 children 仍只负责归一化到平级 catalog 和引用式包含树。

## 默认值与上下文

Flow Group 的 caption 默认片段从 Graph caption 派生，包含排列参数以及 title、description 的格式，不包含文本内容。默认值不创建未声明的 title、description 或 labels；Group 没有 caption 时，caption 默认值也不创建说明区。字体和 Surface 复合字段沿用既有替换粒度。

graphDefaults 与 graphRules 继续由 Graph 处理。Group 的上下文只作用于自身 children 中的可见 Graph 后代；Group 自身外壳消费祖先上下文。Flow relations 保持根级声明和根级物化，因此不成为 Group 的后代，也不继承该 Group 的 graphDefaults/graphRules。根 graphRules 仍作用于整棵 Flow 物化树中的 Entity 与根 Relation。

测量前完成整棵 Graph 包含树的作者上下文投影。最终绘制复用相同的 Graph 字段与 definitions；caption 的大小和上下位置参与 Group shell 尺寸，boundary labels 依照 Graph 规则仅扩展视觉包络，不占据布局空间。Scope 字段继续由 Graph/Core 的原生 lowering 消费。

## 失败语义与兼容性

Group 字段的非法值沿用 Graph 字段校验，错误路径保留 Flow groups 下的实际字段路径。Flow 特有结构继续使用现有唯一 owner、无环包含和 endpoint 检查。被排除的三个 Scope 字段在 Flow Source 入口拒绝。

本决策替代 ADR-003、007、008 中 Group 仅支持 caption.title 与窄呈现字段的限制。删除 Flow 专用 caption Source schema 和类型镜像，调用方使用 Graph 的 caption 类型；不保留旧名别名或第二套输入。Graph、Core 的字段语义和能力所有权不变。
