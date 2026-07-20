# v0.4.0-rc.1 Roadmap：候选发布验收与 Boundary 收口

## RC 例外

rc.1 原本只允许兼容 bugfix、文档和发布验收。2026-07-19 用户明确裁决：当前 RC 已经调整过 builtin boundary 的拟合行为，允许在发布前一次完成 `fit` / `gap` 与 Shape envelope contract，不把同一语义拆到 v0.5。

该例外只覆盖 [ADR-01](./01-shape-aware-boundary-fit.md) 的文件 scope。其它公开 API、IR schema、默认行为和 provider contract 继续冻结。

## 决策列表

| ADR                                        | 状态     | 主题                     | 说明                                                                          |
| ------------------------------------------ | -------- | ------------------------ | ----------------------------------------------------------------------------- |
| [ADR-01](./01-shape-aware-boundary-fit.md) | Accepted | Shape-aware boundary fit | builtin boundary 统一 `fit` / `gap`，Shape runtime contract 提供安全 envelope |

## 验收范围

- 完成 ADR-01 的 Core contract、provider、compile、测试和双语文档闭环。
- 保留 beta.2 后已登记的 Canvas 阴影透明度缺陷修复。
- 执行文档、包构建、dry-run 与独立安装 smoke；发布动作仍需单独授权。

## Boundary 验收清单

- [x] `circle` / `ellipse` / `rectangle` 接受统一 `{ fit, gap }`，默认 `{ fit: 'tight', gap: 0 }`。
- [x] `tight` 使用 Shape 解析或保守 envelope；`bounds` 使用 AABB 安全公式。
- [x] rectangle 的两种 fit 结果一致。
- [x] custom shape 缺 hook 时 warning + bounds fallback，且同一 node / kind 去重。
- [x] 有限负 gap 可用；有效半轴不大于 `0` 时 fail-loud。
- [x] endpoint、数字角度 anchor 与标准 anchor 共用拟合结果。
- [x] React / Vanilla 等价，Scene / renderer 无改动。
- [x] Core、adapter、docs 验证与只读整体 review 通过。

## 文档同步

- 更新 Node 连接面与自定义 Shape 中英文页面。
- 用 controls demo 对比 shape、boundary type、fit 和 gap，减少重复静态 demo。
- 更新 rc.1 changelog，明确默认行为变化、`bounds` 迁移方式和负 gap 风险。
