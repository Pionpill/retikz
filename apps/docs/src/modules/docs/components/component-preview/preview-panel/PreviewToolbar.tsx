import type { FC, ReactNode } from 'react';

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
