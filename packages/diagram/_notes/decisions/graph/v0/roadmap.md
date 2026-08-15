# Graph v0 Roadmap

> 状态：Complete；v0.1 已完成 package family、首批图式元素与 Theme Style 接入。关联：[Diagram Graph 完备设计](../../../architecture/diagram-graph-complete.md) · [Diagram 制图能力域设计](../../../../../../notes/architecture/diagram-design.md)

## 目标

Graph v0 建立 Diagram 领域的可复用图式元素层：元素可以脱离 GraphModel 独立绘制，也能被未来 Graph presentation 复用；所有能力通过 Layout、Standard 与 Core 的公开 contract 下沉，不拥有排版或算法布局、全局拓扑、Editor 或 renderer。

## 版本方向

| 版本                      | 主题                          | 长期边界                                                                                     |
| ------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| [v0.1](./v0.1/roadmap.md) | Package family 与首批图式元素 | 建立三包闭环与首批逻辑元素，冻结 owner、namespace、底层复用及四种 Theme Style 的基础单元映射 |

后续 UML、State 等元素按真实用例进入新的 minor / milestone；v0 roadmap 不预先冻结完整组件枚举。
