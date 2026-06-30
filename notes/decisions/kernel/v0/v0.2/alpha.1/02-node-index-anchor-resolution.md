# ADR-02：nodeIndex / anchor 跨 scope 解析语义

- 状态：Accepted（已实现）
- 决策日期：2026-05-16
- 关联：[v0.2-alpha.1 plan](./roadmap.md) · [本 milestone ADR-01](./01-scope-ir-and-compile.md) · [本 milestone ADR-03](./03-scope-id-bounding-box.md) · [alpha.5 ADR-03 (arrow geometry)](../../v0.1/alpha.5/03-path-arrow-detail.md)

## 背景 / 约束

- v0.1 的 nodeIndex 是全局扁平 `Map<string, NodeLayout>`：id 全局唯一、anchor 在节点局部坐标系算后返回世界坐标（v0.1 无 scope，layout 即世界坐标）、同 id 冲突直接 throw（strict）。
- 引入 `<Scope>`（ADR-01）后四个语义须明确：① id 命名空间结构（scope 是否引入局部命名空间、支持 opt-in 隔离吗）② anchor 解析坐标系（scope 内 `.north` 局部还是全局）③ id 冲突策略（strict throw 还是 warn + last-wins）④ 跨 frame lookup（local namespace 下内部引用如何解析、是否 shadowing 外层）。
- ADR-01 已决"Pass 1 累积 transform 算全局坐标 + `Scope.localNamespace` opt-in 字段"——nodeIndex 改为**栈式 namespace frame** 是既定前提；本 ADR 固化剩余决策（scope.id schema 在 ADR-01、bbox 注册行为在 ADR-03，本 ADR 只管 namespace stack 数据结构 + 跨 frame lookup + duplicate 策略）。

## 决策：栈式 namespace frame + 默认全局扁平 + `localNamespace` opt-in 边界 + 同 frame duplicate 走 warn + last-wins

- **数据结构**：nodeIndex 从 `Map` 改为 `NameStack`（`core/src/compile/name-stack.ts`），内部 `Array<Map<string, NodeLayout>>`，栈底是 `<Layout>` 根 frame；API `pushFrame` / `popFrame` / `register(id, layout)` / `lookup(id)`。
- **默认行为**（`localNamespace` 缺省 false）：scope 不 push frame，子 node / coordinate / 嵌套 scope.id 全注册到栈顶现有 frame；多层 scope 子树 id 仍汇到根 frame——与 TikZ pgf 默认 + v0.1 一致。
- **opt-in 边界**（`localNamespace: true`）：scope push 自己的 frame，子 id 退出后 pop 不向父合并 → 外部不可见。
- **scope.id 始终注册到父 frame**：进入 scope 时**先**用当前栈顶 frame register scope.id（如有），**然后**才判断 localNamespace 决定是否 pushFrame；scope.id 是外部句柄，不受自身 localNamespace 影响。
- **lookup 规则**：referent 按字符串 id 从当前 frame 起 **inside-out 搜索 NameStack**，命中第一个匹配 frame——内部可见外部 id（shadowing），外部不可见内部 id。
- **duplicate id 同 frame**：注册时若当前 frame 已有同 id → **不抛错**、发 `DUPLICATE_NODE_ID` warn（经 `CompileOption.onWarn`，含两条 IR locator + frame 深度）、用后写入的覆盖（last-wins）；同 frame 三个重复发 2 条 warn（**不合并**，每条独立 locator 方便定位）。**跨 frame 同 id 不算 duplicate**（shadowing 是正常语义），不 warn。
- **register / lookup 角色分离**：Pass 1 唯一允许 register（layout 计算源头）；Pass 2 lookup-only（NameStack 内部 `phase` 状态，Pass 2 register 抛 internal error，防御性）。
- **anchor 解析缓存**（`core/src/compile/anchor-cache.ts`）：`resolveAnchor(layout, anchorName)` 封装现有 `rect/circle/ellipse/diamond.anchor()` + 数字角度 `boundaryPoint()` 分支，用 `WeakMap<NodeLayout, Map<string, IRPosition>>` 缓存；layout 在 Pass 1 后不可变 → 单次 compile 全程有效、compile 结束 WeakMap 自动 GC。layout.rect 已是全局坐标（ADR-01），anchor 结果不随当前 frame 变化（layout 引用即 cache key，stable）。
- **数字角度 `.30` 在 rotate 下**：anchor 角度是 shape 局部极角，scope rotate 累积到 `rect.rotate` 上，shape 内部不感知（与 alpha.5 ADR-01 "layout 阶段折平 rotate" 一致）。

理由：① 默认行为 = v0.1 = 用户代码 0 改动可跑；duplicate warn + last-wins 与 TikZ pgf "同名后定义覆盖前定义" 一致 ② opt-in 隔离按需显式 `<Scope localNamespace>`，不破坏默认 LLM-friendly 单一引用语法 ③ last-wins + warn 比 throw 宽容——duplicate 是常见 LLM 生成 / 模板复制 bug，warn 让 compile 仍跑出可用结果，用户可 `onWarn` 升级为 error ④ shadowing 与 lexical scoping 直觉一致。

### 被否决的选项

- **B：强制局部命名空间 + qualified name（`"outer.inner.A"`）** —— 支持子图 / 模板复用（同 scope 内部 id 同名不冲突），但所有引用语法都变、前向引用复杂化、schema describe / LLM friendly 大幅下降、用户须理解 scope 路径、与 TikZ 默认不一致。
- **C：scope 内 id 自动加前缀但暴露原名（alias）** —— 子图复用 + 接口不变，但解析多义（`'A'` 究竟哪个）、调试困难、边角多。
- **D：全局扁平 + strict throw on duplicate**（v0.2 alpha.1 初版方案）—— 与 v0.1 一致，但不支持子图 / 模板复用、duplicate 必须用户手改、与 TikZ "同名覆盖" 不一致。

## 不在本 ADR 范围

- scope 引入局部命名空间（选项 B）/ scope id alias（选项 C）→ 留待 v1+ domain template / 子图复用需求出现后另开 ADR。
- scope.id 触发的 bbox 注册 / synthetic layout / scope 作为引用目标的 anchor 语义 → [ADR-03](./03-scope-id-bounding-box.md)（本 ADR 只管 id 冲突共享命名空间）。
- scope rotate 下数字角度的"自由方向"语义（TikZ `\anchorborder` 用户传向量而非角度）→ retikz `.30` 仍按局部 polar 角度解析；如需任意世界方向留待 ShapeRegistry 重设计 anchor 时再议。
- anchor cache 跨 compile / hot reload / React StrictMode 双调用复用 → 倾向不复用（每次 compileToScene 新建 NameStack + WeakMap 避免状态泄漏）；如需另开 ADR。

---

> **实现指针**：level `red`（动 compile 核心数据结构 + `CompileWarning.code`）、非 breaking（默认行为等价 v0.1；`CompileWarning.code` 是开放 union 加 `'DUPLICATE_NODE_ID'` 向后兼容）。真源以代码为准——`NameStack`（`core/src/compile/name-stack.ts`，pushFrame / popFrame / register / lookup / phase）、`resolveAnchor` + WeakMap cache（`core/src/compile/anchor-cache.ts`）、`compileToScene` 把 `nodeIndex: Map` 换为 `nameStack: NameStack` + duplicate warn（`core/src/compile/compile.ts`）、`layoutNode` / `resolvePosition` / `compile/path/*` 签名换 nameStack；anchor 分发到 `core/src/geometry/{rect,circle,ellipse,diamond}.ts`（不改 geometry 实现）。测试在 `core/tests/compile/{name-stack,anchor-cache,scope-anchor,scope-namespace,scope}.test.ts`。完整施工契约（13 项决策细节 / 文件 scope / 测试象限 / DSL 表面）见本文件 git 历史。

> 🔖 封板压缩 commit `da448234`；压缩前完整施工蓝图 = `git show da448234^:notes/decisions/core/v0/v0.2/alpha.1/02-node-index-anchor-resolution.md`。
