import { type FC } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, Hand, Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

import { RendererModeButton, ToolbarIconButton } from './_parts';
import { type RendererMode, SIZE_KEYS, type SizeKey, type Transform } from './_shared';
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
  /** 当前 size 档位（受控）+ 切换回调；用户在工具条里改完后由父级 ComponentRender 落到 sizeClass */
  size: SizeKey;
  onSizeChange: (next: SizeKey) => void;
  /** 下载当前渲染图：SVG 模式下载 SVG，Canvas 模式下载 PNG */
  onDownload: () => void;
  /** 当前渲染目标 */
  rendererMode: RendererMode;
  /** 切换当前渲染目标 */
  toggleRendererMode: () => void;
  /** 交互式 demo：渲染目标由 demo 自身决定，隐藏 svg/canvas 切换按钮（切了也不生效） */
  interactive?: boolean;
  /**
   * 强制可见（覆盖 hover-only 默认）；移动端没有 hover，由父级通过 tap 切换 pinned 真值。
   * 未指定时沿用原 group-hover/focus-within 显示规则
   */
  pinned?: boolean;
};

/**
 * 渲染区操作面板
 * @description 桌面默认 hover/focus 出现；移动端没有 hover，靠父级 tap 切 `pinned` 强制显示。
 *   上半 3×3 d-pad（中央 ⟲ 复原）md 以下整段隐藏；xs / sm 预览区始终隐藏 d-pad，
 *   并把 Reset 放在下半行 Zoom out 之后，避免工具条高过预览区。
 *   mousedown + click 都 stopPropagation，避免父级 preview 区域的 drag handler 与 tap toggle 误触
 */
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
    interactive,
    pinned,
  } = props;
  const downloadLabel = rendererMode === 'canvas' ? 'Download PNG' : 'Download SVG';
  const isSmallPreview = size === 'xs' || size === 'sm';
  return (
    <div
      className={cn(
        'absolute right-2 bottom-2 flex flex-col items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur',
        pinned
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
        <span />
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
        <ToolbarIconButton label="Zoom out" disabled={transform.scale <= ZOOM_MIN} onClick={() => zoomBy(1 / ZOOM_FACTOR)}>
          <ZoomOut className="size-3.5" />
        </ToolbarIconButton>
        {/* Reset 始终放底排（所有 size / 视口一致可见）；未变换时置灰 */}
        <ToolbarIconButton label="Reset" title="Reset" disabled={!isTransformed} onClick={resetTransform}>
          <RotateCcw className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton
          label={dragEnabled ? 'Disable drag' : 'Enable drag'}
          pressed={dragEnabled}
          onClick={toggleDrag}
        >
          <Hand className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton label={downloadLabel} title={downloadLabel} onClick={onDownload}>
          <Download className="size-3.5" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Maximize" onClick={onMaximize} className="hidden md:inline-flex">
          <Maximize2 className="size-3.5" />
        </ToolbarIconButton>
        {!interactive && <RendererModeButton rendererMode={rendererMode} onToggle={toggleRendererMode} />}
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
