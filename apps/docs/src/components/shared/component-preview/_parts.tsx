import { Braces, Brush, Check, ChevronDown, Copy, Database, FileCode2, FileSymlink, LineDotRightHorizontal } from 'lucide-react';
import { type ComponentProps, type FC, type ReactNode } from 'react';

import { JsonIcon, ReactIcon } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import type { ComponentSourceFile, RendererMode, SourceView } from './_shared';

/**
 * 工具条小型 ghost icon button
 * @description 统一外观（size-7、rounded-sm、muted 色）；透传 button 属性 + `pressed` toggle 态（可用 secondary + aria-pressed）
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

/** 渲染模式切换按钮 */
export type RendererModeButtonProps = {
  rendererMode: RendererMode;
  onToggle: () => void;
  className?: string;
};

export const RendererModeButton: FC<RendererModeButtonProps> = props => {
  const { rendererMode, onToggle, className } = props;
  const isCanvas = rendererMode === 'canvas';
  const label = isCanvas ? 'Canvas renderer' : 'SVG renderer';
  return (
    <ToolbarIconButton label={label} title={label} pressed={isCanvas} onClick={onToggle} className={className}>
      {isCanvas ? <Brush className="size-3.5" /> : <LineDotRightHorizontal className="size-3.5" />}
    </ToolbarIconButton>
  );
};

/** 各视图的展示元数据（图标 / 文案 / aria-label） */
const VIEW_META: Record<SourceView, { label: string; text: string; icon: ReactNode }> = {
  react: { label: 'React source', text: 'React', icon: <ReactIcon className="size-3.5" /> },
  ir: { label: 'IR JSON', text: 'IR', icon: <JsonIcon className="size-3.5" /> },
  vanilla: { label: 'Vanilla builder code', text: 'Vanilla', icon: <Braces className="size-3.5" /> },
};

/** 数据集文件命名约定：`<主demo名>.data.ts` / `<主demo名>.<dataset>.data.ts`（多数据集），用专属 Database 图标区分 */
const DATA_FILE_PATTERN = /\.data\.tsx?$/;

/** 文件类型图标：数据文件（`*.data.ts`）用 Database，主 demo 文件用 FileCode2，其他 sourceFiles 用 FileSymlink */
const FileKindIcon: FC<{ filename: string; isMain?: boolean; className?: string }> = ({ filename, isMain, className }) =>
  DATA_FILE_PATTERN.test(filename) ? (
    <Database className={className} />
  ) : isMain ? (
    <FileCode2 className={className} />
  ) : (
    <FileSymlink className={className} />
  );

/** 单个视图切换按钮（React / Vanilla / IR），各自独立 */
type ViewButtonProps = {
  target: SourceView;
  active: boolean;
  onClick: () => void;
  /** 在 ButtonGroup 内（与文件下拉拼接）时用 outline 描边以接缝；独立时 active=outline、inactive=ghost */
  grouped?: boolean;
};

const ViewButton: FC<ViewButtonProps> = props => {
  const { target, active, onClick, grouped } = props;
  const meta = VIEW_META[target];
  return (
    <Button
      type="button"
      size="sm"
      variant={active || grouped ? 'outline' : 'ghost'}
      aria-pressed={active}
      aria-label={meta.label}
      className={cn('h-8 cursor-pointer gap-1.5', active ? 'bg-muted text-foreground' : 'border border-transparent text-muted-foreground')}
      onClick={onClick}
    >
      {meta.icon}
      {meta.text}
    </Button>
  );
};

/** 当前视图的多文件下拉选择（原 SourceFileMenu 行为）；作为 ButtonGroup 成员贴在选中视图按钮右侧 */
type FileMenuProps = {
  files: ReadonlyArray<ComponentSourceFile>;
  activeFileIndex: number;
  onFileChange: (index: number) => void;
};

const FileMenu: FC<FileMenuProps> = props => {
  const { files, activeFileIndex, onFileChange } = props;
  const activeFile = files.at(activeFileIndex) ?? files[0];
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'h-8 max-w-[160px] min-w-0 cursor-pointer gap-1.5 px-2 font-mono text-xs text-muted-foreground',
        )}
        aria-label="Source file"
        title={activeFile.filename}
      >
        <FileKindIcon filename={activeFile.filename} isMain={activeFile.isMain} className="size-3.5 shrink-0" />
        <span className="truncate">{activeFile.filename}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {files.map((file, index) => (
          <DropdownMenuItem
            key={`${file.filename}-${index}`}
            className="cursor-pointer gap-2"
            title={file.filename}
            onSelect={() => onFileChange(index)}
          >
            <FileKindIcon filename={file.filename} isMain={file.isMain} className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-xs">{file.filename}</span>
            <Check className={cn('ml-auto size-3.5 shrink-0', index !== activeFileIndex && 'opacity-0')} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * 视图切换条：React / Vanilla / IR 各自独立按钮；**选中**且有多文件的那个视图，与其文件下拉拼成一个 ButtonGroup
 * @description 例：React 选中且有 2 个文件 → `[React ▾file]` 一个 ButtonGroup，Vanilla / IR 仍是旁边的独立按钮。
 *   文件选择沿用原下拉。视图 ≤ 1 且文件 ≤ 1 时整条不渲染；单视图 + 多文件则只出文件下拉。
 */
export type SourceViewBarProps = {
  /** 可用视图（外部已按 react→vanilla→ir 排好） */
  views: ReadonlyArray<SourceView>;
  /** 当前视图 */
  view: SourceView;
  onViewChange: (next: SourceView) => void;
  /** 当前视图的源码文件 */
  files: ReadonlyArray<ComponentSourceFile>;
  /** 当前文件下标 */
  activeFileIndex: number;
  onFileChange: (index: number) => void;
};

export const SourceViewBar: FC<SourceViewBarProps> = props => {
  const { views, view, onViewChange, files, activeFileIndex, onFileChange } = props;
  const showViews = views.length > 1;
  const multiFile = files.length > 1;
  if (!showViews && !multiFile) return null;

  // 单视图 + 多文件：无需视图切换，只出文件下拉
  if (!showViews) {
    return <FileMenu files={files} activeFileIndex={activeFileIndex} onFileChange={onFileChange} />;
  }

  return (
    <div className="flex items-center gap-1">
      {views.map(target => {
        const active = target === view;
        // 选中视图 + 多文件 → 视图按钮与文件下拉合成一个 ButtonGroup
        if (active && multiFile) {
          return (
            <ButtonGroup key={target}>
              <ViewButton target={target} active grouped onClick={() => onViewChange(target)} />
              <FileMenu files={files} activeFileIndex={activeFileIndex} onFileChange={onFileChange} />
            </ButtonGroup>
          );
        }
        return <ViewButton key={target} target={target} active={active} onClick={() => onViewChange(target)} />;
      })}
    </div>
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
