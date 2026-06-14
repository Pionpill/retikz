import type { I18nKey } from "./interface";

export type ModuleEntry = {
  id: string;
  /** 模块名 i18n key */
  label: I18nKey;
  /** 该模块对应 npm 包的版本徽章（如 `v0.3 beta`）；只有发独立包的模块（core / plot）才有，blog / about 无 */
  version?: string;
};

/** 文档站当前可切换的子包列表（后续按模块新增条目） */
export const modules: Array<ModuleEntry> = [
  { id: 'core', label: 'core.label', version: 'v0.4 alpha' },
  { id: 'plot', label: 'plot.label', version: 'v0.1 alpha' },
  { id: 'blog', label: 'blog.label' },
  { id: 'about', label: 'about.label' },
];

/** 按 URL 首段解析当前所在模块；非模块路由（首页等）返回 undefined */
export const resolveModule = (pathname: string): ModuleEntry | undefined => {
  const first = pathname.split('/').filter(Boolean)[0];
  return modules.find(m => m.id === first);
};
