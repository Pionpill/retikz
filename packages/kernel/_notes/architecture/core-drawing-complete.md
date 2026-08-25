# Core 绘图完备设计

> **状态：长期架构真源，不跟随单个版本维护功能清单。** 本文定义 Drawing Complete 能力域的边界与检测方法，主责包是 `@retikz/core`。总纲见 [`notes/architecture/capability-design.md`](../../../../notes/architecture/capability-design.md)，当前包职责以 [`packages/kernel/AGENTS.md`](../../AGENTS.md) 及各包就近 `AGENTS.md` 为准。本文不覆盖 plot / chart 等数据语义、具体 renderer 的实现便利或 React / Vanilla 的体验封装。

---

## 1. 定位与问题边界

`@retikz/core` 是 **Foundation of Graph System**，解决上层模块和不同 renderer 缺少统一二维图形语义、扩展契约与编译产物的问题。

它的完备方向是 **Graphic Complete / Drawing Complete**：

> 在后端中立的静态二维图形边界内，新增同类图形语义时，应能通过统一的 JSON IR、扩展契约和编译管线进入 Scene，无需由 plot、adapter 或 renderer 私造平行图形模型。

Drawing Complete 不表示 core 内置所有 shape、diagram preset 或视觉效果，也不表示每个 renderer 必须无条件支持所有能力。它要求语义先由 core 正确定义；下游要么等价执行，要么通过明确契约诊断降级，不能静默形成不同含义。

## 2. 包角色与交界面

| 角色         | 包                                | 责任                                                                                                | 不拥有                                                               |
| ------------ | --------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 计算底座     | `@retikz/math`                    | 零依赖纯几何、向量、仿射、求交和曲线计算                                                            | IR、Scene、layout 语义                                               |
| 执行底座     | `@retikz/runtime`                 | identity、ownership、program、transaction、revision 与 trace；协调 Core 等领域 program              | Core IR、Scene、几何、renderer                                       |
| 主责包       | `@retikz/core`                    | Core IR、definition / registry、compile、Scene、Composite assembly 与 headless sidecar              | DOM、renderer 实例、框架状态                                         |
| Scene 执行包 | `@retikz/render`                  | 把 Scene 映射到 SVG / Canvas 等后端，报告能力降级                                                   | 新图形 IR、上层领域语义                                              |
| API 基础包   | `@retikz/vanilla`                 | `InputXxx -> Core IR`、编译 / runtime 选项与 framework-neutral processing session / readonly result | Core 图形语义、DOM 与框架生命周期                                    |
| 框架宿主     | `@retikz/react` 等                | 框架语法到 Vanilla Input、框架生命周期、订阅结果与宿主桥接                                          | Core IR builder、compile driver、Runtime session、平行 renderer 编排 |
| 上层消费方   | plot / table / standard 等 Tier 2 | lowering 到 Core IR，复用 Core contract；按需把领域 program 装配到 `@retikz/runtime`                | Core 的通用图形、几何和 renderer 语义                                |

完整闭环可以跨包，但语义所有权不能漂移。比如 renderer 负责实现 blur，不等于 blur 可以只存在于 SVG descriptor；React 负责 JSX authoring，不等于 shape extension 可以只存在于组件映射。

## 3. 能力链路

```text
Core IR / schema
  -> contract / definition
  -> contribution / dependency provider graph assembly
  -> provider / registry
  -> Theme selector context / style registry resolution
  -> compile / lowering
  -> Scene / headless manifest
  -> runtime coordination / render execution / adapter integration
```

某些封闭字段不需要独立 definition / registry；ADR 必须说明它为何是固定数据契约，而不是可扩展能力。不能为了形式完整凭空增加 registry，也不能用“只有内置项”掩盖真实扩展需求。

## 4. 能力面

| 能力面                | 目标                                                                                                                       | 主责交界                                                                                                                         | 不属于 Drawing Complete                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Primitive / Scene     | 定义后端中立的最小可渲染图元                                                                                               | core 定义，render 执行                                                                                                           | SVG-only / Canvas-only 快捷 API                |
| Geometry              | 提供纯函数几何计算和图形构造基础                                                                                           | math 提供通用计算，core 赋予图形语义                                                                                             | 单一 domain layout、DOM 测量                   |
| Target / Coordinate   | 支持节点、锚点、边界、局部坐标和命名引用                                                                                   | core                                                                                                                             | plot scale、geo projection                     |
| Transform             | 表达结构化图形空间变换                                                                                                     | core 定义，render 执行                                                                                                           | 数据 transform、runtime 状态机                 |
| Constraint / Layout   | 承载跨图形通用定位和约束                                                                                                   | core；纯算法可下沉 math                                                                                                          | flow / graph / table 领域布局                  |
| Style / Resource      | 表达 paint、marker、pattern、clip、effect，并为 Composite 提供可持久化的 Scene / Scope Theme selector 环境与 shared colors | core 定义 Theme IR、继承、style registry、shared colors 与 `InspectionAppearanceContext`，领域 owner 物化默认，render 实现或诊断 | 领域 token vocabulary、preset 具体值与私有效果 |
| Composition           | 用 scope、group、zIndex、meta 组合复杂图形                                                                                 | core                                                                                                                             | 上层私有节点树、不可持久化组合                 |
| Capability Assembly   | 让嵌套 Tier 2 通过完整 composite key、roots 与显式依赖形成确定性 definition 闭包                                           | core 定义 provider graph 与 resolver，adapter 收集，领域 owner 发布 provider                                                     | 动态 import、package discovery、全局注册       |
| Spatial Transparency  | 让 Composite 声明语义空间并在最终 transform 后发布 qualified、renderer-neutral 查询 sidecar                                | core 定义 declaration、owner path、world geometry、index 与 selector；领域 owner 定义 role / payload                             | renderer hit-test、DOM identity、领域查询词汇  |
| Interaction Readiness | 提供 target、hit area、role、intent、provenance 与查询 manifest                                                            | core 定义 headless 契约，adapter / runtime 消费                                                                                  | UI、selection 状态机、DOM handler、键盘策略    |

Interaction Readiness 是横切闭环条件，不把 Drawing Complete 扩张成交互运行时。静态图形可以没有交互 intent；一旦声明交互语义，就必须可追踪、可定位且不依赖 adapter 从 primitive 反推。

Composite assembly 与 composite registry 是相邻但不同的契约：registry 负责 compile dispatch，provider graph 负责从显式 roots 解析跨 namespace 的传递 definition / dataset 闭包。两者都由 Core 解释，React、Vanilla 与领域包不得建立内置白名单、私有 bundle 或不同的冲突规则。

Spatial sidecar 与 Scene 也是相邻但不同的产物：Scene 只承载 renderer execution；qualified handles 与 Scene、artifacts、diagnostics provenance 在同一 compile revision 生成和提交，但由 Core query / tooling 消费。外层 Composite 只能为 descendant owner path 增加前缀，不能复制、重命名或丢弃内部 handle。

Core shared colors 是跨包 value contract，不是领域 palette。Core Inspector 对 occurrence 使用 active `palette.categorical` 的稳定取余并从 `semantic.warning` 生成 warning appearance；Standard 只消费 Core 生成的 `InspectionAppearanceContext`，不读取 token bag、维护 categorical array 或重新实现颜色分配。

## 5. 准入原则

### 5.1 是否属于 Drawing Complete

通常应同时满足：

- 增强通用二维图形表达，而不是只服务单个上层 domain、demo 或 renderer。
- 能用 JSON-safe Core IR 或 runtime definition 描述。
- 能编译成 renderer-agnostic Scene 或同步的 headless manifest。
- 不依赖 React、DOM、Canvas / SVG 实例或 plot 数据语义。
- 缺失时会迫使多个上层模块复制图形、几何、target 或 renderer 语义。
- 跨领域视觉环境需要随 Scene / Scope 持久化并按绘图树继承；Core 负责 selector 传递、Core style registry、derived shared colors 与 Inspector appearance，具体 token vocabulary、preset、resolver 与 mapping 仍由领域 owner 拥有。Core 不传递领域 token bag；领域以同名 owner-local style definition 解析自己的默认值。

不满足时优先放到 math、render、plot / domain 包或 adapter。

### 5.2 是否需要新底座

现有 Core IR、Scene primitive、definition 或组合能力足够时优先复用。只有出现以下情况才增加底座：

- Scene 无法正确表达通用图形语义。
- 多个上层重复实现同类几何、引用或资源规则。
- 自定义能力无法通过现有 contract / registry 接入。
- renderer 之间需要共享新的后端中立意图。
- 缺口会迫使上层私造平行 IR、Scene 或 target / provenance。
- 嵌套 Tier 2 的 definitions / datasets 需要跨 namespace 传递时，必须使用 Core assembly contract；不能让 adapter 通过 module-level registration 或 namespace maker 猜测闭包。
- 声明语义空间时，local key、role 与 domain payload 由领域 owner 保留，Core 只负责 qualified owner、最终 world transform、索引与闭合 selector；不得从 renderer primitive 反推。

### 5.3 是否形成闭环

```text
schema / input 可表达
contract 可扩展或明确封闭
provider 可内置
compile 可消费
Scene / manifest 可承载
render 可执行或诊断降级
Vanilla 处理与各框架宿主桥接可等价暴露
tests 可锁定
docs / notes 可解释
```

只加 schema、只让 SVG 能画、只在 React 中拼装，或只有内置实现而没有必要的扩展入口，都不能称为 Drawing Complete。

## 6. 设计检查模板

```md
## 绘图完备性检查

- 能力面与解决的问题：
- 是否属于 Drawing Complete：
- 主责包与协作包：
- 是否可由现有能力组合：
- math / core / render / adapter 的责任切分：
- 是否需要新 IR / contract / registry：
- Scene / manifest 如何承载：
- Composite assembly 与跨 namespace 依赖如何闭环：
- qualified spatial handle、owner path 与 Scene 边界是否适用：
- renderer 实现或诊断降级：
- Vanilla authoring / processing 与 React 等框架宿主如何等价暴露：
- Interaction Readiness 是否适用：
- 不支持边界与本轮结论：
```

评审优先拒绝两类方案：能力放错层，以及只完成局部路径却把它描述成 core 能力。

## 7. 与现有设计的关系

- `packages/kernel/core/AGENTS.md` 是主责包硬约束；`packages/kernel/AGENTS.md` 定义协作包职责。
- `standard-structure` 与适用的 `standard-*` skills 决定代码落层。
- kernel ADR 记录具体版本的语义、兼容性和实施取舍。
- `develop-completeness` 用本文能力面做阶段性横向审计。

本文负责稳定边界，不负责维护具体功能清单。改变 Drawing Complete 的问题范围、主责包或 Scene / manifest 基本输出，需要先更新架构决策，不能由单个 renderer 或 adapter 实现倒推。
