import { type FC } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand, Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { ToolbarIconButton } from './_parts';
import type { Transform } from './_shared';
import { PAN_STEP, ZOOM_FACTOR, ZOOM_MAX, ZOOM_MIN } from './usePanZoom';

export type PanZoomToolbarProps = {
  transform: Transform;
  isTransformed: boolean;
  panBy: (dx: number, dy: number) => void;
  zoomBy: (factor: number) => void;
  resetTransform: () => void;
  dragEnabled: boolean;
  toggleDrag: () => void;
  onMaximize: () => void;
};

/**
 * Hover 出现的渲染区操作面板。
 * - 上半 3x3 d-pad（中央 ⟲ 复原）
 * - 下半单行 4 个动作按钮：放大、缩小、拖拽切换、放大查看
 * - mousedown 拦截不冒泡，避免触发外层 demo 区的 drag handler
 */
export const PanZoomToolbar: FC<PanZoomToolbarProps> = props => {
  const { transform, isTransformed, panBy, zoomBy, resetTransform, dragEnabled, toggleDrag, onMaximize } = props;
  return (
    <div
    className={cn(
      'absolute right-2 bottom-2 flex flex-col items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur',
      'pointer-events-none opacity-0 transition-opacity group-hover/preview:pointer-events-auto group-hover/preview:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100',
    )}
    onMouseDown={e => e.stopPropagation()}
  >
    <div className="grid grid-cols-3 gap-0.5">
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
    <Separator className="w-full" />
    <div className="flex gap-0.5">
      <ToolbarIconButton label="Zoom in" disabled={transform.scale >= ZOOM_MAX} onClick={() => zoomBy(ZOOM_FACTOR)}>
        <ZoomIn className="size-3.5" />
      </ToolbarIconButton>
      <ToolbarIconButton label="Zoom out" disabled={transform.scale <= ZOOM_MIN} onClick={() => zoomBy(1 / ZOOM_FACTOR)}>
        <ZoomOut className="size-3.5" />
      </ToolbarIconButton>
      <ToolbarIconButton
        label={dragEnabled ? 'Disable drag' : 'Enable drag'}
        pressed={dragEnabled}
        onClick={toggleDrag}
      >
        <Hand className="size-3.5" />
      </ToolbarIconButton>
      <ToolbarIconButton label="Maximize" onClick={onMaximize} className="hidden md:inline-flex">
        <Maximize2 className="size-3.5" />
      </ToolbarIconButton>
    </div>
  </div>
  );
};
