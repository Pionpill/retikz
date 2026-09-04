# ADR-07：Flow 平级 Source、Group 与 Layout

- 状态：Accepted
- 决策日期：2026-09-04
- 关联：[Diagram v0.1 roadmap](../roadmap.md) · [Flow Source 模型与 LLM-first Authoring](./03-flow-source-model.md) · [Flow Layout Definition 与 Registry](./04-flow-layout-definition-registry.md) · [Flow Orchestration、Result 与 Artifact](./05-flow-orchestration-result-artifact.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

复杂架构图和流程图通常同时包含两类结构：可见的语义分组，以及只负责左右、上下排列和对齐的空间布局。旧方案把两者都建模为 `FlowGroup`，再用 `kind: 'layout' | 'visible'` 区分。虽然它能够工作，但会让 Group 同时承担 Graph 语义边界和通用排列容器两种职责，也迫使作者通过 Group 的变体才能表达纯布局。

Flow Source 已采用平级 catalog 与 owner-side `children`：Entity、Group 的声明与包含关系分离，真实嵌套只存在于引用图和运行期 Canonical tree。本决策继续这一方向，并把纯布局提升为与 Entity、Group 平级的独立 `Layout`。公开概念只叫 Layout；其实现复用 `@retikz/layout` 的 Flex 能力，但 Flow Source 不暴露底层 Flex IR，也不复制其 solver。

目标是让三类声明各自只有一个清晰职责：Entity 表达节点，Group 表达可见语义边界，Layout 表达作者指定的无外壳空间排列。Relation 只在全部 element bounds 确定后 routing，不参与 Layout 内部 placement。

## 决策

### 三类平级 catalog

`IRFlowDiagram` 同时提供 `entities`、`groups` 与 `layouts`。数组位置已经表达声明类别，因此三类记录都不保存元素 `type`；Flow 根仍保留 `namespace: 'diagram'` 与 `type: 'flow'`，用于 Core composite dispatch。

- `entities` 非空
- `groups` 始终存在且允许空数组，只声明可见 Group
- `layouts` 始终存在且允许空数组，只声明无外壳 Layout
- 三类 id 在一个 Flow Source 内全局唯一
- catalog 顺序只用于稳定遍历和诊断，不参与布局

根、Group 与 Layout 都用非空、有序 `children` 引用直接成员。每个声明必须恰好被一个 owner 直接包含，因此 containment 形成一棵以 Flow 根为隐式根的树。Source 不保存 `parentId`、ancestor path、LCA、递归 child 对象或其它派生索引。

### Group 只表示可见语义边界

`IRFlowGroup` 不再有 `kind`。它始终投影为 Graph Group，可配置 `label`、`style`、`rank`、自身直接 children 的自动 `layout`，并可作为 Relation endpoint。

Group 的 `layout` 是 Flow layout provider 的局部意图：provider 可以依据 Relation、rank 和 direction 自动排列其直接 children。Group 继续拥有真实 shell minimum、content insets、Graph identity、artifact 与 `role: 'group'` 的 spatial handle。

### Layout 是独立的固定空间排列

`IRFlowLayout` 具有以下闭合字段：

```ts
type IRFlowLayout = Readonly<{
  id: string;
  rank?: number;
  direction: 'right' | 'left' | 'down' | 'up';
  gap?: number;
  align?: 'start' | 'center' | 'end';
  children: ReadonlyArray<string>;
}>;
```

`direction` 必填，避免省略值在不同 Theme 或 provider 下改变 authored placement。`gap` 省略时继承当前 scope 的有效 `nodeGap`，`align` 省略时为 `center`。`rank` 只约束 Layout 作为外层 owner 直接 child 时的位置，不改变 Layout 内部排列。

Layout 无 label、style、shell、Graph identity 或 endpoint 能力。它可以和 Group 相互嵌套；其 children 顺序、direction、gap 与 align 唯一决定内部 placement。Layout 内 Relation 不产生 rank edge，也不重排 children；所有 Relation 都在完整 bounds 产生后统一 routing。

### Source resolve 与 Canonical tree

Flow resolve 建立 Entity / Group / Layout catalog，完成引用存在性、唯一 owner、无 orphan、无自包含和无 cycle 校验，再按各 owner 的 `children` 重建递归 `CanonicalFlowElement` tree。

Canonical Group 始终包含 Graph Group 投影；Canonical Layout 保留 authored placement 与继承后的有效 routing scope。parent index、ancestor path、effective layout 和其它派生数据只在 resolve / measure / compile 中存在，不写回 Source。

Relation endpoint 只能引用 Entity 或 Group。引用 Layout 使用 `DIAGRAM_FLOW_ENDPOINT_INVALID`，reason 为 `layout-endpoint`；它不能被静默连接到自身 bounds 或某个后代。

### Layout placement 复用 `@retikz/layout`

Flow Layout Definition 的同步 callback 获得一个执行 context，其中 `placeLayout` 是 Layout placement 的唯一入口。Diagram pipeline 将每个 authored Layout 投影为 canonical Flex 调用：

- `right / left / down / up` 分别映射为 `row / row-reverse / column / column-reverse`
- `align` 映射为底层 cross-axis start / center / end
- 每个已测量 direct child 用无绘制、精确尺寸的 proxy child 表达，key 保持 Flow child id，margin 保持真实测量结果
- Diagram 只消费 Flex artifact 中的 container 与 item allocation bounds，不把 proxy replay children写入最终 Scene

每个 Layout 必须恰好调用一次 `placeLayout`。执行边界记录结果，并验证 provider 最终输出的 Layout bounds 与 direct child 相对 bounds 等于该记录，从而防止内置或自定义 Flow Layout Definition 忽略、重排或改写作者指定 placement。

`FlowDiagramProvider` 显式依赖 `FlexLayoutProvider`。Diagram 不复制 Flex schema、solver、wrap 或 distribution；Flow Source 只保留当前真实消费者需要的单行 direction、gap 与 align 投影。

### Provider、artifact 与 capability

`FlowLayoutElementInput` 是 `leaf | group | layout`：

- Group 仍由 Flow layout provider 递归自动布局
- Layout 先递归取得 children 尺寸，再调用 `context.placeLayout`，之后作为一个固定 compound box参与外层自动布局
- routing index 同时递归 Group 与 Layout；Relation 的最低共同 scope 若是 Layout，则使用 Layout direction 与继承后的 routing intent

artifact 保留三种递归 element：`entity`、`group`、`layout`。Layout artifact 使用 `kind: 'layout'`，spatial handle 使用 `role: 'layout'`；Group 不再携带 `groupKind`。

layout capabilities 的结构语义改名为 `compoundScopes` 与 `crossScopeRelations`，覆盖 Group 和 Layout 两类 scope；`groupEndpoints` 仍只描述可见 Group endpoint。旧 `compoundGroups`、`crossGroupRelations` 不保留别名。

### 三入口一致

Direct IR 的唯一持久化形态是三个 catalog 与引用式 `children`。Diagram Vanilla 增加平级 `InputFlowLayout`；normalize 只补根 discriminator。Diagram React 增加 `FlowLayout` marker，允许 JSX 嵌套表达 containment，并统一 flatten 为三个 catalog 与 owner-side children。

Direct IR、Vanilla 与 React normalization 后必须逐字段相同。旧 `FlowGroupKind`、Group `kind`、布局型 Group、旧递归 `elements`、`parentId` 与兼容 fallback 全部删除。

## 行为与失败语义

- 三类 catalog 重复 id：`DIAGRAM_FLOW_DUPLICATE_ID`，path 指向后出现的声明
- child 或 Relation endpoint 引用未知 id：`DIAGRAM_FLOW_REFERENCE_NOT_FOUND`
- duplicate child、multiple parents、orphan、self-containment、cycle：`DIAGRAM_FLOW_CONTAINMENT_INVALID`
- Relation 引用 Layout：`DIAGRAM_FLOW_ENDPOINT_INVALID`，reason 为 `layout-endpoint`
- 相同 Source、definitions、Theme 与 measurer 必须产生相同 Canonical tree、Layout placement、provider output、artifact 与 Scene
- catalog 重排不得改变布局；owner `children` 重排会改变 Layout 的固定排列，并可改变自动 layout 的确定性 tie-break
- 旧 `groups[].kind` 与 `groupKind` artifact 字段为非法或不存在，不提供 migration、alias 或双轨

## 权衡与边界

平级 catalog 优化的是 LLM 局部编辑、类别辨识和持久化深度，不降低真实 containment 与 routing 的计算复杂度。Layout 的固定 placement 能组合出复杂二维结构，但它不是任意 constraint solver，不提供 wrap、grow、shrink、absolute positioning 或 Relation 驱动排序。

W3C Flexbox 验证了一维容器和嵌套组合的成熟模型；ELK 与 Graphviz 则证明 compound graph scope 和关系布局属于另一类问题。因此 Flow 明确分开 Layout placement 与 Group / Relation layout，而不是继续用一个 Group 变体承载两者。

Graph Block、Port、Layout endpoint、共享 child DAG、Editor 状态和文本 DSL 不属于本决策范围。

## 结果

Flow 已以独立 Entity / Group / Layout catalog、引用式唯一 containment、三入口归一化和 renderer-neutral artifact 落地。Group 始终保留可见 Graph 语义与 endpoint identity；Layout 只保留作者指定 placement，并通过统一执行 context 复用 Layout owner 的固定排列能力。

递归 containment 在运行期仍需重建 Canonical tree，并继续受 Core expansion safety limit 约束；深层组合的性能预算属于后续独立议题，不改变本决策的 Source 形态与职责边界。
