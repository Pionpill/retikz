# ADR-07：Entity 语义封装与 Core Node 复用

- 状态：Accepted
- 决策日期：2026-08-22
- 修订日期：2026-08-23
- 关联：[Graph alpha.1 roadmap](./roadmap.md) · [Graph Theme](./06-graph-entity-registry-theme.md) · [Graph context](./09-composable-graph-context.md)

## 背景与目标

Entity 是带 Graph 语义并最终下沉为一个 Core Node 的正式元素。旧设计把语义、按 identity 引用的 presentation 和 geometry 分成多组集合，随后又在 lowering 中重新合并，重复了 identity，也让 Graph 拥有 Core 已经表达的位置、尺寸与内容投影

本决策把 Entity 收敛为单一 Source record。Graph 只增加 role、kind、predicate 等领域语义，并复用 Core Node 的 lower-facing 实例字段；作者、Diagram、Editor 或其它消费者可以计算并写入同一位置和尺寸字段，Graph 不记录来源或裁决多个候选

## 决策

### 单一语义化 Node record

Entity 同时保存可选 identity、Graph 语义和绘制实例所需的 Core-compatible 字段。它可以在缺少绘制必需字段时完成语义 resolve；请求 lowering 时若仍缺少 Core Node 必需的 position，则 fail-loud

Entity 可以独立出现在任意接受 Core child 的位置。Graph / Group children 与 Core `IRChild` 同源，不存在 Graph-only presentation、geometry collection 或成员索引。省略字段不在 Source 中物化，只在 resolve / compile 阶段补全

### Core Node surface

Entity schema 从 Core Node schema 排除 role-owned 结构字段后复用其余完整实例 surface。role 是 shape、boundary、padding、cornerRadius 与基础 minimum size 的唯一 owner；Entity 不能覆盖这些结构字段

text、position、minimumSize、appearance、labels、animations、meta 和其它允许的 Node 字段保持 Core 的名称、JSON 形态、默认、refinement 与可观察语义。Core 新增 lower-facing Node 字段时 Entity 默认继承，只有新的字段确属 role structure 时才显式排除

role minimum size 是结构下限，Entity minimum size 是实例约束，两者逐轴取较大值；显式 0 保持 Core 语义。Graph Theme 提供 appearance 默认，Entity 显式 Core Node appearance 最终逐字段覆盖。Graph 不复制 Node 的测量、geometry 或 Scene 算法

### role、kind 与 predicate

- role definition 拥有说明、shape、padding，以及可选 boundary、cornerRadius 和 minimum size
- kind definition 声明所属 role、稳定子类型和说明，不保存 appearance
- predicate definition 声明所属 role、可选 kinds、params schema 和说明，只校验并产出 Canonical params

内置 Entity role 为 `participant`、`activity`、`event`、`state`、`gateway`、`resource` 与 `concept`。role schema 使用 `createOpenStringSchema(values)` 暴露内置提示，同时接受任意非空白自定义 key；是否注册只由 resolver 判断。当前 kind 与 predicate 没有内置词汇，继续使用普通非空白字符串 schema

Theme selector 可以匹配 role、kind、predicate name 与 Canonical params，但不能改变结构、identity、内容、位置或尺寸。内置与自定义 Definition 共用同一 registry、provider assembly 和 resolver

### Source 契约

```ts
type IRGraphEntity = Readonly<{
  namespace: 'graph';
  type: 'entity';
  role: string;
  kind?: string;
  predicate?: Readonly<{ name: string; params?: IRJsonObject }>;
  position?: IRNode['position'];
}> &
  Omit<IRNode, 'type' | 'shape' | 'boundary' | 'padding' | 'cornerRadius' | 'position'>;
```

`id` 来自复用的 Node surface 并保持可选。只有显式 id 才下沉到 Core namespace；adapter 不生成默认 id。Direct IR、React 与 Vanilla 构造同一个 Entity record，JSX text 只是 text 的 authoring sugar

## 行为、失败语义与兼容性

- Entity 与 Definition key 必须是非空字符串
- 未注册或不匹配的 role、kind、predicate，以及 params 校验失败，均由 Entity resolver fail-loud
- lowering 时缺少 position 必须失败，语义 resolve 不生成默认坐标
- 显式 shape、boundary、padding 或 cornerRadius 在 schema 边界拒绝；其它允许的 Node 字段沿用 Core 语义
- Entity、predicate params、meta、text、label、animation 与 placement 必须 JSON-safe
- 不根据 shape、text、meta、position、Relation、拓扑或 key 前缀猜测语义
- 旧 presentation / geometry collections 和 root member collections 直接删除，不保留 alias、fallback 或双轨输入
- lowering 使用 Relation → Entity → decoration 的固定 paint order，并在各分支内保持 Source order

## 结果与边界

Entity 已成为同时承载 Graph 语义与 Core Node 实例 surface 的单一 Source record。Graph 不为 Diagram、Editor 或其它消费者建立平行 geometry model

自动布局和端口不属于本契约。若后续需要局部连接点，应与通用 endpoint 引用能力一起设计，不预建 Entity 专属字段
