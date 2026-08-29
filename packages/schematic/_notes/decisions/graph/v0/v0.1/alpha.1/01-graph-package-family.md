# ADR-01：建立 Graph package family

- 状态：Accepted
- 决策日期：2026-08-15
- 修订日期：2026-08-28
- 关联：[alpha.1 roadmap](./roadmap.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

图式实体、关系和可见分组表达的是 Schematic 领域语义，而不是移除领域词汇后仍成立的通用绘图能力。它们应复用 Core、Layout 与 Standard 的公开契约，但不能让底层包反向拥有 Graph role、relation、group 或未来 Diagram 的自动布局语义

本决策建立独立 Graph package family，以 JSON-safe Source composite 保存可持久化语义，并通过 Core composite registry 下沉为 renderer-neutral 的 Core 内容。Graph 不建立平行 Scene、renderer、几何、布局或编辑器运行时

## 决策

### Package family 与 release group

建立三个 lockstep 包：

- `@retikz/graph`：Graph Source schema、Definition、registry、resolve、lowering 与 framework-neutral factory
- `@retikz/graph-react`：Graph JSX authoring、Provider 与 React runtime 接线
- `@retikz/graph-vanilla`：无框架 builder、normalize、InputEmbed adapter 与 runtime 接线

三个包使用独立 `graph` release group，并统一使用 `namespace: 'graph'`。Graph 不创建 Schematic 聚合包，也不反向依赖 Diagram、Editor、Viz 或 renderer

### 四类稳定 Source composite

Graph package family 提供四类独立 Source composite：

```ts
const GraphType = {
  Graph: 'graph',
  Group: 'group',
  Entity: 'entity',
  Relation: 'relation',
} as const;
```

- `Graph`：组合完整 Core Scope surface，并增加可选 `graphTheme` 的局部上下文；它不是 Entity / Relation 的必需父节点
- `Group`：组合完整 Core Scope、Standard Surface、Layout caption 与 Core boundary labels，表达可嵌套的可见包含边界
- `Entity`：保存 Graph 实体语义与非结构性 Core Node lower-facing 字段，最终下沉为一个 Core Node
- `Relation`：保存有序 Core NodeTarget endpoints、Graph 关系语义与 Core Path-compatible route / labels / instance fields，最终下沉为一个 Core Path

四类 Source 的 `id` 都保持可选。只有作者显式提供 id 时，lower target 才向 Core namespace 发布 identity；resolve、lowering 与 adapter 不生成默认 id

### 能力与 owner 边界

Graph 拥有 Graph / Group / Entity / Relation 的 Source 语义、Graph-owned Definition / registry / Theme、领域 resolve 与 Core lowering。Core 继续拥有 Scope、Node、Path、NodeTarget、namespace、compile、Scene 与诊断；Layout 拥有 proposal / probe / replay 和容器排版；Standard 拥有通用 Surface、Shape 与 Arrow Definition

Graph 不拥有 GraphModel、成员数据库、私有 endpoint lookup、平行 geometry / appearance model、自动 layout / routing、碰撞避让、Editor state 或 renderer。未来 Diagram 可以单向依赖 Graph，消费其语义并计算布局与 route；Graph 不反向依赖 Diagram

### Authoring 与编译等价

直接 JSON、React 与 Vanilla 必须产生相同的 Source IR，并进入同一 Graph Definition、registry、resolve 与 Core lowering 主链。React / Vanilla 只提供 authoring sugar 和宿主接线，不复制 schema、默认值、Theme 解析、geometry 或诊断

Standalone React Graph 复用普通 Layout host 建立 Scene；embedded Graph 只贡献局部 Scope。Group、Entity 与 Relation 可以独立出现在任意接受 Core child 的位置，不建立额外 Scene host

## 行为、失败语义与兼容性

- 未注册 Graph composite、role、kind、predicate、Theme style 或下游 provider 通过所属 registry / resolver fail-loud
- Graph / Group children 与 Core `IRChild` 同源；Graph 不维护成员白名单、集合、索引或 membership error
- Relation endpoint 直接复用 Core NodeTarget 与 namespace，不要求目标属于同一 Graph
- Group 不自动排列 authored children，也不负责 compound layout、routing、避障或 label collision
- 旧 Notation package、GraphFrame、GraphNode、GraphConnector、Callout、Container、Variant 与 Graph-only endpoint 不保留 alias、fallback、re-export 或双轨输入

## 结果

Graph、Group、Entity 与 Relation 已形成 Direct IR、React、Vanilla、Definition、resolve、lowering、Docs 与 renderer-neutral 输出闭环。四类 Source 只保存独立事实和下游必需字段；布局、通用几何、Scene 执行与宿主生命周期继续由各自 owner 负责
