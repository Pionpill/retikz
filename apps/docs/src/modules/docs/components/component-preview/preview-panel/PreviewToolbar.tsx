import type { FC, ReactNode } from 'react';

import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib';

import { ToolbarIconButton } from '../components';

export type PreviewToolbarProps = {
  /** 工具栏内容。 */
  children: ReactNode;
  /** 容器附加样式。 */
  className?: string;
};

/** 预览区控制插槽推荐工具栏容器。 */
export const PreviewToolbar: FC<PreviewToolbarProps> = props => {
  const { children, className } = props;

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur',
        className,
      )}
    >
      {children}
    </div>
  );
};

export type PreviewToolbarButtonProps = {
  /** 无障碍标签。 */
  label: string;
  /** 鼠标提示，默认复用标签。 */
  title?: string;
  /** 当前是否处于按下状态。 */
  pressed?: boolean;
  /** 当前是否禁用。 */
  disabled?: boolean;
  /** 按钮附加样式。 */
  className?: string;
  /** 按钮图标或内容。 */
  children: ReactNode;
  /** 点击按钮时执行的动作。 */
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
  /** 分隔线方向。 */
  orientation?: 'horizontal' | 'vertical';
  /** 分隔线附加样式。 */
  className?: string;
};

/** 预览区控制插槽推荐分隔线。 */
export const PreviewToolbarSeparator: FC<PreviewToolbarSeparatorProps> = props => {
  const { orientation = 'vertical', className } = props;

  return (
    <Separator orientation={orientation} className={cn(orientation === 'vertical' ? 'h-5' : 'w-full', className)} />
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
  /** 写入 runtime 的选项值。 */
  value: string;
  /** 展示给用户的选项文本。 */
  label: string;
};

export type PreviewToolbarSelectProps = {
  /** 选择器无障碍标签。 */
  label: string;
  /** 当前选项值。 */
  value: string;
  /** 可选值集合。 */
  options: Array<PreviewToolbarSelectOption>;
  /** 选择器附加样式。 */
  className?: string;
  /** 选项变化回调。 */
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

export type PreviewToolbarInputProps = {
  /** 输入框无障碍标签。 */
  label: string;
  /** 当前输入值。 */
  value: string;
  /** 空值提示。 */
  placeholder?: string;
  /** 输入框附加样式。 */
  className?: string;
  /** 输入值变化回调。 */
  onValueChange: (value: string) => void;
};

/** 预览工具栏里的文本输入控件。 */
export const PreviewToolbarInput: FC<PreviewToolbarInputProps> = props => {
  const { label, value, placeholder, className, onValueChange } = props;

  return (
    <Input
      aria-label={label}
      title={label}
      value={value}
      placeholder={placeholder}
      className={cn('h-7 min-w-28 bg-background px-2 text-xs', className)}
      onChange={event => onValueChange(event.target.value)}
    />
  );
};

export type PreviewToolbarToggleOption = {
  /** 写入 runtime 的选项值。 */
  value: string;
  /** 展示给用户的选项文本。 */
  label: string;
};

export type PreviewToolbarToggleGroupProps = {
  /** 切换组无障碍标签。 */
  label: string;
  /** 当前选项值。 */
  value: string;
  /** 可选值集合。 */
  options: Array<PreviewToolbarToggleOption>;
  /** 切换组附加样式。 */
  className?: string;
  /** 选项变化回调。 */
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
