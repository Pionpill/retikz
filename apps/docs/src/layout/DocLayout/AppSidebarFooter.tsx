import type { FC } from 'react';
import { ExternalLink, Languages, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { LANGS, type Lang } from '../../i18n';
import { useThemeStore } from '../../store/useThemeStore';

/** 侧边栏底部：主题切换 / 语言切换 / GitHub 外链 */
export const AppSidebarFooter: FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useThemeStore(s => s.theme);
  const setTheme = useThemeStore(s => s.setTheme);

  const themeLabel = theme === 'light' ? t('common.themeLight') : t('common.themeDark');
  const ThemeIcon = theme === 'light' ? Sun : Moon;

  const cycleLang = () => {
    const idx = LANGS.indexOf(i18n.resolvedLanguage as Lang);
    const next = LANGS[(idx + 1) % LANGS.length];
    void i18n.changeLanguage(next);
  };

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={themeLabel}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            <ThemeIcon />
            <span>{themeLabel}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={`${t('common.switchLanguage')} · ${i18n.resolvedLanguage?.toUpperCase()}`}
            onClick={cycleLang}
          >
            <Languages />
            <span>
              {t('common.switchLanguage')} · {i18n.resolvedLanguage?.toUpperCase()}
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={t('common.github')}>
            <a href="https://github.com/Pionpill/retikz" target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              <span>{t('common.github')}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
};
