---
description: 为真实 composite 实例绑定领域中立的同步运行时输入，显式传递嵌套与生成子项，保持布局测量、retained revision 与 JSON Source 隔离
keywords: Composite、runtimeInputs、Source、Layout、revision、Vanilla
---

# ADR-048：Composite 实例运行时输入

- 状态：Accepted
- 决策日期：2026-10-03
- 关联：[kernel v0.5 roadmap](./roadmap.md) · [包职能设计](../../../../../../notes/architecture/package-responsibility-design.md) · [Core 能力边界](../../../architecture/core-drawing-complete.md)
- 前置：[布局 Composite](./007-layout-aware-composite.md) · [Provider graph](./027-composite-dependency-provider-graph.md) · [匿名作者身份](./045-anonymous-input-embed-identity.md) · [异步作者准备](./047-async-authoring-preparation.md)

## 背景与决策

多个 composite 实例共享 Definition，却可能拥有不同的准备结果。Core 提供独立于 JSON Source 的实例输入绑定，以实际 Source 属性路径定位，领域 Definition 解释载荷，Core 只运输完成后的同步输入。源解析、JSON capture、匿名节点、局部 namespace 和重复布局测量均不得改变对应关系。

绑定不使用公开 id、结构 hash 或测量顺序匹配，不进入 Source、Scene、artifact、空间索引或持久化结果。Promise、引擎、数据模型与准备生命周期仍由领域及 Vanilla 拥有。

## 公开契约

```ts
type CompositeInputPath = ReadonlyArray<string | number>;
type CompositeInputBinding = Readonly<{
  path: CompositeInputPath;
  input: unknown;
}>;

createCompositeInputBindings(
  source: IRScene,
  bindings: ReadonlyArray<CompositeInputBinding>,
): CompositeInputBindings;

interface CompositeRuntimeInputContext {
  readonly runtimeInput: unknown;
  sourceChild(path: CompositeInputPath): CompositeBoundChild;
  bindChild(child: IRChild, bindings: ReadonlyArray<CompositeInputBinding>): CompositeBoundChild;
}
```

CompositeInputBindings 是 Core 创建并与完整 Source 配对的不透明集合，通过 CompileOptions.compositeInputs 接入 static/observed compile。expand 与 layout-aware compile 共用上述 context；未绑定实例的 runtimeInput 为 undefined，不触发默认计算。载荷由调用方借出，调用期间保持只读，Core 不校验领域内容。

path 精确指向原始 Source 的 composite，数字为数组下标，空路径表示当前贡献 node；不绑定 Kernel 节点。创建时检查路径存在、目标与唯一性。等价 JSON capture 保留绑定语义，Source 内容变化后旧集合无效，错误须在领域 callback 前暴露。

## 子项传递与布局

普通 Source Scope traversal 自动携带后代绑定；composite 内部字段由该 composite 显式转交：

- sourceChild 按当前 composite 原始 Source 的相对路径选取完整 IRChild，携带子树全部绑定，不依赖 schema 解析后的对象 identity。
- bindChild 为生成 IRChild 提供相对该 child 的绑定，不修改 JSON，也不自动继承父输入；Chart 生成 Plot 等路径使用同一契约。

两者返回仅属于当前 callback/compile 的 CompositeBoundChild，不能序列化、复制伪造或跨 callback 使用。layoutChild、expand/compile 输出 children 及 runtime scope children 接受 IRChild 或绑定句柄，共用既有编译与布局链。句柄可反复测量、随 Theme replay 重新物化，但只消费同一只读输入，不重跑 preparation；最终输出只允许放置一次。重复作者内容须使用明确独立的生成子项，不能把一次 preparation 当作两个作者位置。

路径缺失、非 IRChild、生成绑定错位、跨 callback/compile、伪造句柄或重复输出均为 Core contract error。丢弃的 probe 不发布绑定子项，既有可恢复布局错误与致命错误区分保持不变。

## 作者接入与原子更新

Vanilla InputEmbedContribution 可携带相对 node 的 runtimeInputs；NormalizedInputEmbedChildren 返回相对 children 数组的绑定。父 adapter 按实际输出字段重定位，Vanilla 只汇合为最终 Source 位置，不猜测领域 child slot。同步 lower 与异步 execute 使用同一贡献契约；React 构造 Vanilla Input，不生成 Source 路径或绑定。

CoreCompositeInputOwnerDefinition 保存绑定集合或 undefined，以集合 identity 判定变化。createCoreProgram 通过 CoreProgramRuntimeOptions.compositeInputOwner 接入后，从当前 candidate snapshot 读取绑定，固定 CompileOptions 不再提供另一份。调用方必须将新 Source 与新绑定置于同一 Runtime transaction；JSON 未变而准备结果改变时，也须以新集合触发编译。

Source、绑定和 Theme 属于同一请求。Vanilla 按 ADR-047 在同步编译和提交前检查失效；失败事务恢复上一份 Source、绑定和结果，取消或被替代的请求不能更新已提交绑定。

## 行为与兼容性

绑定不是全局 registry，不改变 provider graph 的 namespace/type 合并和冲突规则。官方与第三方 Definition/adapter 使用同一契约，适用于 Vanilla、React、直接 IR、standalone 和 Layout。

领域 callback 依自身运行时契约消费 unknown 载荷；需要准备结果却未绑定时必须明确失败，不能重新执行已声明的外部任务。未提供绑定的普通同步 composite 沿用既有行为，不新增 Source 字段、公共 id、完成标记、数据引用改写或旧 API 兼容层。
