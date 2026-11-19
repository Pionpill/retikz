---
description: 建立 Foundation 基础契约包并统一 Kernel 底层依赖；背景：Retikz 已有若干跨包同义复用、却不包含绘图、几何、Runtime 状态或领域可视化语义的原子能力
keywords: 'Foundation、Kernel、cause、ValueOf、AssertEqual、OpenString'
---

# ADR-023：建立 Foundation 基础契约包并统一 Kernel 底层依赖

- 状态：Accepted
- 决策日期：2026-08-08
- 关联：[ADR-026](./026-foundation-schema-primitives.md)

> **后续演进：** [ADR-026](./026-foundation-schema-primitives.md) 已 Accepted，并取代本 ADR 的零生产依赖、无 Zod schema、七个根导出三项边界；类型、断言、错误、root-only、direct dependency 与领域职责继续保持本 ADR 的 Accepted 决策。Foundation 后续增加无领域、纯编译期的 `WithRequiredProperties<T, TKey>`，用于在保留原对象其余属性的同时把指定 key 收窄为必填。

## 背景与目标

Retikz 已有若干跨包同义复用、却不包含绘图、几何、Runtime 状态或领域可视化语义的原子能力。`ValueOf`、`AssertEqual`、`OpenString` 和非空字符串不变量曾分别位于 Core、Runtime 或 adapter；具有稳定 code 与上下文的领域错误也各自重复建立 Error 结构。把这些能力留在上层 owner 会阻止不依赖该 owner 的包复用，把它们复制到各包则会使类型、空白语义、错误分类和 `cause` 行为分叉。

本 ADR 冻结一个可独立理解的 `@retikz/foundation` owner，并把它置于 Kernel 包拓扑的底层。目标是形成唯一的原子契约真源、明确每个消费方的 direct dependency、保持 Math 的真实消费边界，并在不改变既有 IR、Scene、Diagnostic、identity 或领域恢复语义的前提下统一可分类错误的基础形态。

## 最终结果

Foundation 作为单根入口的基础契约包落地，提供类型、断言与结构化错误骨架；Core / Runtime 旧出口移除，领域错误仍由各自 owner 决定 code、details、诊断和恢复语义。普通 class classifier 不是 hostile object、跨 realm 或私有 identity 的安全边界

## 决策：Foundation 作为跨包原子契约的唯一 owner

新增随 Kernel 发布组 lockstep 的 `@retikz/foundation`，只提供根入口。生产依赖按 ADR-026 统一为 Zod；通用 JSON 契约按 [ADR-035](./035-json-undefined-field-contracts.md) 归属 Foundation。类型、schema、断言与错误在同一 owner 中复用，不通过 Core 或 Runtime 转发。

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

/** 将指定属性收窄为必填，同时保留其余属性 */
export type WithRequiredProperties<T, TKey extends keyof T> = T & Required<Pick<T, TKey>>;

/** 拒绝空串和全空白字符串 */
export declare const assertNonEmptyString: (value: string, label: string, ownerError?: RetikzError) => void;

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

- 默认行为：`ValueOf`、`AssertEqual`、`OpenString`、`WithRequiredProperties` 只提供类型语义；`WithRequiredProperties` 仅把选定 key 收窄为必填，不删除或重写其余属性。`assertNonEmptyString` 对已约束为 `string` 的输入拒绝空串和运行时标准空白串，对非空内容返回 `void`。它不承担 `unknown` 到 `string` 的收窄
- 失败与诊断：断言失败优先抛出显式传入的 ownerError，否则抛出 `RetikzFoundationError`，code 为 `FOUNDATION_NON_EMPTY_STRING_REQUIRED`，消息为 `${label} must be a non-empty string.`；需要 owner 错误码、前缀或诊断投影的调用方可以传入自己的 ownerError。`RetikzError` 不提供 `toJSON()`、`toDiagnostic()` 或跨领域错误码映射
- 错误分类：`isRetikzError()` 只识别正常的 Foundation class hierarchy。它不是 hostile object、跨 realm 或伪造 token 的安全边界；Core / Runtime 既有 `WeakSet` / `WeakMap` identity brand、probe 隔离和控制流判定保持不变
- 兼容性 / breaking：`ValueOf`、`AssertEqual`、`OpenString` 的公开 owner 从 Core / Runtime 迁移到 Foundation，旧根出口移除且不保留 alias；这是 0.x 的明确 import breaking。真正消费 Foundation 的包必须改为 direct dependency，未消费的包不得为了拓扑声明依赖
- 断言兼容：Core、Inspect、Plot、Table 等 owner 继续保留各自未知输入收窄、错误前缀和领域 class / code；Runtime identity 的 owner 与 path segment 从允许全空白改为 fail-loud，失败由 `RetikzRuntimeError` 的 code 区分，且 `cause` 保留被拒绝的原始值
- 领域错误：各 owner 通过包级 RetikzError 子类和稳定 code/details 区分失败，并保留原始 cause。Foundation 不规定领域 constructor、诊断投影或恢复分支，不要求保留历史专用错误类
- 领域 details：Runtime details 表达 phase、owner / program 与 secondary diagnostics；Retained Render details 由 render owner 提供并可为空；Plot declaration details 表达 declaration path 与冲突路径；Chart resolution details 表达 path、target 与冲突 id。领域 owner 继续决定这些值是否冻结以及如何投影到 Diagnostic
- React / Vanilla 等价性：两种 authoring 入口不新增 Foundation 专属语法，也不各自维护基础副本；它们和 headless consumer 看到相同的根契约、错误分类和 owner wrapper 语义
