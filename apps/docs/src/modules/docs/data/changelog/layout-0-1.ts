import type { Release } from '../types';

export const layoutV01: Release = {
  minor: 'v0.1',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/layout',
      version: 'v0.1',
      description: {
        zh: '领域无关的排版布局库：提供 Flex、Grid、Overlay 的 JSON-safe schema、确定性求解、类型化产物与可选检查能力。',
        en: 'Domain-neutral layout composition with JSON-safe Flex, Grid, and Overlay schemas, deterministic solving, typed artifacts, and optional inspection.',
      },
      highlights: [
        {
          label: { zh: '独立能力边界', en: 'Independent capability boundary' },
          content: {
            zh: 'Layout 只拥有容器排版、约束求解、placement、artifact 与 inspection；Core 继续拥有 proposal / probe / replay 和 Scene，算法布局仍在本包边界之外。',
            en: 'Layout owns container arrangement, constraint solving, placement, artifacts, and inspection. Core retains proposal, probe, replay, and Scene contracts, while algorithmic graph layout remains out of scope.',
          },
        },
        {
          label: { zh: '公共组合入口', en: 'Public composition entry' },
          content: {
            zh: '`@retikz/layout/compose` 让 Standard、Graph 与其它 Tier 2 owner 复用 canonical compiler 和稳定布局原子，不需要 deep import 或复制 solver。',
            en: '`@retikz/layout/compose` lets Standard, Graph, and other Tier 2 owners reuse canonical compilers and stable layout atoms without deep imports or copied solvers.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.3',
          date: '2026-10-08',
          summary: {
            zh: '发布组同步',
            en: 'Release-group alignment',
          },
          items: [
            {
              label: {
                zh: '发布组同步',
                en: 'Release-group alignment',
              },
              content: {
                zh: '随所属发布组同步发布，更新内部依赖及共享契约消费。',
                en: 'Released with its release group, aligning internal dependencies and shared contract consumption.',
              },
            },
          ],
        },
        {
          version: 'alpha.2',
          date: '2026-09-14',
          summary: {
            zh: '统一稀疏 Source 与领域解析，支持省略 LayoutItem key。',
            en: 'Unifies sparse Source and domain resolution and allows omitted LayoutItem keys.',
          },
          items: [
            {
              label: { zh: 'BREAKING：稀疏 Source', en: 'BREAKING: sparse Source' },
              content: {
                zh: '默认值在领域 resolve 中补全；factory、React 与 Vanilla 保留作者省略字段。LayoutItem key 可省略，有效 key 按容器内 Source 顺序确定且不写回 Source；显式重复 key 仍报错。',
                en: 'Defaults are completed during domain resolution; factories, React, and Vanilla preserve omitted author fields. LayoutItem keys may be omitted: effective keys follow container Source order without being written back. Duplicate explicit keys still fail.',
              },
            },
            {
              label: { zh: 'Node.js 22', en: 'Node.js 22' },
              content: {
                zh: '最低 Node.js 版本调整为 22.12.0。',
                en: 'The minimum Node.js version is now 22.12.0.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-08-28',
          summary: {
            zh: '从 Standard 迁入已验证的三类排版布局，切换为 `layout.*` identity，并建立根入口、`/compose` 与可选 `/inspect`。',
            en: 'Moves the three validated layout containers from Standard, adopts `layout.*` identities, and establishes root, `/compose`, and optional `/inspect` entries.',
          },
          items: [
            {
              label: { zh: 'BREAKING：包与命名空间迁移', en: 'BREAKING: package and namespace move' },
              content: {
                zh: 'FlexLayout、GridLayout、OverlayLayout、LayoutItem、artifact 与 Inspector 现由 `@retikz/layout` 提供，canonical identity 改为 `layout.flexLayout`、`layout.gridLayout`、`layout.overlayLayout`。Standard 不保留转发、别名或旧 namespace。',
                en: 'FlexLayout, GridLayout, OverlayLayout, LayoutItem, artifacts, and Inspectors now come from `@retikz/layout`. Canonical identities are `layout.flexLayout`, `layout.gridLayout`, and `layout.overlayLayout`; Standard keeps no re-exports, aliases, or old namespace.',
              },
            },
            {
              label: { zh: '行为等价迁移', en: 'Behavior-preserving migration' },
              content: {
                zh: '输入字段、默认值、求解、overflow / clip、typed artifact、Core Definition 注入与 renderer 输出保持既有契约；只调整 owner、依赖与公开入口。',
                en: 'Inputs, defaults, solving, overflow and clipping, typed artifacts, Core Definition injection, and renderer output retain their existing contracts; only ownership, dependencies, and public entries change.',
              },
            },
          ],
        },
      ],
    },
    {
      pkg: '@retikz/layout-vanilla',
      version: 'v0.1',
      description: {
        zh: 'Layout 的无框架 authoring：提供三类 builder、显式 adapter、全量便利目录与可选检查驱动。',
        en: 'Framework-free Layout authoring with three builders, explicit adapters, a convenience catalog, and optional inspection wiring.',
      },
      highlights: [],
      subVersions: [
        {
          version: 'alpha.3',
          date: '2026-10-08',
          summary: {
            zh: '发布组同步',
            en: 'Release-group alignment',
          },
          items: [
            {
              label: {
                zh: '发布组同步',
                en: 'Release-group alignment',
              },
              content: {
                zh: '随所属发布组同步发布，更新内部依赖及共享契约消费。',
                en: 'Released with its release group, aligning internal dependencies and shared contract consumption.',
              },
            },
          ],
        },
        {
          version: 'alpha.2',
          date: '2026-09-14',
          summary: {
            zh: '统一稀疏 Source 与领域解析，支持省略 LayoutItem key。',
            en: 'Unifies sparse Source and domain resolution and allows omitted LayoutItem keys.',
          },
          items: [
            {
              label: { zh: 'BREAKING：稀疏 Source', en: 'BREAKING: sparse Source' },
              content: {
                zh: '默认值在领域 resolve 中补全；factory、React 与 Vanilla 保留作者省略字段。LayoutItem key 可省略，有效 key 按容器内 Source 顺序确定且不写回 Source；显式重复 key 仍报错。',
                en: 'Defaults are completed during domain resolution; factories, React, and Vanilla preserve omitted author fields. LayoutItem keys may be omitted: effective keys follow container Source order without being written back. Duplicate explicit keys still fail.',
              },
            },
            {
              label: { zh: 'Node.js 22', en: 'Node.js 22' },
              content: {
                zh: '最低 Node.js 版本调整为 22.12.0。',
                en: 'The minimum Node.js version is now 22.12.0.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-08-28',
          items: [
            {
              label: { zh: 'Vanilla 接线', en: 'Vanilla wiring' },
              content: {
                zh: '`flexLayout()`、`gridLayout()`、`overlayLayout()` 与 `LayoutVanillaAdapters` 生成 canonical Layout IR；检查能力从 `@retikz/layout-vanilla/inspect` 按需加载。',
                en: '`flexLayout()`, `gridLayout()`, `overlayLayout()`, and `LayoutVanillaAdapters` produce canonical Layout IR. Inspection support loads on demand from `@retikz/layout-vanilla/inspect`.',
              },
            },
          ],
        },
      ],
    },
    {
      pkg: '@retikz/layout-react',
      version: 'v0.1',
      description: {
        zh: 'Layout 的 React authoring：提供 FlexLayout、GridLayout、OverlayLayout、各自的专属子项与可选 Inspector JSX。',
        en: 'React authoring for Layout with FlexLayout, GridLayout, OverlayLayout, their dedicated item components, and optional Inspector JSX.',
      },
      highlights: [
        {
          label: { zh: 'BREAKING：专属布局子项', en: 'BREAKING: dedicated layout items' },
          content: {
            zh: 'React 移除 LayoutItem / LayoutItemProps，改用 FlexLayoutItem、GridLayoutItem、OverlayLayoutItem 及对应 Props。将 LayoutItem kind="flex|grid|overlay" 替换为匹配组件并移除 kind；必须放在对应布局或 Inspect 容器下。Vanilla 与 JSON IR 继续保留 kind，布局求解、itemKey 和子内容语义不变。',
            en: 'React removes LayoutItem / LayoutItemProps in favor of FlexLayoutItem, GridLayoutItem, OverlayLayoutItem, and their Props. Replace LayoutItem kind="flex|grid|overlay" with the matching component and omit kind; place it under the corresponding layout or Inspect container. Vanilla and JSON IR keep kind, with solving, itemKey, and child-content semantics unchanged.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.3',
          date: '2026-10-08',
          summary: {
            zh: 'BREAKING：专属布局子项',
            en: 'BREAKING: dedicated layout items',
          },
          items: [
            {
              label: {
                zh: 'BREAKING：专属布局子项',
                en: 'BREAKING: dedicated layout items',
              },
              content: {
                zh: 'React 移除 LayoutItem / LayoutItemProps，改用 FlexLayoutItem、GridLayoutItem、OverlayLayoutItem 及对应 Props。将 LayoutItem kind="flex|grid|overlay" 替换为匹配组件并移除 kind；必须放在对应布局或 Inspect 容器下。Vanilla 与 JSON IR 继续保留 kind，布局求解、itemKey 和子内容语义不变。',
                en: 'React removes LayoutItem / LayoutItemProps in favor of FlexLayoutItem, GridLayoutItem, OverlayLayoutItem, and their Props. Replace LayoutItem kind="flex|grid|overlay" with the matching component and omit kind; place it under the corresponding layout or Inspect container. Vanilla and JSON IR keep kind, with solving, itemKey, and child-content semantics unchanged.',
              },
            },
          ],
        },
        {
          version: 'alpha.2',
          date: '2026-09-14',
          summary: {
            zh: '统一稀疏 Source 与领域解析，支持省略 LayoutItem key。',
            en: 'Unifies sparse Source and domain resolution and allows omitted LayoutItem keys.',
          },
          items: [
            {
              label: { zh: 'BREAKING：稀疏 Source', en: 'BREAKING: sparse Source' },
              content: {
                zh: '默认值在领域 resolve 中补全；factory、React 与 Vanilla 保留作者省略字段。LayoutItem key 可省略，有效 key 按容器内 Source 顺序确定且不写回 Source；显式重复 key 仍报错。',
                en: 'Defaults are completed during domain resolution; factories, React, and Vanilla preserve omitted author fields. LayoutItem keys may be omitted: effective keys follow container Source order without being written back. Duplicate explicit keys still fail.',
              },
            },
            {
              label: { zh: 'Node.js 22', en: 'Node.js 22' },
              content: {
                zh: '最低 Node.js 版本调整为 22.12.0。',
                en: 'The minimum Node.js version is now 22.12.0.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-08-28',
          items: [
            {
              label: { zh: 'React 接线', en: 'React wiring' },
              content: {
                zh: '布局组件在当前 React `Layout` 局部贡献同一 family definitions；`LayoutInspectLayout`、`LayoutInspectScope` 与 `InspectXxxLayout` 从可选 `/inspect` 入口提供。',
                en: 'Layout components contribute the same family Definitions locally to the current React `Layout`. `LayoutInspectLayout`, `LayoutInspectScope`, and `InspectXxxLayout` come from the optional `/inspect` entry.',
              },
            },
          ],
        },
      ],
    },
  ],
};
