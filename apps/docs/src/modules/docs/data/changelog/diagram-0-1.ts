import type { Release, SubVersion } from '../types';

const diagramMilestones: Array<SubVersion> = [
  {
    version: 'alpha.1',
    date: '2026-08-30',
    summary: {
      zh: '首次发布 Diagram Foundation，建立完整图示的 Presentation、Frame、Theme 与固定区域装配基础。',
      en: 'First Diagram Foundation release with Presentation, Frame, Theme, and fixed-region assembly foundations for complete diagrams.',
    },
    items: [
      {
        label: { zh: '完整图示 Presentation', en: 'Complete-diagram Presentation' },
        content: {
          zh: '在 `@retikz/diagram` 内建立 JSON-safe Presentation，直接复用 Core TextBlock 与 Standard Legend。title、description、drawing child 与 legend 按固定逻辑槽位进入同一 renderer-neutral Scene；缺失区域不会生成空轨道、bounds 或 artifact。',
          en: 'Adds a JSON-safe private Presentation inside `@retikz/diagram`, reusing Core TextBlock and Standard Legend. Title, description, drawing child, and legend enter the same renderer-neutral Scene in fixed logical slots; missing regions create no empty tracks, bounds, or artifacts.',
        },
      },
      {
        label: { zh: 'Frame 与 Diagram Theme 基础', en: 'Frame and Diagram Theme foundation' },
        content: {
          zh: '建立 package-private Frame、Neutral baseline、同名 Diagram Theme style registry、三种独立 section gap 与 Legend 四边停靠规则。外壳复用 Standard Surface，区域排列复用 Layout Flex；Core effective Theme 先于 Diagram appearance resolve 生效。',
          en: 'Adds the package-private Frame, Neutral baseline, same-name Diagram Theme style registry, three independent section gaps, and four-side Legend docking rules. The shell reuses Standard Surface and region placement reuses Layout Flex; the effective Core Theme resolves before Diagram appearance.',
        },
      },
      {
        label: { zh: 'Alpha1 公共边界', en: 'Alpha1 public boundary' },
        content: {
          zh: 'Alpha1 不发布临时 Diagram root、FlowDiagram body、React / Vanilla authoring 或 Foundation symbols；三个 Diagram package root 保持空导出，FlowDiagram 与首个公开三入口 API 留待 alpha.2。',
          en: 'Alpha1 publishes no temporary Diagram root, FlowDiagram body, React/Vanilla authoring, or Foundation symbols. All three Diagram package roots remain empty; FlowDiagram and the first public three-entry API are deferred to alpha.2.',
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
        zh: '完整 Diagram 的 Foundation 装配、Frame / Theme 解析与 renderer-neutral 外壳基础。',
        en: 'Foundation assembly, Frame/Theme resolution, and renderer-neutral shell primitives for complete Diagrams.',
      },
      highlights: [],
      subVersions: [...diagramMilestones],
    },
    {
      pkg: '@retikz/diagram-react',
      version: 'v0.1',
      description: {
        zh: 'Diagram React 入口的发布占位，Alpha1 保持空壳并等待公开 FlowDiagram authoring 契约。',
        en: 'Release shell for the Diagram React entry; Alpha1 remains empty until the public FlowDiagram authoring contract exists.',
      },
      highlights: [],
      subVersions: [...diagramMilestones],
    },
    {
      pkg: '@retikz/diagram-vanilla',
      version: 'v0.1',
      description: {
        zh: 'Diagram Vanilla 入口的发布占位，Alpha1 保持空壳并等待公开 FlowDiagram authoring 契约。',
        en: 'Release shell for the Diagram Vanilla entry; Alpha1 remains empty until the public FlowDiagram authoring contract exists.',
      },
      highlights: [],
      subVersions: [...diagramMilestones],
    },
  ],
};
