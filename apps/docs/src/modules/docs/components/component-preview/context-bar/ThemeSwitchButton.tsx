import { Globe2 } from 'lucide-react';
import type { FC } from 'react';
import { createElement } from 'react';
import { useTranslation } from 'react-i18next';

import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib';

import type { PreviewThemeName } from '../theme';
import { getPreviewThemeIcon, PreviewThemeLabelKeys, PreviewThemeOptions } from '../theme';
import type { PreviewThemeSelection } from '../types';

export type ThemeSwitchButtonProps = {
  /** 当前局部选择；inherit 表示跟随全局。 */
  selection: PreviewThemeSelection;
  /** 当前实际生效的 Theme。 */
  effectiveStyle: PreviewThemeName;
  /** 更新当前局部选择。 */
  onSelectionChange: (selection: PreviewThemeSelection) => void;
  /** 下拉打开状态变化。 */
  onOpenChange?: (open: boolean) => void;
  /** 按钮附加样式。 */
  className?: string;
};

const isThemeSelection = (value: string): value is PreviewThemeSelection =>
  value === 'inherit' || PreviewThemeOptions.some(option => option === value);

/** 切换单张 ComponentPreview 的 Theme。 */
export const ThemeSwitchButton: FC<ThemeSwitchButtonProps> = props => {
  const { selection, effectiveStyle, onSelectionChange, onOpenChange, className } = props;
  const { t } = useTranslation();
  const label = t('preview.themeName');

  return (
    <DropdownMenu modal={false} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        aria-label="Theme"
        title={label}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'size-7 cursor-pointer rounded-sm text-muted-foreground',
          className,
        )}
      >
        {createElement(getPreviewThemeIcon(effectiveStyle), { 'aria-hidden': true, className: 'size-3.5' })}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={selection}
          onValueChange={value => {
            if (isThemeSelection(value)) onSelectionChange(value);
          }}
        >
          <DropdownMenuRadioItem value="inherit">
            <Globe2 className="size-4" />
            {t('preview.themeNameFollowGlobal')}
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {PreviewThemeOptions.map(option => (
            <DropdownMenuRadioItem key={option} value={option}>
              {createElement(getPreviewThemeIcon(option), { 'aria-hidden': true, className: 'size-4' })}
              {t(PreviewThemeLabelKeys[option])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
