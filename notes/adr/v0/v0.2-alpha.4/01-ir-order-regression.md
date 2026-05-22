# ADR-01：compile 输出 IR 顺序回归（占位槽回填恢复 transform-free frame 的声明序）

- 状态：Proposed
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.4 plan](../../../plans/v0/v0.2-alpha.4.md) · [v0.2 总计划 §alpha.1 收尾遗留 / §alpha.4 设计预想](../../../plans/v0/v0.2.md) · [alpha.1 ADR-01 Scope IR/compile](../v0.2-alpha.1/01-scope-ir-and-compile.md) · [alpha.1 ADR-02 nodeIndex/anchor 解析](../v0.2-alpha.1/02-node-index-anchor-resolution.md) · [v0.1-alpha.5 ADR-01 Scene PathPrim/GroupPrim 结构化](../v0.1-alpha.5/01-scene-primitive-structured.md) · [DESIGN.md §1.2 AI 一等公民](../../../architecture/DESIGN.md)

## 背景

main `bc7431f` 修过的「z-order 严格 = IR 声明顺序」在 alpha.1 重写 compile 管线（`NameStack` + 递归 `processChildren` 两遍扫描）时退化：path primitive 不再落在它在 IR 里的位置，而是被**统一 push 到顶层 `primitives` 数组的末尾**——同层 node / path 交错声明时，所有 path 永远叠在同层 node 之上。

退化是两遍扫描的副作用。node 在 Pass 1 就能算出 layout，于是**带位置直接** push 到当前 `sink`（顶层 = `primitives`、scope 内 = `GroupPrim.children`），位置正确。path 因端点可能前向引用 node，必须延到 Pass 2 才能定坐标；alpha.1 的实现把所有 pending path 累积到 `pathsAccumulator`，Pass 2 `resolvePendingPaths` 解析后**一律 push 顶层 `primitives`**——既进错了数组（不是声明所在的 sink），又错了时机（顶层在所有 node 处理完后批量 resolve）。两重错位叠加，path 的声明位丢失。

这不是用户可见的语义错误（坐标仍正确），但破坏了下游的硬前提：

- **同段 emit 增强（B）的「显式 `zIndex`」**核心算法是「先按 IR 顺序、再按 `zIndex` 稳定排序」。IR 顺序基线已失效，稳定排序无从谈起。
- **alpha.5 Grid「底纹背景」sugar** 靠 IR 顺序把底纹埋在最底层；当前所有 path 顶到末尾会把底纹叠到最上层。

> **段结构说明**（2026-05-23）：本回归（A）原为独立段 alpha.4，emit 增强（zIndex / 文本 Node 包 `<g>` / label rotate）原为 alpha.5；二者已合并为一段 alpha.4——A 是 B 的同段硬前置，A 先落、B 建在 A 的 sealSink 上。Grid sugar 段相应重编号为 alpha.5。本 ADR 是合并后 alpha.4 的 ADR-01（A 部分）；B 的 emit 增强 ADR 同目录续编。

下游都被本回归卡死，故 A 先修。TikZ 本身 z-order 严格等于绘制（声明）顺序——本回归是偏离 TikZ 习惯，修复是回归对齐。

**为什么 A 自成一块（而非塞回 alpha.1）**：alpha.1 的 4 篇 ADR 已全部 Accepted / 闭合，回开第 5 篇会破「封闭后再开下一段」的拆分原则；且本回归是同段 B 与 alpha.5 sugar 的硬前置，独立成块方便依赖标注与验收闭环。

## 选项

### A. 占位槽回填（placeholder slot）+ 按 `scopeChain` 分流 + 内部类型放宽末端收窄（**推荐**）

Pass 1 path 分支在 `sink` 里 push 一个**编译期占位 primitive**记住位置；Pass 2 `resolvePendingPaths` 解析出真 primitive 后，按引用 `indexOf` 定位再 `splice` 把占位替换为真 primitive（0..N 个）。node 路径完全不动。

按 path 所属 scope 的累积 transform 链 `scopeChain` 分两种落点：

| 情况 | `scopeChain` | 落点 | 理由 |
|---|---|---|---|
| 顶层 path / transform-free scope 内 path | `[]`（空） | **回填本层 `sink` 的占位槽** | 端点是全局坐标，但该 sink（顶层 `primitives` 或无 transform 的 `GroupPrim.children`）不会二次 apply transform → 安全且保住同层 z-order |
| transformed scope 内 path | 非空 | **维持 hoist 到顶层 `primitives`，落在该 scope 的 `GroupPrim` 之前**（现有行为不变） | 端点已含 scope transform（全局坐标），进 transformed `GroupPrim` 会被二次 apply → 必须留在顶层；resolve 时机不变（在 scope 子树内、group push 前），故 path 落在该 group 之前 |

占位类型用「内部 union 放宽 + 返回前无条件校验无残留 + 收窄」：模块私有 `type PathPlaceholder = { type: 'path-placeholder' }` + `type InternalScenePrimitive = ScenePrimitive | PathPlaceholder`；`processChildren` 的 `sink` / `primitives` / `innerSink` 用内部类型，构造 `GroupPrim` 和返回 `Scene` 前**无条件**校验无 placeholder 残留（守 Scene 公开契约，见决策细节 5）并收窄回 `Array<ScenePrimitive>`。

```ts
// PendingPath 加回填目标
type PendingPath = {
  path: IRPath;
  irPath: string;
  scopeChain: ReadonlyArray<Transform>;
  /** 回填目标：占位时记 sink + 占位 marker；hoist 时缺省（追加到顶层 primitives） */
  slot?: { sink: Array<InternalScenePrimitive>; placeholder: PathPlaceholder };
};

// Pass 1 path 分支：chain 空才占位，否则照旧只入 accumulator 走 hoist
if (chain.length === 0) {
  const placeholder = makePathPlaceholder();
  sink.push(placeholder);
  pending.slot = { sink, placeholder };
}
pathsAccumulator.push(pending);

// resolvePendingPaths：有 slot → splice 回填（失败移除占位）；无 slot → 维持 push 顶层
if (item.slot) {
  const idx = item.slot.sink.indexOf(item.slot.placeholder); // 按引用定位，免索引漂移
  if (idx === -1) throw new Error('internal: path placeholder missing from its sink');
  // ↑ 不可省：splice(-1, 1, ...) 会从末位算起、误删最后一个真 primitive，把内部状态错误掩盖成静默坏输出
  item.slot.sink.splice(idx, 1, ...(result?.primitives ?? []));
} else if (result) {
  for (const prim of result.primitives) primitives.push(prim);
}
```

- 优：node 路径零改动；占位是「在 Pass 1 占位、Pass 2 回填」的最小机制，与 node 的「Pass 1 带位置直接 push」同构；落点判据 `chain.length === 0` 在 Pass 1 当场可判（`chain` 即当前 scope 链）；公开 `ScenePrimitive` union 不被占位类型污染；transform-free scope 内 path 的 z-order 顺带修好（净改进）。
- 缺：引入一个编译期临时类型 + 末端断言收窄；transformed scope 内 path 仍 hoist（已知限制，见 §不在本 ADR 范围）。

### B. 占位槽回填 + sink wrapper（占位类型方案 B）

机制同 A，但占位类型改为 sink 元素 wrapper：`sink: Array<ScenePrimitive | PathSlot>`，末端 flatten。

- 优：占位与真 primitive 类型上更显式区分。
- 缺：改动面更大——`GroupPrim.children` threading 处处需 cast，flatten 逻辑额外维护；相比 A 不增加任何正确性，只换一种表达。

### C. 彻底方案：path 端点改用 scope 局部坐标，所有 path 都进 `GroupPrim.children`

让 transformed scope 内 path 的端点也解析为 scope **局部坐标**，从而能留在 transformed `GroupPrim.children`（由 group transform 统一施加），从根上恢复**包括 transformed scope 在内**的完整 z-order，不需要任何 hoist。

- 优：彻底——所有 frame 的 z-order 都严格 = IR 顺序，无已知限制。
- 缺：要改 `emitPathPrimitive` 的端点坐标系，与 alpha.1 ADR-02「path 端点解析为全局坐标」相悖，牵动跨 scope anchor 引用 / `.north` 投影 / 数字角度等一整套已 Accepted 的解析语义；**体量远超 bug 修复**，是一次坐标系层面的重设计。

## 决策：A

理由：

1. **最小回归修复**：本块定位是修 alpha.1 退化、解锁同段 emit 增强（B）与 alpha.5 sugar，不是重做坐标系。A 用占位槽精确恢复 transform-free frame 的声明序，node 路径零改动，改动全部集中在 `compile.ts` 一处。
2. **与现有架构同构**：占位「Pass 1 占位 / Pass 2 回填」与 node「Pass 1 带位置 push」是同一个心智；不破坏 alpha.1 ADR-02 的 inside-out lookup、frame push/pop、`resolvePendingPaths(innerPaths)` 调用时机。
3. **保 transformed scope path 坐标正确性**：`chain` 非空继续 hoist，端点全局坐标不二次 apply——与改造前逐字节相等，不引入回归。
4. **不污染公开类型**：占位类型模块私有，公开 `ScenePrimitive` / IR / 导出 0 变化；AI 一等公民约束（IR JSON 可序列化）不受触碰。
5. **B 无收益**：B 与 A 正确性等价但 cast / flatten 改动面更大，按 YAGNI 选 A。
6. **C 留未来**：C 是更彻底但体量超标的方案，与 ADR-02 既有语义冲突，推迟到单独 ADR（见 §不在本 ADR 范围）。

## 决策细节

> 主选项 A 已锁，以下随 plan 收敛，下游按此执行。

1. **落点判据用 `chain.length === 0`，不是「是否在 scope 内」**：localNamespace-only / 无 transform 的纯分组 scope，其 `chain` 仍为空、`GroupPrim` 也无 `transforms`，全局坐标 path 进它的 `children` 安全——这类 scope 内 path 顺带也修好 z-order。判据按 transform 链是否为空，不按是否处于 scope 子树。

2. **按引用 `indexOf` + `splice` 回填，`idx === -1` 必抛 internal error**：即便同一 sink 里前一个槽已被替换成多条 primitive 导致索引漂移，每次重新 `indexOf` 定位仍准确，不缓存索引。`indexOf` 返回 `-1`（占位不在它声称的 sink 里）在正确实现中不可能发生，但**绝不允许直接 splice**——`splice(-1, 1, ...)` 会从末位算起、误删最后一个真 primitive，把内部不变量违例掩盖成静默坏输出。必须先判 `idx === -1` 直接抛 internal error（与 alpha.1 ADR-02「popFrame on empty / Pass 2 register 抛 internal error」同款防御约定）。

3. **path 解析失败（`result == null`）→ splice 删占位**：`splice(idx, 1, ...[])` 即移除占位、不留空洞；`onWarn` 仍发原有 `UNRESOLVED_NODE_REFERENCE` / 解析失败 warning（warning 逻辑不变）。

4. **scope 内 `resolvePendingPaths(innerPaths)` 必须早于 `isPrunable` 判定**：硬约束。否则「scope 只有 path」时占位尚未回填、`innerSink.length` 误判为空 → transform-free scope 被错误 prune。`resolvePendingPaths(innerPaths)` 的调用**时机点**沿用 alpha.1（保 ADR-02 inside-out lookup 语义），但顺序上必须在 prune 判定之前。

5. **末端无残留校验无条件执行（守 Scene 契约边界）**：「输出无 `path-placeholder`」是 `compileToScene` 返回 `Scene`（`primitives: ScenePrimitive[]`）的公开契约的一部分——一旦实现遗漏让占位泄漏，renderer 会消费非法 primitive。故校验**不限 dev mode**：
   - **无条件**：类型收窄回 `Array<ScenePrimitive>` 是编译期 cast、本就必发；运行时再保一个 O(1) 不变量——每 push 一个占位计数 +1、每 splice 替换 -1，返回前断言计数归零，非零即抛 internal error。这条在生产构建也跑（开销 O(1)，可忽略）。
   - **dev 仅加细节**：dev mode 额外递归遍历 `primitives`（含嵌套 `GroupPrim.children`）定位**哪个** placeholder 残留、附 IR locator，丰富错误信息。dev / prod 差别只在诊断详尽度，不在「是否校验」。
   - 占位是编译期临时对象，`compileToScene` 返回前必被 splice 替换（顶层在 `resolvePendingPaths(rootPaths)`、scope 内在各自 `resolvePendingPaths(innerPaths)`），正常路径计数恒归零。

6. **`allPoints` 累积逻辑不变**：占位 / hoist 两条路径都照旧把 `result.points` 累积进 `allPoints`（viewBox 计算源），与本段无关。

7. **注释订正**：`compile.ts` 中「path primitive 一律 push 到顶层 `primitives`」的两处描述改为「`chain` 空回填本层 sink、非空才 hoist」。订正文字只讲行为，不出现历史阶段引用。

## 待决策点

> 选项 A 已锁，plan 列出的取舍全部拍板，本 ADR 范围内无遗留待决策点。实施期可能新增的小细节：

- **占位类型构造 helper 的命名 / 位置**：`makePathPlaceholder()` 模块私有即可，是否需要单测——倾向不单独测，由「占位无泄漏」象限的端到端断言覆盖。

## DSL 表面

> **无 DSL / schema / 公开 API 变化**——本段是纯 compile 内部管线修复。用户与 LLM 看到的唯一差别是：同层 node / path 交错声明时，Scene 输出顺序恢复为 IR 声明顺序。以 IR → primitives 顺序示意：

```ts
// 顶层 node / path 交错：修复后 primitives 顺序严格 = IR 声明顺序
const ir = {
  version: 1, type: 'scene',
  children: [
    { type: 'node', position: [0, 0] },   // → rect
    /* line path */                        // → path
    { type: 'node', position: [20, 0] },  // → rect
    /* line path */                        // → path
    { type: 'node', position: [40, 0] },  // → rect
  ],
};
// 修复前：['rect', 'rect', 'rect', 'path', 'path']（所有 path 顶到末尾）
// 修复后：['rect', 'path', 'rect', 'path', 'rect']（= IR 顺序）

// transform-free scope 内同样恢复（净改进）：
// { type: 'scope', children: [node, path, node] } → GroupPrim.children = ['rect', 'path', 'rect']

// transformed scope 内 path 仍 hoist（已知限制，端点坐标不变）：
// { type: 'scope', transforms: [translate], children: [node, path] }
//   → primitives = ['path', 'group']：GroupPrim.children = ['rect']，hoist 的 path 落在该 group 之前
//     （端点含 translate、不双重 apply；path 排到同 scope node 之前 = 已知限制）
```

## 测试设计

新建 `packages/core/tests/compile/z-order.test.ts`（Spec-First，red）。文本性 node（无 text、默认 rectangle、无 rotate）emit 恰好 1 个 `RectPrim`，line path emit 1 个 `PathPrim`，故 prim 序可逐项判型。覆盖：

- 顶层 node / path 交错 → primitives 与 IR 同序
- transform-free scope 内 node / path 交错 → `GroupPrim.children` 同序（净改进）
- transformed scope 内 path 仍 hoist（落在该 scope 的 `GroupPrim` 之前）+ 端点坐标用硬编码 expected / snapshot 锁定当前输出（已知限制锁定；「不偏离 baseline」由既有快照套件保证，见下）
- path 解析失败 → 占位被 splice 移除、无残留、无空洞、warning 仍发
- transform-free scope 仅含一条 path → 占位回填后不被 prune
- 占位 primitive 不泄漏到 `compileToScene` 输出（递归含所有 `GroupPrim.children`）

回归：`cd packages/core && npm run test:run` 全绿，重点盯 `scope.test.ts` / `scope-bbox.test.ts` / `scope-namespace.test.ts` / `path.test.ts` / `path-e2e-snapshot.test.ts` / `shape-baseline-snapshot.test.ts`（含快照）。

具体 case 拆分见下面「实现契约 § 测试象限」。

## 影响

- **`packages/core/src/compile/compile.ts`**（修改，唯一改动文件）：
  - `PendingPath` 加 `slot?: { sink; placeholder }` 字段。
  - 加模块私有 `PathPlaceholder` / `InternalScenePrimitive` 类型 + `makePathPlaceholder()`；`processChildren` 的 `sink` 形参 / `primitives` / `innerSink` 内部类型放宽为 `Array<InternalScenePrimitive>`，公开 `ScenePrimitive` 不变。
  - Pass 1 path 分支：`chain.length === 0` → push 占位 + 记 `slot`；非空 → 维持只入 `pathsAccumulator`。
  - `resolvePendingPaths`：有 `slot` → `indexOf` + `splice` 回填（`result` 为 null 时删占位）；无 `slot` → 维持 push 顶层 `primitives`。
  - scope 子树先 `resolvePendingPaths(innerPaths)` 再判 `isPrunable`（顺序硬约束）。
  - `return` 前递归断言无占位残留 + 收窄回 `Array<ScenePrimitive>`。
  - 注释订正两处。
- **不动**：`emitPathPrimitive`（端点仍解析为全局坐标）、`emitNodePrimitives`、`NameStack`、scope 的 frame push/pop 与 `resolvePendingPaths(innerPaths)` 调用时机（保 ADR-02 inside-out lookup 语义）、`isPrunable` 判据。
- **零破坏 schema / IR / 公开 API**：无字段 / 公开类型 / 导出变化；占位类型模块私有不泄漏。AST 白名单 / system prompt 不涉及。
- **文档站**：Scope 技术原理订正「scope 内 path 落点」描述（无 transform 回填 `GroupPrim.children` / 带 transform hoist 顶层），更新日志加 v0.2.0-alpha.4 条目（双语）。无 DSL / API 变化，仅行为说明订正。
- **下游解锁**：为同段 emit 增强（B）「先按 IR 顺序、再按 `zIndex` 稳定排序」提供 transform-free frame 内可验收的 IR 顺序基线；transformed scope path hoist 限制需在 B 的 emit 增强 ADR 中继续显式承认。

## 不在本 ADR 范围

- **transformed scope 内 path 的完整 z-order**（选项 C）：本块维持现有 hoist 行为（path 落在其所属 scope 的 `GroupPrim` 之前）以保端点坐标正确性。「path 端点改用 scope 局部坐标、让 transformed scope 内 path 也能进 `GroupPrim.children`」是更彻底方案，但要改 `emitPathPrimitive` 端点坐标系（与 alpha.1 ADR-02「path 端点全局坐标」相悖），体量超出 bug 修复，留未来单独 ADR。同段 emit 增强（B）的显式 `zIndex` 只能覆盖一部分 stacking 诉求，不能替代坐标系层面的彻底修复——B 的 emit 增强 ADR 须显式承认此限制。
- **顶层 / scope `primitives` 之外的 stacking 机制**（如显式 `zIndex`）→ 同段 emit 增强（B），独立 ADR。
- **占位类型方案 B（sink wrapper）**：评估后否决（与 A 正确性等价、改动面更大），保留记录避免重复立项。

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/compile/**`（compile.ts 管线修复）。
- 不动 schema / 不动公开 API / 不动 IR。
- 跨级取最高 = red（compile 改动）。

### Schema 改动

无 IR / schema / 公开类型改动。本 ADR 仅在 `compile.ts` 内新增**模块私有**编译期类型（`PathPlaceholder` / `InternalScenePrimitive`），不导出、不进 IR、不进 Scene 输出（返回前无条件校验保证无残留，见决策细节 5）。`PendingPath` 加 `slot?` 字段亦为 compile 内部类型。公开 `ScenePrimitive` union 不变。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/core/src/compile/compile.ts`（修改：`PendingPath.slot` + 占位类型 + Pass 1 path 占位 + `resolvePendingPaths` 回填 + scope prune 时机 + 末端断言 + 注释订正）
- `packages/core/tests/compile/z-order.test.ts`（新建：IR 顺序回归测试，见测试象限）
- `packages/core/tests/compile/scope-bbox.test.ts`（修改：既有 `scope_id_self_reference_in_inner_path` 改用该 scope 的 `group.children` 取内部 path——transform-free scope 内 path 修复后回填到 group、不再在顶层；断言意图（`g.east` 取真 bbox、`end[0] > 80`）与强度不变。扩展 scope 理由：该测试原本依赖被修复的旧 hoist 行为，属预期适配）

偏离白名单的改动需要：加新条目到本段并自我注解「为什么扩展 scope」，或开新 ADR。

> 既有快照测试（`shape-baseline-snapshot` / `name-stack` / `scope-transform-lowering`）若因本修复产生快照变化，须逐条核对变化符合「path 回到声明位、transformed scope path 仍 hoist」预期后再更新；快照更新计入本 scope。

### 测试象限

新建 `packages/core/tests/compile/z-order.test.ts`，至少 9 case：

#### Happy path（≥ 3）

- `top_level_node_path_interleave_matches_ir`：顶层 `[node, path, node, path, node]` → `primitives.map(p => p.type)` = `['rect', 'path', 'rect', 'path', 'rect']`
- `path_between_two_nodes_not_hoisted`：顶层 `[node, path, node]` → `['rect', 'path', 'rect']`（path 不再被顶到末尾）
- `transform_free_scope_internal_order`：`{ type: 'scope', children: [node, path, node] }`（无 transforms）→ 顶层得 1 个 `GroupPrim`，其 `children` 类型序 = `['rect', 'path', 'rect']`（净改进）

#### 边界（≥ 2）

- `single_top_level_path_backfilled`：顶层仅一条 path → 占位回填后 `primitives` = `['path']`（单元素 sink）
- `transform_free_scope_only_one_path_not_pruned`：`{ type: 'scope', children: [path] }`（无 transform、无 id、path 可解析）→ `resolvePendingPaths(innerPaths)` 在 `isPrunable` 前已回填，scope **不被 prune**，`GroupPrim.children` = `['path']`
- `nested_transform_free_scopes_backfill_local_sink`：多层无 transform scope 嵌套，最内层 node/path 交错 → 各层 `GroupPrim.children` 各自保住声明序

#### 错误路径（≥ 2）

- `unresolved_path_splice_removes_placeholder`：path 引用未定义 id → `result == null` → 占位被 `splice` 移除；`primitives` 无 `path-placeholder` 残留、无空洞；`onWarn` 仍收到原有 warning
- `placeholder_never_leaks_to_output`：上述任意用例 `compileToScene` 返回的 `primitives`（递归含所有 `GroupPrim.children`）不含 `type === 'path-placeholder'` 的对象

#### 交互（≥ 2）

- `transformed_scope_path_still_hoisted`：`{ type: 'scope', transforms: [translate], children: [node, path] }` → `GroupPrim.children` = `['rect']`（path 不在组内）；hoist 的 path `PathPrim` 落在该 scope 的 `GroupPrim` 之前（`primitives` = `['path', 'group']`），端点坐标含 translate（不双重 apply）—— 已知限制锁定
- `transformed_scope_path_output_locked`：transformed scope 内 path 的 Scene 输出用**硬编码 expected Scene / snapshot 锁定**当前形态（PathPrim 端点坐标含 translate、落在该 scope 的 `GroupPrim` 之前即 `primitives` = `['path', 'group']`、不在 `GroupPrim.children`）——自包含、可执行；不写「与改造前逐字节相等」（改造后测试拿不到改造前实现，无法运行）。「不偏离改造前 baseline」由既有快照套件（`path-e2e-snapshot` / `shape-baseline-snapshot`，持有改造前输出、drift 即红）保证，不靠本 case
- `node_path_node_with_transformed_scope_between`：`[node A, <Scope transforms><path></Scope>, node B]` → `primitives` = `['rect', 'path', 'group', 'rect']`：A / B 的 rect 按声明序，scope 内 path hoist 到该 scope 的（空）`GroupPrim` 之前（锁定「transformed scope 内 path 相对其 group 的位置」这一已知限制的可见形态）

### 依赖现有元素

- `packages/core/src/compile/compile.ts` 的 `PendingPath` —— **扩**：加 `slot?` 字段。
- `packages/core/src/compile/compile.ts` 的 `processChildren` / `resolvePendingPaths` / `primitives` / `innerSink` / `sink` —— **修改**：内部类型放宽为 `Array<InternalScenePrimitive>`；path 分支占位 + 回填逻辑。
- `packages/core/src/compile/compile.ts` 的 `isPrunable` 判定点 —— **引用 + 时机约束**：scope 子树先 resolve path 再判 prune（不改判据本身）。
- `packages/core/src/compile/compile.ts` 的 `emitPathPrimitive` 调用 —— **仅引用**：端点仍解析全局坐标，签名 / 返回不变。
- `packages/core/src/primitive` 的 `ScenePrimitive` —— **仅引用**：占位类型基于其构造内部 union；公开 union 不改。
- alpha.1 [ADR-02 nodeIndex/anchor 解析](../v0.2-alpha.1/02-node-index-anchor-resolution.md) —— **强依赖（不冲突）**：保留其 inside-out lookup / frame pop / path 端点全局坐标语义；本段只改 path primitive 的**落点 / 时机**，不改其端点**坐标系**。
- alpha.1 [ADR-01 Scope IR/compile](../v0.2-alpha.1/01-scope-ir-and-compile.md) —— **引用**：`GroupPrim` 结构 + scope frame push/pop 来自此。
