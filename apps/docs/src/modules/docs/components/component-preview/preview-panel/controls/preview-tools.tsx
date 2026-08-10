import { Download, Hand, Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

import type { PreviewControlSlot, RendererMode, SizeKey, Transform } from '../../types';

import { SIZE_KEYS } from '../../constants';
import { downloadPreviewImage } from '../commands';
import {
  PreviewToolbar,
  PreviewToolbarButton,
  PreviewToolbarSeparator,
  PreviewToolbarToggleGroup,
} from '../PreviewToolbar';
import { RendererModeButton } from '../RendererModeButton';
import { ZOOM_FACTOR, ZOOM_MAX, ZOOM_MIN } from '../usePanZoom';

export type BuildPreviewToolSlotsOptions = {
  /** 当前平移与缩放状态。 */
  transform: Transform;
  /** 当前是否存在非默认变换。 */
  isTransformed: boolean;
  /** 按比例缩放预览。 */
  zoomBy: (factor: number) => void;
  /** 重置平移与缩放。 */
  resetTransform: () => void;
  /** 当前是否允许拖拽。 */
  dragEnabled: boolean;
  /** 切换拖拽状态。 */
  toggleDrag: () => void;
  /** 打开放大布局。 */
  onMaximize: () => void;
  /** 当前预览尺寸。 */
  size: SizeKey;
  /** 调整预览尺寸。 */
  onSizeChange: (next: SizeKey) => void;
  /** 下载文件名。 */
  name: string;
  /** 当前渲染模式。 */
  rendererMode: RendererMode;
  /** 当前内容是否锁定渲染模式。 */
  rendererModeFixed?: boolean;
  /** 切换渲染模式。 */
  toggleRendererMode: () => void;
};

const SIZE_VALUE_SET: ReadonlySet<string> = new Set<SizeKey>(SIZE_KEYS);

/** 构建预览区右下角通用工具插槽。 */
export const buildPreviewToolSlots = (options: BuildPreviewToolSlotsOptions): Array<PreviewControlSlot> => {
  const {
    transform,
    isTransformed,
    zoomBy,
    resetTransform,
    dragEnabled,
    toggleDrag,
    onMaximize,
    size,
    onSizeChange,
    name,
    rendererMode,
    rendererModeFixed,
    toggleRendererMode,
  } = options;
  const downloadLabel = rendererMode === 'canvas' ? 'Download PNG' : 'Download SVG';

  return [
    {
      id: 'preview-tools',
      placement: 'bottom-end',
      visibility: 'hover',
      render: runtime => (
        <PreviewToolbar className="flex-col">
          <div className="flex gap-0.5">
            <PreviewToolbarButton
              label="Zoom in"
              disabled={transform.scale >= ZOOM_MAX}
              onClick={() => zoomBy(ZOOM_FACTOR)}
            >
              <ZoomIn className="size-3.5" />
            </PreviewToolbarButton>
            <PreviewToolbarButton
              label="Zoom out"
              disabled={transform.scale <= ZOOM_MIN}
              onClick={() => zoomBy(1 / ZOOM_FACTOR)}
            >
              <ZoomOut className="size-3.5" />
            </PreviewToolbarButton>
            <PreviewToolbarButton label="Reset" disabled={!isTransformed} onClick={resetTransform}>
              <RotateCcw className="size-3.5" />
            </PreviewToolbarButton>
            <PreviewToolbarButton
              label={dragEnabled ? 'Disable drag' : 'Enable drag'}
              pressed={dragEnabled}
              onClick={toggleDrag}
            >
              <Hand className="size-3.5" />
            </PreviewToolbarButton>
            <PreviewToolbarButton
              label={downloadLabel}
              onClick={() => downloadPreviewImage(runtime.renderPane, name, rendererMode)}
            >
              <Download className="size-3.5" />
            </PreviewToolbarButton>
            <PreviewToolbarButton label="Maximize" className="hidden md:inline-flex" onClick={onMaximize}>
              <Maximize2 className="size-3.5" />
            </PreviewToolbarButton>
            <RendererModeButton
              rendererMode={rendererMode}
              disabled={rendererModeFixed}
              onToggle={toggleRendererMode}
            />
          </div>
          <PreviewToolbarSeparator orientation="horizontal" />
          <PreviewToolbarToggleGroup
            label="Preview size"
            value={size}
            options={SIZE_KEYS.map(key => ({ value: key, label: key }))}
            onValueChange={value => {
              if (SIZE_VALUE_SET.has(value)) onSizeChange(value as SizeKey);
            }}
            className="w-full"
          />
        </PreviewToolbar>
      ),
    },
  ];
};
