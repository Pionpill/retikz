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
            zh: 'LogicFrame、四种语义 Node、Connector 与 Callout 迁入 `notation.*` canonical namespace；Standard 不保留兼容导出。',
            en: 'LogicFrame, four semantic Nodes, Connector, and Callout move to the `notation.*` canonical namespace with no compatibility exports in Standard.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-08-09',
          summary: {
            zh: '建立 Notation 包族并迁移首批七个可复用图式元素。',
            en: 'Establishes the Notation package family and moves its first seven reusable diagram elements.',
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
            zh: '提供 LogicFrame marker、语义单元、Connector 与 Callout，并只在当前 Layout 贡献实际需要的 Definition。',
            en: 'Provides LogicFrame markers, semantic units, Connector, and Callout while contributing only the Definitions used by the current Layout.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-08-09',
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
            zh: '语义 builder 直接返回 Core Node；LogicFrame、Connector 与 Callout 通过独立 adapter 贡献 Definition。',
            en: 'Semantic builders return Core Nodes directly, while dedicated adapters contribute Definitions for LogicFrame, Connector, and Callout.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-08-09',
          items: [],
        },
      ],
    },
  ],
};
