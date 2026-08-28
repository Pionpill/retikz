# Graph v0 Roadmap

> 状态：进行中；v0.1 alpha.1 的 ADR-01～10 均已 Accepted，Graph / Group / Entity / Relation 四类 Source composite 已形成闭环；alpha.2 正在设计结构化 Block。关联：[Schematic Graph 完备设计](../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../notes/architecture/schematic-design.md)

## 目标

Graph v0 当前范围是 Schematic 领域的可复用关系与图式 foundation：Entity 与 Relation 表达普通节点和关系，Group 表达任意内容的可见包含，Block 表达具有固定内部层次和局部可寻址区域的结构化图节点；Graph 是可选的 `graphTheme` 与局部 Scope 上下文。Relation endpoint 复用 Core NodeTarget、namespace 与 anchor，Graph 不建立成员集合、私有引用索引、平行 Port / geometry / appearance model 或 Variant 视觉轴，也不拥有 Diagram 自动布局或 Editor document。

## 版本方向

| 版本                      | 主题                                  | 长期边界                                                                                                                                                                           |
| ------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [v0.1](./v0.1/roadmap.md) | Graph package family 与最小 Source IR | 建立三包闭环、独立 Entity / Relation / Group / Block composite、可选 Graph context、Definition / registry / Theme、resolve / lowering 与 authoring parity；局部 endpoint 复用 Core |

后续 UML、State 等元素按真实用例进入新的 minor / milestone；v0 roadmap 不预先冻结完整组件枚举。

## 能力演进

- `Group` 纳入 v0.1 alpha.1：提供不预设业务内容结构的 Graph 包含语义，children 与 Core `IRChild` 同源，并为 Diagram 的 compound layout、分组边界和跨边界 routing 提供结构输入。Group 不拥有成员位置、自动布局、routing 或 Layout solver
- `Block` 纳入 v0.1 alpha.2：面向代码与工程结构图，以非递归 Header / Section / Row / Cell 表达一个可参与关系拓扑的结构化节点；Blender、Gaea 一类节点图只用于验证局部连接覆盖面
- 不新增独立 Port：Block、Section、Row 的显式 id 下沉到 Core 可寻址 Scope / Node，Relation 继续使用 `NodeTarget + anchor / boundary`。socket 方向、类型、容量、执行与自动布局 port constraint 留给对应上层领域或 Diagram
- `Container` 仅作为上述容器问题域的历史统称，不预设为新的公共 discriminator；Group 直接组合 Core、Layout 与 Standard Surface，未来 Block 是否复用其中部分能力由自身 ADR 决定

未来 `@retikz/diagram` 作为 Graph 的上层能力，拥有布局意图、约束确定化、provider 编排、自动 layout / routing 与布局结果。Graph 不反向依赖 Diagram，也不拥有 Editor 或 renderer；Diagram package family 与公开契约由独立 roadmap / ADR 建立。`flow` 是 Diagram 的具体布局类型或 preset，不再建立独立 package owner。

v0.1 roadmap 中“不创建 `@retikz/diagram` 聚合包”描述的是该 milestone 未建立领域聚合入口的历史范围；未来同名的 `@retikz/diagram` 是具有独立职责的上层能力包，不是聚合包，也不反向改写 v0.1 的完成事实。
