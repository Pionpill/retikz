# v0.5.0-alpha.1 Roadmap：Kernel v0.5 机制收口

> 状态：发布准备完成。ADR-01～07 的实现、测试、双语文档与 Accepted 收尾已完成；`check:full`、`check:release-groups`、`test:full`、全仓 build、`test:publish-artifacts` 与 Kernel 六包 dry-run 已通过；commit 与 tag 已获授权，npm publish 与 push 尚未授权。

## 目标

在同一个 alpha milestone 中收口 v0.5 已登记的跨图元、跨 adapter 与编译机制：

- 保留已经交付的 Node anchor-to-anchor 定位。
- 补齐 Scope 自身锚点 / pivot、单轴路径连接、Node 文本自动对比色、label 视觉盒间距与 TeX 数学语法兼容。
- 建立 layout-aware composite、compile-local replay 与 typed artifacts，让 Tier 2 在同一次 Core compile 中完成内容反馈布局。

本 roadmap 只记录 milestone 归属和集成顺序。字段、默认值、DSL 与遗留边界以各 Accepted ADR 和公开文档为准；0.x 文档只描述当前公开面。

## 决策列表

| ADR                                                | 状态     | 主题                     | 说明                                                              |
| -------------------------------------------------- | -------- | ------------------------ | ----------------------------------------------------------------- |
| [ADR-01](./01-node-anchor-position.md)             | Accepted | Node 锚点对齐定位        | Node-only position 变体、两阶段布局、namespace 生命周期与错误契约 |
| [ADR-02](./02-scope-anchor-and-transform-pivot.md) | Accepted | Scope 自身锚点与变换基点 | 基于真实 Scope 包络进行放置，并为 rotate / scale 提供自身 pivot   |
| [ADR-03](./03-single-axis-path-connection.md)      | Accepted | 单轴路径连接             | 只保持当前 x 或 y 连接到目标，不追加正交折线第二段                |
| [ADR-04](./04-node-text-auto-contrast.md)          | Accepted | Node 文本自动对比色      | 依据可解析 fill 的相对明度选择黑 / 白文本，并固定 fallback        |
| [ADR-05](./05-node-label-box-spacing.md)           | Accepted | Node label 视觉盒间距    | `distance` 按 label 视觉盒边缘计算，统一 pin、bbox 与混排文本     |
| [ADR-06](./06-tex-math-syntax-compatibility.md)    | Accepted | TeX 数学语法兼容         | 选择性启用 MathJax TeX 扩展并保留跨后端可表达的样式语义           |
| [ADR-07](./07-layout-aware-composite.md)           | Accepted | 布局感知 Composite       | 人工确认后完成同次 child layout、replay 与 typed artifacts        |

Headless interaction 与 progressive compile 不再属于 alpha.1；其 ADR、实现、测试与用户文档已撤回，后续版本需重新建立 Proposed ADR。

## 批次与依赖

| 批次 | ADR          | 依赖与安排                                                              |
| ---- | ------------ | ----------------------------------------------------------------------- |
| 0    | ADR-01       | 已完成                                                                  |
| 1    | ADR-02/03/05 | 几何、路径和 label 布局基础；逐条 Gate，按文件 scope 决定能否交错实施   |
| 2    | ADR-04/06    | 文本可读性与 TeX；设计可独立，但实现仍按 core / tex 文件交叉情况串行    |
| 3    | ADR-07       | 独立冻结 compile 结果与 composite layout 契约；Table alpha.2 以此为前置 |

## Milestone 边界

- 每条 ADR 仍是独立设计与验收单元，不把多个方向合并成一份超大实现合同。
- ADR-03、ADR-04 若证明现有 IR 可组合表达，应收缩到 parser / authoring 层，不为 milestone 对称性强行扩展 IR。
- Headless interaction 与 progressive compile 已退出 alpha.1；后续版本必须重新完成设计、测试契约、Architecture Gate 与人工实现授权。
- ADR-07 只下沉通用 child layout / replay / artifact contract；Table track solver、Cell fit / overflow 和 manifest 字段留在 Table alpha.2。
- 不因集中到 alpha.1 而引入领域布局、UI 状态机、DOM handler、完整 LaTeX 文档编译或 renderer 私有 API。

## Gate

- [x] ADR-01 Architecture Gate PASS、实现、自测、文档与 changelog 收尾。
- [x] ADR-07 已补齐实现契约和 ignored `test-contract` 矩阵。
- [x] ADR-07 Architecture Gate 已执行三轮；未取得自动 PASS，修订后于 2026-07-25 获人工设计确认。
- [x] ADR-02 至 ADR-06 分别补齐实现契约、ignored `test-contract` 矩阵并取得 Architecture Gate PASS。
- [x] Headless interaction 与 progressive compile 已撤回 ADR、实现、测试与用户文档，并延期至后续版本。
- [x] 人工逐条确认 ADR-02 至 ADR-06 可以进入实现。
- [x] ADR-07 已于 2026-07-25 获得单独实现授权；不含 commit、push 或发布。
- [x] ADR-07 implementation / adversarial test / 双语 docs / changelog 已完成并获提交授权。
- [x] ADR-02 至 ADR-06 完成 implementation / adversarial test / docs，并于 2026-07-26 获得统一收尾确认。
- [x] alpha.1 全部 ADR 集成后执行整体 contract / release-group 验证。
- [x] alpha.1 全部 ADR 的 changelog / roadmap 统一收尾。
- [x] 发版准备改动获得 commit 授权。
