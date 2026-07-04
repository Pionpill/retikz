import type { FC, ReactNode } from 'react';

import { useEffect, useState } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib';

import { ToolbarIconButton } from './parts';

export type PreviewToolbarProps = {
  children: ReactNode;
  className?: string;
};

/** 预览区控制插槽推荐工具栏容器。 */
export const PreviewToolbar: FC<PreviewToolbarProps> = props => {
  const { children, className } = props;

  return (
    <div className={cn('flex items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur', className)}>
      {children}
    </div>
  );
};

export type PreviewToolbarButtonProps = {
  label: string;
  title?: string;
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  onClick: () => void;
};

/** 预览区控制插槽推荐图标按钮。 */
export const PreviewToolbarButton: FC<PreviewToolbarButtonProps> = props => {
  const { label, title, pressed, disabled, className, children, onClick } = props;

  return (
    <ToolbarIconButton
      label={label}
      title={title ?? label}
      pressed={pressed}
      disabled={disabled}
      className={className}
      onClick={onClick}
    >
      {children}
    </ToolbarIconButton>
  );
};

export type PreviewToolbarSeparatorProps = {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};

/** 预览区控制插槽推荐分隔线。 */
export const PreviewToolbarSeparator: FC<PreviewToolbarSeparatorProps> = props => {
  const { orientation = 'vertical', className } = props;

  return (
    <Separator
      orientation={orientation}
      className={cn(orientation === 'vertical' ? 'h-5' : 'w-full', className)}
    />
  );
};

const releaseSelectDocumentLock = (): void => {
  if (document.querySelector('[role="dialog"]')) return;
  document.body.style.pointerEvents = '';
  document.body.style.setProperty('overflow', 'visible', 'important');
  document.documentElement.style.setProperty('overflow', 'visible', 'important');
};

const restoreSelectDocumentLockOverride = (): void => {
  document.body.style.removeProperty('overflow');
  document.documentElement.style.removeProperty('overflow');
};

const useReleaseSelectDocumentLock = (open: boolean): void => {
  useEffect(() => {
    if (!open) return undefined;
    let frame = 0;
    const tick = () => {
      releaseSelectDocumentLock();
      frame = window.requestAnimationFrame(tick);
    };
    tick();
    return () => {
      window.cancelAnimationFrame(frame);
      window.requestAnimationFrame(restoreSelectDocumentLockOverride);
    };
  }, [open]);
};

export type PreviewToolbarSelectOption = {
  value: string;
  label: string;
};

export type PreviewToolbarSelectProps = {
  label: string;
  value: string;
  options: Array<PreviewToolbarSelectOption>;
  className?: string;
  onValueChange: (value: string) => void;
};

/** 预览区控制插槽推荐选择器。 */
export const PreviewToolbarSelect: FC<PreviewToolbarSelectProps> = props => {
  const { label, value, options, className, onValueChange } = props;
  const [open, setOpen] = useState(false);
  useReleaseSelectDocumentLock(open);
  const selected = options.find(option => option.value === value);

  return (
    <Select
      value={value}
      onOpenChange={nextOpen => {
        setOpen(nextOpen);
        if (nextOpen) releaseSelectDocumentLock();
      }}
      onValueChange={onValueChange}
    >
      <SelectTrigger
        aria-label={label}
        title={label}
        className={cn('h-7 min-w-28 bg-background px-2 text-xs', className)}
      >
        <SelectValue>{selected?.label ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export type PreviewToolbarToggleOption = {
  value: string;
  label: string;
};

export type PreviewToolbarToggleGroupProps = {
  label: string;
  value: string;
  options: Array<PreviewToolbarToggleOption>;
  className?: string;
  onValueChange: (value: string) => void;
};

/** 预览工具栏里的分段切换控件。 */
export const PreviewToolbarToggleGroup: FC<PreviewToolbarToggleGroupProps> = props => {
  const { label, value, options, className, onValueChange } = props;

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      onValueChange={onValueChange}
      aria-label={label}
      className={className}
    >
      {options.map(option => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={`${label} ${option.label}`}
          className="h-6 flex-1 cursor-pointer px-0 text-[10px] font-medium uppercase"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};
