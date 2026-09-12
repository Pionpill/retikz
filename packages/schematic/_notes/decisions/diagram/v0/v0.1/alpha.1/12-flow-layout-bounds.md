# ADR-12：Flow 布局边界贡献控制

- 状态：Proposed
- 决策日期：2026-09-12
- 关联：[所属 roadmap](../roadmap.md) · [Layout 与 containment](./07-flow-catalog-source-layout-groups.md) · [布局扩展契约](./04-flow-layout-definition-registry.md) · [结果与 artifact](./05-flow-orchestration-result-artifact.md) · [Grid](./10-flow-grid-layout.md) · [能力完备性](../../../../../architecture/schematic-graph-complete.md)

## 背景与目标

Flow 的一个主体可以关联独立的附属节点或子布局。附属内容需要正常排列、绘制和连接，但不一定应改变主体在外层布局中的占位与对齐。例如输出格式在 Canvas 右侧上下排列，外层输出列仍以 Canvas 为中心；持久化说明位于编译链下方，外层仍以编译链为中心。

布局参与属于容器与直接子项的关系，不是 Entity 的全局身份。目标是允许同一子树在局部正常排列，仅在指定 Layout 向父级报告边界时排除其贡献。

## 决策

Flow Layout 增加 `excludeFromBounds`，适用于 `linear` 和 `grid`。它只选择当前 Layout 不纳入对外布局边界的直接子项，不删除包含关系、不改变 Entity / Group identity，不将附属内容转成文本 label。

区分两个几何概念：

| 边界         | 语义                                                                 |
| ------------ | -------------------------------------------------------------------- |
| 布局边界     | 当前 Layout 向父级报告的占位与对齐基准，可不包含被排除项             |
| 完整内容范围 | 全部实际内容与关系的绘制范围，用于完整图示装配与输出，不因排除而缩小 |

配置属于 Diagram 的 Flow Source。固定排列继续复用 Layout 公开 Flex / Grid 能力；Graph 与 renderer 不增加排除语义，React 通过 Vanilla 暴露同一契约。

## 基础数据结构与公开契约

`IRFlowLayout` 的两个 kind 都增加可选字段：

```ts
excludeFromBounds?: Array<string>;
```

缺省与空数组均表示全部参与。每个值必须是当前 `children` 中唯一的直接子项 id；可以引用 Entity、Group 或 Layout，不支持后代路径、选择器或全局排除标记。该字段不从父级、Theme 或 defaults 继承。既有 catalog 与 `children` 仍是声明和包含关系的唯一事实源。

Direct JSON、Vanilla Input 与 React `FlowLayout` 对该字段具有等价表达。排除一个子 Layout 不会改写该子 Layout 自己的配置，其内部子项仍按自身规则参与排列。

布局 Definition 收到的有效 placement 携带同一排除配置；共享 `placeLayout` 返回的 `bounds` 表示对外布局边界，`elements` 仍包含全部直接子项，并保留真实尺寸、顺序和相对位置。子项可以位于该边界之外，局部坐标允许为负；容器的局部布局边界统一以 `(0, 0)` 为原点。

内置和自定义 Definition 必须消费同一 `placeLayout` 结果，按布局边界安排父级，再将容器位移应用于全部子项。此规则属于支持相应 `placementKinds` 时的共同义务，不增加可静默忽略该语义的能力开关或旁路 registry。违规输出沿现有 provider 结果诊断路径失败。

Flow 输出与 artifact 中 Layout 的 `bounds` 表示布局边界，不能被当作完整后代绘制范围或裁切区域。完整内容范围从全部实际输出派生，不在 Source 中保存第二份尺寸、位置或缓存投影。

## 行为、失败语义与兼容性

### 局部排列与向上贡献

全部子项先按当前 Linear / Grid 规则排列；排除不取消局部 gap、margin、Grid 轨道或关系标签空间预留。非空排除配置下，对外边界取未排除直接子项的布局边界及其作者 margin 的包络，保留这些子项之间已有的空间。布局边界的原点变化只造成整棵子树的统一平移，不改变内部相对位置。

未配置或配置为空时，继续使用原有完整排列边界，包括原有 margin、空轨道与空间预留行为，不重新收紧边界。

排除不是 absolute 定位。例如被排除项处在两个主体之间时，仍会影响当前容器内部二者的距离；Grid 中仍可影响共享轨道尺寸。需要隔离附属内容对外层的影响时，应将主体和附属内容组成独立 Layout，由该 Layout 排除附属子项。

嵌套 Layout 向上递归使用各自的布局边界。可见 Group 是完整包含边界：其外框、端点和父级占位仍覆盖全部后代内容及原有内边距，内部 Layout 的排除不会穿透 Group 隐藏实际内容范围。Group 内部既有相对位置保持不变；Group 必要的整体尺寸扩张不视为违反 Layout 局部排除。

### 关系与完整输出

被排除项仍可作为 Relation endpoint，既有方向、路由和标签语义不变。排除不是从关系拓扑删除节点，也不承诺附属关系在自动布局 scope 中完全没有影响。

根图示的完整装配、自动画布范围与导出继续包含全部实际内容和连线。完整输出的统一平移或视口缩放可以变化，但不得反向改变已完成的 Flow 内部对齐。用户显式裁切保持原有裁切语义。

排除不承诺自动避障或与相邻内容不重叠，也不让可见 Group 缩小到无法包住其内容。

### 失败与默认行为

- 重复排除 id、不是当前直接子项的 id，以及排除非空 Layout 的全部子项均失败，不静默过滤或退回完整边界。
- 空容器是否合法继续遵循原有 Layout 契约，不通过此字段引入新的空容器能力。
- 输入诊断指向所属 Layout 与具体字段；provider 丢项、改变子项尺寸或破坏共享 placement 结果仍按现有结果契约失败。
- 现有未配置该字段的 Source 保持原行为。扩展后的 provider 共同契约直接作为当前 alpha 的正式契约，不维护旧语义 fallback、别名或双轨执行。
