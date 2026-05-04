import type { TFunction } from 'i18next';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Sidebar, SidebarContent } from '@/components/ui/sidebar';
import { coreSection } from '../../data/core';
import type { SubPage } from '../../data/interface';
import { modules } from '../../data/module';
import { AppSidebarFooter } from './AppSidebarFooter';
import { AppSidebarHeader } from './AppSidebarHeader';
import { AppSidebarMenu } from './AppSidebarMenu';
import type { SidebarCategoryData, SidebarSubModuleData } from './interface';

/** 递归把 SubPage[] 翻译并适配成 SidebarSubModuleData[] */
const mapChildren = (
  t: TFunction,
  children?: Array<SubPage>,
): Array<SidebarSubModuleData> | undefined =>
  children?.map(child => ({
    value: child.id,
    label: t(child.label),
    children: mapChildren(t, child.children),
  }));

/**
 * 单层 Sidebar 主体。
 * 把数据层的"包 + 页面"结构 + i18n 适配成 SidebarCategoryData，
 * 一份数据、两层视图（label = i18n 文案 / value = URL 路径段）。
 *
 * activeModuleId 由路由的 :moduleId 段初始化（不在则回退到 modules[0]），
 * 用 useState 保持，下拉切换时本地更新；之后接每模块独立数据时用它选数据源。
 */
export const AppSidebar: FC = () => {
  const { t, i18n } = useTranslation();
  const { moduleId } = useParams<'moduleId'>();
  const [activeModuleId, setActiveModuleId] = useState<string>(() =>
    moduleId && modules.some(m => m.id === moduleId) ? moduleId : modules[0].id,
  );

  const categories = useMemo<Array<SidebarCategoryData>>(
    () =>
      coreSection.map(section => ({
        value: section.id,
        label: section.label ? t(section.label) : undefined,
        modules: section.pages.map(page => ({
          value: page.id,
          label: t(page.label),
          Icon: page.icon,
          children: mapChildren(t, page.children),
        })),
      })),
    // resolvedLanguage 切换时重新算一次 label
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.resolvedLanguage],
  );

  return (
    <Sidebar collapsible="icon" className="overflow-hidden">
      <AppSidebarHeader activeId={activeModuleId} onActiveIdChange={setActiveModuleId} />
      <SidebarContent className="gap-0">
        <AppSidebarMenu categories={categories} moduleId={activeModuleId} />
      </SidebarContent>
      <AppSidebarFooter />
    </Sidebar>
  );
};
