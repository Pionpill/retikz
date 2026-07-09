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

import type { PreviewControlSlot, RendererMode, SizeKey, Transform } from '../types';

import { downloadPreviewImage } from '../commands';
import { RendererModeButton } from '../components/parts';
import {
  PreviewToolbar,
  PreviewToolbarButton,
  PreviewToolbarSeparator,
  PreviewToolbarToggleGroup,
} from '../components/PreviewToolbar';
import { SIZE_KEYS } from '../constants';
import { PAN_STEP, ZOOM_FACTOR, ZOOM_MAX, ZOOM_MIN } from '../hooks';

export type BuildPreviewToolSlotsOptions = {
  transform: Transform;
  isTransformed: boolean;
  panBy: (dx: number, dy: number) => void;
  zoomBy: (factor: number) => void;
  resetTransform: () => void;
  dragEnabled: boolean;
  toggleDrag: () => void;
  onMaximize: () => void;
  size: SizeKey;
  onSizeChange: (next: SizeKey) => void;
  name: string;
  rendererMode: RendererMode;
  toggleRendererMode: () => void;
};

const SIZE_VALUE_SET: ReadonlySet<string> = new Set<SizeKey>(SIZE_KEYS);

/** 构建预览区右下角通用工具插槽。 */
export const buildPreviewToolSlots = (options: BuildPreviewToolSlotsOptions): Array<PreviewControlSlot> => {
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
    name,
    rendererMode,
    toggleRendererMode,
  } = options;
  const downloadLabel = rendererMode === 'canvas' ? 'Download PNG' : 'Download SVG';
  const isSmallPreview = size === 'xs' || size === 'sm';

  return [
    {
      id: 'preview-tools',
      placement: 'bottom-end',
      render: runtime => (
        <PreviewToolbar className="flex-col">
          <div className={isSmallPreview ? 'hidden' : 'hidden grid-cols-3 gap-0.5 md:grid'}>
            <span />
            <PreviewToolbarButton label="Pan up" onClick={() => panBy(0, -PAN_STEP)}>
              <ArrowUp className="size-3.5" />
            </PreviewToolbarButton>
            <span />
            <PreviewToolbarButton label="Pan left" onClick={() => panBy(-PAN_STEP, 0)}>
              <ArrowLeft className="size-3.5" />
            </PreviewToolbarButton>
            <PreviewToolbarButton label="Reset" disabled={!isTransformed} onClick={resetTransform}>
              <RotateCcw className="size-3.5" />
            </PreviewToolbarButton>
            <PreviewToolbarButton label="Pan right" onClick={() => panBy(PAN_STEP, 0)}>
              <ArrowRight className="size-3.5" />
            </PreviewToolbarButton>
            <span />
            <PreviewToolbarButton label="Pan down" onClick={() => panBy(0, PAN_STEP)}>
              <ArrowDown className="size-3.5" />
            </PreviewToolbarButton>
            <span />
          </div>
          {!isSmallPreview && <PreviewToolbarSeparator orientation="horizontal" className="hidden md:block" />}
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
            {isSmallPreview && (
              <PreviewToolbarButton label="Reset" disabled={!isTransformed} onClick={resetTransform}>
                <RotateCcw className="size-3.5" />
              </PreviewToolbarButton>
            )}
            <PreviewToolbarButton
              label={dragEnabled ? 'Disable drag' : 'Enable drag'}
              pressed={dragEnabled}
              onClick={toggleDrag}
            >
              <Hand className="size-3.5" />
            </PreviewToolbarButton>
            {!isSmallPreview && (
              <PreviewToolbarButton
                label="Reset"
                disabled={!isTransformed}
                className="md:hidden"
                onClick={resetTransform}
              >
                <RotateCcw className="size-3.5" />
              </PreviewToolbarButton>
            )}
            <PreviewToolbarButton
              label={downloadLabel}
              onClick={() => downloadPreviewImage(runtime.renderPane, name, rendererMode)}
            >
              <Download className="size-3.5" />
            </PreviewToolbarButton>
            <PreviewToolbarButton label="Maximize" className="hidden md:inline-flex" onClick={onMaximize}>
              <Maximize2 className="size-3.5" />
            </PreviewToolbarButton>
            <RendererModeButton rendererMode={rendererMode} onToggle={toggleRendererMode} />
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
