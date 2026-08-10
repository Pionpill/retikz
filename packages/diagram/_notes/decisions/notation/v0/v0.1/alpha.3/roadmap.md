# Notation v0.1 alpha.3 Roadmap

> 状态：Accepted；已完成。关联：[Notation v0.1 roadmap](../roadmap.md) · [Diagram Notation 完备设计](../../../../../architecture/diagram-notation-complete.md) · [alpha.2 roadmap](../alpha.2/roadmap.md)

## 目标

收紧首批 Notation 公共能力，只保留已经有明确图式职责与可验证使用路径的元素。撤回缺少真实场景支撑的 Callout，不以既有实现、视觉名称或未来可能性代替语义设计，也不保留无消费者的布局与 adapter 契约。

## ADR

| ADR                          | 主题                            | 依赖                                       | 状态     |
| ---------------------------- | ------------------------------- | ------------------------------------------ | -------- |
| [01](./01-remove-callout.md) | 撤回 Callout 公共契约与完整闭环 | Diagram design；Notation alpha.1 / alpha.2 | Accepted |

## 完成标准

- Notation 的公开元素集合、semantic IR、Definition 与 authoring 入口不再包含 Callout
- 直接 JSON、TypeScript、React、Vanilla、tests 与双语 docs 不再声明或注册 Callout
- Callout 专属的 target、placement、leader、artifact 与 layout-aware contract 完整移除，不保留不可达实现
- LogicFrame、Terminal、Stage、Decision、Junction 与 Connector 的现有契约和下沉路径保持不变
- 当前架构、completeness、包职责与 roadmap 对首批元素集合的描述一致

## 边界

- 不设计新的标注、注释、note、label 或 leader 语义
- 不把 Callout 改写为 Core Node、Node label、Connector、Graph annotation 或 docs recipe
- 不移除 Core Node 的相对定位、Path target 或其它底层通用绘图能力
- 不重写已被 supersede 的 Standard 历史 milestone
- 不保留 Callout alias、deprecated export、migration、fallback 或隐藏 adapter 入口
