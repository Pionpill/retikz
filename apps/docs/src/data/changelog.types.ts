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
  /** 'alpha.4' | 'rc.2' | 'beta.1' | '1'(patch)| 'rc.0–rc.3'(旧单包合并) */
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
  /** ≤200 字符中版本级摘要 */
  description: Localized;
  /** 常驻精选(单独撰写,2–4 条) */
  highlights: Array<ChangeItem>;
  /** 逐预发布明细(默认收起) */
  subVersions: Array<SubVersion>;
};

/** 一个中版本里程碑 = 一个时间线节点 */
export type Release = {
  /** 'v0.2',时间线 key */
  minor: string;
  /** stable 发布日;null ⇒ 开发中 */
  stableDate: string | null;
  packages: Array<PackageBlock>;
};

/** 全部可能的包标识(筛选 chips 由数据中实际出现者派生) */
export const PACKAGE_IDS = [
  '@retikz/core',
  '@retikz/render',
  '@retikz/react',
  '@retikz/vanilla',
  '@retikz/plot',
  '@retikz/plot-react',
  '@retikz/plot-vanilla',
  'docs',
] as const;
export type PackageId = (typeof PACKAGE_IDS)[number];

/** 包标识 → 展示名(多数包名两语一致,docs 例外) */
export const PACKAGE_LABEL: Record<PackageId, Localized> = {
  '@retikz/core': { zh: '@retikz/core', en: '@retikz/core' },
  '@retikz/render': { zh: '@retikz/render', en: '@retikz/render' },
  '@retikz/react': { zh: '@retikz/react', en: '@retikz/react' },
  '@retikz/vanilla': { zh: '@retikz/vanilla', en: '@retikz/vanilla' },
  '@retikz/plot': { zh: '@retikz/plot', en: '@retikz/plot' },
  '@retikz/plot-react': { zh: '@retikz/plot-react', en: '@retikz/plot-react' },
  '@retikz/plot-vanilla': { zh: '@retikz/plot-vanilla', en: '@retikz/plot-vanilla' },
  docs: { zh: '文档站', en: 'Docs' },
};

/** 筛选 chips 的类别分组:core 基础设施 / plot 图表层 / other（文档站等非 npm 包） */
export type PackageGroup = {
  /** i18n key 后缀(changelog.group<Id 首字母大写>) */
  id: 'core' | 'plot' | 'other';
  /** 该组按序包含的包标识 */
  members: ReadonlyArray<PackageId>;
};
export const PACKAGE_GROUPS: ReadonlyArray<PackageGroup> = [
  { id: 'core', members: ['@retikz/core', '@retikz/render', '@retikz/react', '@retikz/vanilla'] },
  { id: 'plot', members: ['@retikz/plot', '@retikz/plot-react', '@retikz/plot-vanilla'] },
  { id: 'other', members: ['docs'] },
];
