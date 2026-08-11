import type { FC } from 'react';

import { Globe2 } from 'lucide-react';
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

import type { PreviewThemeStyleSelection } from '../types';
import type { PreviewThemeStyleValue } from '../theme';

import { getPreviewThemeStyleIcon, PreviewThemeStyleLabelKeys, PreviewThemeStyleOptions } from '../theme';

export type ThemeStyleSwitchButtonProps = {
  /** 当前局部选择；inherit 表示跟随全局。 */
  selection: PreviewThemeStyleSelection;
  /** 当前实际生效的 ThemeStyle。 */
  effectiveStyle: PreviewThemeStyleValue;
  /** 更新当前局部选择。 */
  onSelectionChange: (selection: PreviewThemeStyleSelection) => void;
  /** 下拉打开状态变化。 */
  onOpenChange?: (open: boolean) => void;
  /** 按钮附加样式。 */
  className?: string;
};

const isThemeStyleSelection = (value: string): value is PreviewThemeStyleSelection =>
  value === 'inherit' || PreviewThemeStyleOptions.some(option => option === value);

/** 切换单张 ComponentPreview 的 ThemeStyle。 */
export const ThemeStyleSwitchButton: FC<ThemeStyleSwitchButtonProps> = props => {
  const { selection, effectiveStyle, onSelectionChange, onOpenChange, className } = props;
  const { t } = useTranslation();
  const label = t('preview.themeStyle');

  return (
    <DropdownMenu modal={false} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        aria-label="Theme style"
        title={label}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'size-7 cursor-pointer rounded-sm text-muted-foreground',
          className,
        )}
      >
        {createElement(getPreviewThemeStyleIcon(effectiveStyle), { 'aria-hidden': true, className: 'size-3.5' })}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={selection}
          onValueChange={value => {
            if (isThemeStyleSelection(value)) onSelectionChange(value);
          }}
        >
          <DropdownMenuRadioItem value="inherit">
            <Globe2 className="size-4" />
            {t('preview.themeStyleFollowGlobal')}
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {PreviewThemeStyleOptions.map(option => (
            <DropdownMenuRadioItem key={option} value={option}>
              {createElement(getPreviewThemeStyleIcon(option), { 'aria-hidden': true, className: 'size-4' })}
              {t(PreviewThemeStyleLabelKeys[option])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
