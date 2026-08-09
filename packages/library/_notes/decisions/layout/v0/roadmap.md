# Layout v0 Roadmap

> 状态：进行中；v0.1 alpha.1 已完成。关联：[Layout 布局库设计](../../../architecture/layout-library-design.md) · [Library 能力库设计](../../../architecture/library-design.md) · [能力完备性与模块边界](../../../../../../notes/architecture/capability-design.md)

## 目标

Layout v0 建立领域无关的排版布局能力域：以独立 package family 组合 Core proposal / probe / replay，提供容器约束、确定性求解、placement、artifact、inspection 与跨宿主 authoring，不吸收算法布局、图关系或 renderer 语义。

## 版本方向

| 版本                      | 主题                              | 长期边界                                                                                           |
| ------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------- |
| [v0.1](./v0.1/roadmap.md) | Package family 与既有排版能力迁移 | 建立 layout / layout-react / layout-vanilla，迁移 Flex / Grid / Overlay，冻结 composition 与 owner |

后续排版模型按真实消费证据进入新的 minor / milestone。Tree、Layered、Force、图节点自动定位与 edge routing 不进入 Layout roadmap。
