# Layout v0.1 Roadmap

> 状态：进行中；alpha.1 已完成。关联：[Layout v0 roadmap](../roadmap.md) · [Layout 布局库设计](../../../../architecture/layout-library-design.md) · [Standard v0.1 roadmap](../../../standard/v0/v0.1/roadmap.md)

## 目标

建立独立 Layout package family 和 release group，把 Standard 已验证的 FlexLayout、GridLayout、OverlayLayout、LayoutItem、artifact、inspection 与跨宿主 authoring 迁入正确 owner，并为 Standard、Graph 与其它 Tier 2 提供稳定 composition capability。

## Milestone

| Milestone                       | 主题              | 范围                                                                                   |
| ------------------------------- | ----------------- | -------------------------------------------------------------------------------------- |
| [alpha.1](./alpha.1/roadmap.md) | Layout foundation | 三包、发布组、Standard 迁移、`layout` namespace、composition、inspection、tests 与文档 |

## 边界

- 不创建 `@retikz/library` 聚合包
- 不实现 Tree、Layered、Force、GraphModel、edge routing 或编辑器状态
- 不保留 Standard 旧入口、re-export、Definition 或 namespace 兼容层
- 不借迁移改变既有 Flex / Grid / Overlay 的输入、默认值、求解、artifact 与失败语义
- 不把 Core proposal / probe / replay 复制为 Layout 私有运行时
