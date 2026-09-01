# ADR-04：Group 与 Block 继承 Graph Theme 外观

- 状态：Accepted
- 决策日期：2026-08-31
- 关联：[Graph v0.1 alpha.2 roadmap](./roadmap.md) · [Graph 语义注册与主题样式](../alpha.1/06-graph-entity-registry-theme.md) · [Block 开放内容与布局容器](./03-block-open-content.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md)

## 背景与目标

Graph Theme 已经用当前 Core `theme.style` 的同名 Definition 为 Entity 与 Relation 提供领域外观默认，Flow compile 也在测量和最终物化阶段传递同一个 Core Theme 与 Graph definitions。然而 Docs 的 Flow reference definitions 仍把 Academic、Vibrant、Clean 的 Entity / Relation 外观复制为显式 Flow token；这些字段会以作者覆盖优先级遮蔽 Graph reference style，使同名主题存在两套数值真源

Group 与 Block 同属 Graph semantic composite，但它们的 shell 当前直接在 lowering 中使用固定 Neutral 默认，不解析 named Graph Theme。结果是 Flow 即使正确传递 `academic`，Entity / Relation 可以继承 Graph Academic，Group / Block 外框却不能随同一个 Graph style 变化

本决策让 Graph 成为 Group / Block / Entity / Relation 外观的统一 owner：扩展已有 Graph Theme style contract，使 named style 同时解析 Group 与 Block shell；Flow 继续只拥有布局、位置和路由，并保留显式 Flow appearance 作为高优先级作者覆盖

## 决策

### Graph Theme 增加 Group 与 Block shell baseline

Graph Theme style resolution 增加必需的 `group` 与 `block` baseline。二者共用一个 Graph-owned、appearance-only 的 Surface token contract，只投影 Standard Surface 已公开的三个外观字段：

```ts
type GraphSurfaceThemeStyleTokens = WithRequiredProperties<
  Pick<SurfaceInput, 'background' | 'border' | 'cornerRadius'>,
  'background' | 'border' | 'cornerRadius'
>;

type GraphThemeStyleResolution = Readonly<{
  entity: { tokens: GraphEntityThemeStyleTokens; rules?: ReadonlyArray<IRGraphEntityThemeRule> };
  relation: { tokens: GraphRelationThemeStyleTokens; rules?: ReadonlyArray<IRGraphRelationThemeRule> };
  group: { tokens: GraphSurfaceThemeStyleTokens };
  block: { tokens: GraphSurfaceThemeStyleTokens };
}>;

type GraphThemeStyleOverrides = Readonly<{
  entity?: { tokens?: IRGraphEntityAppearanceTokenOverrides; rules?: ReadonlyArray<IRGraphEntityThemeRule> };
  relation?: { tokens?: IRGraphRelationAppearanceTokenOverrides; rules?: ReadonlyArray<IRGraphRelationThemeRule> };
  group?: { tokens: Partial<GraphSurfaceThemeStyleTokens> };
  block?: { tokens: Partial<GraphSurfaceThemeStyleTokens> };
}>;
```

代码块表达公开关系，不建立手写平行 Surface schema。实际 Group / Block token schema 直接组合 `SurfaceInputSchema` 的 `background`、`border` 与 `cornerRadius` 字段；出现的 `tokens` 必须至少包含一个字段。根覆盖对象 `{}` 仍合法，以支持完整继承 Neutral 的 Clean 一类 reference definition

Group 与 Block 不增加 rules。二者当前没有稳定的 role、kind、predicate 或其它可复用语义 selector；Theme 不按 id、Source discriminator、视觉 variant 或任意字段选择 shell 外观。若未来出现真实的 Group / Block 语义分类需求，必须先单独建立对应语义契约，再评估 selector

### Neutral 保持现有外观

发布包的 Neutral baseline 保持当前可见结果，避免省略 `theme.style` 的 Graph 发生视觉迁移：

- Group：`lightgray / 0.04` 背景、`lightgray` 1 unit 虚线边框与 `cornerRadius: 4`
- Block：透明背景、`currentColor / 0.2` 1 unit 边框与 `cornerRadius: 8`

Group caption、label host、Block Header / Section / Row 的结构文字与局部 shell 不进入本次 token contract。它们仍使用各自 Graph-owned lowering default 或显式 Source appearance；本决策只统一 Group 与 Block 根 shell

### Named Theme 与显式 Source 使用单向级联

Group / Block shell 按以下顺序确定：

```text
Graph Neutral baseline
> 当前 Core Theme style 对应的 Graph Definition tokens
> Group / Block 显式 Source appearance
```

显式 Source `background`、`border` 或 `cornerRadius` 按这三个顶层字段覆盖 named baseline；未显式提供的顶层字段继续继承 named baseline。`background` 与 `border` 一旦显式出现，就把对应的完整 Theme 字段作为整体替换，不在其内部继续深合并 fillOpacity、strokeWidth、dashPattern 等子字段；这保持 Group / Block 当前“显式 Surface 字段整体替换组合默认”的语义。Theme resolution 只产生 lowering 所需的 effective appearance，不把默认或主题值写回 sparse Source

`graphTheme` Source layer 的语义保持不变：它仍只保存作用于可见后代 Entity / Relation 的 JSON-safe rules，不样式化承载该 layer 的 Graph、Group 或 Block shell。Graph / Group / Block 根外观消费其 compile 位置已经生效的 Core Theme；Source 自身的 Core `theme` 继续作为下沉后内容的 Scope 边界，并按既有规则切断外层 `graphTheme`。本决策不新增 composite 自身 Theme 的预解析能力，因此 Source-local `theme` 不改变承载它的根 shell

Theme 不得改变 Group / Block 的 padding、gap、width、minWidth、overflow、caption 排版、child allocation、identity、namespace、position、route、measurement protocol 或 provider closure。Group 与 Block lowering 继续生成同一个 Standard Surface 和 renderer-neutral Core Scene；renderer 不识别 Graph Theme

### Flow 继承 Graph Theme，不复制 Graph 外观

Flow resolve、measurement 与最终 materialization 继续使用 compile context 中同一个 Core Theme 和同一组 Graph definitions。Flow 不把 `academic`、`vibrant` 或 `clean` 写入每个 Graph Source，也不建立 Diagram 到 Graph 的跨包 theme registry；Graph 元素在自身 owner 边界按 `context.theme.style` 解析同名 Graph Definition

`flowTheme` 与 `flowThemeTokens` 继续存在，作为 Flow 作者显式声明的高优先级投影入口。它们可以覆盖 Graph Source 已公开的 appearance，但不再承担 reference style 的 Graph 默认。Docs 的 Academic、Vibrant、Clean Flow definitions 删除与 Graph Entity / Relation / Group / Block reference appearance 重复的 token；Diagram frame 等 Diagram-owned reference appearance 仍由 Diagram Theme Definition 负责

### Docs 页面共享现有主题选择器

Docs 的全局 Preview Theme selector 从 `schematic/graph` 扩展到 `schematic/diagram/**`。Diagram Flow preview host 继续显式注入 Core、Diagram、Flow 与 Graph definitions；切换 Academic、Vibrant、Clean 时，同一个 Core `theme.style` 分别交给各 owner 解析，不依赖 ambient mutable registry

该页面能力只改变 preview host 的可选主题与 definition bundle，不修改 demo Source、公开 adapter、路由数据结构或 renderer。普通用户若在自己的 host 使用 named Graph Theme，仍需按现有公开 options / provider contract 显式贡献同名 Graph Definition

## 行为、失败语义与兼容性

- Graph Theme callback 返回未知 `group` / `block` 字段、未知 Surface token、空 `tokens`、非法 background / border / cornerRadius、函数、class 实例或其它非 plain data 时，统一报告 Graph Theme Definition callback 失败并保留原始 cause
- compile context 中已经生效的 Core `theme.style` 在 Graph elements 解析时缺少同名 Graph Definition，继续报告 `DefinitionNotRegistered`，不回退 Neutral、不借用 Diagram / Flow Definition，也不根据名称内建分支
- Group / Block 显式 Source appearance 继续由各自 strict schema 校验；Definition output 不进入 Source schema，adapter 不重复解析 runtime callback
- Group / Block 与 Entity / Relation 使用同一个 Graph Theme Definition callback contract；Direct IR、React、Vanilla 与 Flow projection 共享相同 resolution 和 lowering 结果
- alpha.2 尚未发布，旧固定 shell 默认直接迁移为 Neutral baseline，不提供旧 resolver、双轨默认、兼容 alias 或 fallback

## 非目标

- 不为 Group / Block 增加 role、kind、variant、selector、局部 Theme Source、Definition registry 或按 identity 设置主题的入口
- 不扩展 Core composite compile context，使 composite Source 自身的 `theme` 在根 shell 编译前预先生效
- 不把 Standard Surface 的 padding、overflow 或 Layout 字段纳入 Graph appearance Theme
- 不样式化 Header、Section、Row、caption、label host、普通 Core / Standard / Layout child 或未知 Tier 2 composite
- 不移除 Flow 的显式 appearance token 能力，不改变 Flow Source、layout provider、routing、artifact 或 spatial handles
- 不把 Docs reference definitions 内置进 Graph、Diagram 或 Flow 发布包

## 预期结果

调用方只需在一个 Core Theme 上选择 `academic` 等 style，并向各实际 owner 注入同名 Definition；Flow 会自然继承 Graph 对 Entity / Relation / Group / Block 的外观，同时保持自身布局与路由职责。Graph reference appearance 只有一套 owner 真源，显式 Flow / Graph Source appearance 仍保持最高优先级
