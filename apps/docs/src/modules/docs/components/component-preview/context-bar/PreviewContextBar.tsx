import type { FC } from 'react';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import type { PreviewThemeMode } from '../types';

export type PreviewContextBarProps = {
  /** 当前预览使用的局部主题 */
  themeMode: PreviewThemeMode;
  /** 更新局部主题 */
  onThemeModeChange: (themeMode: PreviewThemeMode) => void;
};

/** 悬浮在预览内容上方的局部主题切换 */
export const PreviewContextBar: FC<PreviewContextBarProps> = props => {
  const { themeMode, onThemeModeChange } = props;
  const { t } = useTranslation();

  return (
    <div
      data-slot="preview-context-bar"
      className="pointer-events-none absolute top-2 left-1/2 z-20 -translate-x-1/2 opacity-0 transition-opacity group-hover/preview-context:pointer-events-auto group-hover/preview-context:opacity-100 group-focus-within/preview-context:pointer-events-auto group-focus-within/preview-context:opacity-100"
    >
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
        <ToggleGroupItem value="inherit" aria-label="Preview theme inherit" className="px-2">
          <Monitor className="size-3.5" />
          <span>{t('preview.themeSystem')}</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="light" aria-label="Preview theme light" className="px-2">
          <Sun className="size-3.5" />
          <span>{t('preview.themeLight')}</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="dark" aria-label="Preview theme dark" className="px-2">
          <Moon className="size-3.5" />
          <span>{t('preview.themeDark')}</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};
