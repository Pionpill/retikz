# ADR-03：以统一 JSON 快照收敛 Source undefined 语义

- 状态：Proposed
- 决策日期：2026-09-04
- 关联：[alpha.4 roadmap](./roadmap.md) · [alpha.2 ADR-14](../alpha.2/14-foundation-package.md) · [alpha.2 ADR-17](../alpha.2/17-foundation-schema-primitives.md)

## 背景与目标

Retikz 的 Source IR 必须能无损持久化为 JSON，但 JavaScript 对象可以显式携带 `undefined`，Zod 的 optional 字段也会把“字段缺失”和“字段值为 `undefined`”同时视为合法。当前结果已经分叉：Core、Diagram、Flow 与 Graph 的部分 Source 对象接受显式 `undefined`，Diagram、Flow 与 Graph 的非空稀疏对象还会把这类字段误判为有效内容；Chart、Plot 与 Table 的部分 token schema 则各自手写拒绝逻辑。

runtime Definition 的稀疏输出属于另一种边界。它允许已知 optional 字段以 `undefined` 表示未提供，但必须保留未知字段供 strict schema 诊断。把这种 authoring 便利应用到持久化 Source，会静默改写输入并掩盖错误；反过来把 Source 的 fail-loud 规则直接应用到 runtime provider，也会破坏既有扩展契约。

本 ADR 的目标是让每份完整 Source 在进入领域 schema 前只经过一次统一 JSON 全树预处理，直接得到脱离输入、不可变且 JSON-safe 的候选值；领域 schema 再负责 IR 结构与语义。Foundation 同时承接跨包重复的 runtime known-key 省略原子，但不拥有任何领域 IR、Source 根或 Definition 结构。

## 决策：完整 Source 先建立严格 JSON 快照，再执行领域 schema

Foundation 以 `snapshotJson` 提供唯一的 JSON 全树预处理。它在一次深度优先遍历中同时校验、复制并冻结输入，遇到第一个非法位置立即失败；不会先收集所有 `undefined` path，也不会再提供独立的非空字段遍历。

每个可独立接收外部数据的 Source 根都按同一顺序组合 Foundation 与所属领域 schema：

```ts
const source = SourceSchema.parse(snapshotJson(input, 'source'));
```

顺序不可交换。必须先检查原始输入，避免 schema 的 optional、default 或结构投影在 JSON 校验前消除非法事实。`snapshotJson` 只证明值属于严格 JSON 数据模型；`SourceSchema` 才证明它属于具体领域 IR。一次完整接纳因此包含“一次 JSON 全树预处理 + 一次领域 schema parse”，不宣称把任意 Zod schema 与 JSON 校验融合成一次物理遍历。

上述组合是完整 Source 的唯一接纳契约。公开 Zod schema 继续作为可组合的领域结构真源，单独调用其 `parse` / `safeParse` 不代表已经执行 JSON 全树预处理；任何宣称接收完整 Source、unknown 或持久化数据的公开 API 都必须先执行该组合。直接 Source JSON、Vanilla normalization 的最终 Source 和 React 对应链路必须暴露相同结果。

完整 Source 已通过外层接纳后，内部 compile、resolve、lower、emit 与嵌套 Composite 的结构校验不得重复执行 JSON 全树预处理。接收已类型化 `IRXxx` 的底层 compile 仍信任其类型契约；外部调用方若直接组合公开 schema，必须显式先调用 `snapshotJson`。

runtime Definition sparse patch 继续使用独立的 `omitKnownUndefinedProperties`。它只浅层省略 owner 明确列出的已知字段，保留所有未知字段和值，由 owner 的 strict schema 决定是否合法。需要处理嵌套 patch 的 owner 在每个已知层显式组合该原子；它不递归解释 Definition 结构，也不参与 Source JSON 预处理。

理由：

1. `undefined`、函数、symbol、bigint、非有限数与不安全容器都属于同一个 JSON 数据边界，应在一次全树遍历中统一失败，而不是由各领域重复扫描某一种叶子
2. 快照完成后不再存在显式 `undefined`，非空稀疏对象可直接使用自身字段数量和领域语义判断，无需第二套 `hasDefinedOwnFields` 真源
3. Source fail-loud 与 runtime known-key omission 的输入性质、未知字段策略和错误 owner 不同，保持两个原子才能同时维护持久化一致性与 provider 可诊断性
4. Foundation 只提供无领域的 JSON 值操作，领域 schema、错误码、Source root 与 adapter 编排继续由各自 owner 持有

## 基础数据结构与公开契约

Foundation 根入口公开以下稳定契约：

```ts
export declare const snapshotJson: <T>(value: T, path?: string) => T;

export declare const omitKnownUndefinedProperties: (value: unknown, knownKeys: ReadonlySet<string>) => unknown;
```

`snapshotJson` 替代既有 `cloneAndFreezeJson`。它接受 JSON 标量、普通对象与普通数组，返回与输入值相同、但不共享可变对象的深冻结快照。它拒绝显式 `undefined`、函数、symbol、bigint、非有限数、循环、accessor、symbol key、稀疏数组、额外数组属性和非普通容器，并在 Foundation 错误中报告首个非法 path。合法对象中的 `false`、`0`、空字符串与 `null` 原样保留。

`omitKnownUndefinedProperties` 不修改输入。普通对象只省略同时满足“key 属于 `knownKeys`”与“值为 `undefined`”的 own enumerable string field；普通对象以外的值原样返回，未知字段即使值为 `undefined` 也必须保留。它只处理一层，不删除空对象，也不递归应用 known keys。

Foundation 不公开 `findUndefinedJsonPaths`、`hasDefinedOwnFields`、领域 Source parser 或通用 IR schema builder。provider callback 的 options / output、opaque metadata 与 operation 仍在各自外部边界组合适用的 JSON 或 plain-container 契约；Render、Vanilla 等允许函数或宿主对象的 runtime config 不属于 Source JSON，不得套用 `snapshotJson`。

## 行为、失败语义与兼容性

- 默认行为：完整 Source 接纳只执行一次 `snapshotJson`，再由 owner schema 解析其返回值；省略 optional field 合法，显式 `undefined` 在对象字段、数组元素或根值任一位置均非法。快照后的非空稀疏对象继续把 `false`、`0`、空字符串与 `null` 视为实际 authored value
- 失败与诊断：JSON 预处理遇到首个非法值立即抛出 `RetikzFoundationError`，path 从调用方提供的 Source 根名开始；领域 API 可以在自身错误边界保留 cause 并转换为 owner 错误。领域 schema 继续拥有未知字段、字段类型、非空组合与跨字段 issue。runtime patch 的未知字段不被过滤，仍由 strict owner schema 统一拒绝
- 性能：`snapshotJson` 的时间复杂度为 `O(N)`，复制结果占用 `O(N)` 空间，遍历栈与循环检测按当前深度占用 `O(depth)`；fail-fast 不为所有错误位置分配结果集合。领域 schema parse 是独立且必要的结构校验，不计作第二次 JSON 预处理。已接纳 Source 的内部阶段和嵌套 Composite 禁止重复扫描整棵 JSON 树
- 兼容性 / breaking：此前接受显式 `undefined` 的完整 Source 入口改为 fail-loud；直接使用公开 Zod schema 的调用方必须先组合 `snapshotJson`，schema 本身仍只承载领域结构。不提供静默清理、旧行为开关或兼容 alias。`cloneAndFreezeJson` 直接更名为 `snapshotJson`。runtime Definition 已知字段的 undefined-as-omitted 行为保持不变，只把各包的重复实现迁移到 Foundation
- React / Vanilla 等价性：React 与 Vanilla 对 typed authoring input 复用同一 Vanilla normalization，并在完整 Source 形成处执行一次统一接纳。authoring 层可以通过条件组装省略已知 optional `undefined`，但不得把它带入最终 Source；直接 Source JSON、Vanilla、React 与 SSR 对同义输入产出相同 Source / Scene 或同类诊断
