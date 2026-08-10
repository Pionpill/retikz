# ADR-14：建立 Foundation 基础契约包并统一 Kernel 底层依赖

- 状态：Accepted
- 决策日期：2026-08-08
- 关联：[v0.5 roadmap](../roadmap.md) · [alpha.2 roadmap](./roadmap.md) · [Foundation 基础包设计](../../../../../../../notes/architecture/foundation-design.md) · [能力完备性与模块边界](../../../../../../../notes/architecture/capability-design.md) · [原子契约与组合设计](../../../../../../../notes/architecture/atomic-contract-design.md) · [包拓扑](../../../../../../../notes/architecture/package-topology.md)

> **后续演进：** [ADR-17](./17-foundation-schema-primitives.md) 已 Accepted，并取代本 ADR 的零生产依赖、无 Zod schema、七个根导出三项边界；类型、断言、错误、root-only、direct dependency 与领域职责继续保持本 ADR 的 Accepted 决策。

## 背景与目标

Retikz 已有若干跨包同义复用、却不包含绘图、几何、Runtime 状态或领域可视化语义的原子能力。`ValueOf`、`AssertEqual`、`OpenString` 和非空字符串不变量曾分别位于 Core、Runtime 或 adapter；具有稳定 code 与上下文的领域错误也各自重复建立 Error 结构。把这些能力留在上层 owner 会阻止不依赖该 owner 的包复用，把它们复制到各包则会使类型、空白语义、错误分类和 `cause` 行为分叉。

本 ADR 冻结一个可独立理解的 `@retikz/foundation` owner，并把它置于 Kernel 包拓扑的底层。目标是形成唯一的原子契约真源、明确每个消费方的 direct dependency、保持 Math 的真实消费边界，并在不改变既有 IR、Scene、Diagnostic、identity 或领域恢复语义的前提下统一可分类错误的基础形态。

Foundation 作为当前 Kernel release group `0.5.0-alpha.2` 中独立编号的基础契约 ADR，不与 Concurrent、渐进生成、Headless Interaction 或任何 Drawing / Data / Visualization feature 混淆。ADR 的 milestone 归属以 release group 当前 manifest 版本为准；预留的后续 roadmap 顺序不能把本 ADR 推迟到未发布的版本。

## 完成状态

Foundation 已以零生产依赖、单根入口的独立包落地，七个公开契约、消费方 direct dependency、Core / Runtime 旧出口移除与领域错误兼容迁移均与本 ADR 一致。类型、断言、错误、领域兼容、拓扑发布与跨入口文档证据均已闭环；当前无 ADR 范围内未解风险。普通 class classifier 仍不是 hostile object、跨 realm 或私有 identity 的安全边界。

## 决策：以零依赖 Foundation 作为跨包原子契约的唯一 owner

新增随 Kernel 发布组 lockstep 的 `@retikz/foundation`。它只从包根公开七个稳定导出：三个类型工具、一个 typed string 断言、结构化错误的构造参数类型、错误基类和分类 predicate。Foundation 没有运行时或类型依赖，不提供 subpath，也不通过 Core 或 Runtime 转发其它包的能力。

所有实际消费 Foundation 公开能力的包都必须从 Foundation 根入口直接导入并声明直接依赖；同一发布组遵循 lockstep 依赖关系，跨发布组使用兼容依赖关系。依赖关系由真实 import 决定，不以“底层拓扑完整”或未来可能消费为理由添加空依赖。当前 `@retikz/math` 没有 Foundation 的真实消费，因此保持不声明该依赖；若未来 Math 真正消费某项 Foundation 契约，再由单独变更补充直接依赖和验证。

Core、Runtime 及其它旧 owner 不再保留这三项类型工具的同义定义或兼容转发出口。领域错误类原地复用 Foundation 骨架，但仍由各自 owner 决定错误码、details、诊断投影、冻结策略、恢复语义和私有安全边界。

理由：

1. 原子能力可以被 Math、Runtime、Core、Render、adapter 和 Tier 2 直接复用，而不形成 Core / Runtime 反向依赖或第二套真源
2. 结构化错误获得统一的机器可读分类骨架，同时保留领域 class identity、构造方式、错误文本和消费方所需的上下文
3. Foundation 的闭合原子契约不需要 Definition / registry / provider 或新的 IR、Scene、manifest 链路，能够维持既有能力域边界

## 基础数据结构与公开契约

Foundation 根入口公开以下最小契约。类型工具不产生运行时代码；错误与断言仅表达跨包稳定的不变量，不替代 schema、parser、Diagnostic 或领域 contract。

```ts
/** 取得对象所有 value 的联合类型 */
export type ValueOf<T extends object> = T[keyof T];

/** 双向检查两个类型是否等价 */
export type AssertEqual<TActual, TExpected> = [TActual] extends [TExpected]
  ? [TExpected] extends [TActual]
    ? true
    : false
  : false;

/** 保留已知字符串提示，同时接受任意字符串 */
export type OpenString<T extends string> = T | (string & {});

/** 拒绝空串和全空白字符串 */
export declare const assertNonEmptyString: (value: string, label: string) => void;

/** Retikz 结构化领域错误的基础构造参数 */
export type RetikzErrorOptions<TCode extends string, TDetails extends Readonly<Record<string, unknown>>> = Readonly<{
  code: TCode;
  message: string;
  details: TDetails;
  cause?: unknown;
}>;

/** Retikz 结构化领域错误的基础骨架 */
export declare class RetikzError<
  TCode extends string,
  TDetails extends Readonly<Record<string, unknown>>,
> extends Error {
  readonly code: TCode;
  readonly details: TDetails;
  readonly cause?: unknown;

  constructor(options: RetikzErrorOptions<TCode, TDetails>);
}

/** 判断动态值是否继承自 Retikz 结构化领域错误 */
export declare const isRetikzError: (value: unknown) => value is RetikzError<string, Readonly<Record<string, unknown>>>;
```

`RetikzError` 的构造始终建立 own `cause` 属性；调用方省略 `cause` 时其值为 `undefined`。`details` 由领域 owner 提供，基础类不深拷贝、不深冻结，也不把它转换为 JSON 或 Diagnostic。`code`、`details` 与 `cause` 是机器可读契约，`message` 继续服务人类诊断；Foundation 不定义全仓错误码 union、通用 path 字段或领域诊断格式。

## 行为、失败语义与兼容性

- 默认行为：`ValueOf`、`AssertEqual`、`OpenString` 只提供类型语义；`assertNonEmptyString` 对已约束为 `string` 的输入拒绝空串和运行时标准空白串，对非空内容返回 `void`。它不承担 `unknown` 到 `string` 的收窄
- 失败与诊断：断言失败抛出 Foundation 的普通 `Error`，消息为 `${label} must be a non-empty string.`；需要 owner 错误码、前缀或诊断投影的调用方必须在自己的边界包装它。`RetikzError` 不提供 `toJSON()`、`toDiagnostic()` 或跨领域错误码映射
- 错误分类：`isRetikzError()` 只识别正常的 Foundation class hierarchy。它不是 hostile object、跨 realm 或伪造 token 的安全边界；Core / Runtime 既有 `WeakSet` / `WeakMap` identity brand、probe 隔离和控制流判定保持不变
- 兼容性 / breaking：`ValueOf`、`AssertEqual`、`OpenString` 的公开 owner 从 Core / Runtime 迁移到 Foundation，旧根出口移除且不保留 alias；这是 0.x 的明确 import breaking。真正消费 Foundation 的包必须改为 direct dependency，未消费的包不得为了拓扑声明依赖
- 断言兼容：Core、Inspect、Plot、Table 等 owner 继续保留各自未知输入收窄、错误前缀和领域 class / code；Runtime identity 的 owner 与 path segment 从允许全空白改为 fail-loud，失败仍是 `RuntimeIdentityError`，且 `cause` 保留被拒绝的原始值
- 领域错误兼容：Runtime 的稳定错误族、Retained Render、Plot declaration 与 Chart resolution 错误可以继承 Foundation；它们保留现有 constructor、class name、`name`、`code`、顶层上下文字段、message、已有 cause 值和 `instanceof` 关系。`details` 与统一 own `cause` 是新增机器可读 surface，不删除或替换旧字段；省略 cause 的既有错误也明确拥有值为 `undefined` 的 own 属性
- 领域 details：Runtime details 表达 phase、owner / program 与 secondary diagnostics；Retained Render details 由 render owner 提供并可为空；Plot declaration details 表达 declaration path 与冲突路径；Chart resolution details 表达 path、target 与冲突 id。领域 owner 继续决定这些值是否冻结以及如何投影到 Diagnostic
- React / Vanilla 等价性：两种 authoring 入口不新增 Foundation 专属语法，也不各自维护基础副本；它们和 headless consumer 看到相同的根契约、错误分类和 owner wrapper 语义

## 功能与包边界

- 所属能力域与解决的问题：Kernel 基础契约层；解决跨能力域复用原子类型、不变量和可分类错误骨架的问题。Foundation 不定义独立 Drawing、Data 或 Visualization Complete 目标
- 主责包与协作包：`@retikz/foundation` 主责七个根导出；`@retikz/runtime`、`@retikz/core`、`@retikz/render`、React / Vanilla / TeX、可选 Inspect 与 Tier 2 包按真实消费协作。`@retikz/math` 继续主责纯计算几何，当前没有 Foundation 直接消费
- 拥有：无领域的类型工具、typed non-empty string 断言、结构化错误的最小字段与普通分类 predicate；Foundation 是这些契约的唯一实现真源
- 不拥有：IR / JSON schema、parser、Definition / registry / provider、compile / lowering、Scene / manifest、几何、Runtime session / transaction / identity、renderer、宿主状态、Theme token、preset、Diagnostic、日志 telemetry、领域错误码或领域 mapping
- 外部扩展与下游闭环：Foundation 原子契约是闭合的，消费方直接导入并组合到自己的 owner contract；稳定领域错误通过同一 `RetikzError` 继承链分类，内置与自定义错误不建立分叉 registry。Scene、manifest、renderer、adapter、provenance 与 locator 继续沿既有 owner 链路工作
- 不支持边界：仅有单一 consumer 的 helper、依赖平台或领域状态的工具、需要未知输入解析的 guard、数值 / 几何约束、schema / Diagnostic / error catalog 和领域 preset 不进入 Foundation。新增候选必须重新证明无领域依赖、可独立命名、至少两个独立包同义消费（或属于 Foundation 最小协议），且不会吸收上层能力

## 架构验证

- 是否可由现有能力组合：不能仅靠现有 Core / Runtime 组合解决。现有位置造成 owner 与依赖方向冲突，复制会产生第二真源；本 ADR 选择把原子能力下沉到更底层 Foundation，再由各 owner 组合消费
- math / core / render / adapter 责任切分：Foundation 保持零依赖；Math 只提供几何且在无真实消费时不依赖 Foundation；Runtime 消费基础类型、断言与错误骨架但保留 identity / transaction / diagnostics；Core 消费类型与断言但保留 IR / schema / compile / Theme 校验；Render、React、Vanilla、TeX 与 Inspect 只按实际使用直接依赖，继续拥有 renderer、宿主、解析与辅助内容语义
- 是否需要新 IR / contract / registry；不采用 registry 时的理由：需要新增跨包 Foundation contract，但不新增 IR、schema、Definition 或 registry。七个根导出是稳定、闭合、由 Foundation 直接实现的原子协议，不存在内置与第三方动态 definition 的解析需求；领域 registry 仍由领域 owner 持有
- Scene / manifest / renderer / diagnostics 如何闭环：本 milestone 不改变 Scene、manifest、renderer 或 provenance 结构。Error 的 `details` 不自动成为 Diagnostic；Runtime、Core、Inspect、Render 与领域包继续在各自边界生成可观察诊断和恢复行为，renderer 与 adapter 不读取 Foundation 的领域外推断
- provenance / locator / Interaction Readiness 是否适用：Foundation 不产生图形 occurrence、Scene 节点或交互 target，因此不适用新增 provenance、locator 或 Interaction Readiness 契约；它只必须确保领域错误保留 owner 提供的路径和上下文
- 结论：下沉

## 能力完备性检查

- 所属能力域与能力面：Kernel 基础契约层，服务 Drawing、Runtime、adapter 与 Tier 2 的跨包原子复用，不另设 Drawing / Data / Visualization 能力域
- 解决的问题：消除同义类型、typed string 语义和结构化错误骨架的重复 owner，解除不必要的 Core / Runtime 传递依赖
- 主责包与协作包：Foundation 主责无领域原子；Runtime、Core、Render、adapter、Inspect 与 Tier 2 负责各自错误、诊断、schema、compile 和下游消费
- 是否可由现有能力组合：不能；缺失的是比 Core / Runtime 更底层的稳定 owner，而不是上层组合能力
- 是否需要下沉到依赖能力域：需要；下沉到独立 Foundation，Math 只有在真实消费时才建立直接依赖
- 内部表达链路：类型工具与断言直接表达编译期和 typed string 不变量；结构化错误提供 code / details / cause 基类，领域 owner 在其自身 contract 中组合，不引入平行 IR 或 runtime state
- 外部扩展链路：Foundation 不开放 Definition / registry；可扩展性来自领域错误继承与各 owner 自有 registry，内置和自定义领域实现仍走各自同一消费路径
- 下游执行 / adapter 等价性：Foundation 不改变 Core IR、Scene 或 renderer；React、Vanilla、headless 与 SVG / Canvas 继续消费同一既有输入和 owner error semantics
- 不支持边界与诊断：未知输入解析、领域 schema、private identity、Diagnostic、恢复策略和领域词汇留在原 owner，并对不支持输入 fail-loud
- 本轮结论：下沉

## 被否决方案

- 继续由 Core / Runtime 分别拥有并提供转发：会让不依赖这些包的 consumer 无法直接复用，并保留多份真源或隐式 transitive dependency
- 只迁移类型工具：风险较小但留下已确认的 typed string 和结构化错误债务，无法冻结最小 Foundation 能力面
- 按名称把 shared / utils、Zod helper、几何断言、Diagnostic 和所有 Error 一次性下沉：会把领域约束、状态、renderer recovery 与 schema 语义错放在 Foundation，且改变大量公开错误行为
- 为了形成完整拓扑让 Math 无条件依赖 Foundation：没有真实 import 时属于空依赖，违反直接依赖由实际消费决定的规则
- 用 `isRetikzError()` 替代 Runtime / Core 私有 identity brand：普通 class 分类不具备 hostile object 或 token 防伪能力，会破坏安全边界
- 为七个根导出建立 Definition / registry：这些是闭合原子协议，动态注册只会伪造不必要的扩展点和领域 owner

## 测试策略摘要

验证必须覆盖以下稳定证据层，而不把单一覆盖率数字视为契约证明：

- Foundation public-surface 与类型层：三个类型工具的等价 / 开放语义、断言的空串与空白失败边界、错误的 code / message / details / own cause / name / class hierarchy 和普通分类 predicate
- 消费方兼容层：Runtime、Core、Render、Plot、Chart 与 adapter 保留现有 constructor、字段、错误文本、`cause` 身份、`instanceof` 和恢复分支；Runtime identity whitespace 修正及领域 wrapper 的原始 cause 均可观察
- 拓扑与发布产物层：所有实际 Foundation import 均存在正确 direct dependency，旧 Core / Runtime 类型真源与转发已消失，Foundation 无反向或领域依赖，Math 不声明空依赖
- 对抗与边界层：伪造普通对象不会被错误 guard 当作合法 Foundation error；Core / Runtime 的私有 identity brand、Diagnostic 独立性和 probe / recovery 控制流不受影响
- 跨入口与文档契约层：React、Vanilla、headless、SVG / Canvas 的既有语义保持等价，公开迁移说明不把 Foundation 错写成 IR、Diagnostic 或领域包

## 不在本 ADR 范围

- Foundation 的具体源码组织、测试组织、文档页面、package manifest 细节、命令、commit 或 review 流程
- 将 Foundation 扩展成通用 `utils`、schema / parser / geometry / Diagnostic / logging / telemetry 汇总包
- 新增或重塑 Drawing、Data、Visualization、Theme token、Definition / registry、pipeline / lowering、Scene / manifest 或 renderer 能力
- Concurrent、progressive generation、Headless Interaction、编辑器状态和 Plot / Table / Chart 领域行为
- 除 Runtime、Render、Plot declaration 与 Chart resolution 外的领域错误迁移；其它错误继续由所属 owner 依据自身契约演进
