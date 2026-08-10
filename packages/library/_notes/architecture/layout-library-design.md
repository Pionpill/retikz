# Layout 布局库设计

> **状态：长期边界已人工确认并由 Layout v0.1 alpha.1 落地。** Layout 三包是排版布局的唯一 owner；Standard 只通过公开 capability 消费，不保留转发或兼容 namespace。
>
> 关联：[`Library 能力库设计`](./library-design.md) · [`Standard 拓展库设计`](./standard-library-design.md) · [`Core layout-aware composite ADR`](../../../kernel/_notes/decisions/v0/v0.5/alpha.1/07-layout-aware-composite.md) · [`能力完备性与模块边界`](../../../../notes/architecture/capability-design.md)

---

## 定位

Layout 是 Retikz 的领域无关排版布局包家族。它把任意合法 Core child 放入容器约束中，解析 intrinsic contribution、父级 proposal、item sizing、spacing、alignment、distribution、overflow 与 clip，输出稳定 placement、replay 结果和可观察 artifact。

Layout 解决“内容在容器内如何排布”，不解决“关系图节点应如何自动定位”。Flex、Grid 与 Overlay 属于排版布局；Tree、Layered、Force、UML 自动排布、rank、port constraint、edge routing 与碰撞避让属于算法布局及相应领域 owner。

## 与 Core 的边界

Core 拥有 renderer-agnostic 的 layout-aware 基础协议：proposal、minimum / natural contribution、probe、replay、Scope、occurrence、diagnostics、typed artifact 提交与 Scene 编译。Layout 只消费这些公开契约，不复制 measurer、建立平行 compile pipeline、持久化 replay handle 或从 Scene / renderer 反推尺寸。

Layout 拥有：

- Box、LayoutItem、size、spacing、alignment、distribution 与 overflow 公共词汇
- Flex、Grid、Overlay 等领域无关排版 schema、Definition、solver 与 composition
- child measure / place / replay 的布局会话组合
- allocation、slot、visual / visible bounds、clip 与 Layout artifact
- Layout inspection 及 React / Vanilla 等价 authoring

Layout 不拥有 Core IR、Scene、renderer、字体测量实现、跨 compile cache、GraphModel、领域关系、算法布局或编辑器运行时。

## 包家族与发布

```text
@retikz/layout
  ├─ 排版 schema、Definition、solver 与 artifact
  ├─ 稳定 composition capability
  └─ 可选 inspection capability

@retikz/layout-react ───→ @retikz/layout + @retikz/react
@retikz/layout-vanilla ─→ @retikz/layout + @retikz/vanilla
```

三个包使用独立 release group `layout` 并保持组内 lockstep。Layout 不依赖 Standard、Notation、Plot、Table 或 renderer；Standard 和领域包按实际使用单向依赖 Layout。Layout adapter 不复制宿主无关 schema、solver、artifact 或 diagnostics。

## 公共入口

`@retikz/layout` 根入口面向直接作者，提供 FlexLayout、GridLayout、OverlayLayout、LayoutItem、对应 Definition / factory / schema、公开类型与 Layout artifact 契约。

`@retikz/layout/compose` 面向 Standard、Notation 与其它 Tier 2 owner，提供稳定且最小的布局组合能力，包括 canonical layout compile、child measure / place / replay、spacing / slot / clip、artifact 几何和确有跨 owner 复用证据的排版算法。它是公开 capability，不是内部目录镜像；仅有单一调用点或暴露私有状态的 helper 继续留在包内。

`@retikz/layout/inspect` 是可选 inspection 入口，消费独立 `@retikz/inspect` 契约而不污染 Layout 根入口。React 与 Vanilla 包提供对应 `/inspect` authoring 入口。

## Canonical identity

Layout package family 使用 `layout` namespace。FlexLayout、GridLayout 与 OverlayLayout 的 canonical composite identity 分别为 `layout.flexLayout`、`layout.gridLayout` 与 `layout.overlayLayout`；Definition、直接 IR、React 和 Vanilla 使用同一 identity。

Standard 不接受、导出或生成 `standard.*Layout`，也不提供 re-export、alias、deprecation wrapper 或双 namespace bridge。组件和类型名称保持布局语义本身，不以 owner 迁移为由改写 Flex / Grid / Overlay 的作者概念。

## 组合与领域消费

Standard Legend、Notation LogicFrame / Callout、Plot、Table 与未来 Tier 2 可以直接组合 Layout。调用方拥有自己的领域 schema、identity、artifact 与失败语义；Layout 只拥有排版输入和结果，不把领域 composite 强制 lower 成公开嵌套 Layout IR，也不隐式注册调用方未知的 Definition。

同一布局输入必须经 canonical Layout schema、solver、Core probe / replay 与 artifact 主链处理。跨 owner 组合不得 deep import Layout internal、复制 solver、从 child 类型推断尺寸或为某一 renderer 建立特殊分支。

## 行为与失败语义

Layout 输入保持 JSON-safe，schema 对非法数值、互斥字段、重复 item identity 与无效约束 fail-loud。父 allocation 不足但仍有确定几何结果时保留真实 slot、allocation、overflow 与 clip 结果；定义歧义、无有限解、child probe / replay 失败继续沿 Core layout-aware context 提升，不静默降级。

直接 IR、React 与 Vanilla 对同一语义输入构造相同 canonical Layout IR，并进入同一 Definition 与 compile 主链。SVG、Canvas 与其它 renderer 只消费同一 Core Scene，不增加 Layout renderer 分支。

## 文档与演进

文档站在 Library 模块的 `Layout · 布局` 分组维护介绍、布局组件、composition / inspection 指南、参考和独立更新日志；顺序位于 `Standard · 拓展` 之后。

新增排版模型必须证明它属于领域无关容器约束，能够复用 Core layout-aware contract，并形成 schema、solver、artifact、adapter、tests 与 docs 闭环。依赖图关系、全局优化、拓扑或路由的能力不进入 Layout roadmap。

## 非目标

- 完整 CSS layout、DOM / renderer 回读、浏览器默认样式或异步测量
- Tree、Layered、Force、Radial graph、UML 自动排布与 edge routing
- GraphModel、Node / Edge / Port / Group 语义和编辑器状态
- 万能 solver registry、全局自动注册或跨 compile replay 持久化
- Standard compatibility facade、双 owner、双 namespace 或复制布局实现
