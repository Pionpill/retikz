# ADR-02：显式 zIndex（Node / Path / Scope 栈序覆盖，compile 末端稳定排序）

- 状态：Accepted（已实现）
- 决策日期：2026-05-23
- 关联： · [v0 roadmap §显式 z-index 提案](../../roadmap.md#显式-z-index-提案) · [本 milestone ADR-01 IR 顺序回归](./01-ir-order-regression.md)（提供 IR 顺序基线 + sealSink 对接点）

> **目标**：给 Node / Path / Scope 一个显式、声明式的栈序覆盖（`zIndex`），不靠挪 JSX 表达「谁在上」。

## 背景 / 约束

塑造方案的硬约束：

- 经 ADR-01 回归后渲染 z-order **严格 = IR 顺序 = JSX 顺序**——SVG / Canvas 两 renderer 都无原生 z-index，只能靠 primitive 排列顺序。
- JSX 顺序与「我希望谁在上」经常不一致：用户为让某条边 / 标签浮顶把 `<Node>` / `<Path>` 挪到 JSX 末尾，破坏「按逻辑分组书写」的阅读结构；「标签永远最上 / 底纹永远最下」这类跨元素稳定层级用纯顺序表达很脆（插一个元素就要重排）。
- TikZ 本身没有 z-index（它就是绘制顺序），但 retikz 跑浏览器、面向 AI 生成——给一个显式声明式栈序覆盖比「让 AI 算好顺序再按序生成」更稳。
- ADR-01 已把 IR 顺序基线修回来，「先按 IR 顺序、再按 zIndex 覆盖」算法的前提（稳定 IR 顺序）才成立，故本 ADR 同段紧随其后。

## 决策：可选 `zIndex` + compile 末端旁路稳定排序

Node / Path / Scope schema 加可选 `zIndex`（`z.number().int().finite().optional()`）；compile 用旁路 `Map<ScenePrimitive, number>` 记录、**不写进 primitive 本体**，在 sealSink（ADR-01 的占位回填 + 收窄回 `ScenePrimitive[]`）之后对该 sink 做 decorate-sort（`a.z - b.z || a.index - b.index`，同值按原下标 = 稳定）。

理由：

1. **renderer 零改动、compile 唯一真源**：排序在 compile 末端完成，SVG / Canvas / 未来 PDF 全自动受益，不在渲染端各写一遍。
2. **不污染 Scene / IR 契约**：旁路 Map 而非写进 primitive，Scene 输出保持纯净（不多 `zIndex` 噪声字段），AI 序列化 / JSON Patch / 快照不被污染。
3. **建在 ADR-01 之上、零额外管线**：复用其 sealSink 收窄点，天然避开「占位被当普通 prim 排序」。
4. **默认 0 = IR 顺序 = 恒等**：未用 zIndex 的图输出逐字节不变（稳定排序全 0 键 = 不改顺序），零破坏性。

具体决策细节（设计意图）：

- **谁有 zIndex**：Node / Path / **Scope** 都加（都发 primitive：Node→shape/text/group、Path→path/arrow、Scope→一个 GroupPrim）；**Coordinate 不加**（不发 primitive，无栈序意义）。
- **Scope 的 zIndex 语义**：作用于该 scope 的 **GroupPrim 整体**在父层的位置（与兄弟 node / path 同尺排序）；**不影响** scope 内部子元素的相对栈序（内部子元素在各自 sink 内按 zIndex 独立排）。两层独立，等价 CSS 嵌套 stacking context；**跨 group 不比较**（想跨 group 上层就别用 group 包，特性非 bug）。
- **zIndex 不进 every-X 默认通道**：`NodeDefaultSchema` / `PathDefaultSchema` 由 `NodeSchema.omit(...)` / `PathSchema.omit(...)` 派生，故两处 `.omit()` 加 `zIndex: true` 排除——zIndex 是**定位/结构**而非可继承样式，「every node 默认 z=N」语义混乱且少用，`.strict()` 拒 `nodeDefault: { zIndex }`。
- **同 zIndex 内排序**：稳定 + 保 IR 顺序（带原始下标），**不**按几何（左→右 / 上→下）。
- **transformed scope 内 path 的 zIndex**：这类 path 被 ADR-01 hoist 到顶层、按自身 zIndex 在**顶层**排，不跟随所属 scope 的 zIndex（给 transformed scope 设 zIndex 不会把 hoist 出去的 path 一起抬）。是 ADR-01 hoist 限制的延续，本 ADR 显式承认、不修。

## 长期边界

- **transformed scope 内 path 的完整 z-order**：ADR-01 已锁的 hoist 限制；彻底方案（path 端点改 scope 局部坐标）留未来坐标系 ADR。本 ADR zIndex 对这类 hoist path 只能在顶层覆盖。
- **`GroupPrim.meta` / `data-node-id` 钩子**：与 zIndex 无关，留未来。
- **带文本 Node 包 `<g>`** → [ADR-03](./03-text-node-group-wrap.md)；**Node label rotate** → [ADR-04](./04-node-label-rotate.md)。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：非 breaking（新字段全 optional，未用时输出恒等）；其余默认行为、失败语义与公开契约以正文为准。
