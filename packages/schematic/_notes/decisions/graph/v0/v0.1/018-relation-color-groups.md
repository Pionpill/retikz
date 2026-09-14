# ADR-018：Entity / Relation 自动颜色分组

- 状态：Proposed
- 决策日期：2026-09-09
- 主责：Graph，目标版本 0.1.0-alpha.2
- 关联：[alpha.2 roadmap](./roadmap.md) · [Graph Defaults、Rules 与 Theme 来源](./017-theme-source-fragments.md) · [Schematic Graph 完备设计](../../../../architecture/schematic-graph-complete.md)

## 背景与目标

一张 Graph 或 Flow 可以同时表达多条彼此独立的关系链。所有 Relation 都使用中性默认色时，读者难以将同一链路的箭头作为整体识别；为每条 Relation 手写颜色又会把语义分组和具体色值重复写入 Source。

本决策为 Entity 与 Relation 增加可选 `group` 字段。Graph 在自身根范围内把相同 group 投影为相同的分类色，供 Flow 以同一公开 Graph 契约使用。该能力只解决视觉链路的低成本区分，不把 group 扩展为选择器、目录、状态或新的主题系统。

## 决策

### 公开输入与作用域

`Entity` 与 `Relation` 都增加可选的 JSON-safe 字段：

```json
{
  "type": "relation",
  "source": "local-point",
  "target": "rotated-point",
  "group": "local-to-world"
}
```

`group` 是作者提供的任意字符串标识，仅在一个 Graph 根及其公开可见内容树内建立视觉颜色映射。相同字符串代表同一视觉分组；不同字符串不要求具备业务语义。Group、Block 等容器不建立独立的重新编号范围，嵌套可见 Entity / Relation 与根级元素共享该 Graph 根的映射。

Flow 将该字段作为 Graph Entity / Relation 的直接投影。Flow 不重新定义分组、色板或分配逻辑；Graph 以其公开能力为唯一 owner。为使分配稳定，Flow 先按重建后的可见元素树收集 Entity，再按根 `relations` 的作者顺序加入 Relation。独立使用、且没有 Graph 成员集合的 Relation 不自动取组色。

### 分配与颜色来源

Graph 按 Entity / Relation 在作者可见内容树中的首次出现顺序为每个 group 建立稳定槽位。第一个 group 使用 `theme.colors.categorical` 的第一个颜色，第二个使用第二个；达到数组末尾后从开头循环：

```text
color(groupIndex) = categorical[groupIndex mod categorical.length]
```

同一 group 始终复用其第一次分配的颜色。没有 `group` 的 Relation 保持现有中性默认色，且不会占用分类色槽位。分配只使用 Core 已公开的 `theme.colors.categorical`，不引入第二份色板、Graph 色板配置或 theme registry。

自动颜色作为 Entity / Relation 的最低优先级视觉 fallback；Entity 投影 `style.color`，Relation 同时投影箭身与未由更高优先级来源确定颜色的 marker 外观。Graph Rules、实例显式 `style` 与显式 marker 外观保持优先；这些作者覆盖可以使同组元素呈现不同颜色或 marker，但不改变该 group 的已分配槽位。自动组色不创建原本不存在的 marker，不改变 marker family、shape、size、route、dash recipe、标签、布局或拓扑。

### 数据流与边界

Entity / Relation `group` 在 Graph Source 中保存并由 Graph 根级解析在同一可见成员集合内消费。Graph 在向 Core Node / Path 降低前去除该 Graph-only 字段；Core、Layout、Renderer 与 Scene 不识别 group。Graph 的解析结果已确定后，测量、路由与最终绘制消费同一投影后的外观，避免 Flow 的 materialization 与最终图形不一致。

本决策不允许 graphRules 以 group 匹配，不为 group 建立 kind、status、selector、registry、默认值入口或持久化颜色缓存。

## 行为、失败语义与兼容性

`group` 缺省时保持既有 Relation 的颜色和渲染结果。空字符串与其它字符串一样是作者显式分组标识；仅字段省略表示未分组。`theme.colors.categorical` 是既有非空主题契约，因此颜色轮转不新增空色板或取色失败分支。

Entity 与 Relation schema 在每个已支持的持久化入口保留 `group?: string`；未知字段、非字符串 group 与现有 Entity / Relation 的其它非法输入仍按当前 schema 和 Graph 诊断拒绝。Direct IR、Vanilla、React 与 Flow 使用同一个字段及同一 Graph 投影，renderer 不增加专属行为。

这是向后兼容的可选字段扩展。此前手写 Relation 颜色、Graph Rules 和 marker 外观继续具有更高优先级；不新增旧名、别名或兼容分支。

## 最终契约

Graph 以 `Entity.group?: string` 与 `Relation.group?: string` 表达视觉链路分组，并在 Graph 根范围内按首次出现顺序从既有分类色板正序、循环分配自动 fallback 色。Flow 直接消费该契约；显式作者外观保持优先，未分组元素与其它 Graph / Core 能力保持现状。
