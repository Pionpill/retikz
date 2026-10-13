---
description: Plot 透明度和标签采用简单值优先、对象细调的统一输入
keywords: 'opacity、overall、label、field、authoring'
---

# ADR-014：Mark 渐进式属性

- 状态：Accepted
- 决策日期：2026-10-12
- 关联：[标签宿主](../v0.1/079-mark-label-surface.md)、[Core 透明度](../../../../../kernel/_notes/decisions/v0/v0.5/051-progressive-visual-properties.md)

## 决策

Plot authoring 的 `opacity: number | string` 分别表示整体不透明度常量和字段。详细形式为 `opacity: { overall?, fill?, stroke? }`，每项独立接受既有字段/常量绑定与比例尺引用。Source 使用同名对象，各项保存明确的字段/常量绑定；lowering 复用 Core 透明度契约，不另造 renderer 语义。被替换的平级不透明度入口删除。

标签以 `label: 'fieldName'` 满足常见字段标签需求，详细对象为 `{ field?, value?, displayFormat?, ...hostOptions }`，field 与 value 互斥，显示格式及宿主选项沿用现有语义。Vanilla 将内容归入 Source 的 `content`，React 复用同一输入。简单和详细形式可构成有序标签数组。

标签宿主仍由 mark 决定：Point / Interval 为节点，Path / Relation 为几何，Reference 按线与区域决定宿主。禁止跨宿主字段，运行时 resolveLabel 继续由 options 旁路注入，既有优先级不变，不进入 JSON。Relation 路由步骤标签保持独立契约。Core 标签字符串仍表示文本，不解释为字段。

替换平铺 labelPosition、labelDistance、labelPin、labelDisplayFormat 和其它 label 样式 props，不保留旧别名。标签布局、默认值、顺序和是否绘制由既有宿主规则决定，不引入自动避让。Scalar opacity 的省略成员不覆盖继承，overall 与 fill/stroke 相乘，不是 fallback。

## 所有权与失败语义

Plot 拥有字段、比例尺、mark 与标签宿主语义；Plot Vanilla 拥有简写归一化；Core 拥有通用图形语义。作者输入仍进入相同的注册、解析、lowering 链，内置和扩展不分轨。Source schema 拒绝未知结构与非法值，错误指向新路径。
