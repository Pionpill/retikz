# Diagram Notation 完备设计

> **状态：长期能力边界已确认，首个 package family 由 v0.1 alpha.1 ADR 落地。** 本文回答“什么属于 `@retikz/notation`”以及“怎样才算形成可复用图式元素闭环”，不维护具体组件清单或版本完成状态。
>
> 关联：[`Diagram 制图能力域设计`](../../../../notes/architecture/diagram-design.md) · [`能力完备性与模块边界`](../../../../notes/architecture/capability-design.md) · [`Core Drawing Complete`](../../../kernel/_notes/architecture/core-drawing-complete.md) · [`Standard Drawing Library`](../../../library/_notes/architecture/standard-library-design.md)

## 1. 定位与问题边界

Notation 解决的是：

> 用稳定、JSON-safe、renderer-neutral 的元素表达流程、UML、状态、架构等图式中可独立绘制和复用的语义，使作者、工具与 LLM 不必从 shape、颜色或坐标反推职责，并让未来 Graph presentation 可以复用同一元素库。

Notation 是 Diagram foundation，不是 GraphModel。元素可以单独出现在 Core scene、Standard layout 或其它 Tier 2 composite 中；全局 nodes / ports / edges / groups、拓扑验证、算法几何与编辑状态分别归 Graph、Flow 与 Editor。

## 2. 包角色与完整链路

| 角色           | 主责包 / 协作包                   | 责任                                                                    | 不拥有                         |
| -------------- | --------------------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| Notation 主责  | `@retikz/notation`                | schema、factory、语义 sugar、Definition、lowering、局部 artifact 与诊断 | GraphModel、自动布局、renderer |
| 通用布局与呈现 | `@retikz/standard`                | FlexLayout、Frame、spacing、artifact 与公共 composition contract        | 图式角色与关系语义             |
| 图形表达与编译 | Core / Math                       | Node、Path、target、shape、layout-aware contract、Scene 与几何          | Notation 领域语义              |
| authoring      | notation-react / notation-vanilla | 构造同一 Notation / Core IR 并接入宿主                                  | schema、lowering、布局算法     |
| 未来关系模型   | Graph                             | 选择 Notation presentation 并组织全局关系与 geometry                    | Notation 元素内部实现          |

```text
JSON / direct IR / React / Vanilla
  -> Notation schema or Core Sugar
  -> Notation Definition / lowering
  -> Standard public layout composition + Core IR
  -> Scene
  -> renderer
```

任一元素若只能在 React、demo、某个 renderer 或未序列化 helper 中成立，都不算 Notation 闭环。

## 3. 完备能力面

| 能力面            | 完备目标                                              | 关键不变量                      |
| ----------------- | ----------------------------------------------------- | ------------------------------- |
| Semantic identity | 角色由 schema / describe / discriminator 表达         | 不由 shape、颜色或位置代替      |
| Core Sugar        | 简单语义直接输出基础 Core IR                          | 不为命名一致性强造 composite    |
| Tier 2 composite  | 局部布局、target、artifact 与多图元输出完整闭环       | 不复制 Core / Standard 机制     |
| Composition       | 元素能独立使用，也能进入 Standard layout 与未来 Graph | 无 GraphModel 隐式依赖          |
| Extension         | 开放 role / appearance 沿既有契约扩展                 | 不建立隐藏白名单或第二 registry |
| Authoring parity  | direct IR、React、Vanilla 产生等价输入与结果          | JSX children 只是 sugar         |
| Diagnostics       | schema、definition、target 与 child layout 失败可定位 | 不用 placeholder 静默兜底       |
| Traceability      | authored id 与适用 artifact / Scene identity 稳定     | 不从 Scene 反推完整领域模型     |
| Docs / LLM        | describe、API 与双语 recipe 可发现且一致              | 文档不把 recipe 误写成独立 IR   |

## 4. Core Sugar 与 Tier 2 判定

新增元素先回答：

1. 除固定 shape、默认值和职责 describe 外，是否仍与一个 Core IR 完全等价
2. 是否需要多个 children、局部布局、target、artifact、identity facade 或多图元 lowering
3. 是否具有独立、长期可持久化的图式语义，而不是某个页面 recipe

第一类优先做 Core Sugar；第二类且语义成立时做 Tier 2 composite；仅由现有元素组合且没有新不变量时保留为 docs recipe。两类都不得把函数、ReactNode、renderer 对象或运行时编辑状态写入 IR。

## 5. Standard / Core 复用边界

Notation 可以拥有“LogicFrame 是有序语义区域”“Connector 是局部关系”“Callout 是对目标的说明”等职责，但不拥有它们依赖的通用布局和几何算法：

- children 排布复用 Standard FlexLayout / GridLayout / OverlayLayout
- spacing、axis sizing、allocation、clip 与 layout artifact 复用 Standard 公共 composition contract
- Node、Path、shape、anchor、target 解析与 Scene identity 复用 Core
- renderer 只消费最终 Scene，不识别 Notation discriminator

Notation 不得跨包 deep import Standard `internal` / `pipeline`，也不得复制 solver。若多个上层需要同一内部语义，Standard 应提供最小、命名清晰的公共原子契约；若只有一个元素需要局部组合，优先复用完整公开 layout compiler，不公开无关内部状态。

Standard 公共 composition API 是无隐式注册的 owner-to-owner 组合面：上层 composite 可以在自己的 compile 中直接调用公开 compiler，并继承其 probe、replay、artifact 与失败语义；独立 authored Standard layout 仍通过显式 Definition 注入。直接组合不建立第二个 registry，也不允许上层访问 solver 的可变中间状态。

## 6. 语义开放与未来元素

Notation 的统一入口不是封闭的组件枚举。UML Class、State、actor、lifeline、fork / join、note 等候选应从真实用例提炼，但不得因为“未来可能需要”提前固化字段。每个候选都经过 Core Sugar / Tier 2 / recipe 判定，并证明：

- 去除具体产品词汇后仍是可复用图式语义
- 可以脱离 GraphModel 独立绘制
- 默认呈现可替换而语义身份不丢失
- 与已有元素没有重复持久化真源
- 直接 IR、React、Vanilla、tests 与 docs 能闭环

完整 UML 元模型、状态转换规则、工作流执行、端口连接约束与全局拓扑不进入 Notation。

## 7. 迁移与兼容原则

当一个既有元素被确认放错 owner 时，`0.x` 阶段直接迁移到 Notation，并同步 schema、Definition、adapter、docs 与测试。旧 owner 不保留 re-export、别名、双 namespace 或双 registry；否则两个包会同时宣称语义真源。迁移 ADR必须写清 canonical namespace、release group、下游更新和 superseded 关系。

## 8. 准入与闭环检查

新的 Notation 元素进入 roadmap / ADR 前至少回答：

```md
## Diagram Notation 完备性检查

- 用户问题与图式语义：
- Core Sugar / Tier 2 composite / docs recipe 判定：
- JSON-safe 输入、identity、target 与 artifact：
- 固定职责与可替换 appearance：
- 依赖的 Standard / Core capability：
- 是否需要新的 Definition / registry；不需要时的理由：
- lowering、diagnostics 与 renderer-neutral 结果：
- direct IR / React / Vanilla parity：
- provenance / locator 是否适用：
- Graph / Flow / Editor / 领域模型排除边界：
- tests、双语 docs 与 LLM describe 证据：
- 本轮结论：组合 / 扩展 Notation / 先下沉 / recipe / 延期
```

## 9. 常见反例

- 只提供一个 shape helper，却宣称拥有新的语义组件
- 为简单 Node sugar创建独立 composite、artifact 与 layout compiler
- 在 Notation 中保存全局 Edge 集合、拓扑校验、自动布局或 Editor 状态
- deep import 或复制 Standard FlexLayout、artifact、spacing 与 clip 算法
- adapter 生成无法由 direct JSON 表达的私有 IR
- renderer 根据 Notation discriminator 绘制专用分支
- 同一组件同时由 Standard 和 Notation 导出，形成双真源
- 为尚无真实契约的 UML / 状态元素提前冻结完整字段体系

## 10. 与版本的关系

本文定义长期 Notation Complete 标准；具体元素、字段、默认值、迁移批次和发布版本进入 milestone ADR。v0.1 alpha.1 只建立 package family、公共底层复用和首批迁移，不以当前清单限制后续图式元素，也不把 Graph / Flow / Editor 纳入同一版本承诺。
