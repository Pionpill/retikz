import type { Release } from '../types';

/** Notation v0.1 开发中里程碑 */
export const notationV01: Release = {
  minor: 'v0.1',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/notation',
      version: 'v0.1',
      description: {
        zh: 'Diagram 的宿主无关图式元素：提供 Schema、factory、Definition、lowering 与 artifact。',
        en: 'Host-neutral diagram notation with schemas, factories, Definitions, lowering, and artifacts.',
      },
      highlights: [
        {
          label: { zh: '统一 Notation owner', en: 'Unified Notation owner' },
          content: {
            zh: 'LogicFrame、四种基础单元与 Connector 统一保留 `notation.*` canonical identity，再通过显式 Definition 下沉到 Core。',
            en: 'LogicFrame, four base units, and Connector retain canonical `notation.*` identities and lower to Core through explicit Definitions.',
          },
        },
      ],
      subVersions: [
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
            zh: '基础单元与 Connector 保留语义 IR 并轻量下沉；Connector 统一复用 Core Path Step 与 Draw way。',
            en: 'Base units and Connector retain semantic IR with lightweight lowering; Connector reuses Core Path steps and Draw ways.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-08-09',
          summary: {
            zh: '建立 Notation 包族并迁移首批六个可复用图式元素；逻辑单元使用 Notation-owned `LogicUnitVariant`，并由 LogicFrame 提供可继承的默认变体。',
            en: 'Establishes the Notation package family and moves six reusable diagram elements; logic units use the Notation-owned `LogicUnitVariant` vocabulary with inheritable defaults from LogicFrame.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/notation-react',
      version: 'v0.1',
      description: {
        zh: 'Notation 的 React authoring，以同一 canonical IR 连接 `@retikz/react` runtime。',
        en: 'React authoring for Notation, connected to the `@retikz/react` runtime through the same canonical IR.',
      },
      highlights: [
        {
          label: { zh: 'React JSX 入口', en: 'React JSX entry' },
          content: {
            zh: '提供 LogicFrame marker、基础单元与 Connector；Connector 支持 `<Step>` children 或 Draw `way`，并只贡献当前 Layout 使用的 Definition。',
            en: 'Provides LogicFrame markers, base units, and Connector; Connector accepts `<Step>` children or a Draw `way` and contributes only Definitions used by the current Layout.',
          },
        },
      ],
      subVersions: [
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
            zh: '基础单元与 Connector JSX 统一生成 canonical Notation IR，并自动贡献各自的轻量 Definition。',
            en: 'Base-unit and Connector JSX now produce canonical Notation IR and contribute their lightweight Definitions.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-08-09',
          summary: {
            zh: '建立 Notation React authoring，并提供一次性创建六个 adapter 的 factory，让逻辑单元 `variant` 与 LogicFrame 默认值沿同一 IR 路径传递。',
            en: 'Establishes Notation React authoring and adds a factory that creates all six adapters so logic-unit `variant` and LogicFrame defaults share the same IR path.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/notation-vanilla',
      version: 'v0.1',
      description: {
        zh: 'Notation 的无框架 builder、adapter、SSR 与 mount authoring。',
        en: 'Framework-free Notation builders, adapters, SSR, and mount authoring.',
      },
      highlights: [
        {
          label: { zh: '显式 Vanilla 接线', en: 'Explicit Vanilla wiring' },
          content: {
            zh: '所有 builder 返回 embed；基础单元与 Connector adapter 使用同 id Notation IR，并贡献各自的轻量 Definition。',
            en: 'Every builder returns an embed; base-unit and Connector adapters use same-id Notation IR and contribute their lightweight Definitions.',
          },
        },
      ],
      subVersions: [
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
            zh: '补齐七类元素的 adapter parity，并让 Connector 同时接受 Step children 与 Draw way。',
            en: 'Completes adapter parity for all seven elements and lets Connector accept either Step children or a Draw way.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-08-09',
          summary: {
            zh: '建立 Notation Vanilla authoring，并提供一次性创建六个 adapter 的 factory，保持逻辑单元 `variant` 与 React 路径的 lowering 等价。',
            en: 'Establishes Notation Vanilla authoring and adds a factory that creates all six adapters while keeping logic-unit `variant` lowering equivalent to React.',
          },
          items: [],
        },
      ],
    },
  ],
};
