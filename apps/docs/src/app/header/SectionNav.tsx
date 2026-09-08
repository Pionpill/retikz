import type { FC } from 'react';

import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import type { DocNavigationAreaId, I18nKey } from '@/modules/docs/data';

import { NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu';
import { cn } from '@/lib';
import { getNavigationSectionsByArea } from '@/modules/docs/data';
import { buildDocPath } from '@/modules/docs/layout';

export type SectionNavProps = {
  /** 当前 URL 所属 area，允许 home-owned About。 */
  areaId: DocNavigationAreaId;
  /** 当前 section；无分组页面时为 null。 */
  sectionId: string | null;
  /** 移动端点击入口后的关闭回调。 */
  onNavigate?: () => void;
  /** 移动端抽屉使用的纵向布局覆盖。 */
  mobile?: boolean;
  /** 是否只渲染平级导航项，用于嵌入统一的顶栏 NavigationMenu。 */
  withinNavigationMenu?: boolean;
};

const normalizePath = (value: string): string => (value.replace(/\/+$/, '') || '/').toLowerCase();

type SectionNavLink = {
  id: string;
  label: I18nKey;
  path: string;
  active: boolean;
};

/** 当前模块或 About area 的顶级 section / 无分组入口导航。 */
export const SectionNav: FC<SectionNavProps> = props => {
  const { areaId, sectionId, onNavigate, mobile = false, withinNavigationMenu = false } = props;
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const currentPath = normalizePath(pathname);
  const navigationSections = getNavigationSectionsByArea(areaId);
  const links: Array<SectionNavLink> = navigationSections.flatMap(section => {
    if (!section.label) {
      return section.pages.map(page => ({
        id: page.id,
        label: page.label,
        path: buildDocPath(areaId, null, page.id),
        active: currentPath === normalizePath(buildDocPath(areaId, null, page.id)),
      }));
    }

    if (!section.id) return [];
    return [
      {
        id: section.id,
        label: section.label,
        path: buildDocPath(areaId, section.id, null),
        active: sectionId === section.id,
      },
    ];
  });
  const linkClassName = (active: boolean): string =>
    cn(
      'inline-flex h-8 items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-0 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
      mobile && 'px-2 py-1.5',
      active && 'font-medium text-foreground',
    );

  if (withinNavigationMenu) {
    return (
      <>
        {links.map(link => (
          <NavigationMenuItem key={link.id} className="flex items-center">
            <NavigationMenuLink active={link.active} asChild className={linkClassName(link.active)}>
              <Link to={link.path} onClick={onNavigate}>
                {t(link.label)}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </>
    );
  }

  return (
    <nav
      aria-label={areaId === 'about' ? t('about.label') : t('docs.moduleNavigationLabel')}
      className={cn(mobile ? 'flex flex-col items-stretch gap-1' : 'hidden items-center gap-4 lg:flex')}
    >
      {links.map(link => (
        <Link
          key={link.id}
          to={link.path}
          data-active={link.active ? '' : undefined}
          onClick={onNavigate}
          className={linkClassName(link.active)}
        >
          {t(link.label)}
        </Link>
      ))}
    </nav>
  );
};
