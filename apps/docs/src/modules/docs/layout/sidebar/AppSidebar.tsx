import type { FC } from 'react';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { cn } from '@/lib';
import { getSectionsByModule } from '@/modules/docs/data';

import { buildSidebarCategories } from '../utils';
import { AppSidebarMenu } from './AppSidebarMenu';

export type AppSidebarProps = {
  /** 容器额外类（移动端 Sheet 复用本组件时关掉 sticky 等） */
  className?: string;
  /** 点击具体文档入口后的回调 */
  onNavigate?: () => void;
  /**
   * 显式指定模块 id
   * @description MobileNav 渲染在 `<Routes>` 外（Header 里）useParams 拿不到 :moduleId，需调用方从 pathname 解出来传进；桌面 DocLayout 走 Routes，缺省即可
   */
  moduleId?: string;
};

export const AppSidebar: FC<AppSidebarProps> = props => {
  const { className, moduleId: moduleIdProp, onNavigate } = props;
  const { t } = useTranslation();
  const params = useParams<'moduleId'>();
  const moduleId = moduleIdProp ?? params.moduleId;
  const resolvedModuleId = moduleId ?? 'core';
  const sections = getSectionsByModule(resolvedModuleId);

  const categories = useMemo(
    () => buildSidebarCategories(t, resolvedModuleId, sections),
    [t, resolvedModuleId, sections],
  );

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
        <AppSidebarMenu categories={categories} moduleId={resolvedModuleId} onNavigate={onNavigate} />
      </div>
    </aside>
  );
};
