# Notation v0.1 alpha.1 Roadmap

> 状态：Accepted；ADR-01 已通过 Architecture Gate 并由人工确认，进入实现。关联：[Notation v0.1 roadmap](../roadmap.md) · [Diagram Notation 完备设计](../../../../../architecture/diagram-notation-complete.md) · [Standard alpha.3 roadmap](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.3/roadmap.md)

## 目标

建立可发布的 Notation foundation，并把当前由 Standard 暂时拥有的逻辑图式元素迁入正确领域 owner。迁移保持元素名称和输入语义，canonical namespace 从 Standard 改为 Notation；Standard 只保留通用布局与绘图能力。

## ADR

| ADR                                   | 主题                                   | 依赖                                                                   | 状态     |
| ------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------- | -------- |
| [01](./01-notation-package-family.md) | Package family、迁移与公共 composition | Diagram design；Standard alpha.2 / alpha.3；Core layout-aware contract | Accepted |

## 完成标准

- `@retikz/notation`、`@retikz/notation-react`、`@retikz/notation-vanilla` 形成独立 lockstep release group
- 七个既有元素只从 Notation family 导出，Standard 不保留 re-export / alias
- LogicFrame / Callout 只消费 Standard 公共 layout composition，不 deep import 或复制 solver
- Core Sugar、Tier 2 Definition、直接 IR、React 与 Vanilla 保持契约等价
- Standard 与 Notation 的 exports、schema registry、tests 和 package metadata 无双真源
- docs 新建 Diagram / Notation 导航与双语页面，示例 import 全部指向新包
- Standard alpha.3 ADR-01～05 在迁移完成后标记由 Notation ADR supersede；通用直接 Definition 原则 ADR-06 继续 Accepted
- Standard alpha.3 roadmap 保留为已完成历史并注明图式契约已迁移；`@retikz/standard/layout` 继续由 Standard 维护
