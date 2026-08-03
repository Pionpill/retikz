import type { ReactNode } from 'react';

import type { I18nResources } from '@/i18n/locales';

/** 文档页的稳定内容类型。 */
export type DocPageType =
  | 'entry'
  | 'group'
  | 'concept'
  | 'architecture'
  | 'component'
  | 'extension'
  | 'package'
  | 'reference'
  | 'example'
  | 'release'
  | 'blog'
  | 'guide';

/** 文档页的主要读者。 */
export type DocAudience = 'user' | 'extension-author' | 'integrator' | 'maintainer';

/** 文档结论应回溯到的真源类别。 */
export type DocSourceOfTruth = 'docs' | 'schema' | 'runtime' | 'architecture' | 'changelog';

/** 文档页的阅读布局 */
export type DocLayoutVariant = 'article' | 'showcase';

/** Showcase 页在同类发现中的角色 */
export type ShowcaseRole = 'primary' | 'secondary';

/** Showcase 页之间的稳定关系元数据 */
export type ShowcaseMetadata = {
  /** 用于 Family 自动发现的稳定分组 */
  family: string;
  /** 是否进入 Family 的主要成员列表 */
  role: ShowcaseRole;
  /** 当前页的代表性 ComponentPreview 名称 */
  preview: string;
  /** Family 内的稳定展示顺序 */
  order: number;
};

/** 侧栏一级页面条目可声明的 Lucide 图标标识 */
export type DocSidebarIcon = 'chart-scatter';

/** 机器 manifest 使用的完整页面元数据。 */
export type DocPageMetadata = {
  pageType: DocPageType;
  audience: DocAudience;
  capability: string;
  sourceOfTruth: DocSourceOfTruth;
};

/** 导航节点只声明无法从路由稳定推导的元数据覆盖。 */
export type DocPageMetadataOverride = Partial<DocPageMetadata> & {
  /** 页面阅读布局；缺省沿用文章布局 */
  layout?: DocLayoutVariant;
  /** Showcase 布局的跨页面关系 */
  showcase?: ShowcaseMetadata;
};

/** 全部合法的 i18n 完整 key。 */
export type I18nKey = {
  [N in keyof I18nResources]: `${N & string}.${keyof I18nResources[N] & string}`;
}[keyof I18nResources];

type SubPageBase = {
  id: string;
  /** i18n 完整 key，调用方直接 t(label) */
  label: I18nKey;
  /** 生成机器文档时应用的显式元数据覆盖。 */
  meta?: DocPageMetadataOverride;
  /** 标题右侧的自定义元素（外链、徽章、操作按钮等），可选 */
  extra?: ReactNode;
};

/** 子页递归节点。 */
export type SubPage = (SubPageBase & { children?: never }) | (SubPageBase & { children: Array<SubPage> });

/** 一级页：可为 Showcase 等特殊入口声明侧栏图标 */
export type Page = SubPage & {
  /** 一级页面 label 左侧的 Lucide 图标 */
  icon?: DocSidebarIcon;
};

/** 顶层栏目分组。 */
export type Section = {
  id?: string;
  label?: I18nKey;
  /**
   * 分组自身是否拥有文档页。
   * @description 为 true 时 `/<module>/<section>` 渲染 `contents/<module>/<section>/index.<lang>.mdx`；未设置时保持旧行为，分组路径重定向到第一个子页面。
   */
  document?: true;
  pages: Array<Page>;
};

/** 双语文本:zh / en 各一份 markdown 字符串 */
export type Localized = { zh: string; en: string };

/** 一条变更:label 前缀 + markdown content,可嵌套 */
export type ChangeItem = {
  label: Localized;
  content: Localized;
  children?: Array<ChangeItem>;
};

/** 一个预发布 / patch */
export type SubVersion = {
  /** 'alpha.4' | 'rc.2' | 'beta.1' | '1'(patch)| 'rc.0-rc.3'(旧单包合并) */
  version: string;
  /** 'YYYY-MM-DD',git 推导 */
  date: string;
  /** 该预发布一句话定位(可选) */
  summary?: Localized;
  items: Array<ChangeItem>;
};

/** 一个包在某中版本里程碑下的整块内容 */
export type PackageBlock = {
  pkg: PackageId;
  /** 该包在此里程碑的中版本,如 'v0.2' */
  version: string;
  /** <=200 字符中版本级摘要 */
  description: Localized;
  /** 常驻精选(单独撰写,2-4 条) */
  highlights: Array<ChangeItem>;
  /** 逐预发布明细(默认收起) */
  subVersions: Array<SubVersion>;
};

/** 一个中版本里程碑 = 一个时间线节点 */
export type Release = {
  /** 'v0.2',时间线 key */
  minor: string;
  /** stable 发布日;null => 开发中 */
  stableDate: string | null;
  packages: Array<PackageBlock>;
};

/** 全部可能的包标识(筛选 chips 由数据中实际出现者派生) */
export const PACKAGE_IDS = [
  '@retikz/math',
  '@retikz/runtime',
  '@retikz/core',
  '@retikz/render',
  '@retikz/react',
  '@retikz/vanilla',
  '@retikz/tex',
  '@retikz/data',
  '@retikz/plot',
  '@retikz/plot-react',
  '@retikz/plot-vanilla',
  '@retikz/table',
  '@retikz/table-react',
  '@retikz/table-vanilla',
  '@retikz/standard',
  '@retikz/standard-react',
  '@retikz/standard-vanilla',
  'docs',
] as const;
export type PackageId = (typeof PACKAGE_IDS)[number];

/** 包标识 -> 展示名(多数包名两语一致,docs 例外) */
export const PACKAGE_LABEL: Record<PackageId, Localized> = {
  '@retikz/math': { zh: '@retikz/math', en: '@retikz/math' },
  '@retikz/runtime': { zh: '@retikz/runtime', en: '@retikz/runtime' },
  '@retikz/core': { zh: '@retikz/core', en: '@retikz/core' },
  '@retikz/render': { zh: '@retikz/render', en: '@retikz/render' },
  '@retikz/react': { zh: '@retikz/react', en: '@retikz/react' },
  '@retikz/vanilla': { zh: '@retikz/vanilla', en: '@retikz/vanilla' },
  '@retikz/tex': { zh: '@retikz/tex', en: '@retikz/tex' },
  '@retikz/data': { zh: '@retikz/data', en: '@retikz/data' },
  '@retikz/plot': { zh: '@retikz/plot', en: '@retikz/plot' },
  '@retikz/plot-react': { zh: '@retikz/plot-react', en: '@retikz/plot-react' },
  '@retikz/plot-vanilla': { zh: '@retikz/plot-vanilla', en: '@retikz/plot-vanilla' },
  '@retikz/table': { zh: '@retikz/table', en: '@retikz/table' },
  '@retikz/table-react': { zh: '@retikz/table-react', en: '@retikz/table-react' },
  '@retikz/table-vanilla': { zh: '@retikz/table-vanilla', en: '@retikz/table-vanilla' },
  '@retikz/standard': { zh: '@retikz/standard', en: '@retikz/standard' },
  '@retikz/standard-react': { zh: '@retikz/standard-react', en: '@retikz/standard-react' },
  '@retikz/standard-vanilla': { zh: '@retikz/standard-vanilla', en: '@retikz/standard-vanilla' },
  docs: { zh: '文档站', en: 'Docs' },
};

/** 包的类别分组：kernel 基础设施 / standard 绘图库 / viz 可视化层 / other；用于映射模块 changelog 切片 */
export type PackageGroup = {
  id: 'kernel' | 'standard' | 'viz' | 'other';
  /** 该组按序包含的包标识 */
  members: ReadonlyArray<PackageId>;
};
export const PACKAGE_GROUPS: ReadonlyArray<PackageGroup> = [
  {
    id: 'kernel',
    members: [
      '@retikz/math',
      '@retikz/runtime',
      '@retikz/core',
      '@retikz/render',
      '@retikz/react',
      '@retikz/vanilla',
      '@retikz/tex',
    ],
  },
  {
    id: 'standard',
    members: ['@retikz/standard', '@retikz/standard-react', '@retikz/standard-vanilla'],
  },
  {
    id: 'viz',
    members: [
      '@retikz/data',
      '@retikz/plot',
      '@retikz/plot-react',
      '@retikz/plot-vanilla',
      '@retikz/table',
      '@retikz/table-react',
      '@retikz/table-vanilla',
    ],
  },
  { id: 'other', members: ['docs'] },
];
