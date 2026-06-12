# v0.2.0-alpha.4 实施待办：compile IR 顺序回归 + emit 层增强（zIndex + 文本 Node 包 `<g>` + label rotate）

> 写于 2026-05-22（A：IR 顺序回归）；2026-05-23 并入原 alpha.5 的 emit 层增强（B：zIndex / 文本 Node 包 `<g>` / label rotate），两段合一。承接 [`v0.2 总计划`](../roadmap.md) §"alpha.4 设计预想" + §"alpha.1 收尾遗留" §1 + roadmap 三处 emit 提案（[显式 zIndex](./roadmap.md#显式-z-index-提案) / [带文本 Node 输出始终包 `<g>`](./roadmap.md#带文本-node-输出始终包-g-提案) / [Node label 旋转能力](./roadmap.md#node-label-旋转能力计划)）。完工后保留留档（摘要见 v0.2.md 跟踪段）。
>
> 关联：[`v0.2 总计划 §六段 alpha 节奏`](../roadmap.md#六段-alpha-节奏) · [`alpha.1 ADR-02 anchor / path 解析`](../alpha.1/02-node-index-anchor-resolution.md)（inside-out lookup / frame pop 语义同源）· [`v0.2-alpha.5.md`](../alpha.5/roadmap.md)（Path sugar 派发出的 Path 自动享受本段 zIndex）· alpha.4 ADR（`notes/decisions/core/v0/v0.2/alpha.4/`）：[`01` IR 顺序回归](.//01-ir-order-regression.md)（A）·[`02` 显式 zIndex](.//02-explicit-zindex.md)·[`03` 文本 Node 包 g](.//03-text-node-group-wrap.md)·[`04` label rotate](.//04-node-label-rotate.md)（B）

## 背景与定位

本段两块、一条主线：

- **A. compile IR 顺序回归**（内部 bug 修复）：main `bc7431f` 修过的「z-order 严格 = IR 顺序」在 alpha.1 重写 compile 管线（`NameStack` + 递归 `processChildren` 两遍扫描）时退化——path primitive 被**统一 push 到顶层 `primitives` 末尾**，永远叠在同层 node 之上。A 用占位槽回填恢复 transform-free frame 的声明序。
- **B. emit 层增强**：在 A 的 IR 顺序基线之上加 ①显式 `zIndex` ②带文本 Node 包 `<g>` ③Node label `rotate`，全部改 emit 末端（`compile/node.ts` 的 `emitNodePrimitives` + `compile/compile.ts` 的 sink 收尾）。

**为什么 A、B 合一段**（原先 A = alpha.4 / B = alpha.5，2026-05-23 合并）：

1. **真协同**：B 的 zIndex 稳定排序直接建在 A 的 **sealSink**（占位回填 + 类型收窄回 `Array<ScenePrimitive>`）上——分两段 = A 刚落 sealSink、B 立刻又撬开它加排序；合一段一次设计完。
2. **同片代码 + 一次 snapshot**：B 三件都改 emit 末端，与 A 的 `compile.ts` 改动同片；分段会反复回填同一批快照。
3. **A 体量小**：A 是纯内部、单文件（`compile.ts`）、零公开 API 改动的回归修复，独立成段性价比低。

> 合并代价（已知）：本段从「纯内部回归修复」变成**夹带公开 schema 扩张（`zIndex` / label `rotate`）+ 文本 Node 包 `<g>` 的快照刷新**；且 B-3 的 rotated-node label 坐标空间 ADR（§待定 0）成为整段的发布闸门。实施顺序上 A 仍先落（基线、可独立验收），再做 B（见 §实现拆分）。

**衡量标准**：

- **(A)** 同层（顶层 / `scopeChain.length === 0` 的 transform-free frame）node / path 交错声明时，Scene 输出顺序严格 = IR 声明顺序；`scopeChain.length > 0` 的 transformed scope 内 path 继续 hoist 到顶层末尾，作为本段明确记录的已知限制；alpha.1 全部既有测试零破坏。
- **(B-zIndex)** Node / Path / Scope 显式声明 `zIndex` 时，Scene `primitives`（及每个 scope 的 `GroupPrim.children`）按 `zIndex ?? 0` 升序、同值严格保持 IR 顺序；scope 的 zIndex 作用于其 GroupPrim 整体（父层排序单位）、不影响 scope 内部；**zIndex 子功能未使用时排序恒等**（稳定排序 + 全 0 键 = 不改顺序）。
- **(B-group)** 带文本（`layout.lines` 非空）的 Node emit 成单个 GroupPrim（无旋转时该 group 无 transform）；纯几何 Node 维持平铺。**这是本段相对 A 唯一的既有输出变化。**
- **(B-rotate)** Node label `rotate: 'radial' | 'tangent' | number` 让 label 文本绕**自身中心**自旋；**不旋转 Node** 上 label 位置（由 `position` / `distance` 决定）不变。**旋转 Node（`Node.rotate !== 0`）上 label 坐标空间另有 latent 问题，是本段 ADR 硬前置**（见 §待定 0）。

---

## A. compile IR 顺序回归（占位槽回填）

### 问题定位（精确到文件 / 行）

全部集中在 `packages/core/src/compile/compile.ts`：

| 位置 | 现状 | 问题 |
|---|---|---|
| `compile.ts:243-245`（node 分支） | `for (const prim of emitNodePrimitives(layout, round)) sink.push(prim)` | ✅ node Pass 1 **直接** push 到当前 `sink`，位置正确 |
| `compile.ts:356-360`（path 分支） | path 仅 `pathsAccumulator.push({ path, irPath, scopeChain })`，**不**在 `sink` 占位 | path 在本层 `sink` 里**没有落点**，Pass 2 解析后无处可回填 |
| `compile.ts:187-205`（`resolvePendingPaths`） | `for (const prim of result.primitives) primitives.push(prim)`（line 198） | path primitive **一律 push 顶层 `primitives`**，与它声明所在的 `sink` 无关、与同层 node 的相对位置无关 |
| `compile.ts:367-369`（顶层收尾） | `processChildren(...)` 跑完**所有** node 后才 `resolvePendingPaths(rootPaths)` | 顶层所有 path 在所有 node 之后批量 resolve → 全部追加到 `primitives` 末尾 |

> `compile.ts:183` / `compile.ts:353` 的注释「path primitive 一律 push 到顶层 `primitives`」正是本回归的**设计来源**——理由写的是「端点已是全局坐标，不能进 GroupPrim 否则被 scope.transform 二次 apply」。这个理由对 **transform 链非空**的 scope 内 path 仍成立（见下 §设计 的取舍），但被错误地推广到了**顶层 / transform-free** 的 path 上，那里根本没有 GroupPrim 二次 apply 的风险。A 部分修复就是把「无 transform → 回填本层 sink」从「有 transform → hoist 顶层」里拆出来。

#### 根因小结

两重错位叠加：

1. **错误的数组**：path 永远进顶层 `primitives`，而非它声明所在的 `sink`（顶层 = `primitives`、scope 内 = `GroupPrim.children`）；
2. **错误的时机**：顶层 path 全部在 node 处理完之后批量 resolve，相对位置丢失。

node 之所以正确，是因为它在 Pass 1 就**带位置直接** push 到 sink；path 因前向引用必须延到 Pass 2 才能定端点，于是丢了位置。**修复关键 = 让 path 在 Pass 1 先在 sink 占一个位（slot），Pass 2 解析完回填该 slot。**

### 设计：占位槽回填（placeholder slot）

核心：Pass 1 path 分支在 `sink` 里 push 一个**占位 primitive（placeholder）**记住位置；Pass 2 `resolvePendingPaths` 解析出真 primitive 后，用 `splice` 把占位替换为真 primitive（可能 0..N 个）。node 路径完全不动。

按 path 的 `scopeChain`（该 path 所属 scope 的累积 transform 链）分两种落点：

| 情况 | `scopeChain` | 落点 | 理由 |
|---|---|---|---|
| 顶层 path / transform-free scope 内 path | `[]`（空） | **回填本层 `sink` 的占位槽** | 端点是全局坐标，但该 sink（顶层 `primitives` 或无 transform 的 `GroupPrim.children`）不会二次 apply transform → 安全且保住同层 z-order |
| transformed scope 内 path | 非空 | **维持 hoist 到顶层 `primitives`**（现有行为，append） | 端点已含 scope transform（全局坐标），进 transformed `GroupPrim` 会被二次 apply → 必须留在顶层；其跨 frame z-order 仍可能偏离 IR 顺序，本段不修 |

> `scopeChain` 在 Pass 1 path 分支即已知（就是当前 `chain`），故「占位 vs hoist」在 Pass 1 当场可判：`chain` 空才 push 占位，否则照旧只入 `pathsAccumulator` 走 hoist。

落点判据用 `chain.length === 0` 而非「是否在 scope 内」：localNamespace-only / 无 transform 的纯分组 scope，其 `chain` 仍为空、`GroupPrim` 也无 `transforms`，全局坐标 path 进它的 `children` 安全——这类 scope 内 path 顺带也修好了 z-order（净改进）。

#### 已知限制：transformed scope path 仍 hoist

A 部分是**最小回归修复**，只恢复 transform-free frame 的 IR 顺序。`scopeChain.length > 0` 的 path 仍按 alpha.1 行为 hoist 到顶层 `primitives` 末尾：这保住端点坐标正确性（避免 transformed `GroupPrim` 二次 apply），但意味着它和所在 transformed scope 外部兄弟元素之间的全局视觉顺序仍不完全等于 IR 顺序。

例：`node A` / `<Scope transforms=[...]><Path /></Scope>` / `node B` 中，scope 内 path 仍可能追加在顶层末尾。本段接受这个限制，把更彻底方案（path 端点改用 scope 局部坐标、让 transformed scope 内 path 也能留在 `GroupPrim.children`）留给未来单独 ADR；B 部分的显式 `zIndex` 只能覆盖一部分 stacking 诉求，不能替代坐标系层面的彻底修复。

#### 代码形态（实现参考，非逐字）

`PendingPath` 加回填目标：

```ts
type PendingPath = {
  path: IRPath;
  irPath: string;
  scopeChain: ReadonlyArray<Transform>;
  /** 回填目标：占位时记 sink + 占位 marker；hoist 时缺省（追加到顶层 primitives） */
  slot?: { sink: Array<InternalScenePrimitive>; placeholder: PathPlaceholder };
};
```

Pass 1 path 分支（`compile.ts:356`）：

```ts
} else {
  const pending: PendingPath = {
    path: resolveEffectivePath(child, styleStack),
    irPath: `${locatorPrefix}children[${i}].path`,
    scopeChain: chain,
  };
  if (chain.length === 0) {
    const placeholder = makePathPlaceholder(); // 内部 sentinel primitive
    sink.push(placeholder);
    pending.slot = { sink, placeholder };
  }
  pathsAccumulator.push(pending);
}
```

`resolvePendingPaths`（`compile.ts:187-205`）：

```ts
for (const item of pending) {
  const result = emitPathPrimitive(item.path, nameStack, round, measureText, {
    onWarn, irPath: item.irPath, scopeChain: item.scopeChain,
  });
  if (item.slot) {
    const idx = item.slot.sink.indexOf(item.slot.placeholder); // 按引用定位，免索引漂移
    item.slot.sink.splice(idx, 1, ...(result?.primitives ?? [])); // 替换占位（失败则移除）
  } else if (result) {
    for (const prim of result.primitives) primitives.push(prim); // hoist：维持现状
  }
  if (result) for (const p of result.points) allPoints.push(p);
}
```

按引用 `indexOf` 定位再 `splice`：即便同一 sink 里前一个槽已被替换成多条 primitive 导致索引漂移，每次重新定位仍准确。

#### 占位 primitive 的类型（已拍板 A 方案）

占位是**编译期临时**对象，`compileToScene` 返回前必被 splice 替换（顶层在 `compile.ts:369` resolve、scope 内在 `compile.ts:335` resolve），不会泄漏到输出。

- 模块私有 `type PathPlaceholder = { type: 'path-placeholder' }`，并在 `compile.ts` 内定义内部别名 `type InternalScenePrimitive = ScenePrimitive | PathPlaceholder`。`processChildren` / `primitives` / `innerSink` 用内部类型；真正构造 `GroupPrim` 和返回 `Scene` 前必须递归断言无 placeholder 残留并收窄回 `Array<ScenePrimitive>`（下称 **sealSink**）。公开 `ScenePrimitive` union **不**污染。
- **sealSink 是 B-1 zIndex 排序的对接点**：排序只在 sealSink 之后、sink 已是纯 `Array<ScenePrimitive>` 时执行（详 §B-1）。

---

## B. emit 层增强

### B-1 显式 zIndex

zIndex 是**纯渲染顺序**字段，不参与 layout / 几何 / 文本度量。因此**不进** `NodeLayout`，也不经 `resolveNodeStyle` / `resolveEffectivePath`——直接在 `processChildren` 里从 **raw IR child**（`child.zIndex`）读取，挂到该 child emit 出的每个 real primitive 上，本段 A 部分的 sealSink 之后统一稳定排序。

#### schema（零破坏，加可选字段）

`packages/core/src/ir/node.ts` `NodeSchema`（末尾，`label` 之后）：

```ts
zIndex: z
  .number()
  .int()
  .finite()
  .optional()
  .describe(
    'Explicit stacking order among sibling IR children. Higher draws on top. Omitted = 0 = source order. Sorting is stable: same zIndex keeps source order. Scoped per group (a node inside a <Scope> only restacks within that scope).',
  ),
```

`packages/core/src/ir/path/path.ts` `PathSchema`（`drawOpacity` 之后、`children` 之前）：同字段、同 describe（措辞改"path"）。

`packages/core/src/ir/scope.ts` `ScopeSchema`（`resetStyle` 之后、`children` 之前）+ 手写 `IRScope` 类型同步加 `zIndex?: number`：

```ts
zIndex: z
  .number()
  .int()
  .finite()
  .optional()
  .describe(
    'Explicit stacking order of this scope as a whole among its sibling IR children. Higher draws on top. Applies to the scope GroupPrim as a single unit in the parent; does NOT affect how children stack inside the scope (they restack within the scope by their own zIndex). Omitted = 0 = source order.',
  ),
```

> **谁有 zIndex**：**会发 primitive 的 IR child 都有**——Node（emit shape/text/group）、Path（emit path/arrow）、**Scope（emit 一个 GroupPrim）**。Scope 的 GroupPrim 在父层就是一个普通 stacking 单位，按 `scope.zIndex` 与兄弟 node/path 同尺排序。**Coordinate 不加**——它不发 primitive，zIndex 无意义。

> **zIndex 不进 every-X 默认通道**：`NodeDefaultSchema` / `PathDefaultSchema` 由 `NodeSchema.omit(...)` / `PathSchema.omit(...)` 派生——给 NodeSchema/PathSchema 加 zIndex 会让 `nodeDefault` / `pathDefault` 顺带吃到它。zIndex 是**定位/结构**、不是可继承样式，故在两处 `.omit({...})` **加 `zIndex: true`** 排除；`.strict()` 会拒 `nodeDefault: { zIndex }`。scope 自身的 `zIndex`（上面 ScopeSchema 字段）与此无关，是 scope-整体的栈序。

#### compile：tag + sealSink 后稳定排序

> **与 A 部分占位类型的边界**：A 让 sink / 顶层 `primitives` / scope `innerSink` 都用内部类型 `InternalScenePrimitive = ScenePrimitive | PathPlaceholder`，并在「构造 GroupPrim / 返回 Scene 前」sealSink（断言无残留 + 收窄回 `Array<ScenePrimitive>`）。zIndex 必须遵守：**占位（`PathPlaceholder`）不是 `ScenePrimitive`，永不进 `zIndexOf`**；zIndex 只挂到回填后的 **real primitive** 上，排序只在 **sealSink 之后**执行。

`compileToScene` 顶部新增 primitive → zIndex 映射：

```ts
// primitive → 显式 zIndex；缺省视为 0。sealSink 后稳定排序按它分组，不写进 primitive 本体（保 Scene 输出纯净）。
// key 只会是 real ScenePrimitive——占位 PathPlaceholder 永不进此 Map（见上）。
const zIndexOf = new Map<ScenePrimitive, number>();
```

`processChildren` **node 分支**（A 改造后的 node push 处）打标（`emitNodePrimitives` 返回 real `ScenePrimitive`，作 key 类型安全）：

```ts
for (const prim of emitNodePrimitives(layout, round)) {
  sink.push(prim);
  if (child.zIndex !== undefined) zIndexOf.set(prim, child.zIndex);
}
```

> 带文本 Node 经 B-2 改造后 `emitNodePrimitives` 只回单个 GroupPrim → 这里只 tag 一个 group，整节点天然成一个 stacking 单位；纯几何 / 仅 label 的 Node 回多个平铺 prim，它们共享同一 `child.zIndex` → 稳定排序保持连续且顺序不变。

`processChildren` **scope 分支**（A 构造 scope GroupPrim、`sink.push(group)` 之后）打标——scope 整体就是一个 GroupPrim 单位：

```ts
sink.push(group);
if (child.zIndex !== undefined) zIndexOf.set(group, child.zIndex);
```

> scope 的 `zIndex` 只决定**该 GroupPrim 在父 sink 里的位置**（与兄弟 node/path 同尺排），不进入 scope 的 `innerSink`——内部子元素仍按各自 `zIndex` 在 `innerSink` 独立排（跨 group 不比较）。两层互不干涉，等价 CSS 嵌套 stacking context。

`PendingPath`（A 已加 `slot?`）再加 `zIndex?`：

```ts
type PendingPath = {
  path: IRPath;
  irPath: string;
  scopeChain: ReadonlyArray<Transform>;
  slot?: { sink: Array<InternalScenePrimitive>; placeholder: PathPlaceholder }; // A
  /** 该 path 的显式 zIndex（raw child.zIndex）；缺省 = 0 */
  zIndex?: number;
};
```

**path 分支**只在 `PendingPath` 上记 `zIndex: child.zIndex`（从 raw child 读，不经 `resolveEffectivePath`）；**不给占位打标**（占位不是 `ScenePrimitive`、也即将被替换）：

```ts
const pending: PendingPath = {
  path: resolveEffectivePath(child, styleStack),
  irPath: `${locatorPrefix}children[${i}].path`,
  scopeChain: chain,
  zIndex: child.zIndex, // undefined 时排序按 0 处理
};
if (chain.length === 0) {
  const placeholder = makePathPlaceholder();
  sink.push(placeholder);
  pending.slot = { sink, placeholder };
}
pathsAccumulator.push(pending);
```

`resolvePendingPaths`（在 A 回填逻辑里追加 zIndex 复制）：占位被 `splice` 替换为 real path primitive 后，把 `item.zIndex` 复制到每条 real prim；hoist 分支 push 顶层时同样按 `item.zIndex` 打标。**占位本身从不入 `zIndexOf`**：

```ts
if (item.slot) {
  const idx = item.slot.sink.indexOf(item.slot.placeholder);
  const real = result?.primitives ?? []; // Array<ScenePrimitive>
  item.slot.sink.splice(idx, 1, ...real);
  if (item.zIndex !== undefined) for (const prim of real) zIndexOf.set(prim, item.zIndex);
} else if (result) {
  for (const prim of result.primitives) {
    primitives.push(prim);
    if (item.zIndex !== undefined) zIndexOf.set(prim, item.zIndex);
  }
}
```

稳定排序 helper（compileToScene 内）。**接收 `Array<ScenePrimitive>`**——只在 sealSink 之后调用，此时 sink 已无占位、类型已收窄：

```ts
/**
 * 按 zIndex 升序原地稳定排序一组 primitive：同 zIndex 保持原 IR 顺序
 * @description decorate-sort（带原始下标）保证稳定；全 0 键时是恒等排列（不扰动既有快照）。
 *   仅在 sealSink（占位已全部回填、类型已收窄回 ScenePrimitive）之后调用。
 */
const stableSortByZIndex = (arr: Array<ScenePrimitive>): void => {
  const decorated = arr.map((prim, index) => ({ prim, index, z: zIndexOf.get(prim) ?? 0 }));
  decorated.sort((a, b) => a.z - b.z || a.index - b.index);
  for (let i = 0; i < arr.length; i++) arr[i] = decorated[i].prim;
};
```

**两个排序落点**（都在对应 sink 的 **sealSink 之后**）：

| sink | 排序时机 |
|---|---|
| 顶层 `primitives` | `resolvePendingPaths(rootPaths)` + 顶层 sealSink 之后、返回 Scene 之前 |
| 每个 scope 的 `innerSink` | `resolvePendingPaths(innerPaths)` + innerSink sealSink 之后、构造 `GroupPrim`（赋 `children`）之前 |

> 实现期：A 在「构造 GroupPrim / 返回 Scene 前」已把内部类型收窄成 `Array<ScenePrimitive>`，本段把 `stableSortByZIndex(...)` 紧接那次收窄之后即可。若 A 把 sealSink 抽成函数，则在其返回值上排序；若 sealSink 是原地断言（同数组引用），则在断言之后对该数组原地排序。
>
> 嵌套 scope 自然递归：内层 scope 先排自己的 `innerSink` → 被包成 GroupPrim 进外层 `innerSink` → 外层再排（该 group 按其 `scope.zIndex ?? 0` 参与）。**跨 group 不比较**——与 SVG `<g>` 局部 stacking context 一致。

#### zIndex 已知交互

- **scope 整体 vs scope 内部是两层**：`scope.zIndex` 排的是 scope 的 GroupPrim 在父层的位置；scope 内子元素的 `zIndex` 排的是它们在 `innerSink` 内的位置。互不影响——给 scope 设 `zIndex` 不会改变内部子元素的相对栈序，反之亦然。
- **transformed scope + zIndex 的部分失效**（A hoist 限制的延伸）：transformed scope 内的 path 被 hoist 到顶层、按它**自己**的 `zIndex` 在顶层排——**不跟随**所属 scope 的 `zIndex`。即给一个 transformed scope 设 `zIndex` 只挪它的 GroupPrim（含其内 node），但 hoist 出去的 path 不被一起抬。这是 A hoist 限制的延续，ADR 显式承认。
- **transformed scope 内 path 仍 hoist 到顶层**（A 锁定的限制）：这类 path 的 zIndex 在**顶层** primitives 内排序，不在其所属 scope 内。一条带 `zIndex` 的 transformed-scope path 会按该值落进顶层栈序——这是 hoist 的延续，不是新 bug，ADR 中显式承认。
- zIndex 只在"会发 primitive 的 IR 子节点之间"生效；**单个带文本 Node 内部** shape / text / label 的栈叠顺序固定（在 group 内按 emit 顺序），不受 zIndex 影响。

### B-2 带文本 Node 输出始终包 `<g>`

现状 `emitNodePrimitives`（`compile/node.ts:437-451`）**仅** `rotateDeg !== 0` 时把 shape + text + label 包进 GroupPrim；不旋转时平铺一组兄弟 prim。改为 **`layout.lines` 非空（即 Node 有文本）就包**，无文本的纯几何 Node 维持平铺。

`compile/node.ts:437-451` 改为：

```ts
const needsGroup = layout.rotateDeg !== 0 || layout.lines !== undefined;
if (!needsGroup) return inner;
const group: GroupPrim = { type: 'group', children: inner };
if (layout.rotateDeg !== 0) {
  group.transforms = [
    {
      kind: 'rotate',
      degrees: round(layout.rotateDeg),
      cx: round(layout.rect.x),
      cy: round(layout.rect.y),
    },
  ];
}
return [group];
```

需在 `compile/node.ts` 顶部 import 补 `GroupPrim`（当前第 4 行从 `'../primitive'` 已 import `ScenePrimitive, TextLine, Transform`，追加 `GroupPrim`）。

- 无旋转的文本 Node → group **不带** `transforms` 字段；`renderPrim` 经 `buildTransform(undefined)` → `<g>` 无 transform 属性（已验证 `transform-builder.ts:14` 对 undefined / 空数组回 undefined）。
- 纯几何 Node（`lines === undefined`，无 rotate）→ 维持回 `inner` 平铺，无新增 DOM 层。
- **不**在本段加 `data-node-id` / `GroupPrim.meta`——留未来（见 §已拍板取舍）。

**与 zIndex 协同**：带文本 Node emit 成单个 group → B-1 排序把整节点当一个 stacking 单位（一次 `zIndexOf.set(group, z)`）。纯几何 / 仅 label 的 Node 仍多 prim 平铺，靠共享 zIndex 的稳定排序保持成组。

### B-3 Node label `rotate`

#### schema（`NodeLabelSchema` 加两个可选字段，零破坏）

`packages/core/src/ir/node.ts` `NodeLabelSchema`（`font` 之后）：

```ts
rotate: z
  .union([z.enum(['none', 'radial', 'tangent']), z.number()])
  .optional()
  .describe(
    'Rotate the label text around its own center. `none` (default) = horizontal; `radial` = along the node-center→label-center direction; `tangent` = radial + 90°; a number = explicit degrees (screen y-down: 0° = +x, 90° = +y). Only changes text orientation, not placement.',
  ),
keepUpright: z
  .boolean()
  .optional()
  .describe(
    'When true, flips the rotated label 180° if it would otherwise read upside-down (more than 90° from upright). Default false (strict geometric angle).',
  ),
```

#### NodeLabelLayout 透传（`compile/node.ts:103-115`）

```ts
export type NodeLabelLayout = {
  // ...既有字段...
  /** label 文本自旋模式（none / radial / tangent / 数字角度）；缺省 = 不旋转 */
  rotate?: 'none' | 'radial' | 'tangent' | number;
  /** 自旋后若文字倒置则翻 180°；缺省 false */
  keepUpright?: boolean;
};
```

`layoutNode` 的 label 标准化（`compile/node.ts:312-326`）末尾补 `rotate: lab.rotate` / `keepUpright: lab.keepUpright`。

#### emit：把 label TextPrim 包进只含它的 rotate group

`compile/node.ts:415-436` label 循环改：先算 label 中心 `[lx, ly]`（既有 `labelCenter`），算自旋角度，0 度直接 push TextPrim、非 0 度包一层绕 `[lx, ly]` 的 rotate GroupPrim：

```ts
if (layout.labels) {
  const cx = layout.rect.x;
  const cy = layout.rect.y;
  for (const lab of layout.labels) {
    const [lx, ly] = labelCenter(layout, lab);
    const textPrim: ScenePrimitive = {
      type: 'text',
      x: round(lx),
      y: round(ly),
      lines: [{ text: lab.text }],
      fontSize: lab.fontSize,
      fontFamily: lab.fontFamily,
      fontWeight: lab.fontWeight,
      fontStyle: lab.fontStyle,
      align: 'middle',
      baseline: 'middle',
      lineHeight: round(lab.fontSize * DEFAULT_LINE_HEIGHT_FACTOR),
      fill: lab.textColor ?? 'currentColor',
      opacity: lab.opacity ?? layout.opacity,
      measuredWidth: 0,
      measuredHeight: round(lab.fontSize),
    };
    const deg = resolveLabelRotateDeg(lab, lx, ly, cx, cy);
    if (deg === 0) {
      inner.push(textPrim);
    } else {
      inner.push({
        type: 'group',
        transforms: [{ kind: 'rotate', degrees: round(deg), cx: round(lx), cy: round(ly) }],
        children: [textPrim],
      });
    }
  }
}
```

新增 helper（`compile/node.ts` 模块私有）：

```ts
const RAD_TO_DEG = 180 / Math.PI;

/**
 * 算 label 文本自旋角度（度，屏幕 y-down）
 * @description radial = atan2(label中心 − node中心)；tangent = radial + 90；number = 原值；none/缺省 = 0。
 *   keepUpright 时把"偏离正立 > 90°"的角度翻 180° 保阅读方向。
 */
const resolveLabelRotateDeg = (
  lab: NodeLabelLayout,
  lx: number,
  ly: number,
  cx: number,
  cy: number,
): number => {
  const mode = lab.rotate;
  if (mode === undefined || mode === 'none') return 0;
  let deg: number;
  if (typeof mode === 'number') {
    deg = mode;
  } else {
    const radial = Math.atan2(ly - cy, lx - cx) * RAD_TO_DEG;
    deg = mode === 'tangent' ? radial + 90 : radial;
  }
  if (lab.keepUpright) {
    const norm = ((deg % 360) + 360) % 360; // [0, 360)
    if (norm > 90 && norm < 270) deg += 180;
  }
  return deg;
};
```

> **⚠️ rotated Node 上的坐标空间是硬前置（见 §待定 0）**：`labelCenter`（`compile/node.ts:162`）经 `anchorOf` → `shapeDef.anchor(layout.rect, ...)` → `rect.anchor` 走 `localToWorld(r, ...)`，对 `layout.rect.rotate !== 0` 的节点返回**已旋转的世界坐标**。当前 emit 把 label（含自旋 group）放进 `inner`，`inner` 又被 Node 外层 rotate group 包一层 → label **位置会被绕 node center 再旋转一次**（与 §衡量标准"位置不变"相左，且是 alpha.5（旧）之前就存在的 latent 行为）。
>
> 对**不旋转的 Node**（`rect.rotate === 0`，`localToWorld` 退化为恒等）无此问题，本段设计成立。**旋转 Node 的 label 坐标空间必须在 ADR 先拍板**（推荐：`labelCenter` 改用 axis-aligned rect 算**局部坐标**，让位置与自旋都进 `inner`、由外层 Node rotate group 统一旋转——顺带修掉双重旋转），再实施 B-3 的 emit 改动。radial / tangent 的方向向量取 `[lx, ly] − [cx, cy]`：在 ADR 选定坐标空间内方向自洽。

---

## 改动清单

### A. compile IR 顺序回归（`packages/core/src/compile/compile.ts`，走 Spec-First TDD，**red**）

| 改动 | 位置 | 说明 |
|---|---|---|
| `PendingPath` 加 `slot?` 字段 | `compile.ts:127-134` | 记回填目标 sink + 占位 marker（内部类型） |
| 占位类型 + 构造 | `compile.ts`（模块私有） | `PathPlaceholder` + `InternalScenePrimitive` + `makePathPlaceholder()`；公开 `ScenePrimitive` 不变 |
| Pass 1 path 分支 push 占位 | `compile.ts:351-361` | `chain` 空 → push 占位并记 `slot`；非空 → 照旧只入 accumulator |
| `resolvePendingPaths` 改回填 | `compile.ts:187-205` | 有 `slot` → `splice` 替换（失败移除占位）；无 `slot` → 维持 push 顶层 |
| scope 内 resolve 时机硬约束 | `compile.ts:335` 附近 | `resolvePendingPaths(innerPaths)` 早于 `isPrunable` 判定 |
| sealSink：末端无残留断言 + 收窄 | 构造 `GroupPrim` / 返回 `Scene` 前 | dev 递归断言无 `path-placeholder` 残留，收窄回 `Array<ScenePrimitive>` |
| 注释订正 | `compile.ts:183` / `:353` | 「一律 push 顶层」改为「`chain` 空回填本层 sink、非空才 hoist」 |

### B. IR / schema（`packages/core`）

| 改动 | 位置 | 说明 |
|---|---|---|
| `NodeSchema` 加 `zIndex` | `ir/node.ts` `label` 字段后 | `z.number().int().finite().optional()` |
| `PathSchema` 加 `zIndex` | `ir/path/path.ts` `drawOpacity` 后 / `children` 前 | 同上，describe 改 path |
| `ScopeSchema` 加 `zIndex` + `IRScope` 类型同步 | `ir/scope.ts` `resetStyle` 后 / `children` 前 + 手写 `IRScope` type | scope 整体作 stacking 单位；`IRScope` 是手写类型须一并加 `zIndex?: number` |
| `NodeDefaultSchema` / `PathDefaultSchema` omit 加 `zIndex` | `ir/scope.ts:19-25` / `:31-36` | zIndex 不进 every-X 默认通道（定位非样式）；`.strict()` 拒 `nodeDefault.zIndex` |
| `NodeLabelSchema` 加 `rotate` + `keepUpright` | `ir/node.ts:72` `font` 后 | union enum + number / boolean |

### B. compile（`packages/core`）

| 改动 | 位置 | 说明 |
|---|---|---|
| `emitNodePrimitives` 带文本包 `<g>` | `compile/node.ts:437-451` | `needsGroup = rotateDeg !== 0 \|\| lines !== undefined` |
| `emitNodePrimitives` label rotate | `compile/node.ts:415-436` | label TextPrim 包进绕自身中心的 rotate group |
| `resolveLabelRotateDeg` + `RAD_TO_DEG` | `compile/node.ts` 模块私有 | radial / tangent / number / keepUpright |
| `NodeLabelLayout` 加 `rotate` / `keepUpright` | `compile/node.ts:103-115` | 透传字段 |
| `layoutNode` label 标准化补 `rotate` / `keepUpright` | `compile/node.ts:312-326` | 从 IR label 透传 |
| import 补 `GroupPrim` | `compile/node.ts:4` | 末端构造 group 用 |
| `zIndexOf` Map | `compile/compile.ts` compileToScene 顶部 | primitive → zIndex（key 仅 real ScenePrimitive） |
| node 分支 tag zIndex | A 改造后的 node push 处 | push 时 `zIndexOf.set(prim, child.zIndex)` |
| scope 分支 tag zIndex | A 构造 scope GroupPrim、`sink.push(group)` 之后 | `zIndexOf.set(group, child.zIndex)`；scope 整体一个单位 |
| `PendingPath` 加 `zIndex?` | 与 A 的 `slot?` 并列 | raw `child.zIndex` |
| path 分支记 `pending.zIndex` | A 的占位 push 处 | **不给占位打标**（占位非 `ScenePrimitive`） |
| `resolvePendingPaths` 复制 zIndex 到 real prim | A 改造后的 slot/hoist 分支 | splice 后 / hoist push 后给 real prim 打标；占位永不入 `zIndexOf` |
| `stableSortByZIndex` helper | compileToScene 内 | decorate-sort；签名收 `Array<ScenePrimitive>` |
| 顶层排序 | 顶层 sealSink 之后、返回 Scene 之前 | `stableSortByZIndex(primitives)` |
| scope `innerSink` 排序 | innerSink sealSink 之后 / `GroupPrim` 构造前 | `stableSortByZIndex(innerSink)` |

### B. React（`packages/react`）

| 改动 | 位置 | 说明 |
|---|---|---|
| `NODE_FIELDS` 加 `'zIndex'` | `kernel/_fields.ts:7-37` | **互锁强制**：不加 `_NodeFieldsCheck` TS 编译失败 |
| `PATH_FIELDS` 加 `'zIndex'` | `kernel/_fields.ts:51-66` | **互锁强制**：同上 |
| `SCOPE_FIELDS` 加 `'zIndex'` | `kernel/_fields.ts:80-96` | **互锁强制**：不加 `_ScopeFieldsCheck` TS 编译失败 |
| `NodeProps` 加 `zIndex?` | `kernel/Node.tsx:89` 附近 | JSDoc 注明栈序语义 |
| `PathProps` 加 `zIndex?` | `kernel/Path.tsx:40` 附近 | 同上 |
| `ScopeProps` 加 `zIndex?` | `kernel/Scope.tsx:45` 附近 | `zIndex?: IRScope['zIndex']`；JSDoc 注明 scope 整体栈序 |
| unbuilder **path 分支**加 `zIndex: child.zIndex` | `kernel/unbuilder.ts:114-131` | path 分支手写字段、**不走 PATH_FIELDS**，必须手补 |

> **node / scope round-trip 自动**：`nodePropsFromIR`（`unbuilder.ts:14`）/ `buildNodeFromProps`（`builder.ts:103`）走 `pickDefined(_, NODE_FIELDS)`；`scopePropsFromIR`（`unbuilder.ts:146`）/ `buildScopeFromProps`（`builder.ts:293`）走 `pickDefined(_, SCOPE_FIELDS)`——加进字段表即两端同步。**唯独 path 例外**：unbuilder path 分支是手写 createElement、不走 PATH_FIELDS，须手补 `zIndex`（见上）。**label rotate 自动**：`label` 整体透传（`builder.ts:111` / `unbuilder.ts:18`），`rotate` / `keepUpright` 随 `IRNodeLabel` 进出，React 端零改动。

### 不动

- `emitPathPrimitive`（`compile/path/index.ts`）/ path 端点坐标系 / `NameStack` / scope frame push-pop / `resolvePendingPaths(innerPaths)` 调用时机（保留 ADR-02 inside-out lookup 语义）/ `isPrunable` 判据——zIndex 仅在 compile 层 tag + sealSink 后排序，path 几何不感知。
- `renderPrim` / `transform-builder` / `buildPathD`——已支持无 transform 的 `<g>` 与 rotate group，渲染端零改动。
- AST 解析器白名单 / `composeSystem` system prompt——**本段不加新组件**（zIndex / rotate 都是既有 Node / Path / label 上的新 prop），组件白名单不变（白名单扩张在 alpha.5 sugar）。

### 零破坏性确认

- **A 部分**：纯 compile 内部管线修复，无 schema / 类型 / 导出变化；transformed scope 内 path 的 Scene 输出与改造前逐字节相等。
- **B 部分**：新字段全 `optional`、加在既有 schema 末尾；**zIndex 子功能未使用时排序恒等**。**本段相对 A 唯一的既有输出变化** = 带文本 Node 多包一层 `<g>`（有意改造，刷快照）；纯几何 Node、未用 zIndex 的图 Scene 输出不变。

---

## 实现拆分（Spec-First TDD，每步 red → green → 验证；**不自动 commit**）

> **commit 流程**（遵 AGENTS / 本仓库 commit 规则）：AI **不**自动提交。每步走 `red → green → 跑全量验证`，完成后**汇总改动 + 给出 stage 建议**，由用户当次明确下令后再执行 `git add` / `commit`（逐条确认，一次授权 ≠ 永久授权）。下列步骤不含自主 commit。

**先 A（基线、可独立验收），再 B。**

1. **A 占位类型 + 回填**：`compile.ts` 加 `PathPlaceholder` / `InternalScenePrimitive` / `makePathPlaceholder()`，放宽 `processChildren` 内部类型；`PendingPath.slot`；Pass 1 path 分支按 `chain` 空 push 占位；`resolvePendingPaths` `indexOf`+`splice` 回填；scope prune 前先 resolve；sealSink 末端断言 + 收窄；注释订正。`z-order.test.ts`（已存在、red）转 green。
2. **B schema 扩字段**：`ir/node.ts`（NodeSchema.zIndex + NodeLabelSchema.rotate/keepUpright）、`ir/path/path.ts`（PathSchema.zIndex）、`ir/scope.ts`（ScopeSchema.zIndex + 手写 `IRScope` 同步 + `NodeDefaultSchema`/`PathDefaultSchema` 的 omit 加 `zIndex`）。
3. **B React 字段表 + props + unbuilder**：`_fields.ts` 三表（NODE/PATH/SCOPE_FIELDS）加 `'zIndex'`（互锁立即逼着改）、`Node.tsx` / `Path.tsx` / `Scope.tsx` props、`unbuilder.ts` path 分支补 `zIndex`（node/scope 走字段表自动）。`cd packages/react && npm run test:run` 确认 round-trip 与互锁过。
4. **B 带文本 Node 包 `<g>`**：改 `emitNodePrimitives` 末端 `needsGroup`；先写 `node-group-wrap.test.ts`（red），green 后刷受影响快照。
5. **（B-3 ADR 前置）拍板 rotated-node label 坐标空间**（见 §待定 0），再做 label rotate：`NodeLabelLayout` + `layoutNode` 透传 + `resolveLabelRotateDeg` + emit 包 group；先写 `node-label-rotate.test.ts`（red，含坐标空间不漂移断言）。
6. **B zIndex tag + 排序**：`zIndexOf` Map + node 分支打标 + **scope 分支打标** + `PendingPath.zIndex` + `resolvePendingPaths` 复制到 real prim + `stableSortByZIndex` + 两落点（sealSink 之后）；先写 `z-index.test.ts`（red，含 scope-整体排序 + nodeDefault 拒 zIndex 守卫）。建在步骤 1 的占位/sealSink 之上。
7. **回归 + 刷快照**：core / react 全量 `test:run`，`-u` 刷带文本节点快照；逐项 review snapshot diff（应只多 `<g>` 包裹层 / 排序变化）。
8. **文档**：Node / Path component page 加 `zIndex` 段、Node label 文档加 `rotate` / `keepUpright` 段、schema reference 校对。
9. **收尾**：汇总全部改动 + 测试结果，给用户 review；用户确认后再按 commit 规则提交。

---

## 验收

### A：回归（既有测试零破坏）

- `cd packages/core && npm run test:run` 全绿；重点盯 `scope.test.ts` / `scope-bbox.test.ts` / `scope-namespace.test.ts` / `path.test.ts` / `path-e2e-snapshot.test.ts` / `shape-baseline-snapshot.test.ts`。
- transformed scope 内 path 的 Scene 输出与改造前**逐字节相等**（hoist 行为 + 全局坐标不变）；测试名 / 注释标明这是已知限制而非完整 z-order 修复。
- `z-order.test.ts`（已存在、red）转 green：覆盖顶层 / transform-free scope 内 node·path 交错声明序、占位回填边界、解析失败占位移除、transformed scope path hoist 锁定、占位无泄漏。

### B：新增测试

**`packages/core/tests/compile/z-index.test.ts`**（zIndex 排序）：

```ts
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { GroupPrim, ScenePrimitive } from '../../src/primitive';

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });
const node = (position: [number, number], zIndex?: number): IR['children'][number] => ({
  type: 'node', position, ...(zIndex !== undefined && { zIndex }),
});
const line = (to: [number, number], zIndex?: number): IR['children'][number] => ({
  type: 'path', ...(zIndex !== undefined && { zIndex }),
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to },
  ],
});
const silent = { onWarn: () => {} };

describe('compile zIndex 稳定排序', () => {
  it('高 zIndex 的 path 排到所有默认 0 的 node 之后', () => {
    const ir = scene([node([0, 0]), line([10, 0], 5), node([20, 0])]);
    expect(compileToScene(ir, silent).primitives.map(p => p.type)).toEqual(['rect', 'rect', 'path']);
  });

  it('负 zIndex 排到默认 0 之前', () => {
    const ir = scene([node([0, 0]), line([10, 0], -1)]);
    expect(compileToScene(ir, silent).primitives.map(p => p.type)).toEqual(['path', 'rect']);
  });

  it('同 zIndex 保持 IR 顺序（稳定）', () => {
    const ir = scene([line([10, 0], 1), node([0, 0], 1), line([20, 0], 1)]);
    expect(compileToScene(ir, silent).primitives.map(p => p.type)).toEqual(['path', 'rect', 'path']);
  });

  it('全部缺省 zIndex 时输出顺序 = IR 顺序（恒等）', () => {
    const ir = scene([node([0, 0]), line([10, 0]), node([20, 0])]);
    expect(compileToScene(ir, silent).primitives.map(p => p.type)).toEqual(['rect', 'path', 'rect']);
  });

  it('scope 内独立排序，不跨 group 比较', () => {
    const ir = scene([
      node([100, 0], 9),
      { type: 'scope', children: [node([0, 0]), line([10, 0], 5), node([20, 0])] },
    ]);
    const result = compileToScene(ir, silent);
    expect(result.primitives.map(p => p.type)).toEqual(['group', 'rect']);
    const group = result.primitives.find((p): p is GroupPrim => p.type === 'group')!;
    expect(group.children.map(p => p.type)).toEqual(['rect', 'rect', 'path']);
  });

  it('scope.zIndex 让整组作为一个单位在父层排序', () => {
    // scope（含一个 node）默认会排在 z=0 的兄弟之间；给 scope zIndex=5 → 整组浮到末尾
    const ir = scene([
      node([0, 0]),
      { type: 'scope', zIndex: 5, children: [node([10, 0], 0)] },
      node([20, 0]),
    ]);
    const result = compileToScene(ir, silent);
    // scope 的 group（z=5）排到两个顶层 node（z=0）之后
    expect(result.primitives.map(p => p.type)).toEqual(['rect', 'rect', 'group']);
  });

  it('scope.zIndex 不影响 scope 内部子元素的相对栈序', () => {
    const base = { type: 'scope' as const, children: [node([0, 0]), line([10, 0], 5), node([20, 0])] };
    const withZ = scene([{ ...base, zIndex: 3 }]);
    const withoutZ = scene([base]);
    const innerOf = (ir: IR) => {
      const g = compileToScene(ir, silent).primitives.find((p): p is GroupPrim => p.type === 'group')!;
      return g.children.map(p => p.type);
    };
    // 内部 ['rect','rect','path']（line z=5 排到两 node 之后），与 scope 是否有 zIndex 无关
    expect(innerOf(withZ)).toEqual(['rect', 'rect', 'path']);
    expect(innerOf(withZ)).toEqual(innerOf(withoutZ));
  });
});
```

> **schema 守卫（同文件或 schema 测试）**：`nodeDefault: { zIndex: 1 }` / `pathDefault: { zIndex: 1 }` 应被 `ScopeSchema` 拒（`.strict()` + omit zIndex）——zIndex 不是可继承样式，加一条 `expect(() => ScopeSchema.parse({ type:'scope', nodeDefault:{ zIndex:1 }, children:[] })).toThrow()` 守卫。

**`packages/core/tests/compile/node-group-wrap.test.ts`**（带文本 Node 包 `<g>`）：

```ts
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });
const silent = { onWarn: () => {} };

describe('emitNodePrimitives：带文本 Node 包 <g>', () => {
  it('带文本 Node → 单个 GroupPrim（无旋转时无 transform）', () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: 'A' }]);
    const prims = compileToScene(ir, silent).primitives;
    expect(prims).toHaveLength(1);
    expect(prims[0].type).toBe('group');
    if (prims[0].type !== 'group') throw new Error('expected group');
    expect(prims[0].transforms).toBeUndefined();
    expect(prims[0].children.map(c => c.type)).toEqual(['rect', 'text']);
  });

  it('纯几何 Node（无文本）→ 平铺，不包 group', () => {
    const ir = scene([{ type: 'node', position: [0, 0] }]);
    expect(compileToScene(ir, silent).primitives.map(p => p.type)).toEqual(['rect']);
  });

  it('带文本 + 旋转 Node → group 带 rotate transform', () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: 'A', rotate: 45 }]);
    const prims = compileToScene(ir, silent).primitives;
    expect(prims[0].type).toBe('group');
    if (prims[0].type !== 'group') throw new Error('expected group');
    expect(prims[0].transforms?.[0]).toMatchObject({ kind: 'rotate', degrees: 45 });
  });
});
```

**`packages/core/tests/compile/node-label-rotate.test.ts`**（label 自旋）：

```ts
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { GroupPrim, ScenePrimitive, TextPrim } from '../../src/primitive';

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });
const silent = { onWarn: () => {} };

/** 找包住指定文本 label 的 rotate group（深度优先） */
const findLabelRotateGroup = (prims: Array<ScenePrimitive>, text: string): GroupPrim | undefined => {
  for (const p of prims) {
    if (p.type === 'group') {
      const onlyChild = p.children.length === 1 ? p.children[0] : undefined;
      if (
        onlyChild?.type === 'text' &&
        onlyChild.lines.some(l => (typeof l === 'string' ? l : l.text) === text) &&
        p.transforms?.some(t => t.kind === 'rotate')
      ) {
        return p;
      }
      const nested = findLabelRotateGroup(p.children, text);
      if (nested) return nested;
    }
  }
  return undefined;
};

describe('Node label rotate', () => {
  it('rotate 缺省 / none → label 不包 rotate group', () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: 'A', label: { text: 'L' } }]);
    expect(findLabelRotateGroup(compileToScene(ir, silent).primitives, 'L')).toBeUndefined();
  });

  it('rotate 数字 → label 包绕自身中心的 rotate group', () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: 'A', label: { text: 'L', position: 'right', rotate: 30 } }]);
    const g = findLabelRotateGroup(compileToScene(ir, silent).primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;
    if (rot.kind !== 'rotate') throw new Error('expected rotate');
    expect(rot.degrees).toBe(30);
    const txt = g.children[0] as TextPrim;
    expect(rot.cx).toBe(txt.x);
    expect(rot.cy).toBe(txt.y);
  });

  it("radial：position='right'（+x 方向）→ 角度 ≈ 0", () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: 'A', label: { text: 'L', position: 'right', rotate: 'radial' } }]);
    const g = findLabelRotateGroup(compileToScene(ir, silent).primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;
    if (rot.kind !== 'rotate') throw new Error('expected rotate');
    expect(rot.degrees).toBeCloseTo(0);
  });

  it("tangent = radial + 90：position='right' → ≈ 90", () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: 'A', label: { text: 'L', position: 'right', rotate: 'tangent' } }]);
    const g = findLabelRotateGroup(compileToScene(ir, silent).primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;
    if (rot.kind !== 'rotate') throw new Error('expected rotate');
    expect(rot.degrees).toBeCloseTo(90);
  });

  it("keepUpright：position='left'（radial≈180）翻 180 → ≈ 0", () => {
    const ir = scene([{ type: 'node', position: [0, 0], text: 'A', label: { text: 'L', position: 'left', rotate: 'radial', keepUpright: true } }]);
    const g = findLabelRotateGroup(compileToScene(ir, silent).primitives, 'L')!;
    const rot = g.transforms!.find(t => t.kind === 'rotate')!;
    if (rot.kind !== 'rotate') throw new Error('expected rotate');
    const norm = ((rot.degrees % 360) + 360) % 360;
    expect(Math.min(norm, 360 - norm)).toBeCloseTo(0);
  });
});
```

> 既有 `node-label.test.ts` 的 `findLabel` 已递归进 group，带文本节点新包的外层 `<g>` 与 label rotate group 都被它穿透，**这些用例应零改动通过**——是 label 改造不破坏既有定位算法的守卫。

**必补：rotated Node + label 位置不漂移（不变量测试，承接 §待定 0）**——同一 label（如 `position: 'right', distance: 10`）分别放在 `rotate: 0` 与 `rotate: θ` 的 Node 上，把 label TextPrim 坐标**经其外层 group transform 还原到世界坐标**后，旋转版必须等于"非旋转版 label 世界坐标绕 node center 旋转一次 θ"——即**只旋转一次，无双重旋转**。具体期望值随 §待定 0 选定的坐标空间确定；但"单次旋转 / 无漂移"不变量与 ADR 方案无关，B-3 必须覆盖。当前 emit 会让此测试 red，正是要修的目标。

### B：React round-trip

- `kernel` round-trip 测试加：Node `zIndex` / Path `zIndex` / **Scope `zIndex`** / label `rotate` + `keepUpright` 经 `buildIR` → `convertIRToReactNode` → `buildIR` 字段保持（重点验 path zIndex 不被 unbuilder 手写分支漏掉；scope zIndex 走 SCOPE_FIELDS 自动）。
- `render` snapshot：带文本 `<Node>` 的 SVG 现在多一层 `<g>`，`-u` 刷新并 review。

### 闭环

- alpha.1 全部测试通过 + 上述新测试全绿；注释 `compile.ts:183` / `:353` 与新行为一致；
- 未用 zIndex 的图（除文本节点 `<g>` 包裹）Scene 输出不变；
- 为 alpha.5 sugar 派发的 Path 提供可用的 `zIndex` 表达力（sugar 透传 Path zIndex 即生效）。

---

## 待定（实施 / ADR 前拍板）

0. ~~**【硬前置，B-3】rotated Node 上 label 的坐标空间**~~ ✅ **已在 [ADR-04](.//04-node-label-rotate.md) 拍板（选 A）**：`labelCenter` 改用 axis-aligned rect 算局部坐标，label 位置 + 自旋都进 `inner`、由外层 Node rotate group 统一旋转一次——顺带修掉"rotated Node label 位置被绕 node center 转两次"的 latent bug。**这是行为修正**：rotated-Node + label 的快照会变（不旋转 Node 零变化），变更日志须显式声明。B-3 emit 改动可按此实施。
1. **A：transformed scope 内 path 的 z-order**：维持 hoist 到顶层末尾（最小修复，保 transform 正确性）。彻底方案（path 端点改 scope 局部坐标）留未来段；B 的 `zIndex` 只覆盖部分 stacking 诉求。
2. **keepUpright 翻转阈值边界**：当前用 `90 < norm < 270` 翻 180°（恰好 90° / 270° 即垂直时不翻）。边界归属（≥90 还是 >90）影响临界外观，ADR 敲定。
3. **`GroupPrim.meta`（`data-node-id` 钩子）**：本段**不做**；是否顺手加 `meta?: Record<string,string>` 让 `<g>` 挂 `data-node-id` / `data-node-shape`，留独立 ADR / 未来段（避免本段 schema 扩面）。
4. **Node 自身 `rotate` 与 label `rotate` 组合语义**：当前是"label 自旋 group 嵌在 inner、inner 再被 Node rotate group 包"——视觉上两角度叠加。是否需要 label "相对屏幕固定朝向"选项，ADR 评估（倾向不加，YAGNI）。
5. **是否给"仅有 label、无 text"的 Node 也包 `<g>`**：当前 `needsGroup` 只看 `lines`。是否扩成 `lines !== undefined || labels !== undefined`，ADR 拍板（倾向维持只看 lines）。

## 已拍板取舍

1. **A 占位类型表达**：内部 union 放宽（`InternalScenePrimitive`）+ 末端递归断言 + 返回前收窄（sealSink）。改动面最小、不污染公开 `ScenePrimitive`。
2. **A transformed scope 内 path 维持 hoist**：最小回归修复，保 transform 正确性；彻底修复留未来段。
3. **zIndex 不进 NodeLayout / 不经样式解析**：纯排序字段，compile 层从 raw `child.zIndex` 读、用 `Map<ScenePrimitive, number>` 旁路记录、sealSink 后稳定排序；占位永不入 Map。
4. **稳定排序 + 同值 IR 顺序**：`decorate-sort`（带原始下标）保证全 0 键恒等、同值保序。
5. **跨 group 不比较**：scope `innerSink` 与顶层 `primitives` 各自独立排序，与 SVG `<g>` 局部 stacking context 一致。
6. **Node / Path / Scope 都加 zIndex，Coordinate 不加**：判据是"会发 primitive 的 IR child"——Node / Path / Scope（emit 一个 GroupPrim）都是 stacking 单位，对称地给 zIndex；Coordinate 不发 primitive，无栈序意义。Scope 的 `zIndex` 排的是它整体（GroupPrim）在父层的位置、不影响内部子元素的相对栈序（两层独立，等价 CSS 嵌套 stacking context）。
7. **zIndex 不进 every-X 默认通道**：`NodeDefaultSchema` / `PathDefaultSchema` 的 `.omit()` 排除 `zIndex`——zIndex 是定位/结构而非可继承样式，"every node 默认 z=N"语义混乱且少用；`.strict()` 拒 `nodeDefault.zIndex`。
8. **带文本才包 `<g>`**（非无条件全包）：纯几何 Node 维持极简平铺；带文本 = 语义化节点，给 DOM 边界 + stacking 单位。`layout.lines` 为判据。
9. **label rotate 中心 = label 自身中心 `[lx, ly]`**：位置仍由 `position` / `distance` 决定，`rotate` 只改朝向。**注意**：旋转 Node 上 `[lx, ly]` 取局部还是世界坐标由 §待定 0 决定，未拍板前不实施 B-3 emit。

## 设计 ADR（位置 `notes/decisions/core/v0/v0.2/alpha.4/`）

- **A：IR 顺序回归** —— [`01-ir-order-regression.md`](.//01-ir-order-regression.md) 已落（占位槽回填、transform-free frame 范围、transformed-scope path hoist 限制、内部 placeholder 类型收窄）。
- **B：emit 层增强** —— 已落（同目录，编号续 01 之后）：
  - [`02-explicit-zindex.md`](.//02-explicit-zindex.md)：显式 zIndex（Node / Path / Scope 都加、Coordinate 不加；scope-整体 vs 内部两层独立；zIndex 不进 every-X 默认通道；占位不入 `zIndexOf`、排序在 sealSink 后；transformed-scope path 及其 zIndex hoist 限制）。
  - [`03-text-node-group-wrap.md`](.//03-text-node-group-wrap.md)：带文本 Node 包 `<g>`（判据 `layout.lines` + 无旋转 group 无 transform + 不加 `data-node-id`）。
  - [`04-node-label-rotate.md`](.//04-node-label-rotate.md)：label `rotate`（四模式 + keepUpright + radial/tangent 角度定义）；**核心决策 = rotated-Node label 坐标空间（§待定 0）选 A：`labelCenter` 改 axis-aligned 局部坐标，顺带修双重旋转**——已在该 ADR 拍板。
