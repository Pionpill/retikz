---
description: 同一视口按名称组合独立 Scene 编译会话，分层继承配置并分别更新，按层序合成结果
keywords: Layer、图层、OpenString、Reconciler、Weave、全量编译、增量编译
---

# ADR-087：具名图层的独立编译与更新

- 状态：Accepted
- 决策日期：2026-11-19
- 关联：[作者输入](./029-vanilla-authoring-normalization.md)、[会话入口](./082-scene-reconciler-entry.md)、[独立编译驱动](./086-independent-compilation-drivers.md)、[保留式渲染](./014-scene-patch-renderer.md)

> [090](./090-remove-inspect.md) 退役通用 Inspect 和单图只读辅助层；原有主图编译、领域产物与具名 Scene 图层不受影响。

## 决策

一个视口可以同时承载多张计算上独立的图。Layer 是视口内具名的 Scene 编译与更新单元，不是 Core IR 节点。背景、主图和交互浮层即使共用坐标系，也不需要共用一棵声明树。按名称提交一层的更新，不要求调用方重新提交视口或兄弟层的输入，也不调度兄弟层的编译。

## 基础数据结构与公开契约

以下 TypeScript 描述作者输入与处理选项，不是 Core IR。视口公共配置沿用 processing 的 `compile` 入口，并在同一级增加 `reconciler`；单层的 config 声明同形字段，不需要另设 `compileMode` 或重复传入公共配置。

```ts
const BuiltinLayerName = {
  Background: 'background',
  Main: 'main',
  Overlay: 'overlay',
} as const;

type LayerName = OpenString<ValueOf<typeof BuiltinLayerName>>;

type ProcessOptions = {
  compile?: CompileOptions;
  reconciler?: Omit<FullSceneReconcilerOptions, 'target'> | Omit<IncrementalSceneReconcilerOptions, 'target'>;
};

type InputLayer = {
  type: 'layer';
  name: LayerName;
  zIndex?: number;
  config?: ProcessOptions;
  scene: IRScene;
  bindings?: Pick<SceneNormalizationResult, 'contributions' | 'runtimeInputs'>;
};
```

公共执行配置传给层栈入口；单层用 config 覆盖。视框、主题、动画与作者信息属于各自场景；多个场景需要同一视框时可共享调用方的配置。图层只持有 IR。作者输入在创建图层时归一化一次；收集到的贡献与实例输入仅用于该场景，不进入会话默认配置。已有 IR 直接包装，不覆盖根字段。

```ts
const layers = [
  layer({ name: 'background', scene: backgroundIR }),
  layerFromInput({ name: 'main', scene: scene(children) }),
];
const results = compileLayers(layers, options); // 一次性编译
const stack = new LayerStack(layers, options); // 持续更新
const main = stack.get('main'); // 借用本层 SceneRuntime
```

### 输出形态

单图编译始终返回一份结果；分层入口始终返回按层序排列的具名结果集合，即使为空或只有一层也不展开。图层包装完整场景。场景的归一化、匿名嵌入身份和 adapter 身份路径均不依赖层名；跨层定位由宿主结合层名与场景内身份完成。driver 产生的只读辅助层仍归所属单图结果。

### 名称与层序

作者以 `name: OpenString<'background' | 'main' | 'overlay'>` 标识图层。名称在视口内唯一且在层生命周期内稳定，重名输入拒绝；改名等价于移除旧层并创建新层。直接声明 `scene(children)` 只创建单图，不隐式创建图层。

| 名称       | 缺省 zIndex | 具名会话预设              |
| ---------- | ----------: | ------------------------- |
| background |           0 | mode: ReconcilerMode.Full |
| main       |          10 | 无覆盖                    |
| overlay    |         100 | 无覆盖                    |
| 其他名称   |          10 | 无覆盖                    |

层显式提供的 `zIndex` 优先于表中默认值；层按有效值升序绘制，相同值保留声明顺序。元素的 `zIndex` 只在本层内参与排序，不能穿越层边界。调整层序不改变元素身份，也不重新编译图元。

### 配置与会话

视口公共默认配置与单层覆盖均使用两组字段：`compile` 复用现有 `CompileOptions`（包括测量、精度与 Definition 集合）；`reconciler` 复用 `SceneReconcilerOptions` 中的会话执行选项，但不开放 `target`。输出提交目标归视口宿主管理，不继承、不共享给各层释放。配置属于运行时接线，不写入可持久化的 Core IR。

两组分别按**字段**取值：单层显式值优先于内置名称预设，预设优先于视口公共配置，最后才使用既有底层默认值。省略或 `undefined` 表示继承；`false`、`0`、空列表均为显式值。列表、回调与对象字段整体替换，不拼接注册表、不串联回调、不递归合并。自定义名称与内置名称使用同一解析流程，名称本身不注册绘图能力。

例如，公共 `compile.precision: 3` 与 `reconciler.mode: ReconcilerMode.Incremental` 对所有层生效，但背景预设只覆盖后者；背景实例显式指定 `mode: ReconcilerMode.Incremental` 即可恢复增量模式，精度仍为 3。先确定有效模式，再选适用字段：全量模式不继承 `updateStrategy`；在同一声明中显式组合 `mode: ReconcilerMode.Full` 与 `updateStrategy` 不合法。增量会话的 `updateStrategy: 'full'` 是强制重算策略，不等于非增量会话。

层栈按名称拥有独立的 SceneRuntime；单图读取、替换、增量更新、诊断与导出直接使用该实例。层栈发布按层序排列的具名快照，包含通过子会话直接提交的结果；移除、整栈替换或生效配置改变时，由层栈释放不再使用的实例。每层独立持有 Reconciler 会话。全量模式只在本层需要编译时完整计算，不保留 Weave 树；增量模式才维护本层 Weave 树，并接受该会话的权威批次。完整替换和批次更新保持既有区别，不从完整输入猜测局部差异。模式随会话固定；有效模式改变时只重建目标层的会话，旧结果或批次地址不能用于新会话。省略模式时沿用 Reconciler 默认的全量模式，除非被配置或预设覆盖。

### 隔离与合成

元素 ID、名称解析、锚点与批次地址只在所属图层有效，不同层可以重名。查找本层没有的目标沿用本层的缺失引用语义，不搜索其他层。弹窗跟随主图按钮属于宿主协调：由应用共享位置，或由宿主从主图已提交且可用的结果取得位置，作为浮层输入；不建立跨树订阅，不为此新增通用锚点查询 API。

视口按层组合各层**最后成功提交**的结果；更新一层失败，不发布该层候选，不改变其他层的内容或会话版本。移除一层只释放该层持有的资源。各层共享视口坐标基准；资源引用、渲染身份与命中目标仍须能区分所属层，不能因两个 Scene 内的 ID 相同而串层。Render 已有的后置只读辅助层不是可独立更新的作者图层。

第一阶段只交付计算隔离和有序的具名结果。现有渲染入口继续消费单图，不自动合成结果列表；多层视口合成、命中与框架宿主接线留到渲染阶段。后续可按后端分别保留 SVG 子树或 Canvas 表面，避免重放未变层；不承诺每层一个物理画布，也不把独立编译解释为免除最终合成。

## 替代与边界

本决策替代 ADR-029 的作者层平铺规则及 ADR-014 中对应的作者层缓存提示：`id` 改为 `name`，移除 Layer 的 `cache` 与其策略折叠，不提供旧名转发，也不把 `static / dynamic / auto` 映射成编译模式。不新增平行的 `compileMode`。Vanilla 拥有作者配置与会话组合，框架适配复用 Vanilla；Core 保持单图绘图语义，Reconciler 保持单会话执行和事务边界。本决策不是 alpha.7 交付项。
