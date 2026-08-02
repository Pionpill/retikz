# ADR-09：可继承 Theme IR 与 Composite 编译上下文

- 状态：Proposed
- 决策日期：2026-08-03
- 关联：[alpha.2 roadmap](./roadmap.md) · [通用视觉主题设计](../../../../../../../notes/architecture/visual-theme-design.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

## 背景与目标

Chart、Table 与未来 Geo 等领域都需要在同一张图中选择一致的视觉人格和明暗环境。当前各领域分别声明同义的 style / mode 值，并把选择保存在自己的高层 spec 中；这种做法无法让整张 Scene 持久化统一主题，也无法让嵌套 Scope 为局部子树切换主题。新增领域还会继续复制枚举、默认值和宿主接线。

视觉主题选择是绘图树的环境语义：它必须在 JSON IR 中可持久化，按 Scene / Scope 层级确定性继承，并在 composite 展开或布局时交给真正拥有领域 token 的消费方。它不是 Node / Path 的隐式样式，也不应让 Core、adapter 或 renderer 拥有 Chart / Table 的 token vocabulary、具体 preset 色值或领域 cascade。

本决策建立一条共享而有界的 Theme 链路：Core 拥有通用 style / mode 词汇、Scene / Scope IR、继承解析与 Composite 编译上下文；领域包依据当前有效 Theme 解析自己的完整默认 token，再沿已有正式能力 lowering。相同持久化 IR 在 React、Vanilla、headless compile、SVG 与 Canvas 中必须得到等价结果。

## 决策：Theme 作为 Scene / Scope 的可继承持久化环境

Theme 由正交的视觉人格 `style` 与明暗环境 `mode` 组成。Core 提供四种共享视觉人格和两种共享明暗模式，并允许 `IRScene` 与任意 `IRScope` 写入稀疏 Theme。Compile 从 `neutral + light` 开始，按字段依次合并 Scene、外层 Scope 与内层 Scope；最近层已声明的字段获胜，省略字段继续继承。

Core 将当前完整有效 Theme 传给无布局 Composite 展开和 layout-aware Composite 编译。Composite 可以忽略 Theme，也可以把它映射为自己拥有的领域默认；Core primitive、Scene primitive 与 renderer 不按 Theme 分支。Composite 输出中的嵌套 Scope 继续参加同一继承链，因此主题作用域不因跨层 lowering 丢失。

理由：

1. Theme 需要随 IR 持久化并支持局部子树，不能只存在于 React context、compile option 或单个领域 spec
2. style / mode 是跨领域稳定词汇，而 token vocabulary、preset 具体值和映射仍具有明确领域 owner
3. compile-time context 可以让 Chart、Table、Standard 与第三方 Composite 复用同一环境，不把默认样式沉到 adapter 或 renderer
4. 字段级继承允许局部 Scope 只切换 mode 而保留父级视觉人格，也无需新增 resetTheme 或另一套级联语法

## 基础数据结构与公开契约

Core 公开共享词汇：

```ts
export const ThemeStyle = {
  Neutral: 'neutral',
  Academic: 'academic',
  Vibrant: 'vibrant',
  Clean: 'clean',
} as const;

export const ThemeMode = {
  Light: 'light',
  Dark: 'dark',
} as const;
```

Theme IR 是严格、JSON-safe 的稀疏对象；解析后的编译上下文始终完整：

```ts
type IRTheme = {
  style?: ThemeStyleValue;
  mode?: ThemeModeValue;
};

type ResolvedTheme = Readonly<{
  style: ThemeStyleValue;
  mode: ThemeModeValue;
}>;
```

Scene 与 Scope 复用同一个 Theme 契约：

```ts
type IRScene = {
  type: 'scene';
  version: 1;
  theme?: IRTheme;
  children: Array<IRChild>;
};

type IRScope = {
  type: 'scope';
  theme?: IRTheme;
  children: Array<IRChild>;
};
```

两类 Composite 都能读取当前有效 Theme：

```ts
type CompositeExpandContext = Readonly<{
  theme: ResolvedTheme;
}>;

type LayoutCompositeCompileContext = Readonly<{
  theme: ResolvedTheme;
  // 其余既有 layout-aware contract
}>;

type CompositeCompileScopeProps = Readonly<{
  theme?: IRTheme;
  // 其余既有 runtime Scope 结构属性
}>;
```

无布局 Composite 的展开入口接收 `CompositeExpandContext`；既有只声明 node 参数的回调可以继续忽略新增上下文。Layout-aware Composite 的 `context.scope()` 接受同一个严格、稀疏的 `IRTheme`，普通 output child 在该 runtime Scope 的有效 Theme 下继续编译。完整 compile 与只 lowering 到 Kernel IR 的入口必须使用相同 Theme 继承语义。

Opaque replay child 已在 `layoutChild()` probe 时物化，runtime Scope 不能事后重新解释它的 Theme。需要让 replay child 使用更内层 Theme 时，Composite 必须先把原始 child 包在携带该 Theme 的普通 `IRScope` 中再 probe，并 replay 该 Scope 的结果；Core 对 scope props 与 probe 输入使用相同 Theme schema 和字段级继承规则。这样 replay 结果始终保持 probe 与提交等价，不引入隐式二次编译。

React `<Layout theme>` 写入根 `IRScene.theme`，`<Scope theme>` 写入 `IRScope.theme`。Vanilla Figure / Scope 表达同一 IR。`Layout` 同时接收持久化 `ir` 与显式 `theme` 时，宿主 prop 按字段覆盖根 IR Theme；未覆盖字段保留持久化值，输入对象本身不被修改。

## 行为、失败语义与兼容性

- 默认行为：未声明 Theme 时，所有 Composite 收到 `{ style: 'neutral', mode: 'light' }`
- 继承行为：解析顺序固定为 Core 默认值、Scene Theme、从外到内的 Scope Theme；每层只覆盖自己显式声明的字段
- 作用范围：Scope Theme 只影响其后代 Composite；普通 Core Node、Path、Coordinate 和 Scope 自身不会自动获得 fill、stroke、font 或其它样式
- lowering 行为：Composite 在当前有效 Theme 下生成正式领域 IR 或 Core IR；最终 Scene 只保留已经物化的样式，不携带 Theme，也不要求 renderer 理解 preset
- 嵌套行为：Composite 展开或 probe 的子节点继承调用点 Theme；普通输出 Scope 或 runtime Scope 可以通过自己的 Theme 建立更内层环境。Opaque replay 保留 probe 时的有效 Theme；要切换 Theme 必须在 probe 输入中显式包裹带 Theme 的 `IRScope`
- retained 行为：Theme 是 compile 输入。Theme 变化必须使可能消费它的后代 Composite 失效；不能证明更窄依赖时走完整重编译，并与 fresh compile 等价
- 失败与诊断：Theme 对象拒绝未知字段和非法 style / mode；错误指向对应 Scene / Scope theme 路径。领域 token、palette 或映射失败继续由领域 owner fail-loud
- 重置语义：不新增 `resetTheme`。需要回到基线时显式写入完整 `neutral + light`
- Core 兼容性：Scene / Scope 的可选字段和 Composite callback 的只读上下文是可忽略的新增能力，IR major version 保持不变
- 领域兼容性：Chart、Table 等后续迁移会在各自版本 ADR 中移除重复的 Style / ThemeMode 常量与 spec 字段；`0.x` 不保留别名或双读桥接。本 ADR 不修改任何领域公开 schema，也不选择首个迁移领域
- React / Vanilla 等价性：两套 authoring 都生成同一 Theme IR；standalone 入口可把 Theme 作为 Layout 宿主属性，嵌入现有 Layout 时通过外层 Layout / Scope 选择局部 Theme

## 功能与包边界

- 所属能力域与解决的问题：Drawing Complete 的 Composition / Style 环境能力，解决跨领域 Composite 缺少可持久化、可分层的共享视觉环境
- 主责包与协作包：`@retikz/core` 主责 Theme IR、共享词汇、继承解析与 Composite context；React / Vanilla 负责等价 authoring；Chart、Plot、Table、Standard 与未来 Geo 负责领域消费；Render 只执行 Scene
- Core 拥有：`ThemeStyle`、`ThemeMode`、Theme schema、Scene / Scope theme 字段、默认与继承语义、两类 Composite 的有效 Theme 上下文及确定性失效边界
- Core 不拥有：领域 token key/value contract、完整 preset map、palette、axis / legend / Cell 语义、Chart presentation、CSS theme、renderer 默认或宿主 UI theme
- 领域拥有：自己的 strict token vocabulary、四种 style × 两种 mode 的具体合法实现、用户 sparse token、领域 mapping、cascade、inspection 与诊断
- 外部扩展与下游闭环：内置与第三方 Composite 经同一 definition / registry / compile 路径读取只读 Theme context，并自行决定是否支持主题；主题选择是闭合数据，不需要独立 Definition / registry。领域自定义继续使用已拥有的 token 或 capability contract
- 不支持边界：Theme 不自动修改 Core primitive，不在 Core 建立巨型 token schema，也不让 renderer 按 style / mode dispatch

领域表现性优先级保持：

```text
effective Scene / Scope Theme
  -> domain preset tokens
  -> user domain token overrides
  -> domain shorthand / native theme
  -> explicit local component config
```

后层只能覆盖可撤销的表现性默认，不能撤销 Chart type 核心配方、Table 结构或其它领域不变量。

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 的 Style / Resource 与 Composition 环境
- 解决的问题：让共享 Theme 选择随 Scene / Scope 持久化，并由当前位置的 Composite 确定性消费
- 主责包与协作包：Core 拥有 IR、继承和 Composite context；React / Vanilla 构造等价 IR；Render 继续只执行 Scene；领域 owner 后续映射自己的 token
- 是否可由现有能力组合：现有 Scope 只级联 primitive style，Composite expand 没有上下文，无法持久化或传递跨领域 Theme，因此需要扩展 Core IR 与 Composite contract
- 是否需要下沉到依赖能力域：Math 与 Runtime 不拥有这类绘图树环境；能力直接扩展 Core，不下沉到它们
- 内部表达链路：Theme schema -> Scene / Scope 字段 -> 字段级继承 -> expand / layout-aware Composite context -> 已物化的 Core IR -> renderer-neutral Scene
- 外部扩展链路：内置与第三方 Composite 继续使用同一 `defineComposite`、registry、schema parse 与 compile 路径；style / mode 是闭合数据选择，不执行 provider 逻辑，因此不建立 Theme registry
- 下游执行 / adapter 等价性：React / Vanilla 写入同一 Theme IR，完整 compile 与 lowering-only 使用同一继承规则，SVG / Canvas 消费不含 Theme 的同一 Scene。Kernel alpha.2 以两类第三方 Composite 作为公开 contract consumer；Chart、Table 等真实领域迁移延期到各自版本 ADR
- 不支持边界与诊断：Core schema 对非法 Theme 给出 Scene / Scope IR 路径；领域 token 与 mapping 继续由领域 fail-loud。`ResolvedTheme` 只公开完整有效值，不包含逐字段 winning layer 或 Scope locator；本 ADR 不承诺 Theme lineage，领域 inspection 只能把 derived preset/token 标记为来自 effective Theme
- 本轮结论：扩展当前 Drawing Complete 能力域，先冻结持久化 Theme 环境与通用消费 contract，再由领域 ADR 迁移重复选择字段

## 被否决方案

- 只迁移枚举、不增加 IR 与 compile context：只能减少重复 import，无法持久化、局部继承或让 headless compile 消费
- 只用 React Context：嵌入式静态收集、Vanilla、JSON 与 headless compile 无法共享同一事实
- 只放在 compile options：Theme 不随 IR 保存，嵌套 Scope 也无法表达局部切换
- 继续保留每个领域的 style / mode 字段：同一 Scope 内多个领域可能漂移，新增领域仍会复制公共词汇和宿主接线
- 让 Core 解析全仓 token map：会把 Plot guide、Table Cell、Chart presentation 等领域语义吸入底层并形成巨型不稳定 schema
- 把 Theme 传给 renderer：会让 SVG / Canvas 重复 preset dispatch，并破坏 renderer-neutral Scene
- 新增 resetTheme：完整 Theme 已能显式恢复基线，额外屏障只会扩大状态空间

## 测试策略摘要

需要 schema、IR JSON 往返、Scene / Scope 字段级继承、默认解析、第三方 expand 与 layout-aware Composite context、runtime Scope、probe / replay、嵌套 lowering、retained 与 fresh compile 等价、React / Vanilla authoring parity 及 renderer parity 证据。关键不变量是同一 Theme IR 在所有入口得到同一有效 Theme，Scope 只影响后代，Core-only 图元不因 Theme 改变输出，opaque replay 保持 probe Theme，非法输入 fail-loud，最终 Scene 不要求 renderer 认识 Theme。真实领域的 preset/token 映射与旧字段迁移由后续领域 ADR 提供自己的消费、inspection 和显式配置优先级证据。

## 不在本 ADR 范围

- 领域 token vocabulary、preset 具体色值、palette、axis / legend / Cell mapping 的完整定义
- 用户注册新的 style / mode 名称、命名主题 registry、继承、远程加载或 marketplace
- CSS variables、系统 prefers-color-scheme 自动读取、宿主 UI theme 或 docs chrome
- Theme transition、动画、交互状态 token、accessibility 自动调色或 renderer 专属效果
- 为既有 Chart / Table Style、ThemeMode 或 spec 字段保留兼容别名
- Chart、Table、Plot、Standard 或其它领域的 preset/token 实现、公开 schema 迁移与首个真实领域消费者选择
- Theme style / mode 的逐字段 winning Scene / Scope lineage、locator sidecar 或公开来源查询
