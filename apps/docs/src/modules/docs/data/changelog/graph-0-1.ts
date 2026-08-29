import type { Release, SubVersion } from '../types';

const graphMilestones: Array<SubVersion> = [
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
];

/** Graph v0.1 里程碑 */
export const graphV01: Release = {
  minor: 'v0.1',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/graph',
      version: 'v0.1',
      description: {
        zh: 'Graph、Group、Entity、Relation 四类独立 Source composite、Definition registry、上下文解析与 Core lowering。',
        en: 'Four independent Graph, Group, Entity, and Relation Source composites with Definition registries, context resolution, and Core lowering.',
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
        zh: 'Graph、Group、Entity、Relation 四个独立 React authoring 入口，支持顶层 Scene 与任意 Core child 位置的局部组合。',
        en: 'Four independent React authoring entries for Graph, Group, Entity, and Relation, supporting top-level Scenes and local composition at any Core-child position.',
      },
      highlights: [
        {
          label: { zh: '顶层与嵌入一致', en: 'Standalone and embedded parity' },
          content: {
            zh: '顶层 `<Graph>` 建立一个 Scene，嵌入 Layout 时只贡献局部 Scope；`<Group>`、`<Entity>` 与 `<Relation>` 可以直接嵌入。',
            en: 'Top-level `<Graph>` creates one Scene, while Graph inside Layout contributes only a local Scope; `<Group>`, `<Entity>`, and `<Relation>` embed directly.',
          },
        },
      ],
      subVersions: [...graphMilestones],
    },
    {
      pkg: '@retikz/graph-vanilla',
      version: 'v0.1',
      description: {
        zh: 'Graph、Group、Entity、Relation 四个无框架 builder、InputEmbed adapter 与完整 provider closure。',
        en: 'Four framework-free Graph, Group, Entity, and Relation builders, InputEmbed adapters, and complete provider closures.',
      },
      highlights: [
        {
          label: { zh: '四入口 adapter 接线', en: 'Four-entry adapter wiring' },
          content: {
            zh: '`graph()`、`group()`、`entity()`、`relation()` 分别使用对应 InputEmbed adapter；`createGraphVanillaAdapters()` 一次安装四者。adapter traversal id 只定位 authoring，不写入 Source identity。',
            en: '`graph()`, `group()`, `entity()`, and `relation()` use matching InputEmbed adapters, and `createGraphVanillaAdapters()` installs all four. Adapter traversal ids locate authoring only and never enter Source identity.',
          },
        },
      ],
      subVersions: [...graphMilestones],
    },
  ],
};
