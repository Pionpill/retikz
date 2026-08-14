import type { FC, ReactNode } from 'react';

import { Braces, Check, ChevronDown, Database, FileCode2, FileSymlink } from 'lucide-react';

import { JsonIcon, ReactIcon } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib';

import type { ComponentSourceFile, SourceView } from '../types';

const VIEW_META: Record<SourceView, { label: string; text: string; icon: ReactNode }> = {
  react: { label: 'React source', text: 'React', icon: <ReactIcon className="size-3.5" /> },
  ir: { label: 'IR JSON', text: 'IR', icon: <JsonIcon className="size-3.5" /> },
  vanilla: { label: 'Vanilla Input code', text: 'Vanilla', icon: <Braces className="size-3.5" /> },
};

const DATA_FILE_PATTERN = /\.data\.tsx?$/;

type FileKindIconProps = {
  filename: string;
  isMain?: boolean;
  className?: string;
};

const FileKindIcon: FC<FileKindIconProps> = props => {
  const { filename, isMain, className } = props;

  if (DATA_FILE_PATTERN.test(filename)) return <Database className={className} />;
  if (isMain) return <FileCode2 className={className} />;
  return <FileSymlink className={className} />;
};

type ViewButtonProps = {
  target: SourceView;
  active: boolean;
  onClick: () => void;
  /** 是否与文件选择器组成按钮组。 */
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
      className={cn(
        'h-8 cursor-pointer gap-1.5',
        active ? 'bg-muted text-foreground' : 'border border-transparent text-muted-foreground',
      )}
      onClick={onClick}
    >
      {meta.icon}
      {meta.text}
    </Button>
  );
};

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
            <FileKindIcon
              filename={file.filename}
              isMain={file.isMain}
              className="size-3.5 shrink-0 text-muted-foreground"
            />
            <span className="truncate font-mono text-xs">{file.filename}</span>
            <Check className={cn('ml-auto size-3.5 shrink-0', index !== activeFileIndex && 'opacity-0')} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** 源码视图切换条属性。 */
export type SourceViewBarProps = {
  /** 可用视图。 */
  views: ReadonlyArray<SourceView>;
  /** 当前视图。 */
  view: SourceView;
  /** 切换当前视图。 */
  onViewChange: (view: SourceView) => void;
  /** 当前视图下的源码文件。 */
  files: ReadonlyArray<ComponentSourceFile>;
  /** 当前源码文件下标。 */
  activeFileIndex: number;
  /** 切换当前源码文件。 */
  onFileChange: (index: number) => void;
};

/** 源码视图与文件切换条。 */
export const SourceViewBar: FC<SourceViewBarProps> = props => {
  const { views, view, onViewChange, files, activeFileIndex, onFileChange } = props;
  const showViews = views.length > 1;
  const multiFile = files.length > 1;
  if (!showViews && !multiFile) return null;

  if (!showViews) {
    return <FileMenu files={files} activeFileIndex={activeFileIndex} onFileChange={onFileChange} />;
  }

  return (
    <div className="flex items-center gap-1">
      {views.map(target => {
        const active = target === view;
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
