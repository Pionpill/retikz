import type { Release, SubVersion } from '../types';

const diagramMilestones: Array<SubVersion> = [
  {
    version: 'alpha.1',
    date: '2026-08-31',
    summary: {
      zh: '首次发布 Diagram package family，以 LLM-first Flow Source、自动分层布局和 renderer-neutral artifact 完成站点逻辑图闭环。',
      en: 'First Diagram package-family release, completing site logic diagrams with an LLM-first Flow Source, automatic layered layout, and renderer-neutral artifacts.',
    },
    items: [
      {
        label: { zh: '平级 JSON Source', en: 'Flat JSON Source' },
        content: {
          zh: '`IRFlowDiagram` 使用平级 `entities` / `groups` / `layouts` catalog，根、Group 与 Layout 的 `children` id 列表是唯一包含事实。数组已表达声明类别，因此记录不重复保存元素 `type`，Group 也不再携带变体 `kind`。这是 breaking 变更：旧递归 `elements`、Group `kind` 与 element `type` 不提供兼容入口。',
          en: '`IRFlowDiagram` uses flat `entities` / `groups` / `layouts` catalogs, with root, Group, and Layout `children` id lists as the only containment fact. The catalogs already identify declaration categories, so records repeat neither element `type` nor a Group variant `kind`. This is a breaking change: old recursive `elements`, Group `kind`, and element `type` have no compatibility entry.',
        },
      },
      {
        label: { zh: '统一主题与布局扩展', en: 'Unified theme and layout extensions' },
        content: {
          zh: '扁平 `flowThemeTokens`、结构化 `flowTheme` 与单项 style / layout 形成确定的覆盖链。内置 `layered` 与自定义同步 Layout Definition 经过同一 registry、catalog、capability preflight 和输出校验；同名 Graph Theme 提供 Entity、Relation 与 Group 的 reference 外观，Flow Theme 只保留显式 Flow 投影与布局覆盖。',
          en: 'Flat `flowThemeTokens`, structured `flowTheme`, and per-item style/layout values form one deterministic cascade. The built-in `layered` layout and custom synchronous Layout Definitions share one registry, catalog, capability preflight, and output validation path. The same-name Graph Theme supplies reference Entity, Relation, and Group appearance, while Flow Theme retains only explicit Flow projection and layout overrides.',
        },
      },
      {
        label: { zh: '自动布局、固定排列与路由', en: 'Automatic layout, fixed placement, and routing' },
        content: {
          zh: '`layered` 支持四个主方向、显式 rank、cycle、parallel relation、递归 scope、跨 scope relation、可见 Group endpoint，以及 straight / rounded orthogonal routing。独立 `FlowLayout` 复用 Flex compiler，以 `direction`、`gap` 与 `align` 固定排列 direct children；它没有 Graph shell，也不能成为 endpoint。',
          en: '`layered` supports four primary directions, explicit ranks, recursive scopes, cycles, parallel and cross-scope relations, visible Group endpoints, and straight or rounded orthogonal routing. Independent `FlowLayout` records reuse the Flex compiler to fix direct-child placement through `direction`, `gap`, and `align`; they have no Graph shell and cannot be endpoints.',
        },
      },
      {
        label: { zh: '可诊断结果与三入口等价', en: 'Diagnosable results and entry parity' },
        content: {
          zh: 'compile 返回 `entity | group | layout` 递归 element bounds、按 Source 顺序对齐的 relation routes、label reservation、Foundation regions 与真实 spatial handles；Layout 使用独立 `layout` artifact kind 与 handle role。Direct IR、平级 Vanilla 与嵌套 React JSX 最终逐字段归一为同一 Source。',
          en: 'Compilation returns recursive `entity | group | layout` element bounds, relation routes aligned by Source order, label reservations, Foundation regions, and real spatial handles. Layouts use an independent `layout` artifact kind and handle role. Direct IR, flat Vanilla input, and nested React JSX normalize field-for-field into the same Source.',
        },
      },
    ],
  },
];

/** Diagram v0.1 里程碑 */
export const diagramV01: Release = {
  minor: 'v0.1',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/diagram',
      version: 'v0.1',
      description: {
        zh: 'LLM-first Flow Source、Definition registry、自动布局 / 路由、Graph materialization 与 renderer-neutral artifact。',
        en: 'LLM-first Flow Sources, Definition registries, automatic layout/routing, Graph materialization, and renderer-neutral artifacts.',
      },
      highlights: [
        {
          label: { zh: '站点逻辑图闭环', en: 'Site logic-diagram closure' },
          content: {
            zh: '`FlowDiagramSchema`、Flow Theme / Layout Definitions、内置 `layered`、单次编排与 artifact 组成同一 `/flow` 公共入口，可从关系、分组与少量约束确定性推导完整图。',
            en: '`FlowDiagramSchema`, Flow Theme/Layout Definitions, built-in `layered`, single-pass orchestration, and artifacts share one `/flow` public entry and deterministically derive a complete diagram from relations, groups, and a small set of constraints.',
          },
        },
      ],
      subVersions: [...diagramMilestones],
    },
    {
      pkg: '@retikz/diagram-react',
      version: 'v0.1',
      description: {
        zh: 'FlowDiagram 的 React authoring 入口，提供 standalone host 与 embedded composite。',
        en: 'React authoring for FlowDiagram with standalone-host and embedded-composite modes.',
      },
      highlights: [
        {
          label: { zh: '声明式 Flow 组件', en: 'Declarative Flow components' },
          content: {
            zh: '`FlowDiagram`、单项 `FlowEntity` / `FlowRelation`、可追加或用 `complete` 声明完整清单的 `FlowEntities` / `FlowRelations`、`FlowGroup` 与 `FlowLayout` 归一化为同一 Source；standalone 复用 Layout host，embedded 只贡献 composite。',
            en: '`FlowDiagram`, individual `FlowEntity` / `FlowRelation`, additive or `complete` `FlowEntities` / `FlowRelations` lists, `FlowGroup`, and `FlowLayout` normalize into the same Source; standalone mode reuses the Layout host while embedded mode contributes only a composite.',
          },
        },
      ],
      subVersions: [...diagramMilestones],
    },
    {
      pkg: '@retikz/diagram-vanilla',
      version: 'v0.1',
      description: {
        zh: 'FlowDiagram 的无框架 builder、normalize 与 InputEmbed adapter。',
        en: 'Framework-free FlowDiagram builders, normalization, and InputEmbed adapters.',
      },
      highlights: [
        {
          label: { zh: 'Vanilla 与 Direct IR 同源', en: 'Vanilla and Direct IR share one source' },
          content: {
            zh: '`flowDiagram()` 与 `FlowDiagramInputEmbedAdapter` 只组装 `IRFlowDiagram` 并复用 Diagram provider contribution，不在 adapter 中维护布局、测量、主题或 catalog。',
            en: '`flowDiagram()` and `FlowDiagramInputEmbedAdapter` only assemble `IRFlowDiagram` and reuse the Diagram provider contribution, keeping layout, measurement, themes, and catalogs out of the adapter.',
          },
        },
      ],
      subVersions: [...diagramMilestones],
    },
  ],
};
