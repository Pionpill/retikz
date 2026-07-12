import type { ComponentProps, FC } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib';

/** 工具条小型图标按钮属性。 */
export type ToolbarIconButtonProps = Omit<ComponentProps<'button'>, 'aria-label'> & {
  /** 无障碍标签。 */
  label: string;
  /** 是否处于按下状态。 */
  pressed?: boolean;
};

/** 工具条小型图标按钮。 */
export const ToolbarIconButton: FC<ToolbarIconButtonProps> = props => {
  const { label, pressed, className, children, ...rest } = props;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        buttonVariants({ variant: pressed ? 'secondary' : 'ghost', size: 'icon' }),
        'size-7 cursor-pointer rounded-sm text-muted-foreground',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
};
