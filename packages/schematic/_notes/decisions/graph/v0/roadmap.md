# Graph v0 Roadmap

> 状态：Complete；v0.1 已完成 package family、首批图式元素与 Theme Style 接入。关联：[Schematic Graph 完备设计](../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../notes/architecture/schematic-design.md)

## 目标

Graph v0 当前已完成的范围是 Schematic 领域的可复用图式元素 foundation：元素可以脱离全局关系模型独立绘制，也能被未来 Graph 数据模型与 presentation 复用；所有能力通过 Layout、Standard 与 Core 的公开 contract 下沉。v0.1 没有实现全局节点、关系、分组或端口模型，但这些通用关系契约的长期 owner 是 Graph，不另设悬空的 GraphModel owner；后续能力仍需新的 milestone ADR。

## 版本方向

| 版本                      | 主题                          | 长期边界                                                                                     |
| ------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| [v0.1](./v0.1/roadmap.md) | Package family 与首批图式元素 | 建立三包闭环与首批逻辑元素，冻结 owner、namespace、底层复用及四种 Theme Style 的基础单元映射 |

后续 UML、State 等元素按真实用例进入新的 minor / milestone；v0 roadmap 不预先冻结完整组件枚举。

未来 `@retikz/diagram` 作为 Graph 的上层能力，拥有布局意图、约束确定化、provider 编排、自动 layout / routing 与布局结果。Graph 不反向依赖 Diagram，也不拥有 Editor 或 renderer；Diagram package family 与公开契约由独立 roadmap / ADR 建立。`flow` 是 Diagram 的具体布局类型或 preset，不再建立独立 package owner。

v0.1 roadmap 中“不创建 `@retikz/diagram` 聚合包”描述的是该 milestone 未建立领域聚合入口的历史范围；未来同名的 `@retikz/diagram` 是具有独立职责的上层能力包，不是聚合包，也不反向改写 v0.1 的完成事实。
