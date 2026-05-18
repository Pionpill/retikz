import type { I18nKey } from "./interface";

export type ModuleEntry = {
  id: string;
  /** 模块名 i18n key */
  label: I18nKey;
};

/** 文档站当前可切换的子包列表（后续按模块新增条目） */
export const modules: Array<ModuleEntry> = [
  { id: 'core', label: 'core.label' },
  { id: 'blog', label: 'blog.label' },
  { id: 'about', label: 'about.label' },
];
