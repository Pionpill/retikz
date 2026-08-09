import type { FC } from 'react';

import { useTranslation } from 'react-i18next';

import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib';
import { DocDifficultyMenuItems, DocDifficultyVisuals } from '@/modules/docs/components';
import { useDocDifficultyStore } from '@/modules/docs/store';

export type DocDifficultyFilterProps = {
  /** 顶栏触发按钮的额外样式。 */
  className?: string;
};

/** 顶栏桌面端阅读难度筛选入口。 */
export const DocDifficultyFilter: FC<DocDifficultyFilterProps> = props => {
  const { className } = props;
  const { t } = useTranslation();
  const maximumDifficulty = useDocDifficultyStore(state => state.maximumDifficulty);
  const { Icon, iconClassName } = DocDifficultyVisuals[maximumDifficulty];
  const label = t('difficulty.label');

  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex', className)}>
            <DropdownMenuTrigger
              aria-label={label}
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-7 cursor-pointer rounded-sm')}
            >
              <Icon aria-hidden className={cn('size-4', iconClassName)} />
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel inset className="text-xs font-normal text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DocDifficultyMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** 顶栏移动端更多菜单中的阅读难度子菜单。 */
export const DocDifficultyMenuSub: FC = () => {
  const { t } = useTranslation();
  const maximumDifficulty = useDocDifficultyStore(state => state.maximumDifficulty);
  const { Icon, iconClassName } = DocDifficultyVisuals[maximumDifficulty];

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon aria-hidden className={cn('size-4', iconClassName)} />
        {t('difficulty.label')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-44">
        <DocDifficultyMenuItems />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
