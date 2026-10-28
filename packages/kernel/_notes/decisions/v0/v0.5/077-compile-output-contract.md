---
description: 将普通编译输出收敛为 Scene 与 Composite 领域产物，删除观测、节点布局产物及空间句柄
keywords: 编译产物、CompositeArtifact、Inspect、observer、nodeLayouts、spatialHandles、Reconciler
---

# ADR-077：收敛 Core 编译产物与扩展边界

- 状态：Accepted
- 决策日期：2026-10-28
- 关联：[roadmap](./roadmap.md) · [007](./007-layout-aware-composite.md) · [021](./021-extensible-inspector-content.md) · [028](./028-qualified-spatial-handles.md) · [039](./039-builtin-inspection.md) · [052](./052-unified-composite-compilation.md) · [绘图完备性](../../../architecture/core-drawing-complete.md)

## 背景与目标

检查工具应当从已经完成的绘图结果中读取信息。为观察者保留选择、所属者产物发布、最终事件派发和上下文片段编译，使 Core 承担了检查工具的执行生命周期，也使 Reconciler 的复用与输出提交受观察者影响。节点布局摘要又形成一套独立的专用收集出口。

Core 需要收敛到正常绘图及领域组合所需的产物。可选检查工具只能消费公开结果；缺少的信息可以不支持，不以检查需求扩张基础编译契约。

## 决策：编译独立完成，工具消费结果

Core 不提供编译观察者、观测所属者产物或检查专用环境。删除 observed compile 入口及其 session、select、observe、complete、publisher、observer outputs 和上下文隔离片段编译契约。Path Definition 不再声明或发布 owner output，其上下文和定义泛型不再携带所属者产物类型。

删除 Node 布局摘要的公共产物、请求开关和回传能力。Node 正常绘图、Composite 子项测量、引用解析和跨次复用所需的布局状态继续由原有编译契约承担，不转换为另一种检查专用输出。

Shape 与 Boundary 不再为检查提供独立的轮廓、结构关键点出口，删除对应的 `computeOutline`、`computeKeyPoints` 观测能力。形状发射、内容包围、锚点和连接边界求解仍服务正常绘图；实现这些能力所需的共享几何保持其原有职责。

Core 普通编译只输出 Scene 与 Composite 领域产物。来源信息与诊断仍服务编译、身份关联和提交；Reconciler 继续拥有跨次缓存与事务，不持有观察会话，不因检查器的注册、选择、失败或开关而改变主图计算和提交。检查工具可以用普通绘图 API 编译自己的独立输入，但不能借用主编译内部上下文。

## 基础数据结构与公开契约

```ts
type CompositeArtifact<
  TNamespace extends string = string,
  TType extends string = string,
  TValue extends JsonValue = JsonValue,
> = Readonly<{
  namespace: TNamespace;
  type: TType;
  occurrence: CompileOccurrenceLocator;
  value: TValue;
}>;

type CompileResult<TArtifact extends CompositeArtifact = CompositeArtifact> = Readonly<{
  scene: Scene;
  artifacts: ReadonlyArray<TArtifact>;
}>;
```

`artifacts` 只收集 Composite 主动返回的领域结果，例如 Layout 的容器、分行与间距信息。`namespace` 与 `type` 取自 Composite Definition；`occurrence` 标识同次编译的最终出现位置；`value` 的结构和语义由领域 owner 决定。相同定义的不同出现位置分别保留记录，不按注册键合并。

删除固定的 `kind: 'composite'`，将 `CompositeCompileArtifact` 更名为 `CompositeArtifact`，删除 `CompileArtifact` 联合与节点产物分支，不保留同义别名。`CompositeArtifactOf` 继续从具体 Definition 推导产物，保留注册键与领域值之间的类型关联。

Composite 继续通过 `artifactSchema` 声明 JSON-safe 领域产物契约，通过回调结果中的可选 `artifact` 提供值。已类型化回调由作者满足契约，Core 不重复执行 schema 结构解析。产物在交付时与作者对象隔离并递归冻结；不保存函数、内部句柄或编译上下文。领域值为 `null` 时仍是有效产物，未提供 `artifact` 才表示没有该条产物。

只发布最终可达输出中的产物，丢弃的试算候选不进入结果；数组保持最终逻辑树的确定顺序。没有产物时返回空数组，不提供开启产物收集的选项。

`occurrence` 保留来源路径和结构化展开路径，不承担跨 revision 稳定身份。用于 Composite 输出、试算和重放的定位继续存在；仅用于观测 Clip 应用的 `clip` 路径类别删除，正常裁剪与裁剪资源不受影响。

Composite artifact 不新增通用 transform、祖先链、主题或检查配置。其坐标语义由领域契约明确，Core 不猜测 `value` 中的几何，也不把领域值自动转换为世界坐标。删除 qualified spatial handles 的声明、发布、世界坐标投影、索引与查询契约，包括 CompileResult.spatialHandles、Composite 返回值及 createScope 参数中的空间声明、selectSpatialHandles 和 resolveSpatialHandle。正常 Scope 变换、布局边界、引用定位与 renderer 命中语义继续保留。

需要表达领域布局信息时，Composite 可通过自己的 artifact 返回领域结果；这不提供通用世界坐标查询保证。可见容器外框通过普通绘图表达；检查工具只展示能从已有产物可靠确定的信息，不支持的几何明确省略。不得将已删除的空间索引原样迁入 artifacts、Scene.meta 或 adapter 私有状态，也不增加 Core 通用坐标投影出口作为替代。

编译准备入口继续交付 `result`、`diagnostics` 与按需收集的 `provenance`，移除 observer 配置与输出。普通编译入口继续返回 `CompileResult` 并按原有规则派发警告。

## 行为、失败语义与兼容性

- 相同输入与绘图配置产生确定的 Scene、资源和领域产物。检查器配置不属于主图编译输入，检查失败不使主图编译失败或触发主图回滚。
- Core 与 Reconciler 自身的绘图错误、诊断、试算恢复及提交失败语义保持不变。失败候选不泄漏产物；成功发布的各项结果属于同次编译或同一提交 revision。
- React 与 Vanilla 都读取同一 Core 结果，不提供节点摘要请求、observer 注入或适配器私有的替代观测机制。现有 artifact 读取与提交通知继续传递 Composite 产物；直接接收 Scene 的入口没有 Composite 产物。
- Renderer 继续消费 Scene，普通只读图层仍可供上层使用；检查内容的选择、生成、坐标处理和宿主叠加由独立的 Inspect 决策规定。
- 这是 0.x breaking 变更，旧观测入口、节点产物、空间句柄及其查询入口和旧类型直接删除，不保留兼容层、空实现或旧名转发。
- 本决策接受后，替代 [021](./021-extensible-inspector-content.md) 与 [039](./039-builtin-inspection.md) 中的 Core 观测、所属者输出和专用几何出口决策，替代 [007](./007-layout-aware-composite.md) 中的节点产物及旧 artifact envelope，并结束 [v0.4/036](../v0.4/036-node-layout-measurement.md) 的公共节点测量观测路线。同时替代 [028](./028-qualified-spatial-handles.md) 的空间句柄机制及 [046](./046-reference-and-spatial-handle-aliases.md) 中的空间句柄别名部分；正常引用别名、Composite 布局与重放以及普通只读图层契约继续有效；Inspect 的替代消费模型由配套决策完整定义。
