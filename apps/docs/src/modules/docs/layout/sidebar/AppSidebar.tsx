import type { FC } from 'react';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib';
import { getSectionsByArea } from '@/modules/docs/data';
import { useDocDifficultyStore } from '@/modules/docs/store';

import type { DocLocation } from '../types';

import { filterSectionsByDifficulty } from '../filter-doc-sections';
import { useDocLocation } from '../useDocLocation';
import { buildSidebarCategories } from '../utils';
import { AppSidebarMenu } from './AppSidebarMenu';

export type AppSidebarProps = {
  /** 容器额外类（移动端 Sheet 复用本组件时关掉 sticky 等） */
  className?: string;
  /** 点击具体文档入口后的回调 */
  onNavigate?: () => void;
  /** 当前完整文档位置；移动端从共享 pathname 上下文显式传入。 */
  location?: DocLocation | null;
};

export const AppSidebar: FC<AppSidebarProps> = props => {
  const { className, location: locationProp, onNavigate } = props;
  const { t } = useTranslation();
  const currentLocation = useDocLocation();
  const location = locationProp === undefined ? currentLocation : locationProp;
  const maximumDifficulty = useDocDifficultyStore(state => state.maximumDifficulty);
  const areaId = location?.moduleId;
  const sections = useMemo(() => (areaId ? getSectionsByArea(areaId) : []), [areaId]);
  const selectedSection = location
    ? location.sectionId
      ? sections.find(section => section.id === location.sectionId)
      : sections.find(section => !section.label)
    : undefined;
  const visibleSections = useMemo(
    () =>
      filterSectionsByDifficulty(
        areaId === 'about' ? sections : selectedSection ? [selectedSection] : [],
        maximumDifficulty,
      ),
    [areaId, maximumDifficulty, sections, selectedSection],
  );

  const categories = useMemo(
    () => (areaId ? buildSidebarCategories(t, areaId, visibleSections) : []),
    [areaId, t, visibleSections],
  );

  if (!location || !areaId || !selectedSection || categories.length === 0) return null;

  return (
    <aside
      className={cn(
        'relative flex flex-col',
        !className &&
          [
            'sticky top-14 hidden h-[calc(100vh-3.5rem)] w-55 shrink-0 lg:flex',
            'after:pointer-events-none after:absolute after:right-0 after:top-0 after:h-full after:w-px',
            'after:bg-border',
            'after:[mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)]',
          ].join(' '),
        className,
      )}
    >
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <AppSidebarMenu categories={categories} moduleId={areaId} scoped={areaId !== 'about'} onNavigate={onNavigate} />
      </div>
    </aside>
  );
};
