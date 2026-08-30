import type { Release, SubVersion } from '../types';

const graphMilestones: Array<SubVersion> = [
  {
    version: 'alpha.2',
    date: '2026-08-29',
    summary: {
      zh: '新增可承载任意内容的 Block 布局容器，以及可独立组合的 Header、Section 与 Row。',
      en: 'Adds an open-content Block layout container plus independently composable Header, Section, and Row components.',
    },
    items: [
      {
        label: { zh: '开放内容与独立结构', en: 'Open content and independent structures' },
        content: {
          zh: '新增 JSON-safe `IRBlock`，接受任意有序 Core / Tier 2 children，并复用完整 Core Scope、Standard Surface 与纵向 FlexLayout。Header、Section 与 Row 拥有独立 schema、Definition、React 和 Vanilla 入口；Cell 保持 Row-local Flex item。显式 identity、`localNamespace`、anchor 与 boundary 继续由 Core 处理，不新增自动 id 前缀或 Port IR。',
          en: 'Adds JSON-safe `IRBlock` with arbitrary ordered Core and Tier 2 children while reusing the complete Core Scope, Standard Surface, and a column FlexLayout. Header, Section, and Row have independent schemas, Definitions, React, and Vanilla entries, while Cell remains a Row-local Flex item. Core continues to own explicit identity, `localNamespace`, anchors, and boundaries; no automatic id prefixes or Port IR are added.',
        },
      },
      {
        label: { zh: '外层尺寸与分区内边距', en: 'Outer sizing and section padding' },
        content: {
          zh: 'Block 支持 `width` 与 `minWidth` 控制包含外层内边距的整体宽度；默认 Section 使用 `8` 圆角和 `8` 内边距，与 Block 外层默认值一致，Row 使用透明 `fill`，保持 `8` 内边距且不单独设置背景、边框和圆角。',
          en: 'Block supports `width` and `minWidth` for the total outer width including shell padding. Sections default to the shell’s `8` corner radius and padding, while Rows use a transparent `fill`, remain at `8` padding, and do not set their own background, border, or corner radius.',
        },
      },
      {
        label: { zh: 'Entity 简洁默认外观', en: 'Concise Entity defaults' },
        content: {
          zh: 'Entity Neutral 默认改为完整主色描边、`0.08` 同色轻填充与 `contrast` 正文；数值颜色由 Core 按最终静态主色与当前 mode 物化为不透明颜色。Docs Graph Clean 不再维护 Entity / Relation 专属覆盖并完整继承 Neutral，Core、Plot、Chart 与 Table 的 Clean definitions 保持不变。',
          en: 'Entity Neutral now uses a complete master-color outline, a light same-color `0.08` fill, and `contrast` body text; Core materializes numeric colors into opaque values from the final static master and current mode. Docs Graph Clean no longer maintains Entity/Relation-specific overrides and fully inherits Neutral, while the Core, Plot, Chart, and Table Clean definitions remain unchanged.',
        },
      },
    ],
  },
  {
    version: 'alpha.7',
    date: '2026-08-23',
    summary: {
      zh: '⚠️ 将 Graph 收敛为可选的 Core Scope 薄壳，并让 Entity、Relation 成为可独立编译和嵌入的 Source composite。',
      en: '⚠️ Reduces Graph to an optional Core Scope shell and makes Entity and Relation independently compilable and embeddable Source composites.',
    },
    items: [
      {
        label: { zh: 'BREAKING：组合结构', en: 'BREAKING: composition structure' },
        content: {
          zh: '`IRGraph.children` 直接保存任意 Core / Tier 2 child，不再维护成员集合。Entity 与 Relation 可以脱离 Graph 使用；Container 契约及其文档已删除。',
          en: '`IRGraph.children` now stores arbitrary Core and Tier 2 children directly instead of member collections. Entity and Relation can be used without Graph, and the Container contract and docs are removed.',
        },
      },
      {
        label: { zh: 'BREAKING：上下文与引用', en: 'BREAKING: context and references' },
        content: {
          zh: 'Graph 复用完整 Core Scope 公共面；`theme` 回归 Core Theme，Graph-local 外观规则迁移到 `graphTheme`。Relation endpoint 迁移到 `IRNodeTarget`，引用与 unresolved / duplicate-id 诊断统一交给 Core namespace。',
          en: 'Graph reuses the complete Core Scope surface. `theme` returns to Core Theme while Graph-local appearance rules move to `graphTheme`. Relation endpoints migrate to `IRNodeTarget`, with references and unresolved / duplicate-id diagnostics delegated to Core namespace.',
        },
      },
      {
        label: { zh: 'BREAKING：authoring 入口', en: 'BREAKING: authoring entries' },
        content: {
          zh: 'React 的 `<Graph>` 顶层建立 Scene、嵌入时只建立局部 Scope；`<Entity>` 与 `<Relation>` 可独立嵌入。Vanilla 改用 `graph()`、`entity()`、`relation()` 三个 builder 与对应 adapters；traversal id 不再生成 authored `id`。',
          en: 'Top-level React `<Graph>` creates a Scene and embedded Graph creates only a local Scope, while `<Entity>` and `<Relation>` can embed independently. Vanilla now exposes `graph()`, `entity()`, and `relation()` with matching adapters; traversal ids no longer generate authored `id` values.',
        },
      },
      {
        label: { zh: 'BREAKING：Relation Path 与 label 复用', en: 'BREAKING: Relation Path and label reuse' },
        content: {
          zh: 'Relation 直接复用除语义冲突项外的 Core Path 字段与完整 `IRGeometryLabel`。Theme 只提供默认；显式 Path 字段、dash pattern 与单个 label 外观最终优先，旧 Graph-only Relation label 类型已删除。',
          en: 'Relation now directly reuses non-conflicting Core Path fields and complete `IRGeometryLabel` values. Theme only supplies defaults; explicit Path fields, dash patterns, and per-label appearance take final precedence, and the Graph-only Relation label type is removed.',
        },
      },
      {
        label: { zh: 'BREAKING：Variant 迁移到 Theme', en: 'BREAKING: Variant moves to Theme' },
        content: {
          zh: '删除 Entity / Relation `variant`、Graph `entityVariant` 及对应 Definition registry。原 `fill` 视觉意图迁到 docs Vibrant reference style，`mixed` 迁到 Clean reference style；精确单例外观继续使用 Core-compatible 实例字段。Entity role 与 Relation role / kind 仍在 TypeScript 和 JSON Schema 中提供开放词汇提示。',
          en: 'Removes Entity / Relation `variant`, Graph `entityVariant`, and their Definition registries. The former `fill` intent moves to the docs Vibrant reference style and `mixed` moves to Clean; precise one-off appearance continues through Core-compatible instance fields. Entity role and Relation role / kind remain open vocabularies with TypeScript and JSON Schema hints.',
        },
      },
      {
        label: { zh: '稀疏 Graph Theme style', en: 'Sparse Graph Theme styles' },
        content: {
          zh: '`GraphThemeStyleDefinition.resolve()` 现在返回相对默认 preset 的稀疏 `GraphThemeStyleOverrides`。Graph resolver 补全未声明的 Entity / Relation tokens，保留默认 rules，并在其后追加自定义 style rules。',
          en: '`GraphThemeStyleDefinition.resolve()` now returns sparse `GraphThemeStyleOverrides` relative to the default preset. Graph resolve fills omitted Entity / Relation tokens, retains default rules, and appends custom style rules after them.',
        },
      },
      {
        label: { zh: 'Entity role 轮廓调整', en: 'Entity role contour updates' },
        content: {
          zh: '`activity` 默认保持实线描边；`resource` 改用 Standard `ellipticCapsule`，由上下半椭圆端与两侧直线形成单一外轮廓，不再绘制 Cylinder 的内部端盖弧，并通过对称纵向 padding 让文本垂直居中。',
          en: "`activity` keeps a solid outline by default. `resource` now uses Standard `ellipticCapsule`, forming one outer contour from two half-elliptic caps and straight sides without Cylinder's internal cap divider, with symmetric vertical padding keeping text vertically centered.",
        },
      },
    ],
  },
  {
    version: 'alpha.6',
    date: '2026-08-21',
    summary: {
      zh: '⚠️ 将 Entity 与 Relation 收敛为最小单 record Graph Source IR，删除 presentation / geometry wrappers；位置、路径、尺寸与内容直接复用 Core-compatible 字段，省略项与默认值仅在 resolve / compile 中处理。',
      en: '⚠️ Consolidates Entity and Relation into a minimal single-record Graph Source IR and removes presentation / geometry wrappers. Position, route, size, and content reuse Core-compatible fields directly, while omitted values and defaults are handled only during resolve / compile.',
    },
    items: [],
  },
  {
    version: 'alpha.5',
    date: '2026-08-16',
    summary: {
      zh: '建立 assembly-local Entity Definition registry 与 Graph Theme style，为后续三成员统一 registry/resolve 契约提供基础。',
      en: 'Introduces assembly-local Entity Definition registries and Graph Theme styles as the foundation for the unified three-member registry and resolve contracts.',
    },
    items: [],
  },
  {
    version: 'alpha.3',
    date: '2026-08-10',
    summary: {
      zh: '⚠️ 撤回缺少真实场景验证的 Callout 公共契约，不保留兼容入口。',
      en: '⚠️ Removes the unvalidated public Callout contract without a compatibility entry.',
    },
    items: [],
  },
  {
    version: 'alpha.1',
    date: '2026-08-28',
    summary: {
      zh: '首次发布 Graph package family，提供 Graph、Group、Entity、Relation 四类可组合 Source composite 与 React / Vanilla 等价入口。',
      en: 'First Graph package-family release with four composable Graph, Group, Entity, and Relation Source composites plus equivalent React and Vanilla entries.',
    },
    items: [
      {
        label: { zh: '四类可组合 Source composite', en: 'Four composable Source composites' },
        content: {
          zh: '`IRGraph.children` 与 `IRGroup.children` 直接接受任意 Core / Tier 2 child。Graph 是复用完整 Core Scope 公共面的可选上下文；Group、Entity 与 Relation 都能脱离 Graph 独立编译和嵌入，不建立成员集合、Graph-only declaration 或隐式 wrapper。',
          en: '`IRGraph.children` and `IRGroup.children` accept arbitrary Core and Tier 2 children. Graph is an optional context over the complete Core Scope surface, while Group, Entity, and Relation compile and embed independently without member collections, Graph-only declarations, or implicit wrappers.',
        },
      },
      {
        label: { zh: 'Entity 单记录语义', en: 'Single-record Entity semantics' },
        content: {
          zh: 'Entity 在同一 Source record 中保存 `role → kind → predicate(params)` 与非结构性 Core Node 字段。role Definition 拥有 shape、boundary、padding 与基础尺寸，Theme 提供外观默认，实例字段最终覆盖；缺少绘制所需 position 时 lowering 明确失败。',
          en: 'Entity stores `role → kind → predicate(params)` semantics and non-structural Core Node fields in one Source record. Role Definitions own shape, boundary, padding, and base size, Theme supplies appearance defaults, and instance fields win; lowering fails explicitly when required position is absent.',
        },
      },
      {
        label: { zh: 'Relation 复用 Core Path 与 NodeTarget', en: 'Relation reuses Core Path and NodeTarget' },
        content: {
          zh: 'Relation 在同一 record 中保存 `IRNodeTarget` endpoints、direction、语义、Core Path-compatible route 与完整 `IRGeometryLabel`。省略 route 时生成 source→target 直连；显式 Path 字段、dash 与单个 label 外观最终优先，引用和 unresolved / duplicate-id 诊断统一交给 Core namespace。',
          en: 'Relation stores `IRNodeTarget` endpoints, direction, semantics, a Core Path-compatible route, and complete `IRGeometryLabel` values in one record. Omitted routes become direct source-to-target paths; explicit Path fields, dash values, and per-label appearance win, while Core namespace owns reference and unresolved/duplicate-id diagnostics.',
        },
      },
      {
        label: { zh: '稀疏 Graph Theme 与上下文颜色', en: 'Sparse Graph Theme and contextual colors' },
        content: {
          zh: '`GraphThemeStyleDefinition.resolve()` 返回稀疏 `GraphThemeStyleOverrides`；resolver 先补 Neutral baseline 与默认 rules，再追加自定义 rules。`graphTheme` 只影响可见 Entity / Relation；派生 fill、stroke、文字、label 与 marker token 可使用 `[0, 1]` 主色权重，并由 Core 按最终主色和 Theme mode 确定。',
          en: '`GraphThemeStyleDefinition.resolve()` returns sparse `GraphThemeStyleOverrides`; resolve fills the Neutral baseline and default rules before appending custom rules. `graphTheme` affects visible Entities and Relations only, while derived fill, stroke, text, label, and marker tokens may use `[0, 1]` master-color weights resolved by Core from the final master color and Theme mode.',
        },
      },
      {
        label: { zh: 'Group 通用分组', en: 'General-purpose Group' },
        content: {
          zh: '新增 JSON-safe `IRGroup`、React `<Group>` 与 Vanilla `group()`。Group 复用 Standard Surface 外框、Layout caption 排列与 Core Node boundary labels；默认下方左侧 label 使用 Core `start` 对齐。Group 不自动布局 children，也不拥有 routing、避障或碰撞处理。',
          en: 'Adds JSON-safe `IRGroup`, React `<Group>`, and Vanilla `group()`. Group reuses Standard Surface, Layout caption arrangement, and Core Node boundary labels, with the default lower-left label using Core `start` alignment. Group does not own child layout, routing, obstacle avoidance, or collision handling.',
        },
      },
      {
        label: { zh: '显式 identity', en: 'Explicit identity' },
        content: {
          zh: 'Graph、Group、Entity 与 Relation 的 `id` 全部可省略。省略 authored `id` 时，resolve、lowering 与 adapter 不生成 Source id、Core id 或内部 model identity；只有显式 id 才参与 Core namespace。',
          en: 'The `id` of Graph, Group, Entity, and Relation is optional. When authored `id` is omitted, resolve, lowering, and adapters generate no Source id, Core id, or internal model identity; only explicit ids participate in Core namespace.',
        },
      },
      {
        label: { zh: '开放语义 registry 与通用 provider', en: 'Open semantic registries and generic providers' },
        content: {
          zh: 'Entity role 与 Relation role / kind 通过开放字符串 schema 向 TypeScript、JSON Schema、编辑器和 LLM 提示内置词汇，同时由统一 registry 支持自定义 Definition。`activity` 保持实线；`resource` 复用 Standard `ellipticCapsule`；Relation marker 复用 Core / Standard Arrow providers。',
          en: 'Entity role and Relation role/kind use open-string schemas to expose built-in vocabulary hints to TypeScript, JSON Schema, editors, and LLMs while shared registries accept custom Definitions. `activity` stays solid, `resource` reuses Standard `ellipticCapsule`, and Relation markers reuse Core and Standard Arrow providers.',
        },
      },
      {
        label: { zh: '移除未发布的旧契约', en: 'Unreleased legacy contracts removed' },
        content: {
          zh: '首次 npm 发布不包含 GraphFrame / GraphNode / GraphConnector、Callout、Container、presentation / geometry wrappers 或 Variant 视觉轴。原 `fill` / `mixed` 视觉意图分别由 Docs Vibrant / Clean reference styles 表达，单例精确外观使用 Core-compatible instance fields。',
          en: 'The first npm release excludes GraphFrame/GraphNode/GraphConnector, Callout, Container, presentation/geometry wrappers, and the Variant visual axis. Docs Vibrant and Clean reference styles carry the former `fill` and `mixed` intents, while precise one-off appearance uses Core-compatible instance fields.',
        },
      },
      {
        label: { zh: '三入口等价', en: 'Three-entry parity' },
        content: {
          zh: 'Direct IR、React 与 Vanilla 共享同一 Source schema、Definition、resolve 与 lowering。顶层 React `<Graph>` 建立 Scene，embedded Graph 只贡献局部 Scope；`graph()`、`group()`、`entity()`、`relation()` 使用对应 InputEmbed adapters，traversal id 不写入 Source identity。',
          en: 'Direct IR, React, and Vanilla share the same Source schemas, Definitions, resolve, and lowering. Top-level React `<Graph>` creates a Scene while embedded Graph contributes only a local Scope; `graph()`, `group()`, `entity()`, and `relation()` use matching InputEmbed adapters, and traversal ids never enter Source identity.',
        },
      },
    ],
  },
].sort((left, right) => right.date.localeCompare(left.date));

/** Graph v0.1 里程碑 */
export const graphV01: Release = {
  minor: 'v0.1',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/graph',
      version: 'v0.1',
      description: {
        zh: 'Graph family 独立 Source composite、Definition registry、上下文解析与 Core lowering。',
        en: 'Independent Graph-family Source composites with Definition registries, context resolution, and Core lowering.',
      },
      highlights: [
        {
          label: { zh: '可组合 Graph context', en: 'Composable Graph context' },
          content: {
            zh: '`IRGraph` 是复用完整 Core Scope 公共面的可选薄壳，`children` 保持任意内容和作者顺序。Entity 与 Relation 可独立 lower 为 Core Node / Path；Group 提供可见包含边界。',
            en: '`IRGraph` is an optional shell over the complete Core Scope surface, preserving arbitrary children in author order. Entity and Relation independently lower to Core Node/Path, while Group provides a visible containment boundary.',
          },
        },
      ],
      subVersions: [...graphMilestones],
    },
    {
      pkg: '@retikz/graph-react',
      version: 'v0.1',
      description: {
        zh: 'Graph family 的独立 React authoring 入口，支持顶层 Scene 与任意 Core child 位置的局部组合。',
        en: 'Independent Graph-family React authoring entries for top-level Scenes and local composition at any Core-child position.',
      },
      highlights: [
        {
          label: { zh: '顶层与嵌入一致', en: 'Standalone and embedded parity' },
          content: {
            zh: '顶层 `<Graph>` 建立一个 Scene，嵌入 Layout 时只贡献局部 Scope；Group、Block family、Entity 与 Relation composite 都可以直接嵌入。',
            en: 'Top-level `<Graph>` creates one Scene, while Graph inside Layout contributes only a local Scope; Group, the Block family, Entity, and Relation composites embed directly.',
          },
        },
      ],
      subVersions: [...graphMilestones],
    },
    {
      pkg: '@retikz/graph-vanilla',
      version: 'v0.1',
      description: {
        zh: 'Graph family 的无框架 builder、InputEmbed adapter 与完整 provider closure。',
        en: 'Framework-free Graph-family builders, InputEmbed adapters, and complete provider closures.',
      },
      highlights: [
        {
          label: { zh: 'Graph family adapter 接线', en: 'Graph-family adapter wiring' },
          content: {
            zh: '每个独立 Graph family composite 使用对应 InputEmbed adapter；`createGraphVanillaAdapters()` 一次安装完整集合。adapter traversal id 只定位 authoring，不写入 Source identity。',
            en: 'Every independent Graph-family composite uses a matching InputEmbed adapter, and `createGraphVanillaAdapters()` installs the complete set. Adapter traversal ids locate authoring only and never enter Source identity.',
          },
        },
      ],
      subVersions: [...graphMilestones],
    },
  ],
};
