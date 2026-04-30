import type { FC } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

/** 侧边栏头部：retikz 品牌块——点击回到根路由（默认页） */
export const AppSidebarHeader: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            title="retikz"
            onClick={() => navigate('/')}
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="truncate font-semibold">retikz · {t('common.versionTag')}</span>
              <span className="truncate text-xs opacity-60">{t('common.brandTagline')}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
};
