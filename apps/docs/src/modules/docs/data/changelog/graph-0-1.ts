import type { Release } from '../types';

/** Graph v0.1 开发中里程碑 */
export const graphV01: Release = {
  minor: 'v0.1',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/graph',
      version: 'v0.1',
      description: {
        zh: 'Diagram 的宿主无关图式元素：提供 Schema、factory、Definition、lowering 与 artifact。',
        en: 'Host-neutral diagram graph with schemas, factories, Definitions, lowering, and artifacts.',
      },
      highlights: [
        {
          label: { zh: '统一 Graph owner', en: 'Unified Graph owner' },
          content: {
            zh: 'GraphFrame、GraphNode 与 GraphConnector 统一保留 `graph.*` canonical identity，再通过显式 Definition 下沉到 Core。',
            en: 'GraphFrame, GraphNode, and GraphConnector retain canonical `graph.*` identities and lower to Core through explicit Definitions.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.5',
          date: '2026-08-16',
          summary: {
            zh: '新增可选 Graph presentation root、开放 Entity role / variant Definition registry、Graph Theme token selector，以及 assembly-local provider 装配。',
            en: 'Adds the optional Graph presentation root, open Entity role and variant Definition registries, Graph Theme token selectors, and assembly-local provider wiring.',
          },
          items: [],
        },
        {
          version: 'alpha.3',
          date: '2026-08-10',
          summary: {
            zh: '⚠️ 撤回缺少真实场景验证的 Callout schema、factory、Definition 与公开导出，不保留兼容入口。',
            en: '⚠️ Removes the Callout schema, factory, Definition, and public exports because no real use case validates the contract; no compatibility entry remains.',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-08-09',
          summary: {
            zh: '基础单元与 GraphConnector 保留语义 IR 并轻量下沉；GraphConnector 统一复用 Core Path Step 与 Draw way。',
            en: 'Base units and GraphConnector retain semantic IR with lightweight lowering; GraphConnector reuses Core Path steps and Draw ways.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-08-09',
          summary: {
            zh: '建立 Graph 包族并迁移首批三个可复用图式元素；GraphNode 使用 Graph-owned `GraphNodeVariant`，并由 GraphFrame 提供可继承的默认变体。',
            en: 'Establishes the Graph package family and moves three reusable diagram elements; GraphNode uses the Graph-owned `GraphNodeVariant` vocabulary with inheritable defaults from GraphFrame.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/graph-react',
      version: 'v0.1',
      description: {
        zh: 'Graph 的 React authoring，以同一 canonical IR 连接 `@retikz/react` runtime。',
        en: 'React authoring for Graph, connected to the `@retikz/react` runtime through the same canonical IR.',
      },
      highlights: [
        {
          label: { zh: 'React JSX 入口', en: 'React JSX entry' },
          content: {
            zh: '提供 GraphFrame marker、基础单元与 GraphConnector；GraphConnector 支持 `<Step>` children 或 Draw `way`，并只贡献当前 Layout 使用的 Definition。',
            en: 'Provides GraphFrame markers, base units, and GraphConnector; GraphConnector accepts `<Step>` children or a Draw `way` and contributes only Definitions used by the current Layout.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.5',
          date: '2026-08-16',
          summary: {
            zh: '新增 `<Graph>` 多 children authoring 与四 adapter factory；配置后的 factory 可为一次 processing normalization 注入自定义 Graph definitions。',
            en: 'Adds multi-child `<Graph>` authoring and a four-adapter factory whose configured form injects custom Graph definitions into one processing normalization.',
          },
          items: [],
        },
        {
          version: 'alpha.3',
          date: '2026-08-10',
          summary: {
            zh: '⚠️ 删除 React `Callout` authoring 与运行时 Definition 接线，不提供替代组件或兼容别名。',
            en: '⚠️ Removes React `Callout` authoring and runtime Definition wiring without a replacement component or compatibility alias.',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-08-09',
          summary: {
            zh: 'GraphNode 与 GraphConnector JSX 统一生成 canonical Graph IR，并自动贡献各自的轻量 Definition。',
            en: 'GraphNode and GraphConnector JSX now produce canonical Graph IR and contribute their lightweight Definitions.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-08-09',
          summary: {
            zh: '建立 Graph React authoring，并提供一次性创建六个 adapter 的 factory，让逻辑节点 `variant` 与 GraphFrame 默认值沿同一 IR 路径传递。',
            en: 'Establishes Graph React authoring and adds a factory that creates three adapters so GraphNode `variant` and GraphFrame defaults share the same IR path.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/graph-vanilla',
      version: 'v0.1',
      description: {
        zh: 'Graph 的无框架 builder、adapter、SSR 与 mount authoring。',
        en: 'Framework-free Graph builders, adapters, SSR, and mount authoring.',
      },
      highlights: [
        {
          label: { zh: '显式 Vanilla 接线', en: 'Explicit Vanilla wiring' },
          content: {
            zh: '所有 builder 返回 embed；基础单元与 GraphConnector adapter 使用同 id Graph IR，并贡献各自的轻量 Definition。',
            en: 'Every builder returns an embed; base-unit and GraphConnector adapters use same-id Graph IR and contribute their lightweight Definitions.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.5',
          date: '2026-08-16',
          summary: {
            zh: '新增 `graph()`、`GraphInputEmbedAdapter` 与四 adapter factory，并让嵌套 children 共用同一组 configured providers。',
            en: 'Adds `graph()`, `GraphInputEmbedAdapter`, and a four-adapter factory while sharing one configured provider set across nested children.',
          },
          items: [],
        },
        {
          version: 'alpha.3',
          date: '2026-08-10',
          summary: {
            zh: '⚠️ 删除 Vanilla `callout` builder、adapter 与 namespace，不提供 fallback。',
            en: '⚠️ Removes the Vanilla `callout` builder, adapter, and namespace without a fallback.',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-08-09',
          summary: {
            zh: '补齐 GraphFrame、GraphNode 与 GraphConnector 的 adapter parity，并让 GraphConnector 同时接受 Step children 与 Draw way。',
            en: 'Completes adapter parity for all three Graph elements and lets GraphConnector accept either Step children or a Draw way.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-08-09',
          summary: {
            zh: '建立 Graph Vanilla authoring，并提供一次性创建六个 adapter 的 factory，保持逻辑节点 `variant` 与 React 路径的 lowering 等价。',
            en: 'Establishes Graph Vanilla authoring and adds a factory that creates three adapters while keeping GraphNode `variant` lowering equivalent to React.',
          },
          items: [],
        },
      ],
    },
  ],
};
