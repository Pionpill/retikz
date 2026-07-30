import type { Dispatch, FC } from 'react';

import { Check, ChevronsUpDown, Languages, Moon, Settings2, SlidersHorizontal, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

import type { LanguageValue } from '../i18n/preferences';
import type { LabStateAction } from '../lab-state';

import i18n from '../i18n';
import { Language } from '../i18n/preferences';
import { LabActionType } from '../lab-state';
import { Theme, useThemeStore } from '../store';

/** Workspace 全局操作属性 */
export type WorkspaceSettingsProps = Readonly<{
  dispatch: Dispatch<LabStateAction>;
}>;

/** sidebar-07 左下角的语言、主题与详细配置入口 */
export const WorkspaceSettings: FC<WorkspaceSettingsProps> = props => {
  const { dispatch } = props;
  const { t } = useTranslation();
  const theme = useThemeStore(state => state.theme);
  const setTheme = useThemeStore(state => state.setTheme);
  const language: LanguageValue =
    i18n.resolvedLanguage?.startsWith(Language.English) === true ? Language.English : Language.Chinese;
  const changeLanguage = (nextLanguage: LanguageValue): void => {
    void i18n.changeLanguage(nextLanguage);
  };
  const themeLabel = theme === Theme.Light ? t('settings.light') : t('settings.dark');
  const languageLabel = language === Language.Chinese ? t('settings.chinese') : t('settings.english');
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              title={t('sidebar.settings')}
              className="h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                <Settings2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{t('sidebar.workspace')}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {languageLabel} · {themeLabel}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="z-[60] w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="right"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Languages className="size-3.5" />
              {t('settings.language')}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => changeLanguage(Language.Chinese)}>
                <span className="flex-1">{t('settings.chinese')}</span>
                {language === Language.Chinese ? <Check /> : null}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage(Language.English)}>
                <span className="flex-1">{t('settings.english')}</span>
                {language === Language.English ? <Check /> : null}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t('settings.theme')}</DropdownMenuLabel>
            <DropdownMenuGroup>
              {Object.values(Theme).map(value => {
                const Icon = value === Theme.Light ? Sun : Moon;
                return (
                  <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
                    <Icon />
                    <span className="flex-1">{t(value === Theme.Light ? 'settings.light' : 'settings.dark')}</span>
                    {theme === value ? <Check /> : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => dispatch({ type: LabActionType.DetailsOpened })}>
              <SlidersHorizontal />
              {t('sidebar.settings')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
