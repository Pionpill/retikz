import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Download,
  Hand,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { type FC } from 'react';

import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib';

import type { RendererMode, SizeKey, Transform } from '../types';

import { SIZE_KEYS } from '../constants';
import { PAN_STEP, ZOOM_FACTOR, ZOOM_MAX, ZOOM_MIN } from '../hooks';
import { RendererModeButton, ToolbarIconButton } from './parts';

export type PanZoomToolbarProps = {
  transform: Transform;
  isTransformed: boolean;
  panBy: (dx: number, dy: number) => void;
  zoomBy: (factor: number) => void;
  resetTransform: () => void;
  dragEnabled: boolean;
  toggleDrag: () => void;
  onMaximize: () => void;
  /** 当前 size 档位（受控）+ 切换回调；用户在工具条里改完后由父级 ComponentRender 落到 sizeClass */
  size: SizeKey;
  onSizeChange: (next: SizeKey) => void;
  /** 下载当前渲染图：SVG 模式下载 SVG，Canvas 模式下载 PNG */
  onDownload: () => void;
  /** 当前渲染目标 */
  rendererMode: RendererMode;
  /** 切换当前渲染目标 */
  toggleRendererMode: () => void;
  /** 强制显示工具栏。 */
  pinned?: boolean;
  /** 始终显示工具栏。 */
  alwaysVisible?: boolean;
};

/** 允许的 size 值集合（避免 radix ToggleGroup 取消选中时回 '' 误传） */
const SIZE_VALUE_SET: ReadonlySet<string> = new Set<SizeKey>(SIZE_KEYS);

export const PanZoomToolbar: FC<PanZoomToolbarProps> = props => {
  const {
    transform,
    isTransformed,
    panBy,
    zoomBy,
    resetTransform,
    dragEnabled,
    toggleDrag,
    onMaximize,
    size,
    onSizeChange,
    onDownload,
    rendererMode,
    toggleRendererMode,
    pinned,
    alwaysVisible,
  } = props;
  const downloadLabel = rendererMode === 'canvas' ? 'Download PNG' : 'Download SVG';
  const isSmallPreview = size === 'xs' || size === 'sm';
  return (
    <div
      className={cn(
        'absolute right-2 bottom-2 flex flex-col items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur',
        pinned || alwaysVisible
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0 transition-opacity group-hover/preview:pointer-events-auto group-hover/preview:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100',
      )}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <div className={cn('hidden grid-cols-3 gap-0.5', !isSmallPreview && 'md:grid')}>
        <span />
        <ToolbarIconButton label="Pan up" onClick={() => panBy(0, -PAN_STEP)}>
          <ArrowUp className="size-3.5" />
        </ToolbarIconButton>
        <span />
        <ToolbarIconButton label="Pan left" onClick={() => panBy(-PAN_STEP, 0)}>
          <ArrowLeft className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Reset" disabled={!isTransformed} onClick={resetTransform}>
          <RotateCcw className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Pan right" onClick={() => panBy(PAN_STEP, 0)}>
          <ArrowRight className="size-3.5" />
        </ToolbarIconButton>
        <span />
        <ToolbarIconButton label="Pan down" onClick={() => panBy(0, PAN_STEP)}>
          <ArrowDown className="size-3.5" />
        </ToolbarIconButton>
        <span />
      </div>
      <Separator className={cn('hidden w-full', !isSmallPreview && 'md:block')} />
      <div className="flex gap-0.5">
        <ToolbarIconButton label="Zoom in" disabled={transform.scale >= ZOOM_MAX} onClick={() => zoomBy(ZOOM_FACTOR)}>
          <ZoomIn className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Zoom out"
          disabled={transform.scale <= ZOOM_MIN}
          onClick={() => zoomBy(1 / ZOOM_FACTOR)}
        >
          <ZoomOut className="size-3.5" />
        </ToolbarIconButton>
        {isSmallPreview && (
          <ToolbarIconButton label="Reset" disabled={!isTransformed} onClick={resetTransform}>
            <RotateCcw className="size-3.5" />
          </ToolbarIconButton>
        )}
        <ToolbarIconButton
          label={dragEnabled ? 'Disable drag' : 'Enable drag'}
          pressed={dragEnabled}
          onClick={toggleDrag}
        >
          <Hand className="size-3.5" />
        </ToolbarIconButton>
        {!isSmallPreview && (
          <ToolbarIconButton label="Reset" disabled={!isTransformed} onClick={resetTransform} className="md:hidden">
            <RotateCcw className="size-3.5" />
          </ToolbarIconButton>
        )}
        <ToolbarIconButton label={downloadLabel} title={downloadLabel} onClick={onDownload}>
          <Download className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Maximize" onClick={onMaximize} className="hidden md:inline-flex">
          <Maximize2 className="size-3.5" />
        </ToolbarIconButton>
        <RendererModeButton rendererMode={rendererMode} onToggle={toggleRendererMode} />
      </div>
      <Separator className="w-full" />
      <ToggleGroup
        type="single"
        variant="outline"
        value={size}
        onValueChange={value => {
          if (SIZE_VALUE_SET.has(value)) onSizeChange(value as SizeKey);
        }}
        aria-label="Preview size"
        className="w-full"
      >
        {SIZE_KEYS.map(key => (
          <ToggleGroupItem
            key={key}
            value={key}
            aria-label={`Size ${key}`}
            className="h-6 flex-1 cursor-pointer px-0 text-[10px] font-medium uppercase"
          >
            {key}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};
