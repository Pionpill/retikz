# ADR-13：Theme Token Namespace Context 与共享颜色

- 状态：Superseded
- 决策日期：2026-08-07
- 关联：[ADR-09](./09-inherited-theme-context.md) · [ADR-15](./15-lightweight-theme-resolution.md)
- Supersedes：本 ADR 明确取代 ADR-09 中“Theme 只由 `style` / `mode` 构成、领域 token 只能留在领域 spec”的边界；ADR-09 关于 Scene / Scope 继承、Composite context、probe / replay 与其它历史契约继续有效
- Superseded by：[ADR-15：轻量 Theme IR 与领域 Token 解析](./15-lightweight-theme-resolution.md)。本 ADR 保留为 namespaced token bag 的历史设计记录，不再代表现行公开契约

## 背景与目标

ADR-09 冻结了 `style` / `mode` 的 Scene / Scope 继承和 Composite context，但没有冻结一条可由多个领域共同消费、又不把领域语义下沉到 Core 的 token 上下文。各 Tier 2 包只能把继承的 Theme 重新翻译为自己的局部字段，导致同一作用域无法同时覆盖多个 Plot、Chart、Table 或 Standard consumer，也使领域 token 容易被误写进 Core 的静态 schema。

颜色还缺少稳定的跨包 value contract。Core Inspector、Plot palette 和其它领域可能各自维护 categorical 数组，warning 也可能错误地复用 error 色。需要把真正跨领域的颜色角色和 active categorical array 归入 Core，同时把 named scheme、插值和领域映射留在其语义 owner。

本 ADR 的目标是冻结一条长期成立的 Theme token namespace context：Core 负责可继承、可序列化、可校验的通用 bag、Definition registry、sparse merge、shared colors 和 Inspector appearance；领域 owner 负责自己的 token vocabulary、preset、resolver、mapping、inspection 与最终消费。

## 决策：Core 承载可继承的 namespaced sparse context，但不解释领域语义

Core Theme 扩展为 `style`、`mode` 与 namespaced sparse token bag。`Layout` / `Scope` 只公开通用 `theme`，通过 `theme.tokens` 承载 namespaced overrides，不静态知道 Plot、Chart、Table 或未来领域的 token 类型，也不增加领域专属的反向依赖字段。Theme context 从 Scene 到内层 Scope 按字段、namespace 和 token key 从外到内继承；领域 Composite 在当前位置读取同一份有效 context，再由自己的 resolver 物化领域默认。

Core 只执行通用的 plain-data 校验、Definition registry 绑定、owner schema runtime validation、继承与 sparse overlay。它不拥有领域 preset，不根据 token 名称 dispatch 行为，不解释 axis、legend、palette、cell 或 chart recipe，也不把领域 token lowering 到 Core primitive。

理由：

1. 同一 Scene / Scope 环境必须能被多个领域 consumer 复用，而不复制领域字段或建立第二套 Theme IR
2. owner schema 需要运行时可诊断校验，但 Core 不能因提供校验机制而取得 Tier 2 语义所有权
3. shared colors 是跨领域 value contract，领域 palette 和 named scheme 仍需要独立的语义解析与 mapping

## 基础数据结构与公开契约

Theme context 使用严格、JSON-safe、按 namespace 寻址的 sparse bag。namespace 内的 token map 保持 flat、dot-namespaced 和 owner strict：

```ts
type ThemeTokenNamespaceBag = Readonly<Record<string, IRJsonObject>>;

type IRTheme = Readonly<{
  style?: ThemeStyleValue;
  mode?: ThemeModeValue;
  tokens?: ThemeTokenNamespaceBag;
}>;

type ResolvedTheme = Readonly<{
  style: ThemeStyleValue;
  mode: ThemeModeValue;
  tokens: Readonly<Record<string, Readonly<IRJsonObject>>>;
  colors: ResolvedThemeColors;
}>;
```

namespace 是非空、稳定的 owner identifier；Core built-in 固定使用 `core`，本轮协作领域分别使用 `plot`、`chart` 与 `table`。Definition 的 schema 校验该 namespace 的 sparse override 形态，而不是领域 preset 填充后的完整 resolved map。

`ResolvedTheme.tokens` 是 detached、递归不可变的有效 namespace bag，不是任何领域的完整 resolved token map。`ResolvedTheme.colors` 是 Core 根据 `style` / `mode` 和 Core token 派生的只读 consumer view，不是第二个持久化或 authoring 真源。

Core 提供类型擦除的 Definition 与 contribution 边界：

```ts
type ThemeTokenDefinition<TNamespace extends string = string, TTokens extends IRJsonObject = IRJsonObject> = Readonly<{
  namespace: TNamespace;
  schema: ZodType<TTokens>;
}>;

type AnyThemeTokenDefinition = ThemeTokenDefinition<string, IRJsonObject>;

type ThemeTokenContribution<TNamespace extends string, TTokens extends IRJsonObject> = Readonly<{
  namespace: TNamespace;
  tokens: TTokens;
}>;

declare const defineThemeTokenNamespace: <const TNamespace extends string, TTokens extends IRJsonObject>(
  definition: ThemeTokenDefinition<TNamespace, TTokens>,
) => ThemeTokenDefinition<TNamespace, TTokens>;

type CompileOptions = Readonly<{
  themeTokenDefinitions?: ReadonlyArray<AnyThemeTokenDefinition>;
}>;
```

`defineThemeTokenNamespace` 返回的冻结 definition 对象本身就是 runtime identity；相等性使用对象引用相等，不增加可伪造的字符串 identity，也不按 schema 内容做结构哈希。owner 必须导出并在所有 adapter / headless 入口复用同一个 definition singleton，不得为每个组件重新创建同 namespace definition。

Core 内置并公开 `CoreThemeTokenDefinition`。registry 构造先加入该 built-in，再按输入顺序合并 `CompileOptions.themeTokenDefinitions`：同一个 definition 对象重复出现时保留首次位置并去重；同一 namespace 出现不同 definition 对象时立即 fail-loud，诊断包含 namespace、首次来源和冲突来源；显式再次传入 `CoreThemeTokenDefinition` 只去重，任何其它 `core` namespace definition 都冲突。不得使用 last-wins，也不得仅凭 schema 或 namespace 相同就推断两个 definition 等价。

所有会解析 Theme 的完整 compile、lowering-only 与 retained / fresh runtime 入口都消费这份同义 registry contract。registry 在读取 Scene / Scope Theme 或调用 Composite 前完成构造；Scene Theme 与每一层 Scope Theme 在生成 effective context 前先按其输入路径验证通用 bag，再由对应 namespace definition schema 校验 sparse owner map。只有全部校验通过的 detached、递归不可变 context 才会暴露给后代与 Composite，因此 unknown namespace 即使当前没有领域 consumer 也在声明它的 Theme 层 fail-loud。

Definition 可以由 Core 内置 provider 或 owner 注入；Core 只比较 identity、namespace 并调用 schema，不解释领域类型或 token 语义。领域 helper（例如 `defineCoreThemeTokens`、`definePlotThemeTokens`）只返回纯 JSON contribution，不携带 schema、函数、ReactNode、class instance 或 renderer handle；不同 Scene / Scope 层级中同一 namespace 的覆盖是合法的。

Layout / Scope authoring 先用各 owner helper 构造 contribution，再按 namespace 直接形成 `theme.tokens` bag；React、Vanilla 与 plain JSON 只在 authoring 形态上不同，不产生领域专属的 Layout / Scope prop。

Core 第一版自有 namespace 的最小 value contract 为：

```ts
type IRCoreThemeTokenOverrides = Readonly<{
  'semantic.error'?: CssColorValue;
  'semantic.success'?: CssColorValue;
  'semantic.warning'?: CssColorValue;
  'palette.categorical'?: NonEmptyReadonlyArray<CssColorValue>;
}>;

type ResolvedThemeColors = Readonly<{
  semantic: Readonly<{
    error: CssColorValue;
    success: CssColorValue;
    warning: CssColorValue;
  }>;
  categorical: NonEmptyReadonlyArray<CssColorValue>;
}>;
```

四种 Core style 与两种 mode 都必须提供完整、合法的 shared colors view。第一版只有一套当前生效的 active categorical array；不在 Core 中按名称选择 `category10`、`accent` 或其它 named categorical scheme，也不把 Plot 的 sequential / diverging scheme、interpolator 或 `options.colorSchemes` 归入 Core。

## 行为、失败语义与兼容性

- 默认行为：未声明 Theme 时使用 `neutral + light`、空的领域 namespace bag 和由该环境派生的 Core shared colors
- 继承行为：Scene、外层 Scope 到内层 Scope 依次覆盖显式的 style、mode、namespace 和 token key；省略字段继续继承；第一版不提供 `resetTheme`、namespace reset 或单 token reset
- 解析行为：Core shared colors 先由 style / mode 选择完整 preset，再叠加 inherited `core` token；领域 owner 在同一 effective Theme 上解析自己的 preset、shared color projection、namespace token、local token、native theme 与显式成员配置
- 校验行为：Theme 与 contribution 必须是 plain JSON data；unknown namespace、同 namespace 的不同 definition identity、unknown key、非法 value、空 categorical array 和无法通过 owner schema 的 bag 都 fail-loud，诊断至少包含输入层以及 namespace / key 路径；同一冻结 definition 对象的重复聚合只去重一次
- 消费行为：Core Inspector 对每个 occurrence 使用 `colorScope % palette.categorical.length` 取得 categorical scope color；warning 使用 `semantic.warning`；Standard 只消费 Core 提供的 `InspectionAppearance`，不读取 token bag、维护颜色数组或重新实现取余
- 循环选择：Core 拥有“非空 categorical array + 非负稳定 index → index 取余后的颜色”这一领域中立 value contract；需要相同语义的 Plot / Table consumer 复用该 contract，Standard 不自行选择颜色
- 编译行为：交给 Composite 的 context 是 detached、递归不可变的有效值；没有 Theme consumer 的 Core-only 图元保持既有输出；最终 Scene 只包含已物化样式，renderer 不读取 Theme、preset 或领域 token
- 入口等价性：plain JSON、React、Vanilla、standalone、embedded 与 direct headless compile 使用同一 Theme IR、Definition registry、继承和失败语义
- 兼容性：`0.x` 采用破坏性契约调整，不保留旧字段、alias、双读或 silent bridge；ADR-09 的非冲突历史契约继续有效

## 功能与包边界

- 所属能力域与解决的问题：Drawing Complete 的 Style / Resource、Composition 与跨层 inspection 环境；解决主题 token 无法跨 Scope 传播、跨 owner 校验和共享颜色闭环的问题
- 主责包：`@retikz/core` 拥有 Theme IR、有效 context、继承 / sparse merge、ThemeTokenDefinition registry、owner schema runtime validation、Core shared colors 与 `InspectionAppearance`
- 协作包：Plot、Chart、Table 等 owner 各自拥有 token vocabulary、preset、resolver、mapping、inspection 和局部 contribution helper；Standard 只消费已物化的领域无关输入与 `InspectionAppearance`；React / Vanilla 提供等价 authoring / contribution 聚合；Render 只执行 Scene
- Core 不拥有：任何 Tier 2 token 类型或语义、领域 preset 具体值、named scheme、领域 mapping、Chart recipe、Table cell 规则、CSS theme 或 renderer 默认
- 外部扩展与下游闭环：owner 以自己的 Definition、strict schema、typed helper、resolver、mapping 和正式 Core / Standard / manifest consumer 加入统一链路；standalone 或 headless 使用方显式提供需要的 definitions，adapter 只负责等价聚合，不创建旁路协议；schema-only token 不构成完成能力
- 不支持边界：Core 不提供命名主题 loader、远程主题分发、领域 token 自动 lowering、跨领域完整 resolved map、Theme lineage 查询、交互状态 token 或 renderer-specific effect

## 最终结果

最终实现已闭合 namespaced Theme bag、Definition registry、Scene / Scope sparse inheritance、shared semantic / categorical colors 与 Inspector appearance；Core 保持只传播、校验和派生通用颜色视图，不解释 Tier 2 token。React、Vanilla 与 plain JSON authoring 共享同一 Theme IR 和 definition 聚合边界，fresh / retained compile 也保持可观察等价。

## 长期边界

- Plot、Chart、Table、Geo 或未来领域的完整 token key、preset 具体值、resolver 算法、mapping 与 inspection 字段
- Plot sequential / diverging named scheme、interpolator、采样器和 `options.colorSchemes`
- Core 之外的领域颜色命名、palette policy、chart recipe、table rule、layout policy 或业务状态机
- 命名主题 registry、继承主题文件、远程加载、marketplace、CSS variables、宿主 UI theme 与 renderer-specific effect
- Theme lineage、winning Scope locator、交互状态、animation、transition、selection 或 accessibility 自动调色
