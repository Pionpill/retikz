import type { TFunction } from 'i18next';
import type { FC } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { coreSection } from '@/data/core';
import type { Section, SubPage } from '@/data/interface';
import { cn } from '@/lib/utils';

import { AppSidebarMenu } from './AppSidebarMenu';
import type { SidebarCategoryData, SidebarSubModuleData } from './interface';

const mapChildren = (t: TFunction, children?: Array<SubPage>): Array<SidebarSubModuleData> | undefined =>
  children?.map(child => ({
    value: child.id,
    label: t(child.label),
    children: mapChildren(t, child.children),
  }));

/** 按 :moduleId 选数据源；flow / plot 暂留空数组 */
const sectionsForModule = (moduleId: string | undefined): Array<Section> => {
  switch (moduleId) {
    case 'core':
      return coreSection;
    case 'flow':
    case 'plot':
    default:
      return [];
  }
};

export type AppSidebarProps = {
  /** 容器额外类（移动端 Sheet 复用本组件时关掉 sticky 等） */
  className?: string;
};

export const AppSidebar: FC<AppSidebarProps> = props => {
  const { className } = props;
  const { t, i18n } = useTranslation();
  const { moduleId } = useParams<'moduleId'>();
  const sections = sectionsForModule(moduleId);

  const categories = useMemo<Array<SidebarCategoryData>>(
    () =>
      sections.map(section => ({
        value: section.id,
        label: section.label ? t(section.label) : undefined,
        modules: section.pages.map(page => ({
          value: page.id,
          label: t(page.label),
          children: mapChildren(t, page.children),
        })),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.resolvedLanguage, sections],
  );

  return (
    <aside
      className={cn(
        'relative flex flex-col',
        !className &&
          [
            'sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[250px] shrink-0 lg:flex',
            'after:pointer-events-none after:absolute after:right-0 after:top-0 after:h-full after:w-px',
            'after:bg-border',
            'after:[mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)]',
          ].join(' '),
        className,
      )}
    >
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <AppSidebarMenu categories={categories} moduleId={moduleId ?? 'core'} />
      </div>
    </aside>
  );
};
