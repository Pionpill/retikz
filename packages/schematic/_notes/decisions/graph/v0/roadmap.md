# Graph v0 Roadmap

> 状态：进行中；v0.1 的无 Variant Theme breaking revision 与可选 Graph context 已完成 ADR 确认，正在实施收敛。关联：[Schematic Graph 完备设计](../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../notes/architecture/schematic-design.md)

## 目标

Graph v0 当前范围是 Schematic 领域的可复用关系与图式 foundation：Entity 与 Relation 是可独立放入任意 Core 内容树的 semantic composite，并在各自 record 中组合 Graph 语义与 Core lower-facing 字段；Graph 是可选的 `graphTheme` 与局部 Scope 上下文。Relation endpoint 复用 Core NodeTarget 与 namespace，Graph 不建立成员集合、私有引用索引、平行 geometry / appearance model 或 Variant 视觉轴，也不拥有 Diagram 自动布局或 Editor document。

## 版本方向

| 版本                      | 主题                                  | 长期边界                                                                                                                                  |
| ------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [v0.1](./v0.1/roadmap.md) | Graph package family 与最小 Source IR | 建立三包闭环、独立 Entity / Relation composite、可选 Graph context、Definition / registry / Theme、resolve / lowering 与 authoring parity |

后续 UML、State 等元素按真实用例进入新的 minor / milestone；v0 roadmap 不预先冻结完整组件枚举。

未来 `@retikz/diagram` 作为 Graph 的上层能力，拥有布局意图、约束确定化、provider 编排、自动 layout / routing 与布局结果。Graph 不反向依赖 Diagram，也不拥有 Editor 或 renderer；Diagram package family 与公开契约由独立 roadmap / ADR 建立。`flow` 是 Diagram 的具体布局类型或 preset，不再建立独立 package owner。

v0.1 roadmap 中“不创建 `@retikz/diagram` 聚合包”描述的是该 milestone 未建立领域聚合入口的历史范围；未来同名的 `@retikz/diagram` 是具有独立职责的上层能力包，不是聚合包，也不反向改写 v0.1 的完成事实。
