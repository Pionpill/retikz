---
description: 图形透明度采用 overall/fill/stroke 分组，简单输入与细项配置共享同一语义
keywords: 'opacity、overall、fill、stroke、inheritance'
---

# ADR-051：渐进式透明度配置

- 状态：Accepted
- 决策日期：2026-10-12
- 关联：[原子契约](./019-core-atomic-contracts.md)、[Source 分组](./036-source-ir-semantic-grouping.md)

## 背景与目标

用户通常只需设置整体不透明度，需要精细控制时才关心填充和描边。三个平级属性分散了一个关注点，也使作者容易误解整体值与细项的关系。

SVG 的 [opacity](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/opacity) 与 [fill-opacity](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/fill-opacity) 区分整体合成和填充不透明度。Retikz 保留已有整体与细项相乘的可观察语义，只收拢 authoring 与 Source 契约；不把这次输入改造扩成渲染合成算法变更。

## 决策

图形透明度采用 `opacity: { overall?, fill?, stroke? }`。成员是 0 到 1 的有限数值，0 为透明、1 为不透明。`overall` 与填充、描边因子相乘：不考虑颜色 alpha 及外部合成时，填充不透明度为 `overall * fill`，描边为 `overall * stroke`。

无框架和 React authoring 接受 `opacity: number`，等价于仅指定 `overall`。Core Source 同样接受这一紧凑数值写法，统一由 Core resolve 解释为 overall；它与详细对象共用一套字段和继承语义。省略对象、空对象和省略成员均不清除继承；每个成员独立按现有作用域优先级覆盖，最终无值时视为 1。显式 0 保留。整体值不是 fill/stroke 的默认值。

`style` 与默认通道沿用现有归属，不添加包装层。纯文本 run、渐变 stop、shadow、arrow 等只有单一不透明度语义的契约继续使用其标量值，不为不存在的填充或描边能力增加参数。

Core 拥有图形组合、数值简写语义与继承；Vanilla 负责 authoring 输入归一化；React 复用 Vanilla。上层只复用相应能力，不因分组开放宿主不支持的字段。Scene 与 renderer 的独立透明度标量保持原有消费契约；Source 到 Scene 的投影由 Core 负责。

## 失败与兼容性

Source 接受已定义的数值简写或分组对象，旧图形平级 `fillOpacity` / `strokeOpacity` 入口删除，不保留别名或迁移分支。闭合对象拒绝未知成员及越界值。字段诊断反映新路径。自定义 provider 与内置 provider 消费相同 Source 和已解析外观。
