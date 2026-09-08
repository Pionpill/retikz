import type { I18nKey } from './types';

/** Docs 当前可切换的真实模块标识，顺序同时定义模块导航顺序。 */
export const DOC_MODULE_IDS = ['kernel', 'library', 'schematic', 'viz'] as const;

/** Docs 当前可切换的真实模块标识。 */
export type DocModuleId = (typeof DOC_MODULE_IDS)[number];

/** About 所属的 home-owned 导航 area 标识。 */
export const DOC_ABOUT_ID = 'about' as const;

/** 文档导航 area 标识，包含真实模块与 About 特殊 area。 */
export type DocNavigationAreaId = DocModuleId | typeof DOC_ABOUT_ID;

/** 用户可持久化的文档阅读 scope。 */
export type DocScopeId = 'home' | DocModuleId;

/** 判断字符串是否为真实 Docs 模块标识。 */
export const isDocModuleId = (value: string): value is DocModuleId =>
  DOC_MODULE_IDS.some(moduleId => moduleId === value);

/** 判断外部值是否为可持久化的 Docs scope。 */
export const isDocScopeId = (value: unknown): value is DocScopeId =>
  value === 'home' || (typeof value === 'string' && isDocModuleId(value));

export type ModuleEntry = {
  /** 真实模块标识。 */
  id: DocModuleId;
  /** 模块名 i18n key。 */
  label: I18nKey;
  /** 模块导航项的人类可读标签 i18n key。 */
  navigationLabel: I18nKey;
  /** 模块导航项的简短说明 i18n key。 */
  navigationDescription: I18nKey;
  /** 模块首页与 Header 共用的快捷入口。 */
  quickLinks: ReadonlyArray<ModuleQuickLink>;
};

/** 模块首页与 Header 共用的快捷入口。 */
export type ModuleQuickLink = {
  /** 显示文字的 i18n key。 */
  label: I18nKey;
  /** 入口目标地址。 */
  path: string;
  /** 首页中以主要操作样式展示。 */
  primary?: true;
};

/** 文档站当前可切换的四个真实模块。 */
export const modules: ReadonlyArray<ModuleEntry> = [
  {
    id: 'kernel',
    label: 'kernel.label',
    navigationLabel: 'kernel.navigationLabel',
    navigationDescription: 'kernel.navigationDescription',
    quickLinks: [
      { label: 'kernel.components', path: '/kernel/components/node/overview' },
      { label: 'kernel.gallery', path: '/kernel/galleries/karl-circle' },
    ],
  },
  {
    id: 'library',
    label: 'library.label',
    navigationLabel: 'library.navigationLabel',
    navigationDescription: 'library.navigationDescription',
    quickLinks: [
      { label: 'library.standard', path: '/library/standard/composite/grid', primary: true },
      { label: 'library.layout', path: '/library/layout/flex-layout' },
      { label: 'library.standardGrid', path: '/library/standard/composite/grid' },
      { label: 'library.standardSurface', path: '/library/standard/composite/surface' },
    ],
  },
  {
    id: 'schematic',
    label: 'schematic.label',
    navigationLabel: 'schematic.navigationLabel',
    navigationDescription: 'schematic.navigationDescription',
    quickLinks: [
      { label: 'schematic.graph', path: '/schematic/graph', primary: true },
      { label: 'schematic.diagram', path: '/schematic/diagram' },
    ],
  },
  {
    id: 'viz',
    label: 'viz.label',
    navigationLabel: 'viz.navigationLabel',
    navigationDescription: 'viz.navigationDescription',
    quickLinks: [
      { label: 'viz.data', path: '/viz/data' },
      { label: 'viz.chart', path: '/viz/chart' },
      { label: 'viz.table', path: '/viz/table' },
      { label: 'viz.drawingGrammar', path: '/viz/plot' },
    ],
  },
];
