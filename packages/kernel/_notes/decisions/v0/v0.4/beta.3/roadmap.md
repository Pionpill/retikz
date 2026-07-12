# v0.4-beta.3 roadmap

> beta.3 聚焦动画运行时开关的公开语义收敛。先固定跨 React / Vanilla 的优先级与分层，再进入实现和文档同步。

| ADR                                          | 范围                            | 目标                                                                                             | 状态     |
| -------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| [ADR-01](./01-animation-enabled-override.md) | render / react / vanilla / docs | 让动画开关采用“未传跟随系统、显式 true / false 强制开关”的统一三态语义，同时保持 core 边界不变。 | Proposed |

## 不在 beta.3 默认范围

- 不改 core IR、Scene schema 或 compile 管线。
- 不统一 React 与 Vanilla 的属性形状。
- 不新增站点级动画设置或 Vanilla 的动态媒体查询订阅。
- 不改变动画轨道、easing、trigger、snapshot 或后端静态降级能力。
