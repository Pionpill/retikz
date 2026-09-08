import type { DocModuleId, DocNavigationAreaId } from '@/modules/docs/data';

import { DOC_ABOUT_ID, isDocModuleId } from '@/modules/docs/data';

import type { DocLocation } from './types';

import { parseDocRoutePathname, resolveDocLocation } from './useDocLocation';

/** Header、移动端导航与 Sidebar 共用的 pathname 上下文。 */
export type DocNavigationContext = {
  /** 当前 URL 所属的 navigation area；首页没有 area。 */
  areaId: DocNavigationAreaId | null;
  /** 当前 URL 所属的真实模块；About 与首页为 null。 */
  moduleId: DocModuleId | null;
  /** 当前 section；模块主页与无分组页面为 null。 */
  sectionId: string | null;
  /** 当前真实文档页；首页与模块主页为 null。 */
  location: DocLocation | null;
};

const EMPTY_NAVIGATION_CONTEXT: DocNavigationContext = {
  areaId: null,
  moduleId: null,
  sectionId: null,
  location: null,
};

/** 将 pathname 解析为稳定的 Docs 导航上下文。 */
export const resolveDocNavigationContext = (pathname: string): DocNavigationContext => {
  const params = parseDocRoutePathname(pathname);
  const areaId = params.moduleId;
  if (!areaId || (!isDocModuleId(areaId) && areaId !== DOC_ABOUT_ID)) return EMPTY_NAVIGATION_CONTEXT;

  const location = resolveDocLocation(params);
  return {
    areaId,
    moduleId: isDocModuleId(areaId) ? areaId : null,
    sectionId: location?.sectionId ?? null,
    location,
  };
};
