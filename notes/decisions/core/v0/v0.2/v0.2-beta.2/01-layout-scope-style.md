# ADR-01：`<Layout>` 顶层支持 Scope 级联样式（隐式根 Scope）

- 状态：Accepted
- 决策日期：2026-05-31
- 落地日期：2026-06-01（yellow；react kernel + 测试 + 文档；core 零改动）
- 关联：[v0 roadmap](../../roadmap.md) · [core-design.md §4](../../../../../architecture/core-design.md) · [`flow-beta` SKILL](../../../../../../.agents/skills/flow-beta/SKILL.md)（**本 ADR 是对其"beta 不开新功能 ADR"的有意破例**）· `<Scope>`（复用其级联语义）

> ⚠️ **流程破例说明**：给 `LayoutProps` 加公开级联样式 props 属于"新增公开 API 字段 / 新功能"，按 `flow-beta` 规则应推到下一个 alpha 窗口。**2026-05-31 由维护者决定在 v0.2-beta.2 内有意破例接入本 ADR**——理由：改动小、纯增量（非破坏）、且把高频样板（每张图都套一层根 `<Scope>`）一次性消掉，收益明确。记录在案以保审计 trail 完整。

## 背景

顶层容器 `<Layout>`（`packages/react/src/kernel/Layout.tsx`）当前只承担两类职责：

| 类别 | props |
|---|---|
| 渲染容器 | `width` / `height` / `viewBox` / `className` / `style` |
| 编译选项 | `shapes` / `arrows` / `patterns` / `pathGenerators` / `nodeDistance` |
| 数据入口 | `ir` / `children` |

它**不带任何级联样式**。要给整张图设默认样式（统一字体、统一 `stroke`、把所有 path 默认设成 round 端点、给边标注一个默认字号等），唯一办法是在 `<Layout>` 里手写一层 `<Scope>` 包住全部 children：

```tsx
<Layout width={720} height={430} viewBox={...} shapes={...}>
  <Scope pathDefault={{ stroke: 'currentColor', strokeWidth: 5, lineCap: 'round' }} nodeDefault={{ font: { family: 'Arial' }, stroke: 'none' }}>
    ...全部图元...
  </Scope>
</Layout>
```

痛点：

1. **样板重复**：几乎每张需要统一样式的图都重复这套两层嵌套——文档站里 ohms-law-circuit、karl-circle 等示例的每个 demo 都被迫多套一层根 `<Scope>`。
2. **挂载点不直观**：新手（和 LLM）会先猜 `<Layout nodeDefault={...}>`，发现不支持后才知道要插一层 `<Scope>`。刚问过的真实疑问就是"Layout 也支持 nodeDefault 吗"。
3. **与 TikZ 习惯不符**：TikZ 顶层 `tikzpicture` 环境本身就接 `[every node/.style=..., color=...]` 这类全图选项，不需要再开一个 scope。retikz 的 `<Layout>` ≈ `tikzpicture`，理应同样能接全图样式默认。

对应 TikZ：`\begin{tikzpicture}[every node/.style={...}, color=..., every path/.style={...}]`。

## 选项

### A. Layout 注入隐式根 Scope（**推荐**）

`LayoutProps` 新增与 `<Scope>` 同名的**级联样式 props 子集**；Layout 内部在有任一样式 prop 时，把 children 包进一个合成的 `<Scope>` 再交给 `buildIR`：

```tsx
// packages/react/src/kernel/Layout.tsx（示意）
const hasScopeStyle = color !== undefined || stroke !== undefined || nodeDefault !== undefined /* ...其余通道 */;
const wrapped = hasScopeStyle
  ? <Scope color={color} stroke={stroke} fill={fill} strokeWidth={strokeWidth}
           opacity={opacity} fillOpacity={fillOpacity} drawOpacity={drawOpacity}
           nodeDefault={nodeDefault} pathDefault={pathDefault} labelDefault={labelDefault} arrowDefault={arrowDefault}>
      {children}
    </Scope>
  : children;
const base = irFromProp ?? buildIR(wrapped);
```

- 复用既有 `<Scope>` 组件 + `IRScope` schema + compile 级联——**零 core / IR schema / compile 改动**。
- 编译产物就是"用户手写一层根 `<Scope>`"的同一 IR：`Scene.children = [{ type: 'scope', nodeDefault, ..., children: [...] }]`。
- 缺点：IR 顶层多一个 scope 节点（仅当用了样式 prop 时）；Layout props 表变长。

### B. IR 根 `SceneSchema` 直接挂样式默认字段

给 `SceneSchema` 加 `nodeDefault` / `pathDefault` / ... 字段，compile 把根字段当作顶层 cascade 起点。

- 优点：IR 不引入"合成 scope 节点"，根样式是 Scene 一等字段。
- 缺点：**red 改动**（动 `packages/core/src/ir/scene.ts` + `packages/core/src/compile/**`）；IR 多出一套与 `IRScope` 字段重复的通道（`nodeDefault` 等两处定义，易漂移）；compile 要新增"根 cascade"路径，与 scope cascade 逻辑并行维护。

### C. 不改 Layout，文档化 `<Layout><Scope>` 惯例

仅在文档里把"全图默认 = 紧贴 Layout 套一层 Scope"写成约定。

- 优点：零代码。
- 缺点：不满足"让 Layout 直接支持"的诉求；样板和挂载点不直观的问题都还在。

## 决策：A（Layout 注入隐式根 Scope）

理由：

1. **复用 `IRScope`，不重复 schema**——根样式与 scope 样式本就是同一组通道，B 方案的字段重复违反"不重复 schema"惯例。
2. **yellow 而非 red**——改动只落在 `packages/react/src/kernel/`，不动 core IR / compile，blast radius 最小。
3. **round-trip 稳定**——编译出的 IR 是标准 `IRScope` 节点，`unbuilder` 已支持反推，无需新增反向逻辑。
4. **AI 友好**——`<Layout nodeDefault={...}>` 编译出的 IR 与用户手写 `<Layout><Scope nodeDefault={...}>` 完全一致；LLM 不需要学一套"根专用样式字段"，生成的 IR 仍是它已经会的 scope 形态。

## 待决策点

> 选项已选，但选项内部仍有小决策。列细让下游 implement / test 不必猜。

- **暴露哪些 Scope props**：倾向只暴露**级联样式子集**——`color` / `stroke` / `fill` / `strokeWidth` / `opacity` / `fillOpacity` / `drawOpacity` + `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`。**不**暴露 `transforms` / `clip` / `zIndex` / `id` / `localNamespace` / `resetStyle`（这些是"scope 作为分组 / 命名空间 / 局部变换"的语义，挂在根容器上要么无意义、要么语义易混；全图变换的需求推后单独评估）。
- **与 `ir` prop 的关系**：传 `ir`（直接喂完整 IR）时同时给样式 props → 倾向 **dev warn + 忽略样式 props**（`ir` 已是完整 IR，再叠一层根 scope 语义不清）。
- **是否总是包 scope**：倾向**仅当至少一个样式 prop 非 `undefined` 时**才包合成 `<Scope>`；无样式 prop 时保持 `buildIR(children)` 原样，避免无谓的空 scope 改变 IR 形态与 round-trip 结果。
- **props 类型复用**：把这组样式 props 抽成共享类型（如 `_fields.ts` 里的 `ScopeStyleProps`），`ScopeProps` 与 `LayoutProps` 都复用，避免两处定义漂移。倾向抽共享类型。

## DSL 表面

```tsx
// 给整张图设默认样式：不用再手写嵌套 <Scope>
<Layout width={720} height={430} viewBox={{ x: 0, y: 0, width: 1280, height: 760 }}
  stroke="currentColor"
  nodeDefault={{ font: { family: 'Arial, sans-serif' }, stroke: 'none', padding: 0 }}
  pathDefault={{ strokeWidth: 5, lineCap: 'round', lineJoin: 'round' }}
>
  <Node id="a" position={[0, 0]}>a</Node>
  <Node id="b" position={[200, 0]}>b</Node>
  <Draw way={['a', 'b']} arrow="->" />
</Layout>

// 等价于（旧写法）
<Layout width={720} height={430} viewBox={{ x: 0, y: 0, width: 1280, height: 760 }}>
  <Scope stroke="currentColor" nodeDefault={{ ... }} pathDefault={{ ... }}>
    ...
  </Scope>
</Layout>

// 内层 <Scope> 仍可局部覆盖 Layout 的默认（级联正常）
<Layout stroke="currentColor" pathDefault={{ strokeWidth: 5 }}>
  <Draw way={['a', 'b']} />                                  {/* strokeWidth 5 */}
  <Scope pathDefault={{ strokeWidth: 2 }}>
    <Draw way={['b', 'c']} />                                {/* strokeWidth 2，内层胜出 */}
  </Scope>
</Layout>
```

## 测试设计

`packages/react/tests/kernel/*.test.tsx` 覆盖：

- Layout 样式 props → 子图元继承（node / path / label / arrow 各通道）
- 无样式 prop 时 IR 形态不变（不包空 scope）
- 与内层 `<Scope>` / 图元显式属性的级联优先级
- 与 `ir` prop 并用时的处理（warn + 忽略）

具体 case 见"实现契约 § 测试象限"。

## 影响

- **`packages/react/src/kernel/Layout.tsx`**：`LayoutProps` 加级联样式 props；render 前按需包合成 `<Scope>`。
- **`packages/react/src/kernel/_fields.ts`（或 `Scope.tsx`）**：抽共享 `ScopeStyleProps` 类型，`ScopeProps` 与 `LayoutProps` 复用。
- **对外 API**：`LayoutProps` 新增**可选** props——纯增量，**非破坏**。
- **无 IR schema 改动**：复用 `IRScope`，`packages/core` 不动。
- **文档站**：`apps/docs` layout/overview 加"全图默认样式"小节 + demo；ohms-law-circuit / karl-circle 等示例可顺手简化（去掉手写的根 `<Scope>`）——但示例简化放到 document 阶段，本 ADR 不强制。

## 不在本 ADR 范围

- **Layout 暴露 `transforms` / `clip`**（全图变换 / 裁剪）：根容器层语义另议，推后单独评估。
- **重写现有示例去掉根 `<Scope>`**：document 阶段按需做，不在实现 scope 内。
- **选项 B（IR 根挂样式字段）**：已否决，不做。

---

## 实现契约（必填）

### Level

`yellow`

- 仅动 `packages/react/src/kernel/**`（Layout.tsx + 共享 props 类型）+ 测试 + 文档。
- 不动 `packages/core/src/ir/**` / `packages/core/src/compile/**`（复用 `IRScope` 与既有 cascade）。
- 不改 `packages/*/src/index.ts` 的 export 列表（`Layout` / `LayoutProps` 已导出，仅 props 形态扩展）。
- 跨级取最高 = yellow。

### Schema 改动

**无。** 复用既有 `IRScope`（`packages/core/src/ir/scope.ts`），不新增 / 不修改任何 IR Zod schema 字段。`LayoutProps` 的新增项是 React 组件 prop 的 TS 类型，不是持久化 IR schema。

### 文件 scope

- `packages/react/src/kernel/Layout.tsx`（修改：`LayoutProps` 加样式 props + render 按需包 Scope）
- `packages/react/src/kernel/_fields.ts`（修改 / 新建共享 `ScopeStyleProps` 类型 + `SCOPE_STYLE_FIELDS` 字段表）
- `packages/react/src/kernel/Scope.tsx`（修改：`ScopeProps` 复用共享样式类型，保持等价）
- `packages/react/src/kernel/builder.ts`（修改：新增 `wrapRootScope` 合成函数）—— **偏离白名单**：`wrapRootScope` 原计划放 Layout.tsx，但 Layout.tsx 是组件文件，导出非组件函数触发 `react-refresh/only-export-components` lint。落到 builder.ts（非组件模块、React-node→IR 桥接的天然归属，用 `createElement` 而非 JSX 留在 `.ts`），Layout 从 builder import 调用。
- `packages/react/tests/kernel/layout-scope-style.test.tsx`（新建：本 ADR 测试象限）
- `apps/docs/src/contents/core/components/layout/overview/index.{zh,en}.mdx`（修改：加"全图默认样式"小节）
- `apps/docs/src/contents/core/components/layout/overview/*.demo.tsx`（新建：1 个 demo）
- `apps/docs/src/components/shared/component-preview/ComponentPreview.tsx`（修改：`buildPreviewIR` 复刻 Layout 隐式根 scope）—— **偏离白名单**：该 helper 原本只对 Layout `children` / `ir` / `viewBox` 派生 IR，不含本 ADR 新增的级联样式 props，导致"全图默认样式"demo 的"View Code → IR"面板与渲染图不一致（IR 缺合成 scope）。用已公开的 `<Scope>` + `convertReactNodeToIR` 复刻包裹，**不改 `packages/*/src/index.ts`**（仍 yellow）。

偏离白名单需加条到本段或开新 ADR。

### 测试象限

#### Happy path（≥ 3）

- `layout_nodedefault_inherits`：`<Layout nodeDefault={{ font, stroke:'none' }}>` → 子 `Node` 未单设时继承该字体 / stroke
- `layout_pathdefault_inherits`：`<Layout pathDefault={{ strokeWidth:5, lineCap:'round' }}>` → 子 `Draw` / `Path` 继承
- `layout_color_cascades`：`<Layout color="currentColor">` → 级联到子元素 stroke / fill / 边 label / 箭头
- `layout_labeldefault_inherits`：`<Layout labelDefault={{ font:{ size:16 } }}>` → node label + step label 共享该默认

#### 边界（≥ 2）

- `layout_no_style_prop_ir_unchanged`：`<Layout>` 不带任何样式 prop → 构造的 IR **不**包合成 scope，形态与改动前逐字节一致（round-trip 稳定）
- `layout_style_prop_empty_children`：带样式 prop 但 children 为空 → 合成空 scope 不报错、Scene.children 合法
- `layout_single_style_channel`：只设一个通道（如仅 `stroke`）→ 只该通道进合成 scope，其余不出现

#### 错误路径（≥ 2）

- `layout_ir_prop_with_style_warns`：同时传 `ir` + 样式 prop → dev warn + 样式被忽略（`ir` 原样渲染）
- `layout_invalid_nodedefault_rejected`：`nodeDefault` 传非法结构 → 走 `IRScope.nodeDefault` 既有 schema 校验路径报错（不在 Layout 层吞掉）

#### 交互（≥ 2）

- `layout_style_overridden_by_inner_scope`：Layout `pathDefault.strokeWidth=5` + 内层 `<Scope pathDefault.strokeWidth=2>` → 内层子元素用 2（级联正确）
- `layout_style_overridden_by_node_prop`：Layout `nodeDefault.stroke='none'` + 某 `Node stroke='red'` → 该 Node 用 red（显式属性胜出）
- `layout_color_with_inner_resetstyle`：Layout `color` + 内层 `<Scope resetStyle>` → 屏障切断继承，内层不染色

### 依赖现有元素

- `<Scope>`（`packages/react/src/kernel/Scope.tsx`）—— **复用**：Layout 内部合成此组件包裹 children；其 props 形态被抽成共享类型供两者复用。
- `IRScope`（`packages/core/src/ir/scope.ts`）—— **仅引用，不改**：合成 Scope 经 `buildIR` 产出标准 `IRScope` 节点。
- `buildIR`（`packages/react/src/kernel/builder`）—— **仅引用**：对包好的 `<Scope>{children}</Scope>` 调用，无需改造。
- `packages/core/src/compile/style.ts` 的级联逻辑 —— **仅引用，不改**：合成 scope 走既有 cascade，行为与用户手写 Scope 一致。
- `unbuilder`（React adapter 反推）—— **仅引用**：合成 scope 是标准 `IRScope`，既有反推路径覆盖。
