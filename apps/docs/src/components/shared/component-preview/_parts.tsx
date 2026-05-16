import { Check, Copy } from 'lucide-react';
import { forwardRef, type ComponentProps, type FC, type ReactNode } from 'react';

import { JsonIcon, ReactIcon } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { SourceView } from './_shared';

/**
 * 工具条小号 ghost icon button
 * @description 统一外观（size-7、rounded-sm、muted 色）；透传 button 属性 + `pressed` toggle 态（变 secondary + aria-pressed）。
 *   走 `forwardRef` + 内部渲染原生 `<button>`（绕开 shadcn `Button` FC）：项目 React 18.2 下 FC 不接 ref，让 radix `asChild`（Tooltip / DropdownMenu）能拿到 trigger DOM 做定位
 */
export type ToolbarIconButtonProps = Omit<ComponentProps<'button'>, 'aria-label'> & {
  label: string;
  pressed?: boolean;
};

export const ToolbarIconButton = forwardRef<HTMLButtonElement, ToolbarIconButtonProps>((props, ref) => {
  const { label, pressed, className, children, ...rest } = props;
  return (
    <button
      ref={ref}
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
});
ToolbarIconButton.displayName = 'ToolbarIconButton';

/**
 * React / IR 视图切换的两连按钮
 * @description 卡内底部代码栏与 Dialog 右栏共用；未选用 ghost + 透明边框占位避免布局抖动
 */
export type ViewToggleProps = {
  view: SourceView;
  onChange: (next: SourceView) => void;
};

type ViewButtonProps = {
  current: SourceView;
  target: SourceView;
  label: string;
  icon: ReactNode;
  text: string;
  onClick: () => void;
};

const ViewButton: FC<ViewButtonProps> = props => {
  const { current, target, label, icon, text, onClick } = props;
  const active = current === target;
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'outline' : 'ghost'}
      className={active ? '' : 'border border-transparent'}
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
    >
      {icon}
      {text}
    </Button>
  );
};

export const ViewToggle: FC<ViewToggleProps> = props => {
  const { view, onChange } = props;
  return (
    <>
      <ViewButton
        current={view}
        target="react"
        label="React source"
        icon={<ReactIcon className="size-3.5" />}
        text="React"
        onClick={() => onChange('react')}
      />
      <ViewButton
        current={view}
        target="ir"
        label="IR JSON"
        icon={<JsonIcon className="size-3.5" />}
        text="IR"
        onClick={() => onChange('ir')}
      />
    </>
  );
};

/** 复制按钮：copied=true 时图标切到对勾、aria-label 同步切换。颜色保持 muted 与其它工具按钮一致。 */
export type CopyButtonProps = {
  copied: boolean;
  onCopy: () => void;
  className?: string;
};

export const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>((props, ref) => {
  const { copied, onCopy, className } = props;
  return (
    <ToolbarIconButton ref={ref} label={copied ? 'Copied' : 'Copy'} onClick={onCopy} className={className}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </ToolbarIconButton>
  );
});
CopyButton.displayName = 'CopyButton';
