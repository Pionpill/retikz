import { Download, Hand, Maximize2, PanelsTopLeft, Presentation, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

import type { Lang } from '@/i18n';

import { SIZE_KEYS } from '../../constants';
import type { PreviewControlSlot, RendererMode, SizeKey, Transform } from '../../types';
import { downloadPreviewImage } from '../commands';
import {
  PreviewToolbar,
  PreviewToolbarButton,
  PreviewToolbarSeparator,
  PreviewToolbarToggleGroup,
} from '../PreviewToolbar';
import { RendererModeButton } from '../RendererModeButton';
import { ZOOM_FACTOR, ZOOM_MAX, ZOOM_MIN } from '../usePanZoom';
import { PreviewSizeMenu } from './PreviewSizeMenu';

export type BuildPreviewToolSlotsOptions = {
  /** 使用独立的尺寸菜单 */
  compactSizes?: boolean;
  /** 切换常规与展示布局 */
  onToggleMode?: () => void;
  /** 预览宽度上限；0 表示占满容器 */
  width?: number;
  /** 更新预览宽度上限 */
  onWidthChange?: (width: number) => void;
  /** 高度档位提示的语言 */
  lang?: Lang;
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
  onMaximize?: () => void;
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
    compactSizes = false,
    onToggleMode,
    width = 0,
    onWidthChange,
    lang = 'zh',
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
        <div className="flex items-center gap-2">
          <PreviewToolbar className={compactSizes ? 'showcase-hover-tools flex-row' : 'flex-col'}>
            <div className="flex items-center gap-0.5">
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

              {compactSizes ? (
                <PreviewToolbarSeparator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-5" />
              ) : null}
              {onToggleMode ? (
                <PreviewToolbarButton
                  label={
                    compactSizes
                      ? lang === 'zh'
                        ? '切换到常规模式'
                        : 'Switch to standard mode'
                      : lang === 'zh'
                        ? '切换到展示模式'
                        : 'Switch to showcase mode'
                  }
                  onClick={onToggleMode}
                >
                  {compactSizes ? <PanelsTopLeft className="size-3.5" /> : <Presentation className="size-3.5" />}
                </PreviewToolbarButton>
              ) : null}
              <PreviewToolbarButton
                label={downloadLabel}
                onClick={() => downloadPreviewImage(runtime.renderPane, name, rendererMode)}
              >
                <Download className="size-3.5" />
              </PreviewToolbarButton>

              {onMaximize ? (
                <PreviewToolbarButton label="Maximize" className="hidden md:inline-flex" onClick={onMaximize}>
                  <Maximize2 className="size-3.5" />
                </PreviewToolbarButton>
              ) : null}
              <RendererModeButton
                rendererMode={rendererMode}
                disabled={rendererModeFixed}
                onToggle={toggleRendererMode}
              />
            </div>
            {!compactSizes ? (
              <>
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
              </>
            ) : null}
          </PreviewToolbar>
          {compactSizes ? (
            <PreviewSizeMenu
              lang={lang}
              size={size}
              onSizeChange={onSizeChange}
              width={width}
              onWidthChange={onWidthChange}
            />
          ) : null}
        </div>
      ),
    },
  ];
};
