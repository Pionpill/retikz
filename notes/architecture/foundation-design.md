# Retikz Foundation 基础包设计

> **状态：架构方向已确认。Foundation 包已按 v0.5 alpha.2 ADR-14 实现，基础 Zod schema 扩展已由 ADR-17 Accepted；静态颜色原子扩展由 alpha.3 ADR-04 Proposed。** 本文定义跨包基础能力的所有权、依赖边界和最小公开契约；当前公开面以已 Accepted ADR、包文档、manifest 与测试为准。当前包拓扑以 [`包拓扑`](./package-topology.md) 和机器可读的 release-group 配置为准。
>
> 关联设计：[`能力完备性与模块边界`](./capability-design.md) · [`原子契约与组合设计`](./atomic-contract-design.md) · [`性能与增量运行时设计`](./performance-design.md) · [`alpha.2 roadmap`](../../packages/kernel/_notes/decisions/v0/v0.5/alpha.2/roadmap.md) · [`Foundation ADR-14`](../../packages/kernel/_notes/decisions/v0/v0.5/alpha.2/14-foundation-package.md) · [`Foundation Schema ADR-17`](../../packages/kernel/_notes/decisions/v0/v0.5/alpha.2/17-foundation-schema-primitives.md) · [`Contextual Color ADR-04`](../../packages/kernel/_notes/decisions/v0/v0.5/alpha.3/04-contextual-color-resolution.md)

---

## 1. 问题与目标

Retikz 已经有一些跨包复用、却不属于绘图、运行时或领域可视化语义的原子能力，例如类型工具、非空字符串语义、基础 string / number 校验、确定性静态颜色计算，以及带稳定错误码的领域错误。若把它们继续放在 `@retikz/core` 或领域包，`@retikz/math`、`@retikz/runtime` 和未来不依赖 Core 的包无法复用；若每个包保留副本，类型、数值边界、空白语义、颜色计算和错误识别会逐步分叉。

本设计建立只依赖 Zod 的 `@retikz/foundation`，作为这类能力的唯一 owner。目标是提供少量可独立理解的基础契约、非变换原子 schema 与无领域确定性值计算，而不是建立一个可以接纳任意 helper、对象 schema 或领域 refinement 的 `utils` / `shared` 包。

## 2. 包边界与依赖方向

`@retikz/foundation` 位于 Kernel 分组，随 kernel release group lockstep 发布。它的唯一生产依赖是 Zod；任何实际消费其公开能力的包都直接依赖它。根据已识别的真实消费，`@retikz/runtime` 与 `@retikz/core` 直接依赖 Foundation；`@retikz/math` 当前没有真实消费，不声明 Foundation 依赖，未来出现真实 import 时再建立直接依赖。Foundation 本身不依赖其它 Retikz 包、renderer、框架或领域包；Runtime 与 Math 继续不依赖这些上层，Core 的既有下层依赖方向不变。

下图中箭头表示“左侧包依赖右侧包”：

```text
runtime ────────┐
core ───────────┼──> @retikz/foundation
其它实际 consumer ─┘
                         │
                         └──> zod

math：当前无真实消费，不声明 Foundation 依赖；未来有真实 import 时再连边
```

其它包与 Core、Runtime、Math、Standard 或领域包之间的既有依赖方向不因 Foundation 改变。Foundation 只能作为更底层的直接依赖，不能成为反向依赖、领域能力的转发层或绕过正式 owner 的捷径。

Foundation 不拥有独立的 Drawing、Data 或 Visualization 完备目标。它只提供这些能力域可以直接消费的无领域原子，不参与完整对象 / IR、Definition、registry、compile、lowering 或 renderer 的端到端链路。

## 3. Foundation 拥有的最小能力面

### 3.1 类型工具

Foundation 是下列无运行时语义类型工具的唯一真源：

- `ValueOf<T>`：对象值的联合类型
- `AssertEqual<TActual, TExpected>`：编译期等价性检查
- `OpenString<T>`：保留字面量提示、同时允许任意字符串

这些类型不表达任何绘图、IR 或领域模型。新增类型工具必须满足稳定、无领域语义、能脱离单一 consumer 解释，并已经被多个独立包同义复用；“未来可能有用”不是准入理由。

### 3.2 基础 Zod schema

Foundation 是以下非变换原子 schema 的唯一真源：

- `NonBlankStringSchema`：拒绝空串和全空白字符串，保留合法原字符串
- `PositiveNumberSchema`：接受严格大于 0 的有限 number
- `NonNegativeNumberSchema`：接受大于等于 0 的有限 number
- `PositiveIntegerSchema`：接受严格大于 0 的安全整数
- `NonNegativeIntegerSchema`：接受大于等于 0 的安全整数
- `NormalizedFractionSchema`：接受闭区间 `[0, 1]` 的有限 number

这些 schema 只解析 `unknown` 到同值 string / number，不 coercion、不 trim、不 transform、不注入默认值。字段 owner 可以在其上增加描述、默认值和领域 refinement，但不能复制叶子约束或把 Foundation schema 反向扩张成对象、数组、颜色、几何、IR 或领域组合真源。Zod 已由 `z.number()` 拒绝非有限值，不另设同义 finite schema。

### 3.3 语义不变量断言

Foundation 提供 `assertNonEmptyString(value: string, label: string): void`。它拒绝空字符串和只包含空白字符的字符串，用于 TypeScript 无法表达的非空语义不变量。

它的输入是已由 TypeScript 约束为 `string` 的内部调用，不承担 `unknown` 到 `string` 的运行时收窄，也不替代 schema、parser、adapter 或第三方 callback 边界的校验。需要处理未知输入的 owner 必须在自己的边界完成解析和诊断；不能把 `assertNonEmptyString` 扩张为通用 runtime type guard。

`assertNonEmptyString` 与 `NonBlankStringSchema` 使用相同的运行时空白定义。前者面向已经由 TypeScript 收窄的内部字符串并抛出普通 Error，后者面向 unknown 解析边界并返回 Zod 结果；两者不互相替代消费方的领域错误包装。

### 3.4 结构化错误骨架

Foundation 提供可由各领域继承的 `RetikzError<TCode, TDetails>` 与 `isRetikzError()`。其最小稳定形态为：

```ts
type RetikzErrorOptions<TCode extends string, TDetails extends Readonly<Record<string, unknown>>> = Readonly<{
  code: TCode;
  message: string;
  details: TDetails;
  cause?: unknown;
}>;

class RetikzError<TCode extends string, TDetails extends Readonly<Record<string, unknown>>> extends Error {
  readonly code: TCode;
  readonly details: TDetails;
  override readonly cause?: unknown;
}
```

继承 `RetikzError` 本身是 Retikz 领域错误的稳定识别标记；`isRetikzError()` 只用于常规分类，不是 hostile object、跨 realm 或伪造 token 的安全边界。需要对象 identity 防伪的 Core / Runtime 边界继续使用各自私有的 `WeakSet` / `WeakMap` 机制。

`code` 与 `details` 是机器可读契约，`message` 只服务人类阅读，`cause` 保留原始失败。领域 owner 决定自己的错误码、details 字段、冻结策略和诊断投影：Runtime 可以表达 `phase`、`owner`、`program` 与 secondary diagnostics；Chart 可以表达 `path`、`target` 与冲突 id；未来 Tier 2 可以增加本领域上下文。Foundation 不定义全仓错误码 union、通用 `path` 字段或领域诊断格式。

Error 不等于 JSON IR 或 Diagnostic。Error 可以携带不可序列化的 `cause`，也用于控制流；Diagnostic 是各 owner 对正常产物、warning 或可序列化观测的独立契约。Foundation 不提供 `toJSON()`，不自动把 Error 转成 Diagnostic，也不替领域决定 details 的深拷贝或深冻结策略。

### 3.5 静态颜色原子

Foundation 是 Retikz 可确定化静态 CSS 颜色解析与不透明 source-over 预合成的唯一真源。该能力只接收颜色字符串、不透明底色和归一化权重，输出归一化 sRGB 通道或确定的小写十六进制颜色；不读取 Theme、IR、renderer、DOM 或宿主 CSS。

静态解析只覆盖 Retikz 明确支持且无需宿主环境即可确定的 CSS 颜色子集；`currentColor`、CSS variable、系统色及其它动态宿主颜色不在 Foundation 中猜测或求值。预合成固定使用前景自身 alpha 与权重相乘后的 sRGB source-over 语义，底色必须不透明，结果不携带 alpha。颜色空间、舍入和 `FOUNDATION_COLOR_ERROR` 原子失败边界属于该原子的稳定契约，消费方不得复制同义实现。

Foundation 不选择 Light / Dark 基准底色，不建立主色链，也不解释数值 Theme token。Core 或领域 owner 负责先确定自己的上下文、主色和底色，再调用颜色原子；字段路径、领域 fallback 与用户诊断继续由调用方拥有。

## 4. 明确不属于 Foundation 的内容

Foundation 禁止承载：

- 对象 / 数组 schema、JSON / IR 类型、IR / DSL parser、Definition、registry、provider、compile、lowering、Scene 或 manifest
- coercion、transform、default、catch、参数化 range factory、颜色 schema、几何或领域 refinement
- 独立数学 / 计算几何能力、Runtime session / transaction / identity、renderer 或宿主状态
- Theme token vocabulary、preset、领域 resolver、Plot / Chart / Table / Standard 语义
- 通用 Diagnostic、日志、telemetry、错误码目录或跨领域错误映射
- 仅有一个调用点的短 helper、消费方专属默认值、DOM / React / Node 工具

特别地，Core 的 Theme token registry 继续拥有 unknown namespace、owner 对象 schema、plain JSON 和冻结 definition 的运行时校验；Foundation 的非空字符串原子不能替代这一边界。Core compile 的 recoverable / fatal probe 分类也继续使用私有 identity brand，不能改为公开错误基类判定。

## 5. 使用与演进规则

Foundation 的公开能力必须从包根直接导入。一个能力迁入 Foundation 后，Foundation 是其唯一实现真源；Core、Runtime 或其它包不得继续维护等价定义。字段 owner 只能组合、描述或收窄该原子，不能保留同义叶子定义。是否保留旧包的转发出口、以及已有 public Error 是否增加 `details`，由对应版本 ADR 明确决定；`0.x` 阶段可以为正确的 owner 修正移除旧出口，不默认保留 alias 或双读 bridge。

已有错误类不应机械迁移。只有具备稳定 `code`、可观察失败边界并需要由消费方分类的领域错误，才适合继承 `RetikzError`。parser 的语法错误、私有不变量错误、hostile callback 防护和局部 setup failure 可以继续使用 owner 私有 Error；它们不因名称包含 Error 就获得跨包公开契约。

未来向 Foundation 新增内容前必须同时证明：

1. 不依赖 Retikz 领域、平台、状态或 Zod 之外的外部库
2. 具有可独立命名的语义、不变量或失败边界
3. 已被至少两个独立包以同义方式消费，或是 Foundation 自身最小 schema / 错误 / 类型 / 断言 / 确定性值计算协议的一部分
4. 不会迫使上层包经由 Foundation 获得本应由 Core、Math、Runtime 或领域 owner 承担的能力

不满足这些条件的逻辑应保留在当前 owner；重复出现时先重新判断语义 owner，而不是把它们汇总到 Foundation。

## 6. 与现有架构的关系

Foundation 补的是包拓扑底层的复用缺口，不改变既有能力域：Math 仍拥有纯几何，Runtime 仍拥有 identity / transaction，Core 仍拥有 Drawing Complete、完整 IR/schema、Contextual Color 与 Theme 环境，领域包仍拥有自己的对象 schema、token、resolver、diagnostic 和 lowering。Foundation 只把这些包已经共同需要、且去除 Retikz 绘图和领域词汇后仍成立的原子能力置于正确 owner；静态颜色解析与预合成属于无领域值计算，Theme mode、主色链和颜色槽位解释仍属于 Core 或领域 owner。

新增 Foundation 原子、移动公开 schema / 类型或改变现有错误层次均属于跨包公开架构变更。后续 Kernel ADR 必须明确 release-group、直接依赖、公开入口、已有公开面迁移、Zod / Error 兼容性和受影响领域的验证边界；不得把本设计当作直接实现授权。
