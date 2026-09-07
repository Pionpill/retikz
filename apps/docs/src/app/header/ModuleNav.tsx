import type { LucideIcon } from 'lucide-react';
import type { FC } from 'react';

import {
  BlocksIcon,
  BoxesIcon,
  ChartColumnIncreasingIcon,
  ChartSplineIcon,
  DatabaseIcon,
  ImagesIcon,
  Layers3Icon,
  NetworkIcon,
  PackageIcon,
  PanelTopIcon,
  TableIcon,
  WorkflowIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';

import type { DocModuleId, I18nKey, Section } from '@/modules/docs/data';

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib';
import { getNavigationSectionsByArea, modules } from '@/modules/docs/data';
import { buildDocPath } from '@/modules/docs/layout';

import { HeaderNavigationContent } from './HeaderNavigationContent';
import { HeaderNavigationTrigger } from './HeaderNavigationTrigger';

export type ModuleNavProps = {
  /** 覆盖默认的桌面端显示类，用于移动端首页抽屉复用。 */
  className?: string;
  /** 移动端抽屉使用的纵向布局覆盖。 */
  mobile?: boolean;
  /** 点击模块入口后的关闭回调。 */
  onNavigate?: () => void;
  /** 是否只渲染导航项，用于嵌入统一的顶栏 NavigationMenu。 */
  withinNavigationMenu?: boolean;
};

const moduleSectionIcons: Record<DocModuleId, Record<string, LucideIcon>> = {
  kernel: {
    components: BlocksIcon,
    packages: PackageIcon,
    galleries: ImagesIcon,
  },
  library: {
    standard: Layers3Icon,
    layout: PanelTopIcon,
  },
  schematic: {
    graph: NetworkIcon,
    diagram: WorkflowIcon,
  },
  viz: {
    data: DatabaseIcon,
    chart: ChartColumnIncreasingIcon,
    table: TableIcon,
    plot: ChartSplineIcon,
  },
};

const getModuleSections = (moduleId: DocModuleId): Array<Section> =>
  getNavigationSectionsByArea(moduleId).filter(
    section => section.label && !(moduleId === 'kernel' && section.id === 'reference'),
  );

/** 顶栏水平模块入口。 */
export const ModuleNav: FC<ModuleNavProps> = props => {
  const { className, mobile = false, onNavigate, withinNavigationMenu = false } = props;
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const moduleId = pathname.split('/').filter(Boolean)[0];

  const items = modules.map(module => {
    const active = moduleId === module.id;

    if (mobile) {
      return (
        <NavigationMenuItem key={module.id} className="flex items-center">
          <NavigationMenuLink
            active={active}
            asChild
            className={cn(
              'h-8 rounded-md px-2.5 py-1.5 focus-visible:ring-0 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
              'w-full justify-start px-2 py-1.5',
              active && 'text-foreground',
            )}
          >
            <Link to={`/${module.id}`} onClick={onNavigate}>
              {t(module.navigationLabel)}
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      );
    }

    return (
      <NavigationMenuItem key={module.id} className="flex items-center">
        <HeaderNavigationTrigger
          className={cn(active && 'text-foreground')}
          onClick={event => {
            if (event.detail === 0) return;

            event.preventDefault();
            navigate(`/${module.id}`);
            onNavigate?.();
          }}
        >
          {t(module.navigationLabel)}
        </HeaderNavigationTrigger>
        <HeaderNavigationContent className="w-64">
          <div className="grid gap-1">
            {getModuleSections(module.id).map(section => {
              const Icon = section.id ? (moduleSectionIcons[module.id][section.id] ?? BoxesIcon) : BoxesIcon;
              const path = section.id ? buildDocPath(module.id, section.id, null) : `/${module.id}`;

              return (
                <NavigationMenuLink
                  key={section.id ?? section.label}
                  asChild
                  className="w-full flex-row items-start justify-start gap-3 rounded-md px-2.5 py-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                >
                  <Link to={path} data-module-nav-section={section.id} onClick={onNavigate}>
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{t(section.label as I18nKey)}</span>
                      {section.navigationDescription && (
                        <span
                          data-module-nav-description
                          className="mt-1 block text-sm leading-5 text-muted-foreground"
                        >
                          {t(section.navigationDescription)}
                        </span>
                      )}
                    </span>
                  </Link>
                </NavigationMenuLink>
              );
            })}
          </div>
        </HeaderNavigationContent>
      </NavigationMenuItem>
    );
  });

  if (withinNavigationMenu) return <>{items}</>;

  return (
    <NavigationMenu className={cn(mobile ? 'w-full max-w-none' : 'hidden lg:flex', className)}>
      <NavigationMenuList className={cn(mobile && 'w-full flex-col items-stretch gap-x-0 gap-y-1')}>
        {items}
      </NavigationMenuList>
    </NavigationMenu>
  );
};
