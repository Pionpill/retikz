# ADR-02：显式 zIndex（Node / Path / Scope 栈序覆盖，compile 末端稳定排序）

- 状态：Proposed
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.4 plan §B-1](../../../plans/v0/v0.2-alpha.4.md) · [v0 roadmap §显式 z-index 提案](../../../plans/v0/roadmap.md#显式-z-index-提案) · [本 milestone ADR-01 IR 顺序回归](./01-ir-order-regression.md)（提供 IR 顺序基线 + sealSink 对接点）· [DESIGN.md §1.2 AI 一等公民](../../../architecture/DESIGN.md)

## 背景

v0.1 rc.2 起、经 alpha.4-A（[ADR-01](./01-ir-order-regression.md)）回归后，渲染 z-order **严格 = IR 顺序 = JSX 顺序**——compile 按声明序发 primitive，SVG / Canvas 两个 renderer 都无原生 z-index，只能靠 primitive 排列顺序。

问题：JSX 顺序与"我希望谁在上"经常不一致。

- 用户为了让某条边 / 某个标签浮到最上，把对应 `<Node>` / `<Path>` 挪到 mdx / JSX 末尾——破坏了"按逻辑分组书写"的阅读结构。
- "标签永远在最上""底纹永远在最下"这类跨元素的稳定层级诉求，用纯顺序表达很脆（插一个元素就要重排）。
- TikZ 本身没有 z-index（它就是绘制顺序），但 retikz 跑在浏览器、面向 AI 生成——给一个**显式、声明式**的栈序覆盖比"让 AI 算好顺序再按序生成"更稳。

alpha.4-A 已把 IR 顺序基线修回来，"先按 IR 顺序、再按 zIndex 覆盖"这条算法的前提（稳定的 IR 顺序）才成立，故本 ADR 在同段紧随其后。

## 选项

### A. Node / Path / Scope 加可选 `zIndex`，compile 末端（sealSink 后）旁路稳定排序（**推荐**）

```ts
// schema：三处加同一字段（Coordinate 不加——不发 primitive）
NodeSchema  = z.object({ /* ... */ zIndex: z.number().int().finite().optional() })
PathSchema  = z.object({ /* ... */ zIndex: z.number().int().finite().optional() })
ScopeSchema = z.object({ /* ... */ zIndex: z.number().int().finite().optional() })

// compile：旁路 Map 记录，不写进 primitive 本体
const zIndexOf = new Map<ScenePrimitive, number>();
// 每个 IR child emit 出的 real primitive 打标 child.zIndex
// sealSink（占位回填 + 收窄回 ScenePrimitive[]，见 ADR-01）后对该 sink 稳定排序：
const stableSortByZIndex = (arr: Array<ScenePrimitive>): void => {
  const decorated = arr.map((prim, index) => ({ prim, index, z: zIndexOf.get(prim) ?? 0 }));
  decorated.sort((a, b) => a.z - b.z || a.index - b.index); // 同值按原下标 = 稳定
  for (let i = 0; i < arr.length; i++) arr[i] = decorated[i].prim;
};
```

- zIndex 是**纯渲染顺序**，不参与 layout / 几何 / 文本度量 → 不进 `NodeLayout`、不经 `resolveNodeStyle` / `resolveEffectivePath`，直接从 raw `child.zIndex` 读。
- 排序在 compile 完成、**renderer 零改动**——SVG / Canvas 都按 scene 顺序画，看到的就是最终顺序，一套接口覆盖两个 renderer。
- 旁路 `Map<ScenePrimitive, number>` 而非写进 primitive：Scene 输出保持纯净（不多一个 `zIndex` 噪声字段），AI 序列化 / JSON Patch / 快照都不被污染。
- 解决了诉求，代价是引入"两套 z 决定路径"（IR 顺序 + zIndex）；用默认 `zIndex=0=IR 顺序` 把心智负担压到"只有显式声明才走 zIndex"。

### B. zIndex 写进 Scene primitive 本体，renderer 排序

```ts
type RectPrim = { /* ... */ zIndex?: number }   // 每种 primitive 都加
// renderer 渲染前按 zIndex 排序
```

- 缺：**污染 Scene 公开契约**——每个 primitive 多一个排序字段，AI 看到的 IR / Scene JSON 多噪声；两个 renderer 各自实现一遍排序（重复 + 易漂移）；排序逻辑下放到渲染端，与"compile 是唯一布局真源"的架构相悖。相比 A 无任何收益。

### C. 不加 zIndex，纯靠 IR / JSX 顺序（维持现状）

- 缺：表达力不足——"标签永远最上 / 底纹永远最下"只能靠挪 JSX；alpha.5 的 Grid 底纹 sugar 也更想要一个声明式 sink-to-bottom 手段。本 ADR 的整个动机就是补这个缺口。

## 决策：A

理由：

1. **renderer 零改动、compile 唯一真源**：排序在 compile 末端完成，SVG / Canvas / 未来 PDF 全部自动受益，不在渲染端各写一遍。
2. **不污染 Scene / IR 契约**：旁路 Map 记录、sealSink 后排序，Scene primitive 本体不多字段，AI 一等公民（可序列化、无噪声）不受触碰。
3. **建在 ADR-01 之上、零额外管线**：复用 ADR-01 的 sealSink 收窄点——占位回填完、类型收窄回 `ScenePrimitive[]` 之后排序，天然避开"占位被当普通 prim 排序"。
4. **默认 0 = IR 顺序 = 恒等**：未用 zIndex 的图输出逐字节不变（稳定排序全 0 键 = 不改顺序），零破坏性。

## 待决策点

> 选项 A 已选，以下为选项内细节，全部拍板。

- **谁有 zIndex**：Node / Path / **Scope** 都加（都发 primitive：Node→shape/text/group、Path→path/arrow、Scope→一个 GroupPrim）；**Coordinate 不加**（不发 primitive，无栈序意义）。
- **Scope 的 zIndex 语义**：作用于 scope 的 **GroupPrim 整体**在父层的位置（与兄弟 node / path 同尺排序）；**不影响** scope 内部子元素的相对栈序（内部子元素在 `innerSink` 内各自按 zIndex 独立排）。两层独立，等价 CSS 嵌套 stacking context。
- **zIndex 不进 every-X 默认通道**：`NodeDefaultSchema` / `PathDefaultSchema` 由 `NodeSchema.omit(...)` / `PathSchema.omit(...)` 派生——给 NodeSchema/PathSchema 加 zIndex 会让 `nodeDefault` / `pathDefault` 顺带吃到它。zIndex 是**定位/结构**而非可继承样式，"every node 默认 z=N"语义混乱且少用，故在两处 `.omit({...})` 加 `zIndex: true` 排除；`.strict()` 拒 `nodeDefault: { zIndex }`。
- **同 zIndex 内排序**：稳定 + 保持 IR 顺序（decorate-sort 带原始下标），**不**按几何（左→右 / 上→下）。
- **跨 group 不比较**：每个 scope 的 `innerSink` 与顶层 `primitives` 各自独立排序——与 SVG `<g>` 局部 stacking context 一致；想跨 group 上层就别用 group 包（特性，非 bug）。
- **占位永不入 `zIndexOf`**：`PathPlaceholder`（ADR-01）不是 `ScenePrimitive`；zIndex 只挂回填后的 real prim，排序只在 sealSink 之后。
- **transformed scope 内 path 的 zIndex**：这类 path 被 ADR-01 hoist 到顶层、按它自己的 zIndex 在**顶层**排——不跟随所属 scope 的 zIndex（即给 transformed scope 设 zIndex 不会把 hoist 出去的 path 一起抬）。这是 ADR-01 hoist 限制的延续，本 ADR 显式承认、不修。

## DSL 表面

> 顶层容器用当前 API `<TikZ>`（`<TikZ>` → `<Layout>` 重命名属 alpha.6，不在本段；本 ADR 示例按当前可运行 API 写）。

```tsx
<TikZ>
  {/* 底纹永远在最下：声明在哪都行，zIndex 决定栈序 */}
  <Path zIndex={-10} stroke="#eee"> {/* grid lines */} </Path>

  <Node id="a" position={[0, 0]} text="A" />
  <Node id="b" position={[4, 0]} text="B" />
  <Path><Step kind="move" to="a" /><Step kind="line" to="b" /></Path>

  {/* 这条强调边浮到所有节点之上，不必挪到 JSX 末尾 */}
  <Path zIndex={10} stroke="red"><Step kind="move" to="a" /><Step kind="line" to="b" /></Path>

  {/* 整个高亮分组作为一个单位压在上层 */}
  <Scope zIndex={5} stroke="orange"> {/* ...一组元素... */} </Scope>
</TikZ>
```

## 测试设计

`packages/core/tests/compile/z-index.test.ts` 覆盖：

- 顶层 node / path 按 zIndex 升序、负值前置、同值稳定保 IR 顺序、全缺省恒等
- scope 整体按 `scope.zIndex` 在父层排序；scope.zIndex 不影响内部相对序；scope 内部子元素按各自 zIndex 在 group 内独立排（不跨 group）
- transformed scope 内 path hoist 到顶层、按自身 zIndex 在顶层排（限制锁定）
- schema 守卫：`nodeDefault.zIndex` / 非整数 / 非有限 被拒

具体 case 见"实现契约 § 测试象限"。

## 影响

- **`packages/core/src/ir/node.ts`**：`NodeSchema` 加 `zIndex`。
- **`packages/core/src/ir/path/path.ts`**：`PathSchema` 加 `zIndex`。
- **`packages/core/src/ir/scope.ts`**：`ScopeSchema` 加 `zIndex` + 手写 `IRScope` 类型同步加 `zIndex?: number`；`NodeDefaultSchema` / `PathDefaultSchema` 的 `.omit()` 加 `zIndex: true`。
- **`packages/core/src/compile/compile.ts`**：加 `zIndexOf` Map；node / scope 分支 push 后打标；`PendingPath` 加 `zIndex?`、path 分支记录、`resolvePendingPaths` 回填时复制到 real prim；加 `stableSortByZIndex`，在顶层与每个 scope 的 sealSink 之后调用。
- **`packages/react/src/kernel/_fields.ts`**：`NODE_FIELDS` / `PATH_FIELDS` / `SCOPE_FIELDS` 加 `'zIndex'`（互锁强制）。
- **`packages/react/src/kernel/{Node,Path,Scope}.tsx`**：props 加 `zIndex?`。
- **`packages/react/src/kernel/unbuilder.ts`**：path 分支手写 createElement，须手补 `zIndex: child.zIndex`（node / scope 走字段表自动）。
- **不动**：`renderPrim` / 两个 renderer（按 scene 顺序画）；`emitPathPrimitive` 端点坐标系；Scene primitive 公开类型（zIndex 走旁路 Map，不进 primitive）。
- **文档站**：Node / Path / Scope component page 加 `zIndex` 段（栈序语义 + scope 两层 + 默认 0）；schema reference 同步。
- **零破坏**：新字段全 optional；未用时输出恒等。

## 不在本 ADR 范围

- **transformed scope 内 path 的完整 z-order**：ADR-01 已锁的 hoist 限制；彻底方案（path 端点改 scope 局部坐标）留未来坐标系 ADR。本 ADR 的 zIndex 对这类 hoist path 只能在顶层层面覆盖。
- **`GroupPrim.meta` / `data-node-id` 钩子**：与 zIndex 无关，留未来。
- **带文本 Node 包 `<g>`** → [ADR-03](./03-text-node-group-wrap.md)；**Node label rotate** → [ADR-04](./04-node-label-rotate.md)。本段三件 emit 增强各自独立 ADR。

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/ir/**`（Node/Path/Scope schema + IRScope 类型）+ `packages/core/src/compile/**`（compile.ts 排序）。
- 跨级取最高 = red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/src/ir/node.ts` | 加 | `zIndex`（NodeSchema） | `z.number().int().finite().optional()` | — (compile 视为 0) | 同层 IR 子节点间显式栈序，大者在上，缺省 = 源序，同值稳定，per-group 局部 |
| `packages/core/src/ir/path/path.ts` | 加 | `zIndex`（PathSchema） | `z.number().int().finite().optional()` | — | 同上（措辞 path） |
| `packages/core/src/ir/scope.ts` | 加 | `zIndex`（ScopeSchema）+ 手写 `IRScope` 同步 | `z.number().int().finite().optional()` | — | scope 整体作 stacking 单位在父层的栈序；不影响 scope 内部相对序 |
| `packages/core/src/ir/scope.ts` | 改 | `NodeDefaultSchema` / `PathDefaultSchema` 的 `.omit()` 加 `zIndex: true` | — | — | zIndex 不进 every-X 默认通道（定位非可继承样式） |

### 文件 scope

- `packages/core/src/ir/node.ts`（修改：NodeSchema.zIndex）
- `packages/core/src/ir/path/path.ts`（修改：PathSchema.zIndex）
- `packages/core/src/ir/scope.ts`（修改：ScopeSchema.zIndex + IRScope + 两 Default omit）
- `packages/core/src/compile/compile.ts`（修改：zIndexOf + 打标 + PendingPath.zIndex + 回填复制 + stableSortByZIndex + 两落点）
- `packages/core/tests/compile/z-index.test.ts`（新建）
- `packages/react/src/kernel/_fields.ts`（修改：三表加 'zIndex'）
- `packages/react/src/kernel/{Node,Path,Scope}.tsx`（修改：props）
- `packages/react/src/kernel/unbuilder.ts`（修改：path 分支补 zIndex）
- `packages/react/tests/kernel/**`（修改：round-trip 覆盖 zIndex）
- `apps/docs/src/contents/**`（修改：Node / Path / Scope 文档 + schema reference）

偏离白名单需加条目自注解或开新 ADR。

> 既有快照（`shape-baseline-snapshot` / `path-e2e-snapshot` / react render）若因排序产生变化须逐条核对——未用 zIndex 的图应零变化（稳定排序恒等），变化只应来自显式用 zIndex 的 demo。

### 测试象限

`packages/core/tests/compile/z-index.test.ts`，≥ 9 case：

**Happy path（≥ 3）**：

- `top_path_high_zindex_to_back`：`[node, path(z=5), node]` → `['rect', 'rect', 'path']`
- `top_negative_zindex_to_front`：`[node, path(z=-1)]` → `['path', 'rect']`
- `same_zindex_stable_ir_order`：`[path(z=1), node(z=1), path(z=1)]` → `['path', 'rect', 'path']`
- `scope_as_unit_sorts_in_parent`：`[node, scope(z=5){node}, node]` → `['rect', 'rect', 'group']`

**边界（≥ 2）**：

- `all_default_zindex_identity`：`[node, path, node]` 全缺省 → `['rect', 'path', 'rect']`（= IR 顺序，恒等）
- `single_element_zindex_noop`：单个 `node(z=99)` → `['rect']`（排序不报错、不改）

**错误路径（≥ 2）**：

- `node_default_rejects_zindex`：`ScopeSchema.parse({ type:'scope', nodeDefault:{ zIndex:1 }, children:[] })` → throw（strict + omit）
- `non_integer_zindex_rejected`：`NodeSchema.parse({ ..., zIndex: 1.5 })` → throw（`.int()`）；`zIndex: Infinity` → throw（`.finite()`）

**交互（≥ 2）**：

- `scope_internal_independent_of_scope_zindex`：同一 scope 子树，有无 `scope.zIndex` 时 `GroupPrim.children` 序相同（scope.zIndex 不渗入内部）
- `scope_inner_zindex_within_group_only`：`scope{node, path(z=5), node}` → `GroupPrim.children` = `['rect','rect','path']`，且顶层另一 `node(z=9)` 不与 group 内比较
- `transformed_scope_path_zindex_at_top`：`scope(transforms)[node, path(z=2)]` → path hoist 到顶层、按 z=2 在顶层排，不进该 scope 的 group（限制锁定）

### 依赖的现有元素

- `packages/core/src/compile/compile.ts` 的 `PendingPath` / `processChildren` / `resolvePendingPaths` / sealSink —— **扩展**：ADR-01 的占位机制之上加 zIndex 打标 + 排序。
- `packages/core/src/ir/scope.ts` 的 `NodeDefaultSchema` / `PathDefaultSchema` —— **修改**：omit 加 zIndex。
- `packages/react/src/kernel/_fields.ts` 的 `NODE_FIELDS` / `PATH_FIELDS` / `SCOPE_FIELDS` 互锁 —— **扩展**：加 'zIndex'，互锁逼着两端同步。
- `packages/react/src/kernel/unbuilder.ts` path 分支 —— **修改**：手写字段，须手补（已知不走字段表）。
- `packages/core/src/primitive` 的 `ScenePrimitive` —— **仅引用**：作 `zIndexOf` 的 key 类型；公开 union 不改。
- [本 milestone ADR-01](./01-ir-order-regression.md) —— **强依赖**：sealSink 是排序对接点；占位不入 zIndexOf。
