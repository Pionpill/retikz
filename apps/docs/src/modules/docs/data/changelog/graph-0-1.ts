import type { Release, SubVersion } from '../types';

const graphMilestones: Array<SubVersion> = [
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
    date: '2026-08-09',
    summary: {
      zh: '建立 Graph package family，以及 Graph、Group、Entity、Relation 的初始 authoring foundation。',
      en: 'Establishes the Graph package family and the initial Graph, Group, Entity, and Relation authoring foundation.',
    },
    items: [
      {
        label: { zh: 'Group 通用分组', en: 'General-purpose Group' },
        content: {
          zh: '新增 JSON-safe `IRGroup`、React `<Group>` 与 Vanilla `group()`。Group 接受任意 Core / Tier 2 child，复用 Standard Surface 外框、Layout caption 排列与 Core Node boundary labels；省略 label `align` 时使用 Core `start`，让默认下方左侧文字与外框左边缘对齐；不自动布局 children，也不拥有 routing 或碰撞处理。',
          en: 'Adds JSON-safe `IRGroup`, React `<Group>`, and Vanilla `group()`. Group accepts arbitrary Core / Tier 2 child and reuses Standard Surface, Layout caption arrangement, and Core Node boundary labels. Omitted label `align` uses Core `start`, making the default lower-left text begin at the shell edge; Group does not own child layout, routing, or collision handling.',
        },
      },
    ],
  },
];

/** Graph v0.1 开发中里程碑 */
export const graphV01: Release = {
  minor: 'v0.1',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/graph',
      version: 'v0.1',
      description: {
        zh: 'Graph、Group、Entity、Relation 四套独立 Source composite、Definition registry、上下文解析与 Core lowering。',
        en: 'Four independent Graph, Group, Entity, and Relation Source composites with Definition registries, context resolution, and Core lowering.',
      },
      highlights: [
        {
          label: { zh: '可组合 Graph context', en: 'Composable Graph context' },
          content: {
            zh: '`IRGraph` 是复用完整 Core Scope 公共面的可选薄壳，`children` 保持任意内容和作者顺序。Entity 与 Relation 可独立 lower 为 Core Node / Path；省略 authored `id` 时不生成 identity。',
            en: '`IRGraph` is an optional shell over the complete Core Scope surface, preserving arbitrary children in author order. Entity and Relation independently lower to Core Node / Path, and omitted authored `id` values do not generate identity.',
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
            zh: '顶层 `<Graph>` 建立一个 Scene，嵌入 Layout 时只贡献局部 Scope。`<Entity>` 与 `<Relation>` 可直接嵌入，并分别保留文本与 Step route authoring。',
            en: 'Top-level `<Graph>` creates one Scene, while Graph inside Layout contributes only a local Scope. `<Entity>` and `<Relation>` embed directly and retain text and Step-route authoring respectively.',
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
