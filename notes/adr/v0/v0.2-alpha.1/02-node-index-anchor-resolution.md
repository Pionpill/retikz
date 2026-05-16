# ADR-02：nodeIndex / anchor 跨 scope 解析语义

- 状态：Proposed
- 决策日期：2026-05-16
- 关联：[v0.2-alpha.1 plan](../../../plans/v0/v0.2-alpha.1.md) · [本 milestone ADR-01](./01-scope-ir-and-compile.md) · [本 milestone ADR-03](./03-scope-id-bounding-box.md) · [alpha.5 ADR-03 (arrow geometry)](../v0.1-alpha.5/03-path-arrow-detail.md)

## 背景

v0.1 的 nodeIndex 是全局扁平 `Map<string, NodeLayout>`：

- ID 命名空间**全局唯一**——`<Node id="A">` 在 IR 中唯一
- path / position 引用 `'A'` / `'A.north'` / `'A.30'` 时直接查表
- anchor 解析在**节点局部坐标系**计算（`rect.anchor()` / `circle.anchor()` / 数字角度 `boundaryPoint()`），再返回**节点已布局后的世界坐标**——因为 v0.1 没有 scope，节点 layout 本身就是世界坐标
- 同 id 冲突 → compile **throw**（strict 模式）

引入 `<Scope>`（ADR-01）后，**四个语义都需要明确**：

1. **ID 命名空间结构**：scope 是否引入局部命名空间？`<Scope><Node id="A">` 与外层 `<Node id="A">` 是冲突还是分离？支持 opt-in 隔离吗？
2. **anchor 解析坐标系**：scope 内 node 的 `.north` 是局部还是全局？
3. **id 冲突的处理策略**：strict（throw）还是宽容（warn + last-wins）？
4. **跨 frame lookup**：当 scope 划出 local namespace 后，内部引用如何解析？支持 shadowing 外层吗？

ADR-01 决策"Pass 1 累积 transform 算全局坐标 + Scope.localNamespace opt-in 字段"——nodeIndex 改为**栈式 namespace frame**——这个前提决定了本 ADR 的多数选项已被约束。本 ADR 把剩余决策点固化。**scope.id 字段本身（schema）在 ADR-01 定义；scope.id 触发的 bbox 注册行为单独在 ADR-03 处理**——本 ADR 只关心"namespace stack 数据结构、跨 frame lookup 规则、duplicate-id 处理策略"。

## 选项

### A. 栈式 namespace frame + 默认全局扁平 + `localNamespace` opt-in 边界 + 同 frame duplicate 走 warn + last-wins（**推荐**）

- **数据结构**：nodeIndex 从 `Map<string, NodeLayout>` 改为 `NameStack`——栈底是 `<TikZ>` 根 frame，每遇 `<Scope localNamespace>` push 新 frame，退出时 pop
- **默认行为**（`localNamespace` 缺省 false）：scope 不 push frame，子 node / coordinate / 嵌套 scope.id 全部注册到栈顶现有 frame；多层 scope 串起来子树 id 仍汇到 `<TikZ>` 根 frame——**与 TikZ pgf 默认 + v0.1 行为一致**
- **opt-in 边界**（`localNamespace: true`）：scope push 自己的 frame；子节点 id 注册到此 local frame、退出后 frame pop 不向父合并 → 外部不可见
- **scope.id 始终注册到父 frame**：scope.id 是 scope 的外部句柄，不受自身 localNamespace 影响——在父 frame 注册（与上一层的命名空间共存）
- **lookup 规则**：path / position referent 按字符串 id 解析时，**从当前 frame 起 inside-out 搜索 NameStack**；命中第一个匹配 frame 返回——内部可见外部 id（shadowing），外部不可见内部 id
- **duplicate id 同 frame**：注册时若当前 frame 已有同 id → **不抛错**、发 `DUPLICATE_NODE_ID` warn（通过 CompileWarning.onWarn）、用**后写入的覆盖**（last-wins 语义）——与 TikZ "同名 node 后定义覆盖前定义"行为一致
- **跨 frame 同 id**：不算 duplicate（shadowing 是正常语义），不 warn
- anchor 解析仍走 ADR-01 的 layout 全局坐标，与 frame 无关

**实现要点**：
- `NameStack` 是新数据结构（`packages/core/src/compile/name-stack.ts`），暴露 `register(id, layout)` / `lookup(id): NodeLayout | undefined` / `pushFrame()` / `popFrame()`，内部维护 `Array<Map<string, NodeLayout>>`
- 编译 Pass 1 / Pass 2 调用 nodeIndex 的所有点改为 `nameStack.register` / `nameStack.lookup`
- scope.id 注册：进入 scope 时**先 register scope.id 到当前栈顶 frame**（其实是父 frame，因为还没 push），**然后**若 localNamespace=true 才 pushFrame
- **数字角度 `.30` 在 rotate 下的语义**：anchor 角度是 shape **局部坐标系**的极角，layout 的 `rotateDeg` 已折平进 rect → boundaryPoint 用 rect 的旋转感知投影；scope rotate 进一步累积到 `rect.rotate` 上。即"node 角度 + scope 角度"叠加到 rect.rotate，shape 内部不感知（与 alpha.5 ADR-01 的"layout 阶段折平 rotate"一致）

### B. scope 引入强制局部 ID 命名空间（"foo.A" 风格 qualified name）

- nodeIndex key 改为 qualified path：`'A'` / `'inner.A'` / `'outer.inner.A'`
- 用户引用时也用 qualified name；同名 scope 内可独立
- 优：子图复用（同样的 scope 模板复制多次，每次内部 id 同名不冲突）
- 缺：所有引用语法都变；前向引用规则复杂化；schema describe / LLM friendly 大幅下降；用户得理解 scope 路径概念；与 TikZ 默认行为不一致

### C. scope 内 id 自动加前缀但暴露原名（"alias"）

- IR 内部存 qualified name，但用户写的引用字符串还是 short name
- 解析时按"当前 scope 优先 → 向上找"
- 优：子图复用 + 用户接口不变
- 缺：解析时多义性（`'A'` 究竟是哪个？）；调试困难；规则边角多

### D. 全局扁平 + strict（throw on duplicate，**v0.2 alpha.1 初版方案**）

- 与 v0.1 完全一致；duplicate 抛错
- 缺：不支持子图复用 / 模板复用；duplicate 必须用户手改、不能宽容；与 TikZ "同名覆盖" 不一致

## 决策：A（栈式 namespace frame + opt-in localNamespace + warn + last-wins）

理由：

1. **TikZ 对齐 + v0.1 兼容**：默认行为（`localNamespace` 缺省 false）= 全局扁平 = v0.1 行为；duplicate warn + last-wins 与 TikZ pgf 行为一致（pgf 同名 node 后定义覆盖前定义，不报 error）；用户 v0.1 代码 0 改动可跑
2. **opt-in 隔离**：用户需要子图复用 / 模板时显式 `<Scope localNamespace>` 即可；不破坏默认 LLM-friendly 单一引用语法
3. **最上层 = 真正全局**：嵌套 scope 时只有 `<TikZ>` 根 frame 是全局；中间 scope 各自 sub-frame——与"namespace boundary 由用户控制"心智一致
4. **last-wins + warn 比 throw 更宽容**：duplicate id 是常见 LLM 生成 / 模板复制 bug，warn 让 compile 仍能跑出可用结果（debug 友好），用户可选 `onWarn` 升级为 error
5. **shadowing 是自然语义**：内层引用外层 id 是常见跨 scope 模式（如 path 端点跨 scope）——与 lexical scoping 直觉一致

## 决策细节

> 选项 A 锁后，13 项细节均拍板：

1. **NameStack API**：`pushFrame()` / `popFrame()` / `register(id, layout, irPath): void` / `lookup(id): NodeLayout | undefined`；内部 `Array<Map<string, NodeLayout>>`，栈底是 `<TikZ>` 根 frame
2. **scope 入场 / 出场顺序**：
   - **进入 scope**：先用**当前栈顶 frame** register scope.id（如有）→ 然后若 `localNamespace: true` 则 `pushFrame()`
   - **scope 子树 Pass 1**：在当前栈顶 frame 处理子节点 register / 子 scope 递归
   - **退出 scope**：若 push 过则 `popFrame()`；scope.id 留在父 frame
3. **duplicate id 同 frame**：`register(id, ...)` 检测当前栈顶 frame 已有同 id → 发 `DUPLICATE_NODE_ID` warning（通过 `CompileOption.onWarn`，含两条 IR locator），**用新 layout 覆盖**旧的（last-wins）；**不抛错**
4. **duplicate id 跨 frame**：shadowing 不算 duplicate，**不 warn**；lookup 时内层 frame 优先返回（与 lexical scoping 一致）
5. **scope.id 始终注册到父 frame**：与 localNamespace 无关；scope.id 是外部句柄
6. **ID 检测时机 = compile**：register / lookup 时检测；不在 schema 层（zod 无法跨树验证 id 唯一性）
7. **DUPLICATE_NODE_ID warning 消息**：包含两个 id 出现位置的 IR locator（jq-like 路径，如 `'children[0].scope.children[2].node.id'` 与 `'children[3].node.id'`）+ 当前 frame 深度（如 `frame depth: 2 (under <Scope localNamespace>)`），便于调试
8. **scope 内 coordinate id 同样进当前栈顶 frame**：与 node.id 同等对待（无特殊）
9. **anchor 解析在 scope rotate 下的数值精度**：rect 4 角已支持 `rotate` 字段（alpha.5 ADR-01），scope rotate 累积到 `rect.rotate`；数字角度 `.30` 仍由各 shape 的 `boundaryPoint(rect, polarFrom)` 处理——shape 内部不感知 scope，全部由 layout 阶段折平（与 alpha.5 ADR-01 "shape 不感知 rotate" 原则一致）
10. **forward-reference 在 scope 内的语义**（v0.1 规则延续）：
    - 内层 scope node A 引用外层（**前面**已 register）node B —— **允许**（A 在树遍历顺序晚于 B）
    - 外层 node 引用内层（**前面**已 register 的）scope 内 node —— **允许**（NameStack.lookup 在 Pass 2 时 frame 已 pop，但跨 scope 引用须在 push frame 期 register 时已注册到当前栈顶 frame ——`localNamespace: true` 时 inner-scope id 不向父传播，外层 Pass 2 引用会触发 `UNRESOLVED_NODE_REFERENCE` warn）
    - 同 scope 内 node A 引用**后**定义的 node B —— **拒绝**（Pass 1 register 时序未到，与 v0.1 前向引用一致）
11. **跨-Pass register / lookup 角色**：
    - **Pass 1**：唯一允许 `nameStack.register` 的阶段（layout 计算源头）
    - **Pass 2**：`nameStack.lookup` only，禁止 register（防御性：调试期 register 一律抛 internal error）
    - 实现：NameStack 内部加 `phase: 'pass1' | 'pass2'` 状态，pass2 期 register 调用直接抛 internal error
12. **DUPLICATE_NODE_ID warn 调用策略 = 每次都 warn**（不合并）：同 frame 同 id 第 N 次注册时第 N - 1 次发 warn（first register 不 warn）；N 个重复定义共发 N - 1 条 warn。理由：每条 warn 含独立 IR locator，方便用户定位每个重复声明点；合并会丢中间位置信息
13. **anchor 解析缓存**（性能 + 行为一致性）：
    - **缓存层**：`packages/core/src/compile/anchor-cache.ts`（**新建**）—— 用 `WeakMap<NodeLayout, Map<string, IRPosition>>` 存"层 anchor 结果"，key = anchor 字符串（keyword 如 `'north'` / 数字角度 `'30'` / `'-45'` 等）
    - **API**：`resolveAnchor(layout: NodeLayout, anchorName: string): IRPosition`——封装现有 `rect.anchor()` / `circle.anchor()` / `ellipse.anchor()` / `diamond.anchor()` / `boundaryPoint(layout, polar)` 等分支，先查 cache 再算
    - **缓存生命周期**：layout 在 Pass 1 register 后不可变 → 缓存对单次 compile 全程有效；compile 结束 NameStack / layout 引用释放 → WeakMap 自动 GC
    - **替换面**：`compile/path/*.ts` 内现有 anchor 解析点全部走 `resolveAnchor`；`resolvePosition` 涉及 anchor 的也走同一缓存
    - **跨 scope anchor 一致性**：layout.rect 已是全局坐标（ADR-01 Pass 1 累积），anchor 结果也是全局坐标——缓存内容不随当前 frame 变化（layout 引用是 cache key，stable）
    - **不缓存内容**：NameStack.lookup 自身的"id → layout"映射 = O(stack depth) 已经够快，无需额外缓存；resolvePosition 的 polar / at / offset 涉及多个 layout 组合 → 中间结果不缓存（每次 resolve 一次性算）

## 待决策点

> 选项 A 已锁，13 项决策细节全部拍板；本 ADR 范围内**无遗留待决策点**。alpha.1 实施期可能新增的小细节：

- **anchor cache 在 hot reload / 多 instance 场景**：开发期同一 IR 多次 compile 是否复用 cache？倾向**不复用**——每次 compileToScene 都新建 NameStack + WeakMap，避免跨 compile 状态泄漏；如需跨 compile 优化（如 React StrictMode 双调用）再开新 ADR

## DSL 表面

```tsx
// 跨 scope anchor 引用：外层 path 用 scope 内 node 的 .north
<TikZ>
  <Scope transforms={[{ kind: 'translate', x: 100, y: 0 }]}>
    <Node id="hub" position={[0, 0]}>hub</Node>
  </Scope>
  <Node id="ext" position={[0, 50]}>ext</Node>
  <Path arrow="->">
    <Step kind="move" to="ext.south" />
    <Step to="hub.north" /> {/* hub.north 投影到全局坐标系 = (100, -hubHalfHeight) */}
  </Path>
</TikZ>

// 数字角度跨 scope rotate：scope rotate 30 度 + node 自身 rotate 15 度，引用 .45
<TikZ>
  <Scope transforms={[{ kind: 'rotate', degrees: 30 }]}>
    <Node id="X" position={[50, 0]} rotate={15}>X</Node>
  </Scope>
  <Path>
    <Step kind="move" to={[0, 0]} />
    <Step to="X.45" /> {/* 在 X 局部坐标系下 .45 → boundaryPoint；layout.rotate=45 (15+30) 已折平 */}
  </Path>
</TikZ>

// duplicate id 同 frame：warn + last-wins（不抛错）
<TikZ>
  <Node id="dup" position={[0, 0]}>first</Node>
  <Scope>  {/* localNamespace 缺省 false → 不 push frame */}
    <Node id="dup" position={[10, 0]}>second</Node> {/* ⚠️ DUPLICATE_NODE_ID warn；nodeIndex "dup" 取 second */}
  </Scope>
  {/* path `to="dup"` → 命中 second */}
</TikZ>

// localNamespace：scope 创建本地 frame，子 id 不冲突
<TikZ>
  <Node id="A" position={[0, 0]}>outer-A</Node>
  <Scope localNamespace>
    <Node id="A" position={[10, 0]}>inner-A</Node>  {/* 不冲突，shadowing；no warn */}
    <Path>
      <Step kind="move" to="A" />  {/* lookup 命中 inner-A（栈顶 frame） */}
    </Path>
  </Scope>
  <Path>
    <Step kind="move" to="A" />  {/* lookup 命中 outer-A（根 frame） */}
  </Path>
</TikZ>

// scope.id 始终注册到父 frame（与 localNamespace 无关）
<TikZ>
  <Scope id="cluster" localNamespace>
    <Node id="A" position={[0, 0]}>inner-A</Node>
  </Scope>
  <Path>
    <Step kind="move" to="cluster.north" />  {/* ✓ cluster 在根 frame */}
    {/* <Step to="A" />  ❌ UNRESOLVED_NODE_REFERENCE，A 在 cluster 内 frame */}
  </Path>
</TikZ>

// 嵌套 localNamespace：内层 frame inside-out lookup
<TikZ>
  <Node id="root-anchor" position={[0, 0]}>root</Node>
  <Scope localNamespace>
    <Node id="L1-node" position={[50, 0]}>L1</Node>
    <Scope localNamespace>
      <Node id="L2-node" position={[100, 0]}>L2</Node>
      <Path>
        <Step kind="move" to="root-anchor" />  {/* lookup L2 → L1 → root frame 找到 */}
        <Step to="L1-node" />                  {/* lookup L2 → L1 frame 找到 */}
        <Step to="L2-node" />                  {/* lookup L2 frame 找到 */}
      </Path>
    </Scope>
  </Scope>
  {/* L1-node / L2-node 在根 frame 不可见 */}
</TikZ>

// 同 frame 同 id 跨 scope.id 也走 warn + last-wins
<TikZ>
  <Scope id="X">  {/* X 注册到根 frame */}
    <Node position={[0, 0]}>foo</Node>
  </Scope>
  <Node id="X" position={[100, 0]}>node-X</Node>  {/* ⚠️ DUPLICATE_NODE_ID warn；nodeIndex "X" 取 node-X */}
</TikZ>

// scope 内 node 通过 polar.origin 引用 scope 外 node（前向规则正常）
<TikZ>
  <Node id="hub" position={[0, 0]}>hub</Node>
  <Scope transforms={[{ kind: 'translate', x: 100, y: 0 }]}>
    <Node id="orbit" position={{ origin: 'hub', angle: 0, radius: 30 }}>
      orbit {/* hub 全局 (0,0)、polar 算后 (30, 0)、scope translate 后 (130, 0) */}
    </Node>
  </Scope>
</TikZ>
```

## 测试设计

`packages/core/tests/compile/scope-anchor.test.ts`（新建）+ 扩 `packages/core/tests/compile/scope.test.ts`（ADR-01 已建）覆盖：

- 跨 scope id 引用 path target / position.of
- 跨 scope anchor `.north` / `.east` / `.south-west` 等关键字
- 跨 scope 数字角度 `.30` / `.0` / `.90` / `.180` / `.270`
- 跨 scope rotate 复合的数字角度
- id 冲突检测（同层 / 跨 scope / coordinate vs node / scope.id vs node.id）
- 前向引用 vs 后向引用（scope 内 / 跨 scope）

具体 case 拆分见下面"实现契约 § 测试象限"。

## 影响

- **`packages/core/src/compile/name-stack.ts`**（**新文件**）：`NameStack` 类，封装栈式 frame 注册 / 查找；接受 `onWarn` 回调以发 DUPLICATE_NODE_ID；内部 `phase` 状态强制 Pass 1 register-only / Pass 2 lookup-only
- **`packages/core/src/compile/anchor-cache.ts`**（**新文件**）：`resolveAnchor(layout, anchorName): IRPosition` + `WeakMap<NodeLayout, Map<string, IRPosition>>` 缓存层；统一封装现有 rect / circle / ellipse / diamond anchor + boundaryPoint 数字角度分发
- **`packages/core/src/compile/compile.ts`**（修改）：把 `nodeIndex: Map<string, NodeLayout>` 改为 `nameStack: NameStack`；Pass 1 递归进 scope 时按"先 register scope.id → 再判断 localNamespace decide push frame"顺序；duplicate detection 从 throw 改为 warn + 覆盖
- **`packages/core/src/compile/compile.ts`** `CompileWarning.code`（修改）：加 `'DUPLICATE_NODE_ID'`（**warning，非 throw**）
- **`packages/core/src/compile/node.ts`** `layoutNode` —— **签名小改**：`nodeIndex` 参数改为 `nameStack`；内部 `resolvePosition` 调用透传；layout 计算仍在 node 局部坐标系；scope transform 由 compile 层在 Pass 1 累积到最终 layout.rect 上（ADR-01）
- **`packages/core/src/compile/path/*.ts`** —— **签名小改**：path 解析查找 nodeIndex 的入口换成 `nameStack.lookup`；anchor 字符串解析（keyword + 数字角度）走 `resolveAnchor(layout, anchorName)` 统一入口（带 WeakMap cache），代替现有散落的 `rect.anchor()` / `boundaryPoint()` 直接调用
- **`packages/core/src/compile/position.ts`** `resolvePosition` —— **签名小改**：`nodeIndex` 参数换成 `nameStack`；polar.origin / at.of / offset.of lookup 走 `nameStack.lookup` 进行 inside-out 搜索；polar / at 涉及 anchor 时也通过 `resolveAnchor` 走缓存
- **测试**：core compile（跨 scope id / anchor / 数字角度 / id 冲突 last-wins / localNamespace 隔离 / 嵌套 frame shadowing / 前向引用 / anchor cache 命中率）；NameStack 独立单测；anchor-cache 独立单测；CompileWarning DUPLICATE_NODE_ID 收集
- **文档**：scope overview mdx 加"跨 scope 引用 + namespace 隔离"章节 + 6 个 demo
- **AGENTS.md**：加"namespace stack inside-out lookup + duplicate warn + last-wins + scope.id 父 frame 注册 + anchor cache 单一入口"四条规则

## 不在本 ADR 范围

- **scope 引入局部命名空间**（选项 B）：留待 v1+ domain template / 子图复用需求出现后另开 ADR
- **scope id alias**（选项 C）：同上
- **`scope.id` 触发的 bbox 注册 / synthetic layout 计算 / scope 作为引用目标的 anchor 语义** → [ADR-03](./03-scope-id-bounding-box.md)（本 ADR 只关心 id 冲突共享命名空间，不关心 scope.id 注册的具体内容）
- **scope rotate 下数字角度的"自由方向"语义**（TikZ `\anchorborder` 用户传入向量而非角度）：retikz `.30` 仍按"局部 polar 角度"解析；如需"任意世界方向"留待 v0.2 alpha.3 ShapeRegistry 重设计 anchor 时再议

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/compile/**`（Pass 1 加 id 冲突检测）
- 不动 schema / 不动公开 API
- 跨级取最高 = red（compile 改动）

### Schema 改动

无 IR schema 改动（本 ADR 仅 compile 内部数据结构 + warn 行为定义；schema `scope.id` / `scope.localNamespace` 字段加在 ADR-01）。

`CompileWarning.code` 加 `'DUPLICATE_NODE_ID'`（type 扩张，向后兼容因为 code 是开放 union `| (string & {})`）。

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/src/compile/compile.ts` | 加 code 字面量 | `CompileWarning.code` | 加 `'DUPLICATE_NODE_ID'` | — | 同 frame 内同名 id 重复 register（含 node × node、node × coordinate、node × scope.id 任意组合）；warn 后保留 last-wins layout |

### 文件 scope

- `packages/core/src/compile/name-stack.ts`（**新建**）：`NameStack` 类（pushFrame / popFrame / register / lookup / phase 状态）
- `packages/core/src/compile/anchor-cache.ts`（**新建**）：`resolveAnchor(layout, name): IRPosition` + WeakMap cache
- `packages/core/src/compile/compile.ts`（修改：`nodeIndex: Map` → `nameStack: NameStack`；Pass 1 进 scope 时 register scope.id → 判断 localNamespace push frame；duplicate 检测改为 warn + 覆盖；CompileWarning code 加 `DUPLICATE_NODE_ID`）
- `packages/core/src/compile/node.ts`（修改：`layoutNode` 签名参数换 nameStack；内部调用 resolvePosition 透传）
- `packages/core/src/compile/path/*.ts`（修改：path 解析查找点换为 `nameStack.lookup`）
- `packages/core/src/compile/position.ts`（修改：`resolvePosition` 签名参数换 nameStack；polar.origin / at.of / offset.of lookup 走 inside-out 搜索）
- `packages/core/tests/compile/name-stack.test.ts`（新建：NameStack 独立单测）
- `packages/core/tests/compile/anchor-cache.test.ts`（新建：anchor cache 命中 / WeakMap GC / 数字角度 + keyword 同 layout 不串扰）
- `packages/core/tests/compile/scope-anchor.test.ts`（新建）
- `packages/core/tests/compile/scope-namespace.test.ts`（新建：localNamespace 隔离 / 嵌套 / shadowing / last-wins）
- `packages/core/tests/compile/scope.test.ts`（扩 case，ADR-01 已建文件）
- `apps/docs/src/contents/core/components/tikz/scope/index.{en,zh}.mdx`（扩"跨 scope 引用 + namespace 隔离"章节）
- `apps/docs/src/contents/core/components/tikz/scope/anchor-cross.demo.tsx`（新建）
- `apps/docs/src/contents/core/components/tikz/scope/duplicate-id-warn.demo.tsx`（新建：演示 duplicate warn + last-wins）
- `apps/docs/src/contents/core/components/tikz/scope/local-namespace-basic.demo.tsx`（新建）
- `apps/docs/src/contents/core/components/tikz/scope/local-namespace-nested.demo.tsx`（新建）
- `apps/docs/src/contents/core/components/tikz/scope/local-namespace-shadowing.demo.tsx`（新建）
- `AGENTS.md`（修改：加 namespace stack lookup 规则 + duplicate warn + last-wins + scope.id 父 frame 注册）

### 测试象限

#### Happy path（≥ 3）

- `scope_anchor_north_cross`：scope translate(100,0) + 内 node A → 外层 path `to="A.north"` → 投影到全局 (100, A.north.y)
- `scope_anchor_numeric_cross`：scope rotate(45) + 内 node B → `to="B.30"` → 局部 polar 30 度 + scope rotate 45 → boundaryPoint 正确投影
- `scope_anchor_corner_cross_scale`：scope scale(2) + 内 node C → `to="C.east"` → east 点按 scale 拉伸
- `scope_polar_origin_cross_scope`：scope 内 node 用 polar.origin 引用外层 node → resolve 正确
- `scope_at_of_cross_scope`：scope 内 node 用 AtPosition.of 引用外层 node → 同上
- `scope_offset_of_cross_scope`：scope 内 node 用 OffsetPosition.of 引用外层 node → 同上
- `name_stack_basic_register_lookup`：NameStack 单测——register("A", layout) + lookup("A") → 命中
- `name_stack_push_pop_frame_isolated`：push frame、register("A") 进内层、pop frame、lookup("A") → undefined（内层 frame 已废弃）
- `name_stack_lookup_inside_out_shadowing`：根 frame register "A"、push frame、register "A" 内层、lookup "A" → 命中内层（栈顶优先）；pop 后 lookup "A" → 命中根
- `anchor_cache_hit_returns_same_reference`：resolveAnchor(layout, 'north') × 2 → 第二次返回**严格相等**的 IRPosition（cache 命中），非重算
- `anchor_cache_keyword_vs_numeric_isolated`：resolveAnchor(layout, 'north') + resolveAnchor(layout, '30') → 两个 cache key 互不串扰，各自正确
- `anchor_cache_different_layouts_isolated`：两 layout A / B，resolveAnchor(A, 'north') + resolveAnchor(B, 'north') → 两 WeakMap entry 各自一份缓存，互不串扰
- `anchor_cache_consistent_across_lookups`：path 引用 `A.north` 多次（同 IR 内多 path）→ resolveAnchor 第 2 次起命中 cache，结果与第 1 次完全相等

#### 边界（≥ 2）

- `scope_anchor_zero_size_node`：scope 内 node 文字空（0×0） → anchor 仍能解析（返回中心）
- `scope_anchor_at_origin_of_scope`：scope translate(0,0) → 等价无 transform，anchor 与无 scope 一致
- `scope_deep_nested_anchor`：5 层嵌套 scope，最内层 node anchor → 累积 transform 正确投影
- `name_stack_pop_empty_throws`：popFrame on empty stack（理论不应发生） → 抛 internal error（防御性）
- `name_stack_register_during_layout_pass2`：Pass 2 phase 试图 register → 抛 internal error（仅 Pass 1 允许 register）

#### 错误路径（≥ 2）

> 注：duplicate id **不再是 throw**——以下 case 是 warn + last-wins 行为，"错误路径"包含 warn 触发的场景。

- `duplicate_same_frame_two_nodes_warn_last_wins`：根 frame 两 node id="A"（first 在 [0,0]、second 在 [10,0]）→ 发 DUPLICATE_NODE_ID warn；nameStack.lookup("A") 命中 second
- `duplicate_same_frame_node_vs_coordinate_warn`：node id="A" + coordinate id="A" → warn；lookup 命中后定义的
- `duplicate_same_frame_node_vs_scope_id_warn`：node id="A" + `<Scope id="A">` → warn；lookup 命中后定义的（scope.id 注册到同 frame）
- `duplicate_same_frame_three_times_warn_each`：同 frame 三个 id="A" → warn × 2（第 2 / 第 3 次注册各 1 次 warn，**不合并**）；lookup 命中第三次；每条 warn 含独立 IR locator 区分位置
- `name_stack_register_returns_overwritten_flag`：NameStack.register 返回 boolean 标记是否覆盖（API 设计）→ duplicate 返回 true、新 id 返回 false
- `scope_anchor_reference_unknown_id`：path `to="ghost.north"` 但 ghost 未定义 → UNRESOLVED_NODE_REFERENCE warn + path 走 fallback（与 v0.1 一致）
- `scope_anchor_invalid_anchor_name`：path `to="A.invalid"` → ANCHOR_RESOLUTION_FAILED warn + fallback 到 center
- `scope_forward_ref_within_scope_rejected`：scope 内 node A polar.origin → 'B'、B 在 A 后定义同 scope 内 → 抛错（与 v0.1 前向引用规则一致）

#### 交互（≥ 2）

- `scope_with_rotate_node_inside_anchor`：scope rotate 30 + node rotate 15 + anchor `.45` → 两层 rotate 叠加进 layout.rotate，shape 内 polar 45 度 boundaryPoint
- `scope_with_at_position_and_anchor_chain`：scope 内 node B AtPosition `{ of: 'A', direction: 'right' }`、path 引用 `'B.south'` → 全链路解析
- `scope_with_polar_chain_cross_scope`：node A 在 scope1，node B polar.origin='A' 在 scope2、不同 transform → polar 解析后再 apply scope2 transform
- `scope_emit_group_prim_anchor_global`：Scene primitive 输出 GroupPrim 内 node primitive 在**局部**坐标；但 nodeIndex layout 是全局——两者一致性测试（无 drift）
- `local_namespace_isolates_internal_id`：外层 node id="A" + `<Scope localNamespace>` 内 node id="A" → 两个 frame 各自 register，**不 warn**；外层 path `to="A"` 命中外层；内层 path `to="A"` 命中内层
- `local_namespace_internal_can_reference_external`：内层 path `to="external-id"`（external-id 在外层 frame）→ inside-out lookup 命中
- `local_namespace_external_cannot_reference_internal`：外层 path `to="internal-id"`（internal-id 在 localNamespace scope 内）→ UNRESOLVED_NODE_REFERENCE warn
- `local_namespace_nested_3_levels_shadowing`：三层嵌套 localNamespace，每层都有 node id="A"；最内层 path `to="A"` 命中内层；中层 path `to="A"` 命中中层
- `scope_id_registered_in_parent_with_local_namespace`：`<Scope id="X" localNamespace>` 内多 node → "X" 在父 frame 注册（外部可见），内部 node id 仅 local frame（外部不可见）
- `duplicate_across_frames_no_warn`：外层 node id="A" + `<Scope localNamespace>` 内 node id="A" → 不算 duplicate（shadowing），**不发 warn**
- `local_namespace_at_translate_cross_frame_lookup`：scope at-translate `{of: 'rootNode'}` 在内层 localNamespace scope → lookup 走 inside-out 找到 rootNode（外层 frame）

### 依赖现有元素

- `packages/core/src/compile/compile.ts` 的 `nodeIndex` —— **结构变更**：`Map<string, NodeLayout>` → `NameStack`（包装栈 + frame 操作 + warn）
- `packages/core/src/compile/compile.ts` 的 `CompileWarning.code` —— **扩**：加 `DUPLICATE_NODE_ID`（**warning，非 throw**）
- `packages/core/src/compile/compile.ts` 的 `coordinateAsLayout` / `nodeIndex.set` 调用点 —— **签名换为 `nameStack.register`**：register 内部检查 duplicate 并发 warn
- `packages/core/src/compile/node.ts` 的 `layoutNode` —— **签名小改**：`nodeIndex` 参数换 `nameStack`；`NodeLayout.rect.rotate` 引用不变
- `packages/core/src/compile/path/*.ts` 的 path / anchor 解析 —— **签名小改**：lookup 入口换 `nameStack.lookup`；anchor 解析改走 `resolveAnchor(layout, name)` 统一入口（封装 rect / circle / ellipse / diamond / boundaryPoint 分支 + WeakMap cache）
- `packages/core/src/geometry/rect.ts` / `circle.ts` / `ellipse.ts` / `diamond.ts` 的 `anchor()` —— **引用 + 包装**：anchor-cache 内部按 layout.shape 分发到这些；不改 geometry 实现
- `packages/core/src/compile/node.ts` 的 `boundaryPoint(layout, polar)` —— **引用 + 包装**：数字角度 anchor 仍走 boundaryPoint；anchor-cache 统一进入 + 缓存结果
- `packages/core/src/compile/position.ts` 的 `resolvePosition` —— **签名小改**：参数换 `nameStack`；polar / at / offset.of lookup 走 inside-out 搜索；其余逻辑不变
- 本 milestone [ADR-01](./01-scope-ir-and-compile.md) —— **强依赖**：ADR-01 的 "Pass 1 累积 transform 算全局坐标" + `scope.id` / `scope.localNamespace` schema 字段是本 ADR 的前提
- 本 milestone [ADR-03](./03-scope-id-bounding-box.md) —— **互补**：本 ADR 处理 namespace stack + duplicate warn + scope.id 父 frame 注册位置；ADR-03 处理 scope.id 注册的 synthetic layout 具体内容（bbox 计算）
