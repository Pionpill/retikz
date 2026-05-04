import type { FC } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Sidebar, SidebarContent } from '@/components/ui/sidebar';
import { coreSection } from '../../data/core';
import type { SubPage } from '../../data/interface';
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
 */
export const AppSidebar: FC = () => {
  const { t, i18n } = useTranslation();

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
      <AppSidebarHeader />
      <SidebarContent className="gap-0">
        <AppSidebarMenu categories={categories} />
      </SidebarContent>
      <AppSidebarFooter />
    </Sidebar>
  );
};
