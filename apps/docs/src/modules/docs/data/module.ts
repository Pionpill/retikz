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
};

/** 文档站当前可切换的四个真实模块。 */
export const modules: ReadonlyArray<ModuleEntry> = [
  {
    id: 'kernel',
    label: 'kernel.label',
    navigationLabel: 'kernel.navigationLabel',
    navigationDescription: 'kernel.navigationDescription',
  },
  {
    id: 'library',
    label: 'library.label',
    navigationLabel: 'library.navigationLabel',
    navigationDescription: 'library.navigationDescription',
  },
  {
    id: 'schematic',
    label: 'schematic.label',
    navigationLabel: 'schematic.navigationLabel',
    navigationDescription: 'schematic.navigationDescription',
  },
  {
    id: 'viz',
    label: 'viz.label',
    navigationLabel: 'viz.navigationLabel',
    navigationDescription: 'viz.navigationDescription',
  },
];
