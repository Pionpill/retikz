# v0.5.0-alpha.2 Roadmap：上下文化 Composite 布局

> 状态：Proposed，Architecture Gate 已通过，等待人工确认。

## 目标

为 `@retikz/core` 增加 traversal-native 的上下文化 composite 编译能力，使 Table 等需要“子内容测量 → 父布局求解 → 子内容受约束重排”的 Tier 2 能力，可以在同一次 Core compile 中获得任意 `IRChild` 的 intrinsic / constrained layout、回放最终结果并贡献 typed artifact。

## 决策列表

| ADR                                           | 状态     | 主题                        | 说明                                                                   |
| --------------------------------------------- | -------- | --------------------------- | ---------------------------------------------------------------------- |
| [ADR-01](./01-contextual-composite-layout.md) | Proposed | 上下文化 Composite 布局事务 | 双形态 definition、child layout/replay、occurrence、artifact 与 bounds |

## 范围

- 保留结构型 `CompositeDefinition.expand`，新增 layout-aware `compile` 分支并复用同一 registry。
- 任意 `IRChild` 的 intrinsic / constrained layout 与 compile-local replay。
- JSON-safe occurrence locator、deferred typed artifact 和 `compileWithArtifacts()`。
- Path stroke-aware、Scope clip-aware visual bounds。
- React `LayoutProps.compile` / `onCompileResult`、IR 模式 ScopeStyle 等价语义与 Vanilla artifact 透传。
- Kernel 与 Table 中英文文档及 adapter 等价性测试。

不在本 milestone 范围：

- 把已布局快照写入持久化 IR。
- 通用 CSS-like flex/grid layout、任意 Scope 子项约束分配。
- 跨 compile 缓存、增量编译和稳定跨版本 locator。
- renderer 专属 Table 逻辑。

## Gate

- [x] ADR-01 Architecture Gate PASS。
- [ ] 人工确认 ADR-01 可以进入实现。
- [ ] Spec-First contract / compile tests 先失败、后实现。
- [ ] Table alpha.2 ADR-01 gate 取得正式实现证据。
- [ ] adversarial BLOCKING 清空。
- [ ] Kernel / Table 中英文文档同步。
