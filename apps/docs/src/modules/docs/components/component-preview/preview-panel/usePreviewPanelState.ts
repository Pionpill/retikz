import type { MouseEvent as ReactMouseEvent, RefObject, TouchEvent as ReactTouchEvent } from 'react';

import { useRef, useState } from 'react';

import type { PreviewControlRuntime, PreviewControlState, RendererMode, SizeKey, Transform } from '../types';

import { usePanZoom } from './usePanZoom';
import { usePreviewControlRuntime } from './usePreviewControlRuntime';

/** 创建预览面板状态时使用的宿主默认值。 */
export type UsePreviewPanelStateOptions = {
  /** 宿主尚未局部切换时使用的渲染模式。 */
  rendererMode: RendererMode;
  /** 当前内容固定使用的渲染模式；缺省时允许局部切换。 */
  rendererModeOverride?: RendererMode;
  /** 宿主尚未局部调整时使用的尺寸。 */
  size: SizeKey;
  /** 宿主尚未局部切换时使用的拖拽状态。 */
  dragEnabled: boolean;
  /** 当前面板是否处于放大布局。 */
  expanded: boolean;
  /** 控制层初始是否固定显示。 */
  pinned?: boolean;
  /** 是否强制把面板视为 hover 状态。 */
  hovered?: boolean;
};

/** 单个预览面板拥有的渲染、变换与控件运行时状态。 */
export type PreviewPanelState = {
  /** 当前内容实际使用的渲染模式。 */
  rendererMode: RendererMode;
  /** 当前内容是否锁定渲染模式。 */
  rendererModeFixed: boolean;
  /** 设置当前面板的局部渲染模式。 */
  setRendererMode: (mode: RendererMode) => void;
  /** 在 SVG 与 Canvas 渲染模式之间切换。 */
  toggleRendererMode: () => void;
  /** 当前预览尺寸。 */
  size: SizeKey;
  /** 设置当前面板的局部预览尺寸。 */
  setSize: (size: SizeKey) => void;
  /** 当前是否允许拖拽。 */
  dragEnabled: boolean;
  /** 设置当前面板的局部拖拽状态。 */
  setDragEnabled: (enabled: boolean) => void;
  /** 切换当前面板的拖拽状态。 */
  toggleDrag: () => void;
  /** 控制层是否被固定显示。 */
  toolbarPinned: boolean;
  /** 设置控制层固定状态。 */
  setToolbarPinned: (pinned: boolean) => void;
  /** 切换控制层固定状态。 */
  toggleToolbarPinned: () => void;
  /** 更新面板 hover 状态。 */
  setPreviewHovered: (hovered: boolean) => void;
  /** 渲染子树重挂载 key。 */
  remountKey: number;
  /** 当前面板独享的预览控件运行时。 */
  runtime: PreviewControlRuntime;
  /** 当前面板独享的控件共享值状态。 */
  controlState: PreviewControlState;
  /** 当前渲染区域 DOM ref。 */
  renderPaneRef: RefObject<HTMLDivElement>;
  /** 当前平移与缩放状态。 */
  transform: Transform;
  /** 当前是否正在拖拽。 */
  isDragging: boolean;
  /** 按像素增量平移预览。 */
  panBy: (dx: number, dy: number) => void;
  /** 按比例缩放预览。 */
  zoomBy: (factor: number) => void;
  /** 重置平移与缩放。 */
  resetTransform: () => void;
  /** 当前是否存在非默认变换。 */
  isTransformed: boolean;
  /** 可直接应用到渲染区域的 transform 样式。 */
  transformStyle: string;
  /** 创建鼠标或触摸拖拽起始处理器。 */
  beginDrag: (enabled: boolean) => (event: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>) => void;
};

/** 为单个预览面板组合独立的渲染、变换与控件运行时。 */
export const usePreviewPanelState = (options: UsePreviewPanelStateOptions): PreviewPanelState => {
  const { rendererMode: defaultRendererMode, size: defaultSize, dragEnabled: defaultDragEnabled, expanded } = options;
  const [localRendererMode, setLocalRendererMode] = useState<RendererMode>();
  const [localSize, setLocalSize] = useState<SizeKey>();
  const [localDragEnabled, setLocalDragEnabled] = useState<boolean>();
  const [toolbarPinned, setToolbarPinned] = useState(options.pinned ?? false);
  const [previewHovered, setPreviewHovered] = useState(false);
  const selectedRendererMode = localRendererMode ?? defaultRendererMode;
  const rendererModeFixed = options.rendererModeOverride !== undefined;
  const rendererMode = options.rendererModeOverride ?? selectedRendererMode;
  const size = localSize ?? defaultSize;
  const dragEnabled = localDragEnabled ?? defaultDragEnabled;
  const renderPaneRef = useRef<HTMLDivElement>(null);
  const panZoom = usePanZoom();
  const runtimeState = usePreviewControlRuntime({
    rendererMode,
    renderPaneRef,
    hovered: options.hovered ?? previewHovered,
    pinned: toolbarPinned,
    expanded,
  });

  return {
    rendererMode,
    rendererModeFixed,
    setRendererMode: mode => {
      if (!rendererModeFixed) setLocalRendererMode(mode);
    },
    toggleRendererMode: () => {
      if (!rendererModeFixed) setLocalRendererMode(selectedRendererMode === 'svg' ? 'canvas' : 'svg');
    },
    size,
    setSize: setLocalSize,
    dragEnabled,
    setDragEnabled: setLocalDragEnabled,
    toggleDrag: () => setLocalDragEnabled(!dragEnabled),
    toolbarPinned,
    setToolbarPinned,
    toggleToolbarPinned: () => setToolbarPinned(pinned => !pinned),
    setPreviewHovered,
    ...runtimeState,
    renderPaneRef,
    ...panZoom,
  };
};
