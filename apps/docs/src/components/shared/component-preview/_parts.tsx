import { Check, ChevronDown, Copy, FileCode2 } from 'lucide-react';
import { type ComponentProps, type FC, type ReactNode } from 'react';

import { JsonIcon, ReactIcon } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import type { ComponentSourceFile, SourceView } from './_shared';

/**
 * 工具条小号 ghost icon button
 * @description 统一外观（size-7、rounded-sm、muted 色）；透传 button 属性 + `pressed` toggle 态（变 secondary + aria-pressed）
 */
export type ToolbarIconButtonProps = Omit<ComponentProps<'button'>, 'aria-label'> & {
  label: string;
  pressed?: boolean;
};

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

/** 源码面板的文件切换菜单 */
export type SourceFileMenuProps = {
  /** 当前源码视图可切换的文件列表 */
  files: Array<ComponentSourceFile>;
  /** 当前激活文件的下标 */
  activeIndex: number;
  /** 用户切换文件时回传新的下标 */
  onChange: (index: number) => void;
};

export const SourceFileMenu: FC<SourceFileMenuProps> = props => {
  const { files, activeIndex, onChange } = props;
  if (files.length <= 1) return null;
  const activeFile = files.at(activeIndex) ?? files[0];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'h-8 max-w-[150px] min-w-0 cursor-pointer gap-1.5 px-2 font-mono text-xs',
        )}
        aria-label="Source file"
        title={activeFile.filename}
      >
        <FileCode2 className="size-3.5 shrink-0" />
        <span className="truncate">{activeFile.filename}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {files.map((file, index) => {
          const active = index === activeIndex;
          return (
            <DropdownMenuItem
              key={`${file.filename}-${index}`}
              className="cursor-pointer gap-2"
              title={file.filename}
              onSelect={() => onChange(index)}
            >
              <Check className={cn('size-3.5 shrink-0', !active && 'opacity-0')} />
              <span className="truncate font-mono text-xs">{file.filename}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** 复制按钮：copied=true 时图标切到对勾、aria-label 同步切换。颜色保持 muted 与其它工具按钮一致。 */
export type CopyButtonProps = {
  copied: boolean;
  onCopy: () => void;
  className?: string;
  title?: string;
};

export const CopyButton: FC<CopyButtonProps> = props => {
  const { copied, onCopy, className, title } = props;
  return (
    <ToolbarIconButton label={copied ? 'Copied' : 'Copy'} title={title} onClick={onCopy} className={className}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </ToolbarIconButton>
  );
};
