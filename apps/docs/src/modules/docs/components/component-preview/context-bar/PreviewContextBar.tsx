import { Monitor, Moon, Sun } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Lang } from '@/i18n';
import { cn } from '@/lib';

import type { PreviewThemeName } from '../theme';
import { PreviewTheme } from '../theme';
import type { PreviewFigureType, PreviewThemeMode, PreviewThemeSelection } from '../types';
import { FigureGuideButton } from './FigureGuideButton';
import { ThemeSwitchButton } from './ThemeSwitchButton';

export type PreviewContextBarProps = {
  /** 将主题工具放在常显工具栏中 */
  inline?: boolean;
  /** 仅显示主题图标，名称保留在悬停提示中 */
  iconOnly?: boolean;
  /** 当前预览使用的局部主题 */
  themeMode: PreviewThemeMode;
  /** 更新局部主题 */
  onThemeModeChange: (themeMode: PreviewThemeMode) => void;
  /** 叙述性图示的说明类型。 */
  figureType?: PreviewFigureType;
  /** 当前文档语言。 */
  lang?: Lang;
  /** 是否显示单预览 Theme 切换器。 */
  enableThemeSwitch?: boolean;
  /** 当前预览实际生效的 Theme。 */
  themeName?: PreviewThemeName;
  /** 当前单预览 Theme 选择。 */
  themeNameSelection?: PreviewThemeSelection;
  /** 更新当前单预览 Theme 选择。 */
  onThemeChange?: (themeName: PreviewThemeSelection) => void;
};

/** 悬浮在预览内容上方的局部主题切换 */
export const PreviewContextBar: FC<PreviewContextBarProps> = props => {
  const {
    inline = false,
    iconOnly = false,
    themeMode,
    onThemeModeChange,
    figureType,
    lang = 'zh',
    enableThemeSwitch = false,
    themeName,
    themeNameSelection = 'inherit',
    onThemeChange,
  } = props;
  const { t } = useTranslation();
  const [themeNameMenuOpen, setThemeMenuOpen] = useState(false);
  const [figureGuideOpen, setFigureGuideOpen] = useState(false);
  const effectiveTheme = themeName ?? PreviewTheme.Default;

  return (
    <div
      data-slot="preview-context-bar"
      className={cn(
        inline
          ? 'relative'
          : 'pointer-events-none absolute top-2 left-1/2 z-20 -translate-x-1/2 opacity-0 transition-opacity group-hover/preview-context:pointer-events-auto group-hover/preview-context:opacity-100 group-focus-within/preview-context:pointer-events-auto group-focus-within/preview-context:opacity-100',
        (themeNameMenuOpen || figureGuideOpen) && 'pointer-events-auto opacity-100',
      )}
    >
      <div className="flex items-center gap-2">
        {figureType ? (
          <FigureGuideButton
            type={figureType}
            lang={lang}
            onOpenChange={setFigureGuideOpen}
            className="size-8 border border-input bg-background shadow-xs"
          />
        ) : null}
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={themeMode}
          onValueChange={value => {
            if (value === 'inherit' || value === 'light' || value === 'dark') onThemeModeChange(value);
          }}
          aria-label={t('preview.themeMode')}
          className="bg-background shadow-xs"
        >
          <ToggleGroupItem
            value="inherit"
            aria-label="Preview theme inherit"
            title={t('preview.themeSystem')}
            className="px-2"
          >
            <Monitor className="size-3.5" />
            {!iconOnly ? <span>{t('preview.themeSystem')}</span> : null}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="light"
            aria-label="Preview theme light"
            title={t('preview.themeLight')}
            className="px-2"
          >
            <Sun className="size-3.5" />
            {!iconOnly ? <span>{t('preview.themeLight')}</span> : null}
          </ToggleGroupItem>
          <ToggleGroupItem value="dark" aria-label="Preview theme dark" title={t('preview.themeDark')} className="px-2">
            <Moon className="size-3.5" />
            {!iconOnly ? <span>{t('preview.themeDark')}</span> : null}
          </ToggleGroupItem>
        </ToggleGroup>
        {enableThemeSwitch && onThemeChange ? (
          <ThemeSwitchButton
            selection={themeNameSelection}
            effectiveStyle={effectiveTheme}
            onSelectionChange={onThemeChange}
            onOpenChange={setThemeMenuOpen}
            className="size-8 border border-input bg-background shadow-xs"
          />
        ) : null}
      </div>
    </div>
  );
};
