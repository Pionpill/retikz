# ADR-01：compile 输出 IR 顺序回归（占位槽回填恢复 transform-free frame 的声明序）

- 状态：Accepted（已实现）
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.4 plan](./roadmap.md) · [v0.2 总计划 §alpha.1 收尾遗留 / §alpha.4 设计预想](../roadmap.md) · [alpha.1 ADR-01 Scope IR/compile](../v0.2-alpha.1/01-scope-ir-and-compile.md) · [alpha.1 ADR-02 nodeIndex/anchor 解析](../v0.2-alpha.1/02-node-index-anchor-resolution.md) · [v0.1-alpha.5 ADR-01 Scene PathPrim/GroupPrim 结构化](../../v0.1/v0.1-alpha.5/01-scene-primitive-structured.md) · [core-design.md §1.2 AI 一等公民](../../../../../architecture/core-design.md)

> **范围**：修 alpha.1 重写 compile 管线（`NameStack` + 两遍扫描）时退化的「z-order 严格 = IR 声明顺序」。本段是同段 emit 增强（zIndex / 文本 Node 包 g / label rotate）与 alpha.5 Grid 底纹 sugar 的硬前置，故先落。

## 背景 / 约束

塑造方案的硬约束：

- **退化是两遍扫描的副作用**：node 在 Pass 1 即可算 layout、带位置直接 push 到当前 sink（位置正确）；path 端点可能前向引用 node，须延到 Pass 2 才定坐标。alpha.1 把所有 pending path 累积后一律 push 到顶层 `primitives` 末尾——既进错数组（不是声明所在 sink）又错时机，path 声明位丢失。后果：同层 node / path 交错时所有 path 永远叠在同层 node 之上。
- **坐标仍正确、但破坏下游硬前提**：同段「显式 zIndex」的核心算法是「先按 IR 顺序、再按 zIndex 稳定排序」，IR 顺序基线失效则稳定排序无从谈起；alpha.5 Grid 底纹靠 IR 顺序埋在最底层，path 顶到末尾会把底纹翻到最上层。
- **TikZ z-order 严格 = 绘制（声明）顺序**——本回归是偏离 TikZ 习惯，修复即回归对齐。

## 决策：占位槽回填 + 按 `scopeChain` 分流（选项 A）

Pass 1 path 分支在 sink 里 push 一个**编译期占位 primitive** 记住位置；Pass 2 解析出真 primitive 后按引用 `indexOf` 定位再 `splice` 替换（0..N 个）。node 路径零改动。按 path 所属 scope 的累积 transform 链 `scopeChain` 分两种落点：

- **`scopeChain` 为空**（顶层 / transform-free scope 内 path）→ **回填本层 sink 的占位槽**：端点是全局坐标，该 sink 不会二次 apply transform，安全且保住同层 z-order（这类 scope 内 path 的 z-order 顺带修好，净改进）。
- **`scopeChain` 非空**（transformed scope 内 path）→ **维持 hoist 到顶层 `primitives`**，落在该 scope 的 `GroupPrim` 之前：端点已含 scope transform，进 transformed `GroupPrim` 会被二次 apply，必须留顶层（行为与改造前逐字节相等）。

理由：

1. **最小回归修复**：定位是修 alpha.1 退化、解锁下游，不是重做坐标系；改动集中在 `compile.ts` 一处，node 路径零改动。
2. **与现有架构同构**：占位「Pass 1 占位 / Pass 2 回填」与 node「Pass 1 带位置 push」是同一心智；不破坏 ADR-02 的 inside-out lookup / frame push-pop / `resolvePendingPaths` 调用时机。
3. **落点判据 `chain.length === 0` 当场可判**，不按「是否在 scope 内」——localNamespace-only / 无 transform 的纯分组 scope `chain` 仍为空、全局坐标 path 进它的 `children` 安全。
4. **不污染公开类型**：占位类型模块私有，公开 `ScenePrimitive` / IR / 导出 0 变化。

具体决策细节（设计意图，代码读不出的 WHY）：

- **按引用 `indexOf` + `splice`，`idx === -1` 必抛 internal error**：每次重新 `indexOf` 免索引漂移；**绝不允许直接 `splice(-1, 1, ...)`**——会从末位算起误删最后一个真 primitive，把内部不变量违例掩盖成静默坏输出（同 ADR-02 「popFrame on empty 抛 internal error」防御约定）。
- **path 解析失败（`result == null`）→ splice 删占位**，不留空洞；原有 `UNRESOLVED_NODE_REFERENCE` warning 逻辑不变。
- **scope 内 `resolvePendingPaths(innerPaths)` 必须早于 `isPrunable` 判定**（硬约束）：否则「scope 只有 path」时占位尚未回填、`innerSink.length` 误判为空 → transform-free scope 被错误 prune。
- **末端无残留校验无条件执行（守 Scene 契约）**：「输出无 placeholder」是 `compileToScene` 返回 `Scene` 的公开契约；每 push 占位计数 +1、每 splice 替换 -1，返回前断言归零、非零即抛——生产构建也跑（O(1)）。dev mode 仅额外递归定位**哪个** placeholder 残留、附 IR locator，差别只在诊断详尽度。

### 被否决的选项

- **B：占位类型改 sink 元素 wrapper（`Array<ScenePrimitive | PathSlot>` + 末端 flatten）** —— 机制同 A、正确性等价，但 `GroupPrim.children` threading 处处需 cast、额外维护 flatten 逻辑，改动面更大无收益（YAGNI）。
- **C：path 端点改用 scope 局部坐标、所有 path 都进 `GroupPrim.children`** —— 能从根上恢复**含 transformed scope** 的完整 z-order、无 hoist 限制，但要改 `emitPathPrimitive` 端点坐标系，与 alpha.1 ADR-02「path 端点解析为全局坐标」相悖，牵动跨 scope anchor 引用 / `.north` 投影 / 数字角度等一整套已 Accepted 语义，是坐标系层面的重设计，体量远超 bug 修复。留未来单独 ADR。

## 不在本 ADR 范围

- **transformed scope 内 path 的完整 z-order**（选项 C）：本块维持现有 hoist（path 落在其所属 scope 的 `GroupPrim` 之前）保端点坐标正确；彻底方案留未来坐标系 ADR。同段显式 zIndex 只能覆盖部分 stacking 诉求，不替代坐标系层面修复——ADR-02 显式承认此限制。
- **顶层 / scope `primitives` 之外的 stacking 机制（显式 zIndex）** → 同段 [ADR-02](./02-explicit-zindex.md)。

---

> **实现指针**：level `red`（动 `core/src/compile/compile.ts` 管线）、非 breaking（无 schema / IR / 公开类型 / 导出变化，占位 `PathPlaceholder` / `InternalScenePrimitive` 模块私有不泄漏）。真源以代码为准——`compileToScene` / `PendingPath` / `resolvePendingPaths`（`core/src/compile/compile.ts`）；`ScenePrimitive` 公开 union（`core/src/primitive`）不变。测试在 `core/tests/compile/z-order.test.ts`（顶层交错同序 / transform-free scope 内同序 / 单 path 回填 / scope 仅 path 不被 prune / 解析失败删占位 / 占位不泄漏 / transformed scope path 仍 hoist 锁定），既有 `scope-bbox` / `shape-baseline-snapshot` 等快照随回填核对更新。完整原文（选项详情 / 决策细节 7 条 / DSL 示例 / 测试象限 9 case / 文件 scope）见本文件 git 历史。
