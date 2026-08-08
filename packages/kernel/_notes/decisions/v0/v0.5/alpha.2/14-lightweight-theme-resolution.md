# ADR-14：轻量 Theme IR 与领域 Token 解析

- 状态：Proposed
- 决策日期：2026-08-08
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-09：可继承 Theme IR 与 Composite 编译上下文](./09-inherited-theme-context.md) · [ADR-13：Theme Token Namespace Context 与共享颜色](./13-theme-token-namespace-context.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)
- Supersedes：ADR-13 中将 namespaced token bag、Theme token Definition / Contribution 与其 registry 写入 Core Theme IR 的决策。ADR-09 的 Scene / Scope 继承、Composite context、probe / replay 与 adapter 等价性继续有效

## 背景与目标

ADR-13 允许 `Theme` 在可持久化的 Scene / Scope IR 中直接携带按 namespace 编排的 token 值。即使约定为 sparse bag，schema 也不能区分稀疏 authoring override 与完整 resolved token map；任一调用方都能把领域 preset、色板或完整 token catalog 写入 IR。这样会放大 JSON snapshot、增量 diff 与跨 adapter 传递成本，并让完整默认值在持久化输入与领域 resolver 中重复存在。

本 ADR 的目标是保留 Theme 的轻量、可继承环境语义：IR 只表达稳定 selector，Core 在 compile 时解析 shared colors，领域 owner 在自己的 resolver 中按 selector 和局部 authoring 输入生成完整 token map。完整 token 不得进入任何 Scene / Scope IR。

## 决策：Theme IR 只保存 selector，领域 token 只在 owner resolver 中物化

Core Theme 固定为 `style`、`mode` 和可选的 `palettePreset`。三者都按 Scene 到 Scope 的字段级继承；省略 `palettePreset` 时跟随有效 `style`。`palettePreset` 只选择 Core categorical palette 的来源，semantic color roles 仍由 `style` 与 `mode` 决定。

```ts
type IRTheme = Readonly<{
  style?: ThemeStyleValue;
  mode?: ThemeModeValue;
  palettePreset?: ThemeStyleValue;
}>;

type ResolvedTheme = Readonly<{
  style: ThemeStyleValue;
  mode: ThemeModeValue;
  palettePreset: ThemeStyleValue;
  colors: ResolvedThemeColors;
}>;
```

`ResolvedTheme` 是 compile-local、只读的有效环境。它不保留 token bag；`ResolvedThemeColors` 是由有效 selector 生成的 shared consumer view，而不是 authoring 或持久化真源。

Plot、Chart、Table 等领域 owner 继续拥有完整 token vocabulary、preset、resolver 与 mapping。owner resolver 从 effective `style`、`mode`、`colors` 和自己的领域 spec-local sparse override 生成完整 token map，再物化为正式 Core / Standard 输入。完整 map 不回写 Scene、Scope 或 renderer；领域 artifact 是否保留必要的 inspection 信息由该 owner 的公开契约决定。

理由：

1. Scene / Scope IR 是持久化、diff 与 adapter 共同使用的输入，必须只保留重建所需的最小稳定语义，而不是可从 selector 推导的领域默认值
2. token vocabulary、默认值和优先级属于领域 owner；Core 传播完整 token bag 会让通用 Theme context 成为无边界的领域数据容器
3. `style`、`mode`、`palettePreset` 能满足跨领域共享的 Theme 环境与 Core Inspector color contract，同时保持 renderer-neutral 的稳定闭环

## 行为、失败语义与兼容性

- 默认行为：未声明 Theme 时使用 `neutral + light`，`palettePreset` 跟随 `neutral`，并生成对应 shared colors
- 继承行为：Scene、外层 Scope、内层 Scope 依次覆盖显式 selector；内层未声明字段继续继承
- 解析行为：Core 在 compile 时从有效 selector 生成 shared colors；领域 owner 随后生成自身完整 token map。领域 spec 中的 sparse override 只影响该 owner，不跨 namespace 或跨领域传播
- 失败与诊断：`Theme` 出现 `tokens` 或任何未知字段时 fail-loud。领域 token key / value 由其所属领域 spec schema 在 authoring / parse 边界诊断
- 兼容性：移除 `theme.tokens`、Theme token Definition / Contribution、registry 与 `themeTokenDefinitions`。这是 `0.x` breaking change，不提供 alias、双读或静默迁移
- React / Vanilla 等价性：React、Vanilla 与 plain JSON 都只能将 selector 写入 Scene / Scope Theme；领域本地 override 仍使用同一领域 schema 和 resolver

## 功能与包边界

- 所属能力域与解决的问题：Drawing Complete 的可继承视觉环境与共享颜色。解决通用 Theme IR 被领域 token map 放大、默认值重复和跨层 payload 膨胀的问题
- 主责包与协作包：`@retikz/core` 拥有轻量 Theme IR、selector inheritance 和 shared colors；Plot、Chart、Table 等 owner 拥有 token preset、局部 override、resolver 与正式消费；React / Vanilla 只负责等价 authoring；Render 只执行物化 Scene
- 拥有：Core 的 `style` / `mode` / `palettePreset` 与 shared semantic / categorical color contract
- 不拥有：任何领域 token key、完整 token map、领域 preset、领域 token registry、跨领域 arbitrary token override 或 renderer theme
- 外部扩展与下游闭环：新增领域 Theme 能力通过该领域的 schema、spec-local sparse override、resolver 和正式 consumer 闭环，不向 Core 注册 token bag。领域默认值可从 Core effective Theme 读取 selector 和 shared colors
- 不支持边界：不支持通过 Scope 为多个领域下发任意 token key；不支持把完整 token map、色板数组或运行时 Definition 写入 Theme IR。若未来需要跨领域可配置 Theme，必须设计新的小型 selector / reference contract，不能恢复自由 token bag

## 架构验证

- 是否可由现有能力组合：可以。ADR-09 已提供 Scene / Scope Theme 继承和 Composite context；现有领域 resolver 已能从有效 Theme 和局部输入生成完整 token map。只需收窄 Core Theme，而不是新建平行 IR 或 renderer 分支
- math / core / render / adapter 责任切分：Math 与 Runtime 不解释 Theme；Core 解析 selector 和 shared colors；领域包解析 token；Render 不读取 Theme；React / Vanilla 不生成领域 token
- 是否需要新 IR / contract / registry；不采用 registry 时的理由：需要替换为更小的 Theme IR。Theme 本身是闭合的 Core selector 契约，不存在可由第三方注册的 token map；领域扩展通过 owner schema / resolver 完成，因此不建立 Core token registry
- Scene / manifest / renderer / diagnostics 如何闭环：Scene / Scope 只持有 selector，Composite 读取完整 effective Theme，领域 resolver 物化样式，最终 Scene 只含已物化 primitive。错误分别在 Core Theme selector 或 owner spec schema 边界报告
- provenance / locator / Interaction Readiness 是否适用：现有 Theme locator、Scope traversal、probe / replay 与 incremental snapshot 继续使用轻量 selector；本 ADR 不新增 interaction 语义
- 结论：扩展现有 Core Theme 域并收窄其公开 IR；领域 token 责任上移回各 owner resolver

## 被否决方案

- 保留 generic sparse token bag：稀疏性无法阻止完整 map 进入 IR，仍无法保证 snapshot 体积与领域边界
- 让 Zod schema 在 parse 时生成 token：schema 应只定义 JSON 输入合法性，不能读取 registry、领域 preset 或 runtime context
- 用 Scope locator 绑定运行时 side table：会破坏 plain JSON、SSR、retained snapshot 和 React / Vanilla 的输入等价性
- 让 Core 持有全部领域 token catalog：会制造反向依赖与巨型 Core bundle，违背领域 owner 边界

## 测试策略摘要

需要 schema / type 证据证明 Theme 只接受轻量 selector 并拒绝 token bag；compile 证据证明 Scene / Scope 继承、Core shared colors、probe / replay 与 Core-only 输出稳定；各领域 resolver 证据证明完整 token 仅在 owner 内生成、局部 sparse override 仍保持优先级；React、Vanilla、plain JSON 与 retained / fresh runtime 证据证明输入和输出等价；文档证据证明不再宣称 `theme.tokens` 或 token definition 注入。

## 不在本 ADR 范围

- 自定义 Core semantic color 值、任意色板数组或远程 Theme 配置
- 跨领域的 Scope token override、命名 Theme loader、Theme lineage、交互状态和动画 token
- Plot、Chart、Table 各自 token key、preset 内容、resolver 算法和局部 override DSL 的重新设计
- renderer-specific CSS variables、宿主 UI theme 或 renderer 默认样式
